<script setup>
import ParticleSimulator from './simulation/ParticleSimulator.vue'
</script>

<template>
  <!-- ParticleSimulator will be rendered as background -->
  <ParticleSimulator />
  
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
