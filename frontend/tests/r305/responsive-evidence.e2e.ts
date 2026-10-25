/**
 * responsive-evidence.e2e.ts — representative responsive screenshots
 * for the R305 QA area (R305 Task 4).
 *
 * Captures committed PNG evidence for the four representative routes —
 * /auth, /404, /colleges (guest funnel) and /training (authenticated
 * shell) — at the five mandated bands: 1440×1000, 768×1024, 390×844,
 * 360×800 and 320×800 (deviceScaleFactor 1, animations disabled).
 *
 * Files land in tests/r305/__evidence__/<route>-<w>x<h>.png and ARE
 * committed (the audits/evidence precedent). Each capture asserts the
 * route's Arabic content BEFORE shooting — no splash/blank frames in
 * the evidence set.
 *
 * Capture is OPT-IN: the writes only happen with R305_EVIDENCE=1.
 * A plain `npm run test:r305` asserts the same content but never
 * rewrites the committed PNGs — a test run must never dirty the
 * working tree (reviewer finding, r305 task 5).
 */
import { test, expect } from './fixtures/qa';

const EVIDENCE_VIEWPORTS = [
  { name: '1440x1000', width: 1440, height: 1000 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
  { name: '320x800', width: 320, height: 800 },
] as const;

const SHOT_OPTIONS = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
};

/** Opt-in evidence capture — committed PNGs are refreshed only on demand. */
const CAPTURE = process.env.R305_EVIDENCE === '1';

test.describe('أدلة الاستجابة — أسطح الزائر', () => {
  for (const vp of EVIDENCE_VIEWPORTS) {
    test.describe(`عرض ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`/auth — ${vp.name}`, async ({ page }) => {
        await page.goto('/auth');
        await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');
        await page.screenshot({
          ...(CAPTURE ? { path: `tests/r305/__evidence__/auth-${vp.name}.png` } : {}),
          ...SHOT_OPTIONS,
          });
      });

      test(`/404 — ${vp.name}`, async ({ page }) => {
        await page.goto('/404');
        await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
        await page.screenshot({
          ...(CAPTURE ? { path: `tests/r305/__evidence__/404-${vp.name}.png` } : {}),
          ...SHOT_OPTIONS,
          });
      });

      test(`/colleges — ${vp.name}`, async ({ page }) => {
        await page.goto('/colleges');
        await expect(page.getByRole('group', { name: 'كلّيّات حرم المعرفة' })).toBeVisible();
        await page.screenshot({
          ...(CAPTURE ? { path: `tests/r305/__evidence__/colleges-${vp.name}.png` } : {}),
          ...SHOT_OPTIONS,
          });
      });
    });
  }
});

test.describe('أدلة الاستجابة — سطح الطالب داخل الهيكل', () => {
  for (const vp of EVIDENCE_VIEWPORTS) {
    test.describe(`عرض ${vp.name}`, () => {
      test.use({ qaRole: 'STUDENT', viewport: { width: vp.width, height: vp.height } });

      test(`/training — ${vp.name}`, async ({ page }) => {
        await page.goto('/training');
        await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();
        await expect(page.locator('.pf-rowlist')).toContainText('إتقان البحث العلمي');
        await page.screenshot({
          ...(CAPTURE ? { path: `tests/r305/__evidence__/training-${vp.name}.png` } : {}),
          ...SHOT_OPTIONS,
          });
      });
    });
  }
});
