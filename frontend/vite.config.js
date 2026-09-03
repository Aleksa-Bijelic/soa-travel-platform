import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/stakeholders': 'http://localhost:8080',
      '/tours/tours': 'http://localhost:8080',
      '/followers': 'http://localhost:8080',
      '/purchase': 'http://localhost:8080',
      '/blog/': 'http://localhost:8080',
      '/reservations': 'http://localhost:8080',
    },
  },
})
