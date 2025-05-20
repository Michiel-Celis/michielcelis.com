// === PARTICLE PHYSICS ENGINE ===
// This module handles all particle physics calculations and interactions

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
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2; // Random horizontal angle
    const phi = Math.acos(2 * Math.random() - 1); // Random vertical angle (ensures uniform distribution)
    
    return {
        radius,
        theta,
        phi,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi)
    };
}

// Generate random velocity vector (for initial particle motion)
function randomVelocityVector(magnitude) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    return {
        x: magnitude * Math.sin(phi) * Math.cos(theta),
        y: magnitude * Math.sin(phi) * Math.sin(theta),
        z: magnitude * Math.cos(phi)
    };
}

// Function to set up electron-proton orbital binding
function createElectronOrbit(electron, proton, settings) {
    // Calculate vector from proton to electron
    const rx = electron.x - proton.x;
    const ry = electron.y - proton.y;
    const rz = electron.z - proton.z;
    
    // Get distance
    const r = Math.sqrt(rx*rx + ry*ry + rz*rz);
    
    // Normalize to unit vector
    const ux = rx / r;
    const uy = ry / r;
    const uz = rz / r;
    
    // Create a random orbital plane by finding a perpendicular vector to r
    // Start with a random vector that's unlikely to be aligned with (ux,uy,uz)
    let vx = Math.random() - 0.5;
    let vy = Math.random() - 0.5;
    let vz = Math.random() - 0.5;
    
    // Take cross product to get perpendicular vector
    const wx = uy * vz - uz * vy;
    const wy = uz * vx - ux * vz;
    const wz = ux * vy - uy * vx;
    
    // Normalize
    const w = Math.sqrt(wx*wx + wy*wy + wz*wz) || 1;
    const nwx = wx / w;
    const nwy = wy / w;
    const nwz = wz / w;
    
    // Calculate orbital velocity
    // v = sqrt(k*e²/m*r) * scale factor, where k is the Coulomb constant, e is charge
    const v = Math.sqrt(settings.emConst * Math.abs(electron.charge * proton.charge) / (electron.mass * r)) * 
              settings.electronOrbitScale;
    
    // Return orbital velocity vector perpendicular to the radius vector
    return {
        vx: v * nwx,
        vy: v * nwy,
        vz: v * nwz
    };
}

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
    
    // Calculate orbital velocity
    // Create a random orbital plane for the nucleons by finding a perpendicular vector
    
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

