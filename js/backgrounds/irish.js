// Irish Themed Background
import { elements, appState } from '../main.js';

export function createIrishThemeBackground(container) {
    // Get config from app state
    const config = appState.config.backgroundElements.irish;
    const canvas = elements.canvas;
    
    // Create a group for the Irish theme background
    const irishGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Add flag sections with opacity for better visibility
    if (config.showFlag) {
        // Green section
        const greenSection = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        greenSection.setAttribute('x', '0');
        greenSection.setAttribute('y', '0');
        greenSection.setAttribute('width', canvas.width / 3);
        greenSection.setAttribute('height', canvas.height);
        greenSection.setAttribute('fill', '#169b62');
        greenSection.setAttribute('opacity', '0.2');
        irishGroup.appendChild(greenSection);
        
        // White section
        const whiteSection = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        whiteSection.setAttribute('x', canvas.width / 3);
        whiteSection.setAttribute('y', '0');
        whiteSection.setAttribute('width', canvas.width / 3);
        whiteSection.setAttribute('height', canvas.height);
        whiteSection.setAttribute('fill', '#ffffff');
        whiteSection.setAttribute('opacity', '0.2');
        irishGroup.appendChild(whiteSection);
        
        // Orange section
        const orangeSection = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        orangeSection.setAttribute('x', (canvas.width / 3) * 2);
        orangeSection.setAttribute('y', '0');
        orangeSection.setAttribute('width', canvas.width / 3);
        orangeSection.setAttribute('height', canvas.height);
        orangeSection.setAttribute('fill', '#ff883e');
        orangeSection.setAttribute('opacity', '0.2');
        irishGroup.appendChild(orangeSection);
    }
    
    // Add Celtic knot patterns if enabled
    if (config.showCelticKnots) {
        const knotPatterns = [
            createCelticKnot(canvas.width * 0.2, canvas.height * 0.2, 40),
            createCelticKnot(canvas.width * 0.8, canvas.height * 0.2, 30),
            createCelticKnot(canvas.width * 0.5, canvas.height * 0.8, 50),
            createCelticKnot(canvas.width * 0.2, canvas.height * 0.8, 35),
            createCelticKnot(canvas.width * 0.8, canvas.height * 0.8, 45)
        ];
        
        knotPatterns.forEach(knot => {
            irishGroup.appendChild(knot);
        });
    }
    
    // Add shamrock decorations
    for (let i = 0; i < 10; i++) {
        const shamrock = createShamrock(
            Math.random() * canvas.width,
            Math.random() * canvas.height,
            10 + Math.random() * 20
        );
        
        // Add floating animation
        const animateY = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animateY.setAttribute('attributeName', 'transform');
        animateY.setAttribute('values', `translate(0,0); translate(0,-10); translate(0,0)`);
        animateY.setAttribute('dur', `${3 + Math.random() * 5}s`);
        animateY.setAttribute('repeatCount', 'indefinite');
        
        shamrock.appendChild(animateY);
        irishGroup.appendChild(shamrock);
    }
    
    container.appendChild(irishGroup);
}

function createCelticKnot(centerX, centerY, size) {
    const knotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    knotGroup.setAttribute('transform', `translate(${centerX}, ${centerY})`);
    
    // Create the knot outline
    const knotPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Simplified Celtic knot pattern
    const d = `M0,${-size} C${size},${-size} ${size},${size} 0,${size} C${-size},${size} ${-size},${-size} 0,${-size}
               M${-size/2},0 L${size/2},0 M0,${-size/2} L0,${size/2}`;
    
    knotPath.setAttribute('d', d);
    knotPath.setAttribute('stroke', '#169b62');
    knotPath.setAttribute('stroke-width', '3');
    knotPath.setAttribute('fill', 'none');
    knotPath.setAttribute('opacity', '0.4');
    
    knotGroup.appendChild(knotPath);
    
    // Add inner decorative circle
    const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerCircle.setAttribute('cx', '0');
    innerCircle.setAttribute('cy', '0');
    innerCircle.setAttribute('r', size / 2);
    innerCircle.setAttribute('stroke', '#ff883e');
    innerCircle.setAttribute('stroke-width', '2');
    innerCircle.setAttribute('fill', 'none');
    innerCircle.setAttribute('opacity', '0.3');
    
    knotGroup.appendChild(innerCircle);
    
    return knotGroup;
}

function createShamrock(x, y, size) {
    const shamrockGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    shamrockGroup.setAttribute('transform', `translate(${x}, ${y})`);
    
    // Create three leaf clovers
    for (let i = 0; i < 3; i++) {
        const angle = (i * 120) * Math.PI / 180;
        const leafX = Math.cos(angle) * size / 2;
        const leafY = Math.sin(angle) * size / 2;
        
        const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        leaf.setAttribute('cx', leafX);
        leaf.setAttribute('cy', leafY);
        leaf.setAttribute('r', size / 2);
        leaf.setAttribute('fill', '#169b62');
        leaf.setAttribute('opacity', '0.3');
        
        shamrockGroup.appendChild(leaf);
    }
    
    // Add stem
    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stem.setAttribute('x1', '0');
    stem.setAttribute('y1', '0');
    stem.setAttribute('x2', '0');
    stem.setAttribute('y2', size);
    stem.setAttribute('stroke', '#169b62');
    stem.setAttribute('stroke-width', '2');
    stem.setAttribute('opacity', '0.3');
    
    shamrockGroup.appendChild(stem);
    
    return shamrockGroup;
}