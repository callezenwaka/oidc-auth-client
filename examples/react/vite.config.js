import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // For local development, link to the oidc-client library
      'oidc-client': path.resolve(__dirname, '../../index.js'),
    },
  },
  server: {
    port: 3000,
  },
})
