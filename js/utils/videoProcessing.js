// Enhanced video processing for better camera handling
import { elements } from '../main.js';
import { startTracking, stopTracking } from '../tracking/trackingManager.js';

// Local variables
let videoStream = null;
let processingMode = 'realtime'; // 'realtime' or 'file'

// Set up video processing
export function setupVideoProcessing() {
    // Add event listeners for start, stop and file input
    elements.startButton.addEventListener('click', startCamera);
    elements.stopButton.addEventListener('click', stopVideoProcessing);
    elements.fileUploadBtn.addEventListener('click', () => elements.videoFileInput.click());
    elements.videoFileInput.addEventListener('change', processVideoFile);
    
    // Set up drag and drop for video files
    setupDragAndDrop();
}

// Start camera with improved error handling and camera selection
async function startCamera() {
    try {
        // First, check if we can access the camera
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access is not supported in your browser.');
        }
        
        // Check for available devices to provide better feedback
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (videoDevices.length === 0) {
            throw new Error('No camera detected. Please connect a camera and try again.');
        }
        
        // Request camera access with optimal settings
        const constraints = { 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
                frameRate: { ideal: 30 }
            } 
        };
        
        // For mobile devices, try to use the front camera
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            constraints.video.facingMode = { exact: 'user' };
        }
        
        elements.debugInfo.textContent = 'Status: Accessing camera...';
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.video.srcObject = videoStream;
        
        // Wait for video to be ready
        elements.video.onloadedmetadata = () => {
            processingMode = 'realtime';
            elements.debugInfo.textContent = 'Status: Camera active. Starting tracking...';
            startTracking();
        };
        
        // Handle video errors
        elements.video.onerror = (error) => {
            console.error('Video element error:', error);
            elements.debugInfo.textContent = `Video error: ${error.message || 'Unknown error'}`;
            
            // Try to recover
            stopVideoProcessing();
            setTimeout(startCamera, 1000);
        };
    } catch (error) {
        console.error('Error accessing camera:', error);
        elements.debugInfo.textContent = `Error accessing camera: ${error.message}`;
        
        // Show meaningful error message based on the error
        let errorMessage = 'Camera access error';
        let errorDetails = error.message;
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Camera Permission Denied';
            errorDetails = 'Please allow camera access in your browser settings and try again.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage = 'No Camera Found';
            errorDetails = 'Make sure your camera is connected and not in use by another application.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage = 'Camera In Use';
            errorDetails = 'Your camera might be in use by another application. Please close other apps and try again.';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = 'Camera Configuration Error';
            errorDetails = 'Your camera does not support the requested resolution. Trying with default settings...';
            
            // Try again with less constraints
            setTimeout(() => {
                startCameraWithFallbackSettings();
            }, 1000);
            return;
        }
        
        // Show message to user
        showCameraErrorMessage(errorMessage, errorDetails);
    }
}

// Fallback with simpler camera settings
async function startCameraWithFallbackSettings() {
    try {
        // Simplified constraints
        const simpleConstraints = { 
            video: true
        };
        
        elements.debugInfo.textContent = 'Status: Trying with default camera settings...';
        videoStream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
        elements.video.srcObject = videoStream;
        
        // Wait for video to be ready
        elements.video.onloadedmetadata = () => {
            processingMode = 'realtime';
            elements.debugInfo.textContent = 'Status: Camera active with default settings. Starting tracking...';
            startTracking();
        };
    } catch (error) {
        console.error('Error with fallback camera settings:', error);
        elements.debugInfo.textContent = `Camera error: ${error.message}`;
        showCameraErrorMessage('Camera Access Failed', 'Unable to access your camera even with fallback settings. Please check your hardware and browser permissions.');
    }
}

// Process video file with better format handling
function processVideoFile(e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        
        // Check file type
        if (!file.type.startsWith('video/')) {
            elements.debugInfo.textContent = 'Error: Not a valid video file.';
            return;
        }
        
        // Check file size (limit to 500MB to prevent browser crashes)
        if (file.size > 500 * 1024 * 1024) {
            elements.debugInfo.textContent = 'Error: File too large (max 500MB).';
            return;
        }
        
        const url = URL.createObjectURL(file);
        
        // Stop any current video processing
        stopVideoProcessing();
        elements.debugInfo.textContent = 'Status: Loading video file...';
        
        // Set up video with the file
        elements.video.src = url;
        elements.video.srcObject = null;
        
        elements.video.onloadedmetadata = () => {
            processingMode = 'file';
            elements.debugInfo.textContent = `Status: Processing video file: ${file.name}`;
            startTracking();
            
            // Start playing the video
            elements.video.play();
        };
        
        // Error handling for video loading
        elements.video.onerror = () => {
            elements.debugInfo.textContent = `Error: Could not load video file. The format may not be supported.`;
            URL.revokeObjectURL(url);
        };
    }
}

