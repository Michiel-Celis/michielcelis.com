<template>
  <div class="bottom-dock-container">
    <div class="dock-wrapper" :class="{ 'panel-open': isPanelOpen }">
      <div class="sliding-container">
        <!-- Bottom Dock Navigation -->
        <div class="bottom-dock">
          <div class="dock-icons">
            <button 
              class="dock-icon" 
              :class="{ active: activeTab === 'chat' }"
              @click="toggleTab('chat')"
              title="Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
            <button 
              class="dock-icon" 
              :class="{ active: activeTab === 'downloads' }"
              @click="toggleTab('downloads')"
              title="Downloads"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button 
              class="dock-icon" 
              :class="{ active: activeTab === 'info' }"
              @click="toggleTab('info')"
              title="Information"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Panel Content -->
        <div v-show="isPanelOpen" class="bottom-panel" :class="activeTab">
          <div class="panel-header">
            <h3>{{ panelTitle }}</h3>
            <button class="close-button" @click="closePanel">&times;</button>
          </div>
          <div v-if="activeTab === 'chat'" class="panel-content chat-panel">
            // ... rest of your existing panel content
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// ... your existing script content
</script>

<style scoped>
.bottom-dock-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.dock-wrapper {
  position: relative;
  transform: translateY(0);
  transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1);
}

.dock-wrapper.panel-open {
  transform: translateY(0);
}

.sliding-container {
  position: relative;
  transition: transform 0.3s cubic-bezier(0.33, 1, 0.68, 1);
}

.dock-wrapper:not(.panel-open) .sliding-container {
  transform: translateY(calc(100% - 52px)); /* Keep dock visible (52px = dock height) */
}

/* ... rest of your existing styles */

/* Panel Transitions */
.bottom-panel {
  opacity: 1;
  transition: opacity 0.2s ease;
}

.dock-wrapper:not(.panel-open) .bottom-panel {
  opacity: 0;
  pointer-events: none;
}

/* Panel specific heights */
.bottom-panel.chat {
  min-height: 300px;
  transition: min-height 0.3s ease;
}

.bottom-panel.downloads {
  min-height: 200px;
}

.bottom-panel.info {
  min-height: 180px;
}

/* ... rest of your existing styles */
</style>
