/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/barrancabermeja-en-conversacion/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { vendor: ['react', 'react-dom', 'motion/react'] } },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 60000,
  },
});