// Stop video processing with better cleanup
function stopVideoProcessing() {
    // Stop any active streams
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            try {
                track.stop();
            } catch (e) {
                console.warn('Error stopping track:', e);
            }
        });
        videoStream = null;
    }
    
    // Reset video sources
    try {
        elements.video.srcObject = null;
        elements.video.src = '';
        elements.video.load(); // Force reload
    } catch (e) {
        console.warn('Error resetting video element:', e);
    }
    
    // Stop tracking
    stopTracking();
}

// Set up drag and drop with better UX
function setupDragAndDrop() {
    let dragCounter = 0;
    const container = document.getElementById('container');
    
    // Create a drop zone indicator
    const dropZone = document.createElement('div');
    dropZone.id = 'dropZone';
    dropZone.style.position = 'absolute';
    dropZone.style.top = '0';
    dropZone.style.left = '0';
    dropZone.style.width = '100%';
    dropZone.style.height = '100%';
    dropZone.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    dropZone.style.color = 'white';
    dropZone.style.display = 'none';
    dropZone.style.justifyContent = 'center';
    dropZone.style.alignItems = 'center';
    dropZone.style.fontSize = '24px';
    dropZone.style.fontWeight = 'bold';
    dropZone.style.zIndex = '1000';
    dropZone.innerHTML = '<div>Drop Video File Here</div>';
    container.appendChild(dropZone);
    
    // Drag enter - show drop zone
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        dropZone.style.display = 'flex';
    });
    
    // Drag over - prevent default to allow drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Drag leave - hide drop zone when all elements are left
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
            dropZone.style.display = 'none';
        }
    });
    
    // Drop - process the file
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        dropZone.style.display = 'none';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            
            // Check if it's a video file
            if (file.type.startsWith('video/')) {
                try {
                    // Create a new DataTransfer object and add the file
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    
                    // Update the file input and trigger change event
                    elements.videoFileInput.files = dataTransfer.files;
                    
                    // Dispatch a change event
                    const event = new Event('change');
                    elements.videoFileInput.dispatchEvent(event);
                } catch (error) {
                    console.error('Error processing dragged file:', error);
                    elements.debugInfo.textContent = `Error processing file: ${error.message}`;
                    
                    // Direct handling if DataTransfer fails
                    const url = URL.createObjectURL(file);
                    elements.video.src = url;
                    elements.video.srcObject = null;
                    
                    elements.video.onloadedmetadata = () => {
                        processingMode = 'file';
                        elements.debugInfo.textContent = `Status: Processing video file: ${file.name}`;
                        startTracking();
                        elements.video.play();
                    };
                }
            } else {
                elements.debugInfo.textContent = 'Error: Please drop a video file';
            }
        }
    });
}

// Show camera error message
function showCameraErrorMessage(title, message) {
    const errorMessage = document.createElement('div');
    errorMessage.style.position = 'absolute';
    errorMessage.style.top = '50%';
    errorMessage.style.left = '50%';
    errorMessage.style.transform = 'translate(-50%, -50%)';
    errorMessage.style.backgroundColor = 'rgba(0,0,0,0.9)';
    errorMessage.style.color = 'white';
    errorMessage.style.padding = '20px';
    errorMessage.style.borderRadius = '5px';
    errorMessage.style.zIndex = '2000';
    errorMessage.style.maxWidth = '80%';
    errorMessage.style.textAlign = 'center';
    
    errorMessage.innerHTML = `
        <h3 style="color: #f44336; margin-top: 0;">${title}</h3>
        <p>${message}</p>
        <button id="errorDismiss" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">OK</button>
    `;
    
    document.body.appendChild(errorMessage);
    
    document.getElementById('errorDismiss').addEventListener('click', () => {
        document.body.removeChild(errorMessage);
    });
}