// === QUANTUM MECHANICS MODULE ===
// This module implements quantum mechanics principles for the simulation

// Import the quantum shell module for Pauli exclusion
import {
    createQuantizedElectronOrbitWithExclusion,
    applyQuantumExclusionConstraints,
    getElectronicConfiguration,
    getElectronQuantumState
} from './QuantumShell.js';

// Get constants from simulation settings
// This will be defined when imported into the simulation context
let SIM_SETTINGS = null;

// Physical constants (scaled for simulation)
const CONSTANTS = {
    // These will be overridden with SIM_SETTINGS values if available
    hBar: 10,
    a0: 40,
    ke: 15000,
    quantumRestoringStrength: 0.05
};

/**
 * Update constants from simulation settings
 * @param {Object} settings - Simulation settings object
 */
function updateConstants(settings) {
    if (!settings) return;
    
    SIM_SETTINGS = settings;
    CONSTANTS.hBar = settings.planckConstant || CONSTANTS.hBar;
    CONSTANTS.a0 = settings.bohrRadius || CONSTANTS.a0;
    CONSTANTS.ke = settings.emConst || CONSTANTS.ke;
    CONSTANTS.quantumRestoringStrength = settings.quantumRestoringStrength || CONSTANTS.quantumRestoringStrength;
}

/**
 * Calculate the quantized orbital radius for a given quantum number
 * According to Bohr's model: r_n = n²a₀
 * 
 * @param {number} n - Principal quantum number
 * @returns {number} - Quantized orbital radius
 */
function getQuantizedRadius(n) {
    // Ensure n is valid (minimum 1)
    n = Math.max(1, n);
    
    // r_n = n²a₀, but let's scale it for better visualization
    const visualScaling = 1.5;
    return n * n * CONSTANTS.a0 * visualScaling;
}

/**
 * Calculate the quantized velocity for a given radius and charge
 * According to Bohr's model: v_n = k_e e²/(mr_n)
 * 
 * @param {number} n - Principal quantum number
 * @param {number} charge - Charge of the nucleus
 * @param {number} electronMass - Mass of the electron
 * @returns {number} - Quantized orbital velocity
 */
function getQuantizedVelocity(n, charge, electronMass) {
    const radius = getQuantizedRadius(n);
    // v_n = k_e e²/(mr_n) - using charge² to account for nucleus charge
    // Add a safety multiplier to ensure the orbit is visible
    return CONSTANTS.ke * charge * charge / (electronMass * radius) * 5;
}

/**
 * Get the nearest allowed quantum number for a given radius
 * 
 * @param {number} radius - Current orbital radius
 * @returns {number} - Nearest quantum number
 */
function getNearestQuantumNumber(radius) {
    // Solve r = n²a₀ for n
    const exactN = Math.sqrt(radius / CONSTANTS.a0);
    
    // Round to nearest integer (Bohr model allows only integer quantum numbers)
    // Enforce minimum n=1
    return Math.max(1, Math.round(exactN));
}

/**
 * Apply quantum constraints to electron orbits
 * 
 * @param {Object} electron - Electron particle
 * @param {Object} proton - Proton/nucleus the electron is orbiting
 * @returns {Object} - Updated electron velocity components
 */
