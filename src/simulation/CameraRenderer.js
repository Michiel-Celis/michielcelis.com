// === CAMERA AND RENDERING ENGINE ===
// This module handles camera operations and particle rendering

// Import needed vector operations from physics engine
import { dot, cross, normalize } from './ParticlePhysics.js';

// Configuration constants
let FADE_TRANSITION_TIME = 1000; // Milliseconds for fade transition animations
let SHOW_AXES = false; // Whether to show the coordinate axes

// Function to toggle axes visibility
function toggleAxesVisibility() {
    SHOW_AXES = !SHOW_AXES;
    return SHOW_AXES;
}

// Quaternion utilities for smooth camera rotation
const Quaternion = {
    // Create quaternion from axis-angle representation
    fromAxisAngle: (axis, angle) => {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return {
            x: axis.x * s,
            y: axis.y * s,
            z: axis.z * s,
            w: Math.cos(halfAngle)
        };
    },
    
    // Create quaternion from Euler angles (XYZ order)
    fromEuler: (pitch, yaw, roll) => {
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);
        
        return {
            x: sp * cy * cr - cp * sy * sr,
            y: cp * sy * cr + sp * cy * sr,
            z: cp * cy * sr - sp * sy * cr,
            w: cp * cy * cr + sp * sy * sr
        };
    },
    
    // Multiply two quaternions (compose rotations)
    multiply: (a, b) => {
        return {
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
        };
    },
    
    // Rotate a vector by a quaternion
    rotateVector: (v, q) => {
        // Convert vector to quaternion with w=0
        const vq = { x: v.x, y: v.y, z: v.z, w: 0 };
        
        // Calculate q * v * q^-1
        const qInv = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
        const temp = Quaternion.multiply(q, vq);
        const rotated = Quaternion.multiply(temp, qInv);
        
        return { x: rotated.x, y: rotated.y, z: rotated.z };
    },
    
    // Normalize a quaternion
    normalize: (q) => {
        const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
        return {
            x: q.x / len,
            y: q.y / len,
            z: q.z / len,
            w: q.w / len
        };
    }
};

// Camera state class
class Camera {
    constructor(settings) {
        // We'll track both Euler angles (for user interface) and a quaternion (for actual rotation)
        this.rot = { x: 0, y: 0, z: 0 };          // pitch, yaw, roll (used for incremental updates)
        this.quaternion = { x: 0, y: 0, z: 0, w: 1 }; // Identity quaternion
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
        
        // Initial basis vectors
        this.forward = { x: 0, y: 0, z: 1 };  // Looking along z-axis initially
        this.up = { x: 0, y: 1, z: 0 };       // Up is along y-axis
        this.right = { x: 1, y: 0, z: 0 };    // Right is along x-axis
    }    // Update camera rotation and apply damping
    update(dt, slowFactor, slowDownActive) {
        // Store old rotation values to compute incremental changes
        const oldRot = { x: this.rot.x, y: this.rot.y, z: this.rot.z };
        
        // Apply camera motion
        this.rot.x += this.vel.x * dt;
        this.rot.y += this.vel.y * dt;
        this.rot.z += this.vel.z * dt;
        
        // Normalize all angles to keep them in the range [0, 2π]
        this.rot.x = this.rot.x % (2 * Math.PI);
        if (this.rot.x < 0) this.rot.x += 2 * Math.PI;
        
        this.rot.y = this.rot.y % (2 * Math.PI);
        if (this.rot.y < 0) this.rot.y += 2 * Math.PI;
        
        this.rot.z = this.rot.z % (2 * Math.PI);
        if (this.rot.z < 0) this.rot.z += 2 * Math.PI;
        
        // Calculate delta rotations
        const deltaX = this.rot.x - oldRot.x;
        const deltaY = this.rot.y - oldRot.y;
        const deltaZ = this.rot.z - oldRot.z;
        
        // Update the quaternion using incremental rotations - this prevents discontinuities
        // Apply rotations in order: yaw (Y), pitch (X), roll (Z)
        if (deltaY !== 0) {
            // Yaw rotation around world Y axis
            const yawQ = Quaternion.fromAxisAngle({ x: 0, y: 1, z: 0 }, deltaY);
            this.quaternion = Quaternion.normalize(Quaternion.multiply(yawQ, this.quaternion));
        }
        
        if (deltaX !== 0) {
            // Pitch rotation around local X axis - use the current right vector
            const basis = this.getBasis();
            const pitchQ = Quaternion.fromAxisAngle(basis.right, deltaX);
            this.quaternion = Quaternion.normalize(Quaternion.multiply(pitchQ, this.quaternion));
        }
        
        if (deltaZ !== 0) {
            // Roll rotation around local Z axis - use the current forward vector
            const basis = this.getBasis();
            const rollQ = Quaternion.fromAxisAngle(basis.forward, deltaZ);
            this.quaternion = Quaternion.normalize(Quaternion.multiply(rollQ, this.quaternion));
        }
        
        // Apply slowdown if active
        if (slowDownActive) {
            this.vel.x *= slowFactor;
            this.vel.y *= slowFactor;
            this.vel.z *= slowFactor;
        }
    }
      // Get camera position in world space
    getPosition() {
        // Start with the initial forward vector (0,0,1) and rotate it by the quaternion
        // We need to negate it since forward is from camera to origin
        const initialForward = { x: 0, y: 0, z: 1 };
        const rotatedForward = Quaternion.rotateVector(initialForward, this.quaternion);
        
        // Scale by distance and negate (camera is looking toward origin)
        return {
            x: -rotatedForward.x * this.dist,
            y: -rotatedForward.y * this.dist,
            z: -rotatedForward.z * this.dist
        };
    }

