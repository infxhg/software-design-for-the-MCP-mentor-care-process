import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },

  // =====================================================
  // Proxy configuration for backend API integration
  // All /api/* requests are forwarded to the backend server
  // This avoids CORS issues during development
  // =====================================================
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://8.134.126.87:8080',  // Backend gateway server
        changeOrigin: true,
        // No rewrite needed - backend routes already start with /api
      },
    },
  },
})
