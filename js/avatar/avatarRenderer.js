// Avatar Renderer - Manages the SVG avatar and its animations
import { elements, appState } from '../main.js';

// SVG Elements
let avatarSVG;
let backgroundElements;
let avatarGroup;
let head;
let leftEye;
let rightEye;
let mouth;
let leftEyebrow;
let rightEyebrow;
let leftArm;
let rightArm;
let upperBody;

// Initialize the avatar
export async function initializeAvatar(container) {
    // Create the SVG element and its structure
    const svgContent = createAvatarSVG();
    container.innerHTML = svgContent;
    
    // Get references to elements
    avatarSVG = document.getElementById('avatarSVG');
    backgroundElements = document.getElementById('backgroundElements');
    avatarGroup = document.getElementById('avatarGroup');
    head = document.getElementById('head');
    leftEye = document.getElementById('leftEye');
    rightEye = document.getElementById('rightEye');
    mouth = document.getElementById('mouth');
    leftEyebrow = document.getElementById('leftEyebrow');
    rightEyebrow = document.getElementById('rightEyebrow');
    leftArm = document.getElementById('leftArm');
    rightArm = document.getElementById('rightArm');
    upperBody = document.getElementById('upperBody');
    
    return true;
}

// Create the avatar SVG structure
function createAvatarSVG() {
    return `
        <svg id="avatarSVG" viewBox="0 0 640 480" preserveAspectRatio="xMidYMid meet">
            <!-- Dynamic Background Elements -->
            <defs>
                <radialGradient id="avatarGlow" cx="0.5" cy="0.5" r="0.5" fx="0.5" fy="0.5">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.3)" />
                    <stop offset="100%" stop-color="rgba(255,255,255,0)" />
                </radialGradient>
                
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="glow" />
                    <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
            </defs>
            
            <g id="backgroundElements"></g>
            
            <!-- Avatar Component -->
            <g id="avatarGroup" transform="translate(320, 240)">
                <!-- Upper Body -->
                <g id="upperBody">
                    <!-- Torso -->
                    <rect id="torso" x="-80" y="30" width="160" height="200" rx="20" fill="#222" />
                    
                    <!-- Shoulders -->
                    <ellipse id="leftShoulder" cx="-85" cy="50" rx="25" ry="20" fill="#333" />
                    <ellipse id="rightShoulder" cx="85" cy="50" rx="25" ry="20" fill="#333" />
                    
                    <!-- Arms -->
                    <g id="leftArm">
                        <rect id="leftUpperArm" x="-110" y="50" width="25" height="80" rx="10" fill="#333" />
                        <rect id="leftForearm" x="-110" y="130" width="25" height="80" rx="8" fill="#444" />
                    </g>
                    
                    <g id="rightArm">
                        <rect id="rightUpperArm" x="85" y="50" width="25" height="80" rx="10" fill="#333" />
                        <rect id="rightForearm" x="85" y="130" width="25" height="80" rx="8" fill="#444" />
                    </g>
                    
                    <!-- Neck -->
                    <rect id="neck" x="-20" y="0" width="40" height="30" fill="#555" />
                </g>
                
                <!-- Head with Irish Tricolor Balaclava -->
                <g id="head">
                    <!-- Head Base -->
                    <ellipse id="headBase" cx="0" cy="-50" rx="60" ry="70" fill="#666" />
                    
                    <!-- Irish Tricolor Balaclava -->
                    <!-- Green Section -->
                    <path id="balaclavaPart1" d="M-60 -50 Q-60 -120 0 -120 Q60 -120 60 -50 L60 -40 L-60 -40 Z" fill="#169b62" />
                    
                    <!-- White Section -->
                    <path id="balaclavaPart2" d="M-60 -40 L60 -40 L60 -20 L-60 -20 Z" fill="#ffffff" />
                    
                    <!-- Orange Section -->
                    <path id="balaclavaPart3" d="M-60 -20 L60 -20 L60 -10 Q60 20 0 20 Q-60 20 -60 -10 Z" fill="#ff883e" />
                    
                    <!-- Eyes -->
                    <g id="eyes">
                        <ellipse id="leftEye" cx="-25" cy="-50" rx="12" ry="15" fill="#000" />
                        <ellipse id="rightEye" cx="25" cy="-50" rx="12" ry="15" fill="#000" />
                        <!-- Eyebrows -->
                        <path id="leftEyebrow" d="M-40 -70 L-10 -70" stroke="#000" stroke-width="5" stroke-linecap="round" />
                        <path id="rightEyebrow" d="M10 -70 L40 -70" stroke="#000" stroke-width="5" stroke-linecap="round" />
                    </g>
                    
                    <!-- Mouth -->
                    <ellipse id="mouth" cx="0" cy="-10" rx="20" ry="8" fill="#000" />
                </g>
            </g>
        </svg>
    `;
}