    // Get camera orientation (basis vectors)
    getBasis() {
        // Calculate the basis vectors by rotating the standard basis with our quaternion
        const forward = Quaternion.rotateVector({ x: 0, y: 0, z: 1 }, this.quaternion);
        const up = Quaternion.rotateVector({ x: 0, y: 1, z: 0 }, this.quaternion);
        const right = Quaternion.rotateVector({ x: 1, y: 0, z: 0 }, this.quaternion);
        
        // Ensure all vectors are normalized
        return {
            forward: normalize(forward),
            up: normalize(up),
            right: normalize(right)
        };
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
    }

    // Project a 3D point to 2D screen space
    project(pt, basis, camPos, focalLength) {
        const rel = {
            x: pt.x - camPos.x,
            y: pt.y - camPos.y,
            z: pt.z - camPos.z
        };
        
        const xCam = dot(basis.right, rel);
        const yCam = dot(basis.up, rel);
        const zCam = dot(basis.forward, rel);
        
        if (zCam <= this.settings.nearClip) {
            return null;
        }
        
        const scale = focalLength / zCam;
        
        return {
            x: this.width / 2 + xCam * scale,
            y: this.height / 2 - yCam * scale,
            depth: zCam
        };
    }    // Render coordinate axes
    renderAxes(axes, camera, focalLength) {
        // If axes are disabled, hide all axes and return
        if (!SHOW_AXES) {
            for (const axis of axes) {
                if (axis.el) {
                    axis.el.style.display = 'none';
                    axis.pointEl.style.display = 'none';
                }
            }
            return;
        }
        
        const camPos = camera.getPosition();
        const basis = camera.getBasis();
        
        for (const axis of axes) {
            // Initialize visibility properties if they don't exist
            if (axis.visibility === undefined) {
                axis.visibility = true;                axis.el.style.transition = `opacity ${FADE_TRANSITION_TIME}ms ease-in-out`;
                axis.pointEl.style.transition = `opacity ${FADE_TRANSITION_TIME}ms ease-in-out`;
                axis.el.style.opacity = '1';
                axis.pointEl.style.opacity = '1';
            }
            
            // Project origin and axis endpoint
            const originPoint = this.project(axis.from, basis, camPos, focalLength);
            const endPoint = this.project(axis.to, basis, camPos, focalLength);
            
            // If either point is outside the view frustum, fade out the axis
            const shouldBeVisible = originPoint && endPoint;
            
            if (shouldBeVisible !== axis.visibility) {
                axis.visibility = shouldBeVisible;
                
                if (shouldBeVisible) {
                    // Axis is coming into view
                    axis.el.style.display = '';
                    axis.pointEl.style.display = '';
                    
                    // Force reflow to ensure transition applies
                    void axis.el.offsetWidth;
                    void axis.pointEl.offsetWidth;
                    
                    // Then transition to full opacity
                    axis.el.style.opacity = '1';
                    axis.pointEl.style.opacity = '1';
                } else {
                    // Axis is going out of view, fade out
                    axis.el.style.opacity = '0';
                    axis.pointEl.style.opacity = '0';
                    
                    // After the transition is complete, hide the elements
                    setTimeout(() => {
                        // Only hide if still marked as not visible
                        if (!axis.visibility) {
                            axis.el.style.display = 'none';
                            axis.pointEl.style.display = 'none';
                        }
                    }, FADE_TRANSITION_TIME); // Match the transition duration
                }
            }
            
            if (shouldBeVisible) {
                // Update positions only when visible
                axis.el.style.transform = `translate(${originPoint.x}px, ${originPoint.y}px)`;
                axis.pointEl.style.transform = `translate(${endPoint.x}px, ${endPoint.y}px)`;
            }
        }
    }

