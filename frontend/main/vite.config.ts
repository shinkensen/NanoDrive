import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/upload': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});