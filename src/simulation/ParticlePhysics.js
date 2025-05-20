// === PARTICLE PHYSICS ENGINE ===
// This module handles all particle physics calculations and interactions

// Import the quantum mechanics functions
import {
    CONSTANTS,
    getQuantizedRadius,
    getQuantizedVelocity,
    getNearestQuantumNumber,
    applyQuantumConstraints,
    createQuantizedElectronOrbit,
    createQuantizedElectronOrbitWithExclusion,
    applyQuantumExclusionConstraints,
    updateConstants
} from './QuantumMechanics.js';

// Vector operations
function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function length(v) {
    return Math.hypot(v.x, v.y, v.z);
}

function normalize(v) {
    const l = length(v) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// Compute potential energy between two particles based on their types and distance
function computePotential(a, b, r, settings) {
    const {
        emConst, 
        nuclearPotentialDepth, 
        nuclearPotentialRange, 
        nuclearPotentialDiffuseness,
        exclusionRadius,
        exclusionRepulsion
    } = settings;

    // Coulomb potential: V_C(r) = k * q1 * q2 / r
    const coulombPotential = emConst * a.charge * b.charge / r;

    // Initialize total potential with Coulomb
    let totalPotential = coulombPotential;

    // Handle nuclear potentials (Woods-Saxon for proton-neutron interactions)
    if ((a.name === 'proton' && b.name === 'neutron') ||
        (a.name === 'neutron' && b.name === 'proton')) {
        
        // Woods-Saxon potential: V_WS(r) = -V0 / (1 + exp((r-R)/a))
        // V0 = depth, R = range, a = diffuseness
        const woodsSaxonPotential = -nuclearPotentialDepth / 
            (1 + Math.exp((r - nuclearPotentialRange) / nuclearPotentialDiffuseness));
        
        // Add nuclear potential to total
        totalPotential += woodsSaxonPotential;
    }

    // Pauli exclusion principle (repulsive core for same-type particles with same spin)
    if (a.name === b.name && a.spin === b.spin && r < exclusionRadius) {
        // Short-range repulsive potential to enforce exclusion principle
        const exclusionPotential = exclusionRepulsion * Math.pow(exclusionRadius / r, 12);
        totalPotential += exclusionPotential;
    }

    return totalPotential;
}

// Calculate force between two particles as the negative gradient of potential
function computeForcePair(a, b, settings) {
    // Calculate distance vector from a to b
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    
    // Avoid division by zero and skip distant particles
    if (r2 < 0.01 || r2 > 30000) {
        return { fx: 0, fy: 0, fz: 0 };
    }
    
    const r = Math.sqrt(r2);
    const ux = dx / r;
    const uy = dy / r;
    const uz = dz / r;
    
    // Get potential energy at current position
    const potential = computePotential(a, b, r, settings);
    
    // Small delta for numerical differentiation
    const delta = 0.01;
    
    // Get potential energy at slightly different positions for each dimension
    // to calculate the gradient (central difference approximation)
    const rx = r + delta;
    const ry = r + delta;
    const rz = r + delta;
    
    const potentialX = computePotential(a, b, rx, settings);
    const potentialY = computePotential(a, b, ry, settings);
    const potentialZ = computePotential(a, b, rz, settings);
    
    // Calculate gradient components as (dV/dr) * (dr/dx) where dr/dx = x/r
    const dVdr = (potentialX - potential) / delta;
    
    // The force is the negative gradient of the potential
    // F = -∇V, and we multiply by the unit vector in each direction
    const forceMagnitude = -dVdr;
    
    // Return force components
    return {
        fx: forceMagnitude * ux,
        fy: forceMagnitude * uy,
        fz: forceMagnitude * uz
    };
}

// Spatial hash builder
function buildSpatialHash(particles, cellSize) {
    const grid = new Map();
    for (const p of particles) {
        const cx = Math.floor(p.x / cellSize),
              cy = Math.floor(p.y / cellSize),
              cz = Math.floor(p.z / cellSize),
              key = `${cx},${cy},${cz}`;
        if (!grid.has(key)) {
            grid.set(key, []);
        }
        grid.get(key).push(p);
    }
    return grid;
}

// Generate random spherical coordinates
function randomSphericalCoords(minRadius, maxRadius) {
    // Use a uniform distribution for radius (r³ distribution for volume)
    const u = Math.random();
    const r3Min = Math.pow(minRadius, 3);
    const r3Max = Math.pow(maxRadius, 3);
    const radius = Math.pow(r3Min + u * (r3Max - r3Min), 1/3);
    
    // Random horizontal angle (uniform distribution)
    const theta = Math.random() * Math.PI * 2;
    
    // Random vertical angle (ensure uniform distribution on sphere)
    const phi = Math.acos(2 * Math.random() - 1);
      // Convert spherical coordinates to Cartesian
    return {
        radius,
        theta,
        phi,
        // Convert to cartesian
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi) * 0.8 // Scale z slightly to prevent particles from being too far in z axis
    };
}

