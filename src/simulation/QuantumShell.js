// === QUANTUM SHELL MODULE ===
// This module implements electron shell filling rules and the Pauli Exclusion Principle

/**
 * Quantum State Map
 * Maps principal quantum numbers to their subshells and capacity
 * {n: [{ l: azimuthal quantum number, capacity: number of electrons }]}
 * 
 * Following Aufbau principle: 1s, 2s, 2p, 3s, 3p, 4s, ...
 * Capacities: {2, 2, 6, 2, 6, 2, ...}
 */
const QUANTUM_SHELLS = {
    1: [{ l: 0, name: "s", capacity: 2 }],                          // 1s (2 electrons)
    2: [{ l: 0, name: "s", capacity: 2 }, 
        { l: 1, name: "p", capacity: 6 }],                          // 2s, 2p (8 electrons)
    3: [{ l: 0, name: "s", capacity: 2 }, 
        { l: 1, name: "p", capacity: 6 }, 
        { l: 2, name: "d", capacity: 10 }],                         // 3s, 3p, 3d (18 electrons)
    4: [{ l: 0, name: "s", capacity: 2 }, 
        { l: 1, name: "p", capacity: 6 }, 
        { l: 2, name: "d", capacity: 10 }, 
        { l: 3, name: "f", capacity: 14 }],                         // 4s, 4p, 4d, 4f (32 electrons)
};

// AUFBAU ORDERING - determines shell filling order (non-intuitive for higher energy levels)
// Follows energy level ordering: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, 5s, 4d, 5p, 6s, etc.
const AUFBAU_ORDERING = [
    {n: 1, l: 0}, // 1s
    {n: 2, l: 0}, // 2s
    {n: 2, l: 1}, // 2p
    {n: 3, l: 0}, // 3s
    {n: 3, l: 1}, // 3p
    {n: 4, l: 0}, // 4s
    {n: 3, l: 2}, // 3d
    {n: 4, l: 1}, // 4p    {n: 5, l: 0}, // 5s
    {n: 4, l: 2}, // 4d
    {n: 5, l: 1}, // 5p
    {n: 6, l: 0}  // 6s
];

// Mapping for visual representation (orbit colors by shell and subshell)
const SHELL_COLORS = {
    "1s": "#00ffff",    // bright cyan
    "2s": "#0080ff",    // light blue
    "2p": "#0040ff",    // blue
    "3s": "#ff00ff",    // magenta
    "3p": "#ff0080",    // pink
    "3d": "#ff0000",    // red
    "4s": "#00ff00",    // green
    "4p": "#00c000",    // dark green
    "4d": "#ffff00",    // yellow
    "4f": "#ffc000"     // orange
};

/**
 * Class to track detailed quantum state occupation following the Pauli Exclusion Principle
 * A state is defined by (n, ℓ, mℓ) and can hold up to 2 electrons with opposite spins (ms)
 */
class AtomicStructure {
    constructor(atomId) {
        this.atomId = atomId;
        this.electrons = [];
        // Maps "n,l,ml" to array of electrons (max 2, with opposite spins)
        this.occupiedStates = new Map();
        this.electronCount = 0;
        this.stateCache = new Map(); // Cache generated states
    }
    
    /**
     * Get a string key representing a quantum state
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} ml - Magnetic quantum number
     * @returns {string} - Unique key for this state
     */
    getStateKey(n, l, ml) {
        return `${n},${l},${ml}`;
    }
    
    /**
     * Check if a quantum state is available
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @param {number} ml - Magnetic quantum number
     * @returns {boolean} - True if the state has room for at least one more electron
     */
    isStateAvailable(n, l, ml) {
        const key = this.getStateKey(n, l, ml);
        const state = this.occupiedStates.get(key);
        // A state can hold up to 2 electrons with opposite spins
        return !state || state.length < 2;
    }
    
    /**
     * Get the next available quantum state for an electron
     * following the Aufbau principle
     * @returns {Object|null} - Quantum state {n, l, ml, ms} or null if no states available
     */
    getNextAvailableState() {
        // Loop through Aufbau ordering
        for (const {n, l} of AUFBAU_ORDERING) {
            // For each allowed ml value (-l to +l)
            for (let ml = -l; ml <= l; ml++) {
                // Check if this state has space
                if (this.isStateAvailable(n, l, ml)) {
                    const key = this.getStateKey(n, l, ml);
                    const state = this.occupiedStates.get(key) || [];
                    
                    // Determine spin - if state is empty, use +1/2, otherwise use -1/2
                    const ms = state.length === 0 ? 0.5 : -0.5;
                    
                    return { n, l, ml, ms };
                }
            }
        }
        
        // If we get here, all defined states are filled
        // Use higher principal quantum number (simplified approach)
        const maxDefinedN = Math.max(...Object.keys(QUANTUM_SHELLS).map(Number));
        return { n: maxDefinedN + 1, l: 0, ml: 0, ms: 0.5 }; 
    }
    
