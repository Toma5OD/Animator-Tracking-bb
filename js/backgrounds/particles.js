// Particle System Background
import { elements, appState } from '../main.js';

export function createParticleBackground(container) {
    // Get config from app state
    const config = appState.config.backgroundElements.particles;
    const particleCount = config.count;
    const particleSpeed = config.speed;
    const canvas = elements.canvas;
    
    // Create a group for the particle system background
    const particleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Add gradient background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', canvas.width);
    bgRect.setAttribute('height', canvas.height);
    bgRect.setAttribute('fill', 'url(#particleGradient)');
    
    // Create particle gradient if it doesn't exist
    if (!document.getElementById('particleGradient')) {
        const particleGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        particleGradient.setAttribute('id', 'particleGradient');
        particleGradient.setAttribute('cx', '50%');
        particleGradient.setAttribute('cy', '50%');
        particleGradient.setAttribute('r', '70%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#1a1a2e');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#000');
        
        particleGradient.appendChild(stop1);
        particleGradient.appendChild(stop2);
        
        const defs = document.querySelector('defs') || 
            document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.appendChild(particleGradient);
        
        if (!document.querySelector('defs')) {
            document.getElementById('avatarSVG').appendChild(defs);
        }
    }
    
    particleGroup.appendChild(bgRect);
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        particle.setAttribute('cx', Math.random() * canvas.width);
        particle.setAttribute('cy', Math.random() * canvas.height);
        
        // Vary particle sizes
        const size = 0.5 + Math.random() * 3;
        particle.setAttribute('r', size);
        
        // Use colors that match the avatar theme
        const colorOptions = ['#169b62', '#ffffff', '#ff883e', '#4099ff'];
        const color = colorOptions[Math.floor(Math.random() * colorOptions.length)];
        particle.setAttribute('fill', color);
        particle.setAttribute('opacity', 0.2 + Math.random() * 0.5);
        
        // Add particle animations
        // X-axis movement
        const animateX = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateX.setAttribute('attributeName', 'cx');
        const xStart = Math.random() * canvas.width;
        const xRange = 50 + Math.random() * 100;
        animateX.setAttribute('values', `${xStart};${xStart + xRange};${xStart}`);
        animateX.setAttribute('dur', `${10 + Math.random() * 20 / particleSpeed}s`);
        animateX.setAttribute('repeatCount', 'indefinite');
        
        // Y-axis movement
        const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateY.setAttribute('attributeName', 'cy');
        const yStart = Math.random() * canvas.height;
        const yRange = 30 + Math.random() * 60;
        animateY.setAttribute('values', `${yStart};${yStart - yRange};${yStart}`);
        animateY.setAttribute('dur', `${5 + Math.random() * 15 / particleSpeed}s`);
        animateY.setAttribute('repeatCount', 'indefinite');
        
        // Add pulse effect to some particles
        if (Math.random() > 0.7) {
            const animateSize = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animateSize.setAttribute('attributeName', 'r');
            animateSize.setAttribute('values', `${size};${size * 2};${size}`);
            animateSize.setAttribute('dur', `${2 + Math.random() * 4}s`);
            animateSize.setAttribute('repeatCount', 'indefinite');
            particle.appendChild(animateSize);
        }
        
        particle.appendChild(animateX);
        particle.appendChild(animateY);
        particleGroup.appendChild(particle);
    }
    
    container.appendChild(particleGroup);
}