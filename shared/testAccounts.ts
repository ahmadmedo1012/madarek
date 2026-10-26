/**
 * R320 §C — `shared/testAccounts.ts`: the repo-root consumer entry for
 * the test-account table (ONE easy account per job, `@test.ly` /
 * `12345678`).
 *
 * SINGLE SOURCE OF TRUTH: the table physically lives in
 * backend/src/modules/auth/test-accounts.data.ts — see that file's
 * header for WHY (the backend build's rootDir contract; the table must
 * be compilable into the backend dist for the boot-time
 * `MADAREK_TEST_ACCOUNTS=1` ensure). This module re-exports it so
 * NON-playwright consumers import one canonical specifier:
 *
 *   frontend source + vitest:  import { TEST_ACCOUNTS } from '@shared/testAccounts'
 *                              (vite + vitest alias `@shared` → repo-root shared/,
 *                              mirrored in frontend/vite.config.ts, vitest.config.ts
 *                              and the tsconfig paths — the three must agree)
 *   tsx scripts (r320 login-proof …):  import … from '<rel>/shared/testAccounts'
 *
 *   EXCEPT Playwright-loaded fixtures (tests/e2e/fixtures/*,
 *   tests/r305/fixtures/*, tests/capture/*): Playwright's TS loader
 *   transpiles this re-export shim to CJS and the named exports vanish
 *   (verified empirically) — those files import the PHYSICAL module
 *   backend/src/modules/auth/test-accounts.data directly (same values,
 *   still one table; never a second copy).
 *
 * Edit the TABLE in the backend module; never fork values here.
 */
export * from '../backend/src/modules/auth/test-accounts.data';
