// === RIGID BODY DYNAMICS ENGINE ===
// This module handles rigid body cluster dynamics and the Dzhanibekov effect

// Import useful vector operations from the physics engine
import { dot, cross, length, normalize } from './ParticlePhysics.js';

/**
 * Represents a cluster of particles that behave as a rigid body
 */
class RigidBodyCluster {
    /**
     * Creates a new rigid body cluster
     * @param {Array} particles - Array of particles in the cluster
     * @param {number} id - Unique identifier for the cluster
     */
    constructor(particles, id) {
        this.id = id;
        this.particles = particles;
        this.size = particles.length;
        
        // Mark all particles as belonging to this cluster
        for (const particle of particles) {
            particle.clusterId = id;
            particle.inCluster = true;
        }
        
        // Calculate center of mass and total mass
        this.updateCenterOfMass();
        
        // Calculate initial inertia tensor
        this.updateInertiaTensor();
        
        // Initialize quaternion for rotation (w, x, y, z) format
        // w is the scalar part, (x,y,z) the vector part
        this.quaternion = { w: 1, x: 0, y: 0, z: 0 };
        
        // Initialize angular momentum
        this.angularMomentum = { x: 0, y: 0, z: 0 };
        
        // Initialize angular velocity
        this.angularVelocity = { x: 0, y: 0, z: 0 };
        
        // Initial centroid position in body-space coordinates
        this.calculateBodySpacePositions();
          // Physics properties for Dzhanibekov effect tracking
        this.flipCount = 0;
        this.lastFlipTime = 0;
        this.lastRotationAxis = { x: 0, y: 0, z: 0 };
    }
      // Physics-only implementation with no visual markers
    
    /**
     * Updates the center of mass and total mass of the cluster
     */
    updateCenterOfMass() {
        this.totalMass = 0;
        const com = { x: 0, y: 0, z: 0 };
        
        for (const particle of this.particles) {
            this.totalMass += particle.mass;
            com.x += particle.x * particle.mass;
            com.y += particle.y * particle.mass;
            com.z += particle.z * particle.mass;
        }
        
        this.centerOfMass = {
            x: com.x / this.totalMass,
            y: com.y / this.totalMass,
            z: com.z / this.totalMass
        };
    }
    
    /**
     * Calculates body-space coordinates for all particles
     * These are fixed in the body frame and don't change as the body rotates
     */
    calculateBodySpacePositions() {
        this.bodyPositions = [];
        
        for (const particle of this.particles) {
            // Position relative to center of mass
            this.bodyPositions.push({
                x: particle.x - this.centerOfMass.x,
                y: particle.y - this.centerOfMass.y,
                z: particle.z - this.centerOfMass.z
            });
        }
    }
    
    /**
     * Updates the inertia tensor of the cluster
     */
    updateInertiaTensor() {
        // Initialize inertia tensor elements
        this.inertiaTensor = {
            Ixx: 0, Iyy: 0, Izz: 0,
            Ixy: 0, Ixz: 0, Iyz: 0
        };
        
        // Compute inertia tensor elements
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const m = p.mass;
            
            // Position relative to center of mass
            const x = p.x - this.centerOfMass.x;
            const y = p.y - this.centerOfMass.y;
            const z = p.z - this.centerOfMass.z;
            
            // Diagonal elements (moments of inertia)
            this.inertiaTensor.Ixx += m * (y*y + z*z);
            this.inertiaTensor.Iyy += m * (x*x + z*z);
            this.inertiaTensor.Izz += m * (x*x + y*y);
            
            // Off-diagonal elements (products of inertia)
            this.inertiaTensor.Ixy -= m * x * y;
            this.inertiaTensor.Ixz -= m * x * z;
            this.inertiaTensor.Iyz -= m * y * z;
        }
        
