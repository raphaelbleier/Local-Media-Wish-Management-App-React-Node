import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Frontend läuft auf Port 3000
    proxy: {
      // Anfragen, die mit /api beginnen, werden an das Backend weitergeleitet
      '/api': {
        target: 'http://localhost:3001', // Backend-Port
        changeOrigin: true,
        secure: false,
      }
    }
  },
})