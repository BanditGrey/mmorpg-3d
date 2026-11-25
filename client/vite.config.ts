import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        viewer: 'viewer.html',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      },
      '/api': {
        target: 'http://localhost:8080'
      }
    }
  }
});
