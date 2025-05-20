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
    // Position neutron at ~0.9×bindingDistance from proton
    const θ = Math.random() * 2 * Math.PI,
          φ = Math.acos(2 * Math.random() - 1),
          r = settings.bindingDistance * 0.9;
    
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
    // Use a simplified model with the strong force approximated by settings.bindingSpringK
    const orbitalVelocityMagnitude = Math.sqrt(settings.bindingSpringK / neutron.mass) * 0.5;
    
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
                        
                        // Fix for electron-electron interaction: ensure electrons strongly repel each other
                        // and cannot orbit each other due to same charge
                        if (a.name === 'electron' && b.name === 'electron') {
                            // Increase repulsion between electrons to prevent orbiting
                            const strongerRepulsion = -emConst * a.charge * b.charge * 5 / Math.max(d2, 100);
                            fx += strongerRepulsion * ux;
                            fy += strongerRepulsion * uy;
                            fz += strongerRepulsion * uz;
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
                        }                        // Nuclear Yukawa + repulsion
                        if ((a.name === 'proton' && b.name === 'neutron') ||
                            (a.name === 'neutron' && b.name === 'proton')) {
                            const expT = Math.exp(-nuclearYukawaMu * d),
                                  Fat = nuclearYukawaStrength * expT * (nuclearYukawaMu * d + 1) / (d * d),
                                  Frep = 12 * nuclearRepulsionA / Math.pow(d, 13),
                                  Fn = Fat - Frep;
                            
                            fx += Fn * ux; 
                            fy += Fn * uy; 
                            fz += Fn * uz;

                            // Spring + damping if bound
                            if (a.boundTo === b) {
                                // Calculate ideal binding distance (nuclear radius)
                                const idealDist = settings.bindingDistance;
                                
                                // Strengthen the spring when particles get too far apart
                                const distanceFactor = d > idealDist * 1.5 ? 3.0 : 1.0;
                                
                                // Spring force to maintain orbital distance
                                const sp = -bindingSpringK * (d - idealDist) * distanceFactor;
                                fx += sp * ux; 
                                fy += sp * uy; 
                                fz += sp * uz;
                                
                                // Improved orbital dynamics for bound particles
                                // Calculate radial velocity component
                                const radialVel = (a.vx - b.vx) * ux + (a.vy - b.vy) * uy + (a.vz - b.vz) * uz;
                                
                                // Apply stronger damping to radial velocity to maintain orbit
                                const Fd = -50 * radialVel;
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
                                    // Apply an additional cohesive force to keep the nucleus together
                                    const nucleusCohesion = 0.5 * bindingSpringK * d;
                                    fx -= nucleusCohesion * ux * 0.1;
                                    fy -= nucleusCohesion * uy * 0.1;
                                    fz -= nucleusCohesion * uz * 0.1;
                                }
                            }
                        }

                        // Pauli exclusion
                        if (a.name === b.name && a.spin === b.spin && d < exclusionRadius) {
                            const re = exclusionRepulsion / d2;
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
                    if (p.name !== 'proton' || p.hasElectron) continue;
                    
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
        proton.x = centralProton.x + (settings.bindingDistance + offset) * Math.sin(phi) * Math.cos(theta);
        proton.y = centralProton.y + (settings.bindingDistance + offset) * Math.sin(phi) * Math.sin(theta);
        proton.z = centralProton.z + (settings.bindingDistance + offset) * Math.cos(phi);
        
        // Add to nucleus
        atom.nucleus.push(proton);
        atom.allParticles.push(proton);
        
        // Calculate orbital velocity for nucleus stability
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
            
            // Position electron at shell radius from nucleus
            electron.x = centralProton.x + shellDistance * Math.sin(phi) * Math.cos(theta);
            electron.y = centralProton.y + shellDistance * Math.sin(phi) * Math.sin(theta);
            electron.z = centralProton.z + shellDistance * Math.cos(phi);
            
            // Create orbital velocity relative to nucleus
            const orbit = createElectronOrbit(electron, centralProton, settings);
            
            // Apply orbital velocity (scaled by shell number for different speeds)
            const shellSpeedFactor = 1 / Math.sqrt(shellIndex + 1); // Outer shells are slower
            electron.vx = orbit.vx * shellSpeedFactor;
            electron.vy = orbit.vy * shellSpeedFactor;
            electron.vz = orbit.vz * shellSpeedFactor;
            
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
    createComplexAtom
};