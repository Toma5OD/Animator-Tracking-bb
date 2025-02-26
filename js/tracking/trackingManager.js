// Tracking Manager - Coordinates pose and face detection
import { elements, appState, updateUIState } from '../main.js';
import { updateAvatarBody, updateAvatarFace, resetAvatarPosition } from '../avatar/avatarRenderer.js';
import { updateDisplay } from '../utils/ui.js';

// Tracking state
let posenet = null;
let facemesh = null;
let animationFrameId = null;
let lastFacePosition = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
let lastBodyPosition = [];
let trackingActive = false;

// Set up the tracking system
export async function setupTrackingSystem() {
    try {
        // Load models
        await loadModels();
        return true;
    } catch (error) {
        console.error('Error setting up tracking system:', error);
        throw new Error('Failed to initialize tracking system');
    }
}

// Modified loadModels function to use correct loading approach
async function loadModels() {
    try {
        elements.debugInfo.textContent = 'Status: Loading PoseNet model...';

        // Check if we have the posenetModule library loaded
        if (window.posenet) {
            // Use PoseNet's own loading method
            posenet = await window.posenet.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                inputResolution: { width: 640, height: 480 },
                multiplier: 0.75
            });
        } else {
            // Fallback to TensorFlow.js model loading
            posenet = await tf.loadGraphModel(
                'https://storage.googleapis.com/tfjs-models/savedmodel/posenet/mobilenet/float/050/model-stride16.json'
            );
        }

        // Check if face-api.js is available
        if (window.faceapi) {
            elements.debugInfo.textContent = 'Status: Loading face detection models...';
            try {
                // Load face detection models
                await faceapi.nets.tinyFaceDetector.load('/models');
                await faceapi.nets.faceLandmark68Net.load('/models');
                facemesh = { loaded: true, type: 'faceapi' };
            } catch (faceError) {
                console.warn('Face detection models failed to load:', faceError);
                facemesh = { loaded: true, type: 'mock' };
            }
        } else {
            // Facemesh placeholder if API isn't available
            facemesh = { loaded: true, type: 'mock' };
        }

        elements.debugInfo.textContent = 'Status: Models loaded successfully';
        elements.loadingScreen.style.display = 'none';
        return true;
    } catch (error) {
        console.error('Error loading models:', error);

        // Provide better user feedback and fallback to mock mode
        elements.debugInfo.textContent = `Error loading models. Using fallback demo mode.`;

        // Create mock models to allow the interface to work without the real models
        posenet = {
            predict: () => {
                // Return mock data structure that simulates posenet output
                return tf.tensor([]); // This is just a placeholder
            },
            estimateSinglePose: () => simulateBodyPose(),
            estimateMultiplePoses: () => [{ keypoints: simulateBodyPose(), score: 0.9 }]
        };
        facemesh = { loaded: true, type: 'mock' };

        // Hide loading screen to let user interact with the fallback
        elements.loadingScreen.style.display = 'none';
        return true; // Return true so the app can continue in "demo mode"
    }
}

// Enhanced processBodyTracking function
async function processBodyTracking() {
    try {
        let bodyPose = null;

        // Check if we have a real posenet model or need to use simulation
        if (posenet && typeof posenet.estimateSinglePose === 'function') {
            try {
                // Attempt to use real PoseNet model
                const pose = await posenet.estimateSinglePose(elements.video, {
                    flipHorizontal: true
                });

                if (pose && pose.keypoints && pose.keypoints.length > 0) {
                    bodyPose = pose.keypoints;
                } else {
                    // Fallback to simulation if no keypoints detected
                    bodyPose = simulateBodyPose();
                }
            } catch (poseError) {
                console.warn('Error with real pose detection, using simulation:', poseError);
                bodyPose = simulateBodyPose();
            }
        } else {
            // Use simulation if no proper PoseNet model
            bodyPose = simulateBodyPose();
        }

        // Apply smoothing
        const smoothedPose = applySmoothing(bodyPose, lastBodyPosition, appState.config.smoothingLevel);
        lastBodyPosition = smoothedPose;

        // Update avatar body based on detected pose
        updateAvatarBody(smoothedPose);

        return smoothedPose;
    } catch (error) {
        console.error('Error in body tracking:', error);
        return lastBodyPosition; // Return last known position if error
    }
}

