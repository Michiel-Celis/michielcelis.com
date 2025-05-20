// Import physics engine functions
import {
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
} from './ParticlePhysics.js';

// Import quantum mechanics functions
import {
    getQuantizedRadius,
    updateConstants,
    createQuantizedElectronOrbitWithExclusion,
    applyQuantumExclusionConstraints,
    getElectronicConfiguration
} from './QuantumMechanics.js';

// Import camera and rendering engine
import { Camera, Renderer } from './CameraRenderer.js';

// === SIMULATION SETTINGS & CONFIGURATION ===
const SIM_SETTINGS = {
    // Quantum mechanics parameters
    quantumOrbits: true,           // Enable/disable quantized electron orbits
    pauliExclusion: true,          // Enable/disable Pauli exclusion principle
    bohrRadius: 40,                // Base Bohr radius (a₀) scaled for visualization
    planckConstant: 10,            // Scaled Planck's constant (ħ)
    quantumRestoringStrength: 0.05, // Strength of force restoring electrons to quantized orbits
    maxQuantumNumber: 4,           // Maximum principal quantum number to use
    debugQuantumOrbits: false,     // Enable visual debugging of quantum shells
    showElectronicConfig: false,   // Show electronic configuration display
    
    // Physics
    dt: 0.001,                     // time step (seconds)
    emConst: 15000,                // Coulomb constant (increased for stronger attraction)
    speedOfLight: 300,             // c in simulation units
    
    // Nuclear potential parameters (Woods-Saxon)
    nuclearPotentialDepth: 50,     // Depth of nuclear potential well (V0)
    nuclearPotentialRange: 15,     // Nuclear range parameter (R)
    nuclearPotentialDiffuseness: 2, // Nuclear diffuseness parameter (a)
    
    // Particle interaction parameters
    weakDecayRate: 0.00001,        // neutron decay probability per update
    exclusionRadius: 25,           // Pauli exclusion radius
    exclusionRepulsion: 2,         // exclusion repulsion strength
    bindingDistance: 15,           // reference distance for nucleons
    cellSize: 100,                 // spatial hashing cell size
    friction: 0.9999,              // velocity damping (very small to maintain momentum)
    initialEntropy: 500,           // initial random velocity (reduced for better orbital formation)
    ongoingEntropy: 5,             // per-frame jitter velocity (greatly reduced for orbital stability)
    ongoingZEntropy: 0.05,         // per-frame jitter vz (minimal for orbital stability)
    explosionStrength: 500,        // click explosion strength
    orbitCaptureZ: 0.25,           // Z threshold for binding (electrons)
    bhGravity: 50000,              // black-hole gravitational G
    bhLifetime: 3,                 // black-hole lifespan (s)
    electronOrbitScale: 3.0,       // increased for better orbit visibility
    scaleFactor: 2.0,              // zoom: larger = closer/larger

    // Particles
    ElectronAmount: 40,            // initial electron count (slightly reduced for clearer orbits)
    ElectronSize: 4,               // electron size in pixels (increased for visibility)
    ProtonAmount: 25,              // initial proton count
    ProtonSize: 9,                 // proton size in pixels 
    NeutronAmount: 25,             // initial neutron count
    NeutronSize: 9,                // neutron size in pixels

    // Camera & Rendering
    initialDist: 600,              // initial camera distance from origin
    initialFocus: 500,             // initial focal plane
    minFocus: 100,                 // minimum focus distance
    maxFocus: 1000,                // maximum focus distance
    focusSpeed: 10,                // focal plane change speed
    orbitSpeed: { x: Math.PI/5, y: Math.PI/10, z: Math.PI/20 },
    dragSpeed: 0.01,              // mouse drag sensitivity
    slowFactor: 0.95,              // per-frame slowdown when holding Space

      // Projection & DOF
    focalLength: 1000,             // perspective projection focal length
    nearClip: 100,                   // near clipping plane
    farClip: 500000,                 // far clipping plane
    blurScale: 0.01,              // pixels of blur per unit of focal error
    maxRenderBlur: 30,              // blur threshold for culling
    focusBlurIntensity: 10.0,       // intensity multiplier for focal blur effect
    focusBlurThreshold: 500,       // threshold distance before blur starts to increase
    nearRenderZ: 0.1,              // min view Z    farRenderZ: 15,                // max view Z
    depthScale: 5000,              // depth→pixel scale
    depthDarkeningFactor: 0.8      // How much to darken distant particles (0-1)
};

