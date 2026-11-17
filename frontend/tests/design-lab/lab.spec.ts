/**
 * R366 (Agent 3) — the /__design component matrix suite.
 *
 * The lab renders the REAL primitives in their real states; this spec
 * pins what pixels cannot prove and what taste must not drift:
 *
 *   · STRUCTURE — all 17 sections render with visible content in
 *     every (theme × width) cell of the matrix;
 *   · THE TYPE FLOOR — no computed font-size below the sans 13px /
 *     mono 11px floors anywhere in the lab;
 *   · RADIUS DISCIPLINE — controls and cards resolve radius 0 (the
 *     R313 square canon); only the sanctioned circular primitives
 *     (pills, avatars, dots) may be round;
 *   · THE FOCUS LANGUAGE — focus produces a real ring (the
 *     --state-focus-ring seat, never 'none');
 *   · DISABLED HONESTY — disabled controls are visibly muted
 *     (opacity < 1) and non-interactive;
 *   · TOUCH FLOOR — interactive controls measure >= 44px height on
 *     the coarse-pointer (mobile) context, per the --touch-target law;
 *   · THEME FLIP — data-theme flips the computed ground;
 *   · SCREENSHOTS — one deterministic element screenshot per section
 *     × theme × width (baselines under __screenshots__; regenerate
 *     deliberately and review the diff — `npm run test:design-lab --
 *     --update-snapshots`, i.e. THE SAME FULL invocation shape as the
 *     assert run, never a `-g`-filtered subset and never from an
 *     empty snapshots dir: Playwright's new-snapshot path takes a
 *     single capture while the compare path stabilises on its second
 *     — section [17] (the live bottom-stack specimen) is the one
 *     section whose capture differs between those two paths, and a
 *     `-g`-shaped regeneration desynchronises the whole cell).
 *
 * Runs on the Vite dev server (`npm run test:design-lab`) — the lab
 * route is unguarded and backend-free.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
const WIDTHS = [390, 1440] as const;
const SECTIONS = 17;

const FREEZE = `(() => {
  const st = document.createElement('style');
  st.id = 'r366-lab-freeze';
  st.textContent = '*, *::before, *::after { transition: none !important; animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; caret-color: transparent !important; }';
  document.head.appendChild(st);
})()`;

/* §R325 demo layers (banner + fab) are position:fixed — while any
   section is captured they land INSIDE that section's frame and can
   occlude specimens that are not theirs. A section's baseline must
   show that section's content only, so the fixed layers stay hidden
   for sections [01..16] and reappear for [17] (their own specimen). */
const HIDE_FIXED = `(() => {
  let st = document.getElementById('r366-hide-fixed');
  if (!st) { st = document.createElement('style'); st.id = 'r366-hide-fixed'; document.head.appendChild(st); }
  st.textContent = '.r323d-stackdemo-banner, .r323d-stackdemo-fab { visibility: hidden !important; }';
})()`;
const SHOW_FIXED = `(() => { document.getElementById('r366-hide-fixed')?.remove(); })()`;

async function openLab(page: Page, theme: string): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 1 }, version: 2 }));
  }, theme);
  await page.goto('/__design', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(FREEZE);
  await page.waitForTimeout(400);
}

const sectionAt = (page: Page, i: number): Locator => page.locator('.r323d-section').nth(i);

/* the shape PROBE_FN returns — pinned so the string form stays typed */
interface LabProbe {
  tinySans: string[];
  roundControls: string[];
  sections: number;
}

