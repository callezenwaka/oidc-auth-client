import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // For local development, link to the oidc-client library
      'oidc-client': path.resolve(__dirname, '../../index.js'),
    },
  },
  server: {
    port: 5173,
  },
})