function applyQuantumConstraints(electron, proton) {
    // Calculate current radius
    const dx = electron.x - proton.x;
    const dy = electron.y - proton.y;
    const dz = electron.z - proton.z;
    const currentRadius = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Safety check - if radius is very small, avoid corrections
    if (currentRadius < 1) {
        return { 
            positionCorrection: { x: 0, y: 0, z: 0 },
            velocityCorrection: { x: 0, y: 0, z: 0 },
            quantumNumber: 1
        };
    }
    
    // Find nearest allowed quantum state
    const n = getNearestQuantumNumber(currentRadius);
    const targetRadius = getQuantizedRadius(n);
    
    // Calculate unit vector from proton to electron
    const ux = dx / currentRadius;
    const uy = dy / currentRadius;
    const uz = dz / currentRadius;
    
    // Apply gentle restoring force toward the quantized radius
    const radiusError = targetRadius - currentRadius;
    const restoring = CONSTANTS.quantumRestoringStrength * radiusError;
    
    // Position correction
    const positionCorrection = {
        x: ux * restoring,
        y: uy * restoring,
        z: uz * restoring
    };
    
    // Calculate current velocity vector
    const vx = electron.vx - proton.vx;
    const vy = electron.vy - proton.vy;
    const vz = electron.vz - proton.vz;
    
    // Get radial and tangential components of velocity
    // Radial component (parallel to radius vector)
    const vDotR = vx*ux + vy*uy + vz*uz;
    const vRadial = {
        x: vDotR * ux,
        y: vDotR * uy,
        z: vDotR * uz
    };
    
    // Tangential component (perpendicular to radius vector)
    const vTangential = {
        x: vx - vRadial.x,
        y: vy - vRadial.y,
        z: vz - vRadial.z
    };
    
    // Calculate current tangential speed
    const vTangentialMag = Math.sqrt(
        vTangential.x*vTangential.x + 
        vTangential.y*vTangential.y + 
        vTangential.z*vTangential.z
    );
    
    // Calculate the quantized velocity for this orbital
    const targetSpeed = getQuantizedVelocity(n, proton.charge, electron.mass);
    
    // Scale the tangential velocity to match the quantized speed
    let velocityCorrection = { x: 0, y: 0, z: 0 };
    
    if (vTangentialMag > 0.001) {
        // Normalize and scale tangential velocity to match target speed
        const scaleFactor = targetSpeed / vTangentialMag;
        
        // Apply a gentler correction factor to avoid jumps
        const correctionStrength = 0.1;
        const adjustedFactor = 1 + (scaleFactor - 1) * correctionStrength;
        
        // Calculate relative to proton's velocity
        velocityCorrection = {
            x: (vTangential.x * adjustedFactor - vx),
            y: (vTangential.y * adjustedFactor - vy), 
            z: (vTangential.z * adjustedFactor - vz)
        };
    } else {
        // Generate a new orbital velocity perpendicular to the radius vector
        // Create a perpendicular direction
        const tx = -uz;
        const ty = 0;
        const tz = ux;
        
        // Normalize
        const tMag = Math.sqrt(tx*tx + ty*ty + tz*tz) || 1;
        
        // Apply a small velocity correction in the perpendicular direction
        velocityCorrection = {
            x: (tx / tMag) * targetSpeed * 0.1,
            y: (ty / tMag) * targetSpeed * 0.1,
            z: (tz / tMag) * targetSpeed * 0.1
        };
    }
    
    // Return position and velocity corrections
    return {
        positionCorrection,
        velocityCorrection,
        quantumNumber: n
    };
}

/**
 * Create a quantized electron orbit according to Bohr's model
 * 
 * @param {Object} electron - Electron particle
 * @param {Object} proton - Proton/nucleus
 * @param {Object} settings - Simulation settings
 * @param {number} n - Principal quantum number (default: random between 1-4)
 * @returns {Object} - Velocity components for the electron
 */
function createQuantizedElectronOrbit(electron, proton, settings, n = null) {
    // Make sure constants are up to date
    updateConstants(settings);
    
    // If n is not provided, randomly assign a quantum number between 1 and 4
    if (n === null) {
        const maxN = settings.maxQuantumNumber || 4;
        n = Math.floor(Math.random() * maxN) + 1;
    }
    
    // Calculate the quantized radius for this quantum number
    const radius = getQuantizedRadius(n);
    
    // Generate random direction for electron position
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Position the electron at the exact quantized radius
    electron.x = proton.x + radius * Math.sin(phi) * Math.cos(theta);
    electron.y = proton.y + radius * Math.sin(phi) * Math.sin(theta);
    electron.z = proton.z + radius * Math.cos(phi);
    
    // Calculate the radius vector
    const rx = electron.x - proton.x;
    const ry = electron.y - proton.y;
    const rz = electron.z - proton.z;
    
    // Normalize the radius vector (with safety check)
    const rMag = Math.hypot(rx, ry, rz) || radius;
    const rNorm = {
        x: rx / rMag,
        y: ry / rMag,
        z: rz / rMag
    };
    
    // Create a perpendicular vector for orbital motion
    // Create a vector perpendicular to rNorm
    let perpVector;
    if (Math.abs(rNorm.z) < 0.9) {
        // If not nearly parallel to z-axis, cross with z-axis
        perpVector = {
            x: -rNorm.y,
            y: rNorm.x,
            z: 0
        };
    } else {
        // If nearly parallel to z-axis, cross with x-axis
        perpVector = {
            x: 0,
            y: -rNorm.z,
            z: rNorm.y
        };
    }
    
    // Normalize the perpendicular vector
    const perpMag = Math.hypot(perpVector.x, perpVector.y, perpVector.z) || 1;
    perpVector.x /= perpMag;
    perpVector.y /= perpMag;
    perpVector.z /= perpMag;
    
    // Calculate quantized velocity for this orbit according to Bohr's model
    const v = getQuantizedVelocity(n, proton.charge, electron.mass);
    
    // Calculate velocity vector perpendicular to radius to create circular orbit
    return {
        vx: perpVector.x * v,
        vy: perpVector.y * v,
        vz: perpVector.z * v,
        radius: radius,
        quantumNumber: n
    };
}

// Export functions
export {
    CONSTANTS,
    getQuantizedRadius,
    getQuantizedVelocity,    getNearestQuantumNumber,
    applyQuantumConstraints,
    createQuantizedElectronOrbit,
    updateConstants,
    // Re-export quantum shell functions for convenience
    createQuantizedElectronOrbitWithExclusion,
    applyQuantumExclusionConstraints,
    getElectronicConfiguration,
    getElectronQuantumState
};
