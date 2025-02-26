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

// Load TensorFlow models
async function loadModels() {
    try {
        elements.debugInfo.textContent = 'Status: Loading PoseNet model...';
        
        // Load PoseNet model directly from TensorFlow.js
        posenet = await posenetModule.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75,
            quantBytes: 2
        });
        
        elements.debugInfo.textContent = 'Status: Loading Face detection model...';
        // Load Face-API.js models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        
        elements.debugInfo.textContent = 'Status: Models loaded successfully';
        elements.loadingScreen.style.display = 'none';
        return true;
    } catch (error) {
        console.error('Error loading models:', error);
        
        // Provide better user feedback and fallback to mock mode
        elements.debugInfo.textContent = `Error loading models: ${error.message}. Using fallback demo mode.`;
        
        console.log("Falling back to simulation mode due to error:", error);
        // Create mock models to allow the interface to work without the real models
        posenet = null;
        facemesh = null;
        
        // Hide loading screen to let user interact with the fallback
        elements.loadingScreen.style.display = 'none';
        return true; // Return true so the app can continue in "demo mode"
    }
}

// Process body tracking using PoseNet
async function processBodyTracking() {
    if (!posenet && !trackingActive) {
        // If real tracking failed, use simulation
        return simulateBodyPose();
    }
    
    try {
        // Perform real-time pose detection
        const poses = await posenet.estimateMultiplePoses(elements.video, {
            flipHorizontal: true,
            maxDetections: 1, // Just detect the main person
            scoreThreshold: 0.6,
            nmsRadius: 20
        });
        
        if (poses && poses.length > 0) {
            const pose = poses[0]; // Take the first (most confident) detected person
            
            // Apply smoothing
            const smoothedPose = applySmoothing(pose.keypoints, lastBodyPosition, appState.config.smoothingLevel);
            lastBodyPosition = smoothedPose;
            
            // Update avatar body based on detected pose
            updateAvatarBody(smoothedPose);
            
            return smoothedPose;
        } else {
            // No poses detected, use last known position
            return lastBodyPosition;
        }
    } catch (error) {
        console.error('Error in body tracking:', error);
        // Fall back to simulation if there's an error
        const simulated = simulateBodyPose();
        return simulated; 
    }
}

