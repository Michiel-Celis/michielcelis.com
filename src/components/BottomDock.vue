<template>
  <div class="bottom-dock-container">
    <div class="dock-wrapper" :class="{ 'panel-open': isPanelOpen }">
      <div class="sliding-container">
        <!-- Bottom Dock Navigation -->
        <div :class="['panel-drag-handle', { 'is-dragging': isDragging }]" @mousedown="startDragging"></div>
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
        </div>        <!-- Panel Content -->
        <div v-show="isPanelOpen" 
          class="bottom-panel activeTab" 
          :style="{ height: panelHeight + 'px' }">
          <div class="panel-header">
              <h3>{{ panelTitle }}</h3>
              <button class="close-button" @click="closePanel">&times;</button>
            </div>        <!-- Chat Panel -->
            <div v-if="activeTab === 'chat'" class="panel-content chat-panel">          <div class="chat-messages" ref="chatMessages">
                <div v-for="(message, index) in chatMessages" :key="index" class="message" :class="[message.type, { 'isError': message.isError }]">
                  <div class="message-content">{{ message.text }}</div>
                  <div class="message-time">{{ message.time }}</div>
                </div>
                <div v-if="isTyping" class="message system typing">
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
                <div class="chat-input">
                <button class="icon-button health-check" @click="checkServerHealth" title="Check Server Health">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>
                    <line x1="16" y1="8" x2="2" y2="22"></line>
                    <line x1="17.5" y1="15" x2="9" y2="15"></line>
                  </svg>
                </button>
                <input 
                  type="text" 
                  v-model="newMessage" 
                  placeholder="Type your message..." 
                  @keyup.enter="sendMessage"
                  :disabled="isTyping"
                />
                <button class="send-button" @click="sendMessage" :disabled="isTyping">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Downloads Panel -->
            <div v-if="activeTab === 'downloads'" class="panel-content downloads-panel">
              <div class="download-buttons">
                <button class="download-button" @click="downloadFile('resume')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Resume
                </button>
                <button class="download-button" @click="downloadFile('portfolio')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  Portfolio
                </button>
                <button class="download-button" @click="downloadFile('projects')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                  </svg>
                  Projects
                </button>
                <button class="download-button" @click="downloadFile('certificates')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="7"></circle>
                    <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                  </svg>
                  Certificates
                </button>
              </div>
            </div>

            <!-- Info Panel -->
            <div v-if="activeTab === 'info'" class="panel-content info-panel">
              <p>This interactive particle simulation was created as a demonstration of emergent behavior in complex systems. The simulation uses principles of physics to model interactions between different types of particles.</p>
              
              <div class="info-links">
                <a href="#" @click.prevent="showLicense" class="info-link">License Information</a>
                <a href="#" @click.prevent="showDisclaimer" class="info-link">Legal Disclaimer</a>
              </div>
              
              <p class="copyright">© 2025 Michiel Celis. All rights reserved.</p>
            </div>
          </div>   
        </div>
      </div>
    </div>
</template>

<script>
import { sendChatMessage, formatChatHistory, initConversation } from '../services/openai';