// static view constants
const MAX_Z = 500, MIN_Z = -500;  // Match these with WRAP_DISTANCE for consistent 3D boundaries
const baseBlur = 0.01, blurScale = 0.5;

// World center and wrapping constants
const WORLD_CENTER_X = innerWidth / 2;
const WORLD_CENTER_Y = innerHeight / 2;
const WRAP_DISTANCE = 500; // Distance from center before wrapping

// === XYZ AXES FOR REFERENCE ===
const axes = [
    { from: {x:0, y:0, z:0}, to: {x:200, y:0, z:0}, color: 'red' },    // X axis (red)
    { from: {x:0, y:0, z:0}, to: {x:0, y:200, z:0}, color: 'green' },  // Y axis (green)
    { from: {x:0, y:0, z:0}, to: {x:0, y:0, z:200}, color: 'blue' }    // Z axis (blue)
];

// === CAMERA AND RENDERER INITIALIZATION ===
const camera = new Camera(SIM_SETTINGS);
const renderer = new Renderer(SIM_SETTINGS, document.querySelector('.container'));

// MOUSE & KEY STATE
let dragging = false;
let lastMouse = { x: 0, y: 0 };
let slowDownActive = false;

// === PARTICLE TYPES & INITIAL COUNTS ===
const PARTICLE_TYPES = {
    red:   { name:'proton',   color:'red',   charge:+1, massRange:[1,1.1] },
    cyan:  { name:'electron', color:'cyan',  charge:-1, massRange:[0.0005,0.001] },
    black: { name:'neutron',  color:'black', charge:0,  massRange:[1,1.1] }
};
const INITIAL_COUNTS = { red:SIM_SETTINGS.ProtonAmount, cyan:SIM_SETTINGS.ElectronAmount, black:SIM_SETTINGS.NeutronAmount };

// === STATE & INIT ===
const container = document.querySelector('.container');

const particles = [];
const blackHoles = [];

// create particles
for (const typeKey in INITIAL_COUNTS) {
    const type = PARTICLE_TYPES[typeKey];
    for (let i = 0; i < INITIAL_COUNTS[typeKey]; i++) {
        const el = document.createElement('div');
        el.className = 'firefly';
        el.style.pointerEvents = 'auto';
        el.style.background = type.color;
        el.style.borderRadius = '50%'; // Ensure particles are perfectly round
        
        // Set initial size based on particle type
        let baseSize;
        if (type.name === 'electron') {
            baseSize = SIM_SETTINGS.ElectronSize;
        } else if (type.name === 'proton') {
            baseSize = SIM_SETTINGS.ProtonSize;
        } else { // neutron
            baseSize = SIM_SETTINGS.NeutronSize;
        }
        
        // Apply exact size in pixels
        el.style.width = `${baseSize}px`;
        el.style.height = `${baseSize}px`;
        container.appendChild(el);

        // Generate random position using physics helper
        // For electrons, create a wider distribution to increase chances of finding protons
        const position = type.name === 'electron' 
            ? randomSphericalCoords(150, 450) 
            : randomSphericalCoords(100, 400);
        
        // Generate random velocity using physics helper
        // Electrons need initial velocity for proper orbital capture
        // Use higher initial velocity for electrons to ensure they have enough energy for orbits
        const entropyValue = type.name === 'electron' 
            ? SIM_SETTINGS.initialEntropy * 1.5 
            : SIM_SETTINGS.initialEntropy;
        const velocity = randomVelocityVector(entropyValue);
        
        // Position coordinates are relative to world origin (0,0,0)
        // which will be projected to screen center
        const mass = Math.random() * (type.massRange[1] - type.massRange[0])
                   + type.massRange[0];
                   
        particles.push({
            el, name:type.name, color:type.color, charge:type.charge,
            spin:type.spin||0, mass,
            x: position.x,
            y: position.y,
            z: position.z,
            vx: velocity.x,
            vy: velocity.y,
            vz: velocity.z,
            boundTo:null
        });
    }
}

