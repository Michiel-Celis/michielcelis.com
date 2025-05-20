<template>
  <div class="api-key-modal" v-if="show">
    <div class="api-key-container">
      <div class="api-key-header">
        <h3>OpenAI API Key</h3>
        <button class="close-button" @click="closeModal">&times;</button>
      </div>
      
      <div class="api-key-content">
        <p>Please enter your OpenAI API key to enable chat functionality:</p>
        
        <div class="input-group">
          <input 
            type="password" 
            v-model="apiKey" 
            placeholder="sk-..." 
            :class="{ 'input-error': error }"
            @keyup.enter="saveApiKey"
          />
          <button 
            v-if="showToggleButton" 
            class="toggle-visibility-button"
            @click="toggleVisibility" 
            type="button"
          >
            {{ isVisible ? 'Hide' : 'Show' }}
          </button>
        </div>
        
        <p class="error-message" v-if="error">{{ error }}</p>
        
        <div class="remember-key">
          <input type="checkbox" id="remember-key" v-model="rememberKey" />
          <label for="remember-key">Remember key for this session</label>
        </div>
        
        <p class="info-text">Your API key will {{ rememberKey ? 'be stored in local storage' : 'not be stored' }}.</p>
      </div>
      
      <div class="api-key-actions">
        <button class="cancel-button" @click="closeModal">Cancel</button>
        <button class="save-button" @click="saveApiKey" :disabled="!isValidKey">Save</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ApiKeyModal',
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      apiKey: '',
      rememberKey: true,
      error: '',
      isVisible: false
    };
  },
  computed: {
    isValidKey() {
      return this.apiKey.trim().startsWith('sk-') && this.apiKey.length > 10;
    },
    showToggleButton() {
      return this.apiKey.length > 0;
    }
  },
  methods: {
    toggleVisibility() {
      this.isVisible = !this.isVisible;
    },
    saveApiKey() {
      if (!this.isValidKey) {
        this.error = 'Please enter a valid OpenAI API key starting with "sk-"';
        return;
      }
      
      this.error = '';
      
      // Store the API key if remember is checked
      if (this.rememberKey) {
        try {
          localStorage.setItem('openai_api_key', this.apiKey);
        } catch (error) {
          console.error('Failed to save API key to local storage:', error);
        }
      }
      
      // Emit the API key to parent components
      this.$emit('api-key-saved', this.apiKey);
      
      // Close the modal
      this.closeModal();
    },
    closeModal() {
      this.$emit('close');
    },
    initializeFromStorage() {
      try {
        const storedKey = localStorage.getItem('openai_api_key');
        if (storedKey) {
          this.apiKey = storedKey;
          if (this.autoSubmitIfStored) {
            this.saveApiKey();
          }
        }
      } catch (error) {
        console.error('Failed to retrieve API key from local storage:', error);
      }
    }
  },
  mounted() {
    this.initializeFromStorage();
  }
};
</script>

<style scoped>
.api-key-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.api-key-container {
  background-color: rgba(40, 40, 40, 0.9);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  width: 90%;
  max-width: 400px;
  color: white;
  font-size: 12px;
  overflow: hidden;
}

.api-key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.api-key-header h3 {
  margin: 0;
  font-weight: 500;
  font-size: 14px;
}

.api-key-content {
  padding: 15px;
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

.input-group {
  position: relative;
  margin: 15px 0;
}

input[type="password"],
input[type="text"] {
  width: 100%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
  padding-right: 50px;
}

input[type="password"]:focus,
input[type="text"]:focus {
  border-color: #0078d4;
}

.input-error {
  border-color: #d83b01 !important;
}

.toggle-visibility-button {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0 8px;
  font-size: 11px;
}

.toggle-visibility-button:hover {
  color: white;
}

.error-message {
  color: #d83b01;
  font-size: 11px;
  margin: 5px 0;
}

.remember-key {
  display: flex;
  align-items: center;
  margin: 15px 0;
}

.remember-key input {
  margin-right: 8px;
}

.info-text {
  font-size: 11px;
  opacity: 0.7;
}

.api-key-actions {
  display: flex;
  justify-content: flex-end;
  padding: 10px 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cancel-button,
.save-button {
  padding: 6px 12px;
  border-radius: 2px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.cancel-button {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  margin-right: 10px;
}

.cancel-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.save-button {
  background-color: #0078d4;
  color: white;
  border: none;
}

.save-button:hover {
  background-color: #006cbe;
}

.save-button:disabled {
  background-color: rgba(0, 120, 212, 0.5);
  cursor: not-allowed;
}
</style>
