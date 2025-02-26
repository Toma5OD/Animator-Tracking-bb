// UI Management Module - Handles UI updates and interactions
import { elements, appState } from '../main.js';
import { setAvatarScale } from '../avatar/avatarRenderer.js';
import { drawSkeletonLines } from '../tracking/trackingManager.js';

// Initialize UI elements and interactions
export function initializeUI() {
    // Set up settings panel event listeners
    elements.avatarScale.addEventListener('input', handleAvatarScaleChange);
    elements.smoothingLevel.addEventListener('input', handleSmoothingChange);
    elements.displayMode.addEventListener('change', handleDisplayModeChange);
    
    // Initialize UI values from app state
    elements.avatarScale.value = appState.config.avatarScale;
    elements.smoothingLevel.value = appState.config.smoothingLevel;
    elements.displayMode.value = appState.config.displayMode;
    
    // Apply initial display mode
    updateDisplayMode();
}

// Handle avatar scale change
function handleAvatarScaleChange(e) {
    const scale = parseFloat(e.target.value);
    appState.config.avatarScale = scale;
    setAvatarScale(scale);
}

// Handle smoothing level change
function handleSmoothingChange(e) {
    appState.config.smoothingLevel = parseFloat(e.target.value);
}

// Handle display mode change
function handleDisplayModeChange(e) {
    appState.config.displayMode = e.target.value;
    updateDisplayMode();
}

// Update display mode (avatar only or debug view)
function updateDisplayMode() {
    if (elements.displayMode.value === 'avatarOnly') {
        elements.video.style.opacity = "0";
    } else {
        elements.video.style.opacity = "0.3";
    }
}

// Update display based on current state and tracking data
export function updateDisplay() {
    // Update based on display mode
    if (appState.config.displayMode === 'avatarOnly') {
        elements.video.style.opacity = "0";
    } else {
        // Debug view shows the video with avatar overlay
        elements.video.style.opacity = "0.3";
        
        // Draw skeleton lines on the canvas if in debug mode and we have body tracking data
        if (appState.lastBodyPosition && appState.lastBodyPosition.length > 0) {
            drawSkeletonLines(elements.ctx, appState.lastBodyPosition);
        }
    }
    
    // Apply avatar scale
    const scale = parseFloat(elements.avatarScale.value);
    setAvatarScale(scale);
}