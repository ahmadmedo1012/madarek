import { configDefaults, defineConfig } from 'vitest/config';

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
    // The DB integration suite (r171b) is deliberately EXCLUDED here:
    // its files match the glob above but need a real disposable
    // Postgres — `npm test` must stay DB-free (AGENTS.md §5.2). They run
    // only through their own config + script:
    //   DATABASE_URL=… npm run test:integration
    // (vitest.integration.config.ts + tests/integration/guard.setup.ts
    // fail closed without a validated local DATABASE_URL.)
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
    env: {
      // Marks env.ts as test-mode so it supplies placeholder secrets
      // instead of process.exit(1) on missing JWT_*_SECRET.
      NODE_ENV: 'test',
    },
  },
});