    /**
     * Get total electrons allowed in a shell
     * @param {number} n - Principal quantum number
     * @returns {number} - Maximum electron capacity for this shell
     */
    getShellCapacity(n) {        if (n <= 0) {
            return 0;
        }
        if (n <= 4) {
            return QUANTUM_SHELLS[n].reduce((total, subshell) => total + subshell.capacity, 0);
        }
        // Formula for shell capacity: 2n²
        return 2 * n * n;
    }
    
    /**
     * Get total electrons allowed in a subshell 
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @returns {number} - Maximum electron capacity for this subshell
     */
    getSubshellCapacity(n, l) {        if (n <= 0 || l < 0 || l >= n) {
            return 0;
        }
        
        if (n <= 4 && l < QUANTUM_SHELLS[n].length) {
            return QUANTUM_SHELLS[n][l].capacity;
        }
        
        // For higher shells, capacity = 2(2l+1)
        return 2 * (2 * l + 1);
    }
    
    /**
     * Get the shell name for a quantum state
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @returns {string} - Shell name (e.g., "1s", "2p", "3d")
     */
    getShellName(n, l) {
        if (n <= 4 && l < QUANTUM_SHELLS[n].length) {
            return `${n}${QUANTUM_SHELLS[n][l].name}`;
        } else {
            // For higher shells not explicitly defined
            const subshellLetters = ["s", "p", "d", "f", "g", "h"];
            const letter = l < subshellLetters.length ? subshellLetters[l] : `l${l}`;
            return `${n}${letter}`;
        }
    }
      /**
     * Get the color for a quantum state
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @returns {string} - CSS color string
     */
    getShellColor(n, l) {
        // Return white for all orbital shells to ensure orbiting electrons have white glow
        return 'white';
        
        // Comment out original code that used different colors
        /*
        const shellName = this.getShellName(n, l);
        if (SHELL_COLORS[shellName]) {
            return SHELL_COLORS[shellName];
        }
        
        // For shells without predefined colors, generate one
        // Use hue based on n and saturation based on l
        const hue = (n * 60) % 360;
        const saturation = 100 - (l * 10);
        const lightness = 50;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        */
    }
    
    /**
     * Calculate orbital characteristics for an electron
     * @param {Object} electron - The electron
     * @param {Object} nucleus - The nucleus being orbited
     * @param {Object} settings - Simulation settings
     * @returns {Object} - Orbital properties
     */    calculateOrbitalProperties(electron, nucleus, settings) {
        const { n, l, ml, ms } = electron.quantumState;
        
        // Base orbital radius (modified by azimuthal quantum number)
        const baseRadius = settings.bohrRadius * n * n;
        
        // Adjust radius based on azimuthal quantum number (l)
        // Higher l values (p, d, f orbitals) have different angular distributions
        // Reduced multiplier to bring electrons closer to nucleus
        const radiusMultiplier = 0.7 + (l * 0.05); // Reduced from 1 + (l * 0.1)
        const radius = baseRadius * radiusMultiplier;
        
        // Speed depends inversely on radius - adjust with quantum numbers
        // We use n as the primary factor (as in Bohr model)
        const speed = settings.emConst * nucleus.charge / (radius * electron.mass) * settings.electronOrbitScale;
        
        // Orbital inclination and offset varies by magnetic quantum number (ml)
        // This creates different orbital shapes and orientations
        // ml ranges from -l to +l
        const mlRange = 2 * l + 1; // Total possible ml values
        const mlNormalized = mlRange > 1 ? (ml + l) / (mlRange - 1) : 0.5;
        
        // Orbital inclination (angle from xy plane)
        // Varies from -π/3 to +π/3 based on ml (-l to +l)
        const inclination = (mlNormalized - 0.5) * Math.PI / 3;
        
        // Orbital phase (starting position around the orbit)
        // Use ms (spin) to offset paired electrons in the same orbital
        const phaseOffset = ms > 0 ? 0 : Math.PI; // Opposite sides for opposite spins
        
        // Assign a shell name for visual reference
        const shellName = this.getShellName(n, l);
        
        // Get color for this orbital
        const color = this.getShellColor(n, l);
        
        return {
            radius,
            speed,
            inclination,
            phaseOffset,
            shellName,
            color
        };
    }
    
