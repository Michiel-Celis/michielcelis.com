// ES Module wrapper for the Node.js server
// This allows us to import the CommonJS server from ESM code

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the server
require('./api-proxy.js');
