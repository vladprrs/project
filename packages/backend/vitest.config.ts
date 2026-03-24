import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    name: 'backend',
    root: resolve(import.meta.dirname, '../..'),
    include: ['tests/backend/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@specflow/shared': resolve(import.meta.dirname, '../shared/src/index.ts'),
    },
  },
});