    /**
     * Add an electron to the atomic structure with proper quantum numbers
     * @param {Object} electron - Electron to add
     */
    addElectron(electron) {
        // Get next available quantum state following Aufbau principle
        const state = this.getNextAvailableState();
        
        // Assign quantum state to electron
        electron.quantumState = state;
        
        // Add to occupancy map
        const key = this.getStateKey(state.n, state.l, state.ml);
        if (!this.occupiedStates.has(key)) {
            this.occupiedStates.set(key, []);
        }
        this.occupiedStates.get(key).push(electron);
        
        // Add to electrons list
        this.electrons.push(electron);
        this.electronCount++;
        
        // Generate shell name and store for reference
        electron.shellName = this.getShellName(state.n, state.l);
        
        return state;
    }
    
    /**
     * Remove an electron from the atomic structure
     * @param {Object} electron - Electron to remove
     */
    removeElectron(electron) {        if (!electron.quantumState) {
            return;
        }
        
        const { n, l, ml } = electron.quantumState;
        const key = this.getStateKey(n, l, ml);
        
        // Remove from occupancy map
        if (this.occupiedStates.has(key)) {
            const electrons = this.occupiedStates.get(key);
            const index = electrons.indexOf(electron);
            if (index !== -1) {
                electrons.splice(index, 1);
                if (electrons.length === 0) {
                    this.occupiedStates.delete(key);
                }
            }
        }
        
        // Remove from electrons list
        const listIndex = this.electrons.indexOf(electron);
        if (listIndex !== -1) {
            this.electrons.splice(listIndex, 1);
            this.electronCount--;
        }
        
        // Clear quantum state
        delete electron.quantumState;
        delete electron.shellName;
    }
    