        // Compute principal moments of inertia and principal axes
        this.computePrincipalMomentsAndAxes();
    }
    
    /**
     * Computes principal moments of inertia and principal axes
     * This is a simplified approach - for a proper implementation,
     * we would need to solve for eigenvalues and eigenvectors
     */
    computePrincipalMomentsAndAxes() {
        // For simplicity, we'll do a rough approximation of the principal axes
        // In a real implementation, this would be done by finding eigenvectors
        
        // First principal axis - approximating the longest dimension of the cluster
        let maxDist = 0;
        let axis1 = { x: 1, y: 0, z: 0 };
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const pi = this.particles[i];
                const pj = this.particles[j];
                
                const dx = pj.x - pi.x;
                const dy = pj.y - pi.y;
                const dz = pj.z - pi.z;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (dist > maxDist) {
                    maxDist = dist;
                    const mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
                    axis1 = { 
                        x: dx / mag, 
                        y: dy / mag, 
                        z: dz / mag 
                    };
                }
            }
        }
        
        // Second principal axis - orthogonal to first
        // Find a vector orthogonal to axis1
        let axis2;
        if (Math.abs(axis1.x) < Math.abs(axis1.y)) {
            axis2 = normalize(cross(axis1, { x: 1, y: 0, z: 0 }));
        } else {
            axis2 = normalize(cross(axis1, { x: 0, y: 1, z: 0 }));
        }
        
        // Third principal axis - cross product of first two
        const axis3 = normalize(cross(axis1, axis2));
        
        // Store principal axes
        this.principalAxes = [axis1, axis2, axis3];
        
        // Calculate approximate principal moments
        // These are rough approximations for demonstration purposes
        this.principalMoments = [
            this.inertiaTensor.Ixx,  // Using diagonal elements as approximation
            this.inertiaTensor.Iyy,
            this.inertiaTensor.Izz
        ];
        
        // Sort moments and axes to ensure we have I1 ≤ I2 ≤ I3
        // This ordering is important for the Dzhanibekov effect
        this.sortPrincipalMomentsAndAxes();
    }
    
    /**
     * Sorts principal moments in ascending order and reorders axes accordingly
     */
    sortPrincipalMomentsAndAxes() {
        // Create indices array
        const indices = [0, 1, 2];
        
        // Sort indices based on moments
        indices.sort((a, b) => this.principalMoments[a] - this.principalMoments[b]);
        
        // Create new sorted arrays
        const sortedMoments = indices.map(i => this.principalMoments[i]);
        const sortedAxes = indices.map(i => this.principalAxes[i]);
        
        this.principalMoments = sortedMoments;
        this.principalAxes = sortedAxes;
    }
    
    /**
     * Initialize random angular momentum to demonstrate the Dzhanibekov effect
     * We'll set it primarily along the intermediate principal axis
     */
    initializeDzhanibekovRotation() {
        // Set angular momentum primarily along the intermediate axis (index 1)
        // with small components along the other axes
        this.angularMomentum = {
            x: this.principalAxes[1].x * 10 + (Math.random() - 0.5) * 2,
            y: this.principalAxes[1].y * 10 + (Math.random() - 0.5) * 2, 
            z: this.principalAxes[1].z * 10 + (Math.random() - 0.5) * 2
        };
        
        // Calculate initial angular velocity from angular momentum
        this.updateAngularVelocity();
    }
    
    /**
     * Update angular velocity from angular momentum and inertia tensor
     * This is a simplified version - a full implementation would 
     * properly transform between principal and body axes
     */
    updateAngularVelocity() {
        // For demonstration, using a simplified approach
        // In a proper implementation, we would convert angular momentum
        // to the principal axis frame, divide by principal moments,
        // and convert back to the body frame
        
        // Project angular momentum onto principal axes
        const projections = this.principalAxes.map(axis => 
            dot(this.angularMomentum, axis)
        );
        
        // Convert to angular velocity components by dividing by moments
        const velComponents = projections.map((proj, i) => 
            proj / this.principalMoments[i]
        );
        
        // Convert back to world coordinates
        this.angularVelocity = {
            x: 0, y: 0, z: 0
        };
        
        for (let i = 0; i < 3; i++) {
            this.angularVelocity.x += velComponents[i] * this.principalAxes[i].x;
            this.angularVelocity.y += velComponents[i] * this.principalAxes[i].y;
            this.angularVelocity.z += velComponents[i] * this.principalAxes[i].z;
        }
    }
    
    /**
     * Normalize a quaternion to prevent numerical drift
     * @param {Object} q - Quaternion to normalize
     * @returns {Object} - Normalized quaternion
     */
    normalizeQuaternion(q) {
        const magnitude = Math.sqrt(q.w*q.w + q.x*q.x + q.y*q.y + q.z*q.z);
        return {
            w: q.w / magnitude,
            x: q.x / magnitude,
            y: q.y / magnitude,
            z: q.z / magnitude
        };
    }
    
    /**
     * Multiply two quaternions
     * @param {Object} q1 - First quaternion
     * @param {Object} q2 - Second quaternion
     * @returns {Object} - Result of multiplication
     */
    multiplyQuaternions(q1, q2) {
        return {
            w: q1.w*q2.w - q1.x*q2.x - q1.y*q2.y - q1.z*q2.z,
            x: q1.w*q2.x + q1.x*q2.w + q1.y*q2.z - q1.z*q2.y,
            y: q1.w*q2.y - q1.x*q2.z + q1.y*q2.w + q1.z*q2.x,
            z: q1.w*q2.z + q1.x*q2.y - q1.y*q2.x + q1.z*q2.w
        };
    }
    
    /**
     * Rotate a vector by a quaternion
     * @param {Object} v - Vector to rotate
     * @param {Object} q - Quaternion
     * @returns {Object} - Rotated vector
     */
    rotateVectorByQuaternion(v, q) {
        // Create a quaternion from the vector
        const vQ = { w: 0, x: v.x, y: v.y, z: v.z };
        
        // q * v * q^-1
        const qInverse = { w: q.w, x: -q.x, y: -q.y, z: -q.z };
        const qv = this.multiplyQuaternions(q, vQ);
        const qvq = this.multiplyQuaternions(qv, qInverse);
        
        return { x: qvq.x, y: qvq.y, z: qvq.z };
    }
    
    /**
     * Update the rigid body state using Euler's equations of rigid body motion
     * @param {number} dt - Time step
     */
    update(dt) {
        // Step 1: Update angular velocity from angular momentum
        this.updateAngularVelocity();
        
        // Step 2: Update quaternion based on angular velocity
        // q' = 0.5 * q * (0, ω)
        const rotationQuaternion = {
            w: 0,
            x: this.angularVelocity.x,
            y: this.angularVelocity.y,
            z: this.angularVelocity.z
        };
        
        const qDot = this.multiplyQuaternions(this.quaternion, rotationQuaternion);
        
        this.quaternion.w += 0.5 * qDot.w * dt;
        this.quaternion.x += 0.5 * qDot.x * dt;
        this.quaternion.y += 0.5 * qDot.y * dt;
        this.quaternion.z += 0.5 * qDot.z * dt;
        
        // Normalize quaternion to prevent drift
        this.quaternion = this.normalizeQuaternion(this.quaternion);
        
        // Step 3: Update position of all particles in the cluster
        this.updateParticlePositions();
        
        // Step 4: Update center of mass based on linear momentum
        this.updateCenterOfMass();
        
        // Step 5: Detect Dzhanibekov effect (flipping)
        this.detectFlip();
    }
    
    /**
     * Update positions of all particles in the cluster based on rigid body motion
     */
    updateParticlePositions() {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const bodyPos = this.bodyPositions[i];
            
            // Rotate body-space position by current orientation quaternion
            const rotatedPos = this.rotateVectorByQuaternion(bodyPos, this.quaternion);
            
            // Update particle position in world space
            p.x = this.centerOfMass.x + rotatedPos.x;
            p.y = this.centerOfMass.y + rotatedPos.y;
            p.z = this.centerOfMass.z + rotatedPos.z;
            
            // The velocity is handled by the rigid body, override particle's velocity
            // to prevent the physics engine from moving it separately
            const r = rotatedPos;
            const w = this.angularVelocity;
            
            // v = ω × r (cross product)
            p.vx = w.y * r.z - w.z * r.y;
            p.vy = w.z * r.x - w.x * r.z;
            p.vz = w.x * r.y - w.y * r.x;
        }
    }
      /**
     * Detect flips characteristic of the Dzhanibekov effect
     */
    detectFlip() {
        // Get the current rotation axis
        const currentAxis = normalize(this.angularVelocity);
        
        // If this is the first check, initialize lastRotationAxis
        if (this.lastRotationAxis.x === 0 && 
            this.lastRotationAxis.y === 0 && 
            this.lastRotationAxis.z === 0) {
            this.lastRotationAxis = { ...currentAxis };
            return;
        }
        
        // Calculate the dot product to detect axis flips
        const dotProduct = dot(this.lastRotationAxis, currentAxis);
        
        // If the axis has flipped significantly
        if (dotProduct < -0.7) {
            this.flipCount++;
            const now = Date.now();
            
            // Only count as a flip if it's been at least 500ms since the last one
            // This prevents counting multiple flips for the same event
            if (now - this.lastFlipTime > 500) {
                console.log(`Dzhanibekov flip detected! (${this.flipCount} total)`);
                this.lastFlipTime = now;
            }
        }
        
        // Update last rotation axis
        this.lastRotationAxis = { ...currentAxis };
    }
      // Physics-only implementation, no visual feedback methods
      // No visual marker updates needed in physics-only implementation
      // No visual markers to remove in physics-only implementation
}

