// Main JavaScript file - Entry point for the application

// Shared application state
export const appState = {
    isTracking: false,
    isRecording: false,
    lastFacePosition: null,
    lastBodyPosition: null,
    config: {
        avatarScale: 1.0,
        smoothingLevel: 0.7,
        displayMode: 'avatarOnly',
        backgroundType: 'irish',
        backgroundElements: {
            cityscape: { buildings: 15, windows: true },
            abstract: { waves: 5, animationSpeed: 10 },
            irish: { showFlag: true, showCelticKnots: true },
            matrix: { characters: 70, speed: 5 },
            particles: { count: 100, speed: 2 }
        },
        recording: {
            quality: 'high',
            format: 'webm',
            fps: 30
        }
    }
};

// DOM Elements - accessible to all modules
export const elements = {
    video: document.getElementById('videoElement'),
    canvas: document.getElementById('canvasOutput'),
    ctx: document.getElementById('canvasOutput').getContext('2d'),
    startButton: document.getElementById('startButton'),
    stopButton: document.getElementById('stopButton'),
    recordButton: document.getElementById('recordButton'),
    recordingIndicator: document.getElementById('recordingIndicator'),
    debugInfo: document.getElementById('debugInfo'),
    loadingScreen: document.getElementById('loadingScreen'),
    bgSelect: document.getElementById('bgSelect'),
    avatarScale: document.getElementById('avatarScale'),
    smoothingLevel: document.getElementById('smoothingLevel'),
    displayMode: document.getElementById('displayMode'),
    fileUploadBtn: document.getElementById('fileUploadBtn'),
    videoFileInput: document.getElementById('videoFileInput'),
    avatarContainer: document.getElementById('avatarContainer')
};

// Initialize the application
async function initApp() {
    try {
        // First, dynamically import all our modules to make sure they load properly
        // Use a try/catch for each import to isolate loading errors
        const modules = await loadModules();
        
        // Now set up each component
        await setupComponents(modules);
        
        console.log('Avatar Tracker initialized successfully');
        elements.debugInfo.textContent = 'Status: Ready! Click "Start Camera" to begin';
        elements.loadingScreen.style.display = 'none';
    } catch (error) {
        console.error('Error initializing app:', error);
        elements.debugInfo.textContent = `Initialization error: ${error.message}`;
        elements.loadingScreen.style.display = 'none';
        
        // Show error to user with option to retry
        showErrorMessage('Failed to initialize the application.', true);
    }
}

// Load all modules with error handling
async function loadModules() {
    const modules = {};
    
    try {
        // Import tracking modules
        const trackingManager = await import('./tracking/trackingManager.js');
        modules.trackingManager = trackingManager;
    } catch (error) {
        console.error('Error loading tracking modules:', error);
        throw new Error('Failed to load tracking modules');
    }
    
    try {
        // Import avatar modules
        const avatarRenderer = await import('./avatar/avatarRenderer.js');
        modules.avatarRenderer = avatarRenderer;
    } catch (error) {
        console.error('Error loading avatar modules:', error);
        throw new Error('Failed to load avatar modules');
    }
    
    try {
        // Import UI modules
        const ui = await import('./utils/ui.js');
        modules.ui = ui;
    } catch (error) {
        console.error('Error loading UI modules:', error);
        throw new Error('Failed to load UI modules');
    }
    
    try {
        // Import video processing modules
        const videoProcessing = await import('./utils/videoProcessing.js');
        modules.videoProcessing = videoProcessing;
    } catch (error) {
        console.error('Error loading video processing modules:', error);
        throw new Error('Failed to load video processing modules');
    }
    
    try {
        // Import recording modules
        const recording = await import('./utils/recording.js');
        modules.recording = recording;
    } catch (error) {
        console.error('Error loading recording modules:', error);
        throw new Error('Failed to load recording modules');
    }
    
    try {
        // Import background modules
        const backgroundManager = await import('./backgrounds/backgroundManager.js');
        modules.backgroundManager = backgroundManager;
    } catch (error) {
        console.error('Error loading background modules:', error);
        throw new Error('Failed to load background modules');
    }
    
    return modules;
}

// Set up all application components
async function setupComponents(modules) {
    // Initialize components in order
    try {
        // 1. Initialize avatar SVG
        await modules.avatarRenderer.initializeAvatar(elements.avatarContainer);
        console.log('Avatar initialized');
        
        // 2. Set up UI interactions
        modules.ui.initializeUI();
        console.log('UI initialized');
        
        // 3. Initialize the tracking system
        await modules.trackingManager.setupTrackingSystem();
        console.log('Tracking system initialized');
        
        // 4. Set up video processing
        modules.videoProcessing.setupVideoProcessing();
        console.log('Video processing initialized');
        
        // 5. Set up recording functionality
        modules.recording.setupRecording();
        console.log('Recording system initialized');
        
        // 6. Initialize background system
        modules.backgroundManager.initializeBackgrounds();
        console.log('Background system initialized');
        
        // 7. Update UI based on initial state
        updateUIState();
    } catch (error) {
        console.error('Error setting up components:', error);
        throw error;
    }
}

