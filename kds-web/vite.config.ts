import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  server: {
    // Listen on every network interface so a router, tunnel, or IDE port
    // forwarder can expose the local Vite server when needed.
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Permit the host names that ngrok assigns to HTTP tunnels without
    // disabling Vite's host-header protection for arbitrary domains.
    allowedHosts: [
      "twice-karma-given.ngrok-free.dev",
      ".ngrok-free.app",
      ".ngrok.app",
    ],
    // Keep the API private while developing through a single public ngrok
    // endpoint. Requests to the KDS domain's /api paths are forwarded to the
    // local FastAPI server.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