export default {
  name: 'BottomDock',
  data() {
    return {
      activeTab: null,
      isPanelOpen: false,
      isDragging: false,
      startY: 0,
      startHeight: 0,
      chatMessages: [
        {
          type: 'system',
          text: 'Welcome to the chat! How can I help you today?',
          time: this.formatTime(new Date()),
          isNotification: true
        }
      ],
      newMessage: '',
      downloadLinks: {
        resume: '/downloads/resume.pdf',
        portfolio: '/downloads/portfolio.pdf',
        projects: '/downloads/projects.pdf',
        certificates: '/downloads/certificates.pdf'
      },
      isTyping: false,
      aiConversation: [],
      panelHeight: 300 // Default panel height
    };
  },
  computed: {
    panelTitle() {
      switch (this.activeTab) {
        case 'chat':
          return 'Chat';
        case 'downloads':
          return 'Downloads';
        case 'info':
          return 'Information';
        default:
          return '';
      }
    }
  },
  methods: {
    toggleTab(tab) {
      // If clicking the same tab that's open, close it
      if (this.activeTab === tab && this.isPanelOpen) {
        this.closePanel();
      } else {
        // If opening a different tab while one is open, switch tabs without closing
        if (this.isPanelOpen && this.activeTab !== tab) {
          // Small delay to allow smooth transition between panels
          this.activeTab = tab;
        } else {
          // If no panel is open, open the selected tab
          this.activeTab = tab;
          this.isPanelOpen = true;
        }
      }
      
      // If opening chat panel, scroll to bottom of messages after transition
      if (tab === 'chat' && this.isPanelOpen) {
        this.$nextTick(() => {
          setTimeout(() => {
            this.scrollToBottom();
          }, 300); // Match transition duration
        });
      }
    },
    closePanel() {
      this.isPanelOpen = false;
    },
    formatTime(date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },    async sendMessage() {
      if (!this.newMessage.trim()) return;
      
      const userMessage = this.newMessage.trim();
      this.newMessage = '';
      
      // Add user message to chat
      this.chatMessages.push({
        type: 'user',
        text: userMessage,
        time: this.formatTime(new Date())
      });
      
      // Initialize typing indicator
      this.isTyping = true;
      
      // Scroll to bottom after user message
      this.scrollToBottom();
        try {
        // Initialize conversation if it's empty
        if (this.aiConversation.length === 0) {
          this.aiConversation = initConversation('You are a helpful, friendly assistant. Keep your answers concise and clear.');
        }
        
        // Add user message to AI conversation
        this.aiConversation.push({
          role: 'user',
          content: userMessage
        });
        
        // Send request to OpenAI API through our server proxy
        const response = await sendChatMessage(this.aiConversation);
        
        // Add AI response to conversation
        this.aiConversation.push({
          role: 'assistant',
          content: response
        });
        
        // Add AI response to chat messages
        this.chatMessages.push({
          type: 'system',
          text: response,
          time: this.formatTime(new Date())
        });
      } catch (error) {
        // More specific error handling
        let errorMessage = error.message || 'Failed to get response from the chat server.';
        
        // Check for specific API errors
        if (errorMessage.includes('assistants=v2')) {
          errorMessage = 'OpenAI API version error. The server needs to be updated to use Assistants API v2.';
        } else if (errorMessage.includes('authentication')) {
          errorMessage = 'OpenAI API authentication error. Please check your API key in the .env file.';
        } else if (errorMessage.includes('Invalid JSON')) {
          errorMessage = 'Server response error. Please check the server logs for more details.';
        }
        
        // Add error message to chat
        this.chatMessages.push({
          type: 'system',
          text: `Error: ${errorMessage}`,
          time: this.formatTime(new Date()),
          isError: true
        });
        
        console.error('Chat error:', error);
      } finally {
        this.isTyping = false;
        this.scrollToBottom();
      }
    },    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatMessages) {
          this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight;
          this.adjustPanelHeight(); // Adjust height after scrolling
        }
      });
    },
    downloadFile(type) {
      const link = document.createElement('a');
      link.href = this.downloadLinks[type];
      link.download = `${type}.pdf`;
      link.click();
      
      // Add a notification to chat if chat tab is active
      if (this.activeTab === 'chat') {
        this.chatMessages.push({
          type: 'system',
          text: `Download started: ${type}.pdf`,
          time: this.formatTime(new Date()),
          isNotification: true
        });
        this.scrollToBottom();
      }
    },
    showLicense() {
      alert('License Information: This software is licensed under the MIT License.');
    },
    showDisclaimer() {
      alert('Legal Disclaimer: This software is provided "as is" without warranty of any kind.');
    },
    async checkServerHealth() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        let healthMessage = `Server Status: ${data.status === 'ok' ? 'Online' : 'Issues Detected'}\n`;
        healthMessage += `API Version: ${data.apiVersion || 'Unknown'}\n`;
        healthMessage += `API Key Valid: ${data.apiKeyValid ? 'Yes' : 'No'}\n`;
        healthMessage += `Assistant ID: ${data.assistantId || 'Not found'}\n`;
        healthMessage += `Server Time: ${data.serverTime || new Date().toISOString()}`;
        
        this.chatMessages.push({
          type: 'system',
          text: healthMessage,
          time: this.formatTime(new Date()),
          isNotification: true
        });
        
        this.scrollToBottom();
      } catch (error) {
        this.chatMessages.push({
          type: 'system',
          text: `Error checking server health: ${error.message || 'Server unreachable'}`,
          time: this.formatTime(new Date()),
          isError: true
        });
        
        this.scrollToBottom();
      }
    },
    // Adjust the panel height based on content
    adjustPanelHeight() {
      if (this.activeTab === 'chat' && this.$refs.chatMessages) {
        const messagesHeight = this.$refs.chatMessages.scrollHeight;
        const panelBaseHeight = 300; // Default height
        
        if (messagesHeight > panelBaseHeight - 100) { // Account for padding and input
          // Increase panel height up to a max of 50vh
          const newHeight = Math.min(messagesHeight + 100, window.innerHeight * 0.5);
          document.documentElement.style.setProperty('--chat-panel-height', `${newHeight}px`);
        } else {
          document.documentElement.style.setProperty('--chat-panel-height', `${panelBaseHeight}px`);
        }
      }
    },
    startDragging(event) {
      // If panel is closed, open it first
      if (!this.isPanelOpen) {
        this.isPanelOpen = true;
        this.activeTab = this.activeTab || 'chat'; // Default to chat if no tab was selected
      }

      this.isDragging = true;
      this.startY = event.clientY;
      this.startHeight = this.panelHeight;
      
      // Add event listeners for drag and release
      document.addEventListener('mousemove', this.doDrag);
      document.addEventListener('mouseup', this.stopDragging);
      
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
    },
    
    doDrag(event) {
      if (!this.isDragging) return;
      
      const deltaY = this.startY - event.clientY;
      const newHeight = this.startHeight + deltaY;
      
      // Close panel if dragged below minimum height
      if (newHeight < 300) {
        this.closePanel();
        this.stopDragging();
        return;
      }
      
      // Otherwise set the new height within constraints
      this.panelHeight = Math.min(
        Math.max(250, newHeight),
        window.innerHeight * 0.8
      );
    },
    
    stopDragging() {
      this.isDragging = false;
      document.removeEventListener('mousemove', this.doDrag);
      document.removeEventListener('mouseup', this.stopDragging);
      document.body.style.userSelect = '';
    }
  },  mounted() {
    // Initial welcome message is already set in data
    
    // Initialize conversation with system message
    this.aiConversation = [
      {
        role: 'system',
        content: 'You are a helpful assistant integrated into a particle physics simulation application.'
      }
    ];
  }
};
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