// Generate random velocity vector
function randomVelocityVector(magnitude) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    return {
        x: magnitude * Math.sin(phi) * Math.cos(theta),
        y: magnitude * Math.sin(phi) * Math.sin(theta),
        z: magnitude * Math.cos(phi)
    };
}

// Create particle-proton binding with quantized (Bohr-style) orbits
function createElectronOrbit(electron, proton, settings, quantumNumber = null) {
    if (settings.pauliExclusion) {
        // Use the enhanced quantum mechanics module with Pauli exclusion
        const orbit = createQuantizedElectronOrbitWithExclusion(electron, proton, settings);
        
        // Store the quantum state in the electron object
        electron.quantumState = orbit.quantumState;
        electron.orbitalProps = orbit.orbitalProps;
        electron.orbiting = proton;
        
        // Calculate velocity components from orbital properties
        const speed = orbit.orbitalProps.speed;
        const radius = orbit.orbitalProps.radius;
        const inclination = orbit.orbitalProps.inclination;
        const phaseOffset = orbit.orbitalProps.phaseOffset;
        
        // Random orbit orientation
        const orbitAngle = Math.random() * Math.PI * 2;
        
        // Calculate initial position in the orbital plane
        const orbitX = radius * Math.cos(orbitAngle + phaseOffset);
        const orbitY = radius * Math.sin(orbitAngle + phaseOffset);
        
        // Apply inclination (rotate around x-axis)
        const yFinal = orbitY * Math.cos(inclination);
        const zFinal = orbitY * Math.sin(inclination);
        
        // Position the electron
        electron.x = proton.x + orbitX;
        electron.y = proton.y + yFinal;
        electron.z = proton.z + zFinal;
        
        // Calculate velocity perpendicular to radius vector
        const vx = -speed * Math.sin(orbitAngle + phaseOffset);
        const vy = speed * Math.cos(orbitAngle + phaseOffset) * Math.cos(inclination);
        const vz = speed * Math.cos(orbitAngle + phaseOffset) * Math.sin(inclination);
        
        return { vx, vy, vz };
    } else {
        // Use the simple quantum mechanics module without Pauli exclusion
        const orbit = createQuantizedElectronOrbit(electron, proton, settings, quantumNumber);
        
        // Store the quantum state in the electron object
        electron.quantumNumber = orbit.quantumNumber;
        electron.quantumRadius = orbit.radius;
        
        // Return the velocity components
        return {
            vx: orbit.vx,
            vy: orbit.vy,
            vz: orbit.vz
        };
    }
}

// Create proton-neutron binding
function createNucleonBinding(neutron, proton, settings) {
    // Position neutron at ~0.85×bindingDistance from proton (closer for tighter binding)
    const θ = Math.random() * 2 * Math.PI,
          φ = Math.acos(2 * Math.random() - 1),
          r = settings.bindingDistance * 0.85;
    
    // Calculate position relative to proton
    const relativePos = {
        x: r * Math.sin(φ) * Math.cos(θ),
        y: r * Math.sin(φ) * Math.sin(θ),
        z: r * Math.cos(φ)
    };
    
    // Calculate position in world coordinates
    const newPos = {
        x: proton.x + relativePos.x,
        y: proton.y + relativePos.y,
        z: proton.z + relativePos.z
    };
    
    // Create a random orbital plane for the nucleons
    
    // Normalize the position vector
    const d = Math.sqrt(relativePos.x*relativePos.x + relativePos.y*relativePos.y + relativePos.z*relativePos.z) || 0.1;
    const rNorm = {
        x: relativePos.x / d,
        y: relativePos.y / d,
        z: relativePos.z / d
    };
    
    // Create a random perpendicular axis for the orbital plane
    // First create a random vector not aligned with rNorm
    let wx = Math.random() * 2 - 1,
        wy = Math.random() * 2 - 1,
        wz = Math.random() * 2 - 1;
    
    const wlen = Math.sqrt(wx*wx + wy*wy + wz*wz) || 1;
    wx /= wlen;
    wy /= wlen;
    wz /= wlen;
    
    // Cross product to get perpendicular vector (orbital axis)
    let ux = rNorm.y * wz - rNorm.z * wy,
        uy = rNorm.z * wx - rNorm.x * wz,
        uz = rNorm.x * wy - rNorm.y * wx;
    
    const ulen = Math.sqrt(ux*ux + uy*uy + uz*uz) || 0.1;
    ux /= ulen;
    uy /= ulen;
    uz /= ulen;
      // Calculate orbital velocity magnitude based on nuclear binding forces
    // Use a strengthened model with higher orbital velocity for better binding
    const orbitalVelocityMagnitude = Math.sqrt(settings.bindingSpringK / neutron.mass) * 0.7; // Increased from 0.5
    
    // Calculate tangential velocity vector (cross product of orbital axis and radial vector)
    const vx = (uy * rNorm.z - uz * rNorm.y) * orbitalVelocityMagnitude,
          vy = (uz * rNorm.x - ux * rNorm.z) * orbitalVelocityMagnitude,
          vz = (ux * rNorm.y - uy * rNorm.x) * orbitalVelocityMagnitude;
    
    // Apply velocities (base it on proton's velocity plus orbital component)
    return {
        // Position
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        // Velocity (match proton's plus orbital component)
        vx: proton.vx + vx,
        vy: proton.vy + vy,
        vz: proton.vz + vz
    };
}

