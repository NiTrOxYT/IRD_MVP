import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:5001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: devProxyTarget,
        changeOrigin: true,
      },
      "/socket.io": {
        target: devProxyTarget,
        ws: true,
      },
    },
  },
});
