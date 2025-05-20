<script setup>
import ParticleSimulator from './simulation/ParticleSimulator.vue'
import ParticleForceControls from './simulation/ParticleForceControls.vue'
import BottomDock from './components/BottomDock.vue'
import { ref, onMounted } from 'vue'

// Reference to the SIM_SETTINGS object
const attractorEnabled = ref(true)
const attractorStrength = ref(50000)

// Function to update settings
function updateAttractorSettings() {
  // Get the SIM_SETTINGS object from the window
  const settings = window.SIM_SETTINGS
  if (settings) {
	settings.centralAttractor.enabled = attractorEnabled.value
	settings.centralAttractor.strength = attractorStrength.value
  }
}

// Initialize settings when mounted
onMounted(() => {
  // We need to wait for the simulator to initialize
  setTimeout(() => {
	if (window.SIM_SETTINGS) {
	  attractorEnabled.value = window.SIM_SETTINGS.centralAttractor.enabled
	  attractorStrength.value = window.SIM_SETTINGS.centralAttractor.strength
	}
  }, 500)
})
</script>

<template>
	<!-- ParticleSimulator will be rendered as background -->
	<ParticleSimulator />
	
	<!-- Settings panel (shown on right-click) -->
	<ParticleForceControls />
	
	<!-- Bottom Dock with Chat, Downloads and Info -->
	<BottomDock />
</template>

<style scoped>
.content {
  position: relative;
  z-index: 10; /* Increased z-index to ensure it's above the particles */
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.settings-panel {
  position: fixed;
  top: 100px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  padding: 15px;
  color: white;
  z-index: 100;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  min-width: 200px;
}

.settings-panel h3 {
  margin-top: 0;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 5px;
}

.setting {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.setting label {
  flex: 1;
  margin-right: 10px;
}

.setting input[type="range"] {
  flex: 2;
}

.setting .value {
  margin-left: 10px;
  min-width: 30px;
  text-align: right;
}

.logos {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
  filter: drop-shadow(0 0 0.5em rgba(255, 255, 255, 0.5));
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

h1 {
  font-size: 3.2em;
  margin-bottom: 0.5rem;
  color: white;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

p {
  color: white;
  font-size: 1.2em;
  margin-bottom: 2rem;
  text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
}

.instructions {
  background: rgba(0, 0, 0, 0.5);
  padding: 1rem 2rem;
  border-radius: 8px;
  margin-top: 2rem;
  backdrop-filter: blur(5px);
}

.instructions p {
  margin: 0.5rem 0;
}
</style>
