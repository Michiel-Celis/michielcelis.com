// === CAMERA AND RENDERING ENGINE ===
// This module handles camera operations and particle rendering

// Import needed vector operations from physics engine
import { dot, cross, normalize } from './ParticlePhysics.js';

// Camera state class
class Camera {
    constructor(settings) {
        // Initialize with a slight angle to create a more dynamic view
        this.rot = { x: 0.2, y: 0.3, z: 0 };    // pitch, yaw, roll
        this.dist = settings.initialDist;         // fixed distance from origin
        this.focus = settings.initialFocus;       // focal plane
        this.minFocus = settings.minFocus;
        this.maxFocus = settings.maxFocus;
        this.focusSpeed = settings.focusSpeed;
        this.vel = {
            x: settings.orbitSpeed.x,
            y: settings.orbitSpeed.y,
            z: settings.orbitSpeed.z
        };
    }

    // Update camera rotation and apply damping
    update(dt, slowFactor, slowDownActive) {
        // Apply camera motion
        this.rot.x += this.vel.x * dt;
        this.rot.y += this.vel.y * dt;
        this.rot.z += this.vel.z * dt;
        
        // Limit pitch to avoid gimbal lock
        this.rot.x = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, this.rot.x));
        
        // Apply slowdown if active
        if (slowDownActive) {
            this.vel.x *= slowFactor;
            this.vel.y *= slowFactor;
            this.vel.z *= slowFactor;
        }
    }

    // Get camera position in world space
    getPosition() {
        const cp = Math.cos(this.rot.x);
        const sp = Math.sin(this.rot.x);
        const cy = Math.cos(this.rot.y);
        const sy = Math.sin(this.rot.y);
        return {
            x: sy * cp * this.dist,
            y: sp * this.dist,
            z: cy * cp * this.dist
        };
    }

    // Get camera orientation (basis vectors)
    getBasis(pos) {
        const forward = normalize({ x: -pos.x, y: -pos.y, z: -pos.z });
        const worldUp = { x: 0, y: 1, z: 0 };
        let right = normalize(cross(worldUp, forward));
        let up = cross(forward, right);
        
        if (this.rot.z !== 0) {
            const c = Math.cos(this.rot.z);
            const s = Math.sin(this.rot.z);
            right = normalize({
                x: right.x * c + up.x * s,
                y: right.y * c + up.y * s,
                z: right.z * c + up.z * s
            });
            up = cross(forward, right);
        }
        
        return { right, up, forward };
    }

    // Set focal distance based on wheel delta
    adjustFocus(deltaY) {
        this.focus = Math.max(
            this.minFocus,
            Math.min(this.maxFocus,
                this.focus + Math.sign(deltaY) * this.focusSpeed
            )
        );
    }
}

