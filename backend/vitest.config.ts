import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.ts'],
    env: {
      // Marks env.ts as test-mode so it supplies placeholder secrets
      // instead of process.exit(1) on missing JWT_*_SECRET.
      NODE_ENV: 'test',
    },
  },
});