    /**
     * Check if the configuration satisfies Pauli Exclusion Principle
     * @returns {boolean} - True if all quantum states follow exclusion principle
     */
    validatePauliExclusion() {
        for (const [key, electrons] of this.occupiedStates.entries()) {
            // No more than 2 electrons per state
            if (electrons.length > 2) {
                return false;
            }
              // If there are 2 electrons, they must have opposite spins
            if (electrons.length === 2 && electrons[0].quantumState.ms === electrons[1].quantumState.ms) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Get all electrons in a specific shell
     * @param {number} n - Principal quantum number
     * @returns {Array} - Array of electrons in the shell
     */
    getElectronsInShell(n) {
        return this.electrons.filter(e => e.quantumState && e.quantumState.n === n);
    }
    
    /**
     * Get all electrons in a specific subshell
     * @param {number} n - Principal quantum number
     * @param {number} l - Azimuthal quantum number
     * @returns {Array} - Array of electrons in the subshell
     */
    getElectronsInSubshell(n, l) {
        return this.electrons.filter(e => 
            e.quantumState && e.quantumState.n === n && e.quantumState.l === l);
    }
    
    /**
     * Get string representation of the electronic configuration
     * @returns {string} - Electronic configuration (e.g., "1s² 2s² 2p⁶")
     */
    getElectronicConfiguration() {
        const config = [];
        const subshellMap = new Map(); // Maps "nl" to count
          // Count electrons in each subshell
        for (const electron of this.electrons) {
            if (!electron.quantumState) {
                continue;
            }
            
            const { n, l } = electron.quantumState;
            const subshellKey = `${n}${this.getSubshellName(l)}`;
            subshellMap.set(subshellKey, (subshellMap.get(subshellKey) || 0) + 1);
        }
        
        // Sort by aufbau principle
        const sortedSubshells = Array.from(subshellMap.keys()).sort((a, b) => {
            const aMatch = a.match(/(\d+)([spdfgh])/);
            const bMatch = b.match(/(\d+)([spdfgh])/);
            
            const aN = parseInt(aMatch[1]);
            const aL = "spdfgh".indexOf(aMatch[2]);
            const bN = parseInt(bMatch[1]);
            const bL = "spdfgh".indexOf(bMatch[2]);
            
            // Find position in AUFBAU_ORDERING
            const aPos = AUFBAU_ORDERING.findIndex(item => item.n === aN && item.l === aL);
            const bPos = AUFBAU_ORDERING.findIndex(item => item.n === bN && item.l === bL);
            
            return aPos - bPos;
        });
        
        // Create configuration string
        for (const subshell of sortedSubshells) {
            const count = subshellMap.get(subshell);
            config.push(`${subshell}${this.getSupScript(count)}`);
        }
        
        return config.join(" ");
    }
    
    /**
     * Get subshell name from azimuthal quantum number
     * @param {number} l - Azimuthal quantum number
     * @returns {string} - Subshell name (s, p, d, f, etc.)
     */
    getSubshellName(l) {
        const subshellLetters = ["s", "p", "d", "f", "g", "h"];
        return l < subshellLetters.length ? subshellLetters[l] : `l${l}`;
    }
    
    /**
     * Convert numbers to superscript for shell notation
     * @param {number} num - Number to convert
     * @returns {string} - String with superscript numbers
     */    getSupScript(num) {
        if (num === 1) {
            return "";
        }
        const supDigits = {"0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", 
                         "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};
        return num.toString().split("").map(d => supDigits[d]).join("");
    }
}

// Registry to manage AtomicStructure instances
const atomRegistry = new Map();

/**
 * Get or create an AtomicStructure for an atom
 * @param {number} atomId - Unique atom identifier
 * @returns {AtomicStructure} - AtomicStructure instance
 */
function getAtomicStructure(atomId) {
    if (!atomRegistry.has(atomId)) {
        atomRegistry.set(atomId, new AtomicStructure(atomId));
    }
    return atomRegistry.get(atomId);
}

/**
 * Create a properly quantized electron orbit with explicit Pauli exclusion
 * @param {Object} electron - The electron to set up in a quantum orbit
 * @param {Object} nucleus - The nucleus being orbited
 * @param {Object} settings - Simulation settings
 * @returns {Object} - Quantum state and orbital properties
 */
function createQuantizedElectronOrbitWithExclusion(electron, nucleus, settings) {
    // Get or create atomic structure for this nucleus
    const atomicStructure = getAtomicStructure(nucleus.id);
    
    // Add the electron to the structure following Pauli exclusion and Aufbau principle
    const quantumState = atomicStructure.addElectron(electron);
    
    // Calculate orbital properties based on quantum state
    const orbitalProps = atomicStructure.calculateOrbitalProperties(electron, nucleus, settings);
    
    return {
        quantumState,
        orbitalProps
    };
}

/**
 * Apply Pauli exclusion constraints to force electrons into proper quantum states
 * @param {Array} electrons - All electrons in the simulation
 * @param {Array} nuclei - All nuclei in the simulation
 * @param {Object} settings - Simulation settings
 */
function applyQuantumExclusionConstraints(electrons, nuclei, settings) {
    // For each nucleus, find its electrons and enforce exclusion
    for (const nucleus of nuclei) {    // Find electrons orbiting this nucleus
        const orbitingElectrons = electrons.filter(e => {
            if (!e.orbiting) {
                return false;
            }
            return e.orbiting.id === nucleus.id;
        });
        
        // Skip if no electrons
        if (orbitingElectrons.length === 0) {
            continue;
        }
        
        // Get atomic structure for this nucleus
        const atomicStructure = getAtomicStructure(nucleus.id);
        
        // Reassign quantum states if needed
        for (const electron of orbitingElectrons) {
            if (!electron.quantumState) {
                // This electron doesn't have a quantum state yet, assign one
                atomicStructure.addElectron(electron);
                
                // Update orbital properties
                const orbitalProps = atomicStructure.calculateOrbitalProperties(electron, nucleus, settings);
                electron.orbitalRadius = orbitalProps.radius;
                electron.orbitalSpeed = orbitalProps.speed;
                electron.orbitalInclination = orbitalProps.inclination;
                electron.orbitalPhase = orbitalProps.phaseOffset;                electron.shellColor = orbitalProps.color;
            }
        }
    }
}

/**
 * Get detailed electronic configuration for an atom
 * @param {number} atomId - Unique atom identifier
 * @returns {string} - Electronic configuration string
 */
function getElectronicConfiguration(atomId) {
    const atomicStructure = atomRegistry.get(atomId);
    if (!atomicStructure) {
        return "";
    }
    
    return atomicStructure.getElectronicConfiguration();
}

/**
 * Debug helper: Get quantum state details for an electron
 * @param {Object} electron - The electron to get state for
 * @returns {Object|null} - Quantum state details
 */
function getElectronQuantumState(electron) {
    if (!electron.quantumState) {
        return null;
    }
    
    const { n, l, ml, ms } = electron.quantumState;
    return {
        n, // Principal quantum number
        l, // Azimuthal quantum number
        ml, // Magnetic quantum number
        ms, // Spin quantum number
        shellName: electron.shellName,
        state: `${electron.shellName} (n=${n}, l=${l}, ml=${ml}, ms=${ms})`
    };
}

// Export functions for use in other modules
export {
    getAtomicStructure,
    createQuantizedElectronOrbitWithExclusion,
    applyQuantumExclusionConstraints,
    getElectronicConfiguration,
    getElectronQuantumState
};
