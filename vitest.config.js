import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/__tests__/setup.js'],
    include: ['./client/src/**/*.spec.{js,jsx}'],
    css: false,
  },
  resolve: {
    alias: {
      '@': '/client/src',
    },
  },
});