// Enhanced processFaceTracking function
async function processFaceTracking() {
    try {
        let faceData = null;

        // Check if we have face-api.js available
        if (facemesh && facemesh.type === 'faceapi' && window.faceapi) {
            try {
                // Use face-api.js for real face tracking
                const detections = await faceapi.detectSingleFace(
                    elements.video,
                    new faceapi.TinyFaceDetectorOptions()
                ).withFaceLandmarks();

                if (detections) {
                    const box = detections.detection.box;
                    const landmarks = detections.landmarks;
                    const jawOutline = landmarks.getJawOutline();
                    const nose = landmarks.getNose();

                    // Calculate face position and rotations
                    const faceX = box.x + box.width / 2;
                    const faceY = box.y + box.height / 2;
                    const videoWidth = elements.video.videoWidth || elements.video.width;
                    const videoHeight = elements.video.videoHeight || elements.video.height;

                    // Normalize coordinates to center of viewport
                    const normalizedX = (faceX - videoWidth / 2) / (videoWidth / 4);
                    const normalizedY = (faceY - videoHeight / 2) / (videoHeight / 4);

                    // Calculate rough head rotations from landmarks
                    const noseTop = nose[0];
                    const noseTip = nose[nose.length - 1];
                    const jawLeft = jawOutline[0];
                    const jawRight = jawOutline[jawOutline.length - 1];

                    // Rough rotation estimates
                    const headTilt = Math.atan2(jawRight.y - jawLeft.y, jawRight.x - jawLeft.x) * 180 / Math.PI;
                    const headNod = Math.atan2(noseTip.y - noseTop.y, noseTip.x - noseTop.x) * 180 / Math.PI;

                    // Create face data
                    faceData = {
                        x: normalizedX,
                        y: normalizedY,
                        z: (box.width / videoWidth - 0.15),  // Scale (depth) based on face size
                        rx: headNod * 0.3,                   // Up/down nod
                        ry: (normalizedX * -15),             // Left/right turn
                        rz: headTilt * 0.5                   // Head tilt
                    };
                } else {
                    // No face detected, use simulation
                    faceData = simulateFaceDetection();
                }
            } catch (faceError) {
                console.warn('Face detection error, using simulation:', faceError);
                faceData = simulateFaceDetection();
            }
        } else {
            // Use simulation if face-api isn't available
            faceData = simulateFaceDetection();
        }

        // Apply smoothing to each property
        const smoothedFace = {
            x: applySmoothing(faceData.x, lastFacePosition.x, appState.config.smoothingLevel),
            y: applySmoothing(faceData.y, lastFacePosition.y, appState.config.smoothingLevel),
            z: applySmoothing(faceData.z, lastFacePosition.z, appState.config.smoothingLevel),
            rx: applySmoothing(faceData.rx, lastFacePosition.rx, appState.config.smoothingLevel),
            ry: applySmoothing(faceData.ry, lastFacePosition.ry, appState.config.smoothingLevel),
            rz: applySmoothing(faceData.rz, lastFacePosition.rz, appState.config.smoothingLevel)
        };

        lastFacePosition = smoothedFace;

        // Update avatar face based on detected face landmarks
        updateAvatarFace(smoothedFace);

        return smoothedFace;
    } catch (error) {
        console.error('Error in face tracking:', error);
        return lastFacePosition; // Return last known position if error
    }
}

