<template>
  <div class="force-controls">
    <div class="header">
      <h3>Settings Menu</h3>
      <button class="close-button" @click="hideMenu">&times;</button>
    </div>
    
	<h3>Attractor</h3>
	<div class="setting">
	  <label for="attractor-strength">Strength: {{ attractorStrength.toFixed(2) }}</label>
	  <input
		type="range"
		id="attractor-strength"
		v-model.number="attractorStrength"
		min="0"
		max="100"
		step="1"
		@input="updateAttractorSettings"
	  ></input>
	  <span class="value">{{ attractorStrength }}</span>
	</div>

	<h3>System Controls</h3>
	<div class="slider-container">
	  <label for="friction">Liquidity: {{ friction.toFixed(4) }}</label>
	  <input 
		id="friction" 
		type="range" 
		min="0.1" 
		max="1" 
		step="0.0001" 
		v-model.number="friction"
		@input="updateForces" 
	  />
	</div>
	
	<div class="slider-container">
	  <label for="ongoing-entropy">Entropy: {{ ongoingEntropy.toFixed(2) }}</label>
	  <input 
		id="ongoing-entropy" 
		type="range" 
		min="0" 
		max="100" 
		step="0.1" 
		v-model.number="ongoingEntropy"
		@input="updateForces" 
	  />
	</div>

	<h3>Particle Force Controls</h3>
	<div class="slider-container">
	  <label for="close-range-attraction">Close Range Attraction: {{ closeRangeAttraction.toFixed(2) }}</label>
	  <input 
		id="close-range-attraction" 
		type="range" 
		min="0" 
		max="100" 
		step="1" 
		v-model.number="closeRangeAttraction"
		@input="updateForces" 
	  />
	</div>
	
	<div class="slider-container">
	  <label for="electron-proton-attraction">Electron-Proton Attraction: {{ electronProtonAttraction.toFixed(2) }}</label>
	  <input 
		id="electron-proton-attraction" 
		type="range" 
		min="0" 
		max="100" 
		step="1" 
		v-model.number="electronProtonAttraction" 
		@input="updateForces"
	  />
	</div>
	
	<div class="slider-container">
	  <label for="proton-neutron-attraction">Proton-Neutron Attraction: {{ protonNeutronAttraction.toFixed(2) }}</label>
	  <input 
		id="proton-neutron-attraction" 
		type="range" 
		min="0" 
		max="100" 
		step="1" 
		v-model.number="protonNeutronAttraction" 
		@input="updateForces"
	  />
	</div>
	
	<div class="slider-container">
	  <label for="proton-proton-repulsion">Proton-Proton Repulsion: {{ protonProtonRepulsion.toFixed(2) }}</label>
	  <input 
		id="proton-proton-repulsion" 
		type="range" 
		min="0" 
		max="100" 
		step="1" 
		v-model.number="protonProtonRepulsion" 
		@input="updateForces"
	  />
	</div>
	
	<div class="slider-container">
	  <label for="electron-electron-repulsion">Electron-Electron Repulsion: {{ electronElectronRepulsion.toFixed(2) }}</label>
	  <input 
		id="electron-electron-repulsion" 
		type="range" 
		min="0" 
		max="100" 
		step="1" 
		v-model.number="electronElectronRepulsion" 
		@input="updateForces"
	  />
	</div>
	
	<button class="reset-button" @click="resetToDefaults">Reset to Defaults</button>
  </div>
</template>