// initial p–n binding (50%)
(() => {
    const protons  = particles.filter(p => p.name==='proton');
    const neutrons = particles.filter(p => p.name==='neutron');
    const pairs    = Math.min(protons.length, neutrons.length);
    
    // Increase binding rate for more interesting nuclear dynamics
    const bindCount = Math.floor(pairs * 0.7); 
    
    // Create arrays to keep track of which particles we've already used
    const usedProtons = [];
    const usedNeutrons = [];
    
    // First pass: create neutron-proton pairs
    for (let i=0; i<bindCount; i++) {
        // Find unused proton
        let protonIndex;
        do {
            protonIndex = Math.floor(Math.random() * protons.length);
        } while (usedProtons.includes(protonIndex));
        usedProtons.push(protonIndex);
        
        // Find unused neutron
        let neutronIndex;
        do {
            neutronIndex = Math.floor(Math.random() * neutrons.length);
        } while (usedNeutrons.includes(neutronIndex));
        usedNeutrons.push(neutronIndex);
        
        const p = protons[protonIndex];
        const n = neutrons[neutronIndex];
        
        // Create the binding relationship
        p.boundTo = n; 
        n.boundTo = p;

        // Create binding using physics helper
        const binding = createNucleonBinding(n, p, SIM_SETTINGS);
        
        // Apply new position and velocity
        n.x = binding.x;
        n.y = binding.y;
        n.z = binding.z;
        n.vx = binding.vx;
        n.vy = binding.vy;
        n.vz = binding.vz;
        
        // Add a nucleus identifier to help with visualization
        n.nucleusId = i;
        p.nucleusId = i;
    }
    
    // Second pass: create larger nuclei by binding additional neutrons to existing pairs
    if (bindCount > 5) {
        // Number of larger nuclei to create (with 3 or 4 particles)
        const largeNucleiCount = Math.min(5, Math.floor(bindCount/5));
        
        for (let i=0; i<largeNucleiCount; i++) {
            // Select a bound proton to attach another neutron to
            const nucleusId = Math.floor(Math.random() * bindCount);
            const primaryProton = protons.find(p => p.nucleusId === nucleusId);
            
            if (!primaryProton) continue;
            
            // Find an unused neutron
            let neutronIndex;
            do {
                neutronIndex = Math.floor(Math.random() * neutrons.length);
            } while (usedNeutrons.includes(neutronIndex));
            
            // If we can't find an unused neutron, skip this iteration
            if (neutronIndex === undefined) continue;
            
            usedNeutrons.push(neutronIndex);
            const additionalNeutron = neutrons[neutronIndex];
            
            // Create a secondary binding to the same proton
            additionalNeutron.boundTo = primaryProton;
            
            // Use binding helper to position and set velocity
            const binding = createNucleonBinding(additionalNeutron, primaryProton, SIM_SETTINGS);
            
            // Apply position and velocity
            additionalNeutron.x = binding.x;
            additionalNeutron.y = binding.y;
            additionalNeutron.z = binding.z;
            additionalNeutron.vx = binding.vx;
            additionalNeutron.vy = binding.vy;
            additionalNeutron.vz = binding.vz;
            
            // Add to same nucleus for visualization
            additionalNeutron.nucleusId = nucleusId;
        }
    }
})();

