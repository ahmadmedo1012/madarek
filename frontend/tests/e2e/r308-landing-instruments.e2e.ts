/**
 * r308-landing-instruments.e2e.ts — the R308 interaction-grammar
 * journeys on the real SPA (hermetic: mock transport + Vite dev
 * server; the shared fixture pre-seeds the intro-skip key — these
 * specs clear it when they need the entrance to play).
 *
 * Covers the parity-matrix §Verification browser rows that the unit
 * belt cannot: the entrance (asset-gated, exits by itself, REPLAYS on
 * reload per the R313 Heron-parity gate), the hero inspection
 * stations as the universal control path, the walkthrough's readable
 * ladder on a narrow viewport, and the continuous instruments
 * collapsing under reduced motion.
 */
import { test, expect } from './fixtures/e2e';

test.describe('R308 — لوحة البدء (the entrance)', () => {
  test('plays on a fresh load, exits by itself, and REPLAYS on reload (R313: every full page load)', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        /* R313 override: the entrance replays on EVERY full page load —
         * so the skip key must be cleared on EVERY init run. The shared
         * fixture re-seeds it per load (context-level scripts run before
         * page-level ones); the old once-guard starved the reload at
         * the end of this spec (the replay could never play).
         * R318 §C override (R319 re-pin): the first-visit policy ALSO
         * writes the seen-flag (madarek-intro-seen) — this spec asserts
         * the REPLAY contract, so BOTH keys clear on every init run
         * (the spec plays the role of a fresh visitor each load). */
        sessionStorage.removeItem('madarek-intro-skip');
        sessionStorage.removeItem('madarek-intro-seen');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    /* R312 (D4) hardening: the first mount rides the dev server's cold
     * transform of the landing chunk — under parallel-suite load it can
     * outrun the 5s default (CI runs a built app and is unaffected). */
    await expect(page.locator('.sl')).toBeVisible({ timeout: 30_000 });
    /* it must exit by itself (R313 asset-gated clock: the counter
     * finishes between ~3.25s (assets early) and 4.9s (the fallback
     * curve), + 0.7s hold + 0.835s split — the budget carries the dev
     * server's cold transform) */
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 20000 });
    /* R315 (B1·A.2) re-pin: the display H1 is «رحلة تعلم واحدة / من
     * المحاضرة إلى الإتقان» — the sheet-stands proof now anchors on it */
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
    /* R313 override: the loader REPLAYS on a same-tab reload (the
     * reference's own measured reloadGate; the session flag is
     * inert) — and exits by itself again */
    await page.reload();
    await expect(page.locator('.sl')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
  });

  test('the skip control ends the entrance immediately', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-skip');
        sessionStorage.removeItem('madarek-intro-seen'); /* R318 §C re-pin: the seen-flag rides too */
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await page.locator('.sl-skip').click();
    /* R313 override: the skip runs the 835ms split (the exit must
     * PLAY, not cut) — gone by ~1s */
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 3000 });
    /* R315 (B1·A.2) re-pin: the sheet-stands proof anchors on the
     * current display H1 (was the pre-r306 «مدارك» title) */
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
  });
});

test.describe('R308 — محطات الفحص (the inspection stations)', () => {
  test('the stations are real controls: open, read, reset — without any pointer', async ({ page }) => {
    await page.goto('/');
    const station = page.locator('.hi-marker[data-marker="cp"]');
    await expect(station).toHaveCount(1);
    await expect(station).toHaveAttribute('aria-pressed', 'false');
    await station.click();
    await expect(station).toHaveAttribute('aria-pressed', 'true');
    /* the label is real content, not a tooltip (r309: the card is a
     * sibling of the button — .hi-card carries the visible copy).
     * R321 §A6 override (re-pinned R322 3-b): the card's marks carry
     * NO DOM text — the label/body render from data-* attributes via
     * CSS content (the decor-innertext gate); the readable contract
     * re-seats on the attribute + the button's own accessible name. */
    await expect(page.locator('.hi-card[data-marker="cp"] .hi-marker-label')).toHaveAttribute('data-label', 'نقطة فحص');
    /* the reset control appears once a station is open */
    const reset = page.locator('.hi-reset');
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(station).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('R308 — رحلة التعلّم (the walkthrough ladder)', () => {
  test('a narrow viewport gets the readable stacked sequence (no pin, no hidden content)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    /* R322 override (3-b · the map transplant): the station cards +
     * the side checklist are RETIRED with the R310/R315 flow
     * architecture — Heron's own mobile map replaces them: the sticky
     * moves INSIDE the plan column (.jt-map-in holds the plan + the
     * INTRODUCTION card in flow below it — the card never overlaps
     * the drawing), and the closing column stacks full-width below
     * the track. The readable-sequence contract re-seats on that
     * furniture: the five findings ride the intro card, the closing
     * reads immediately in flow. */
    await expect(page.locator('.jt-cam, .jt-flow, .jt-station, .jt-side')).toHaveCount(0);
    const map = page.locator('.jt-map-in');
    await map.scrollIntoViewIfNeeded();
    await expect(page.locator('.jt-window .bp-svg')).toBeVisible();
    /* the INTRODUCTION card sits in flow BELOW the plan (the V10
     * «شاهد»-clip class of defect is dead by construction) */
    await expect(page.locator('.jt-intro')).toBeVisible();
    const overlap = await page.evaluate(() => {
      const plan = document.querySelector('.jt-window') as HTMLElement;
      const card = document.querySelector('.jt-intro') as HTMLElement;
      const a = plan.getBoundingClientRect();
      const b = card.getBoundingClientRect();
      return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    expect(overlap).toBe(0);
    /* the five findings are real readable content (the r168b ledger
     * rides the fifth verbatim) */
    await expect(page.locator('.jt-intro-finding')).toHaveCount(5);
    await expect(page.locator('.jt-intro-finding').first()).toContainText('المحاضرة التفاعلية');
    /* the closing column stacks below the track, always open */
    const close = page.locator('.jt-close');
    await close.scrollIntoViewIfNeeded();
    await expect(close).toBeVisible();
    await expect(close).toContainText('الخلاصة');
  });
});

test.describe('R308 — the static belt', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion: the complete sheet stands — no loader, no cursor, stations readable', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-skip');
        sessionStorage.removeItem('madarek-intro-seen'); /* R318 §C re-pin: the seen-flag rides too */
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await expect(page.locator('.sl')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
    /* R315 (B1·A.2) re-pin: the static belt's complete-sheet proof
     * anchors on the current display H1 (was «مدارك») */
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
    /* the drawing is complete, not dash-hidden */
    await expect(page.locator('.hi-marker')).toHaveCount(3);
  });
});
