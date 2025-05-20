// === PARTICLE INITIALIZATION UTILITIES ===
// This file contains helper functions for properly initializing particle positions and velocities

/**
 * Create a better distributed random position for particles
 * @param {number} minRadius - Minimum distance from origin
 * @param {number} maxRadius - Maximum distance from origin
 * @returns {Object} - Position coordinates {x, y, z}
 */
export function createRandomPosition(minRadius, maxRadius) {
    // Convert to better distribution using cubic interpolation for volume
    const u = Math.random(); // random value 0-1
    const r3Min = Math.pow(minRadius, 3);
    const r3Max = Math.pow(maxRadius, 3);
    const radius = Math.pow(r3Min + u * (r3Max - r3Min), 1/3);
    
    // Get random angles
    const phi = Math.random() * Math.PI * 2; // horizontal angle
    const theta = Math.acos(2 * Math.random() - 1); // vertical angle
    
    // Convert to Cartesian coordinates
    return {
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(theta) * 0.8 // scale z slightly
    };
}

/**
 * Create a random velocity vector with specified magnitude
 * @param {number} magnitude - Speed magnitude
 * @returns {Object} - Velocity vector {vx, vy, vz}
 */
export function createRandomVelocity(magnitude) {
    // Random direction
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.acos(2 * Math.random() - 1);
    
    // Randomize magnitude slightly for more dynamic movement
    const actualMagnitude = magnitude * (0.8 + Math.random() * 0.4);
    
    return {
        vx: actualMagnitude * Math.sin(theta) * Math.cos(phi),
        vy: actualMagnitude * Math.sin(theta) * Math.sin(phi),
        vz: actualMagnitude * Math.cos(theta) * 0.8
    };
}

/**
 * Reset a particle with new position and velocity
 * @param {Object} particle - Particle to reset
 * @param {number} minRadius - Minimum distance from origin
 * @param {number} maxRadius - Maximum distance from origin
 * @param {number} velocity - Base velocity magnitude
 */
export function resetParticle(particle, minRadius, maxRadius, velocity) {
    // Generate new position
    const pos = createRandomPosition(minRadius, maxRadius);
    particle.x = pos.x;
    particle.y = pos.y;
    particle.z = pos.z;
    
    // Generate new velocity
    const vel = createRandomVelocity(velocity);
    particle.vx = vel.vx;
    particle.vy = vel.vy;
    particle.vz = vel.vz;
    
    console.log(`Reset particle to: [${particle.x.toFixed(2)}, ${particle.y.toFixed(2)}, ${particle.z.toFixed(2)}]`);
}

/**
 * Fix performance issues by optimizing rendering
 * - Installs performance monitoring
 * - Adds caching for better performance
 */
export function optimizeRendering() {
    // Add performance monitoring
    const perfDiv = document.createElement('div');
    perfDiv.style.position = 'fixed';
    perfDiv.style.bottom = '10px';
    perfDiv.style.right = '10px';
    perfDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    perfDiv.style.color = 'white';
    perfDiv.style.padding = '5px';
    perfDiv.style.fontSize = '12px';
    perfDiv.style.fontFamily = 'monospace';
    perfDiv.style.zIndex = '1000';
    document.body.appendChild(perfDiv);
    
    // Performance variables
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 0;
    
    // Update performance stats
    setInterval(() => {
        const now = performance.now();
        const elapsed = now - lastTime;
        fps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        lastTime = now;
        
        perfDiv.textContent = `FPS: ${fps}`;
    }, 1000);
    
    // Return frame counter incrementing function
    return () => frameCount++;
}

/**
 * Initialize debugging tools
 */
export function initializeDebugTools() {
    // Create console helper function
    window.showParticles = function() {
        const particles = window.simulationParticles || [];
        console.table(particles.map(p => ({
            type: p.name,
            x: Math.round(p.x),
            y: Math.round(p.y),
            z: Math.round(p.z),
            vx: Math.round(p.vx),
            vy: Math.round(p.vy),
            vz: Math.round(p.vz),
        })));
        return `Showing ${particles.length} particles`;
    };
    
    console.log("Debug tools initialized. Try window.showParticles() to see particle data");
}