// Update avatar face based on detected face data
export function updateAvatarFace(faceData) {
    if (!head || !leftEye || !rightEye || !mouth || !leftEyebrow || !rightEyebrow) return;
    
    // Apply transformations to head element
    head.setAttribute('transform', 
        `translate(${faceData.x}, ${faceData.y}) scale(${1 + faceData.z}) rotate(${faceData.rz})`
    );
    
    // Update eye shapes based on vertical head rotation (looking up/down)
    // When looking up, eyes get more open, when looking down, they get more closed
    const eyeScaleY = 1 - (faceData.rx / 45) * 0.5;
    leftEye.setAttribute('ry', 15 * Math.max(0.5, Math.min(1.2, eyeScaleY)));
    rightEye.setAttribute('ry', 15 * Math.max(0.5, Math.min(1.2, eyeScaleY)));
    
    // Horizontal eye movement for gaze direction (follows head turn)
    const eyeShiftX = faceData.ry * 0.2; // Subtle eye movement
    leftEye.setAttribute('cx', -25 - eyeShiftX);
    rightEye.setAttribute('cx', 25 - eyeShiftX);
    
    // Move eyebrows with expressions
    // Eyebrows go up for surprise, down for anger/concentration
    const baseEyebrowY = -70;
    const eyebrowExpression = Math.sin(Date.now() / 3000) * 5;  // Subtle expression changes
    const eyebrowYPos = baseEyebrowY + eyebrowExpression + (faceData.rx * 0.2); // Move with head tilt
    
    // Left eyebrow
    const leftEyebrowPath = `M-40 ${eyebrowYPos} L-10 ${eyebrowYPos + (faceData.rz * 0.2)}`; // Add tilt effect
    leftEyebrow.setAttribute('d', leftEyebrowPath);
    
    // Right eyebrow
    const rightEyebrowPath = `M10 ${eyebrowYPos - (faceData.rz * 0.2)} L40 ${eyebrowYPos}`; // Add tilt effect
    rightEyebrow.setAttribute('d', rightEyebrowPath);
    
    // Update mouth for speech/expression simulation
    const time = Date.now();
    const isTalking = (time % 5000) < 2500; // Toggle talking every 2.5 seconds
    
    if (isTalking) {
        // Talking animation - mouth opens and closes
        const talkSpeed = 200; // Speed of mouth movement
        const mouthOpen = Math.sin(time / talkSpeed) * 0.5 + 0.5; // 0 to 1 value
        mouth.setAttribute('ry', 5 + (mouthOpen * 8)); // Mouth height changes
        mouth.setAttribute('rx', 20 - (mouthOpen * 5)); // Width changes slightly too
    } else {
        // Subtle breathing/idle movement when not talking
        const breatheSpeed = 2000;
        const breathe = Math.sin(time / breatheSpeed) * 0.3 + 0.7; // 0.4 to 1 value
        mouth.setAttribute('ry', 5 * breathe);
        mouth.setAttribute('rx', 20);
    }
}

