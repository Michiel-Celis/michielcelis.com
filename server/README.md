# API Proxy Setup

This folder contains a simple Express server that acts as a proxy for OpenAI API requests, keeping your API key secure on the server side instead of exposing it in the client-side code.

## Setup

1. First, install the dependencies:
   ```
   cd server
   npm install
   ```

2. Create a `.env` file in the root directory (one level up from the server folder) with your OpenAI API key:
   ```
   OPENAI_API_KEY=your-actual-api-key-here
   PORT=3000
   NODE_ENV=development
   ```

3. Start the server:
   ```
   npm start
   ```

## Development

To run both the Vue frontend and API proxy server concurrently:
```
npm run dev
```

## Production

For production deployment:
1. Build the Vue frontend: `npm run build`
2. Start the production server: `npm run serve`

The server will serve both the API proxy and the static Vue files from the `dist` directory.