// Calculate acceleration for a particle based on forces
function calculateAcceleration(particle, particles, blackHoles, grid, settings, accelerations = {}) {
    const {
        dt, emConst, exclusionRadius, exclusionRepulsion,
        bindingSpringK, nuclearYukawaStrength, nuclearYukawaMu, nuclearRepulsionA,
        weakDecayRate, ongoingEntropy, ongoingZEntropy,
        friction, bhGravity, speedOfLight,
        closeRangeAttractionFactor, electronProtonAttractionFactor, 
        protonNeutronAttractionFactor, protonProtonRepulsionFactor, 
        electronElectronRepulsionFactor
    } = settings;

    let fx = 0, fy = 0, fz = 0;
    const cx = Math.floor(particle.x / settings.cellSize),
          cy = Math.floor(particle.y / settings.cellSize),
          cz = Math.floor(particle.z / settings.cellSize);

    // pairwise forces using potential-based approach
    for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
            for (let oz = -1; oz <= 1; oz++) {
                const cell = grid.get(`${cx + ox},${cy + oy},${cz + oz}`);
                if (!cell) {
                    continue;
                }
                
                for (const b of cell) {
                    if (b === particle) {
                        continue;
                    }
                    
                    // Calculate pairwise force using potential gradient
                    const force = computeForcePair(particle, b, settings);
                    
                    // Accumulate forces
                    fx += force.fx;
                    fy += force.fy;
                    fz += force.fz;
                    
                    // Minimal correction for bound particles to maintain stability
                    // This avoids excessive damping while still providing structural stability
                    if (particle.boundTo === b || particle.orbiting === b) {
                        const dx = b.x - particle.x;
                        const dy = b.y - particle.y;
                        const dz = b.z - particle.z;
                        const d2 = dx * dx + dy * dy + dz * dz;
                        
                        if (d2 > 30000) {
                            continue;
                        }
                        
                        const d = Math.sqrt(d2) + 0.1,
                              ux = dx / d, 
                              uy = dy / d, 
                              uz = dz / d;

                        // Coulomb force with modifiers
                        let fe = -emConst * a.charge * b.charge / Math.max(d2, 100);
                        
                        // Apply close range attraction factor when particles are within attraction range
                        if (d < settings.bindingDistance * 2) {
                            fe *= closeRangeAttractionFactor;
                        }
                        
                        // Fix for electron-electron interaction: ensure electrons strongly repel each other
                        // and cannot orbit each other due to same charge
                        if (a.name === 'electron' && b.name === 'electron') {
                            // Increase repulsion between electrons to prevent orbiting
                            const strongerRepulsion = -emConst * a.charge * b.charge * 5 * electronElectronRepulsionFactor / Math.max(d2, 100);
                            fx += strongerRepulsion * ux;
                            fy += strongerRepulsion * uy;
                            fz += strongerRepulsion * uz;
                        } else if ((a.name === 'electron' && b.name === 'proton') ||
                            (a.name === 'proton' && b.name === 'electron')) {
                            // Apply electron-proton attraction factor
                            const modifiedFe = fe * electronProtonAttractionFactor;
                            fx += modifiedFe * ux; 
                            fy += modifiedFe * uy; 
                            fz += modifiedFe * uz;
                            
                            // Enhanced stability for electron orbits
                            // Apply a small corrective force to maintain orbits
                            if (d > 50 && d < 200) {  // Optimal orbital range
                                // Apply a slight damping to radial velocity component
                                const radialVel = a.vx * ux + a.vy * uy + a.vz * uz;
                                fx -= 0.1 * radialVel * ux;
                                fy -= 0.1 * radialVel * uy;
                                fz -= 0.1 * radialVel * uz;
                                
                                // Apply a slight boost to maintain orbital velocity if needed
                                const orbitSpeed = Math.sqrt(
                                    a.vx * a.vx + a.vy * a.vy + a.vz * a.vz - radialVel * radialVel
                                );
                                
                                // If orbital speed is too low, provide a small boost perpendicular to radius
                                if (orbitSpeed < Math.sqrt(emConst * Math.abs(a.charge * b.charge) / (a.mass * d)) * 0.8) {
                                    // Create perpendicular vector for orbital boost
                                    const perpX = a.vy * uz - a.vz * uy;
                                    const perpY = a.vz * ux - a.vx * uz;
                                    const perpZ = a.vx * uy - a.vy * ux;
                                    
                                    // Normalize and apply a small boost
                                    const perpLen = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ) || 1;
                                    fx += 0.5 * perpX / perpLen;
                                    fy += 0.5 * perpY / perpLen;
                                    fz += 0.5 * perpZ / perpLen;
                                }
                            }
                        }                        // Nuclear Yukawa + repulsion
                        if ((a.name === 'proton' && b.name === 'neutron') ||
                            (a.name === 'neutron' && b.name === 'proton') ||
                            // Add proton-proton nuclear binding (for helium nuclei)
                            (a.name === 'proton' && b.name === 'proton' && d < settings.bindingDistance * 1.2)) {
                            
                            // Enhanced nuclear force for closer distances
                            const distFactor = d < settings.bindingDistance ? 1.3 : 1.0;
                            
                            // Apply stronger attractive force at short range with proton-neutron modifier
                            const expT = Math.exp(-nuclearYukawaMu * d);
                            
                            let Fat, Frep;
                            
                            if ((a.name === 'proton' && b.name === 'neutron') ||
                                (a.name === 'neutron' && b.name === 'proton')) {
                                // Apply proton-neutron attraction factor
                                Fat = nuclearYukawaStrength * expT * (nuclearYukawaMu * d + 1) / 
                                      (d * d) * distFactor * protonNeutronAttractionFactor;
                                Frep = 10 * nuclearRepulsionA / Math.pow(d, 13);  // Lower repulsion for p-n
                            } else if (a.name === 'proton' && b.name === 'proton') {
                                // Apply proton-proton attraction factor at close range and repulsion factor
                                Fat = nuclearYukawaStrength * expT * (nuclearYukawaMu * d + 1) / 
                                      (d * d) * distFactor;
                                Frep = 15 * nuclearRepulsionA * protonProtonRepulsionFactor / Math.pow(d, 13); // Higher repulsion for p-p
                            }
                            
                            const Fn = Fat - Frep;
                            
                            fx += Fn * ux; 
                            fy += Fn * uy; 
                            fz += Fn * uz;
                            
                            // Spring + damping if bound
                            if (a.boundTo === b) {
                                // Calculate ideal binding distance (nuclear radius)
                                const idealDist = settings.bindingDistance;
                                
                                // Strengthen the spring when particles get too far apart
                                const distanceFactor = d > idealDist * 1.5 ? 4.0 : // Increased from 3.0 to 4.0
                                                       d < idealDist * 0.7 ? 0.5 : // Reduced force when too close
                                                       1.5; // Slightly stronger at normal range (increased from 1.0)
                                
                                // Spring force to maintain orbital distance
                                const sp = -bindingSpringK * (d - idealDist) * distanceFactor;
                                fx += sp * ux; 
                                fy += sp * uy; 
                                fz += sp * uz;
                                
                                // Improved orbital dynamics for bound particles
                                // Calculate radial velocity component
                                const radialVel = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy + (a.vz - b.vz) * uz;
                                
                                // Apply stronger damping to radial velocity to maintain orbit
                                const Fd = -70 * radialVel; // Increased from -50 to -70
                                fx += Fd * ux; 
                                fy += Fd * uy; 
                                fz += Fd * uz;
                                
                                // Angular velocity stabilization (helps maintain orbital velocity)
                                // First calculate tangential velocity
                                const tvx = (a.vx - b.vx) - radialVel * ux;
                                const tvy = (a.vy - b.vy) - radialVel * uy;
                                const tvz = (a.vz - b.vz) - radialVel * uz;
                                const tangentialSpeed = Math.sqrt(tvx*tvx + tvy*tvy + tvz*tvz);
                                
                                // Target orbital speed based on nuclear binding energy
                                const targetSpeed = Math.sqrt(bindingSpringK / a.mass) * 0.5;
                                
                                // If orbital speed is too different from target, apply correction
                                if (Math.abs(tangentialSpeed - targetSpeed) > 0.3 * targetSpeed) {
                                    // Normalize tangential velocity
                                    const tnorm = tangentialSpeed > 0.001 ? 
                                        { x: tvx/tangentialSpeed, y: tvy/tangentialSpeed, z: tvz/tangentialSpeed } : 
                                        { x: 0, y: 0, z: 0 };
                                        
                                    // Calculate speed correction
                                    const speedCorrection = 0.1 * (targetSpeed - tangentialSpeed);
                                    
                                    // Apply orbital velocity correction
                                    fx += tnorm.x * speedCorrection;
                                    fy += tnorm.y * speedCorrection;
                                    fz += tnorm.z * speedCorrection;
                                }
                                  // Shared nucleus attraction (for particles in the same nucleus)
                                if (a.nucleusId !== undefined && b.nucleusId !== undefined && 
                                    a.nucleusId === b.nucleusId) {
                                    // Apply an enhanced cohesive force to keep the nucleus together
                                    const nucleusCohesion = 1.0 * bindingSpringK * d; // Increased from 0.5
                                    fx -= nucleusCohesion * ux * 0.15; // Increased from 0.1
                                    fy -= nucleusCohesion * uy * 0.15;
                                    fz -= nucleusCohesion * uz * 0.15;
                                    
                                    // Additional stabilization for nuclei
                                    // Apply a damping force to relative motion between particles in same nucleus
                                    const relVelX = a.vx - b.vx;
                                    const relVelY = a.vy - b.vy;
                                    const relVelZ = a.vz - b.vz;
                                    
                                    // Calculate magnitude of relative velocity
                                    const relVelMag = Math.sqrt(relVelX*relVelX + relVelY*relVelY + relVelZ*relVelZ);
                                    
                                    // If relative speed is high, apply damping
                                    if (relVelMag > 20) {
                                        const dampingFactor = 0.2;
                                        fx -= relVelX * dampingFactor;
                                        fy -= relVelY * dampingFactor;
                                        fz -= relVelZ * dampingFactor;
                                    }
                                }
                            }
                        }                        // Pauli exclusion
                        if (a.name === b.name && a.spin === b.spin && d < exclusionRadius) {
                            // Reduce repulsion for nucleons to allow them to bind more easily,
                            // but keep it high for electrons to prevent them from occupying the same orbital
                            const repulsionFactor = (a.name === 'electron') ? 1.0 : 0.6;
                            const re = exclusionRepulsion * repulsionFactor / d2;
                            fx -= re * ux; 
                            fy -= re * uy; 
                            fz -= re * uz;
                        }
                    }
                }
            }
        }

        // Black-hole gravity
        for (const bh of blackHoles) {
            const dx = bh.x - a.x, 
                  dy = bh.y - a.y, 
                  dz = bh.z - a.z,
                  d2 = dx * dx + dy * dy + dz * dz + 1, 
                  d = Math.sqrt(d2),
                  Fg = bhGravity * (bh.mass * a.mass) / d2;
                  
            fx += Fg * (dx / d); 
            fy += Fg * (dy / d); 
            fz += Fg * (dz / d);
        }        // Central attractor gravity (if enabled)
        if (settings.centralAttractor && settings.centralAttractor.enabled) {
            const attractor = settings.centralAttractor;
            const dx = attractor.position.x - a.x, 
                  dy = attractor.position.y - a.y, 
                  dz = attractor.position.z - a.z,
                  d2 = dx * dx + dy * dy + dz * dz + 1, // Add 1 to prevent division by zero
                  d = Math.sqrt(d2),
                  Fg = attractor.strength * 1000000 * a.mass / d2; // Force proportional to particle mass
                  
            // Add force vector pointing toward central attractor
            fx += Fg * (dx / d); 
            fy += Fg * (dy / d); 
            fz += Fg * (dz / d);
        }

        // Weak decay
        if (a.name === 'neutron' && Math.random() < weakDecayRate) {
            a.name = 'proton'; 
            a.charge = 1; 
            a.color = 'red';
            a.el.style.background = 'red';
        }

        // Relativistic mass (electron)
        let massEff = a.mass;
        if (a.name === 'electron') {
            const v2 = a.vx * a.vx + a.vy * a.vy + a.vz * a.vz,
                  β2 = Math.min(v2 / (speedOfLight * speedOfLight), 0.9999),
                  gamma = 1 / Math.sqrt(1 - β2);
            massEff = a.mass * gamma;
        }

        // Integrate velocity
        a.vx += (fx / massEff) * dt;
        a.vy += (fy / massEff) * dt;
        a.vz += (fz / massEff) * dt;

        // Jitter only for electrons
        if (a.name === 'electron') {
            a.vx += (Math.random() - 0.5) * ongoingEntropy * dt;
            a.vy += (Math.random() - 0.5) * ongoingEntropy * dt;
            a.vz += (Math.random() - 0.5) * ongoingZEntropy * dt;
        }

        // Friction
        a.vx *= friction; 
        a.vy *= friction; 
        a.vz *= friction;
    }

    // Relativistic mass (electron)
    let massEff = particle.mass;
    if (particle.name === 'electron') {
        const v2 = particle.vx * particle.vx + particle.vy * particle.vy + particle.vz * particle.vz,
              β2 = Math.min(v2 / (speedOfLight * speedOfLight), 0.9999),
              gamma = 1 / Math.sqrt(1 - β2);
        massEff = particle.mass * gamma;
    }

    // Return accelerations (force / mass)
    return {
        ax: fx / massEff,
        ay: fy / massEff,
        az: fz / massEff
    };
}

