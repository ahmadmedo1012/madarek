/**
 * r312-mobile-camera.e2e.ts — the R312 §R R1 browser-truth belt
 * (the jsdom side lives in tests/unit/r312-mobile-camera.test.tsx).
 *
 * **R322 (3-b) override — the map transplant retires the twin.** The
 * camera survives on Heron's own mobile architecture (map.md
 * §mechanics): the sticky moves one level deeper — the plan column
 * (`.jt-map-col`) IS the scroll track and `.jt-map-in` is the sticky
 * window — so the ONE plan SVG instance pans its viewBox along the
 * finding timeline (a landscape crop family at the sheet's own
 * 1.5789 aspect; the CSS box is pinned to the full-sheet aspect, so
 * a pan never resizes the element and never letterboxes). The
 * `.jt-cam` twin, the station cards and the side column are retired
 * with the R310/R315 flow architecture.
 *
 * The belt re-pins: the sticky-in-column discipline at 390 (the
 * INTRODUCTION card in flow below the plan — never overlapping it),
 * the camera pan through the narrated rooms, the invariant sweep
 * (nothing covered, every state visited), the ≥992px crossing
 * restore, the reduced-motion static sheet, and the desktop map
 * contract (the sticky frame, the entrance descent, the reserved
 * closing column).
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';

const VW = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

/* R315 (c4-E) re-pin: the page-ready sentinel — the cycle-1 V1 hero
 * (45f8c32) replaced the H1 copy; the old 'مدارك' sentinel has been
 * stale since (the brand name lives in the header/footer, not the
 * H1). The sentinel now waits on the current H1's first line. */
const HERO_READY = 'رحلة تعلم واحدة';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* ── the map's live geometry (resolved once per engagement) ────────── */
interface MapGeo {
  trackTop: number;
  trackH: number;
  colTop: number;
  colH: number;
  winH: number;
  stickyTop: number;
}

async function mapGeo(page: Page): Promise<MapGeo> {
  return page.evaluate(() => {
    const track = document.querySelector('.jt') as HTMLElement;
    const col = document.querySelector('.jt-map-col') as HTMLElement;
    const win = document.querySelector('.jt-map-in') as HTMLElement;
    const t = track.getBoundingClientRect();
    const c = col.getBoundingClientRect();
    return {
      trackTop: Math.round(t.top + window.scrollY),
      trackH: Math.round(t.height),
      colTop: Math.round(c.top + window.scrollY),
      colH: Math.round(c.height),
      winH: Math.round(win.getBoundingClientRect().height),
      stickyTop: parseFloat(getComputedStyle(win).top) || 0,
    };
  });
}

/** scroll to a map pin progress (the driver's own arithmetic: the
 * column clock @≤991, the track clock @≥992) and let the driver
 * settle. RETRIES: on first entry the lazy tail keeps growing the
 * page, so an unreached target clamps at the page bottom. */
async function scrollToPin(page: Page, p: number, mobile: boolean) {
  await page.evaluate(
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
    },
    { p, mobile },
  );
  await page.waitForTimeout(600);
}

async function sheetState(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('.jt-window .bp-svg') as SVGSVGElement | null;
    const track = document.querySelector('.jt') as HTMLElement;
    const mapIn = document.querySelector('.jt-map-in') as HTMLElement;
    const pin = document.querySelector('.jt-pin') as HTMLElement;
    const close = document.querySelector('.jt-close') as HTMLElement;
    return {
      stage: track.dataset.stage ?? null,
      finding: track.dataset.finding ?? null,
      wash: track.dataset.wash ?? null,
      rm: track.dataset.rm ?? null,
      open: close?.dataset.open ?? null,
      viewBox: svg?.getAttribute('viewBox') ?? null,
      par: svg?.getAttribute('preserveAspectRatio') ?? null,
      mapIn: mapIn ? getComputedStyle(mapIn).position : null,
      pin: pin ? { position: getComputedStyle(pin).position, height: Math.round(pin.getBoundingClientRect().height) } : null,
      closeW: close ? Math.round(close.getBoundingClientRect().width) : null,
    };
  });
}

