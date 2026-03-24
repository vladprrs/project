import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'frontend',
    root: resolve(import.meta.dirname, '../..'),
    include: ['tests/frontend/**/*.test.tsx'],
    environment: 'happy-dom',
    setupFiles: ['tests/frontend/setup.ts'],
  },
  resolve: {
    alias: {
      '@specflow/shared': resolve(import.meta.dirname, '../shared/src/index.ts'),
    },
  },
});
