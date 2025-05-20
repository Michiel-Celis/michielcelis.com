/**
 * OpenAI API Service
 * 
 * This service provides methods to interact with the OpenAI API,
 * primarily for chat completion functionality.
 */

// Default options for API requests
const defaultOptions = {
  model: "gpt-3.5-turbo", // Default model, can be overridden
  temperature: 0.7,       // Controls randomness: 0 is deterministic, 1 is creative
  max_tokens: 200         // Maximum number of tokens to generate
};

/**
 * Sends a chat message to OpenAI API
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} apiKey - OpenAI API Key
 * @param {Object} options - Additional options to override defaults
 * @returns {Promise} - Promise that resolves to the AI response
 */
export async function sendChatMessage(messages, apiKey, options = {}) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const requestOptions = {
    ...defaultOptions,
    ...options,
    messages
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestOptions)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to connect to OpenAI API');
    }

    const data = await response.json();
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
