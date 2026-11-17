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
    await expect(page.locator('.pl')).toBeVisible({ timeout: 30_000 });
    /* it must exit by itself (R313 asset-gated clock: the counter
     * finishes between ~3.25s (assets early) and 4.9s (the fallback
     * curve), + 0.7s hold + 0.835s split — the budget carries the dev
     * server's cold transform) */
    await expect(page.locator('.pl')).toHaveCount(0, { timeout: 20000 });
    /* R315 (B1·A.2) re-pin: the display H1 is «رحلة تعلم واحدة / من
     * المحاضرة إلى الإتقان» — the sheet-stands proof now anchors on it */
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
    /* R313 override: the loader REPLAYS on a same-tab reload (the
     * reference's own measured reloadGate; the session flag is
     * inert) — and exits by itself again */
    await page.reload();
    await expect(page.locator('.pl')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.pl')).toHaveCount(0, { timeout: 20000 });
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
    await page.locator('.pl-skip').click();
    /* R313 override: the skip runs the 835ms split (the exit must
     * PLAY, not cut) — gone by ~1s */
    await expect(page.locator('.pl')).toHaveCount(0, { timeout: 3000 });
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
    /* the closing column stacks below the track, always open.
     * R342-04 re-seat: the frozen spec's closing column IS the
     * section's own head — chip «الفصول [04]» + the h2 + the honest
     * copy + the four-station ledger (every column element records
     * opacity 1 at rest in home-map-wrap.390.json). The pre-R342
     * «الخلاصة» chip and its end-of-track reveal machine retired
     * with the reserved-empty column they rode on (the R341
     * dead-void defect this workstream was tasked to fix); the
     * required meaning — the journey's wrap-up readable in flow,
     * always open — now rides the section head + the ledger: the
     * four stations ARE the summary, the h2's honest copy carries
     * the «كل غرفة ميزة تعمل اليوم» truthfulness line. */
    const close = page.locator('.jt-close');
    await close.scrollIntoViewIfNeeded();
    await expect(close).toBeVisible();
    await expect(close).toContainText('الفصول');
    await expect(close).toContainText('الرحلة — أربعة فصول تتحرك أمامك');
    await expect(close).toContainText('ميزة تعمل اليوم داخل المنصّة');
    await expect(close.locator('.jt-cms-row')).toHaveCount(4);
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
    await expect(page.locator('.pl')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
    /* R315 (B1·A.2) re-pin: the static belt's complete-sheet proof
     * anchors on the current display H1 (was «مدارك») */
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
    /* the drawing is complete, not dash-hidden */
    await expect(page.locator('.hi-marker')).toHaveCount(3);
  });
});

/* ═══ R362 (Agent 3) — the concepts band's instruments ═════════════
 *
 * The [05·ب] band is the r362 deliverable's landing seat: the
 * triangulation net that CONSTRUCTS under scroll and answers the
 * pointer (ConceptField), and the gated route whose stages the
 * section's ledger drives (RouteSurvey). Three contracts pinned:
 *
 *  1. CONSTRUCTION — the driver writes --cf-p / --cr-p across the
 *     band's traversal; the field's envelope is UNDRAWN before its
 *     window and DRAWN after it; the route's legs complete with it.
 *  2. INTERACTION — station hover re-inks the legs and draws the
 *     measurement chain; TAP persists after the pointer leaves
 *     (two channels, the r331 model); the stage ledger rows mirror
 *     into the drawing; the live coordinate readout tracks the
 *     pointer.
 *  3. THE NEVER-HIDE LAW — under reduced motion the driver never
 *     writes (no inline --cf-p) and the belt completes every layer
 *     (dashoffset 0, opacity 1); interactions stay live. On 360/
 *     390/430 the band recomposes (the drawing stacks under its
 *     copy), the stage rows keep the 44px touch floor, and nothing
 *     overflows the viewport. */
const gotoBand = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await expect(page.locator('.pl')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator('.cf-section .cf-title')).toBeVisible();
};

