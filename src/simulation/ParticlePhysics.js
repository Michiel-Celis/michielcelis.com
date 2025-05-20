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

// Create particle-proton binding
function createElectronOrbit(electron, proton, settings) {
    // Calculate radial vector from proton to electron
    const rx = electron.x - proton.x,
          ry = electron.y - proton.y,
          rz = electron.z - proton.z;
    
    const dist = Math.hypot(rx, ry, rz) + 0.1;
    
    // Normalize the radial vector
    const rNorm = { 
        x: rx / dist,
        y: ry / dist,
        z: rz / dist
    };
    
    // Generate a random perpendicular axis for the orbital plane
    // First create a random vector not aligned with rNorm
    let wx = Math.random() * 2 - 1,
        wy = Math.random() * 2 - 1,
        wz = Math.random() * 2 - 1;
    
    const wlen = Math.hypot(wx, wy, wz) || 1;
    wx /= wlen;
    wy /= wlen;
    wz /= wlen;
    
    // Cross product to get perpendicular vector (orbital axis)
    let ux = ry * wz - rz * wy,
        uy = rz * wx - rx * wz,
        uz = rx * wy - ry * wx;
    
    const ulen = Math.hypot(ux, uy, uz) || 0.1;
    ux /= ulen;
    uy /= ulen;
    uz /= ulen;
    
    // Calculate scientifically accurate orbital velocity based on Coulomb force
    // Using v = sqrt(k*q1*q2/(m*r)) where k is Coulomb constant
    const v0 = Math.sqrt(
        settings.emConst * Math.abs(electron.charge * proton.charge) / (electron.mass * dist)
    );
    
    // Apply scaling factor - allows for easier visualization in simulation
    const v = v0 * settings.electronOrbitScale;
    
    // Calculate velocity vector perpendicular to radius to create circular orbit
    // v = ω × r where ω is perpendicular to the orbital plane
    return {
        vx: (uy * rNorm.z - uz * rNorm.y) * v,
        vy: (uz * rNorm.x - ux * rNorm.z) * v,
        vz: (ux * rNorm.y - uy * rNorm.x) * v
    };
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
        friction, bhGravity, speedOfLight,
        closeRangeAttractionFactor, electronProtonAttractionFactor, 
        protonNeutronAttractionFactor, protonProtonRepulsionFactor, 
        electronElectronRepulsionFactor
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

    // Update positions & wrap
    for (const a of particles) {
        a.x += a.vx * dt;
        a.y += a.vy * dt;
        a.z += a.vz * dt;
        
        // Wrap particles around at a fixed distance from origin (0,0,0) in all three dimensions
        if (a.x > WRAP_DISTANCE) {
            a.x = -WRAP_DISTANCE;
        } else if (a.x < -WRAP_DISTANCE) {
            a.x = WRAP_DISTANCE;
        }
        
        if (a.y > WRAP_DISTANCE) {
            a.y = -WRAP_DISTANCE;
        } else if (a.y < -WRAP_DISTANCE) {
            a.y = WRAP_DISTANCE;
        }
        
        if (a.z > WRAP_DISTANCE) {
            a.z = -WRAP_DISTANCE;
        } else if (a.z < -WRAP_DISTANCE) {
            a.z = WRAP_DISTANCE;
        }
    }
    
    // Update black holes (expire if lifetime depleted)
    for (let i = blackHoles.length - 1; i >= 0; i--) {
        blackHoles[i].life -= dt;
        if (blackHoles[i].life <= 0) {
            blackHoles.splice(i, 1);
        }
    }    // Special electron update for orbit maintenance
    for (const a of particles) {
        // Handle electron-specific physics for better orbital mechanics
        if (a.name === 'electron') {
            // If this electron is already orbiting a specific proton, maintain that relationship
            if (a.orbiting) {
                const p = a.orbiting;
                
                // Calculate distance and direction to the proton
                const dx = p.x - a.x, dy = p.y - a.y, dz = p.z - a.z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.1;
                
                // Calculate current orbital velocity
                const radialVel = (a.vx * dx + a.vy * dy + a.vz * dz) / dist;
                
                // Current tangential velocity
                const tvx = a.vx - radialVel * dx / dist;
                const tvy = a.vy - radialVel * dy / dist;
                const tvz = a.vz - radialVel * dz / dist;
                const tangentialSpeed = Math.sqrt(tvx*tvx + tvy*tvy + tvz*tvz);
                
                // Calculate optimal orbital velocity using Coulomb law (v = sqrt(k*q1*q2/mr))
                const optimalSpeed = Math.sqrt(settings.emConst * Math.abs(a.charge * p.charge) / (a.mass * dist));
                
                // Damp radial velocity (too much radial velocity breaks orbits)
                a.vx -= 0.2 * radialVel * dx / dist; // Increased damping
                a.vy -= 0.2 * radialVel * dy / dist;
                a.vz -= 0.2 * radialVel * dz / dist;
                
                // Correct tangential velocity more aggressively to maintain orbits
                if (Math.abs(tangentialSpeed - optimalSpeed) > 0.1 * optimalSpeed) {
                    // Normalize current tangential velocity
                    const tvNorm = tangentialSpeed > 0 ? 
                        { x: tvx/tangentialSpeed, y: tvy/tangentialSpeed, z: tvz/tangentialSpeed } : 
                        { x: 0, y: 0, z: 0 };
                    
                    // Adjust velocity to be closer to optimal (more aggressive correction)
                    const correctionFactor = 0.3 * (optimalSpeed - tangentialSpeed);
                    a.vx += tvNorm.x * correctionFactor;
                    a.vy += tvNorm.y * correctionFactor;
                    a.vz += tvNorm.z * correctionFactor;
                }
                
                // Gently guide electron back to proper orbital distance if needed
                // Using larger orbital distance for better visualization
                const idealOrbitalRadius = 200; // Larger ideal radius
                if (Math.abs(dist - idealOrbitalRadius) > 50) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    const dirZ = dz / dist;
                    
                    // Calculate desired distance correction (gently push in or out)
                    // More significant correction for better stability
                    const distCorrection = 0.1 * (idealOrbitalRadius - dist);
                    
                    // Apply position correction
                    a.x += dirX * distCorrection;
                    a.y += dirY * distCorrection;
                    a.z += dirZ * distCorrection;
                }
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
                
                // If we found a nearby free proton, try to establish orbit
                if (nearest) {
                    // Get current distance
                    const dx = nearest.x - a.x, dy = nearest.y - a.y, dz = nearest.z - a.z;
                    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.1;
                    
                    // If we're reasonably close, establish orbit
                    if (dist < 400) { // Increased capture radius
                        // Set up orbital parameters
                        const orbit = createElectronOrbit(a, nearest, settings);
                        
                        // Apply orbital velocity with a gentle transition
                        a.vx = a.vx * 0.1 + orbit.vx * 0.9; // More weight on new velocity
                        a.vy = a.vy * 0.1 + orbit.vy * 0.9;
                        a.vz = a.vz * 0.1 + orbit.vz * 0.9;
                        
                        // Mark relationship
                        a.orbiting = nearest;
                        nearest.hasElectron = true;
                        
                        // Visual indicator
                        a.orbitColor = 'deepskyblue';
                        a.el.style.background = 'deepskyblue';
                    }
                }
            }
        }
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
    createExplosion
};