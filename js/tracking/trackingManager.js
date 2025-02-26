// Tracking Manager - Now using MediaPipe for better tracking
import { elements, appState, updateUIState } from '../main.js';
import { updateAvatarBody, updateAvatarFace, resetAvatarPosition } from '../avatar/avatarRenderer.js';
import { updateDisplay } from '../utils/ui.js';

// Tracking state
let poseDetection = null;
let faceMesh = null;
let animationFrameId = null;
let lastFacePosition = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };
let lastBodyPosition = [];
let trackingActive = false;

// Set up the tracking system
export async function setupTrackingSystem() {
    try {
        // Load MediaPipe models
        await loadModels();
        return true;
    } catch (error) {
        console.error('Error setting up tracking system:', error);
        throw new Error('Failed to initialize tracking system');
    }
}

// Load MediaPipe models
async function loadModels() {
    try {
        elements.debugInfo.textContent = 'Status: Loading MediaPipe models...';
        
        // Load the MediaPipe Pose model
        if (!window.poseDetection) {
            throw new Error('MediaPipe Pose not available. Make sure to include the necessary script.');
        }
        
        poseDetection = await window.poseDetection.createDetector(
            window.poseDetection.SupportedModels.BlazePose,
            { runtime: 'mediapipe', modelType: 'lite' }
        );
        
        // Load the MediaPipe Face Mesh model
        if (!window.faceLandmarksDetection) {
            throw new Error('MediaPipe Face Mesh not available. Make sure to include the necessary script.');
        }
        
        faceMesh = await window.faceLandmarksDetection.createDetector(
            window.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            { runtime: 'mediapipe' }
        );
        
        elements.debugInfo.textContent = 'Status: MediaPipe models loaded successfully';
        elements.loadingScreen.style.display = 'none';
        return true;
    } catch (error) {
        console.error('Error loading MediaPipe models:', error);
        
        // Provide better user feedback and fallback to mock mode
        elements.debugInfo.textContent = `Error loading models: ${error.message}. Using fallback demo mode.`;
        
        console.log("Falling back to simulation mode due to error:", error);
        
        // Hide loading screen to let user interact with the fallback
        elements.loadingScreen.style.display = 'none';
        return true; // Return true so the app can continue in "demo mode"
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
            
            // Process body and face tracking
            await processTracking();
            
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

// Process tracking using MediaPipe
async function processTracking() {
    try {
        // Check if we have MediaPipe models loaded
        if (poseDetection && faceMesh) {
            try {
                // Run MediaPipe Pose detection
                const poseResults = await poseDetection.estimatePoses(elements.video, {
                    flipHorizontal: true // Important to flip for mirror-like behavior
                });
                
                // Process pose results if available
                if (poseResults && poseResults.length > 0) {
                    const pose = poseResults[0]; // Take the first detected person
                    await processMediaPipePose(pose);
                } else {
                    // Fallback to simulation if no poses detected
                    lastBodyPosition = simulateBodyPose();
                    updateAvatarBody(lastBodyPosition);
                }
                
                // Run MediaPipe Face Mesh detection
                const faceResults = await faceMesh.estimateFaces(elements.video, {
                    flipHorizontal: true // Important to flip for mirror-like behavior
                });
                
                // Process face results if available
                if (faceResults && faceResults.length > 0) {
                    const face = faceResults[0]; // Take the first detected face
                    await processMediaPipeFace(face);
                } else {
                    // Fallback to simulation if no faces detected
                    lastFacePosition = simulateFaceDetection();
                    updateAvatarFace(lastFacePosition);
                }
            } catch (detectionError) {
                console.warn('MediaPipe detection error:', detectionError);
                // Fallback to simulation
                lastBodyPosition = simulateBodyPose();
                lastFacePosition = simulateFaceDetection();
                updateAvatarBody(lastBodyPosition);
                updateAvatarFace(lastFacePosition);
            }
        } else {
            // Use simulation if MediaPipe isn't available
            lastBodyPosition = simulateBodyPose();
            lastFacePosition = simulateFaceDetection();
            updateAvatarBody(lastBodyPosition);
            updateAvatarFace(lastFacePosition);
        }
    } catch (error) {
        console.error('Error in tracking processing:', error);
        // Fallback to simulation
        lastBodyPosition = simulateBodyPose();
        lastFacePosition = simulateFaceDetection();
        updateAvatarBody(lastBodyPosition);
        updateAvatarFace(lastFacePosition);
    }
}

// Process MediaPipe Pose results and map to our format
async function processMediaPipePose(pose) {
    try {
        // MediaPipe BlazePose provides 33 keypoints
        // We need to map these correctly to match our avatar's expectations
        
        // Create keypoints array with the same structure as expected by updateAvatarBody
        const keypoints = Array(17).fill(null);
        
        if (pose.keypoints) {
            // MediaPipe provides an array of keypoints with name properties
            // We need to map them correctly to our expected indices
            
            // Define a mapping between MediaPipe landmark names and our indices
            const keypointMapping = {
                'nose': 0,
                'left_eye': 1, 'right_eye': 2,
                'left_ear': 3, 'right_ear': 4,
                'left_shoulder': 5, 'right_shoulder': 6,
                'left_elbow': 7, 'right_elbow': 8,
                'left_wrist': 9, 'right_wrist': 10,
                'left_hip': 11, 'right_hip': 12,
                'left_knee': 13, 'right_knee': 14,
                'left_ankle': 15, 'right_ankle': 16
            };
            
            // Iterate through all pose keypoints
            pose.keypoints.forEach(keypoint => {
                if (keypoint.name && keypointMapping.hasOwnProperty(keypoint.name)) {
                    const index = keypointMapping[keypoint.name];
                    keypoints[index] = { 
                        x: keypoint.x, 
                        y: keypoint.y, 
                        score: keypoint.score || 0.5
                    };
                }
            });
            
            // Handle if indices are used instead of names in some MediaPipe versions
            if (!keypoints[0] && pose.keypoints.length >= 33) {
                // Fallback mapping based on BlazePose's 33 keypoints
                // These indices might need adjustment based on actual MediaPipe implementation
                const indexMapping = {
                    0: 0,  // nose
                    2: 1, 4: 2,  // eyes
                    7: 3, 8: 4,  // ears
                    11: 5, 12: 6, // shoulders
                    13: 7, 14: 8, // elbows
                    15: 9, 16: 10, // wrists
                    23: 11, 24: 12, // hips
                    25: 13, 26: 14, // knees
                    27: 15, 28: 16  // ankles
                };
                
                // Apply the index-based mapping
                Object.entries(indexMapping).forEach(([mpIndex, ourIndex]) => {
                    const mpIdx = parseInt(mpIndex);
                    if (pose.keypoints[mpIdx]) {
                        keypoints[ourIndex] = {
                            x: pose.keypoints[mpIdx].x,
                            y: pose.keypoints[mpIdx].y,
                            score: pose.keypoints[mpIdx].score || 0.5
                        };
                    }
                });
            }
        }
        
        // Fill in any missing keypoints with simulation for smoother animation
        const simulatedPose = simulateBodyPose();
        for (let i = 0; i < keypoints.length; i++) {
            if (!keypoints[i] && simulatedPose[i]) {
                keypoints[i] = simulatedPose[i];
            }
        }
        
        // Enhanced normalization to better match avatar scale and proportions
        // This is crucial for making the avatar movements match the body tracking
        if (keypoints[5] && keypoints[6]) {  // If shoulders are detected
            const centerX = elements.canvas.width / 2;
            const centerY = elements.canvas.height / 2;
            
            // Calculate shoulder width to scale movements proportionally
            const shoulderWidth = Math.abs(keypoints[6].x - keypoints[5].x);
            const scaleFactor = 170 / shoulderWidth; // 170 is the avatar's approximate shoulder width
            
            // Apply better scaling to the keypoints
            keypoints.forEach(point => {
                if (point) {
                    // Center the coordinates relative to the midpoint between shoulders
                    const midShoulderX = (keypoints[5].x + keypoints[6].x) / 2;
                    const midShoulderY = (keypoints[5].y + keypoints[6].y) / 2;
                    
                    // Apply scaled offsets
                    point.x = ((point.x - midShoulderX) * scaleFactor) + centerX;
                    point.y = ((point.y - midShoulderY) * scaleFactor) + centerY;
                }
            });
        }
        
        // Apply smoothing with improved sensitivity for natural movement
        const adaptiveSmoothing = Math.min(0.9, appState.config.smoothingLevel * 1.2);
        const smoothedPose = applySmoothing(keypoints, lastBodyPosition, adaptiveSmoothing);
        lastBodyPosition = smoothedPose;
        
        // Update avatar body based on detected pose
        updateAvatarBody(smoothedPose);
        
    } catch (error) {
        console.error('Error processing MediaPipe pose:', error);
        // Fallback to simulation with gradual transition
        const bodyPose = simulateBodyPose();
        // Blend with last position for smoother fallback
        if (lastBodyPosition && lastBodyPosition.length > 0) {
            for (let i = 0; i < bodyPose.length; i++) {
                if (bodyPose[i] && lastBodyPosition[i]) {
                    bodyPose[i].x = bodyPose[i].x * 0.3 + lastBodyPosition[i].x * 0.7;
                    bodyPose[i].y = bodyPose[i].y * 0.3 + lastBodyPosition[i].y * 0.7;
                }
            }
        }
        lastBodyPosition = bodyPose;
        updateAvatarBody(bodyPose);
    }
}

async function processMediaPipeFace(face) {
    try {
        // Initialize face data structure
        let faceData = {
            x: 0,
            y: 0,
            z: 0,
            rx: 0, // nod (pitch)
            ry: 0, // turn (yaw)
            rz: 0  // tilt (roll)
        };
        
        if (face.keypoints) {
            // MediaPipe Face Mesh has 468 landmarks
            // We need specific points for accurate face tracking
            
            // First, identify key facial landmarks by name or index
            // The most reliable method is to use the standard indices from MediaPipe
            const keypoints = face.keypoints;
            
            // Map key face points (MediaPipe Face Mesh standard indices)
            const noseTip = findKeypoint(keypoints, 'noseTip', 4);
            const foreHead = findKeypoint(keypoints, 'foreheadCenter', 151);
            const leftEye = findKeypoint(keypoints, 'leftEye', 159);
            const rightEye = findKeypoint(keypoints, 'rightEye', 386);
            const leftCheek = findKeypoint(keypoints, 'leftCheek', 187);
            const rightCheek = findKeypoint(keypoints, 'rightCheek', 411);
            const leftMouth = findKeypoint(keypoints, 'leftMouth', 61);
            const rightMouth = findKeypoint(keypoints, 'rightMouth', 291);
            const topMouth = findKeypoint(keypoints, 'topMouth', 0);
            const bottomMouth = findKeypoint(keypoints, 'bottomMouth', 17);
            
            // Get video dimensions
            const videoWidth = elements.video.videoWidth || elements.video.width || elements.canvas.width;
            const videoHeight = elements.video.videoHeight || elements.video.height || elements.canvas.height;
            const centerX = videoWidth / 2;
            const centerY = videoHeight / 2;
            
            // Calculate face center for more stable positioning
            const faceCenterX = noseTip ? noseTip.x : (leftEye && rightEye ? (leftEye.x + rightEye.x) / 2 : centerX);
            const faceCenterY = noseTip ? noseTip.y : (leftEye && rightEye ? (leftEye.y + rightEye.y) / 2 : centerY);
            
            // Improved calculation of normalized position
            // Use a proportional scale factor for more natural movement
            const faceMovementScale = 2.5; // Amplify face movement for more visible animation
            faceData.x = ((faceCenterX - centerX) / centerX) * 20 * faceMovementScale;
            faceData.y = ((faceCenterY - centerY) / centerY) * 15 * faceMovementScale;
            
            // Better depth calculation using eye distance for scale
            if (leftEye && rightEye) {
                const eyeDistance = Math.sqrt(
                    Math.pow(rightEye.x - leftEye.x, 2) + 
                    Math.pow(rightEye.y - leftEye.y, 2)
                );
                const normalizedEyeDistance = eyeDistance / videoWidth;
                // Calibrated conversion from eye distance to depth
                faceData.z = (normalizedEyeDistance - 0.09) * 3;
            }
            
            // Improved rotation calculations
            if (leftEye && rightEye) {
                // Roll (tilting head side to side) - angle between eyes
                const eyeDeltaX = rightEye.x - leftEye.x;
                const eyeDeltaY = rightEye.y - leftEye.y;
                faceData.rz = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);
                
                // Yaw (turning left/right) - based on eye width compared to normal
                const standardEyeDistance = videoWidth * 0.12; // Expected distance when facing forward
                const currentEyeDistance = Math.abs(eyeDeltaX);
                const eyeDistanceRatio = currentEyeDistance / standardEyeDistance;
                // Calculate yaw angle with more natural limits
                faceData.ry = (1 - eyeDistanceRatio) * 45 * Math.sign(centerX - faceCenterX);
                
                // Pitch (nodding up/down) - using nose and forehead positions
                if (noseTip && foreHead) {
                    const noseToForeheadVector = {
                        x: foreHead.x - noseTip.x,
                        y: foreHead.y - noseTip.y
                    };
                    const verticalAngle = Math.atan2(noseToForeheadVector.y, noseToForeheadVector.x) * (180 / Math.PI);
                    // Map to a reasonable pitch range
                    faceData.rx = -verticalAngle * 1.5;
                }
                
                // Alternative pitch calculation using mouth position
                if (!foreHead && topMouth && bottomMouth) {
                    const mouthHeight = Math.abs(topMouth.y - bottomMouth.y);
                    const normalMouthHeight = videoHeight * 0.03;
                    const mouthRatio = mouthHeight / normalMouthHeight;
                    faceData.rx = (1 - mouthRatio) * 30;
                }
            }
            
            // Add mouth tracking for talking animation
            if (leftMouth && rightMouth && topMouth && bottomMouth) {
                // Calculate mouth openness
                const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
                const mouthHeight = Math.abs(bottomMouth.y - topMouth.y);
                const mouthRatio = mouthHeight / mouthWidth;
                
                // Store mouth openness in appState for avatar animation
                appState.mouthOpenness = Math.min(1, Math.max(0, mouthRatio * 3));
            }
            
            // Limit values to reasonable ranges with smoother transitions
            faceData.x = Math.max(-40, Math.min(40, faceData.x));
            faceData.y = Math.max(-40, Math.min(40, faceData.y));
            faceData.z = Math.max(-0.3, Math.min(0.3, faceData.z));
            faceData.rx = Math.max(-30, Math.min(30, faceData.rx));
            faceData.ry = Math.max(-40, Math.min(40, faceData.ry));
            faceData.rz = Math.max(-20, Math.min(20, faceData.rz));
        } else {
            // Fallback to simulation
            faceData = simulateFaceDetection();
        }
        
        // Apply smoothing with enhanced responsiveness based on movement magnitude
        const smoothedFace = {
            x: applyAdaptiveSmoothing(faceData.x, lastFacePosition.x, appState.config.smoothingLevel),
            y: applyAdaptiveSmoothing(faceData.y, lastFacePosition.y, appState.config.smoothingLevel),
            z: applyAdaptiveSmoothing(faceData.z, lastFacePosition.z, appState.config.smoothingLevel + 0.1), // Extra smoothing for depth
            rx: applyAdaptiveSmoothing(faceData.rx, lastFacePosition.rx, appState.config.smoothingLevel),
            ry: applyAdaptiveSmoothing(faceData.ry, lastFacePosition.ry, appState.config.smoothingLevel),
            rz: applyAdaptiveSmoothing(faceData.rz, lastFacePosition.rz, appState.config.smoothingLevel)
        };
        
        lastFacePosition = smoothedFace;
        
        // Update avatar face based on detected landmarks
        updateAvatarFace(smoothedFace);
    } catch (error) {
        console.error('Error processing MediaPipe face:', error);
        // Fallback to simulation with transition blending
        const faceData = simulateFaceDetection();
        // Blend with last position for smoother fallback
        if (lastFacePosition) {
            faceData.x = faceData.x * 0.3 + lastFacePosition.x * 0.7;
            faceData.y = faceData.y * 0.3 + lastFacePosition.y * 0.7;
            faceData.z = faceData.z * 0.3 + lastFacePosition.z * 0.7;
            faceData.rx = faceData.rx * 0.3 + lastFacePosition.rx * 0.7;
            faceData.ry = faceData.ry * 0.3 + lastFacePosition.ry * 0.7;
            faceData.rz = faceData.rz * 0.3 + lastFacePosition.rz * 0.7;
        }
        lastFacePosition = faceData;
        updateAvatarFace(faceData);
    }
}

// Helper function to find keypoint by name or index with fallback
function findKeypoint(keypoints, name, fallbackIndex) {
    // Try to find by name first (for newer MediaPipe versions)
    const namedKeypoint = keypoints.find(kp => kp.name === name);
    if (namedKeypoint) return namedKeypoint;
    
    // Fallback to index (for older MediaPipe versions)
    return keypoints[fallbackIndex] || null;
}

// Improved adaptive smoothing based on movement speed
function applyAdaptiveSmoothing(newValue, oldValue, baseSmoothingFactor) {
    if (oldValue === undefined) return newValue;
    
    // Calculate movement magnitude
    const movement = Math.abs(newValue - oldValue);
    
    // Adjust smoothing factor - less smoothing for faster movements
    // This makes the avatar more responsive during quick movements
    let adaptiveFactor = baseSmoothingFactor;
    if (movement > 10) {
        adaptiveFactor = Math.max(0.1, baseSmoothingFactor - 0.3);
    } else if (movement > 5) {
        adaptiveFactor = Math.max(0.2, baseSmoothingFactor - 0.15);
    }
    
    // Apply smoothing with the adaptive factor
    return oldValue * adaptiveFactor + newValue * (1 - adaptiveFactor);
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
                score: point ? point.score : (oldValue[i].score || 0.5)
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
            keypoints[i].score > 0.3 && keypoints[j].score > 0.3) {
            
            ctx.beginPath();
            ctx.moveTo(keypoints[i].x, keypoints[i].y);
            ctx.lineTo(keypoints[j].x, keypoints[j].y);
            ctx.stroke();
        }
    });
    
    // Draw keypoints
    keypoints.forEach((point, i) => {
        if (point && point.score > 0.3) {
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

// Simulation functions below - used as fallback if MediaPipe fails

// Simulate body pose detection (fallback)
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

// Simulate face detection (fallback)
function simulateFaceDetection() {
    const time = Date.now() / 1000;
    
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