// Update avatar body based on detected pose
export function updateAvatarBody(bodyPose) {
    if (!bodyPose || bodyPose.length < 5 || !leftArm || !rightArm || !upperBody) return;
    
    try {
        // In the PoseNet model, keypoints are:
        // 0: nose, 1: leftEye, 2: rightEye, 3: leftEar, 4: rightEar,
        // 5: leftShoulder, 6: rightShoulder, 7: leftElbow, 8: rightElbow,
        // 9: leftWrist, 10: rightWrist, 11: leftHip, 12: rightHip,
        // 13: leftKnee, 14: rightKnee, 15: leftAnkle, 16: rightAnkle
        
        // Get shoulder positions - these are key reference points
        let leftShoulderX = -85;
        let rightShoulderX = 85;
        let shoulderY = 50;
        
        // If we have valid shoulder detections, use them
        if (bodyPose[5] && bodyPose[5].score > 0.5 && 
            bodyPose[6] && bodyPose[6].score > 0.5) {
            
            // Get video dimensions for normalization
            const videoWidth = elements.canvas.width;
            const videoHeight = elements.canvas.height;
            
            // Calculate shoulder positions relative to avatar center
            const centerX = videoWidth / 2;
            const centerY = videoHeight / 2;
            
            // Map detected shoulder positions to avatar coordinates
            leftShoulderX = -85 + ((bodyPose[5].x - centerX) / centerX) * 30;
            rightShoulderX = 85 + ((bodyPose[6].x - centerX) / centerX) * 30;
            
            // Calculate shoulder height
            const shoulderDiff = (bodyPose[5].y + bodyPose[6].y) / 2 - centerY;
            shoulderY = 50 + (shoulderDiff / centerY) * 20;
            
            // Update shoulder positions in the SVG
            document.getElementById('leftShoulder').setAttribute('cx', leftShoulderX);
            document.getElementById('rightShoulder').setAttribute('cx', rightShoulderX);
            document.getElementById('leftShoulder').setAttribute('cy', shoulderY);
            document.getElementById('rightShoulder').setAttribute('cy', shoulderY);
        }
        
        // Calculate arm angles based on elbow and wrist positions
        let leftArmAngle = 0;
        let rightArmAngle = 0;
        
        // Left arm angle calculation
        if (bodyPose[7] && bodyPose[7].score > 0.5 && bodyPose[5] && bodyPose[5].score > 0.5) {
            // Vector from shoulder to elbow
            const dx = bodyPose[7].x - bodyPose[5].x;
            const dy = bodyPose[7].y - bodyPose[5].y;
            
            // Calculate angle in degrees
            leftArmAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain angle to reasonable range
            leftArmAngle = Math.max(-60, Math.min(60, leftArmAngle));
        } else {
            // Fallback to subtle movement
            leftArmAngle = Math.sin(Date.now() / 1000) * 10;
        }
        
        // Right arm angle calculation
        if (bodyPose[8] && bodyPose[8].score > 0.5 && bodyPose[6] && bodyPose[6].score > 0.5) {
            // Vector from shoulder to elbow
            const dx = bodyPose[8].x - bodyPose[6].x;
            const dy = bodyPose[8].y - bodyPose[6].y;
            
            // Calculate angle in degrees
            rightArmAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain angle to reasonable range
            rightArmAngle = Math.max(-60, Math.min(60, rightArmAngle));
        } else {
            // Fallback to subtle movement
            rightArmAngle = -Math.sin(Date.now() / 1000) * 10;
        }
        
        // Enhanced forearm positioning
        let leftForearmAngle = 0;
        let rightForearmAngle = 0;
        
        // Left forearm
        if (bodyPose[9] && bodyPose[9].score > 0.5 && bodyPose[7] && bodyPose[7].score > 0.5) {
            // Vector from elbow to wrist
            const dx = bodyPose[9].x - bodyPose[7].x;
            const dy = bodyPose[9].y - bodyPose[7].y;
            
            // Calculate angle relative to elbow
            leftForearmAngle = Math.atan2(dy, dx) * (180 / Math.PI) - leftArmAngle;
            
            // Constrain to reasonable range
            leftForearmAngle = Math.max(-45, Math.min(45, leftForearmAngle));
            
            // Apply transformation to forearm
            document.getElementById('leftForearm').setAttribute('transform', 
                `rotate(${leftForearmAngle}, -110, 130)`);
        }
        
        // Right forearm
        if (bodyPose[10] && bodyPose[10].score > 0.5 && bodyPose[8] && bodyPose[8].score > 0.5) {
            // Vector from elbow to wrist
            const dx = bodyPose[10].x - bodyPose[8].x;
            const dy = bodyPose[10].y - bodyPose[8].y;
            
            // Calculate angle relative to elbow
            rightForearmAngle = Math.atan2(dy, dx) * (180 / Math.PI) - rightArmAngle;
            
            // Constrain to reasonable range
            rightForearmAngle = Math.max(-45, Math.min(45, rightForearmAngle));
            
            // Apply transformation to forearm
            document.getElementById('rightForearm').setAttribute('transform', 
                `rotate(${rightForearmAngle}, 110, 130)`);
        }
        
        // Update arm positions
        leftArm.setAttribute('transform', `rotate(${leftArmAngle}, ${leftShoulderX}, ${shoulderY})`);
        rightArm.setAttribute('transform', `rotate(${rightArmAngle}, ${rightShoulderX}, ${shoulderY})`);
        
        // Add torso rotation based on shoulder alignment
        let torsoRotation = 0;
        if (bodyPose[5] && bodyPose[5].score > 0.5 && bodyPose[6] && bodyPose[6].score > 0.5) {
            // Calculate angle of line between shoulders
            const dx = bodyPose[6].x - bodyPose[5].x;
            const dy = bodyPose[6].y - bodyPose[5].y;
            torsoRotation = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain rotation to reasonable range
            torsoRotation = Math.max(-15, Math.min(15, torsoRotation));
        }
        
        // Add breathing effect
        const breathingRate = 2000; // Slower for natural breathing
        const breatheDepth = 0.02;  // Subtle breathing
        const torsoScale = 1 + Math.sin(Date.now() / breathingRate) * breatheDepth;
        
        // Apply transformations to torso
        upperBody.setAttribute('transform', `scale(${torsoScale}) rotate(${torsoRotation})`);
        
        // Adjust neck position based on head and shoulder positions
        if (bodyPose[0] && bodyPose[0].score > 0.5) {
            const neck = document.getElementById('neck');
            if (neck) {
                const neckY = shoulderY - 30; // Position neck above shoulders
                neck.setAttribute('y', neckY);
            }
        }
    } catch (error) {
        console.error('Error updating avatar body:', error);
        // Fallback to basic animation
        leftArm.setAttribute('transform', `rotate(${Math.sin(Date.now() / 1000) * 5}, -85, 50)`);
        rightArm.setAttribute('transform', `rotate(${-Math.sin(Date.now() / 1000) * 5}, 85, 50)`);
        upperBody.setAttribute('transform', `scale(${1 + Math.sin(Date.now() / 2000) * 0.02})`);
    }
}