test.describe('R362 · the concepts band — construction', () => {
  test('the field draws across the band traversal; the route completes after it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoBand(page);
    await page.locator('.cf-section').scrollIntoViewIfNeeded();

    /* mid-band: the field's window is [0.02, 0.08] — by traversal .5
     * the envelope must be fully drawn (offset 0). */
    await page.evaluate(() => {
      document.querySelector('.cf-section')!.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(400);
    const envelopeOffsetMid = await page.evaluate(() => {
      const el = document.querySelector<SVGPathElement>('.cf-field .tp-envelope path')!;
      return getComputedStyle(el).strokeDashoffset;
    });
    expect(parseFloat(envelopeOffsetMid)).toBeLessThanOrEqual(0.01);

    /* the route: the band's END — the disclosure's bottom at the
     * viewport bottom (the deterministic deep seat). */
    await page.evaluate(() => {
      document.querySelector('.cf-disclose')!.scrollIntoView({ block: 'end' });
    });
    await page.waitForTimeout(400);
    const routeState = await page.evaluate(() => {
      const sec = document.querySelector<HTMLElement>('.cf-section')!;
      const legs = document.querySelectorAll<SVGLineElement>('.cr-route .ti-leg')!;
      return {
        p: sec.style.getPropertyValue('--cr-p'),
        lastLegOffset: getComputedStyle(legs[legs.length - 1]!).strokeDashoffset,
      };
    });
    expect(parseFloat(routeState.p)).toBeGreaterThanOrEqual(0.45);
    expect(parseFloat(routeState.lastLegOffset)).toBeLessThanOrEqual(0.01);
  });
});

test.describe('R362 · the concepts band — interaction', () => {
  test('station hover re-inks the legs and draws the measurement; tap persists; the ledger mirrors', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoBand(page);

    /* the stations are real buttons with Arabic names. */
    const c2 = page.locator('.cf-field .ti-node[data-id="C2"]');
    await expect(c2).toHaveAttribute('aria-label', 'التطبيقات العملية');

    /* hover: legs re-ink + the measurement chain draws. */
    await c2.hover();
    await page.waitForTimeout(250);
    const hoverState = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.cf-field')!;
      const meas = root.querySelector<SVGGElement>('.ti-meas[data-node="C2"]')!;
      const leg = root.querySelector<SVGLineElement>('.ti-leg[data-nodes~="C2"]')!;
      return {
        active: root.getAttribute('data-active'),
        measOpacity: getComputedStyle(meas).opacity,
        legWidth: getComputedStyle(leg).strokeWidth,
        measText: meas.querySelector('text')?.textContent ?? '',
      };
    });
    expect(hoverState.active).toBe('C2');
    expect(parseFloat(hoverState.measOpacity)).toBeGreaterThan(0.9);
    expect(parseFloat(hoverState.legWidth)).toBeGreaterThan(1.5);
    expect(hoverState.measText).toContain('d ');

    /* tap: click, move away — the pin persists (two channels). */
    await c2.click();
    await page.mouse.move(300, 150);
    await page.waitForTimeout(250);
    const tapState = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('.cf-field')!;
      const node = root.querySelector('.ti-node[data-id="C2"]')!;
      return {
        active: root.getAttribute('data-active'),
        pressed: node.getAttribute('aria-pressed'),
      };
    });
    expect(tapState.active).toBe('C2');
    expect(tapState.pressed).toBe('true');

    /* the stage ledger: a row tap mirrors into the route drawing. */
    const g3row = page.locator('.cf-stage').nth(2);
    await g3row.scrollIntoViewIfNeeded();
    await g3row.click();
    await page.waitForTimeout(250);
    const mirror = await page.evaluate(() => {
      const route = document.querySelector<HTMLElement>('.cr-route')!;
      const leg = route.querySelector<SVGLineElement>('.ti-leg[data-nodes~="G3"]')!;
      const row = document.querySelectorAll('.cf-stage')[2]!;
      return {
        routeActive: route.getAttribute('data-active'),
        legWidth: getComputedStyle(leg).strokeWidth,
        rowPressed: row.getAttribute('aria-pressed'),
      };
    });
    expect(mirror.routeActive).toBe('G3');
    expect(parseFloat(mirror.legWidth)).toBeGreaterThan(1.5);
    expect(mirror.rowPressed).toBe('true');

    /* the pointer instrument: the readout tracks the pointer inside
     * the field (fine-pointer desktop). */
    await page.evaluate(() => {
      document.querySelector('.cf-act .cf-act-art')!.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(200);
    const box = (await page.locator('.cf-field svg').boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.waitForTimeout(250);
    const readout = await page.evaluate(
      () => document.querySelector<SVGTextElement>('.cf-field .ti-readout')?.textContent ?? '',
    );
    expect(readout).toMatch(/X \d{3} · Y \d{3}/);
    expect(readout).not.toBe('X 000 · Y 000');
  });
});