/**
 * Detect clusters of 3 or more nucleons (protons and neutrons)
 * @param {Array} particles - Array of all particles
 * @param {number} clusterThreshold - Distance threshold for clustering
 * @returns {Array} - Array of detected clusters
 */
function detectNucleonClusters(particles, clusterThreshold) {
    const nucleons = particles.filter(p => 
        (p.name === 'proton' || p.name === 'neutron') && !p.inCluster
    );
    
    const clusters = [];
    const visited = new Set();
    let clusterId = 0;
    
    // Find clusters using depth-first search
    for (const nucleon of nucleons) {
        if (visited.has(nucleon)) continue;
        
        // Start a new cluster
        const cluster = dfsCluster(nucleon, nucleons, visited, clusterThreshold);
        
        // Only create clusters with 3 or more particles
        if (cluster.length >= 3) {
            clusters.push(new RigidBodyCluster(cluster, clusterId++));
        }
    }
    
    return clusters;
}

/**
 * Perform depth-first search to find connected particles
 * @param {Object} start - Starting particle
 * @param {Array} nucleons - Array of all nucleons
 * @param {Set} visited - Set of visited particles
 * @param {number} threshold - Distance threshold for clustering
 * @returns {Array} - Array of particles in the cluster
 */
function dfsCluster(start, nucleons, visited, threshold) {
    const cluster = [start];
    visited.add(start);
    const stack = [start];
    
    while (stack.length > 0) {
        const current = stack.pop();
        
        for (const nucleon of nucleons) {
            if (visited.has(nucleon)) continue;
            
            const dx = nucleon.x - current.x;
            const dy = nucleon.y - current.y;
            const dz = nucleon.z - current.z;
            const distSq = dx*dx + dy*dy + dz*dz;
            
            // If within threshold distance, add to cluster
            if (distSq <= threshold*threshold) {
                visited.add(nucleon);
                cluster.push(nucleon);
                stack.push(nucleon);
            }
        }
    }
    
    return cluster;
}