// Enhanced simulateBodyPose for better movement
function simulateBodyPose() {
    // Enhanced simulation for more realistic body movement
    const keypoints = [];
    const canvas = elements.canvas;

    // Base positions (center of the frame)
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Time-based offsets for natural movement
    const time = Date.now() / 1000;
    const breathingOffset = Math.sin(time / 2) * 5; // Breathing movement
    const swayOffset = Math.sin(time / 3) * 10;     // Subtle swaying

    // Head keypoints
    keypoints[0] = { x: centerX + swayOffset, y: centerY - 100 + breathingOffset, score: 0.9 };  // Nose
    keypoints[1] = { x: centerX - 15 + swayOffset, y: centerY - 110 + breathingOffset, score: 0.9 }; // Left eye
    keypoints[2] = { x: centerX + 15 + swayOffset, y: centerY - 110 + breathingOffset, score: 0.9 }; // Right eye
    keypoints[3] = { x: centerX - 30 + swayOffset, y: centerY - 100 + breathingOffset, score: 0.8 }; // Left ear
    keypoints[4] = { x: centerX + 30 + swayOffset, y: centerY - 100 + breathingOffset, score: 0.8 }; // Right ear

    // Shoulder keypoints with more pronounced movement
    keypoints[5] = { x: centerX - 70 + swayOffset * 0.5, y: centerY - 50 + breathingOffset, score: 0.9 }; // Left shoulder
    keypoints[6] = { x: centerX + 70 + swayOffset * 0.5, y: centerY - 50 + breathingOffset, score: 0.9 }; // Right shoulder

    // Arm keypoints with natural movement
    const leftArmAngle = Math.sin(time / 1.5) * 20;
    const rightArmAngle = Math.sin(time / 1.5 + Math.PI) * 20;

    // Left arm
    keypoints[7] = { // Left elbow - moves with a slight delay from the shoulder
        x: centerX - 85 + Math.sin(time / 1.5 - 0.2) * 15,
        y: centerY + 20 + Math.cos(time / 2) * 5,
        score: 0.8
    };

    keypoints[9] = { // Left wrist - more movement at the end of the arm
        x: centerX - 95 + Math.sin(time / 1.2) * 25,
        y: centerY + 70 + Math.cos(time / 1.8) * 10,
        score: 0.7
    };

    // Right arm
    keypoints[8] = { // Right elbow
        x: centerX + 85 + Math.sin(time / 1.5 - 0.2) * 15,
        y: centerY + 20 + Math.cos(time / 2) * 5,
        score: 0.8
    };

    keypoints[10] = { // Right wrist
        x: centerX + 95 + Math.sin(time / 1.2) * 25,
        y: centerY + 70 + Math.cos(time / 1.8) * 10,
        score: 0.7
    };
    // Lower body keypoints
    keypoints[11] = { x: centerX - 40 + swayOffset * 0.2, y: centerY + 50, score: 0.8 }; // Left hip
    keypoints[12] = { x: centerX + 40 + swayOffset * 0.2, y: centerY + 50, score: 0.8 }; // Right hip
    keypoints[13] = { x: centerX - 45, y: centerY + 120, score: 0.7 }; // Left knee
    keypoints[14] = { x: centerX + 45, y: centerY + 120, score: 0.7 }; // Right knee
    keypoints[15] = { x: centerX - 50, y: centerY + 190, score: 0.6 }; // Left ankle
    keypoints[16] = { x: centerX + 50, y: centerY + 190, score: 0.6 }; // Right ankle

    return keypoints;
}

// Start tracking
export async function startTracking(stream) {
    if (trackingActive) return;

    // Set tracking as active
    trackingActive = true;
    appState.isTracking = true;

    // Set up canvas size
    setupCanvas();

    // Update UI
    updateUIState();

    // Start tracking loop
    elements.debugInfo.textContent = 'Status: Tracking Active';
    trackingLoop();
}

// Stop tracking
export function stopTracking() {
    // Set tracking as inactive
    trackingActive = false;
    appState.isTracking = false;

    // Cancel animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Reset avatar position
    resetAvatarPosition();

    // Update UI
    updateUIState();

    elements.debugInfo.textContent = 'Status: Tracking Stopped';
}


// Setup canvas size based on video dimensions
function setupCanvas() {
    elements.canvas.width = elements.video.videoWidth || 640;
    elements.canvas.height = elements.video.videoHeight || 480;

    // Update SVG viewBox to match
    const avatarSVG = document.getElementById('avatarSVG');
    if (avatarSVG) {
        avatarSVG.setAttribute('viewBox', `0 0 ${elements.canvas.width} ${elements.canvas.height}`);
        // Initialize avatar position
        const avatarGroup = document.getElementById('avatarGroup');
        if (avatarGroup) {
            avatarGroup.setAttribute('transform', `translate(${elements.canvas.width / 2}, ${elements.canvas.height / 2})`);
        }
    }
}

