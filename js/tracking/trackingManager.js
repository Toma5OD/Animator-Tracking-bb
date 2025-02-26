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
        // Map MediaPipe pose keypoints to our expected format
        // BlazePose uses a different set of keypoints than PoseNet
        // We need to map these to match our avatar's expectations
        
        // Create keypoints array with the same structure as PoseNet
        // MediaPipe provides more points but we'll map the ones we need
        const keypoints = Array(17).fill(null);
        
        // Map face points (this may differ based on the exact MediaPipe model)
        if (pose.keypoints) {
            // Nose
            const nose = pose.keypoints.find(kp => kp.name === 'nose');
            if (nose) keypoints[0] = { x: nose.x, y: nose.y, score: nose.score };
            
            // Eyes
            const leftEye = pose.keypoints.find(kp => kp.name === 'left_eye');
            const rightEye = pose.keypoints.find(kp => kp.name === 'right_eye');
            if (leftEye) keypoints[1] = { x: leftEye.x, y: leftEye.y, score: leftEye.score };
            if (rightEye) keypoints[2] = { x: rightEye.x, y: rightEye.y, score: rightEye.score };
            
            // Ears
            const leftEar = pose.keypoints.find(kp => kp.name === 'left_ear');
            const rightEar = pose.keypoints.find(kp => kp.name === 'right_ear');
            if (leftEar) keypoints[3] = { x: leftEar.x, y: leftEar.y, score: leftEar.score };
            if (rightEar) keypoints[4] = { x: rightEar.x, y: rightEar.y, score: rightEar.score };
            
            // Shoulders
            const leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
            const rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
            if (leftShoulder) keypoints[5] = { x: leftShoulder.x, y: leftShoulder.y, score: leftShoulder.score };
            if (rightShoulder) keypoints[6] = { x: rightShoulder.x, y: rightShoulder.y, score: rightShoulder.score };
            
            // Elbows
            const leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
            const rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');
            if (leftElbow) keypoints[7] = { x: leftElbow.x, y: leftElbow.y, score: leftElbow.score };
            if (rightElbow) keypoints[8] = { x: rightElbow.x, y: rightElbow.y, score: rightElbow.score };
            
            // Wrists
            const leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
            const rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');
            if (leftWrist) keypoints[9] = { x: leftWrist.x, y: leftWrist.y, score: leftWrist.score };
            if (rightWrist) keypoints[10] = { x: rightWrist.x, y: rightWrist.y, score: rightWrist.score };
            
            // Hips
            const leftHip = pose.keypoints.find(kp => kp.name === 'left_hip');
            const rightHip = pose.keypoints.find(kp => kp.name === 'right_hip');
            if (leftHip) keypoints[11] = { x: leftHip.x, y: leftHip.y, score: leftHip.score };
            if (rightHip) keypoints[12] = { x: rightHip.x, y: rightHip.y, score: rightHip.score };
            
            // Knees
            const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
            const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee');
            if (leftKnee) keypoints[13] = { x: leftKnee.x, y: leftKnee.y, score: leftKnee.score };
            if (rightKnee) keypoints[14] = { x: rightKnee.x, y: rightKnee.y, score: rightKnee.score };
            
            // Ankles
            const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
            const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle');
            if (leftAnkle) keypoints[15] = { x: leftAnkle.x, y: leftAnkle.y, score: leftAnkle.score };
            if (rightAnkle) keypoints[16] = { x: rightAnkle.x, y: rightAnkle.y, score: rightAnkle.score };
        }
        
        // Fill in any missing keypoints with simulation
        const simulatedPose = simulateBodyPose();
        for (let i = 0; i < keypoints.length; i++) {
            if (!keypoints[i] && simulatedPose[i]) {
                keypoints[i] = simulatedPose[i];
            }
        }
        
        // Apply smoothing
        const smoothedPose = applySmoothing(keypoints, lastBodyPosition, appState.config.smoothingLevel);
        lastBodyPosition = smoothedPose;
        
        // Update avatar body based on detected pose
        updateAvatarBody(smoothedPose);
    } catch (error) {
        console.error('Error processing MediaPipe pose:', error);
        // Fallback to simulation
        const bodyPose = simulateBodyPose();
        lastBodyPosition = bodyPose;
        updateAvatarBody(bodyPose);
    }
}

