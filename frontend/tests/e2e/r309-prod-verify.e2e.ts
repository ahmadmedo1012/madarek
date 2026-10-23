/**
 * r309-prod-verify.e2e.ts — the FINAL production verification (R309
 * §12/§13): re-run the exact audit scenarios against the LIVE
 * deployment. Plain @playwright/test (no mock transport — the landing
 * is static-data driven) via MADAREK_E2E_BASE_URL.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

/* Deployment verification — NOT part of the hermetic CI belt: these
 * specs run against the LIVE production deployment. They are skipped
 * unless explicitly enabled (MADAREK_PROD_VERIFY=1 with
 * MADAREK_E2E_BASE_URL pointing at the deployment to verify). */
const ENABLED = !!process.env.MADAREK_PROD_VERIFY;
test.skip(!ENABLED, 'deployment verification — set MADAREK_PROD_VERIFY=1 to run');

const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'https://madarek.onrender.com';
/* cwd = the frontend workspace → ../audits is the repo's evidence tree */
const SHOTS = process.env.R309_SHOTS
  ?? path.resolve(process.cwd(), '../audits/evidence/r309-recovery/production');
if (ENABLED) mkdirSync(SHOTS, { recursive: true });

test('prod · the deployed build is the R309 code', async ({ page }) => {
  await page.goto(BASE + '/');
  /* the boot plate + the stable sheet label are R309 markers */
  const html = await page.content();
  expect(html).toContain('mdrk-boot-plate');
  await expect(page.locator('.sheet-coord-be')).toHaveText('[MDRK-01] · SHEET 01/01');
});

test('prod · desktop drag reveals [CP] unclipped, no RR/MG overlap, guides confined', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* */ } /* R313: the skip key is the hermetic opt-out (the seen-flag is inert) */
  });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => {
    const el = document.querySelector('.hi-marker[data-marker="mg"]') as HTMLElement | null;
    return !!el && el.style.getPropertyValue('--mk-x') !== '';
  });
  const sb = await page.locator('div.bp-stage').boundingBox();
  expect(sb).not.toBeNull();

  /* the wide drag (the audit's reproduced gesture) */
  await page.mouse.move(sb!.x + sb!.width * 0.9, sb!.y + sb!.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(sb!.x + sb!.width * 0.08, sb!.y + sb!.height * 0.45, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(3);
  await page.screenshot({ path: `${SHOTS}/prod-drag-1440.png` });

  const m = await page.evaluate(() => {
    const cards: Record<string, { l: number; r: number; t: number; b: number }> = {};
    document.querySelectorAll('.hi-card[data-open="on"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      cards[el.getAttribute('data-marker') ?? '?'] = { l: r.left, r: r.right, t: r.top, b: r.bottom };
    });
    const layer = document.querySelector('.hi-layer')!.getBoundingClientRect();
    const copy = document.querySelector('.fo-hero-copy')?.getBoundingClientRect();
    const inst = [
      ...Array.from(document.querySelectorAll('.hi-guide')),
      document.querySelector('.hi-plus'),
      document.querySelector('.hi-readout'),
    ].filter(Boolean).map((el) => el!.getBoundingClientRect());
    return { cards, layer: layer.toJSON(), copy: copy?.toJSON() ?? null, inst };
  });
  for (const [id, c] of Object.entries(m.cards)) {
    expect(c.l, `${id} clips left`).toBeGreaterThanOrEqual(0);
    expect(c.r, `${id} clips right`).toBeLessThanOrEqual(1440);
    expect(c.l, `${id} escapes frame`).toBeGreaterThanOrEqual(m.layer.left - 1);
    expect(c.r, `${id} escapes frame`).toBeLessThanOrEqual(m.layer.right + 1);
  }
  const { cp, rr, mg } = m.cards as Record<string, { l: number; r: number; t: number; b: number }>;
  expect(cp && rr && mg).toBeTruthy();
  expect(cp!.l < rr!.r && rr!.l < cp!.r && cp!.t < rr!.b && rr!.t < cp!.b, 'cp/rr overlap').toBe(false);
  expect(rr!.l < mg!.r && mg!.l < rr!.r && rr!.t < mg!.b && mg!.t < rr!.b, 'rr/mg overlap').toBe(false);

  /* guides sweep — confined to the frame, never in the copy */
  for (let fx = 0; fx <= 1.001; fx += 0.25) {
    await page.mouse.move(sb!.x + sb!.width * fx, sb!.y + sb!.height * 0.5);
    await page.waitForTimeout(130);
  }
  const g = await page.evaluate(() => {
    const layer = document.querySelector('.hi-layer') as HTMLElement;
    const lr = layer.getBoundingClientRect();
    const copy = document.querySelector('.fo-hero-copy')?.getBoundingClientRect();
    const rects = [
      ...Array.from(document.querySelectorAll('.hi-guide')),
      document.querySelector('.hi-plus'),
      document.querySelector('.hi-readout'),
    ].filter(Boolean).map((el) => el!.getBoundingClientRect());
    const inside = rects.every((r) => r.left >= lr.left - 0.5 && r.right <= lr.right + 0.5 && r.top >= lr.top - 0.5 && r.bottom <= lr.bottom + 0.5);
    const noCopy = rects.every((r) => !copy || !(r.left < copy.right && r.right > copy.left && r.top < copy.bottom && r.bottom > copy.top));
    return { live: layer.dataset.point === 'on', inside, noCopy };
  });
  expect(g.live).toBe(true);
  expect(g.inside, 'instrument escapes the drawing on production').toBe(true);
  expect(g.noCopy, 'instrument crosses into the hero copy on production').toBe(true);
});