<script>
export default {
  name: 'ParticleForceControls',
  data() {
	return {
		attractorStrength: 15.0,
		closeRangeAttraction: 15.0,
		electronProtonAttraction: 10.0,
		protonNeutronAttraction: 10.0,
		protonProtonRepulsion: 10.0,
		electronElectronRepulsion: 10.0,
		friction: 0.9999,
		ongoingEntropy: 5.0
	};
  },
  methods: {
	updateForces() {
		// Update the SIM_SETTINGS if they exist in the window object
		if (window.SIM_SETTINGS) {
		window.SIM_SETTINGS.centralAttractor.strength = this.attractorStrength;
		window.SIM_SETTINGS.closeRangeAttractionFactor = this.closeRangeAttraction;
		window.SIM_SETTINGS.electronProtonAttractionFactor = this.electronProtonAttraction;
		window.SIM_SETTINGS.protonNeutronAttractionFactor = this.protonNeutronAttraction;
		window.SIM_SETTINGS.protonProtonRepulsionFactor = this.protonProtonRepulsion;
		window.SIM_SETTINGS.electronElectronRepulsionFactor = this.electronElectronRepulsion;
		window.SIM_SETTINGS.friction = this.friction;
		window.SIM_SETTINGS.ongoingEntropy = this.ongoingEntropy;
		}
	},
	updateAttractorSettings() {
		// This is now redundant as we're updating all settings in updateForces
		this.updateForces();
	},
	resetToDefaults() {
		this.attractorStrength = 10.0;
		this.closeRangeAttraction = 1.0;
		this.electronProtonAttraction = 1.0;
		this.protonNeutronAttraction = 1.0;
		this.protonProtonRepulsion = 1.0;
		this.electronElectronRepulsion = 1.0;
		this.friction = 0.9999;
		this.ongoingEntropy = 5.0;
		this.updateForces();
	},
    hideMenu() {
      // Hide the menu when close button is clicked
      const forceControls = document.querySelector('.force-controls');
      if (forceControls) {
        forceControls.style.display = 'none';
      }
    }
  },
  mounted() {
	// Initialize values from SIM_SETTINGS if they exist
	if (window.SIM_SETTINGS) {
		this.attractorStrength = window.SIM_SETTINGS.centralAttractor.strength || 10;
		this.closeRangeAttraction = window.SIM_SETTINGS.closeRangeAttractionFactor || 1.0;
		this.electronProtonAttraction = window.SIM_SETTINGS.electronProtonAttractionFactor || 1.0;
		this.protonNeutronAttraction = window.SIM_SETTINGS.protonNeutronAttractionFactor || 1.0;
		this.protonProtonRepulsion = window.SIM_SETTINGS.protonProtonRepulsionFactor || 1.0;
		this.electronElectronRepulsion = window.SIM_SETTINGS.electronElectronRepulsionFactor || 1.0;
		this.friction = window.SIM_SETTINGS.friction || 0.9999;
		this.ongoingEntropy = window.SIM_SETTINGS.ongoingEntropy || 5.0;
	}
    
    // Initially hide the control panel - will show on right-click
    const forceControls = document.querySelector('.force-controls');
    if (forceControls) {
      forceControls.style.display = 'none';
    }
  },
};
</script>

<style scoped>
.force-controls {
  position: fixed;
  background-color: rgba(40, 40, 40, 0.7);
  color: white;
  padding: 15px;
  border-radius: 4px;
  width: 280px;
  z-index: 1000;
  font-family: 'Segoe UI', system-ui, sans-serif;
  font-size: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  max-height: 80vh;
  overflow-y: auto;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
}

.header h3 {
  margin: 0;
  font-weight: 500;
  font-size: 14px;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 0 5px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-button:hover {
  color: #ff5555;
  opacity: 1;
}

h3 {
  margin-top: 12px;
  margin-bottom: 8px;
  text-align: left;
  font-weight: 500;
  font-size: 13px;
  opacity: 0.9;
}

.slider-container {
  margin-bottom: 10px;
}

label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  opacity: 0.85;
  font-weight: 400;
}

input[type="range"] {
  width: 100%;
  height: 3px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  opacity: 0.8;
  transition: opacity .2s;
  margin: 8px 0;
}

input[type="range"]:hover {
  opacity: 1;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0078d4;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0078d4;
  cursor: pointer;
  border: none;
}

.reset-button {
  background-color: rgba(0, 120, 212, 0.8);
  color: white;
  border: none;
  padding: 8px 12px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 12px;
  margin: 10px 0 0;
  cursor: pointer;
  border-radius: 2px;
  width: 100%;
  transition: background-color 0.2s;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.reset-button:hover {
  background-color: rgba(0, 120, 212, 1);
}

.setting {
  margin-bottom: 10px;
}

.setting .value {
  font-size: 11px;
  opacity: 0.7;
  float: right;
}

/* Animation for the popup menu */
.force-controls-popup {
  animation: popIn 0.2s ease-out;
  transform-origin: top left;
}

@keyframes popIn {
  0% {
    transform: scale(0.98);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>