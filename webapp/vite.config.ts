import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
 
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; 

const config = defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  resolve: { tsconfigPaths: true },
  build: {
    assetsDir: "app-assets",
  },
  server: {
    proxy: {
      "/core": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/core/, ""),
      },
      "/agent": "http://localhost:8080",
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/assets": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/command": "http://localhost:8080",
      "/config": "http://localhost:8080",
      "/file": "http://localhost:8080",
      "/formatter": "http://localhost:8080",
      "/global": "http://localhost:8080",
      "/lsp": "http://localhost:8080",
      "/mcp": "http://localhost:8080",
      "/path": "http://localhost:8080",
      "/project": "http://localhost:8080",
      "/session": "http://localhost:8080",
      "/tool": "http://localhost:8080",
      "/vcs": "http://localhost:8080",
    },
  },
  plugins: [
    devtools(), 
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
});

export default config;
