/**
 * OpenAI Assistant API Service
 * 
 * This service provides methods to interact with the OpenAI Assistant API via a server-side proxy,
 * keeping the API key secure on the server.
 */

// Server proxy URL - using local path to leverage Vite's proxy
const API_PROXY_URL = '/api/chat';

// Store the thread ID for conversation continuity
let currentThreadId = null;

/**
 * Sends a chat message to OpenAI Assistant API through the server-side proxy
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Additional options
 * @returns {Promise} - Promise that resolves to the AI response
 */
export async function sendChatMessage(messages, apiKey = null, options = {}) {
  // We only need the latest message since the conversation history is stored in the thread
  const latestMessage = messages[messages.length - 1];

  const requestOptions = {
    messages: [latestMessage],
    threadId: currentThreadId // Include thread ID if we have one
  };
  try {
    console.log('Sending message to API proxy:', JSON.stringify(requestOptions));
    
    const response = await fetch(API_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestOptions)
    });
    
    // First check if the response has content
    const text = await response.text();
    
    if (!text) {
      throw new Error('Empty response from server');
    }
      // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON response from server: ' + e.message);
    }
    
    // Check for error in the response
    if (!response.ok) {
      const errorMessage = data.error?.message || 'Failed to connect to chat API';
      console.error('API Error:', errorMessage);
      throw new Error(errorMessage);
    }
    
    // Store the thread ID for future messages
    if (data.thread_id) {
      console.log('Received thread ID:', data.thread_id);
      currentThreadId = data.thread_id;
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from server');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Helper function to format chat history for OpenAI API
 * @param {Array} chatHistory - Array of message objects from the application
 * @returns {Array} - Formatted messages for OpenAI API
 */
export function formatChatHistory(chatHistory) {
  // Filter out system messages that are just UI notifications
  const relevantMessages = chatHistory.filter(msg => 
    !msg.isNotification && msg.text.trim() !== ''
  );

  // Format messages for OpenAI API
  return relevantMessages.map(msg => ({
    role: msg.type === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
}

/**
 * Initialize conversation with a system message
 * @param {String} systemMessage - Initial instruction for the AI
 * @returns {Array} - Array with the system message
 */
export function initConversation(systemMessage = 'You are a helpful assistant.') {
  return [{
    role: 'system',
    content: systemMessage
  }];
}