/* Container structure for smooth sliding */
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
  transform-origin: bottom;
}

.dock-wrapper:not(.panel-open) .sliding-container {
  transform: translateY(calc(100% - 52px)); /* Keep dock visible (52px = dock height) */
}

/* Bottom Panel Transitions */
.bottom-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  visibility: visible;
  position: relative; /* Added for drag handle */
  background-color: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
  padding: 15px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 250px;
  height: var(--panel-height, 300px);
  transition: height 0.1s ease, background-color 0.2s ease;
}

.bottom-panel.activeTab {
  min-height: 300px!important;
}


.panel-drag-handle.is-dragging {
  background-color: rgba(0, 120, 212, 0.5);
}

.dock-wrapper:not(.panel-open) .bottom-panel {
  visibility: hidden;
  pointer-events: none;
}

/* Bottom Dock */
.bottom-dock {
  display: flex;
  justify-content: center;
  padding: 6px 0;
  background-color: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.dock-icons {
  display: flex;
  gap: 20px;
}

.dock-icon {
  background: none;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dock-icon:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.1);
}

.dock-icon.active {
  color: #0078d4;
  background-color: rgba(0, 120, 212, 0.1);
}

/* Drag Handle */
.panel-drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transform: translateY(-50%);
  cursor: ns-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 1001;
}

.panel-drag-handle:hover {
  background-color: rgba(0, 120, 212, 0.5);
}

/* Expandable Panel */
.bottom-panel {
  background-color: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
  padding: 15px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  min-height: 250px;
  height: var(--panel-height, 300px);
  transition: height 0.1s ease;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 8px;
  width: 100%;
  max-width: 800px;
}

.panel-header h3 {
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
  opacity: 0.7;
  transition: opacity 0.2s;
}

.close-button:hover {
  color: #ff5555;
  opacity: 1;
}

.panel-content {
  padding: 0 16px;
  width: 100%;
  max-width: 800px;
}