/**
 * Check for triplets of nucleons and electrons (n-p-e)
 * @param {Array} particles - Array of all particles
 * @param {number} threshold - Distance threshold for clustering
 * @returns {Array} - Array of detected triplet clusters
 */
function detectNPETriplets(particles, threshold) {
    const clusters = [];
    let clusterId = 1000; // Start with a different range than nucleon clusters
    
    // Find protons that have both a bound neutron and an electron
    const protons = particles.filter(p => 
        p.name === 'proton' && !p.inCluster
    );
    
    for (const proton of protons) {
        // Find neutrons close to this proton
        const nearbyNeutrons = particles.filter(p => 
            p.name === 'neutron' && !p.inCluster &&
            distanceSquared(p, proton) <= threshold*threshold
        );
        
        // Find electrons orbiting this proton
        const nearbyElectrons = particles.filter(p =>
            p.name === 'electron' && p.orbiting === proton
        );
        
        // For each neutron-electron pair, create a triplet
        for (const neutron of nearbyNeutrons) {
            for (const electron of nearbyElectrons) {
                const triplet = [proton, neutron, electron];
                
                // Create a new rigid body cluster for this triplet
                clusters.push(new RigidBodyCluster(triplet, clusterId++));
                
                // We'll just use the first triplet found for simplicity
                break;
            }
            
            // Just use the first valid neutron for simplicity
            break;
        }
    }
    
    return clusters;
}

/**
 * Calculate square of distance between two particles
 * @param {Object} p1 - First particle
 * @param {Object} p2 - Second particle
 * @returns {number} - Square of distance
 */
function distanceSquared(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return dx*dx + dy*dy + dz*dz;
}

/**
 * Update all rigid body clusters
 * @param {Array} clusters - Array of rigid body clusters
 * @param {number} dt - Time step
 */
function updateRigidBodyClusters(clusters, dt) {
    for (const cluster of clusters) {
        cluster.update(dt);
    }
}

/**
 * Remove a cluster
 * @param {Array} clusters - Array of all clusters
 * @param {Object} cluster - Cluster to remove
 */
function removeCluster(clusters, cluster) {
    // Remove cluster ID from particles
    for (const particle of cluster.particles) {
        delete particle.clusterId;
        delete particle.inCluster;
    }
    
    // Remove from clusters array
    const index = clusters.indexOf(cluster);
    if (index !== -1) {
        clusters.splice(index, 1);
    }
}

export {
    RigidBodyCluster,
    detectNucleonClusters,
    detectNPETriplets,
    updateRigidBodyClusters,
    removeCluster
};