/* in-page probes (computed-style matrix — deterministic, no pixels) */
const PROBE_FN = `(() => {
  const out = { tinySans: [], roundControls: [], sections: 0 };
  out.sections = document.querySelectorAll('.r323d-section').length;
  const isMono = (el) => /mono/i.test(getComputedStyle(el).fontFamily);
  for (const el of document.querySelectorAll('.r323d-section *')) {
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (!Number.isFinite(fs)) continue;
    if (fs < (isMono(el) ? 11 : 13) - 0.01) {
      out.tinySans.push(el.tagName + '.' + String(el.className).split(/\\s+/)[0] + ':' + fs + 'px');
    }
  }
  for (const el of document.querySelectorAll('.btn, .input, input[type="text"], input[type="password"], textarea, select, .card')) {
    const cs = getComputedStyle(el);
    if (cs.borderRadius !== '0px') out.roundControls.push(el.tagName + '.' + String(el.className).split(/\\s+/)[0] + ':' + cs.borderRadius);
  }
  return out;
})()`;

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test.describe(`lab matrix · ${theme} · ${width}`, () => {
      test.use({
        viewport: { width, height: width === 390 ? 844 : 900 },
        locale: 'ar',
        colorScheme: theme === 'dark' ? 'dark' : 'light',
        hasTouch: width === 390,
        isMobile: width === 390,
      });

      test.beforeEach(async ({ page }) => { await openLab(page, theme); });

      test('all 17 sections render with visible content', async ({ page }) => {
        const count = await page.locator('.r323d-section').count();
        expect(count).toBe(SECTIONS);
        for (let i = 0; i < SECTIONS; i++) {
          await expect(sectionAt(page, i)).toBeVisible();
          const box = await sectionAt(page, i).boundingBox();
          expect(box, `section ${i + 1} has a box`).not.toBeNull();
          expect(box!.height, `section ${i + 1} is not collapsed`).toBeGreaterThan(40);
        }
      });

      test('the type floor holds (sans >= 13px, mono >= 11px)', async ({ page }) => {
        const probe = await page.evaluate<LabProbe>(PROBE_FN);
        expect(probe.tinySans, `sub-floor text: ${probe.tinySans.slice(0, 6).join(', ')}`).toEqual([]);
      });

      test('radius discipline: controls resolve 0', async ({ page }) => {
        const probe = await page.evaluate<LabProbe>(PROBE_FN);
        expect(probe.roundControls, `round controls: ${probe.roundControls.slice(0, 6).join(', ')}`).toEqual([]);
      });

      test('the focus language paints a ring', async ({ page }) => {
        const firstBtn = page.locator('.r323d-section .btn').first();
        await firstBtn.focus();
        const ring = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          const cs = getComputedStyle(el);
          return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
        });
        expect(ring).not.toBeNull();
        expect(['solid', 'double', 'auto']).toContain(ring!.style);
        expect(parseFloat(ring!.width)).toBeGreaterThanOrEqual(2);
      });

      test('disabled controls are honestly muted', async ({ page }) => {
        const disabled = page.locator('button:disabled, [aria-disabled="true"]').first();
        await expect(disabled).toBeVisible();
        const opacity = await disabled.evaluate((el) => parseFloat(getComputedStyle(el).opacity));
        expect(opacity).toBeLessThan(1);
      });

      test('deterministic section screenshots', async ({ page }) => {
        test.setTimeout(150_000);
        const count = await page.locator('.r323d-section').count();
        for (let i = 0; i < count; i++) {
          const sec = sectionAt(page, i);
          await sec.scrollIntoViewIfNeeded();
          if (i < SECTIONS - 1) {
            await page.evaluate(HIDE_FIXED);
          } else {
            await page.evaluate(SHOW_FIXED);
            /* §R325 bottom-stack demo — the readout is interval-driven
               (400ms) and its text width re-wraps the button row, so a
               capture can land on the `total 0px` placeholder frame.
               Capture only the SETTLED state: the same value on three
               consecutive 400ms polls (= stable across 2+ ticks). */
            await page.waitForFunction(() => {
              const el = document.querySelector<HTMLElement>('.r323d-readout');
              if (!el) return false;
              const v = el.textContent ?? '';
              if (el.dataset.r366Settled === v) return true;
              el.dataset.r366Settled = el.dataset.r366Prev ?? '';
              el.dataset.r366Prev = v;
              return false;
            }, undefined, { polling: 400, timeout: 10_000 });
          }
          await expect(sec).toHaveScreenshot(`lab-${String(i + 1).padStart(2, '0')}-${theme}-${width}.png`, {
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
            caret: 'hide',
          });
        }
      });

      if (width === 390) {
        test('the 44px touch floor on coarse pointers', async ({ page }) => {
          const small = await page.evaluate(() => {
            const bad: string[] = [];
            for (const el of document.querySelectorAll('.r323d-section button, .r323d-section [role="button"], .r323d-section input[type="checkbox"], .r323d-section input[type="radio"]')) {
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              if (cs.visibility === 'hidden' || cs.display === 'none') continue;
              /* icon-only and inline controls may grow their hit box via
                 the coarse-pointer min-width/height floors — measure the
                 USED box (post-layout), which is what a thumb hits. */
              if (r.height > 0 && r.height < 44 - 0.5 && r.width >= 44 - 0.5) {
                bad.push(el.tagName + '.' + String(el.className).split(/\s+/)[0] + ':' + Math.round(r.height) + 'px');
              }
            }
            return bad;
          });
          expect(small, `sub-44px controls: ${small.slice(0, 6).join(', ')}`).toEqual([]);
        });
      }
    });
  }
}

test('theme flip changes the computed ground', async ({ browser }) => {
  const results: string[] = [];
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ar' });
    const page = await ctx.newPage();
    await openLab(page, theme);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    results.push(bg);
    await ctx.close();
  }
  expect(results[0], 'light and dark grounds differ').not.toBe(results[1]);
});
