// Matrix Digital Rain Background
import { elements, appState } from '../main.js';

export function createMatrixBackground(container) {
    // Get config from app state
    const config = appState.config.backgroundElements.matrix;
    const characters = config.characters;
    const speed = config.speed;
    const canvas = elements.canvas;
    
    // Create a group for the Matrix-style background
    const matrixGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Add dark background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', canvas.width);
    bgRect.setAttribute('height', canvas.height);
    bgRect.setAttribute('fill', '#000B00');
    bgRect.setAttribute('opacity', '0.9');
    matrixGroup.appendChild(bgRect);
    
    // Create the "digital rain" effect
    const charColumns = 20;
    const columnWidth = canvas.width / charColumns;
    
    for (let i = 0; i < characters; i++) {
        const column = Math.floor(Math.random() * charColumns);
        const x = column * columnWidth + columnWidth / 2;
        const y = Math.random() * canvas.height;
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('font-family', 'monospace');
        text.setAttribute('font-size', 12 + Math.random() * 6);
        text.setAttribute('text-anchor', 'middle');
        
        // Vary the brightness to create depth effect
        const brightness = 70 + Math.floor(Math.random() * 80);
        text.setAttribute('fill', `rgb(0, ${brightness}, 0)`);
        text.setAttribute('opacity', 0.5 + Math.random() * 0.5);
        
        // Choose a random character
        // Mix of digits, letters, and special characters for Matrix effect
        const charPool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
        text.textContent = charPool.charAt(Math.floor(Math.random() * charPool.length));
        
        // Add falling animation
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'y');
        animate.setAttribute('from', y);
        animate.setAttribute('to', canvas.height + 50);
        animate.setAttribute('dur', `${2 + Math.random() * speed}s`);
        animate.setAttribute('repeatCount', 'indefinite');
        
        // Character changing animation for some characters
        if (Math.random() > 0.7) {
            const animateChar = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animateChar.setAttribute('attributeName', 'textContent');
            const chars = [];
            for (let j = 0; j < 5; j++) {
                chars.push(charPool.charAt(Math.floor(Math.random() * charPool.length)));
            }
            animateChar.setAttribute('values', chars.join(';'));
            animateChar.setAttribute('dur', '0.5s');
            animateChar.setAttribute('repeatCount', 'indefinite');
            text.appendChild(animateChar);
        }
        
        text.appendChild(animate);
        matrixGroup.appendChild(text);
    }
    
    container.appendChild(matrixGroup);
}