// initial electron–proton orbits
(() => {
    // Get all electrons and protons
    const electrons = particles.filter(p => p.name === 'electron');
    
    // Get all protons, preferring those that are part of a nucleus
    const allProtons = particles.filter(p => p.name === 'proton');
    // Sort protons - put those that are part of a nucleus (boundTo is not null) first
    const protons = allProtons.sort((a, b) => (b.boundTo ? 1 : 0) - (a.boundTo ? 1 : 0));
    
    // Create a configurable number of electron-proton orbits
    const orbitsToCreate = Math.min(electrons.length, Math.floor(protons.length * 0.8));
    const usedElectrons = [];
    const usedProtons = [];
    
    for (let i = 0; i < orbitsToCreate; i++) {
        // Find an unused electron
        let electronIndex;
        do {
            electronIndex = Math.floor(Math.random() * electrons.length);
        } while (usedElectrons.includes(electronIndex));
        usedElectrons.push(electronIndex);
        
        const e = electrons[electronIndex];
        
        // Find an unused proton, preferring those in nuclei
        let protonIndex;
        do {
            protonIndex = Math.floor(Math.random() * protons.length);
        } while (usedProtons.includes(protonIndex));
        usedProtons.push(protonIndex);
        
        const p = protons[protonIndex];
          // Assign a random quantum number between 1 and maxQuantumNumber
        const n = Math.floor(Math.random() * SIM_SETTINGS.maxQuantumNumber) + 1;
        
        // Create a quantized orbit according to the Bohr model
        const orbit = createElectronOrbit(e, p, SIM_SETTINGS, n);
        
        // Apply orbital velocity from quantum calculations
        e.vx = orbit.vx;
        e.vy = orbit.vy;
        e.vz = orbit.vz;
        
        // Store quantum properties
        e.quantumNumber = n;
        e.quantumRadius = getQuantizedRadius(n);
        
        // Mark this electron as being in an orbital relationship
        e.orbiting = p;
        // Mark this proton as having an electron (simple atom model)
        p.hasElectron = true;
        
        // For visual clarity, adjust color for electrons in orbit
        e.orbitColor = 'deepskyblue';
        e.el.style.background = 'deepskyblue';
        e.el.style.boxShadow = '0 0 10px deepskyblue';
    }
})();

// explosions & black-holes
container.addEventListener('click', evt => {
    if (!evt.target.classList.contains('firefly')) {
        return;
    }
    evt.stopPropagation();
    const center = particles.find(p => p.el === evt.target),
          orig = center.color;
    center.el.style.background = 'white';
    setTimeout(() => center.el.style.background = orig, 150);
    
    // Create explosion using physics helper
    createExplosion(center, particles, SIM_SETTINGS.explosionStrength);
});
container.addEventListener('contextmenu', evt => {
    evt.preventDefault();
    const camPos = camera.getPosition();
    blackHoles.push({
        x: evt.clientX, y: evt.clientY, z: camPos.z,
        mass: 1e4, life: SIM_SETTINGS.bhLifetime
    });
});

// — INPUT HANDLERS —
// begin drag
container.addEventListener('mousedown', e => {
    dragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    slowDownActive = true;
});

// end drag
container.addEventListener('mouseup', () => {
    dragging = false;
    slowDownActive = false;
});

// adjust orbit velocity on drag
container.addEventListener('mousemove', e => {
    if (!dragging) {
        return;
    }
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    camera.vel.y += dx * SIM_SETTINGS.dragSpeed;
    camera.vel.x += dy * SIM_SETTINGS.dragSpeed;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
});

// zoom focal plane on wheel
container.addEventListener('wheel', e => {
    e.preventDefault();
    camera.adjustFocus(e.deltaY);
}, { passive: false });

