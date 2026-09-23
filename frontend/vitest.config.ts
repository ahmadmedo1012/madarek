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
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    // WS-F6: the Playwright audit harness (tests/audit/*.spec.ts) runs
    // under its own runner (npm run test:audit → playwright). Vitest
    // must NOT collect it — importing @playwright/test outside the
    // Playwright runner throws and breaks the whole collection.
    exclude: [...configDefaults.exclude, 'tests/audit/**'],
    css: false,
  },
});
