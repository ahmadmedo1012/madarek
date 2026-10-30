/**
 * r325-map-clip.e2e.ts — the Y1 clip gate (the map intro's text-truth
 * belt; the jsdom source pins live in tests/unit/r312-mobile-camera.test.tsx).
 *
 * Y1 (the owner's «plan drawn from frame one, no visible boxes»):
 * at 390 the map-intro plate showed a CLIPPED wrapped headline inside
 * a hard ghost box, and the plan itself opened as empty paper (the
 * first ~2 phone frames: lone dots on the sheet). The fix: the ghost
 * line-work base (every progressive layer rests at 18%), the build
 * riding the statement era, and the UNBOXED headline (feathered paper
 * mask, no border/slab/halo).
 *
 * THIS BELT (browser truth, both breakpoints, five beats):
 *   1. CLIP DETECTION — at pin progress 0/25/50/75/100, NO HTML text
 *      line inside the map section may extend past its clip container
 *      or the viewport (overflow < 0.5px on either inline edge). SVG
 *      artwork text is excluded: the ≤991 camera pans the sheet's
 *      viewBox and cuts artwork labels at the crop edge BY DESIGN
 *      (the R312 camera contract) — the gate owns the UI copy: the
 *      statement plaques, the INTRODUCTION card, the counters and the
 *      closing column.
 *   2. THE GHOST — at progress 0 every progressive layer group stands
 *      at ≥ its 18% ghost floor (the whole plan reads as faint
 *      line-work from frame one — never the empty-grid intro).
 *   3. THE UNBOXED HEADLINE — the plaque spans carry NO border, NO
 *      box-shadow and a fully transparent background (the paper
 *      feather lives on the masked ::before), and at 390 every
 *      headline line keeps the ≥16px safe-area gutter from the
 *      viewport edges.
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';

const VW = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

/* R315 (c4-E) re-pin: the page-ready sentinel — the current H1's first
 * line (the brand name lives in the header/footer, not the H1). */
const HERO_READY = 'رحلة تعلم واحدة';

const PROGRESS_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/** scroll to a map pin progress and let the driver settle (the r312
 * discipline: iterates to convergence — the intro card's stage flips
 * change the sticky window's height, so the first hop can overshoot). */
async function scrollToPin(page: Page, p: number, mobile: boolean) {
  let prev = -1;
  for (let i = 0; i < 4; i += 1) {
    const landed = await page.evaluate(
      ({ p, mobile }) => {
        const track = document.querySelector('.jt') as HTMLElement;
        const col = document.querySelector('.jt-map-col') as HTMLElement;
        const win = document.querySelector('.jt-map-in') as HTMLElement;
        let target: number;
        if (mobile) {
          const cRect = col.getBoundingClientRect();
          const colTop = cRect.top + window.scrollY;
          const winH = win.getBoundingClientRect().height;
          const stickyTop = parseFloat(getComputedStyle(win).top) || 0;
          target = colTop - stickyTop + p * (cRect.height - winH);
        } else {
          const r = track.getBoundingClientRect();
          target = r.top + window.scrollY + p * (r.height - window.innerHeight);
        }
        window.scrollTo({ top: target, behavior: 'instant' });
        return Math.round(window.scrollY);
      },
      { p, mobile },
    );
    await page.waitForTimeout(430);
    if (Math.abs(landed - prev) < 2) break;
    prev = landed;
  }
  await page.waitForTimeout(350);
}

/** the in-page clip probe: every text-bearing element inside the map
 * section, per LINE rect (Range.getClientRects — the reading extents,
 * not the element box), vs (a) the viewport and (b) the nearest clip
 * ancestor (overflow ≠ visible or paint containment). SVG text is
 * skipped (the camera crops artwork by design); visibility-hidden and
 * ≤5%-opacity text is skipped (it paints nothing). */
