<template>
  <div class="particle-simulator-container">
    <div class="container"></div>
  </div>
</template>

<script>
export default {
  name: 'ParticleSimulator',
  mounted() {
    // Add a short delay to ensure the DOM is fully rendered
    setTimeout(() => {
      // Import the simulation logic when the component is mounted
      import('./ParticleSimulator.js').then(() => {
        console.log('Particle simulator initialized');
      });
    }, 200);
  }
}
</script>

<style scoped>
.particle-simulator-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  overflow: hidden;
}

.container {
  width: 100%;
  height: 100%;
}

:deep(.firefly) {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  transform-origin: center center;
  transition: filter 0.1s ease-out, opacity 0.1s ease-out;
  will-change: transform, opacity, filter;
  pointer-events: auto;
}
</style>