test.describe('R312 — the mobile map (§R R1, R322 override)', () => {
  test('390px: the sticky-in-column discipline — ONE sheet, the intro card in flow, never overlapping', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);

    /* the driver's prime frame (rAF on mount) — wait for the track */
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    /* the retired twin families are gone from the mount */
    await expect(page.locator('.jt-cam, .jt-flow, .jt-station, .jt-side')).toHaveCount(0);
    await expect(page.locator('.jt .bp-svg')).toHaveCount(1);

    /* engage the track, then assert the architecture: the frame
     * yields, the sticky is the map-in seat inside the column */
    const geo = await mapGeo(page);
    await scrollToPin(page, 0.5, true);
    const s = await sheetState(page);
    expect(s.pin?.position).toBe('static');
    expect(s.mapIn).toBe('sticky');
    /* the sheet starts FULL (the overview) and stays inside it */
    expect(s.par).toBe('xMidYMid meet');
    const vb = (s.viewBox ?? '').split(' ').map(Number);
    expect(vb.length).toBe(4);
    expect(vb[0]!).toBeGreaterThanOrEqual(0);
    expect(vb[1]!).toBeGreaterThanOrEqual(0);
    expect(vb[0]! + vb[2]!).toBeLessThanOrEqual(1200);
    expect(vb[1]! + vb[3]!).toBeLessThanOrEqual(760);
    /* the column IS the tall track (the docH ladder's mobile engine) */
    expect(geo.colH).toBeGreaterThan(2000);

    /* the INTRODUCTION card sits in flow BELOW the plan — the V10
     * «شاهد»-clip class of defect is dead by construction */
    const overlap = await page.evaluate(() => {
      const plan = document.querySelector('.jt-window') as HTMLElement;
      const card = document.querySelector('.jt-intro') as HTMLElement;
      const a = plan.getBoundingClientRect();
      const b = card.getBoundingClientRect();
      return Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    });
    expect(overlap).toBe(0);
  });

  test('390px: the camera pans the narrated rooms with the finding timeline', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    /* mid-story (p=0.5 ⇒ t≈3.11s): the camera sits between the
     * lecture and checkpoint nodes — the interpolated landscape crop,
     * quantized whole viewBox units; stage 2 (the card era), finding
     * 2 rotating, the checkpoint wash (the bounded room highlight). */
    await scrollToPin(page, 0.5, true);
    const mid = await sheetState(page);
    expect(mid.stage).toBe('2');
    expect(mid.finding).toBe('2');
    expect(mid.wash).toBe('checkpoint');
    expect(mid.viewBox).toBe('640 226 560 355');

    /* the statement era (p=0.25 ⇒ t≈1.5s): the full overview holds
     * through the plaque beats — nothing cropped yet */
    await scrollToPin(page, 0.25, true);
    const early = await sheetState(page);
    expect(early.stage).toBe('1');
    expect(early.viewBox).toBe('0 0 1200 760');

    /* the release (p=1 ⇒ t=5.52s): the completed overview — the
     * closing owns the end of the track (the 809px map-end dead band
     * is dead: the stacked closing column scrolls in right behind) */
    await scrollToPin(page, 1, true);
    const end = await sheetState(page);
    expect(end.stage).toBe('5');
    expect(end.finding).toBe('done');
    expect(end.viewBox).toBe('0 0 1200 760');
    /* the stacked closing column reads immediately in flow (the
     * data-open flip is desktop-only business on phones) */
    const closeVisible = await page.evaluate(() => {
      const close = document.querySelector('.jt-close') as HTMLElement;
      const r = close.getBoundingClientRect();
      return r.top < window.innerHeight + 1200 && r.height > 40;
    });
    expect(closeVisible).toBe(true);
  });

  test('390px: the invariant sweep — nothing covered, every state visited in order', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    const report = await page.evaluate(async () => {
      const col = document.querySelector('.jt-map-col') as HTMLElement;
      const cRect = col.getBoundingClientRect();
      const colTop = cRect.top + window.scrollY;
      const bad: string[] = [];
      const seen: number[] = [];
      const steps = 28;
      for (let i = 0; i <= steps; i += 1) {
        const p = i / steps;
        window.scrollTo({ top: colTop + p * cRect.height, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 90));
        const track = document.querySelector('.jt') as HTMLElement;
        const stage = Number(track.dataset.stage ?? -1);
        if (!seen.includes(stage)) seen.push(stage);
        /* the intro card never overlaps the plan window (it is the
         * sticky window's second row — in flow below the drawing) */
        const plan = document.querySelector('.jt-window') as HTMLElement;
        const card = document.querySelector('.jt-intro') as HTMLElement;
        const a = plan.getBoundingClientRect();
        const b = card.getBoundingClientRect();
        const ov = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (ov > 1) bad.push(`intro overlaps plan +${Math.round(ov)}px at p=${p.toFixed(2)}`);
        /* the closing column is never covered by the sticky window
         * (the sticky cannot leave its column track) */
        const close = document.querySelector('.jt-close') as HTMLElement;
        const cr = close.getBoundingClientRect();
        const cov = Math.max(0, Math.min(b.bottom, cr.bottom) - Math.max(b.top, cr.top));
        if (cr.top < window.innerHeight && cov > 1) {
          bad.push(`sticky window covers closing +${Math.round(cov)}px at p=${p.toFixed(2)}`);
        }
      }
      return { bad, seen };
    });
    expect(report.bad).toEqual([]);
    /* the six semantic states all visited, in order */
    expect(report.seen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test('the ≥992px crossing restores the full sheet exactly once', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    /* a mobile frame at mid-story leaves the sheet CROPPED (the pan) */
    await scrollToPin(page, 0.5, true);
    expect((await sheetState(page)).viewBox).toBe('640 226 560 355');

    /* up to desktop: restored exactly (the camDirty flag consumes) */
    await page.setViewportSize(VW.desktop);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.waitForTimeout(600);
    const up = await sheetState(page);
    expect(up.viewBox).toBe('0 0 1200 760');
    expect(up.par).toBe('xMidYMid meet');

    /* the restore is consumed ONCE: corrupt the attribute and fire
     * another desktop frame — nothing rewrites it (the desktop branch
     * never touches the viewBox; the flag is cleared) */
    await page.evaluate(() => {
      const svg = document.querySelector('.jt-window .bp-svg') as SVGSVGElement;
      svg.setAttribute('viewBox', '1 2 3 4');
      window.dispatchEvent(new Event('scroll'));
    });
    await page.waitForTimeout(400);
    expect((await sheetState(page)).viewBox).toBe('1 2 3 4');
  });
});

