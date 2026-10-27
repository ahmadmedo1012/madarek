/**
 * r319-shell-chrome.e2e.ts — C2-G2: the shared shell joins the sheet
 * system (§C3 — "it fixes ~80% of screens at once").
 *
 * Pins the material-presence contract the gate (scripts/r319/gate.mjs
 * §E-12) ratchets, from the USER'S side of the glass — STUDENT role,
 * chromium, light AND dark:
 *
 *  1. THE FRAME — .sheet-frame: fixed at the 7px viewport inset (the
 *     reference-measured constant), pointer-transparent, above the
 *     workspace bands yet below the overlay rungs (drawer/toast), with
 *     its FOUR corner registration plus-marks rendered.
 *  2. THE GRAIN — the gate's own selector ([class*="grain"]) resolves
 *     to .sheet-grain: one fixed full-viewport film, static in both
 *     themes (grain is texture, not motion).
 *  3. THE TITLE BAR — PageHeader renders the AMBIENT sheet code
 *     (AppShell's SheetCodeContext → sheetCodeForRole) as `SHEET S-01 ·
 *     STUDENT` in the mono voice, no page file opting in.
 *  4. THE CARD FAMILY — every sampled .card computes border-radius 0
 *     (the radius-0 chrome ladder; the hairline + flat-surface grammar).
 *  5. THE TABS — the active tab is the 2px hairline underline (::after),
 *     square, no selection halo/pill wash.
 *
 * Hermetic: the shared fixture corpus (mock transport + seeded session
 * + frozen clock) — no backend, no network.
 */
import { test, expect } from './fixtures/e2e';

const THEMES = ['light', 'dark'] as const;

test.use({ e2eRole: 'STUDENT' });

interface FrameGeometry {
  position: string;
  top: number;
  right: number;
  bottom: number;
  left: number;
  zIndex: string;
  pointerEvents: string;
  marks: number;
  markGlyphs: string[];
  markText: string[];
}

async function frameGeometry(page: import('@playwright/test').Page): Promise<FrameGeometry> {
  return page.evaluate(() => {
    const el = document.querySelector('.sheet-frame')!;
    const cs = getComputedStyle(el);
    const marks = [...document.querySelectorAll('.sheet-frame .sheet-mark')];
    return {
      position: cs.position,
      top: parseFloat(cs.top),
      right: parseFloat(cs.right),
      bottom: parseFloat(cs.bottom),
      left: parseFloat(cs.left),
      zIndex: cs.zIndex,
      pointerEvents: cs.pointerEvents,
      marks: marks.length,
      /* R321 §A6: the '+' glyph is ::before content — textContent must
         be EMPTY (innerText leak fix); the glyph itself is read from
         the pseudo-element's computed content. */
      markGlyphs: marks.map((m) => getComputedStyle(m, '::before').content.replace(/^"|"$/g, '')),
      markText: marks.map((m) => (m.textContent || '').trim()),
    };
  });
}

interface GrainLayer {
  cls: string;
  position: string;
  pointerEvents: string;
  width: number;
  height: number;
  repeat: string;
}

/** The gate's §E-12 grain contract, resolved from the live DOM. */
async function grainLayer(page: import('@playwright/test').Page): Promise<GrainLayer | null> {
  return page.evaluate(() => {
    const el = document.querySelector('body.mdrk-grain, [class*="grain"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      cls: String(el.className),
      position: cs.position,
      pointerEvents: cs.pointerEvents,
      width: el.getBoundingClientRect().width,
      height: el.getBoundingClientRect().height,
      repeat: cs.backgroundRepeat,
    };
  });
}