// Enhanced face tracking
export function updateAvatarFace(faceData) {
    if (!head || !leftEye || !rightEye || !mouth || !leftEyebrow || !rightEyebrow) return;
    
    try {
        // Apply transformations to head element
        head.setAttribute('transform', 
            `translate(${faceData.x}, ${faceData.y}) scale(${1 + faceData.z}) rotate(${faceData.rz})`
        );
        
        // Update eye shapes based on vertical head rotation (looking up/down)
        // When looking up, eyes get more open, when looking down, they get more closed
        const eyeScaleY = 1 - (faceData.rx / 45) * 0.7;
        leftEye.setAttribute('ry', 15 * Math.max(0.3, Math.min(1.2, eyeScaleY)));
        rightEye.setAttribute('ry', 15 * Math.max(0.3, Math.min(1.2, eyeScaleY)));
        
        // Horizontal eye movement for gaze direction (follows head turn)
        const eyeShiftX = faceData.ry * 0.3; // Enhanced eye movement
        leftEye.setAttribute('cx', -25 - eyeShiftX);
        rightEye.setAttribute('cx', 25 - eyeShiftX);
        
        // More responsive eyebrow movement
        const baseEyebrowY = -70;
        const eyebrowExpression = Math.sin(Date.now() / 2000) * 7;  // More pronounced expression
        
        // Eyebrows react to head tilt
        const leftEyebrowTilt = faceData.rz * 0.3; // Enhanced tilt sensitivity
        const rightEyebrowTilt = -faceData.rz * 0.3;
        
        // Eyebrows go up when looking up, down when looking down
        const eyebrowYOffset = -faceData.rx * 0.3;
        
        // Left eyebrow
        const leftEyebrowYPos = baseEyebrowY + eyebrowExpression + eyebrowYOffset;
        const leftEyebrowPath = `M-40 ${leftEyebrowYPos + leftEyebrowTilt} L-10 ${leftEyebrowYPos - leftEyebrowTilt}`;
        leftEyebrow.setAttribute('d', leftEyebrowPath);
        
        // Right eyebrow
        const rightEyebrowYPos = baseEyebrowY + eyebrowExpression + eyebrowYOffset;
        const rightEyebrowPath = `M10 ${rightEyebrowYPos + rightEyebrowTilt} L40 ${rightEyebrowYPos - rightEyebrowTilt}`;
        rightEyebrow.setAttribute('d', rightEyebrowPath);
        
        // Improved mouth animation - looks more natural
        const time = Date.now();
        
        // Check if head is moving significantly (indicating speech)
        const headMovement = Math.abs(faceData.x - lastFacePosition.x) + 
                           Math.abs(faceData.y - lastFacePosition.y);
        
        const isTalking = headMovement > 0.5 || (time % 4000) < 2000; // More dynamic talking detection
        
        if (isTalking) {
            // Dynamic talking speed based on movement
            const talkSpeed = Math.max(100, 300 - headMovement * 200);
            
            // Realistic mouth movement
            const mouthOpen = Math.sin(time / talkSpeed) * 0.5 + 0.5; // 0 to 1 value
            mouth.setAttribute('ry', 4 + (mouthOpen * 10)); // More pronounced vertical mouth movement
            mouth.setAttribute('rx', 20 - (mouthOpen * 7)); // Width changes with talking
        } else {
            // Subtle breathing/idle movement when not talking
            const breatheSpeed = 2000;
            const breathe = Math.sin(time / breatheSpeed) * 0.2 + 0.8; // 0.6 to 1 value
            mouth.setAttribute('ry', 4 * breathe);
            mouth.setAttribute('rx', 20);
        }
    } catch (error) {
        console.error('Error updating avatar face:', error);
        // Basic fallback animation
        head.setAttribute('transform', 'translate(0, 0) scale(1) rotate(0)');
        leftEye.setAttribute('ry', 15);
        rightEye.setAttribute('ry', 15);
        mouth.setAttribute('ry', 8);
    }
}

