import { defineConfig } from 'vitest/config';

/**
 * DB INTEGRATION suite config (r171b) — the opt-in twin of
 * vitest.config.ts. NEVER collected by the default `npm test`
 * (backend/vitest.config.ts explicitly excludes tests/integration/** —
 * AGENTS.md §5.2: «لا تُدخل قاعدة بيانات اختبارية ضمن npm test»).
 *
 * Runs only when invoked explicitly:
 *   DATABASE_URL=postgresql://…@localhost:PORT/disposable_db \
 *     npm run test:integration            # from the repo root, or
 *     npx vitest run -c vitest.integration.config.ts   # from backend/
 *
 * The guard in tests/integration/guard.setup.ts fails closed (exits
 * non-zero) before a single test connects unless DATABASE_URL points
 * at a LOCAL disposable database (localhost/127.0.0.1 only, never
 * onrender/neon hosts) — see docs/11-testing.md.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // The suite shares ONE disposable database and each file truncates
    // it in beforeEach — parallel files would wipe each other's
    // fixtures mid-assertion. One file at a time, sequential order.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    setupFiles: ['tests/integration/guard.setup.ts'],
    env: {
      // Same test-mode contract as the default config: env.ts supplies
      // placeholder JWT secrets so no real secrets are needed, while an
      // explicitly provided DATABASE_URL passes through untouched (the
      // guard has already validated it before anything imports env.ts).
      NODE_ENV: 'test',
    },
  },
});
