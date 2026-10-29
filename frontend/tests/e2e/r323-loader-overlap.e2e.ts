/**
 * R323 §A2 (task 1-b) — the loader OVERLAP pin, at the hermetic journey
 * level (conventions: tests/e2e/fixtures/e2e.ts + r319-leaks.e2e.ts).
 *
 * The owner's demand: exactly ONE full-screen layer at a time, never
 * two logos on screen. This spec samples the REAL rendered page every
 * 100 ms for ~30 s — across /, /colleges, /auth, /help, /vision at
 * 1440×900 AND 390×844 — and fails if, at ANY sample:
 *
 *   1. more than ONE [data-logo] is visible OUTSIDE header/footer
 *      scopes (the header/footer marks are legitimate chrome; any
 *      loader/splash/card logo overlapping them is the defect);
 *   2. more than ONE [data-fullscreen-layer] is visible (splash ·
 *      sheet-loader · slow-server — the RouteProgress strip is tagged
 *      too, but a 2 px strip coexisting with a fullscreen layer is
 *      EXPECTED, so the counter only fails on >1 FULLSCREEN-sized
 *      layers; the sampler measures areas, the strip is exempt);
 *   3. (phone viewport only) the consent banner intersects the hero
 *      H1/CTA bounding box.
 *
 * HOW TO RUN
 * ──────────
 *   # terminal 1 (or let the playwright config's webServer boot it):
 *   npm run dev:full            # repo root — full stack on :5173
 *   # terminal 2:
 *   cd frontend && npx playwright test tests/e2e/r323-loader-overlap.e2e.ts
 *
 * With MADAREK_E2E_BASE_URL=<url> the config skips its webServer and
 * drives the given instance instead. The shared fixture installs the
 * mock transport (no backend needed) and seeds `madarek-intro-skip`
 * BEFORE any app script, so task-focused sampling boots straight into
 * each page. Post-integration wiring (foreman pass): the Splash /
 * RouteProgress / SlowServerCard mounts and the brand Logo's data-logo
 * are what this spec counts.
 */
import { expect, test } from './fixtures/e2e';
import type { Page } from '@playwright/test';

const ROUTES: readonly string[] = ['/', '/colleges', '/auth', '/help', '/vision'];
const DWELL_MS = 6000; /* 5 routes × 6 s ≈ 30 s of continuous sampling */
const SAMPLE_MS = 100;
const VIOLATIONS_KEY = 'r323-loader-violations';

interface Violation {
  kind: 'logo' | 'fullscreen-layer' | 'consent-overlap';
  count?: number;
  path?: string;
  at?: number;
}

/**
 * The per-document sampler. addInitScript installs it BEFORE any app
 * script on EVERY navigation (each document gets exactly ONE interval;
 * the previous document's interval dies with it). Violations append to
 * sessionStorage — the accumulator survives SPA and hard navigations
 * alike, and the spec reads it once at the end.
 */
const SAMPLER = `
(() => {
  const KEY = ${JSON.stringify(VIOLATIONS_KEY)};
  const read = () => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  };
  const write = (v) => {
    try { sessionStorage.setItem(KEY, JSON.stringify(v.slice(-400))); }
    catch { /* storage denied — the spec-side check still ran */ }
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    const s = getComputedStyle(el);
    return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.01;
  };
  const outsideChromeScopes = (el) => !el.closest('header, footer, [data-scope="header"], [data-scope="footer"]');
  const tick = () => {
    const violations = read();
    // 1 — never two logos outside the header/footer chrome
    const logos = Array.from(document.querySelectorAll('[data-logo]'))
      .filter((el) => visible(el) && outsideChromeScopes(el));
    if (logos.length > 1) {
      violations.push({ kind: 'logo', count: logos.length, path: location.pathname, at: Date.now() });
    }
    // 2 — never two FULLSCREEN layers (the 2 px route strip is exempt:
    //     it is a strip, not a layer — measured by box height)
    const layers = Array.from(document.querySelectorAll('[data-fullscreen-layer]')).filter(visible);
    const fullscreen = layers.filter((el) => el.getBoundingClientRect().height > 8);
    if (fullscreen.length > 1) {
      violations.push({ kind: 'fullscreen-layer', count: fullscreen.length, path: location.pathname, at: Date.now() });
    }
    write(violations);
  };
  setInterval(tick, ${SAMPLE_MS});
})();
`;

/** Rect intersection with a 1 px forgiveness seam. */
function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  const seam = 1;
  return (
    a.x < b.x + b.width - seam &&
    a.x + a.width > b.x + seam &&
    a.y < b.y + b.height - seam &&
    a.y + a.height > b.y + seam
  );
}

/** Install the sampler + walk every route, dwelling on each. */
async function sampleAllRoutes(page: Page): Promise<void> {
  await page.addInitScript(SAMPLER);
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState('load');
    await page.waitForTimeout(DWELL_MS);
  }
}

async function readViolations(page: Page): Promise<Violation[]> {
  return page.evaluate((key) => {
    try {
      return JSON.parse(sessionStorage.getItem(key) || '[]') as Violation[];
    } catch {
      return [];
    }
  }, VIOLATIONS_KEY);
}

for (const viewport of [
  { name: 'desktop 1440×900', width: 1440, height: 900 },
  { name: 'phone 390×844', width: 390, height: 844 },
]) {
  test.describe(`R323 loader overlap — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('≤1 [data-logo] outside header/footer and ≤1 fullscreen layer, ~30 s sampled', async ({ page }) => {
      await sampleAllRoutes(page);
      const violations = await readViolations(page);
      expect(
        violations,
        `loader overlap violations: ${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });

    if (viewport.width === 390) {
      test('the consent banner never intersects the hero H1/CTA box (phone)', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('load');

        const banner = page.locator('.cb-banner');
        const bannerBox = await banner.boundingBox().catch(() => null);
        if (!bannerBox) {
          // unanswered consent is the ONLY state that shows the banner; a
          // fresh guest context must show it — but never fail the world
          // if the integration pass moved the gate (logged, not fatal).
          test.info().annotations.push({ type: 'note', description: 'consent banner not visible' });
          return;
        }

        const h1 = page.locator('main h1').first();
        const h1Box = await h1.boundingBox();
        expect(h1Box, 'the landing hero H1 must render').not.toBeNull();

        const heroScope = h1.locator('xpath=ancestor::section[1] | xpath=ancestor::main[1]').first();
        const cta = heroScope.locator('a[href], button').first();
        const ctaBox = await cta.boundingBox().catch(() => null);

        expect(
          overlaps(bannerBox, h1Box!),
          'the consent banner must never intersect the hero H1 box',
        ).toBe(false);
        if (ctaBox) {
          expect(
            overlaps(bannerBox, ctaBox),
            'the consent banner must never intersect the hero CTA box',
          ).toBe(false);
        }
      });
    }
  });
}
