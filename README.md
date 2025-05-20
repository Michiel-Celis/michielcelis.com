# Particle Physics Simulation with OpenAI Assistant

This project is a particle physics simulation with an integrated OpenAI Assistant chatbot. The application uses Vue.js for the frontend and has a Node.js server to securely handle OpenAI API requests.

## Features

- Interactive particle physics simulation
- Settings panel with various physics controls
- Bottom dock with chat, downloads, and information sections
- Integration with OpenAI Assistant API (server-side)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- OpenAI API key with access to Assistants API v2

### Initial Setup

1. **Configure your environment variables:**

   Edit the `.env` file in the root directory and add your OpenAI API key:

   ```
   # Your OpenAI API key
   OPENAI_API_KEY=your_api_key_here
   
   # Your OpenAI Assistant ID (must be compatible with v2 API)
   OPENAI_ASSISTANT_MODEL=your_assistant_id_here
   
   PORT=3000
   NODE_ENV=development
   ```

   > **Important Note:** This application uses the OpenAI Assistants API v2. Make sure your OpenAI API key has access to this version and your assistant ID is configured for v2.
   ```

2. **Install dependencies:**

   ```
   npm install
   ```

### Running the Application

#### Option 1: Using the start script (Windows)

Simply run the included start.bat file:

```
start.bat
```

This will install dependencies and start both the Vue app and the API server.

#### Option 2: Manual start

Start both the frontend and API server simultaneously:

```
npm run dev:all
```

Or start them separately:

```bash
# In one terminal:
npm run server
```

```bash
# In another terminal:
npm run dev
```

## Development

### Directory Structure

- `src/` - Vue application source code
  - `components/` - Vue components
  - `services/` - API services and utilities
  - `simulation/` - Particle physics simulation code
- `server/` - Node.js server for securely handling API requests
- `public/` - Static assets and downloadable files

### How it Works

1. The frontend sends chat messages to the server-side proxy
2. The server proxy handles communication with OpenAI's Assistant API using your API key
3. Thread IDs are maintained for conversation continuity
4. The frontend displays the responses in a chat interface

## Production Deployment

1. Build the Vue app:

   ```bash
   npm run build
   ```

2. Set the environment variables in your production environment:

   ```properties
   NODE_ENV=production
   OPENAI_API_KEY=your_api_key_here
   OPENAI_ASSISTANT_MODEL=your_assistant_id_here
   PORT=3000 (or your preferred port)
   ```

3. Start the server:

   ```bash
   npm run server
   ```

---

## Security Notes

- The OpenAI API key is stored server-side and never exposed to the client
- The `.env` file should never be committed to version control
- In production, use proper environment variable management for your hosting platform

---

## Troubleshooting

### OpenAI API Issues

1. **API Version Error**: If you see an error about `assistants=v2`, make sure your server is using the v2 version of the Assistants API. This is set in the `api-proxy.js` file.

2. **Authentication Error**: If you see authentication errors, verify your API key in the `.env` file and ensure it has access to the Assistants API.

3. **Assistant ID Invalid**: Make sure your Assistant ID in the `.env` file is correct and configured for v2 of the API.

### Server Connection Issues

1. **Server Unreachable**: Check that both the Vue dev server and the Node.js API server are running.

2. **Check Server Health**: Use the health check button in the chat interface (wrench icon) to verify server status.

3. **CORS Issues**: If you're seeing CORS errors in the console, ensure the server's CORS configuration is correct.

### Debugging Tips

1. Check server logs in the terminal running the API server
2. Use the browser developer tools console to check for client-side errors
3. Run the server with additional logging:

   ```bash
   # In a PowerShell terminal
   $env:DEBUG="*"; npm run server
   ```

---

© 2025 Michiel Celis