// Apply physics update to all particles
function updateParticlePhysics(particles, blackHoles, settings, WRAP_DISTANCE) {
    const {
        dt, emConst, exclusionRadius, exclusionRepulsion,
        bindingSpringK, nuclearYukawaStrength, nuclearYukawaMu, nuclearRepulsionA,
        weakDecayRate, ongoingEntropy, ongoingZEntropy,
        friction, bhGravity, speedOfLight
    } = settings;

    // Build spatial hash for efficient collision detection
    const grid = buildSpatialHash(particles, settings.cellSize);

    // --- Physics pass ---
    for (const a of particles) {
        let fx = 0, fy = 0, fz = 0;
        const cx = Math.floor(a.x / settings.cellSize),
              cy = Math.floor(a.y / settings.cellSize),
              cz = Math.floor(a.z / settings.cellSize);

        // pairwise forces
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                for (let oz = -1; oz <= 1; oz++) {
                    const cell = grid.get(`${cx + ox},${cy + oy},${cz + oz}`);
                    if (!cell) continue;
                    
                    for (const b of cell) {
                        if (b === a) continue;
                        
                        const dx = b.x - a.x, 
                              dy = b.y - a.y, 
                              dz = b.z - a.z,
                              d2 = dx * dx + dy * dy + dz * dz;
                              
                        if (d2 > 30000) continue;
                        
                        const d = Math.sqrt(d2) + 0.1,
                              ux = dx / d, 
                              uy = dy / d, 
                              uz = dz / d;

                        // Coulomb force
                        const fe = -emConst * a.charge * b.charge / Math.max(d2, 100);
                        
                        // Special handling for electron-electron interaction: ensure electrons strongly repel each other
                        // and cannot orbit each other due to same charge
                        if (a.name === 'electron' && b.name === 'electron') {
                            // Increase repulsion between electrons to prevent orbiting, apply electronRepulsionFactor
                            const strongerRepulsion = -emConst * a.charge * b.charge * 5 * settings.electronRepulsionFactor / Math.max(d2, 100);
                            fx += strongerRepulsion * ux;
                            fy += strongerRepulsion * uy;
                            fz += strongerRepulsion * uz;
                        } else if ((a.name === 'electron' && b.name === 'proton') || 
                                   (a.name === 'proton' && b.name === 'electron')) {
                            // Apply electrostaticForceFactor for proton-electron interactions
                            const adjustedFe = fe * settings.electrostaticForceFactor;
                            fx += adjustedFe * ux; 
                            fy += adjustedFe * uy; 
                            fz += adjustedFe * uz;
                        } else if (a.name === 'proton' && b.name === 'proton') {
                            // Apply protonRepulsionFactor for proton-proton repulsion
                            const adjustedFe = fe * settings.protonRepulsionFactor;
                            fx += adjustedFe * ux; 
                            fy += adjustedFe * uy; 
                            fz += adjustedFe * uz;
                        } else {
                            // Normal Coulomb force for other interactions
                            fx += fe * ux; 
                            fy += fe * uy; 
                            fz += fe * uz;
                        }

                        // Special handling for electron-proton pairs
                        if ((a.name === 'electron' && b.name === 'proton') ||
                            (a.name === 'proton' && b.name === 'electron')) {
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
                        }
                        
                        // Nuclear Yukawa + repulsion
                        if ((a.name === 'proton' && b.name === 'neutron') ||
                            (a.name === 'neutron' && b.name === 'proton') ||
                            // Add proton-proton nuclear binding (for helium nuclei)
                            (a.name === 'proton' && b.name === 'proton' && d < settings.bindingDistance * 1.2)) {
                            
                            // Enhanced nuclear force for closer distances
                            const distFactor = d < settings.bindingDistance ? 
                                              1.3 * settings.closeRangeAttractionFactor : 
                                              1.0;
                            
                            // Apply stronger attractive force at short range
                            const expT = Math.exp(-nuclearYukawaMu * d),
                                  // Apply nuclear force factor
                                  // Stronger attraction with distance factor
                                  Fat = nuclearYukawaStrength * expT * (nuclearYukawaMu * d + 1) / (d * d) * 
                                        distFactor * settings.nuclearForceFactor,
                                  
                                  // Less repulsion to make binding easier
                                  Frep = (a.name === 'proton' && b.name === 'proton') ? 
                                         15 * nuclearRepulsionA / Math.pow(d, 13) * settings.protonRepulsionFactor : // Higher repulsion for p-p 
                                         10 * nuclearRepulsionA / Math.pow(d, 13), // Lower repulsion for p-n
                                         
                                  Fn = Fat - Frep;
                            
                            fx += Fn * ux; 
                            fy += Fn * uy; 
                            fz += Fn * uz;

                            // Spring + damping if bound
                            if (a.boundTo === b) {
                                // Calculate ideal binding distance (nuclear radius)
                                const idealDist = settings.bindingDistance;
                                
                                // Strengthen the spring when particles get too far apart
                                // Apply closeRangeAttractionFactor to the binding
                                const distanceFactor = d > idealDist * 1.5 ? 
                                                       4.0 * settings.closeRangeAttractionFactor : // For far particles
                                                       d < idealDist * 0.7 ? 
                                                       0.5 * settings.closeRangeAttractionFactor : // For close particles
                                                       1.5 * settings.closeRangeAttractionFactor; // Normal range
                                
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
                        }

                        // Pauli exclusion
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
        }
        
        // Central attractor gravity (if enabled)
        if (settings.centralAttractor && settings.centralAttractor.enabled) {
            const attractor = settings.centralAttractor;
            const dx = attractor.position.x - a.x, 
                  dy = attractor.position.y - a.y, 
                  dz = attractor.position.z - a.z,
                  d2 = dx * dx + dy * dy + dz * dz + 1, // Add 1 to prevent division by zero
                  d = Math.sqrt(d2),
                  Fg = attractor.strength * a.mass / d2; // Force proportional to particle mass
                  
            // Add force vector pointing toward central attractor
            fx += Fg * (dx / d); 
            fy += Fg * (dy / d); 
            fz += Fg * (dz / d);
        }

        // Apply force to get acceleration (F = ma → a = F/m)
        const ax = fx / a.mass;
        const ay = fy / a.mass;
        const az = fz / a.mass;

        // Apply acceleration to update velocity (v += a * dt)
        a.vx += ax * dt; 
        a.vy += ay * dt; 
        a.vz += az * dt;

        // Add a bit of ongoing randomness to prevent perfect orbits and make the system more chaotic/interesting
        a.vx += (Math.random() - 0.5) * ongoingEntropy;
        a.vy += (Math.random() - 0.5) * ongoingEntropy;
        a.vz += (Math.random() - 0.5) * ongoingZEntropy;

        // Apply friction as a damping factor to velocity
        a.vx *= friction;
        a.vy *= friction;
        a.vz *= friction;
    
        // Apply velocity to update position (p += v * dt)
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.z += a.vz * dt;

        // Wrap particles around the edges of the world (toroidal wrapping)
        if (a.x > WRAP_DISTANCE) a.x -= 2 * WRAP_DISTANCE;
        if (a.y > WRAP_DISTANCE) a.y -= 2 * WRAP_DISTANCE;
        if (a.z > WRAP_DISTANCE) a.z -= 2 * WRAP_DISTANCE;
        if (a.x < -WRAP_DISTANCE) a.x += 2 * WRAP_DISTANCE;
        if (a.y < -WRAP_DISTANCE) a.y += 2 * WRAP_DISTANCE;
        if (a.z < -WRAP_DISTANCE) a.z += 2 * WRAP_DISTANCE;
    }

    // --- Post-update pass ---
    // Update black holes
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        blackHoles[i].life -= dt;
        if (blackHoles[i].life <= 0) {
            blackHoles.splice(i, 1);
        }
    }
}

// Function to create an explosion centered on a particle
function createExplosion(center, particles, strength) {
    for (const p of particles) {
        if (p === center) continue;
        
        // Calculate distance from center
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        const dz = p.z - center.z;
        const d2 = dx*dx + dy*dy + dz*dz;
        
        // Explosion force falls off with square of distance
        if (d2 > 90000) continue; // Skip particles too far away
        
        const d = Math.sqrt(d2) || 0.1; // Avoid division by zero
        
        // Calculate unit vector pointing away from explosion center
        const ux = dx / d;
        const uy = dy / d;
        const uz = dz / d;
        
        // Force is proportional to 1/d²
        const force = strength / d2;
        
        // Apply force as instant velocity change
        p.vx += force * ux;
        p.vy += force * uy;
        p.vz += force * uz;
    }
}

// Export all the physics functions
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
    createExplosion
};
