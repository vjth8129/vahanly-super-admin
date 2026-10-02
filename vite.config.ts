import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The portal is served from /admin/ on the API host, so API calls are same-origin (/api/v1)
// in production. In development, Vite proxies /api to a local API (override with API_PROXY).
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: process.env.API_PROXY ?? 'http://localhost:5000', changeOrigin: true },
    },
  },
})