// Apply physics update to all particles using Velocity-Verlet integration
function updateParticlePhysics(particles, blackHoles, settings, WRAP_DISTANCE) {
    const {
        dt, emConst, weakDecayRate, ongoingEntropy, ongoingZEntropy, pauliExclusion
    } = settings;
    
    // Update constants in the quantum mechanics module
    updateConstants(settings);

    // Build spatial hash for efficient collision detection
    const grid = buildSpatialHash(particles, settings.cellSize);
    
    // Pre-calculate initial accelerations for all particles
    const accelerations = {};
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        accelerations[i] = calculateAcceleration(particle, particles, blackHoles, grid, settings);
    }
    
    // First half of Velocity-Verlet: v(t+dt/2) = v(t) + a(t)*dt/2
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const accel = accelerations[i];
        
        // Calculate half-step velocity
        particle.vx_half = particle.vx + accel.ax * dt * 0.5;
        particle.vy_half = particle.vy + accel.ay * dt * 0.5;
        particle.vz_half = particle.vz + accel.az * dt * 0.5;
        
        // Update positions with half-step velocity: x(t+dt) = x(t) + v(t+dt/2)*dt
        particle.x += particle.vx_half * dt;
        particle.y += particle.vy_half * dt;
        particle.z += particle.vz_half * dt;
        
        // Wrap particles around at a fixed distance from origin (0,0,0) in all three dimensions
        if (particle.x > WRAP_DISTANCE) {
            particle.x = -WRAP_DISTANCE;
        } else if (particle.x < -WRAP_DISTANCE) {
            particle.x = WRAP_DISTANCE;
        }
        
        if (particle.y > WRAP_DISTANCE) {
            particle.y = -WRAP_DISTANCE;
        } else if (particle.y < -WRAP_DISTANCE) {
            particle.y = WRAP_DISTANCE;
        }
        
        if (particle.z > WRAP_DISTANCE) {
            particle.z = -WRAP_DISTANCE;
        } else if (particle.z < -WRAP_DISTANCE) {
            particle.z = WRAP_DISTANCE;
        }
    }
    
    // Rebuild spatial hash with new positions
    const newGrid = buildSpatialHash(particles, settings.cellSize);
    
    // Second half of Velocity-Verlet: v(t+dt) = v(t+dt/2) + a(t+dt)*dt/2
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Calculate new accelerations at updated positions
        const newAccel = calculateAcceleration(particle, particles, blackHoles, newGrid, settings);
        
        // Complete velocity update 
        particle.vx = particle.vx_half + newAccel.ax * dt * 0.5;
        particle.vy = particle.vy_half + newAccel.ay * dt * 0.5;
        particle.vz = particle.vz_half + newAccel.az * dt * 0.5;
        
        // Apply quantum jitter to electrons (only applied once per timestep, not in acceleration)
        if (particle.name === 'electron') {
            particle.vx += (Math.random() - 0.5) * ongoingEntropy * dt;
            particle.vy += (Math.random() - 0.5) * ongoingEntropy * dt;
            particle.vz += (Math.random() - 0.5) * ongoingZEntropy * dt;
        }
        
        // Clean up temp variables
        delete particle.vx_half;
        delete particle.vy_half;
        delete particle.vz_half;
    }

    // Weak decay and black hole updates (these aren't affected by integration method)
    for (const particle of particles) {
        // Weak decay
        if (particle.name === 'neutron' && Math.random() < weakDecayRate) {
            particle.name = 'proton'; 
            particle.charge = 1; 
            particle.color = 'red';
            particle.el.style.background = 'red';
        }
    }
    
    // Update black holes (expire if lifetime depleted)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        blackHoles[i].life -= dt;
        if (blackHoles[i].life <= 0) {
            blackHoles.splice(i, 1);
        }
    }    // Handle electron-specific orbital maintenance for quantized orbits
    for (const a of particles) {
        // Handle electron-specific physics for better orbital mechanics
        if (a.name === 'electron' && a.orbiting) {
            const p = a.orbiting;
            
            // Apply quantum constraints to enforce Bohr model
            const quantumCorrections = applyQuantumConstraints(a, p);
            
            // Apply position correction toward nearest quantized radius
            a.x += quantumCorrections.positionCorrection.x;
            a.y += quantumCorrections.positionCorrection.y;
            a.z += quantumCorrections.positionCorrection.z;
            
            // Apply velocity correction to match quantum velocity
            a.vx += quantumCorrections.velocityCorrection.x;
            a.vy += quantumCorrections.velocityCorrection.y;
            a.vz += quantumCorrections.velocityCorrection.z;
              // Update electron's quantum properties
            a.quantumNumber = quantumCorrections.quantumNumber;
            a.quantumRadius = getQuantizedRadius(a.quantumNumber);
            
            // Visual feedback - change color based on the quantum number or state
            let shellColor;
            
            if (settings.pauliExclusion && a.quantumState) {
                // Use the color from the quantum state
                shellColor = a.shellColor || '#00ffff';
            } else {
                // This electron isn't yet orbiting - try to find a proton to orbit
                // This rarely happens now with our initialization, but kept for completeness
                let nearest = null, minD2 = Infinity;
                for (const p of particles) {
                    if (p.name !== 'proton' || p.hasElectron) {
                        continue;
                    }
                    
                    const dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z;
                    const d2 = dx*dx + dy*dy + dz*dz;
                    
                    // Increased distance threshold to capture more potential orbits
                    if (d2 < 90000 && d2 < minD2) {
                        minD2 = d2;
                        nearest = p;
                    }
                }
                
                // Adjust glow intensity based on quantum number
                const n = a.quantumState ? a.quantumState.n : (a.quantumNumber || 1);
                const glowIntensity = 8 - Math.min(n, 4);
                a.el.style.boxShadow = `0 0 ${glowIntensity}px ${shellColor}`;
            }
        }
    }

    // Apply Pauli exclusion principle if enabled
    if (pauliExclusion) {
        // Extract electrons and protons
        const electrons = particles.filter(p => p.name === 'electron');
        const protons = particles.filter(p => p.name === 'proton');
        
        // Apply quantum exclusion constraints
        applyQuantumExclusionConstraints(electrons, protons, settings);
    }

    return { particles, blackHoles };
}

