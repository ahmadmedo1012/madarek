import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // R320 §C — mirrored from vite.config.ts (the two runners MUST
      // agree): the repo-root shared/ directory.
      '@shared': path.resolve(__dirname, '..', 'shared'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // R318 §A1 + §B: cycle-defect suites live next to their source under
    // src/__tests__/<round>/ — {ts,tsx} component tests (WordReveal and
    // friends) and plain .mjs gate-lib math suites (scripts/r318 at the
    // repo root, imported by relative path, never typechecked) ride here
    // so the gate and its tests cannot drift.
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**/*.{test,spec}.{ts,tsx,mjs}'],
    // WS-F6: the Playwright audit harness (tests/audit/*.spec.ts) runs
    // under its own runner (npm run test:audit → playwright). Vitest
    // must NOT collect it — importing @playwright/test outside the
    // Playwright runner throws and breaks the whole collection.
    // Y6 (R325): same reason — tests/r325/bottom-stack.spec.ts is the
    // Playwright overlap probe (the playwright.config.ts `r325`
    // project); the name keeps the task-pinned .spec.ts spelling, so
    // the directory (not the suffix) is what vitest excludes.
    exclude: [...configDefaults.exclude, 'tests/audit/**', 'tests/r325/**'],
    css: false,
  },
});
