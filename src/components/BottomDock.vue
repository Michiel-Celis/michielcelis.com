<template>
  <div class="bottom-dock-container">
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

    <!-- Expandable Panel -->
    <transition name="slide-up">
      <div v-if="isPanelOpen" class="bottom-panel">
        <div class="panel-header">
          <h3>{{ panelTitle }}</h3>
          <button class="close-button" @click="closePanel">&times;</button>
        </div>

        <!-- Chat Panel -->
        <div v-if="activeTab === 'chat'" class="panel-content chat-panel">
          <div class="api-key-status" v-if="!apiKey">
            <button class="api-key-button" @click="showApiKeyModal = true">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
              Set OpenAI API Key
            </button>
            <p class="api-key-info">The chat feature requires an OpenAI API key</p>
          </div>
          
          <div class="chat-messages" ref="chatMessages">
            <div v-for="(message, index) in chatMessages" :key="index" class="message" :class="message.type">
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
            <input 
              type="text" 
              v-model="newMessage" 
              placeholder="Type your message..." 
              @keyup.enter="sendMessage"
              :disabled="!apiKey || isTyping"
            />
            <button class="send-button" @click="sendMessage" :disabled="!apiKey || isTyping">
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
    </transition>
    
    <!-- API Key Modal -->
    <ApiKeyModal 
      :show="showApiKeyModal" 
      @close="showApiKeyModal = false"
      @api-key-saved="setApiKey"
    />
  </div>
</template>

<script>
import { sendChatMessage, formatChatHistory, initConversation } from '../services/openai';
import ApiKeyModal from './ApiKeyModal.vue';

export default {
  name: 'BottomDock',
  components: {
    ApiKeyModal
  },
  data() {
    return {
      activeTab: null,
      isPanelOpen: false,
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
      apiKey: '',
      showApiKeyModal: false,
      aiConversation: []
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
      if (this.activeTab === tab && this.isPanelOpen) {
        this.isPanelOpen = false;
      } else {
        this.activeTab = tab;
        this.isPanelOpen = true;
      }
    },
    closePanel() {
      this.isPanelOpen = false;
    },
    formatTime(date) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    async sendMessage() {
      if (!this.newMessage.trim() || !this.apiKey) return;
      
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
        
        // Send request to OpenAI API
        const response = await sendChatMessage(this.aiConversation, this.apiKey);
        
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
        // Handle error
        this.chatMessages.push({
          type: 'system',
          text: `Error: ${error.message || 'Failed to get response'}. Please check your API key.`,
          time: this.formatTime(new Date()),
          isError: true
        });
        
        console.error('Chat error:', error);
      } finally {
        this.isTyping = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        if (this.$refs.chatMessages) {
          this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight;
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
    setApiKey(key) {
      this.apiKey = key;
      this.showApiKeyModal = false;
      
      // Add a confirmation message to chat
      this.chatMessages.push({
        type: 'system',
        text: 'API key set successfully! You can now chat with the AI assistant.',
        time: this.formatTime(new Date()),
        isNotification: true
      });
      this.scrollToBottom();
    },
    loadApiKeyFromStorage() {
      try {
        const storedKey = localStorage.getItem('openai_api_key');
        if (storedKey) {
          this.apiKey = storedKey;
        }
      } catch (error) {
        console.error('Failed to load API key from storage:', error);
      }
    }
  },
  mounted() {
    this.loadApiKeyFromStorage();
    
    // If no API key is found, show a notification in chat
    if (!this.apiKey && this.activeTab === 'chat') {
      this.chatMessages.push({
        type: 'system',
        text: 'To chat with AI, please set your OpenAI API key.',
        time: this.formatTime(new Date()),
        isNotification: true
      });
    }
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

/* Expandable Panel */
.bottom-panel {
  background-color: rgba(40, 40, 40, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
  padding: 15px;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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
  padding: 0 15px;
  width: 100%;
  max-width: 800px;
}

/* Chat Panel */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 300px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

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

.message-content {
  margin-bottom: 4px;
}

.message-time {
  font-size: 10px;
  opacity: 0.7;
  text-align: right;
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

.send-button:hover {
  background-color: #006cbe;
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

/* Animation */
.slide-up-enter-active, 
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.slide-up-enter-from, 
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

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
</style>
