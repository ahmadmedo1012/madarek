#!/usr/bin/env node
/**
 * scripts/r350/mail-contact-sheet.mjs — R350 E5: the mail template
 * contact sheet. Renders EVERY template from the one registry
 * (backend/src/http/routes/mail.routes.ts — the same samples the
 * dev-only /api/v1/mail/preview route serves) at 390px and 600px
 * viewports via Playwright (Chromium), light scheme, and writes the
 * screenshots to docs/redesign/r350/mail-contact/<template>-<w>.png
 * plus the raw HTML renders for diffing.
 *
 * Usage: NODE_ENV=test node scripts/r350/mail-contact-sheet.mjs
 * (NODE_ENV=test lets env.ts boot with deterministic placeholders —
 * no DATABASE_URL needed; nothing here touches the database.)
 */
process.env.NODE_ENV = 'test';
// The logo + footer links render absolutely — pin the site origin so the
// contact sheet shows the real hosted-brand path (env.ts reads this).
process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://madarek-nine.vercel.app';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'docs', 'redesign', 'r350', 'mail-contact');
mkdirSync(OUT, { recursive: true });

// The registry lives in backend TS source — import from the compiled
// dist when present, else fail with the honest fix (build backend).
const registryPath = join(ROOT, 'backend', 'dist', 'http', 'routes', 'mail.routes.js');
let MAIL_TEMPLATE_SAMPLES;
try {
  ({ MAIL_TEMPLATE_SAMPLES } = await import(`file://${registryPath}`));
} catch (err) {
  console.error(`contact-sheet: cannot import the registry — run \`npm run build -w backend\` first.`);
  console.error(String(err));
  process.exit(1);
}

// playwright-core from the root node_modules; the browser builds live in
// ~/.cache/ms-playwright (the installed build wins over the pinned one —
// sandbox law: the instrument demands, we point it at what exists).
import { existsSync } from 'node:fs';
const { chromium } = await import(
  join(ROOT, 'node_modules', 'playwright-core', 'index.mjs')
);
const CHROMIUM_CANDIDATES = [
  process.env.MAIL_SHEET_CHROMIUM,
  '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux/chrome',
].filter(Boolean);
const EXECUTABLE = CHROMIUM_CANDIDATES.find(existsSync);

const browser = await chromium.launch(
  EXECUTABLE ? { executablePath: EXECUTABLE } : {},
);
const rows = [];
for (const [name, sample] of Object.entries(MAIL_TEMPLATE_SAMPLES)) {
  const rendered = sample();
  writeFileSync(join(OUT, `${name}.html`), rendered.html, 'utf8');
  for (const width of [390, 600]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: 'light' });
    await page.goto(`file://${join(OUT, `${name}.html`)}`);
    await page.waitForTimeout(150); // fonts settle
    await page.screenshot({ path: join(OUT, `${name}-${width}.png`), fullPage: true });
    await page.close();
    rows.push(`${name} ${width}px`);
  }
  // one dark-mode sample per template family at 390 for the report
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await page.goto(`file://${join(OUT, `${name}.html`)}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(OUT, `${name}-390-dark.png`), fullPage: true });
  await page.close();
}
await browser.close();
console.log(`contact-sheet: ${rows.length / 2} templates × 2 widths (+dark) → ${OUT}`);
