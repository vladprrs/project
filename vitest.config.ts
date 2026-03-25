import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/backend/vitest.config.ts',
      'packages/frontend/vitest.config.ts',
    ],
  },
});
