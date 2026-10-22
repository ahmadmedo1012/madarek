/**
 * r311-cursor-ownership.e2e.ts — the R311 §1.7 integration belt.
 *
 * The R310 audit missed the app-level conflict: CursorManager (the
 * circular dot/ring, R305-A2) kept running ON the landing alongside
 * the square sheet instrument (SheetCursor) — measured before-evidence
 * in audits/evidence/r311/before/. The R311 fix is architectural
 * (§1.3 option a): the landing route owns its pointer; the app layer
 * yields for the whole route (render null + teardown), and the
 * suppression vocabulary is unified to data-cursor="none" (§1.5).
 *
 * These specs run against the REAL router + REAL landing (hermetic:
 * mock transport + Vite dev server; the shared fixture pre-seeds the
 * intro-seen flag — the loader spec clears it when needed).
 */
import { test, expect } from './fixtures/e2e';

const VW = {
  desktop: { width: 1440, height: 900 },
  narrow: { width: 800, height: 900 },
  mobile: { width: 390, height: 844 },
};

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* ═══ §1.7-1/2 — the landing: ONE square pointer ══════════════════ */

test.describe('R311 — the landing owns its pointer', () => {
  test('exactly one pointer system renders: the square sheet instrument, no circular layer', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');

    /* the app-level circular layer is FULLY down on this route */
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-core')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-ring')).toHaveCount(0);

    /* the landing's square instrument is up */
    await expect(page.locator('.sc-canvas')).toHaveCount(1);
    await expect(page.locator('.sc-ring')).toHaveCount(1);

    /* pointer activity must not resurrect the app layer */
    await page.mouse.move(300, 300);
    await page.mouse.move(900, 500, { steps: 10 });
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* the native cursor is hidden only while the sheet is live, and
     * the suppression vocabulary is the unified "none" */
    await expect(page.locator('[data-cursor="hidden"]')).toHaveCount(0);
    await expect(page.locator('.bp-stage')).toHaveAttribute('data-cursor', 'none');
    const stageCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.bp-stage') as Element).cursor);
    expect(stageCursor).toBe('none');
  });

  test('link hover: the square reticle only — never a circular ring', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const cta = page.locator('.fo-hero-cta').first();
    await expect(cta).toBeVisible();

    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    /* single jump — the §1.6 "initial pointer entry" edge: the boundary
     * event can fire before the first pointermove, so the reticle state
     * must be owned by the move handler too (fixed in R311). */
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect(page.locator('.sc-ring')).toHaveAttribute('data-on', 'on');

    /* the reticle is SQUARE by construction — no border-radius */
    const ringStyle = await page.evaluate(() => {
      const el = document.querySelector('.sc-ring') as Element;
      const cs = getComputedStyle(el);
      return { borderRadius: cs.borderRadius, border: cs.borderTopWidth + ' ' + cs.borderTopStyle };
    });
    expect(ringStyle.borderRadius).toBe('0px');

    /* the press state: press on a real BUTTON — pressing an anchor and
     * moving starts Chromium's NATIVE link drag (the drag session then
     * swallows the pointer stream — measured: events die after step 1),
     * so the press grammar is exercised on the theme toggle, a button
     * outside every suppression zone. Release away: no click fires. */
    const toggle = page.locator('.theme-toggle-option').first();
    const tb = await toggle.boundingBox();
    expect(tb).not.toBeNull();
    await page.mouse.move(tb!.x + tb!.width / 2, tb!.y + tb!.height / 2, { steps: 6 });
    await expect(page.locator('.sc-ring')).toHaveAttribute('data-on', 'on');
    await page.mouse.down();
    await expect(page.locator('.sc-ring')).toHaveAttribute('data-pressed', 'on');
    await page.mouse.move(120, 160, { steps: 12 }); /* release away — no click */
    await page.mouse.up();
    await expect(page.locator('.sc-ring')).toHaveAttribute('data-on', 'off');
    await expect(page.locator('.sc-ring')).toHaveAttribute('data-pressed', 'off');

    /* throughout: no app-layer glyph anywhere */
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
  });

  test('hero entry: the local plus owns the pointer — no global glyph competes', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const stage = page.locator('.bp-stage').first();
    await expect(stage).toBeVisible();
    const sb = await stage.boundingBox();
    expect(sb).not.toBeNull();

    /* enter the drawing — the plus + guides + readout own the zone */
    await page.mouse.move(sb!.x + sb!.width * 0.5, sb!.y + sb!.height * 0.45, { steps: 8 });
    await expect(page.locator('.hi-layer')).toHaveAttribute('data-point', 'on');
    await expect(page.locator('.hi-plus')).toBeVisible();

    /* the square sheet suppresses inside the zone; the app layer is
     * down for the whole route anyway — assert the negative space */
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.cursor-dot-core')).toHaveCount(0);

    /* drag-to-inspect: selection box + markers, still one owner */
    await page.mouse.down();
    await page.mouse.move(sb!.x + sb!.width * 0.72, sb!.y + sb!.height * 0.6, { steps: 14 });
    await expect(page.locator('.hi-box')).toHaveAttribute('data-on', 'on');
    await page.mouse.up();
    await page.waitForTimeout(700);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
  });
});

