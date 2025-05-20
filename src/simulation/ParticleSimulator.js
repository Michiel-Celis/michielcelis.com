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
import { Camera, Renderer, toggleAxesVisibility } from './CameraRenderer.js';

// === SIMULATION SETTINGS & CONFIGURATION ===
const SIM_SETTINGS = {
    // Quantum mechanics parameters
    quantumOrbits: true,           // Enable/disable quantized electron orbits
    pauliExclusion: true,          // Enable/disable Pauli exclusion principle
    bohrRadius: 5,                // Base Bohr radius (a₀) scaled for visualization
    planckConstant: 10,            // Scaled Planck's constant (ħ)
    quantumRestoringStrength: 0.05, // Strength of force restoring electrons to quantized orbits
    maxQuantumNumber: 4,           // Maximum principal quantum number to use
    debugQuantumOrbits: false,     // Enable visual debugging of quantum shells
    showElectronicConfig: false,   // Show electronic configuration display
    
    // Physics
    dt: 0.005,                    // time step (seconds)
    emConst: 15000,               // Coulomb constant (increased for stronger attraction)
    
    // Force modifiers (new parameters)
    closeRangeAttractionFactor: 1.0,  // Modifies attraction between particles at close range
    electronProtonAttractionFactor: 1.0, // Modifies attraction between electrons and protons
    protonNeutronAttractionFactor: 1.0, // Modifies attraction between protons and neutrons
    protonProtonRepulsionFactor: 1.0,  // Modifies repulsion between protons
    electronElectronRepulsionFactor: 1.0, // Modifies repulsion between electrons
    
    speedOfLight: 300,             // c in simulation units
    nuclearYukawaStrength: 350000,  // Yukawa attractive strength for nuclear binding (increased from 250000)
    nuclearYukawaMu: 0.15,          // Yukawa range parameter (decreased from 0.2 for longer range)
    nuclearRepulsionA: 0.9e6,        // repulsive-core constant (decreased for easier binding)
    weakDecayRate: 0.00001,        // neutron decay probability per update
    exclusionRadius: 20,           // Pauli exclusion radius (decreased from 25)
    exclusionRepulsion: 1.5,         // exclusion repulsion strength (decreased from 2)
    bindingDistance: 20,           // binding distance for nucleons (increased from 15 for easier binding)
    bindingSpringK: 25,            // spring constant for bound particles (increased from 15 for stronger binding)
    cellSize: 100,                 // spatial hashing cell size
    friction: 0.1,              // velocity damping (very small to maintain momentum)
    initialEntropy: 5,           // initial random velocity (reduced for better orbital formation)
    ongoingEntropy: 1,             // per-frame jitter velocity (greatly reduced for orbital stability)
    ongoingZEntropy: 0.05,         // per-frame jitter vz (minimal for orbital stability)
    explosionStrength: 5000,        // click explosion strength
    orbitCaptureZ: 0.25,           // Z threshold for binding (electrons)    bhGravity: 50000,              // black-hole gravitational G
    bhLifetime: 3,                 // black-hole lifespan (s)
    electronOrbitScale: 5.0,       // increased for better orbit visibility
    scaleFactor: 2.0,              // zoom: larger = closer/larger
    centralAttractor: {
        enabled: true,             // enable/disable the central attractor
        strength: 10,           // gravitational strength of central attractor (increased to match black hole)
        position: {x: 0, y: 0, z: 0} // position of central attractor (center of world)
    },

    // Particles
    ElectronAmount: 60,            // initial electron count (slightly reduced for clearer orbits)
    ElectronSize: 4,               // electron size in pixels (increased for visibility)
    ProtonAmount: 40,              // initial proton count
    ProtonSize: 9,                 // proton size in pixels 
    NeutronAmount: 40,             // initial neutron count
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

// Expose SIM_SETTINGS to window for external UI control
window.SIM_SETTINGS = SIM_SETTINGS;

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
let camera = null;
let renderer = null;

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
const particles = [];
const blackHoles = [];
let container = null;
let centralAttractorElement = null;

// Will be called after DOM is available
function initializeDOM() {
  // Get container
  container = document.querySelector('.container');
    // Create central attractor visual indicator
  centralAttractorElement = document.createElement('div');
  centralAttractorElement.className = 'central-attractor';
  centralAttractorElement.style.position = 'absolute';
  centralAttractorElement.style.width = '15px';
  centralAttractorElement.style.height = '15px';
  centralAttractorElement.style.borderRadius = '50%';
  centralAttractorElement.style.background = 'rgba(255, 255, 255, 0.125)';
  centralAttractorElement.style.boxShadow = '0 0 10px 5px rgba(255, 255, 255, 0.7)';
  centralAttractorElement.style.pointerEvents = 'none';
  centralAttractorElement.style.zIndex = '5';
  centralAttractorElement.style.left = '50%';
  centralAttractorElement.style.top = '50%';
  centralAttractorElement.style.transform = 'translate(-50%, -50%)';
  container.appendChild(centralAttractorElement);
}

// Position update function for central attractor
function updateCentralAttractorPosition() {
  if (!centralAttractorElement) return;
  
  try {
    // Central attractor is at world origin
    const attractor = {
      x: SIM_SETTINGS.centralAttractor.position.x,
      y: SIM_SETTINGS.centralAttractor.position.y,
      z: SIM_SETTINGS.centralAttractor.position.z
    };
    
    // Convert to screen coordinates
    const screenX = window.innerWidth / 2;
    const screenY = window.innerHeight / 2;
    
    // For simplicity, just position in center of screen
    centralAttractorElement.style.left = `${screenX}px`;
    centralAttractorElement.style.top = `${screenY}px`;
    centralAttractorElement.style.transform = 'translate(-50%, -50%)';
    
    // Update visual appearance based on enabled state
    centralAttractorElement.style.opacity = SIM_SETTINGS.centralAttractor.enabled ? '1' : '0.3';    // Simple brightness adjustment based on strength
    if (SIM_SETTINGS.centralAttractor.enabled) {
      centralAttractorElement.style.opacity = '1';
      centralAttractorElement.style.boxShadow = '0 0 50px 8px rgba(255, 255, 255, 0.7)';
    } else {
      centralAttractorElement.style.opacity = '0.3';
      centralAttractorElement.style.boxShadow = '0 0 5px 2px rgba(255, 255, 255, 0.7)';
    }
  } catch (err) {
    console.error("Error updating central attractor:", err);
  }
}

// Function to create particles
function createParticles() {
  if (!container) return;
  
  // Clear any existing particles
  while (particles.length > 0) {
    particles.pop();
  }
  
  // Create new particles
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
        container.appendChild(el);        // Generate random position using physics helper
        // For electrons, create a wider distribution to increase chances of finding protons
        // For protons and neutrons, create a tighter distribution to increase binding probability
        const position = type.name === 'electron' 
            ? randomSphericalCoords(150, 450) 
            : type.name === 'proton' || type.name === 'neutron'
                ? randomSphericalCoords(50, 350) // Tighter distribution for nucleons
                : randomSphericalCoords(100, 400);
        
        // Generate random velocity using physics helper
        // Electrons need initial velocity for proper orbital capture
        // Neutrons and protons need lower initial velocity for better binding
        const entropyValue = type.name === 'electron' 
            ? SIM_SETTINGS.initialEntropy * 1.5 
            : type.name === 'proton' || type.name === 'neutron' 
                ? SIM_SETTINGS.initialEntropy * 0.7 // Reduced for better binding
                : SIM_SETTINGS.initialEntropy;
      
      const velocity = randomVelocityVector(entropyValue);
      
      // Get mass from type's mass range
      const mass = type.massRange[0] + Math.random() * (type.massRange[1] - type.massRange[0]);
      
      // Create particle object (data + DOM element)
      const particle = {
        // Position
        x: position.x, 
        y: position.y, 
        z: position.z,
        // Velocity
        vx: velocity.x, 
        vy: velocity.y, 
        vz: velocity.z,
        // Properties
        name: type.name,
        charge: type.charge,
        mass: mass,
        color: type.color,
        spin: Math.random() < 0.5 ? -0.5 : 0.5, // Quantum spin, -1/2 or +1/2 (scaled)
        // Rendering element
        el: el,
        // For tracking electron-proton bonding
        boundTo: null,
        orbiting: null,
        nucleusId: null
      };
      
      particles.push(particle);
    }
  }
}