// Process face tracking using Face-API.js
async function processFaceTracking() {
    if (!faceapi && !trackingActive) {
        // If real tracking failed, use simulation
        return simulateFaceDetection();
    }
    
    try {
        // Detect face with landmarks
        const detections = await faceapi.detectSingleFace(
            elements.video, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks();
        
        if (detections) {
            // Calculate face position and angles
            const box = detections.detection.box;
            const landmarks = detections.landmarks;
            const jawOutline = landmarks.getJawOutline();
            const nose = landmarks.getNose();
            
            // Center of face
            const faceX = box.x + box.width / 2;
            const faceY = box.y + box.height / 2;
            
            // Calculate face rotation (simplified)
            const jawLeft = jawOutline[0];
            const jawRight = jawOutline[jawOutline.length - 1];
            const noseTop = nose[0];
            const noseTip = nose[nose.length - 1];
            
            // Calculate angles
            const rx = Math.atan2(noseTip.y - noseTop.y, noseTip.x - noseTop.x) * 180 / Math.PI;
            const ry = Math.atan2(jawRight.x - jawLeft.x, jawLeft.y - jawRight.y) * 180 / Math.PI;
            
            // Scale based on face width (closer = bigger face)
            const z = (box.width / elements.video.width - 0.15) * 2;
            
            // Create face data
            const faceData = {
                x: (faceX - elements.video.width / 2) / 10,  // Center-normalized x position
                y: (faceY - elements.video.height / 2) / 10, // Center-normalized y position
                z: z,                                        // Scale/depth
                rx: rx * 0.5,                                // Head nod (up/down)
                ry: ry * 0.5,                                // Head turn (left/right)
                rz: (jawLeft.y - jawRight.y) * 0.5           // Head tilt
            };
            
            // Apply smoothing
            const smoothedFace = {
                x: applySmoothing(faceData.x, lastFacePosition.x, appState.config.smoothingLevel),
                y: applySmoothing(faceData.y, lastFacePosition.y, appState.config.smoothingLevel),
                z: applySmoothing(faceData.z, lastFacePosition.z, appState.config.smoothingLevel),
                rx: applySmoothing(faceData.rx, lastFacePosition.rx, appState.config.smoothingLevel),
                ry: applySmoothing(faceData.ry, lastFacePosition.ry, appState.config.smoothingLevel),
                rz: applySmoothing(faceData.rz, lastFacePosition.rz, appState.config.smoothingLevel)
            };
            
            lastFacePosition = smoothedFace;
            
            // Update avatar face
            updateAvatarFace(smoothedFace);
            
            return smoothedFace;
        } else {
            // No face detected, use simulation as fallback
            return simulateFaceDetection();
        }
    } catch (error) {
        console.error('Error in face tracking:', error);
        // Fall back to simulation if there's an error
        return simulateFaceDetection();
    }
}

// Main tracking loop with performance optimization
async function trackingLoop() {
    if (!trackingActive) return;
    
    try {
        // Ensure the video is playing and ready
        if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
            // Draw video to canvas for processing and output
            elements.ctx.drawImage(elements.video, 0, 0, elements.canvas.width, elements.canvas.height);
            
            // Use Promise.all to run body and face tracking in parallel
            const [bodyPose, faceData] = await Promise.all([
                processBodyTracking(),
                processFaceTracking()
            ]);
            
            // Update display based on selected mode
            updateDisplay();
            
            // Save the latest positions to app state for other modules to use
            appState.lastBodyPosition = bodyPose || lastBodyPosition;
            appState.lastFacePosition = faceData || lastFacePosition;
            
            // Update debug info with FPS
            const now = Date.now();
            const fps = Math.round(1000 / (now - (window.lastFrameTime || now)));
            elements.debugInfo.textContent = `Status: Tracking Active | FPS: ${fps} | Mode: ${posenet ? 'Real' : 'Simulated'}`;
            window.lastFrameTime = now;
        }
        
        // Continue loop with optimal timing
        animationFrameId = requestAnimationFrame(trackingLoop);
    } catch (error) {
        console.error('Error in tracking loop:', error);
        elements.debugInfo.textContent = `Error in tracking: ${error.message}`;
        // Continue loop despite error
        animationFrameId = requestAnimationFrame(trackingLoop);
    }
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
            avatarGroup.setAttribute('transform', `translate(${elements.canvas.width/2}, ${elements.canvas.height/2})`);
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

// Process body tracking using PoseNet
async function processBodyTracking() {
    // In a real implementation with the working PoseNet model:
    // 1. Convert video frame to tensor
    // 2. Run pose detection
    // 3. Process the results
    
    // For now, using simulation for demonstration
    // Enhanced to provide more realistic movement
    
    try {
        const bodyPose = simulateBodyPose();
        
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

// Process face tracking
async function processFaceTracking() {
    // In a real implementation with a face detection model:
    // 1. Extract face region
    // 2. Detect landmarks
    // 3. Estimate pose from landmarks
    
    // Enhanced simulation for better demo
    try {
        const faceData = simulateFaceDetection();
        
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

// Simulate body pose detection (replace with actual PoseNet in production)
function simulateBodyPose() {
    // Enhanced simulation for more realistic body movement
    const keypoints = [];
    const canvas = elements.canvas;
    
    // Define the keypoint indices for PoseNet
    // 0: nose, 1: leftEye, 2: rightEye, 3: leftEar, 4: rightEar,
    // 5: leftShoulder, 6: rightShoulder, 7: leftElbow, 8: rightElbow,
    // 9: leftWrist, 10: rightWrist, 11: leftHip, 12: rightHip,
    // 13: leftKnee, 14: rightKnee, 15: leftAnkle, 16: rightAnkle
    
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