/* ═══ §1.7-4 — the loader owns the pointer while it plays ══════════ */

test.describe('R311 — the entrance loader', () => {
  test('the loader instrument owns the pointer at every width; handoff on exit is clean', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-seen');
      } catch { /* ignore */ }
    });
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.sl')).toBeVisible();

    /* its own cross + readout is the sole instrument (the arms are the
     * cross's visible geometry — the anchor span itself is 0×0) */
    await page.mouse.move(720, 420);
    await page.waitForTimeout(400);
    await expect(page.locator('.sl')).toHaveAttribute('data-cursor', 'none');
    await expect(page.locator('.sl-cross-h')).toBeVisible();
    await expect(page.locator('.sl-cross-v')).toBeVisible();
    await expect(page.locator('.sl')).toBeVisible();
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(1); /* mounted, suppressed inside the zone */

    /* narrow window: the loader still owns the pointer at EVERY width */
    await page.setViewportSize(VW.narrow);
    await expect(page.locator('.sl')).toBeVisible();
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* exit handoff: back on the sheet, the square owns the pointer */
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(1);
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
  });
});

/* ═══ §1.7-9/10 — route transitions restore/yield the app layer ════ */

test.describe('R311 — route yield transitions', () => {
  test('off the landing the app layer returns; returning to the landing tears it down', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.sc-canvas')).toHaveCount(1);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);

    /* leave via a real SPA navigation to the public /colleges */
    await page.click('a[href="/colleges"]');
    await expect(page).toHaveURL(/\/colleges/);
    await page.mouse.move(300, 300);
    await page.mouse.move(700, 400, { steps: 6 });
    await expect(page.locator('.cursor-layer')).toHaveCount(1);
    const active = await page.evaluate(() => (document.querySelector('.cursor-layer') as HTMLElement).getAttribute('data-active'));
    expect(active).toBe('true');
    await expect(page.locator('.sc-canvas')).toHaveCount(0);

    /* back to the landing via a real link — the layer tears down */
    await page.click('a[href="/"]');
    await expect(page).toHaveURL(/\/?$/);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(1);

    /* browser back: POP also restores the app layer on /colleges */
    await page.goBack();
    await expect(page).toHaveURL(/\/colleges/);
    await page.mouse.move(400, 400);
    await expect(page.locator('.cursor-layer')).toHaveCount(1);
  });
});

/* ═══ §1.7-11/12 — reduced motion + touch: native fallback ═════════ */

test.describe('R311 — native fallback', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion: no custom layers, the native cursor stays', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    const stageCursor = await page.evaluate(() => getComputedStyle(document.querySelector('.bp-stage') as Element).cursor);
    expect(stageCursor).not.toBe('none');
  });

  test('touch viewport: no custom layers, the native pointer stays', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
    await expect(page.locator('.cursor-layer')).toHaveCount(0);
    await expect(page.locator('.hi-instrument')).toBeHidden();
  });
});
