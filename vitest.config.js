import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'src/crypto/_jsrsasign.js', // External library
        'src/crypto/jsrsasign.js', // External wrapper
        'src/crypto/rsa.js', // External wrapper
      ],
    },
  },
});
