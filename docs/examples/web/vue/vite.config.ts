import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // For this example (within repo, after npm run build at repo root):
      'oidc-auth-client': path.resolve(__dirname, '../../../../dist/index.js'),
      // When installed from npm, remove this alias — bare import works directly.
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'silent-renew': path.resolve(__dirname, 'silent-renew.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
})
