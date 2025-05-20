// Simple Express server to proxy OpenAI API requests
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Your OpenAI API Key and Assistant ID stored securely on the server
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ASSISTANT_MODEL = process.env.OPENAI_ASSISTANT_MODEL;
const OPENAI_ORG_KEY = process.env.OPENAI_ORG_KEY;

// Validate that required variables exist
if (!OPENAI_API_KEY) {
  console.error('Error: OpenAI API key not found. Please add it to your .env file.');
  process.exit(1);
}

if (!OPENAI_ASSISTANT_MODEL) {
  console.error('Error: OpenAI Assistant model ID not found. Please add it to your .env file.');
  process.exit(1);
}

// Check API key and Assistants API availability
async function validateApiKey() {
  try {
    console.log('Validating OpenAI API key and permissions...');
    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    };
    
    // Add organization header if available
    if (OPENAI_ORG_KEY) {
      headers['OpenAI-Organization'] = OPENAI_ORG_KEY;
      console.log('Using organization ID for API requests');
    }
    
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers,
      timeout: 10000 // 10 second timeout
    });
    
    // Check if gpt-3.5-turbo model is available (needed for Assistants API)
    const assistantsModels = response.data.data.filter(model => 
      model.id.includes('gpt-3.5-turbo') || model.id.includes('gpt-4')
    );
    
    if (assistantsModels.length === 0) {
      console.warn('Warning: No GPT-3.5 or GPT-4 models available with this API key');
    } else {
      console.log(`Available models for Assistants API: ${assistantsModels.map(m => m.id).join(', ')}`);
    }
    
    console.log('API key validation successful!');
    return true;
  } catch (error) {
    console.error('Error validating API key:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('Authentication error: The API key appears to be invalid');
      } else if (error.response.status === 403) {
        console.error('Authorization error: The API key is valid but lacks the necessary permissions');
      }
    }
    return false;
  }
}

// Check if the assistant exists
async function verifyAssistant() {
  try {
    console.log('Verifying assistant model ID...');
    const headers = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    };
    
    // Add organization header if available
    if (OPENAI_ORG_KEY) {
      headers['OpenAI-Organization'] = OPENAI_ORG_KEY;
    }
    
    const response = await axios.get(`https://api.openai.com/v1/assistants/${OPENAI_ASSISTANT_MODEL}`, {
      headers,
      timeout: 10000 // 10 second timeout
    });
    
    console.log(`Assistant found: ${response.data.name}`);
    console.log(`Assistant model: ${response.data.model}`);
    
    // Check if the assistant is correctly configured
    if (!response.data.tools || response.data.tools.length === 0) {
      console.log('Note: This assistant has no tools configured.');
    } else {
      console.log(`Assistant has ${response.data.tools.length} tools configured.`);
    }
    
    return true;
  } catch (error) {
    console.error('Error verifying assistant ID:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      if (error.response.status === 404) {
        console.error(`Assistant with ID ${OPENAI_ASSISTANT_MODEL} not found. Please check your .env file.`);
      } else if (error.response.status === 401) {
        console.error('Authentication error: The API key appears to be invalid for Assistants API access');
      }
    }
    return false;
  }
}

// Run the validation
validateApiKey().catch(err => {
  console.error('Failed to validate OpenAI API key:', err);
});

// Verify the assistant
verifyAssistant().catch(err => {
  console.error('Failed to verify assistant:', err);
});

// In-memory store for managing threads
const threadStore = new Map();

// Clean up old threads periodically (once per hour)
setInterval(() => {
  const now = new Date();
  for (const [threadId, data] of threadStore.entries()) {
    // Remove threads older than 24 hours
    if ((now - data.created) > 24 * 60 * 60 * 1000) {
      threadStore.delete(threadId);
      console.log(`Cleaned up thread: ${threadId}`);
    }
  }
}, 60 * 60 * 1000);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check API key validity
    const apiKeyValid = await validateApiKey();
    
    res.json({ 
      status: 'ok', 
      apiVersion: 'assistants=v2',
      assistantId: OPENAI_ASSISTANT_MODEL,
      apiKeyValid: apiKeyValid,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
});

