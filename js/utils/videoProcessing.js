// Video Processing Module - Handles camera and video file input
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

// Start camera
async function startCamera() {
    try {
        // Request camera access
        const constraints = { 
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        elements.video.srcObject = videoStream;
        
        // Wait for video to be ready
        elements.video.onloadedmetadata = () => {
            processingMode = 'realtime';
            startTracking();
        };
    } catch (error) {
        console.error('Error accessing camera:', error);
        elements.debugInfo.textContent = `Error accessing camera: ${error.message}`;
        
        // Show message to user
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '50%';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translate(-50%, -50%)';
        errorMessage.style.backgroundColor = 'rgba(0,0,0,0.8)';
        errorMessage.style.color = 'white';
        errorMessage.style.padding = '20px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.style.zIndex = '2000';
        
        errorMessage.innerHTML = `
            <h3>Camera Access Error</h3>
            <p>${error.message}</p>
            <p>Please ensure you have granted camera permissions and try again.</p>
            <button id="errorDismiss">OK</button>
        `;
        
        document.body.appendChild(errorMessage);
        
        document.getElementById('errorDismiss').addEventListener('click', () => {
            document.body.removeChild(errorMessage);
        });
    }
}

// Process video file
function processVideoFile(e) {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        
        // Stop any current video processing
        stopVideoProcessing();
        
        // Set up video with the file
        elements.video.src = url;
        elements.video.srcObject = null;
        
        elements.video.onloadedmetadata = () => {
            processingMode = 'file';
            startTracking();
            
            // Start playing the video
            elements.video.play();
        };
    }
}

// Stop video processing
function stopVideoProcessing() {
    // Stop any active streams
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    // Reset video sources
    elements.video.srcObject = null;
    elements.video.src = '';
    
    // Stop tracking
    stopTracking();
}

// Set up drag and drop for video files
function setupDragAndDrop() {
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.style.backgroundColor = '#2a2a2a';
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.style.backgroundColor = '';
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.style.backgroundColor = '';
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('video/')) {
                // Create a new DataTransfer object
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                
                // Set the files property of the file input element
                elements.videoFileInput.files = dataTransfer.files;
                
                // Dispatch a change event
                const event = new Event('change');
                elements.videoFileInput.dispatchEvent(event);
            }
        }
    });
}