// Process MediaPipe Face Mesh results and map to our format
async function processMediaPipeFace(face) {
    try {
        // Map MediaPipe face mesh landmarks to our face parameters
        // MediaPipe Face Mesh gives us 468 landmarks
        
        // Calculate face position and rotation based on key points
        let faceData = {
            x: 0,
            y: 0,
            z: 0,
            rx: 0, // nod (pitch)
            ry: 0, // turn (yaw)
            rz: 0  // tilt (roll)
        };
        
        if (face.keypoints) {
            // Get key face landmarks
            const keypoints = face.keypoints;
            
            // Basic face position
            // This uses the middle of the face as reference
            const noseTip = keypoints.find(kp => kp.name === 'noseTip') || keypoints[1]; // Fallback to center point
            const leftEye = keypoints.find(kp => kp.name === 'leftEye') || keypoints[33];
            const rightEye = keypoints.find(kp => kp.name === 'rightEye') || keypoints[263];
            const leftCheek = keypoints.find(kp => kp.name === 'leftCheek') || keypoints[50];
            const rightCheek = keypoints.find(kp => kp.name === 'rightCheek') || keypoints[280];
            const faceCenter = keypoints.find(kp => kp.name === 'midwayBetweenEyes') || keypoints[168];
            
            // Calculate normalized position relative to center of video
            const videoWidth = elements.video.videoWidth || elements.video.width;
            const videoHeight = elements.video.videoHeight || elements.video.height;
            const centerX = videoWidth / 2;
            const centerY = videoHeight / 2;
            
            // Position in normalized coordinates (-1 to 1 range)
            faceData.x = ((faceCenter ? faceCenter.x : noseTip.x) - centerX) / (centerX / 2);
            faceData.y = ((faceCenter ? faceCenter.y : noseTip.y) - centerY) / (centerY / 2);
            
            // Calculate face width for scale/depth
            const faceWidth = leftCheek && rightCheek ? 
                Math.abs(rightCheek.x - leftCheek.x) / videoWidth : 0.15;
            faceData.z = (faceWidth - 0.15) * 2;
            
            // Calculate face rotation
            if (leftEye && rightEye) {
                // Yaw (turning left/right) - based on eye positions
                const eyeDiffX = rightEye.x - leftEye.x;
                const normalEyeDiffX = videoWidth * 0.08; // Expected eye distance when facing forward
                faceData.ry = (eyeDiffX - normalEyeDiffX) / normalEyeDiffX * 15;
                
                // Roll (tilting head side to side) - angle between eyes
                const eyeDiffY = rightEye.y - leftEye.y;
                faceData.rz = Math.atan2(eyeDiffY, eyeDiffX) * (180 / Math.PI);
                
                // Pitch (nodding up/down) - harder to estimate with 2D landmarks
                // This is a simplified approximation
                if (noseTip && faceCenter) {
                    const noseVectorY = noseTip.y - faceCenter.y;
                    const normalNoseVectorY = videoHeight * 0.03; // Expected nose length
                    faceData.rx = (noseVectorY - normalNoseVectorY) / normalNoseVectorY * 15;
                }
            }
            
            // Limit values to reasonable ranges
            faceData.x = Math.max(-50, Math.min(50, faceData.x));
            faceData.y = Math.max(-50, Math.min(50, faceData.y));
            faceData.z = Math.max(-0.2, Math.min(0.3, faceData.z));
            faceData.rx = Math.max(-45, Math.min(45, faceData.rx));
            faceData.ry = Math.max(-45, Math.min(45, faceData.ry));
            faceData.rz = Math.max(-30, Math.min(30, faceData.rz));
        } else {
            // Fallback to simulation
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
        
        // Update avatar face based on detected landmarks
        updateAvatarFace(smoothedFace);
    } catch (error) {
        console.error('Error processing MediaPipe face:', error);
        // Fallback to simulation
        const faceData = simulateFaceDetection();
        lastFacePosition = faceData;
        updateAvatarFace(faceData);
    }
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