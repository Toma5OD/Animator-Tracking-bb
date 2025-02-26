// Cityscape Background
import { elements, appState } from '../main.js';

export function createCityscapeBackground(container) {
    // Get config from app state
    const config = appState.config.backgroundElements.cityscape;
    const buildings = config.buildings;
    const canvas = elements.canvas;
    
    // Create a cityscape group
    const cityGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    
    // Add a night sky
    const sky = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    sky.setAttribute('x', '0');
    sky.setAttribute('y', '0');
    sky.setAttribute('width', canvas.width);
    sky.setAttribute('height', canvas.height);
    sky.setAttribute('fill', 'url(#skyGradient)');
    
    // Create sky gradient if it doesn't exist
    if (!document.getElementById('skyGradient')) {
        const skyGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        skyGradient.setAttribute('id', 'skyGradient');
        skyGradient.setAttribute('x1', '0%');
        skyGradient.setAttribute('y1', '0%');
        skyGradient.setAttribute('x2', '0%');
        skyGradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#05071F');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '40%');
        stop2.setAttribute('stop-color', '#162B50');
        
        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '100%');
        stop3.setAttribute('stop-color', '#2B4D7E');
        
        skyGradient.appendChild(stop1);
        skyGradient.appendChild(stop2);
        skyGradient.appendChild(stop3);
        
        const defs = document.querySelector('defs') || 
            document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.appendChild(skyGradient);
        
        if (!document.querySelector('defs')) {
            document.getElementById('avatarSVG').appendChild(defs);
        }
    }
    
    cityGroup.appendChild(sky);
    
    // Add stars
    for (let i = 0; i < 100; i++) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        star.setAttribute('cx', Math.random() * canvas.width);
        star.setAttribute('cy', Math.random() * (canvas.height / 2));
        star.setAttribute('r', Math.random() * 1.5);
        star.setAttribute('fill', 'white');
        
        // Add twinkling animation
        if (Math.random() > 0.7) {
            const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            animate.setAttribute('attributeName', 'opacity');
            animate.setAttribute('values', '0.2;1;0.2');
            animate.setAttribute('dur', (3 + Math.random() * 7) + 's');
            animate.setAttribute('repeatCount', 'indefinite');
            star.appendChild(animate);
        }
        
        cityGroup.appendChild(star);
    }
    
    // Add moon
    const moon = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    moon.setAttribute('cx', canvas.width * 0.8);
    moon.setAttribute('cy', canvas.height * 0.2);
    moon.setAttribute('r', 30);
    moon.setAttribute('fill', '#FFFDE7');
    moon.setAttribute('filter', 'url(#glow)');
    cityGroup.appendChild(moon);
    
    // Add buildings
    for (let i = 0; i < buildings; i++) {
        const x = i * (canvas.width / buildings);
        const width = (canvas.width / buildings) - 2;
        const height = 100 + Math.random() * 200;
        const y = canvas.height - height;
        
        const building = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        building.setAttribute('x', x);
        building.setAttribute('y', y);
        building.setAttribute('width', width);
        building.setAttribute('height', height);
        
        // Use different shades of blue-gray for buildings
        const shade = 20 + Math.floor(Math.random() * 40);
        building.setAttribute('fill', `rgb(${shade}, ${shade+5}, ${shade+15})`);
        
        cityGroup.appendChild(building);
        
        // Add windows if enabled
        if (config.windows) {
            const floors = Math.floor(height / 20);
            const windowsPerFloor = Math.floor(width / 15);
            
            for (let f = 0; f < floors; f++) {
                for (let w = 0; w < windowsPerFloor; w++) {
                    // Randomize window presence and light
                    if (Math.random() > 0.3) {
                        const windowEl = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        windowEl.setAttribute('x', x + 5 + w * 15);
                        windowEl.setAttribute('y', y + 5 + f * 20);
                        windowEl.setAttribute('width', 8);
                        windowEl.setAttribute('height', 12);
                        
                        // Random window colors
                        if (Math.random() > 0.7) {
                            windowEl.setAttribute('fill', 'rgba(255, 255, 150, 0.8)'); // Yellow light
                        } else if (Math.random() > 0.5) {
                            windowEl.setAttribute('fill', 'rgba(200, 220, 255, 0.8)'); // Blue light
                        } else {
                            windowEl.setAttribute('fill', 'rgba(150, 150, 150, 0.3)'); // Dark window
                        }
                        
                        cityGroup.appendChild(windowEl);
                    }
                }
            }
        }
    }
    
    container.appendChild(cityGroup);
}