import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Collect both the top-level test tree and the co-located `__tests__`
    // suites inside src/ (e.g. src/modules/search/__tests__/normalize.test.ts).
    // Without the second glob those files silently never run in CI.
    include: [
      'tests/**/*.{test,spec}.ts',
      'src/**/__tests__/*.{test,spec}.ts',
    ],
    env: {
      // Marks env.ts as test-mode so it supplies placeholder secrets
      // instead of process.exit(1) on missing JWT_*_SECRET.
      NODE_ENV: 'test',
    },
  },
});