test.describe('R312 — reduced motion at mobile: the complete static sheet', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every layer stands; the camera holds the full overview — never a mid-pan', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.rm === 'on',
      undefined,
      { timeout: 5000 },
    );

    /* mid-story scroll, then assert the static end state */
    await scrollToPin(page, 0.5, true);
    const s = await sheetState(page);
    expect(s.rm).toBe('on');
    expect(s.finding).toBe('all');
    expect(s.viewBox).toBe('0 0 1200 760');
    /* every crossfade layer stands at 1 (the driver's idempotent
     * writes — no JS RM never sees an empty grid either: the CSS belt
     * holds the same state) */
    const layers = await page.evaluate(() =>
      Array.from(document.querySelectorAll<SVGGElement>('.jt-plan [data-xl]')).map((g) => g.style.opacity),
    );
    expect(layers).toHaveLength(7);
    for (const o of layers) expect(parseFloat(o ?? 'x')).toBe(1);
    /* the findings all readable (the open card) */
    await expect(page.locator('.jt-intro-finding')).toHaveCount(5);
  });
});

test.describe('R312 — the desktop map contract (the R322 transplant)', () => {
  test('1440px: the sticky frame holds; the entrance descends; the closing column is reserved', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt') as HTMLElement)?.dataset.stage !== undefined,
      undefined,
      { timeout: 5000 },
    );

    /* the frame: sticky, ~100dvh tall, beside the reserved column */
    const s0 = await sheetState(page);
    expect(s0.pin?.position).toBe('sticky');
    expect(s0.pin?.height).toBe(900);
    /* Heron's 464px closing column @1440 — RESERVED from stage 0 (the
     * width flip is NOT transplanted; the pin-end 0.187 CLS dies) */
    expect(s0.closeW).toBe(464);
    expect(s0.par).toBe('xMidYMid meet');
    expect(s0.viewBox).toBe('0 0 1200 760');

    /* the entrance descent: before the pin engages the whole stack
     * sits one viewport above its seat (a transform, never layout) */
    await scrollToPin(page, -0.1, false);
    const drift = await page.evaluate(() => {
      const win = document.querySelector('.jt-window') as HTMLElement;
      return win.style.transform;
    });
    expect(drift).toMatch(/translateY\(-\d+\.\dpx\)/);

    /* inside the pin: the descent completes — translateY(0); the stage
     * advances with the pin (p=0.55 ⇒ t≈3.37 ⇒ stage 2, the card era) */
    await scrollToPin(page, 0.55, false);
    const mid = await sheetState(page);
    expect(mid.stage).toBe('2');
    expect(
      await page.evaluate(() => (document.querySelector('.jt-window') as HTMLElement).style.transform),
    ).toBe('translateY(0.0px)');

    /* the scrub end: the closing reveal (opacity, never width) */
    await scrollToPin(page, 1, false);
    const end = await sheetState(page);
    expect(end.stage).toBe('5');
    expect(end.open).toBe('on');
    /* the geometry NEVER moved — the same reserved 464px box */
    expect(end.closeW).toBe(464);
  });
});