for (const theme of THEMES) {
  test.describe(`shared shell sheet chrome — ${theme}`, () => {
    test.use({ themeSeed: theme });

    test('the 7px sheet frame: fixed inset, 4 corner marks, sane z, pointer-transparent', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });

      const frame = await frameGeometry(page);
      // THE gate contract: fixed + the 7px reference constant on every edge.
      expect(frame.position).toBe('fixed');
      expect(frame.top).toBeCloseTo(7, 0);
      expect(frame.right).toBeCloseTo(7, 0);
      expect(frame.bottom).toBeCloseTo(7, 0);
      expect(frame.left).toBeCloseTo(7, 0);
      // decorative only — never a pointer target
      expect(frame.pointerEvents).toBe('none');
      // sane vs drawer/toasts: above the topbar chrome rung (100), below
      // the sheet/drawer rung (300) — overlays draw over the frame.
      const z = parseInt(frame.zIndex, 10);
      expect(z).toBeGreaterThan(100);
      expect(z).toBeLessThan(300);
      // the registration marks: four plus-marks ON the corner points.
      // R321 §A6 — the glyph renders from ::before content; the DOM
      // text stays empty so innerText never leaks the decor.
      expect(frame.marks).toBeGreaterThanOrEqual(4);
      expect(frame.markGlyphs.slice(0, 4)).toEqual(['+', '+', '+', '+']);
      expect(frame.markText).toEqual(['', '', '', '']);
    });

    test('the paper grain: the gate selector resolves to one fixed full-viewport film', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });

      const grain = await grainLayer(page);
      expect(grain, 'body.mdrk-grain / [class*="grain"] must resolve').not.toBeNull();
      expect(grain!.cls).toContain('sheet-grain');
      expect(grain!.position).toBe('fixed');
      expect(grain!.pointerEvents).toBe('none');
      // full-viewport coverage, tiled (raster-cheap repeat, not one giant raster)
      expect(grain!.width).toBeGreaterThanOrEqual(page.viewportSize()?.width ?? 0);
      expect(grain!.height).toBeGreaterThanOrEqual(page.viewportSize()?.height ?? 0);
      expect(grain!.repeat).toContain('repeat');
    });

    test("PageHeader carries the ambient sheet code (S-01 · STUDENT) in the mono voice", async ({ page }) => {
      await page.goto('/student/library');
      await expect(page.locator('h1.pf-page-title')).toHaveText('المكتبة الإلكترونية', { timeout: 20000 });

      const line = page.locator('.page-sheet-code');
      await expect(line).toBeVisible();
      await expect(line).toContainText('SHEET S-01 · STUDENT');
      // the mono voice — the same stack the gate's mono-index check reads
      const mono = await line.evaluate((el) => getComputedStyle(el).fontFamily);
      expect(mono).toContain('Geist Mono');
      // the Latin run is isolated LTR inside the RTL page
      await expect(line.locator('span[dir="ltr"]')).toHaveText('SHEET S-01 · STUDENT');
      // decorative chrome — never announced
      await expect(line).toHaveAttribute('aria-hidden', 'true');
    });

    test('the card family renders radius 0 (hairline grammar, no rounded chrome)', async ({ page }) => {
      /* /student/calendar renders the shared <Card> primitive (cal-card
       * flush ×2) from the corpus-served enrollments/dash/exams queries —
       * a stable card-family sample surface (the dashboard itself rides
       * the pf-contract rows, G1's §B2 rebuild surface). */
      await page.goto('/student/calendar');
      await expect(page.locator('.card').first()).toBeVisible({ timeout: 20000 });

      const radii = await page.evaluate(() =>
        [...document.querySelectorAll('.card')].map((el) => getComputedStyle(el).borderRadius),
      );
      expect(radii.length, 'the route renders .card samples').toBeGreaterThan(0);
      expect(radii.every((r) => r === '0px'), `every .card radius 0 — got ${radii.join(', ')}`).toBe(true);
    });

    test('tabs: active = the 2px hairline underline, square, no pill halo', async ({ page }) => {
      await page.goto('/student/library');
      await expect(page.locator('.tabs .tab.on, .tabs .tab[aria-selected="true"]')).toBeVisible({ timeout: 20000 });

      const tab = await page.evaluate(() => {
        const el = document.querySelector('.tabs .tab.on, .tabs .tab[aria-selected="true"]')!;
        const cs = getComputedStyle(el);
        const after = getComputedStyle(el, '::after');
        return {
          radius: cs.borderRadius,
          boxShadow: cs.boxShadow,
          afterHeight: after.blockSize || after.height,
          afterBackground: after.backgroundColor,
          afterTransform: after.transform,
        };
      });
      // square cell — no pill
      expect(tab.radius).toBe('0px');
      // the halo wash is retired
      expect(tab.boxShadow).toBe('none');
      // the 2px rule is drawn and fully extended
      expect(parseFloat(tab.afterHeight)).toBe(2);
      expect(tab.afterBackground).not.toBe('rgba(0, 0, 0, 0)');
      expect(tab.afterTransform).toContain('matrix(1'); // scaleX(1) — the full-width rule
    });
  });
}