// Rendering manager class
class Renderer {
    constructor(settings, container) {
        this.settings = settings;
        this.container = container;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Listen for window resize
        window.addEventListener('resize', () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
        });
    }    // Project a 3D point to 2D screen space
    project(pt, basis, camPos, focalLength) {
        const rel = {
            x: pt.x - camPos.x,
            y: pt.y - camPos.y,
            z: pt.z - camPos.z
        };
        
        const xCam = dot(basis.right, rel);
        const yCam = dot(basis.up, rel);
        const zCam = dot(basis.forward, rel);
        
        // Safety check - if camera can't see the point, return null
        if (zCam <= this.settings.nearClip) {
            return null;
        }
        
        // Convert 3D to 2D with perspective projection
        const scale = focalLength / zCam;
        
        // Return screen coordinates (centered)
        return {
            x: this.width / 2 + xCam * scale,
            y: this.height / 2 - yCam * scale,
            depth: zCam
        };
    }

    // Render coordinate axes
    renderAxes(axes, camera, focalLength) {
        const camPos = camera.getPosition();
        const basis = camera.getBasis(camPos);
        
        for (const axis of axes) {
            // Project origin and axis endpoint
            const originPoint = this.project(axis.from, basis, camPos, focalLength);
            const endPoint = this.project(axis.to, basis, camPos, focalLength);
            
            // If either point is outside the view frustum, hide the axis
            if (!originPoint || !endPoint) {
                axis.el.style.display = 'none';
                axis.pointEl.style.display = 'none';
                continue;
            }
            
            // Show and position the axis line (origin)
            axis.el.style.display = '';
            axis.el.style.transform = `translate(${originPoint.x}px, ${originPoint.y}px)`;
            
            // Show and position the endpoint
            axis.pointEl.style.display = '';
            axis.pointEl.style.transform = `translate(${endPoint.x}px, ${endPoint.y}px)`;
        }
    }

    // Render all particles
    renderParticles(particles, camera, focalLength) {
        const camPos = camera.getPosition();
        const basis = camera.getBasis(camPos);
        const {
            nearClip, farClip, blurScale, maxRenderBlur,
            depthDarkeningFactor, scaleFactor
        } = this.settings;
        
        for (const particle of particles) {
            // Project particle from 3D to 2D
            const projPoint = this.project(
                { x: particle.x, y: particle.y, z: particle.z },
                basis,
                camPos,
                focalLength
            );
            
            // Skip if outside view frustum
            if (!projPoint) {
                particle.el.style.display = 'none';
                continue;
            }
            
            const zDepth = projPoint.depth;
            
            // DOF blur calculation
            const focalError = Math.abs(zDepth - camera.focus);
            const blur = focalError * blurScale;
            
            // Cull particles with excessive blur
            if (blur > maxRenderBlur) {
                particle.el.style.display = 'none';
                continue;
            }
            
            // Size and appearance calculations
            const scale = (scaleFactor * 1000 / zDepth).toFixed(2);
            
            // Enhanced depth-based brightness calculation
            // Calculate relative depth (0.0 = closest, 1.0 = farthest)
            const normalizedDepth = Math.max(0, Math.min(1, (zDepth - nearClip) / (farClip - nearClip)));
            
            // Apply depth-based darkening (distant objects are darker)
            // Combine with focal plane effect for a more dynamic look
            const depthDarkening = 1 - (normalizedDepth * depthDarkeningFactor);
            const focalEffect = zDepth < camera.focus 
                ? 1 + Math.min(0.2, (camera.focus - zDepth) / 500)
                : 1 - Math.min(0.5, (zDepth - camera.focus) / 1000);
            
            // Combine both effects
            const brightness = depthDarkening * focalEffect;
            
            const opacity = Math.max(0.3, Math.min(1, 1.1 - focalError / 1000)).toFixed(2);
            const hueShift = particle.boundTo ? 'hue-rotate(-10deg)' : '';
            
            // Apply visual properties
            particle.el.style.border = 'none';
            particle.el.style.display = '';
            particle.el.style.filter = `blur(${(blur * 0.5).toFixed(2)}px) brightness(${brightness.toFixed(2)}) ${hueShift}`;
            particle.el.style.boxShadow = `0 0 ${(blur * 5).toFixed(2)}px ${(blur * 1.5).toFixed(2)}px ${particle.color}`;
            particle.el.style.opacity = opacity;
            particle.el.style.borderRadius = '50%'; // Maintain perfect circular shape
            
            // Calculate size based on particle type and depth
            let baseSize;
            if (particle.name === 'electron') {
                baseSize = this.settings.ElectronSize;
            } else if (particle.name === 'proton') {
                baseSize = this.settings.ProtonSize;
            } else { // neutron
                baseSize = this.settings.NeutronSize;
            }
            
            // Scale particle size based on distance from camera
            const particleSize = baseSize * parseFloat(scale);
            
            // Apply transformation with explicit width/height to maintain aspect ratio
            particle.el.style.width = `${particleSize}px`;
            particle.el.style.height = `${particleSize}px`;
            particle.el.style.transform = `translate(${projPoint.x - particleSize/2}px, ${projPoint.y - particleSize/2}px)`;
        }
    }

    // Create and attach DOM elements for axes
    createAxisElements(axes) {
        for (const axis of axes) {
            // Create line element
            const el = document.createElement('div');
            el.className = 'axis';
            el.style.position = 'absolute';
            el.style.width = '4px';
            el.style.height = '4px';
            el.style.borderRadius = '2px';
            el.style.background = axis.color;
            el.style.boxShadow = `0 0 8px 2px ${axis.color}`;
            el.style.pointerEvents = 'none';
            this.container.appendChild(el);
            
            // Create endpoint element
            const pointEl = document.createElement('div');
            pointEl.className = 'axis-point';
            pointEl.style.position = 'absolute';
            pointEl.style.width = '8px';
            pointEl.style.height = '8px';
            pointEl.style.borderRadius = '4px';
            pointEl.style.background = axis.color;
            pointEl.style.boxShadow = `0 0 12px 3px ${axis.color}`;
            pointEl.style.pointerEvents = 'none';
            this.container.appendChild(pointEl);
            
            // Store elements in the axis object
            axis.el = el;
            axis.pointEl = pointEl;
        }
    }

    // Create particle DOM elements
    createParticleElements(particles) {
        // Add some base styling for particles
        const style = document.createElement('style');
        style.textContent = `
          .firefly {
            position: absolute;
            border-radius: 50%;
            box-sizing: border-box;
            transform-origin: center center;
            display: block;
            will-change: transform, filter, opacity;
            overflow: visible;
          }
          
          .axis, .axis-point {
            position: absolute;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
    }
}

// Export classes and functions
export { Camera, Renderer };