// Create explosion effect centered on a particle
function createExplosion(centerParticle, particles, explosionStrength) {
    for (const p of particles) {
        const dx = p.x - centerParticle.x, 
              dy = p.y - centerParticle.y, 
              dz = p.z - centerParticle.z,
              d = Math.hypot(dx, dy, dz) + 0.1;
              
        p.vx += dx / d * explosionStrength;
        p.vy += dy / d * explosionStrength;
        p.vz += dz / d * explosionStrength;
    }
}

// Create a complex atom with multiple electron shells
function createComplexAtom(protons, neutrons, electrons, settings, pos = { x: 0, y: 0, z: 0 }) {
    // Structure to hold all particles in this atom
    const atom = {
        nucleus: [],
        electronShells: [],
        allParticles: []
    };
    
    // Get necessary particles from the pool
    const availableProtons = protons.filter(p => !p.boundTo && !p.hasElectron && !p.nucleusId);
    const availableNeutrons = neutrons.filter(n => !n.boundTo && !n.nucleusId);
    const availableElectrons = electrons.filter(e => !e.orbiting);
    
    // Determine how many particles we can create
    const nucleonCount = Math.min(availableProtons.length, availableNeutrons.length);
    
    // If we don't have enough particles, return empty
    if (nucleonCount === 0 || availableElectrons.length === 0) {
        return atom;
    }
    
    // Assign unique atom ID
    const atomId = Date.now() % 10000;
    
    // Define electron shell configurations (based on atomic orbitals)
    // Format: [shell distance, max electrons in shell]
    const electronShells = [
        [120, 2],   // K shell (1s): 2 electrons
        [180, 8],   // L shell (2s, 2p): 8 electrons
        [240, 8],   // M shell (partial - just show 8 for visualization)
        [300, 2]    // N shell (partial - just show 2 for visualization)
    ];
    
    // Calculate how many protons and neutrons to use
    // Random number between 1 and min(nucleonCount, 10)
    const numProtons = Math.min(Math.floor(Math.random() * 10) + 1, nucleonCount, 10);
    // Usually similar number of neutrons, sometimes more for heavier elements
    const numNeutrons = Math.min(
        numProtons + Math.floor(Math.random() * 3) - 1,
        availableNeutrons.length
    );
    
    // Calculate how many electrons to use (neutral atom)
    const numElectrons = Math.min(
        numProtons, 
        availableElectrons.length, 
        20  // Cap at 20 electrons for performance
    );
    
    // Random position offset if not specified
    if (!pos.x && !pos.y && !pos.z) {
        pos = randomSphericalCoords(100, 400);
    }
    
    // 1. Create nucleus
    // First, place the central proton at the specified position
    const centralProton = availableProtons[0];
    centralProton.x = pos.x;
    centralProton.y = pos.y;
    centralProton.z = pos.z;
    centralProton.vx = 0;
    centralProton.vy = 0;
    centralProton.vz = 0;
    centralProton.nucleusId = atomId;
    centralProton.isAtomCore = true;
    
    atom.nucleus.push(centralProton);
    atom.allParticles.push(centralProton);
    
    // Add remaining protons around the central one
    for (let i = 1; i < numProtons; i++) {
        const proton = availableProtons[i];
        
        // Bind to the central proton
        proton.boundTo = centralProton;
        proton.nucleusId = atomId;
        
        // Use binding function to position and set velocity
        const offset = Math.random() * 10; // Random slight variation in distance
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
          // Position at close distance from center
        proton.x = centralProton.x + (settings.nuclearPotentialRange + offset) * Math.sin(phi) * Math.cos(theta);
        proton.y = centralProton.y + (settings.nuclearPotentialRange + offset) * Math.sin(phi) * Math.sin(theta);
        proton.z = centralProton.z + (settings.nuclearPotentialRange + offset) * Math.cos(phi);
        
        // Add to nucleus
        atom.nucleus.push(proton);
        atom.allParticles.push(proton);            // Calculate orbital velocity for nucleus stability
            const binding = createNucleonBinding(proton, centralProton, settings);
            proton.vx = binding.vx;
            proton.vy = binding.vy;
            proton.vz = binding.vz;
    }
    
    // Add neutrons to the nucleus
    for (let i = 0; i < numNeutrons; i++) {
        const neutron = availableNeutrons[i];
        
        // Bind to a random proton in the nucleus
        const targetProton = atom.nucleus[Math.floor(Math.random() * atom.nucleus.length)];
        neutron.boundTo = targetProton;
        neutron.nucleusId = atomId;
        
        // Use binding function to position and set velocity
        const binding = createNucleonBinding(neutron, targetProton, settings);
        
        neutron.x = binding.x;
        neutron.y = binding.y;
        neutron.z = binding.z;
        neutron.vx = binding.vx;
        neutron.vy = binding.vy;
        neutron.vz = binding.vz;
        
        // Add to nucleus
        atom.nucleus.push(neutron);
        atom.allParticles.push(neutron);
    }
    
    // 2. Add electrons in shells
    let electronIndex = 0;
    
    // Loop through each defined shell
    for (let shellIndex = 0; shellIndex < electronShells.length; shellIndex++) {
        const [shellDistance, maxElectrons] = electronShells[shellIndex];
        const shellElectrons = [];
        
        // Add electrons to this shell until full or run out
        const electronsInShell = Math.min(
            maxElectrons,
            numElectrons - electronIndex
        );
        
        if (electronsInShell <= 0) {
            break;
        }
        
        // For each electron in this shell
        for (let i = 0; i < electronsInShell; i++) {
            if (electronIndex >= availableElectrons.length) {
                break;
            }
            
            const electron = availableElectrons[electronIndex++];
            
            // Set shell-specific properties
            electron.shellIndex = shellIndex;
            electron.shellLevel = shellIndex + 1;  // 1-based shell numbering (K=1, L=2, etc.)
            electron.atomId = atomId;
            
            // Calculate position on sphere (evenly distributed)
            // Golden spiral distribution for evenly spaced points on a sphere
            const phi = Math.acos(1 - 2 * (i + 0.5) / electronsInShell);
            const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
              // Use the quantum shell number as the principal quantum number
            const n = shellIndex + 1;
            
            // Create a quantized orbit based on Bohr model
            const orbit = createElectronOrbit(electron, centralProton, settings, n);
            
            // Apply orbital velocities
            electron.vx = orbit.vx;
            electron.vy = orbit.vy;
            electron.vz = orbit.vz;
            
            // Store quantum properties
            electron.quantumNumber = n;
            electron.quantumRadius = getQuantizedRadius(n);
            
            // Mark electron as orbiting in this atom
            electron.orbiting = centralProton;
            
            // Visual differentiation by shell
            // Use different colors for different shells
            const shellColors = ['deepskyblue', '#40a0ff', '#80c0ff', '#a0d0ff'];
            electron.orbitColor = shellColors[shellIndex] || 'white';
            electron.el.style.background = electron.orbitColor;
            
            // Add glow intensity based on shell
            const glowIntensity = 10 - shellIndex * 2;
            electron.el.style.boxShadow = `0 0 ${glowIntensity}px ${electron.orbitColor}`;
            
            // Track electrons by shell
            shellElectrons.push(electron);
            atom.allParticles.push(electron);
        }
        
        // Add this shell to the atom structure
        atom.electronShells.push(shellElectrons);
    }
    
    return atom;
}

// Export functions
export {
    dot,
    cross,
    length,
    normalize,
    buildSpatialHash,
    randomSphericalCoords,
    randomVelocityVector,
    createElectronOrbit,
    createNucleonBinding,
    updateParticlePhysics,
    createExplosion,
    createComplexAtom,
    computePotential,
    computeForcePair
};