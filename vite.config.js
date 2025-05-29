import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://live.trading212.com/api/v0',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 [PROXY] API Request:', req.method, req.url)
            // Add Authorization header if needed
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization)
            }
          })
          proxy.on('error', (err, req, res) => {
            console.error('❌ [PROXY] Error:', err.message)
          })
        }
      },
      '/csv-proxy': {
        target: 'https://tzswiy3zk5dms05cfeo.s3.eu-central-1.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/csv-proxy/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📥 [PROXY] CSV Request:', req.url)
          })
        }
      }
    }
  }
})