test('prod · mobile 390 — flow cards inside the viewport; menu owns the scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* */ } /* R313: the skip key is the hermetic opt-out (the seen-flag is inert) */
  });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => {
    const el = document.querySelector('.hi-marker[data-marker="mg"]') as HTMLElement | null;
    return !!el && el.style.getPropertyValue('--mk-x') !== '';
  });
  for (const id of ['cp', 'rr', 'mg']) {
    const btn = page.locator(`.hi-marker[data-marker="${id}"]`);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await btn.click();
      if (await btn.evaluate((el) => el.getAttribute('aria-pressed') === 'true')) break;
      await page.waitForTimeout(250);
    }
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/prod-flow-390.png` });
  const flow = await page.evaluate(() => {
    const out: Record<string, { l: number; r: number }> = {};
    document.querySelectorAll('.hi-flow-card[data-open="on"]').forEach((el) => {
      const r = el.getBoundingClientRect();
      out[el.getAttribute('data-marker') ?? '?'] = { l: r.left, r: r.right };
    });
    return out;
  });
  expect(Object.keys(flow).sort()).toEqual(['cp', 'mg', 'rr']);
  for (const [id, c] of Object.entries(flow)) {
    expect(c.l, `${id} clips left at 390 (prod)`).toBeGreaterThanOrEqual(0);
    expect(c.r, `${id} clips right at 390 (prod)`).toBeLessThanOrEqual(390);
  }

  /* the menu scroll-lock — the audit's exact wheel gesture */
  await page.locator('.fo-burger').click();
  await expect(page.locator('.fo-mobile-menu')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/prod-menu-open-390.png` });
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(400);
  const during = await page.evaluate(() => window.scrollY);
  expect(during, 'the page scrolled behind the open menu (prod)').toBe(before);
  await page.locator('.fo-burger').click();
  await expect(page.locator('.fo-mobile-menu')).toHaveCount(0);
  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBe(before);
});

test('prod · the entrance — composed first frame, ≈9–10s sequence, scroll restored', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + '/');
  /* fresh context → the intro plays; measure from the loader mount */
  await page.waitForSelector('.sl', { timeout: 20000 });
  const tMount = Date.now();
  const early = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    bg: getComputedStyle(document.querySelector('.sl-main') as Element).backgroundColor,
    chrome: !!document.querySelector('.sl-progress') && !!document.querySelector('.sl-meta'),
  }));
  expect(early.chrome).toBe(true);
  expect(early.bg).not.toBe('rgb(0, 0, 0)');
  await page.screenshot({ path: `${SHOTS}/prod-loader-early.png` });
  await expect(page.locator('.sl-pct')).toHaveText('100%', { timeout: 8000 });
  const doneAt = Date.now() - tMount;
  expect(doneAt).toBeGreaterThanOrEqual(3500);
  expect(doneAt).toBeLessThanOrEqual(7000);
  await expect(page.locator('.sl')).toHaveCount(0, { timeout: 8000 });
  const goneAt = Date.now() - tMount;
  expect(goneAt).toBeGreaterThanOrEqual(8000);
  expect(goneAt).toBeLessThanOrEqual(11500);
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  const y0 = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
});

test('prod · return-to-top resets the stations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* */ } /* R313: the skip key is the hermetic opt-out (the seen-flag is inert) */
  });
  await page.goto(BASE + '/');
  await page.locator('.hi-marker[data-marker="cp"]').click();
  await expect(page.locator('.hi-marker[data-marker="cp"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.fo-footer a[href="#main"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.locator('.fo-footer a[href="#main"]').click();
  await page.waitForTimeout(2800);
  await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/prod-after-return-top.png` });
});

test('prod · non-regression — scenes, /colleges, browser back', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* */ } /* R313: the skip key is the hermetic opt-out (the seen-flag is inert) */
  });
  await page.goto(BASE + '/');
  /* forward + reverse scene traversal */
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.5, behavior: 'instant' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/prod-mid-scroll.png` });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
  /* /colleges + back */
  await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
  await page.locator('a[href="/colleges"]').first().click();
  await expect(page).toHaveURL(/\/colleges/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
});
