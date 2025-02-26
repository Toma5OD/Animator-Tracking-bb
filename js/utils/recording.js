// Recording Module - Handles video recording
import { elements, appState } from '../main.js';

// Local variables
let mediaRecorder = null;
let recordedChunks = [];

// Set up recording functionality
export function setupRecording() {
    // Add event listener for record button
    elements.recordButton.addEventListener('click', toggleRecording);
}

// Toggle recording state
function toggleRecording() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        startRecording();
        elements.recordButton.textContent = 'Stop Recording';
        elements.recordingIndicator.style.display = 'block';
    } else {
        stopRecording();
        elements.recordButton.textContent = 'Start Recording';
        elements.recordingIndicator.style.display = 'none';
    }
}

// Start recording
function startRecording() {
    recordedChunks = [];
    
    try {
        // Create a canvas stream that includes both the video and the SVG overlay
        const outputStream = elements.canvas.captureStream(appState.config.recording.fps);
        
        // Set up media recorder with selected options
        const options = {
            mimeType: `video/${appState.config.recording.format}`,
            videoBitsPerSecond: appState.config.recording.quality === 'high' ? 5000000 : 2500000
        };
        
        try {
            mediaRecorder = new MediaRecorder(outputStream, options);
        } catch (e) {
            // Fallback to default options if specified options aren't supported
            console.warn('MediaRecorder couldn\'t use specified options, using defaults', e);
            mediaRecorder = new MediaRecorder(outputStream);
        }
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = saveRecording;
        
        // Start recording
        mediaRecorder.start(100); // Collect data in chunks of 100ms
        elements.debugInfo.textContent = 'Status: Recording...';
        appState.isRecording = true;
    } catch (error) {
        console.error('Error starting recording:', error);
        elements.debugInfo.textContent = `Recording error: ${error.message}`;
        
        // Show error message to user
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
            <h3>Recording Error</h3>
            <p>${error.message}</p>
            <p>Please ensure your browser supports the MediaRecorder API.</p>
            <button id="errorDismiss">OK</button>
        `;
        
        document.body.appendChild(errorMessage);
        
        document.getElementById('errorDismiss').addEventListener('click', () => {
            document.body.removeChild(errorMessage);
        });
    }
}

// Stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        appState.isRecording = false;
    }
}

// Save the recorded video
function saveRecording() {
    try {
        // Create blob from recorded chunks
        const blob = new Blob(recordedChunks, { 
            type: `video/${appState.config.recording.format}` 
        });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `avatar-recording-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.${appState.config.recording.format}`;
        
        // Trigger download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            elements.debugInfo.textContent = 'Status: Recording saved';
        }, 100);
    } catch (error) {
        console.error('Error saving recording:', error);
        elements.debugInfo.textContent = `Error saving recording: ${error.message}`;
    }
}