test.describe('R362 · the concepts band — the never-hide law', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion: the driver never writes, the belt completes, interactions live', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoBand(page);
    /* scroll THROUGH the band (native — Lenis never inits under RM),
     * then prove the driver stayed silent while the belt holds. */
    await page.evaluate(() => {
      window.scrollTo({ top: document.querySelector('.cf-section')!.getBoundingClientRect().top + window.scrollY + 600, behavior: 'instant' as ScrollBehavior });
    });
    await page.waitForTimeout(400);
    const rm = await page.evaluate(() => {
      const sec = document.querySelector<HTMLElement>('.cf-section')!;
      const env = document.querySelector<SVGPathElement>('.cf-field .tp-envelope path')!;
      const grid = document.querySelector<SVGGElement>('.cf-field .tp-grid')!;
      const legs = document.querySelectorAll<SVGLineElement>('.cr-route .ti-leg')!;
      return {
        wrote: sec.style.getPropertyValue('--cf-p') || sec.style.getPropertyValue('--cr-p'),
        envDash: getComputedStyle(env).strokeDasharray,
        envOffset: getComputedStyle(env).strokeDashoffset,
        gridOpacity: getComputedStyle(grid).opacity,
        lastLegOffset: getComputedStyle(legs[legs.length - 1]!).strokeDashoffset,
      };
    });
    expect(rm.wrote).toBe(''); /* the driver bails — no inline var */
    expect(parseFloat(rm.envOffset)).toBe(0);
    expect(rm.envDash).not.toBe('1px'); /* the belt lifts the dash */
    expect(parseFloat(rm.gridOpacity)).toBeGreaterThan(0.9);
    expect(parseFloat(rm.lastLegOffset)).toBe(0);

    /* interactions stay live under reduced motion. */
    const row = page.locator('.cf-stage').first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(250);
    const routeActive = await page.evaluate(
      () => document.querySelector<HTMLElement>('.cr-route')!.getAttribute('data-active'),
    );
    expect(routeActive).toBe('G1');
  });
});

test.describe('R362 · the concepts band — mobile recomposition', () => {
  for (const vp of [
    { width: 360, height: 740 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    test(`recomposes at ${vp.width}px — full drawing, 44px rows, no overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await gotoBand(page);
      await page.evaluate(() => {
        document.querySelector('.cf-section')!.scrollIntoView({ block: 'start' });
      });
      await page.waitForTimeout(400);

      /* both drawings render in-flow; the stage rows keep the touch floor. */
      await expect(page.locator('.cf-field svg')).toBeVisible();
      await expect(page.locator('.cr-route svg')).toBeVisible();

      const rows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll<HTMLElement>('.cf-stage')).map((r) => r.getBoundingClientRect().height);
      });
      expect(rows.length).toBe(5);
      for (const h of rows) expect(h).toBeGreaterThanOrEqual(44);

      /* the ledger row still drives the drawing (click drives the same
       * row toggle; the 44px floor above is the touch honesty). */
      await page.locator('.cf-stage').nth(1).scrollIntoViewIfNeeded();
      await page.locator('.cf-stage').nth(1).click();
      await page.waitForTimeout(250);
      const active = await page.evaluate(
        () => document.querySelector<HTMLElement>('.cr-route')!.getAttribute('data-active'),
      );
      expect(active).toBe('G2');

      /* no horizontal overflow at the narrow band. */
      const overflow = await page.evaluate(
        () => document.scrollingElement!.scrollWidth - window.innerWidth,
      );
      expect(Math.max(0, overflow)).toBeLessThanOrEqual(1);
    });
  }
});