// Set avatar scale
export function setAvatarScale(scale) {
    if (!avatarGroup || !elements.canvas) return;
    
    avatarGroup.setAttribute('transform', 
        `translate(${elements.canvas.width/2}, ${elements.canvas.height/2}) scale(${scale})`);
}

// Reset avatar position
export function resetAvatarPosition() {
    if (!avatarGroup || !head || !leftEye || !rightEye || !leftEyebrow || 
        !rightEyebrow || !mouth || !leftArm || !rightArm || !upperBody) return;
    
    avatarGroup.setAttribute('transform', `translate(${elements.canvas.width/2 || 320}, ${elements.canvas.height/2 || 240})`);
    head.setAttribute('transform', 'translate(0, 0) scale(1) rotate(0)');
    leftEye.setAttribute('ry', 15);
    rightEye.setAttribute('ry', 15);
    leftEye.setAttribute('cx', -25);
    rightEye.setAttribute('cx', 25);
    leftEyebrow.setAttribute('d', 'M-40 -70 L-10 -70');
    rightEyebrow.setAttribute('d', 'M10 -70 L40 -70');
    mouth.setAttribute('ry', 8);
    mouth.setAttribute('rx', 20);
    leftArm.setAttribute('transform', 'rotate(0, -85, 50)');
    rightArm.setAttribute('transform', 'rotate(0, 85, 50)');
    upperBody.setAttribute('transform', 'scale(1)');
}