// initial p–n binding (reset to ensure binding works)
(() => {
    const protons  = particles.filter(p => p.name==='proton');
    const neutrons = particles.filter(p => p.name==='neutron');
    const pairs    = Math.min(protons.length, neutrons.length);
    
    // High binding rate to ensure we see nucleon binding
    const bindCount = Math.floor(pairs * 0.8);
    
    // Create arrays to keep track of which particles we've already used
    const usedProtons = [];
    const usedNeutrons = [];
    
    // First pass: create neutron-proton pairs
    for (let i=0; i<bindCount; i++) {        // Find unused proton
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

        // Position neutron close to proton for reliable binding
        // Fixed positioning with slight random offset
        const offset = 20; // Fixed closer distance
        n.x = p.x + (Math.random() * 2 - 1) * offset;
        n.y = p.y + (Math.random() * 2 - 1) * offset;
        n.z = p.z + (Math.random() * 2 - 1) * offset;

        // Give gentle velocity for stable binding
        n.vx = p.vx + (Math.random() * 10 - 5);
        n.vy = p.vy + (Math.random() * 10 - 5);
        n.vz = p.vz + (Math.random() * 10 - 5);
        
        // Add a nucleus identifier to help with visualization
        n.nucleusId = i;
        p.nucleusId = i;
    }
      // Second pass: create larger nuclei by binding additional neutrons to existing pairs
    if (bindCount > 5) {
        // Number of larger nuclei to create (with 3 or 4 particles)
        const largeNucleiCount = Math.min(10, Math.floor(bindCount/3)); // Increased from 5 to 10 and from bindCount/5 to bindCount/3
        
        for (let i=0; i<largeNucleiCount; i++) {
            // Select a bound proton to attach another neutron to
            const nucleusId = Math.floor(Math.random() * bindCount);
            const primaryProton = protons.find(p => p.nucleusId === nucleusId);
            
            if (!primaryProton) {
                continue;
            }
            
            // Find an unused neutron
            let neutronIndex;
            do {
                neutronIndex = Math.floor(Math.random() * neutrons.length);
            } while (usedNeutrons.includes(neutronIndex));
            
            // If we can't find an unused neutron, skip this iteration
            if (neutronIndex === undefined) {
                continue;
            }
            
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
    
    // Third pass: create proton-proton bindings (helium nuclei)
    // Only try this if we have enough unused protons
    const remainingProtons = protons.filter(p => !usedProtons.includes(protons.indexOf(p)));
    if (remainingProtons.length >= 2) {
        // Number of p-p pairs to create
        const ppPairsCount = Math.min(5, Math.floor(remainingProtons.length / 2));
        
        for (let i=0; i<ppPairsCount; i++) {
            // Find two unused protons
            let proton1Index, proton2Index;
            do {
                proton1Index = Math.floor(Math.random() * protons.length);
            } while (usedProtons.includes(proton1Index));
            usedProtons.push(proton1Index);
            
            do {
                proton2Index = Math.floor(Math.random() * protons.length);
            } while (usedProtons.includes(proton2Index));
            usedProtons.push(proton2Index);
            
            const p1 = protons[proton1Index];
            const p2 = protons[proton2Index];
            
            // Create binding between protons
            p1.boundTo = p2;
            p2.boundTo = p1;
            
            // Position them closer together to overcome repulsion
            const binding = createNucleonBinding(p1, p2, SIM_SETTINGS);
            
            // Apply new position and velocity to second proton
            p2.x = binding.x;
            p2.y = binding.y;
            p2.z = binding.z;
            p2.vx = binding.vx;
            p2.vy = binding.vy;
            p2.vz = binding.vz;
            
            // Assign a unique nucleus ID
            const newNucleusId = bindCount + i;
            p1.nucleusId = newNucleusId;
            p2.nucleusId = newNucleusId;
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

// Function to set up event listeners
function setupEventListeners() {
  if (!container) return;
  
  // Explosions
  container.addEventListener('click', evt => {
    if (!evt.target.classList.contains('firefly')) {
      // If clicking outside the settings menu, hide it if visible
      const settingsMenu = document.querySelector('.force-controls-popup');
      if (settingsMenu && settingsMenu.style.display !== 'none') {
        settingsMenu.style.display = 'none';
      }
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
  
  // Show settings menu on right-click
  container.addEventListener('contextmenu', evt => {
    evt.preventDefault();
    
    // Get the force controls element
    const forceControls = document.querySelector('.force-controls');
    if (!forceControls) {
      return;
    }
    
    // Turn it into a popup at the cursor position
    forceControls.classList.add('force-controls-popup');
    forceControls.style.display = 'block';
    forceControls.style.position = 'fixed';
    forceControls.style.top = `${evt.clientY}px`;
    forceControls.style.left = `${evt.clientX}px`;
    
    // Ensure it stays within the viewport bounds
    const rect = forceControls.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      forceControls.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      forceControls.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
  });

  // Begin drag
  container.addEventListener('mousedown', e => {
    // Don't start dragging if clicked on the settings menu
    if (e.target.closest('.force-controls')) {
      return;
    }
    
    dragging = true;
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;
    slowDownActive = true;
  });

  // End drag
  container.addEventListener('mouseup', () => {
    dragging = false;
    slowDownActive = false;
  });

  // Adjust orbit velocity on drag
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

  // Zoom focal plane on wheel
  container.addEventListener('wheel', e => {
    e.preventDefault();
    camera.adjustFocus(e.deltaY);
  }, { passive: false });

  // Toggle axes visibility with 'A' key
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'a') {
      // Call the toggle function we imported
      const axesVisible = toggleAxesVisibility();
      console.log(`Axes visibility: ${axesVisible ? 'ON' : 'OFF'}`);
    }
  });
  
  // Hide settings menu when clicking outside
  document.addEventListener('click', e => {
    const forceControls = document.querySelector('.force-controls-popup');
    if (forceControls && !forceControls.contains(e.target)) {
      forceControls.style.display = 'none';
    }
  });
}

// Initialize the simulation
function initializeSimulation() {
  try {
    // Initialize DOM elements
    initializeDOM();
    
    // Initialize camera and renderer
    camera = new Camera(SIM_SETTINGS);
    renderer = new Renderer(SIM_SETTINGS, container);
    
    // Create particles
    createParticles();
    
    // Set up event listeners
    setupEventListeners();
    
    // Add particles to renderer
    renderer.createParticleElements(particles);
    renderer.createAxisElements(axes);
    
    // Start the animation loop
    requestAnimationFrame(update);
    console.log("Simulation initialized successfully");
  } catch (error) {
    console.error("Error initializing simulation:", error);
  }
}

// main loop
function update() {
    if (!camera || !renderer) {
      return;
    }
    
    const { dt, slowFactor, focalLength } = SIM_SETTINGS;

    // Ensure quantum mechanics module is using current settings
    updateConstants(SIM_SETTINGS);

    // Update camera
    camera.update(dt, slowFactor, slowDownActive);    // Update physics using physics engine - blackHoles array is now empty since we removed right-click black hole creation
    updateParticlePhysics(particles, [], SIM_SETTINGS, WRAP_DISTANCE);

    // Render using our rendering engine
    renderer.renderAxes(axes, camera, focalLength);
    renderer.renderParticles(particles, camera, focalLength);
    
    // Visualize quantized shells if debug mode is enabled
    if (SIM_SETTINGS.debugQuantumOrbits) {
        visualizeQuantumShells();
    }

    // Update central attractor position
    if (centralAttractorElement) {
      updateCentralAttractorPosition();
    }

    // Continue the animation loop
    requestAnimationFrame(update);
}

// Export the initialization function to be called after DOM is ready
export function startSimulation() {
  initializeSimulation();
}