// Proxy route for OpenAI Assistant API
app.post('/api/chat', async (req, res) => {
  // Define requestTimeout variable at function scope so it's accessible in catch block
  let requestTimeout;
  
  try {
    console.log('Received chat request:', JSON.stringify(req.body, null, 2));
    
    // Validate request body
    if (!req.body || !req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({
        error: {
          message: 'Invalid request format. Expected messages array.'
        }
      });
    }
    
    const { messages, threadId } = req.body;
    const userMessage = messages[messages.length - 1]?.content;
    
    if (!userMessage) {
      return res.status(400).json({
        error: {
          message: 'No message provided'
        }
      });
    }
    
    console.log(`Processing message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
    console.log(`Using thread ID: ${threadId || 'Creating new thread'}`);
    
    // Set an overall timeout for the whole request
    requestTimeout = setTimeout(() => {
      console.error('Request timeout reached');
      if (!res.headersSent) {
        res.status(504).json({
          error: {
            message: 'Request timeout exceeded'
          }
        });
      }
    }, 60000); // 1 minute timeout    // Headers for all OpenAI API requests
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v2'
    };
    
    // Add organization ID if available
    if (OPENAI_ORG_KEY) {
      headers['OpenAI-Organization'] = OPENAI_ORG_KEY;
    }
    
    // Get or create thread
    let currentThreadId = threadId;
    if (!currentThreadId) {
      // Create a new thread
      const threadResponse = await axios.post(
        'https://api.openai.com/v1/threads',
        {},
        { headers }
      );
      currentThreadId = threadResponse.data.id;
      threadStore.set(currentThreadId, { created: new Date() });
    }
    
    // Add message to thread
    await axios.post(
      `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
      { 
        role: 'user',
        content: userMessage
      },
      { headers }
    );
      // Run the assistant on the thread with retry logic
    let runId;
    let retryCount = 0;
    const maxRetries = 2;
    let runSuccess = false;
    
    while (!runSuccess && retryCount <= maxRetries) {      try {
        // Use a more reliable model for the run (override the assistant's default model)
        const runResponse = await axios.post(
          `https://api.openai.com/v1/threads/${currentThreadId}/runs`,
          { 
            assistant_id: OPENAI_ASSISTANT_MODEL,
            model: "gpt-4o" // Using gpt-4o as it's more reliable
          },
          { 
            headers,
            timeout: 30000 // 30 second timeout
          }
        );
        
        runId = runResponse.data.id;
        runSuccess = true;
        console.log(`Run initiated successfully with ID: ${runId}`);
      } catch (runError) {
        retryCount++;
        console.error(`Error starting run (attempt ${retryCount}/${maxRetries + 1}):`, runError.message);
        
        if (retryCount <= maxRetries) {
          console.log(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('All run attempts failed');
          clearTimeout(requestTimeout);
          return res.status(500).json({
            error: {
              message: 'Failed to initiate OpenAI Assistant run after multiple attempts'
            }
          });
        }
      }
    }
    
    // Poll for the run completion
    let runStatus = 'queued';
    let assistantResponse = '';
    let pollRetryCount = 0;
    const maxPollRetries = 1;
      while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'expired') {
      // Wait for a short time between polls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Get the run status
        const runStatusResponse = await axios.get(
          `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`,
          { 
            headers,
            timeout: 10000 // 10 second timeout for polling
          }
        );
        
        runStatus = runStatusResponse.data.status;
        console.log(`Run status: ${runStatus}`);
        
        if (runStatus === 'failed' || runStatus === 'expired') {
          console.error('Run status response data:', JSON.stringify(runStatusResponse.data, null, 2));
          
          const errorCode = runStatusResponse.data.last_error?.code;
          const errorMessage = runStatusResponse.data.last_error?.message || 'Unknown error';
          
          // If it's a server error from OpenAI, try to recover with a retry or friendly message
          if (errorCode === 'server_error' && errorMessage.includes('Sorry, something went wrong') && pollRetryCount < maxPollRetries) {
            pollRetryCount++;
            console.warn(`OpenAI server error detected, retrying with a new run (attempt ${pollRetryCount}/${maxPollRetries})`);
            
            // Cancel the current run if possible
            try {
              await axios.post(
                `https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}/cancel`,
                {},
                { headers }
              );
              console.log(`Cancelled run ${runId}`);
            } catch (cancelError) {
              console.error('Error canceling run:', cancelError.message);
            }
            
            // Start a new run after a short delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {              const newRunResponse = await axios.post(
                `https://api.openai.com/v1/threads/${currentThreadId}/runs`,
                { 
                  assistant_id: OPENAI_ASSISTANT_MODEL,
                  model: "gpt-4o" // Using gpt-4o as it's more reliable
                },
                { headers }
              );
              
              // Update run ID and reset status
              runId = newRunResponse.data.id;
              runStatus = 'queued';
              console.log(`Created new run ${runId} after error, attempt ${pollRetryCount}/${maxPollRetries}`);
              continue;
            } catch (retryRunError) {
              console.error('Error creating retry run:', retryRunError.message);
              // Fall through to the friendly message response below
            }
          }
          
          // If we've exhausted retries or retrying failed, send a fallback response
          console.warn('OpenAI server error detected, sending fallback response to client');
          
          // Clear the timeout
          clearTimeout(requestTimeout);
          
          // Return a friendly response instead of throwing an error
          return res.json({
            choices: [{
              message: {
                role: 'assistant',
                content: "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again in a moment."
              }
            }],
            thread_id: currentThreadId,
            server_error: true
          });
        }
      } catch (pollError) {
        console.error('Error polling run status:', pollError.message);
        // Continue polling despite errors
        continue;
      }
    }// Get the messages once the run is complete
    try {
      const messagesResponse = await axios.get(
        `https://api.openai.com/v1/threads/${currentThreadId}/messages`,
        { headers }
      );
      
      // Log successful message retrieval
      console.log('Successfully retrieved messages from thread');
        // Find the assistant's latest response
      const assistantMessages = messagesResponse.data.data
        .filter(msg => msg.role === 'assistant')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (assistantMessages.length > 0 && 
          assistantMessages[0].content && 
          assistantMessages[0].content.length > 0) {
            
        // In v2, content is an array of content blocks
        const contentBlocks = assistantMessages[0].content;
        
        // Extract text content from the blocks
        const textBlocks = contentBlocks
          .filter(block => block.type === 'text')
          .map(block => block.text.value);
          
        assistantResponse = textBlocks.join('\n\n');
        console.log(`Found assistant response: "${assistantResponse.substring(0, 50)}${assistantResponse.length > 50 ? '...' : ''}"`);
      } else {
        console.warn('No valid assistant response found in messages');
        assistantResponse = "I'm sorry, I couldn't generate a response. Please try again.";
      }
      
      // Clear the timeout before sending response
      clearTimeout(requestTimeout);
      
      // Return the response in a format similar to chat completions
      console.log('Sending response to client');
      return res.json({
        choices: [{
          message: {
            role: 'assistant',
            content: assistantResponse
          }
        }],
        thread_id: currentThreadId
      });
    } catch (messageError) {
      console.error('Error retrieving messages:', messageError);
      
      // Clear the timeout if it exists
      if (requestTimeout) {
        clearTimeout(requestTimeout);
      }
      
      // Send error response
      return res.status(500).json({
        error: {
          message: 'Error retrieving assistant messages: ' + messageError.message
        }
      });
    }
  } catch (error) {    // More detailed error logging
    console.error('OpenAI API Error:', error);
    
    // Clear any existing timeout - only if it exists
    if (requestTimeout) {
      clearTimeout(requestTimeout);
    }
    
    if (error.response) {
      console.error('Error response data:', JSON.stringify(error.response.data));
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', error.response.headers);
      
      // Handle API version error specifically
      if (error.response.data && 
          error.response.data.error && 
          error.response.data.error.message && 
          error.response.data.error.message.includes('assistants=v2')) {
        console.error('API VERSION ERROR: The Assistants API version is incorrect');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    
    // Send a properly formatted error response
    try {
      res.status(error.response?.status || 500).json({
        error: {
          message: error.response?.data?.error?.message || error.message || 'An error occurred while processing your request.'
        }
      });
    } catch (responseError) {
      console.error('Error sending error response:', responseError);
      // Fallback error response if JSON serialization fails
      res.status(500).send('Internal Server Error');
    }
  }
});

// Serve static files from the Vue app build directory in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Handle any requests that don't match the above
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`API proxy server running on port ${PORT}`);
  console.log('OpenAI Assistants API Version: v2');
  
  // Validate API key on startup
  try {
    const isValid = await validateApiKey();
    if (isValid) {
      console.log('✅ OpenAI API key is valid!');
      
      // Only check assistant if API key is valid
      const assistantValid = await verifyAssistant();
      if (assistantValid) {
        console.log('✅ OpenAI Assistant model is valid!');
      } else {
        console.error('❌ OpenAI Assistant model validation failed!');
        console.log('Please check your OPENAI_ASSISTANT_MODEL in the .env file');
      }
    } else {
      console.error('❌ OpenAI API key validation failed!');
    }
  } catch (err) {
    console.error('Error during validation:', err.message);
  }
});
