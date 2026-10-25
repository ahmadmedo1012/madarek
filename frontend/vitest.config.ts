import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
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
    exclude: [...configDefaults.exclude, 'tests/audit/**'],
    css: false,
  },
});
