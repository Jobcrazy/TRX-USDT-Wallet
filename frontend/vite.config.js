import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true //, // 允许跨域
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'android>=7', 'ios>=9'],
      renderModernChunks: false
    })
  ]
})
