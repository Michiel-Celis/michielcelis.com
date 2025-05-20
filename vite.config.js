import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Plugin to redirect to the primary URL on the dev server
function canonicalRedirectPlugin(primaryHost) {
  return {
    name: "canonical-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host;
        const forwardedProto = req.headers["x-forwarded-proto"];
        const isSecure = forwardedProto ? forwardedProto === "https" : Boolean(req.socket.encrypted);

        if ((host && host !== primaryHost) || !isSecure) {
          const url = `https://${primaryHost}${req.url}`;
          res.writeHead(301, { Location: url });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Redirect any request not matching the primary host or not using HTTPS to "michielcelis.com"
    canonicalRedirectPlugin("michielcelis.com"),
    vue()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001, // Different port to avoid conflict with SiftGlass
  }
})