    // Render all particles
    renderParticles(particles, camera, focalLength) {
        const camPos = camera.getPosition();
        const basis = camera.getBasis();
        const {
            nearClip, farClip, blurScale, maxRenderBlur,
            depthDarkeningFactor, scaleFactor
        } = this.settings;
        
        for (const particle of particles) {
            // Initialize visibility property if it doesn't exist
            if (particle.visibility === undefined) {
                particle.visibility = true;
                particle.el.style.opacity = "1";
            }
            
            // Project particle from 3D to 2D
            const projPoint = this.project(
                { x: particle.x, y: particle.y, z: particle.z },
                basis,
                camPos,
                focalLength
            );
            
            // Check if the particle is outside the view frustum
            const outsideFrustum = !projPoint;
            
            // Calculate depth, blur and check if blur is too high (when particle is visible)
            let excessiveBlur = false;
            let zDepth, blur, brightness, opacity, scale, particleSize;
            
            if (!outsideFrustum) {
                zDepth = projPoint.depth;
                
                // DOF blur calculation
                const focalError = Math.abs(zDepth - camera.focus);
                blur = focalError * blurScale;
                
                // Check if blur is too high
                excessiveBlur = blur > maxRenderBlur;
                
                if (!excessiveBlur) {
                    // Size and appearance calculations
                    scale = (scaleFactor * 1000 / zDepth).toFixed(2);
                    
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
                    brightness = depthDarkening * focalEffect;
                    
                    opacity = Math.max(0.3, Math.min(1, 1.1 - focalError / 1000)).toFixed(2);
                }
            }
            
            // Determine if the particle should be visible
            const shouldBeVisible = !outsideFrustum && !excessiveBlur;
            
            // Handle visibility transition
            if (shouldBeVisible !== particle.visibility) {
                particle.visibility = shouldBeVisible;
                
                if (shouldBeVisible) {
                    // Particle is coming into view, display it but with opacity 0 initially
                    particle.el.style.display = '';
                    
                    // Force reflow to ensure transition applies
                    void particle.el.offsetWidth;
                    
                    // Then transition to full opacity
                    particle.el.style.opacity = opacity;
                } else {
                    // Particle is going out of view, fade out
                    particle.el.style.opacity = '0';
                    
                    // After the transition is complete, hide the element
                    setTimeout(() => {
                        // Only hide if the particle is still marked as not visible
                        if (!particle.visibility) {
                            particle.el.style.display = 'none';
                        }
                    }, FADE_TRANSITION_TIME); // Match the transition duration
                }
            }
            
            // If the particle should be visible, update its appearance
            if (shouldBeVisible) {
                // Apply visual properties
                particle.el.style.border = 'none';
                
                // Apply special visual effects for particles influenced by central attractor
                if (particle.nearAttractor) {
                    // Add a golden glow effect for particles near the attractor
                    const goldGlow = 'drop-shadow(0 0 3px gold)';
                    const baseFilter = `blur(${(blur * 0.5).toFixed(2)}px) brightness(${(brightness * 1.2).toFixed(2)})`;
                    
                    // Add a subtle pulsing animation for particles in orbit
                    if (!particle.hasAttractorClass) {
                        particle.el.classList.add('attractor-orbit');
                        particle.hasAttractorClass = true;
                        
                        // Define animation if not already done
                        if (!this.attractorAnimationAdded) {
                            const styleSheet = document.createElement('style');
                            styleSheet.type = 'text/css';
                            styleSheet.innerHTML = `
                            @keyframes attractorPulse {
                                0% { filter: ${baseFilter} ${goldGlow}; }
                                50% { filter: ${baseFilter} drop-shadow(0 0 5px gold); }
                                100% { filter: ${baseFilter} ${goldGlow}; }
                            }
                            .attractor-orbit {
                                animation: attractorPulse 1.5s infinite ease-in-out;
                            }`;
                            document.head.appendChild(styleSheet);
                            this.attractorAnimationAdded = true;
                        }
                    }
                    
                    particle.el.style.filter = `${baseFilter} ${goldGlow}`;
                } else {
                    // Normal particle rendering
                    const hueShift = particle.boundTo ? 'hue-rotate(-10deg)' : '';
                    particle.el.style.filter = `blur(${(blur * 0.5).toFixed(2)}px) brightness(${brightness.toFixed(2)}) ${hueShift}`;
                    
                    // Remove attractor class if present
                    if (particle.hasAttractorClass) {
                        particle.el.classList.remove('attractor-orbit');
                        particle.hasAttractorClass = false;
                    }
                }
                
                particle.el.style.boxShadow = `0 0 ${(blur * 5).toFixed(2)}px ${(blur * 1.5).toFixed(2)}px ${particle.color}`;
                
                // Only update opacity if already visible (to not interrupt fade-in animation)
                if (parseFloat(particle.el.style.opacity) > 0) {
                    particle.el.style.opacity = opacity;
                }
                
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
                particleSize = baseSize * parseFloat(scale);
                
                // Apply transformation with explicit width/height to maintain aspect ratio
                particle.el.style.width = `${particleSize}px`;
                particle.el.style.height = `${particleSize}px`;
                particle.el.style.transform = `translate(${projPoint.x - particleSize/2}px, ${projPoint.y - particleSize/2}px)`;
            }
        }
    }

    // Create and attach DOM elements for axes
    createAxisElements(axes) {
        // Even if axes are disabled, we still create the elements
        // They'll just be hidden by the renderAxes method
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
            // Initially hide if axes are disabled
            if (!SHOW_AXES) {
                el.style.display = 'none';
            }
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
            // Initially hide if axes are disabled
            if (!SHOW_AXES) {
                pointEl.style.display = 'none';
            }
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
        style.textContent = `          .firefly {
            position: absolute;
            border-radius: 50%;
            box-sizing: border-box;
            transform-origin: center center;
            display: block;
            will-change: transform, filter, opacity;
            overflow: visible;
            transition: opacity ${FADE_TRANSITION_TIME}ms ease-in-out;
          }          .axis, .axis-point {
            position: absolute;
            pointer-events: none;
            transition: opacity ${FADE_TRANSITION_TIME}ms ease-in-out;
          }
        `;
        document.head.appendChild(style);
    }
}

// Export classes and functions
export { Camera, Renderer, toggleAxesVisibility };