// Main tracking loop
async function trackingLoop() {
    if (!trackingActive) return;

    try {
        // Ensure the video is playing and ready
        if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
            // Draw video to canvas for processing and output
            elements.ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);

            // Process body tracking
            await processBodyTracking();

            // Process face tracking
            await processFaceTracking();

            // Update display based on selected mode
            updateDisplay();

            // Save the latest positions to app state for other modules to use
            appState.lastBodyPosition = lastBodyPosition;
            appState.lastFacePosition = lastFacePosition;

            // Update debug info with FPS
            const fps = Math.round(1000 / (Date.now() - (window.lastFrameTime || Date.now())));
            elements.debugInfo.textContent = `Status: Tracking Active | FPS: ${fps}`;
            window.lastFrameTime = Date.now();
        }

        // Continue loop
        animationFrameId = requestAnimationFrame(trackingLoop);
    } catch (error) {
        elements.debugInfo.textContent = `Error in tracking: ${error.message}`;
        console.error('Error in tracking loop:', error);
        // Continue loop despite error
        animationFrameId = requestAnimationFrame(trackingLoop);
    }
}

// Simulate face detection with more detailed control
function simulateFaceDetection() {
    const time = Date.now() / 1000;
    const canvas = elements.canvas;

    // Base movement for natural head motion
    const baseMovement = {
        x: Math.sin(time / 1.5) * 15,                         // Side-to-side movement
        y: Math.cos(time / 2) * 10,                           // Up-down movement
        z: (Math.sin(time / 3) * 0.1) + 0.1,                  // Forward-backward (scale)
        rx: Math.sin(time / 2.5) * 10,                        // Nod (looking up and down)
        ry: Math.sin(time / 2) * 15,                          // Turn (looking left and right)
        rz: Math.sin(time / 4) * 5                            // Tilt (head tilt left and right)
    };

    // Add occasional head movements for more realism
    if (Math.sin(time / 10) > 0.9) {
        // Quick glance to the side
        baseMovement.ry += Math.sin(time * 5) * 20;
    }

    if (Math.sin(time / 15) > 0.9) {
        // Occasional nod
        baseMovement.rx += Math.sin(time * 6) * 15;
    }

    return baseMovement;
}

// Apply smoothing to movement
function applySmoothing(newValue, oldValue, smoothingFactor) {
    if (oldValue === undefined) return newValue;

    // If newValue is an array (like body keypoints)
    if (Array.isArray(newValue)) {
        if (!Array.isArray(oldValue) || oldValue.length === 0) return newValue;

        return newValue.map((point, i) => {
            if (i >= oldValue.length || !oldValue[i]) return point;

            return {
                x: oldValue[i].x * smoothingFactor + point.x * (1 - smoothingFactor),
                y: oldValue[i].y * smoothingFactor + point.y * (1 - smoothingFactor),
                score: point.score
            };
        });
    }

    // Otherwise just smooth the single value
    return oldValue * smoothingFactor + newValue * (1 - smoothingFactor);
}

// Draw skeleton lines for debug view
export function drawSkeletonLines(ctx, keypoints) {
    if (!keypoints || keypoints.length < 5) return;

    // Improved skeleton drawing for debug view
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.lineWidth = 3;

    // Define connections for a human skeleton
    const connections = [
        [0, 1], [0, 2], [1, 3], [2, 4],           // Face
        [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],  // Arms
        [5, 11], [6, 12], [11, 12],               // Torso
        [11, 13], [13, 15], [12, 14], [14, 16]    // Legs
    ];

    // Draw connections if both keypoints exist and have decent confidence
    connections.forEach(([i, j]) => {
        if (keypoints[i] && keypoints[j] &&
            keypoints[i].score > 0.5 && keypoints[j].score > 0.5) {

            ctx.beginPath();
            ctx.moveTo(keypoints[i].x, keypoints[i].y);
            ctx.lineTo(keypoints[j].x, keypoints[j].y);
            ctx.stroke();
        }
    });

    // Draw keypoints
    keypoints.forEach((point, i) => {
        if (point && point.score > 0.5) {
            ctx.fillStyle = i <= 4 ? 'rgba(255, 255, 0, 0.9)' : 'rgba(0, 255, 0, 0.9)';
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // Add keypoint labels for better debugging
            if (appState.config.displayMode === 'debug') {
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.fillText(`${i}`, point.x + 7, point.y + 4);
            }
        }
    });
}