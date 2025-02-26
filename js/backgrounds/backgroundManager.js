// Background Manager - Handles different background types
import { elements, appState } from '../main.js';
import { createCityscapeBackground } from './cityscape.js';
import { createAbstractBackground } from './abstract.js';
import { createIrishThemeBackground } from './irish.js';
import { createMatrixBackground } from './matrix.js';
import { createParticleBackground } from './particles.js';

// Initialize background system
export function initializeBackgrounds() {
    // Add event listener for background selection
    elements.bgSelect.addEventListener('change', updateBackground);
    
    // Set initial value from app state
    elements.bgSelect.value = appState.config.backgroundType;
    
    // Create initial background
    updateBackground();
}

// Update background based on selected type
function updateBackground() {
    // Get selected background
    const selectedBackground = elements.bgSelect.value;
    appState.config.backgroundType = selectedBackground;
    
    // Get background elements container
    const backgroundElements = document.getElementById('backgroundElements');
    if (!backgroundElements) {
        console.error('Background elements container not found');
        return;
    }
    
    // Clear existing background
    while (backgroundElements.firstChild) {
        backgroundElements.removeChild(backgroundElements.firstChild);
    }
    
    // Create new background
    switch (selectedBackground) {
        case 'cityscape':
            createCityscapeBackground(backgroundElements);
            break;
        case 'abstract':
            createAbstractBackground(backgroundElements);
            break;
        case 'irish':
            createIrishThemeBackground(backgroundElements);
            break;
        case 'matrix':
            createMatrixBackground(backgroundElements);
            break;
        case 'particles':
            createParticleBackground(backgroundElements);
            break;
        default:
            console.warn(`Unknown background type: ${selectedBackground}`);
            break;
    }
}