// Keyboard controls for complex atoms and other features
document.addEventListener('keydown', e => {
    // Press 'A' to create a complex atom
    if (e.key.toLowerCase() === 'a') {
        // Get available particles by type
        const protons = particles.filter(p => p.name === 'proton');
        const neutrons = particles.filter(p => p.name === 'neutron');
        const electrons = particles.filter(p => p.name === 'electron');
        
        // Create a complex atom
        const atom = createComplexAtom(protons, neutrons, electrons, SIM_SETTINGS);
        
        // If the atom was created successfully (we have particles)
        if (atom.allParticles.length > 0) {
            console.log(`Created complex atom with ${atom.nucleus.length} nucleons and ${atom.electronShells.flat().length} electrons`);
        }
    }
    
    // Press 'D' to toggle debug quantum orbit visualization
    if (e.key.toLowerCase() === 'd') {
        SIM_SETTINGS.debugQuantumOrbits = !SIM_SETTINGS.debugQuantumOrbits;
        console.log(`Debug quantum orbit visualization: ${SIM_SETTINGS.debugQuantumOrbits ? 'ON' : 'OFF'}`);
    }
    
    // Press 'E' to toggle electronic configuration display 
    if (e.key.toLowerCase() === 'e') {
        SIM_SETTINGS.showElectronicConfig = !SIM_SETTINGS.showElectronicConfig;
        console.log(`Electronic configuration display: ${SIM_SETTINGS.showElectronicConfig ? 'ON' : 'OFF'}`);
        
        if (SIM_SETTINGS.showElectronicConfig) {
            // Find atoms and show their electronic configuration
            const protons = particles.filter(p => p.name === 'proton');
            
            for (const proton of protons) {
                // Only display for protons that have bound electrons
                const boundElectrons = particles.filter(p => 
                    p.name === 'electron' && p.orbiting && p.orbiting.id === proton.id);
                
                if (boundElectrons.length > 0) {
                    const config = getElectronicConfiguration(proton.id);
                    console.log(`Atom #${proton.id}: ${config}`);
                }
            }
        }
    }
});

// Add visualization indicator for spacebar and A key functions
function addControlsIndicator() {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.className = 'simulation-controls';
    instructionsDiv.style.position = 'absolute';
    instructionsDiv.style.bottom = '20px';
    instructionsDiv.style.left = '20px';
    instructionsDiv.style.color = 'white';
    instructionsDiv.style.fontFamily = 'sans-serif';
    instructionsDiv.style.fontSize = '14px';
    instructionsDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    instructionsDiv.style.padding = '10px';
    instructionsDiv.style.borderRadius = '5px';
    instructionsDiv.style.zIndex = '1000';
    instructionsDiv.style.pointerEvents = 'none';
    instructionsDiv.style.userSelect = 'none';    instructionsDiv.innerHTML = `
        <div><b>Mouse</b>: Drag to rotate, Wheel to zoom</div>
        <div><b>Click</b>: Particle explosion</div>
        <div><b>Right-Click</b>: Create black hole</div>
        <div><b>A</b>: Create complex atom</div>
        <div><b>D</b>: Toggle quantum shell visualization</div>
        <div><b>E</b>: Show electronic configuration</div>
        <div style="margin-top:8px"><b>Electron Shells</b>: Using Pauli Exclusion Principle</div>
        <div style="font-size:12px">Aufbau filling: 1s², 2s², 2p⁶, 3s², 3p⁶, 4s²...</div>
        <div><b>Shell Colors</b>: n=1 (bright blue) → n=4 (pale blue)</div>
    `;
    document.body.appendChild(instructionsDiv);
}

// Add styling and create DOM elements
renderer.createParticleElements(particles);
renderer.createAxisElements(axes);
addControlsIndicator();

// main loop
function update() {
    const { dt, slowFactor, focalLength } = SIM_SETTINGS;

    // Ensure quantum mechanics module is using current settings
    updateConstants(SIM_SETTINGS);

    // Update camera
    camera.update(dt, slowFactor, slowDownActive);

    // Update physics using physics engine
    updateParticlePhysics(particles, blackHoles, SIM_SETTINGS, WRAP_DISTANCE);

    // Render using our rendering engine
    renderer.renderAxes(axes, camera, focalLength);
    renderer.renderParticles(particles, camera, focalLength);
    
    // Visualize quantized shells if debug mode is enabled
    if (SIM_SETTINGS.debugQuantumOrbits) {
        visualizeQuantumShells();
    }

    // Continue the animation loop
    requestAnimationFrame(update);
}

