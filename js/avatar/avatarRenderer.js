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

export function updateAvatarBody(bodyPose) {
    if (!bodyPose || bodyPose.length < 5 || !leftArm || !rightArm || !upperBody) return;
    
    try {
        // In the MediaPipe model, keypoints are:
        // 0: nose, 1: leftEye, 2: rightEye, 3: leftEar, 4: rightEar,
        // 5: leftShoulder, 6: rightShoulder, 7: leftElbow, 8: rightElbow,
        // 9: leftWrist, 10: rightWrist, 11: leftHip, 12: rightHip,
        // 13: leftKnee, 14: rightKnee, 15: leftAnkle, 16: rightAnkle
        
        // Get shoulder positions - these are key reference points
        let leftShoulderX = -85;
        let rightShoulderX = 85;
        let shoulderY = 50;
        
        // If we have valid shoulder detections, use them
        if (bodyPose[5] && bodyPose[5].score > 0.3 && 
            bodyPose[6] && bodyPose[6].score > 0.3) {
            
            // Get video dimensions for normalization
            const videoWidth = elements.canvas.width;
            const videoHeight = elements.canvas.height;
            
            // Calculate shoulder positions relative to avatar center
            const centerX = videoWidth / 2;
            const centerY = videoHeight / 2;
            
            // Calculate shoulder midpoint for better centering
            const shoulderMidX = (bodyPose[5].x + bodyPose[6].x) / 2;
            const shoulderMidY = (bodyPose[5].y + bodyPose[6].y) / 2;
            
            // Calculate shoulder width for better scaling
            const shoulderWidth = Math.abs(bodyPose[6].x - bodyPose[5].x);
            const shoulderScaleFactor = Math.min(1.5, Math.max(0.5, 170 / shoulderWidth)); // 170 is avatar shoulder width
            
            // Map detected shoulder positions to avatar coordinates with improved scaling
            // The offset calculation now uses the difference from shoulder midpoint
            leftShoulderX = -85 + ((bodyPose[5].x - shoulderMidX) / (shoulderWidth/2)) * 40;
            rightShoulderX = 85 + ((bodyPose[6].x - shoulderMidX) / (shoulderWidth/2)) * 40;
            
            // Calculate shoulder height with more natural constraints
            const shoulderDiff = shoulderMidY - centerY;
            shoulderY = 50 + (shoulderDiff / (videoHeight/4)) * 30;
            shoulderY = Math.max(30, Math.min(80, shoulderY)); // Limit vertical range
            
            // Update shoulder positions in the SVG
            document.getElementById('leftShoulder').setAttribute('cx', leftShoulderX);
            document.getElementById('rightShoulder').setAttribute('cx', rightShoulderX);
            document.getElementById('leftShoulder').setAttribute('cy', shoulderY);
            document.getElementById('rightShoulder').setAttribute('cy', shoulderY);
        }
        
        // Calculate arm angles based on elbow and wrist positions with better constraints
        let leftArmAngle = 0;
        let rightArmAngle = 0;
        let leftForearmAngle = 0;
        let rightForearmAngle = 0;
        
        // Left arm angle calculation - enhanced for accurate bending
        if (bodyPose[7] && bodyPose[7].score > 0.3 && bodyPose[5] && bodyPose[5].score > 0.3) {
            // Vector from shoulder to elbow
            const dx = bodyPose[7].x - bodyPose[5].x;
            const dy = bodyPose[7].y - bodyPose[5].y;
            
            // Calculate angle in degrees
            leftArmAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain angle to reasonable range for avatar's structure
            leftArmAngle = Math.max(-80, Math.min(80, leftArmAngle));
            
            // Calculate forearm angle if wrist is detected
            if (bodyPose[9] && bodyPose[9].score > 0.3) {
                const fDx = bodyPose[9].x - bodyPose[7].x;
                const fDy = bodyPose[9].y - bodyPose[7].y;
                leftForearmAngle = Math.atan2(fDy, fDx) * (180 / Math.PI) - leftArmAngle;
                leftForearmAngle = Math.max(-90, Math.min(90, leftForearmAngle));
            }
        } else {
            // Fallback to subtle movement with breathing effect
            leftArmAngle = Math.sin(Date.now() / 1500) * 8;
        }
        
        // Right arm angle calculation - enhanced for accurate bending
        if (bodyPose[8] && bodyPose[8].score > 0.3 && bodyPose[6] && bodyPose[6].score > 0.3) {
            // Vector from shoulder to elbow
            const dx = bodyPose[8].x - bodyPose[6].x;
            const dy = bodyPose[8].y - bodyPose[6].y;
            
            // Calculate angle in degrees
            rightArmAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain angle to reasonable range for avatar's structure
            rightArmAngle = Math.max(-80, Math.min(80, rightArmAngle));
            
            // Calculate forearm angle if wrist is detected
            if (bodyPose[10] && bodyPose[10].score > 0.3) {
                const fDx = bodyPose[10].x - bodyPose[8].x;
                const fDy = bodyPose[10].y - bodyPose[8].y;
                rightForearmAngle = Math.atan2(fDy, fDx) * (180 / Math.PI) - rightArmAngle;
                rightForearmAngle = Math.max(-90, Math.min(90, rightForearmAngle));
            }
        } else {
            // Fallback to subtle movement with breathing effect but opposite phase
            rightArmAngle = -Math.sin(Date.now() / 1500) * 8;
        }
        
        // Update arm positions with improved animation
        // Apply two-part articulation for more realistic arm movement
        const leftUpperArm = document.getElementById('leftUpperArm');
        const leftForearm = document.getElementById('leftForearm');
        const rightUpperArm = document.getElementById('rightUpperArm');
        const rightForearm = document.getElementById('rightForearm');
        
        if (leftUpperArm && leftForearm) {
            // Reset transforms first to avoid compound transformations
            leftArm.setAttribute('transform', '');
            
            // Position upper arm at shoulder
            leftUpperArm.setAttribute('transform', `rotate(${leftArmAngle}, ${leftShoulderX}, ${shoulderY})`);
            
            // Position forearm relative to upper arm's position and rotation
            // Calculate elbow position after upper arm rotation
            const elbowX = leftShoulderX + Math.cos(leftArmAngle * Math.PI / 180) * 80;
            const elbowY = shoulderY + Math.sin(leftArmAngle * Math.PI / 180) * 80;
            
            leftForearm.setAttribute('transform', 
                `translate(${elbowX - leftShoulderX}, ${elbowY - shoulderY}) ` +
                `rotate(${leftForearmAngle}, 0, 0)`);
        } else {
            // Fallback if detailed arm elements not found
            leftArm.setAttribute('transform', `rotate(${leftArmAngle}, ${leftShoulderX}, ${shoulderY})`);
        }
        
        if (rightUpperArm && rightForearm) {
            // Reset transforms first
            rightArm.setAttribute('transform', '');
            
            // Position upper arm at shoulder
            rightUpperArm.setAttribute('transform', `rotate(${rightArmAngle}, ${rightShoulderX}, ${shoulderY})`);
            
            // Position forearm
            const elbowX = rightShoulderX + Math.cos(rightArmAngle * Math.PI / 180) * 80;
            const elbowY = shoulderY + Math.sin(rightArmAngle * Math.PI / 180) * 80;
            
            rightForearm.setAttribute('transform', 
                `translate(${elbowX - rightShoulderX}, ${elbowY - shoulderY}) ` +
                `rotate(${rightForearmAngle}, 0, 0)`);
        } else {
            // Fallback if detailed arm elements not found
            rightArm.setAttribute('transform', `rotate(${rightArmAngle}, ${rightShoulderX}, ${shoulderY})`);
        }
        
        // Add torso rotation based on shoulder alignment with improved mechanics
        let torsoRotation = 0;
        if (bodyPose[5] && bodyPose[5].score > 0.3 && bodyPose[6] && bodyPose[6].score > 0.3) {
            // Calculate angle of line between shoulders
            const dx = bodyPose[6].x - bodyPose[5].x;
            const dy = bodyPose[6].y - bodyPose[5].y;
            torsoRotation = Math.atan2(dy, dx) * (180 / Math.PI);
            
            // Constrain rotation to reasonable range
            torsoRotation = Math.max(-20, Math.min(20, torsoRotation));
        }
        
        // Add breathing effect with more natural timing
        const breathingRate = 3000; // Slower for natural breathing
        const breatheDepth = 0.025;  // Subtle breathing
        const breathe = Math.sin(Date.now() / breathingRate);
        const torsoScale = 1 + breathe * breatheDepth;
        
        // Add slight torso sway for more lifelike movement
        const swayAmount = 0.01;
        const swayRate = 4500;
        const swayX = 1 + Math.sin(Date.now() / swayRate) * swayAmount;
        const swayY = 1 + Math.cos(Date.now() / swayRate) * swayAmount;
        
        // Apply transformations to torso with enhanced animation
        upperBody.setAttribute('transform', 
            `scale(${torsoScale * swayX}, ${torsoScale * swayY}) rotate(${torsoRotation})`);
        
        // Adjust neck position based on head and shoulder positions
        if (bodyPose[0] && bodyPose[0].score > 0.3) {
            const neck = document.getElementById('neck');
            if (neck) {
                // Calculate appropriate neck position based on head and shoulders
                const headY = bodyPose[0].y;
                const shoulderMidY = (bodyPose[5] && bodyPose[6]) ? 
                    (bodyPose[5].y + bodyPose[6].y) / 2 : shoulderY;
                
                // Map neck position to avatar
                const videoHeight = elements.canvas.height;
                const centerY = videoHeight / 2;
                const neckY = Math.min(0, shoulderY - 30 + ((headY - shoulderMidY) / (videoHeight/8)) * 20);
                
                neck.setAttribute('y', neckY);
                
                // Adjust neck width based on head rotation for a more natural look
                if (bodyPose[3] && bodyPose[4] && bodyPose[3].score > 0.3 && bodyPose[4].score > 0.3) {
                    const earWidth = Math.abs(bodyPose[4].x - bodyPose[3].x);
                    const normalEarWidth = videoHeight * 0.15;
                    const widthRatio = Math.min(1.2, Math.max(0.8, earWidth / normalEarWidth));
                    
                    // Update neck width based on head rotation
                    neck.setAttribute('width', 40 * widthRatio);
                    neck.setAttribute('x', -20 * widthRatio);
                }
            }
        }
    } catch (error) {
        console.error('Error updating avatar body:', error);
        // Graceful fallback with smooth animation
        leftArm.setAttribute('transform', `rotate(${Math.sin(Date.now() / 1000) * 5}, -85, 50)`);
        rightArm.setAttribute('transform', `rotate(${-Math.sin(Date.now() / 1000) * 5}, 85, 50)`);
        upperBody.setAttribute('transform', `scale(${1 + Math.sin(Date.now() / 3000) * 0.02})`);
    }
}