/* Chat Panel */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 300px;
  /* Auto-growing panel for chat content */
  height: 100%;
  max-height: none;
  min-height: 250px;
}

/* GOOD WITH SCROLLBAR */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 24px 8px 24px;
  margin: 0px -16px -8px -16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Hide default scrollbar buttons */
.chat-messages::-webkit-scrollbar {
  display: none;
  width: 0px;
  background: transparent;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0;
}

/* For Firefox */
.chat-messages {
  scrollbar-width: none;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

/* Message styles */
.message {
  padding: 8px 12px;
  border-radius: 14px;
  max-width: 80%;
  word-wrap: break-word;
}

.message.system {
  background-color: rgba(0, 120, 212, 0.2);
  align-self: flex-start;
  border-bottom-left-radius: 2px;
}

.message.user {
  background-color: rgba(0, 120, 212, 0.4);
  align-self: flex-end;
  border-bottom-right-radius: 2px;
}

.message.system.typing {
  background-color: rgba(0, 120, 212, 0.1);
  padding: 10px;
}

.message-content {
  margin-bottom: 4px;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  text-align: right;
}

/* API Key related styles */
.api-key-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  margin-bottom: 15px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.api-key-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #0078d4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.api-key-button:hover {
  background-color: #006cbe;
}
.api-key-button:active {
  background-color: #006cbe;
}

.api-key-info {
  margin-top: 10px;
  font-size: 11px;
  opacity: 0.7;
}

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
}

.typing-indicator span {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.7);
  animation: typingAnimation 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) {
  animation-delay: 0s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.3s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes typingAnimation {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.chat-input {
  display: flex;
  margin-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
}

.chat-input input {
  flex: 1;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  padding: 8px 12px;
  border-radius: 16px;
  color: white;
  font-size: 12px;
  outline: none;
}

.chat-input input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-input input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.send-button {
  background-color: #0078d4;
  color: white;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-left: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.send-button:hover:not(:disabled) {
  background-color: #006cbe;
}

.send-button:disabled {
  background-color: rgba(0, 120, 212, 0.4);
  cursor: not-allowed;
}

/* Downloads Panel */
.downloads-panel {
  padding: 15px 0;
  width: 100%;
}

.download-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 15px;
  width: 100%;
}

.download-button {
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 12px;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.download-button:hover {
  background-color: rgba(0, 120, 212, 0.2);
  border-color: rgba(0, 120, 212, 0.3);
}

.download-button svg {
  opacity: 0.9;
}

/* Info Panel */
.info-panel {
  line-height: 1.6;
  padding: 15px 0;
  width: 100%;
}

.info-links {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.info-link {
  color: #0078d4;
  text-decoration: none;
  padding-bottom: 2px;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.info-link:hover {
  border-bottom-color: #0078d4;
}

.copyright {
  margin-top: 20px;
  opacity: 0.7;
  font-size: 11px;
}

/* Panel Transitions */
.bottom-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  visibility: visible;
}

.dock-wrapper:not(.panel-open) .bottom-panel {
  visibility: hidden;
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

/* Animation styles removed as we're using sliding-container animation */

/* Media queries for responsive design */
@media (max-width: 768px) {
  .panel-content,
  .panel-header {
    max-width: 100%;
    padding-left: 10px;
    padding-right: 10px;
  }
  
  .download-buttons {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}

@media (max-width: 480px) {
  .bottom-panel {
    max-height: 70vh;
  }
  
  .download-buttons {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 10px;
  }
  
  .dock-icons {
    gap: 10px;
  }
  
  .dock-icon {
    width: 36px;
    height: 36px;
  }
}

.message.system.isError {
  background-color: rgba(255, 70, 70, 0.3);
  border-left: 3px solid #ff4646;
  font-weight: 500;
}

.icon-button.health-check {
  background: none;
  border: none;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  padding: 5px;
  margin-right: 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.icon-button.health-check:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Drag Handle */
.panel-drag-handle {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transform: translateY(-50%);
  cursor: ns-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 1001;
}

.panel-drag-handle:hover {
  background-color: rgba(0, 120, 212, 0.5);
}

/* Removed the previous .panel-drag-handle styles as they are now merged */

/* Adjusted .bottom-panel for drag handle */
.bottom-panel {
  position: relative;
  /* existing styles... */
}
</style>