// Visualization helper for quantum shells (for debugging)
function visualizeQuantumShells() {
    // Create shell visualization elements if they don't exist
    if (!window.quantumShellElements) {
        window.quantumShellElements = [];
        const container = document.querySelector('.container');
        
        for (let n = 1; n <= SIM_SETTINGS.maxQuantumNumber; n++) {
            const shellEl = document.createElement('div');
            shellEl.className = 'quantum-shell';
            shellEl.style.position = 'absolute';
            shellEl.style.pointerEvents = 'none';
            shellEl.style.border = `1px solid rgba(100, 200, 255, ${0.7 / n})`;
            shellEl.style.borderRadius = '50%';
            shellEl.style.boxSizing = 'border-box';
            container.appendChild(shellEl);
            window.quantumShellElements.push(shellEl);
        }
    }
  // Find a proton to visualize shells around
    const centralProton = particles.find(p => p.name === 'proton' && p.hasElectron);
    if (!centralProton) {
        return;
    }
    
    // Display electronic configuration if enabled
    if (SIM_SETTINGS.showElectronicConfig && centralProton) {
        // Create or update electronic configuration display
        if (!window.electronicConfigEl) {
            window.electronicConfigEl = document.createElement('div');
            window.electronicConfigEl.className = 'electronic-config';
            window.electronicConfigEl.style.position = 'absolute';
            window.electronicConfigEl.style.bottom = '20px';
            window.electronicConfigEl.style.left = '20px';
            window.electronicConfigEl.style.color = 'white';
            window.electronicConfigEl.style.fontFamily = 'monospace';
            window.electronicConfigEl.style.fontSize = '14px';
            window.electronicConfigEl.style.padding = '10px';
            window.electronicConfigEl.style.background = 'rgba(0, 0, 0, 0.7)';
            window.electronicConfigEl.style.borderRadius = '5px';
            window.electronicConfigEl.style.zIndex = '1000';
            document.body.appendChild(window.electronicConfigEl);
        }
        
        // Update configuration text
        const config = getElectronicConfiguration(centralProton.id);
        window.electronicConfigEl.textContent = `Electronic Configuration: ${config}`;
        window.electronicConfigEl.style.display = '';
    } else if (window.electronicConfigEl) {
        window.electronicConfigEl.style.display = 'none';
    }
    
    // Get camera for projection
    const camPos = camera.getPosition();
    const basis = camera.getBasis(camPos);
    
    // Update shell visualizations
    for (let n = 1; n <= SIM_SETTINGS.maxQuantumNumber; n++) {
        const shellEl = window.quantumShellElements[n-1];
        const radius = getQuantizedRadius(n);
        
        // Project shell center
        const projCenter = renderer.project(
            { x: centralProton.x, y: centralProton.y, z: centralProton.z },
            basis,
            camPos,
            SIM_SETTINGS.focalLength
        );
        
        if (!projCenter) {
            shellEl.style.display = 'none';
            continue;
        }
        
        // Project a point on the shell to determine size
        const projEdge = renderer.project(
            { x: centralProton.x + radius, y: centralProton.y, z: centralProton.z },
            basis,
            camPos,
            SIM_SETTINGS.focalLength
        );
        
        if (!projEdge) {
            shellEl.style.display = 'none';
            continue;
        }
        
        // Calculate projected shell size
        const projRadius = Math.abs(projEdge.x - projCenter.x);
        const shellSize = projRadius * 2;
        
        // Position and size the shell visualization
        shellEl.style.display = '';
        shellEl.style.width = `${shellSize}px`;
        shellEl.style.height = `${shellSize}px`;
        shellEl.style.transform = `translate(${projCenter.x - projRadius}px, ${projCenter.y - projRadius}px)`;    }
}

update();