// Update avatar face with improved expression and movement mapping
export function updateAvatarFace(faceData) {
    if (!head || !leftEye || !rightEye || !mouth || !leftEyebrow || !rightEyebrow) return;
    
    try {
        // Apply transformations to head element with more natural constraints
        // Scale the translation values for more noticeable but not exaggerated movement
        head.setAttribute('transform', 
            `translate(${faceData.x * 1.2}, ${faceData.y * 1.2}) ` +
            `scale(${1 + faceData.z * 1.2}) rotate(${faceData.rz * 0.8})`
        );
        
        // Update eye shapes based on vertical head rotation (looking up/down)
        // When looking up, eyes get more open, when looking down, they get more closed
        const eyeScaleY = 1 - (faceData.rx / 30) * 0.5;
        leftEye.setAttribute('ry', 15 * Math.max(0.4, Math.min(1.2, eyeScaleY)));
        rightEye.setAttribute('ry', 15 * Math.max(0.4, Math.min(1.2, eyeScaleY)));
        
        // Improved horizontal eye movement for more realistic gaze direction
        // Eyes follow head turn with proper parallax effect
        const eyeShiftX = faceData.ry * 0.25; // More subtle eye movement
        leftEye.setAttribute('cx', -25 - eyeShiftX);
        rightEye.setAttribute('cx', 25 - eyeShiftX);
        
        // Add subtle eye blinks for more lifelike appearance
        const blinkRate = 5000; // Average time between blinks in ms
        const blinkLength = 150; // Duration of a blink in ms
        const randomOffset = Math.sin(Date.now() / 9777) * 2000; // Add randomness to blink timing
        const timeSinceBlink = (Date.now() + randomOffset) % blinkRate;
        
        // Apply blink if in blink window
        if (timeSinceBlink < blinkLength) {
            const blinkProgress = timeSinceBlink / blinkLength;
            const blinkAmount = Math.sin(blinkProgress * Math.PI);
            const eyeOpenness = 1 - blinkAmount * 0.9;
            
            leftEye.setAttribute('ry', 15 * eyeScaleY * eyeOpenness);
            rightEye.setAttribute('ry', 15 * eyeScaleY * eyeOpenness);
        }
        
        // More responsive eyebrow movement with natural asymmetry
        const baseEyebrowY = -70;
        const eyebrowExpression = Math.sin(Date.now() / 2500) * 5;  // Subtle expression changes
        
        // Eyebrows react to head tilt and rotation with natural motion
        const leftEyebrowTilt = faceData.rz * 0.35 + faceData.ry * 0.15;
        const rightEyebrowTilt = -faceData.rz * 0.35 - faceData.ry * 0.15;
        
        // Eyebrows go up when looking up, down when looking down
        const eyebrowYOffset = -faceData.rx * 0.4;
        
        // Left eyebrow with improved expressiveness
        const leftEyebrowYPos = baseEyebrowY + eyebrowExpression + eyebrowYOffset;
        const leftEyebrowPath = `M-40 ${leftEyebrowYPos + leftEyebrowTilt} L-10 ${leftEyebrowYPos - leftEyebrowTilt}`;
        leftEyebrow.setAttribute('d', leftEyebrowPath);
        
        // Right eyebrow with improved expressiveness
        const rightEyebrowYPos = baseEyebrowY + eyebrowExpression + eyebrowYOffset + (Math.sin(Date.now() / 3700) * 2); // Slight asymmetry
        const rightEyebrowPath = `M10 ${rightEyebrowYPos + rightEyebrowTilt} L40 ${rightEyebrowYPos - rightEyebrowTilt}`;
        rightEyebrow.setAttribute('d', rightEyebrowPath);
        
        // Check for face movement and use detected mouth openness if available
        const headMovement = Math.abs(faceData.x) + Math.abs(faceData.y) + Math.abs(faceData.ry);
        const time = Date.now();
        
        // Use detected mouth openness from face tracking if available
        const mouthOpenness = appState.mouthOpenness !== undefined ? 
            appState.mouthOpenness : 
            (headMovement > 2 || (time % 5000) < 2500) ? 
                Math.sin(time / (300 - headMovement * 20)) * 0.5 + 0.5 : 0.2;
        
        // Much more natural mouth animation based on detected speech or movement
        if (headMovement > 2.5 || (time % 5000) < 2500) {
            // Dynamic talking animation
            const baseRY = 4 + (mouthOpenness * 10); // Height based on openness
            const baseRX = 20 - (mouthOpenness * 4);  // Width changes with talking
            
            // Add subtle variations for more natural speech
            const mouthNoiseX = Math.sin(time / 120) * 2;
            const mouthNoiseY = Math.cos(time / 180) * 1.5;
            
            mouth.setAttribute('ry', baseRY + mouthNoiseY);
            mouth.setAttribute('rx', baseRX + mouthNoiseX);
        } else {
            // Subtle breathing/idle movement when not talking
            const breatheSpeed = 3000;
            const breathe = Math.sin(time / breatheSpeed) * 0.3 + 0.7; // 0.4 to 1 value
            mouth.setAttribute('ry', 4 * breathe);
            mouth.setAttribute('rx', 20);
        }
    } catch (error) {
        console.error('Error updating avatar face:', error);
        // Basic fallback animation that still maintains some liveliness
        const time = Date.now();
        const breathe = Math.sin(time / 3000) * 0.05;
        const microMove = Math.sin(time / 2000) * 2;
        
        head.setAttribute('transform', `translate(${microMove}, 0) scale(${1 + breathe}) rotate(0)`);
        leftEye.setAttribute('ry', 15);
        rightEye.setAttribute('ry', 15);
        mouth.setAttribute('ry', 6 + Math.sin(time / 2500) * 2);
        mouth.setAttribute('rx', 20);
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