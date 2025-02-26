// Abstract Background
import { elements, appState } from '../main.js';

export function createAbstractBackground(container) {
    // Get config from app state
    const config = appState.config.backgroundElements.abstract;
    const waves = config.waves;
    const animationSpeed = config.animationSpeed;
    const canvas = elements.canvas;
    
    // Create a group for the abstract background
    const abstractGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Create gradient background
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', canvas.width);
    bgRect.setAttribute('height', canvas.height);
    bgRect.setAttribute('fill', 'url(#abstractGradient)');
    
    // Create abstract gradient if it doesn't exist
    if (!document.getElementById('abstractGradient')) {
        const abstractGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        abstractGradient.setAttribute('id', 'abstractGradient');
        abstractGradient.setAttribute('x1', '0%');
        abstractGradient.setAttribute('y1', '0%');
        abstractGradient.setAttribute('x2', '100%');
        abstractGradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#2c3e50');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#000');
        
        abstractGradient.appendChild(stop1);
        abstractGradient.appendChild(stop2);
        
        const defs = document.querySelector('defs') || 
            document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.appendChild(abstractGradient);
        
        if (!document.querySelector('defs')) {
            document.getElementById('avatarSVG').appendChild(defs);
        }
    }
    
    abstractGroup.appendChild(bgRect);
    
    // Create wave patterns
    for (let i = 0; i < waves; i++) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Generate random wave path
        const startY = canvas.height * (0.5 + Math.random() * 0.5);
        let d = `M0,${startY}`;
        
        const segments = 10;
        const waveHeight = 50 + i * 20;
        
        for (let x = 1; x <= segments; x++) {
            const xPos = (canvas.width / segments) * x;
            const yPos = startY + Math.sin(x / (1 + i * 0.2)) * waveHeight;
            
            // Use bezier curves for smoother waves
            const prevX = (canvas.width / segments) * (x - 1);
            const ctrlX1 = prevX + (xPos - prevX) * 0.3;
            const ctrlX2 = prevX + (xPos - prevX) * 0.7;
            
            d += ` C${ctrlX1},${startY + Math.sin((x - 0.7) / (1 + i * 0.2)) * waveHeight} ${ctrlX2},${startY + Math.sin((x - 0.3) / (1 + i * 0.2)) * waveHeight} ${xPos},${yPos}`;
        }
        
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        
        // Use different colors for each wave
        const hue = 180 + i * 30;
        path.setAttribute('stroke', `hsla(${hue}, 80%, 50%, 0.5)`);
        path.setAttribute('stroke-width', 4 - i * 0.5);
        
        // Add stroke dasharray for dashed look
        path.setAttribute('stroke-dasharray', '10,5');
        
        // Add animation
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'stroke-dashoffset');
        animate.setAttribute('from', '0');
        animate.setAttribute('to', '1000');
        animate.setAttribute('dur', `${animationSpeed + i * 2}s`);
        animate.setAttribute('repeatCount', 'indefinite');
        
        path.appendChild(animate);
        abstractGroup.appendChild(path);
    }
    
    // Add floating particles
    for (let i = 0; i < 30; i++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', Math.random() * canvas.width);
        circle.setAttribute('cy', Math.random() * canvas.height);
        circle.setAttribute('r', 1 + Math.random() * 3);
        
        // Use similar colors as the waves
        const hue = 180 + Math.random() * 60;
        circle.setAttribute('fill', `hsla(${hue}, 80%, 60%, ${0.2 + Math.random() * 0.5})`);
        
        // Add animation for floating effect
        const animateX = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateX.setAttribute('attributeName', 'cx');
        const startX = Math.random() * canvas.width;
        animateX.setAttribute('values', `${startX};${startX + 50};${startX}`);
        animateX.setAttribute('dur', `${10 + Math.random() * 20}s`);
        animateX.setAttribute('repeatCount', 'indefinite');
        
        const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateY.setAttribute('attributeName', 'cy');
        const startY = Math.random() * canvas.height;
        animateY.setAttribute('values', `${startY};${startY - 30};${startY}`);
        animateY.setAttribute('dur', `${5 + Math.random() * 15}s`);
        animateY.setAttribute('repeatCount', 'indefinite');
        
        circle.appendChild(animateX);
        circle.appendChild(animateY);
        abstractGroup.appendChild(circle);
    }
    
    container.appendChild(abstractGroup);
}