// Update UI based on app state
export function updateUIState() {
    elements.startButton.disabled = appState.isTracking;
    elements.stopButton.disabled = !appState.isTracking;
    elements.recordButton.disabled = !appState.isTracking;
    elements.fileUploadBtn.disabled = appState.isTracking;
    
    // Update user feedback text
    if (appState.isTracking) {
        if (appState.isRecording) {
            elements.debugInfo.textContent = 'Status: Recording... Press "Stop Recording" to save.';
        } else {
            elements.debugInfo.textContent = 'Status: Tracking Active';
        }
    } else {
        elements.debugInfo.textContent = 'Status: Ready to start';
    }
}

// Show error message to user
function showErrorMessage(message, showRetry = false) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.backgroundColor = 'rgba(0,0,0,0.9)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.zIndex = '2000';
    errorDiv.style.maxWidth = '80%';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    
    let buttonHtml = '<button id="errorDismiss" style="margin-top: 10px; padding: 8px 15px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Dismiss</button>';
    
    if (showRetry) {
        buttonHtml += '<button id="errorRetry" style="margin-top: 10px; margin-left: 10px; padding: 8px 15px; background-color: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">Retry</button>';
    }
    
    errorDiv.innerHTML = `
        <h3 style="color: #f44336; margin-top: 0;">Error</h3>
        <p>${message}</p>
        <p style="font-size: 0.9em; opacity: 0.8;">Check console for more details.</p>
        <div>${buttonHtml}</div>
    `;
    
    document.body.appendChild(errorDiv);
    
    document.getElementById('errorDismiss').addEventListener('click', () => {
        document.body.removeChild(errorDiv);
    });
    
    if (showRetry) {
        document.getElementById('errorRetry').addEventListener('click', () => {
            document.body.removeChild(errorDiv);
            window.location.reload(); // Reload the page to retry
        });
    }
}

// Fallback for missing CSS files
function checkCssLoaded() {
    // Check if our CSS files loaded correctly
    const allStyles = Array.from(document.styleSheets);
    const cssFiles = ['main.css', 'controls.css', 'loading.css'];
    const missingCss = cssFiles.filter(file => {
        return !allStyles.some(stylesheet => 
            stylesheet.href && stylesheet.href.includes(file));
    });
    
    if (missingCss.length > 0) {
        console.warn('Some CSS files failed to load:', missingCss);
        
        // Add inline styles as a fallback
        const style = document.createElement('style');
        style.textContent = `
            body { margin: 0; overflow: hidden; font-family: Arial, sans-serif; background-color: #111; }
            #container { position: relative; width: 100vw; height: 100vh; background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460); }
            #videoElement { position: absolute; width: 100%; height: 100%; object-fit: cover; opacity: 0.2; }
            #canvasOutput { position: absolute; width: 100%; height: 100%; object-fit: cover; }
            #avatarSVG { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
            #debugInfo { position: absolute; top: 10px; left: 10px; color: white; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; font-family: monospace; z-index: 100; }
            #controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 100; display: flex; gap: 10px; background: rgba(0,0,0,0.7); padding: 15px; border-radius: 10px; }
            button { padding: 10px 20px; cursor: pointer; background: #4CAF50; border: none; color: white; border-radius: 4px; font-weight: bold; transition: all 0.3s; }
            button:hover { background: #3e8e41; }
            button:disabled { background: #cccccc; cursor: not-allowed; }
            #recordingIndicator { position: absolute; top: 70px; left: 10px; display: none; padding: 8px 15px; background-color: #f44336; color: white; border-radius: 5px; font-weight: bold; animation: blink 1.5s infinite; }
            #loadingScreen { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: #111; color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 1000; }
            .loader { border: 5px solid #333; border-top: 5px solid #4CAF50; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            #settingsPanel { position: absolute; top: 10px; right: 10px; z-index: 100; background: rgba(0,0,0,0.7); padding: 15px; border-radius: 5px; color: white; width: 220px; }
            .setting-group { margin-bottom: 15px; }
            .setting-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            select, input { width: 100%; padding: 5px; margin-bottom: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 3px; }
            @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }
}

// Entry point - Start the application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    // Check if CSS loaded correctly and provide fallback if needed
    checkCssLoaded();
    // Initialize the app
    initApp();
});