const CLIP_PROBE = () => {
  const bad: Array<Record<string, unknown>> = [];
  const root = document.querySelector('.jt');
  if (!root) return bad;
  const vw = window.innerWidth;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<Element>();
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!node.textContent || !node.textContent.trim()) continue;
    const el = node.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if ((el as unknown as { ownerSVGElement?: unknown }).ownerSVGElement) continue; /* the plan artwork: camera-cropped by design */
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue;
    /* the nearest clip ancestor — the box this text is actually cut by */
    let clipper: HTMLElement | null = el.parentElement;
    let clipRect: DOMRect | null = null;
    while (clipper) {
      const ccs = getComputedStyle(clipper);
      if (ccs.overflowX !== 'visible' || ccs.overflowY !== 'visible' || ccs.contain.includes('paint')) {
        clipRect = clipper.getBoundingClientRect();
        break;
      }
      clipper = clipper.parentElement;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const tr of Array.from(range.getClientRects())) {
      if (tr.width === 0 && tr.height === 0) continue;
      const overVpL = -tr.left;
      const overVpR = tr.right - vw;
      if (overVpL > 0.5 || overVpR > 0.5) {
        bad.push({
          text: node.textContent.trim().slice(0, 24),
          cls: String(el.className).slice(0, 40),
          edge: overVpL > 0.5 ? 'viewport-left' : 'viewport-right',
          over: +(overVpL > 0.5 ? overVpL : overVpR).toFixed(2),
        });
      }
      if (clipRect) {
        const overL = clipRect.left - tr.left;
        const overR = tr.right - clipRect.right;
        if (overL > 0.5 || overR > 0.5) {
          bad.push({
            text: node.textContent.trim().slice(0, 24),
            cls: String(el.className).slice(0, 40),
            edge: overL > 0.5 ? 'container-left' : 'container-right',
            over: +(overL > 0.5 ? overL : overR).toFixed(2),
          });
        }
      }
    }
  }
  return bad;
};

test.describe('R325 Y1 — the map intro clip gate', () => {
  for (const [label, vp, mobile] of [
    ['1440', VW.desktop, false],
    ['390', VW.mobile, true],
  ] as const) {
    test(`${label}: no text line escapes its container or the viewport at any map progress`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
      await page.waitForFunction(
        () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
        undefined,
        { timeout: 5000 },
      );

      for (const p of PROGRESS_STEPS) {
        await scrollToPin(page, p, mobile);
        const bad = await page.evaluate(CLIP_PROBE);
        expect(
          bad,
          `${label} @ pin ${Math.round(p * 100)}%: clipped text lines — ${JSON.stringify(bad)}`,
        ).toEqual([]);
      }
    });
  }

  test('390: the headline keeps the ≥16px safe-area gutter at every beat', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    for (const p of PROGRESS_STEPS) {
      await scrollToPin(page, p, true);
      const bad = await page.evaluate(() => {
        const vw = window.innerWidth;
        const bad: Array<Record<string, unknown>> = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('.jt-card'))) {
          if (getComputedStyle(el).visibility === 'hidden' || parseFloat(getComputedStyle(el).opacity) < 0.05) {
            continue;
          }
          const range = document.createRange();
          range.selectNodeContents(el);
          for (const tr of Array.from(range.getClientRects())) {
            if (tr.width === 0) continue;
            if (tr.left < 15.5 || tr.right > vw - 15.5) {
              bad.push({
                cls: String(el.className),
                left: +tr.left.toFixed(1),
                right: +tr.right.toFixed(1),
                vw,
              });
            }
          }
        }
        return bad;
      });
      expect(bad, `headline gutter @ pin ${Math.round(p * 100)}% — ${JSON.stringify(bad)}`).toEqual([]);
    }
  });

  test('the intro is unboxed and the ghost line-work stands at progress 0', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );
    await scrollToPin(page, 0, false);

    /* the ghost: every progressive layer at ≥ its floor (18% − rounding)
     * — the whole plan reads as faint line-work at scroll progress 0 */
    const opacities = await page.evaluate(() =>
      Array.from(document.querySelectorAll<SVGGElement>('.jt-plan [data-xl]')).map(
        (g) => parseFloat(getComputedStyle(g).opacity),
      ),
    );
    expect(opacities.length).toBeGreaterThanOrEqual(8);
    for (const o of opacities) expect(o).toBeGreaterThanOrEqual(0.14);

    /* the unboxed headline: no border, no shadow, no own background —
     * the paper feather lives on the masked ::before */
    const plates = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('.jt-card-plate')).map((el) => {
        const cs = getComputedStyle(el);
        return {
          borderStyle: cs.borderTopStyle,
          borderWidth: parseFloat(cs.borderTopWidth),
          boxShadow: cs.boxShadow,
          bgAlpha: parseFloat(cs.backgroundColor.replace(/^rgba?\(([^)]+)\)$/, (_m, ch: string) => {
            const parts = ch.split(',');
            return parts.length > 3 ? parts[3]!.trim() : '1';
          })),
          hasMaskedPaper: (() => {
            const before = getComputedStyle(el, '::before');
            return (
              (before.maskImage ?? before.webkitMaskImage ?? '').includes('linear-gradient') &&
              before.backgroundColor.replace(/\s/g, '').includes('246,246,238')
            );
          })(),
        };
      }),
    );
    expect(plates.length).toBe(2);
    for (const plate of plates) {
      expect(plate.borderStyle).toBe('none');
      expect(plate.borderWidth).toBe(0);
      expect(plate.boxShadow).toBe('none');
      expect(plate.bgAlpha).toBe(0);
      expect(plate.hasMaskedPaper).toBe(true);
    }
  });
});
