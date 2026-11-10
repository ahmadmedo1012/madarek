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
 * settle. ITERATES to convergence: the intro card's body flips with
 * the stage (display none ↔ grid), which changes the sticky window's
 * height — the driver's own denominator — so the first hop can
 * overshoot; re-measuring at the settled stage and re-scrolling
 * lands the pin exactly (two consecutive identical targets = done).
 * (The old flow-block spec's retry guarded the lazy tail the same
 * way.) */
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

    /* mid-story (p=0.5 ⇒ seqU≈0.563 ⇒ t≈4.03 under the R330 mobile
     * clock t = 5.52·u^0.55 — the empty-pin fix): the camera holds the
     * exam-hall PORTRAIT crop — the 460×600 phone family (R322 3-b
     * round1: portrait crops + the full-height sticky window killed
     * the mid-map dead band) — just past the 4.0 key toward the
     * library; stage 3 (the findings era), finding 3, and the EXAM
     * wash (the wash windows: lecture <3.52 · checkpoint <4.02 ·
     * exam <4.52). */
    await scrollToPin(page, 0.5, true);
    const mid = await sheetState(page);
    expect(mid.stage).toBe('3');
    expect(mid.finding).toBe('3');
    expect(mid.wash).toBe('exam');
    const mvb = (mid.viewBox ?? '').split(' ').map(Number);
    expect(mvb.length).toBe(4);
    /* R347 D6e re-key: the SNAP camera — one settled label-safe crop
     * for the whole exam+library era (no interpolated beats to absorb). */
    expect(mvb[0]!).toBe(403);
    expect(mvb[1]!).toBe(95);
    expect(mvb[2]!).toBe(500);
    expect(mvb[3]!).toBe(600);

    /* the plaque era (p=0.08 ⇒ seqU≈0.150 ⇒ t≈1.94): the full overview
     * holds through the plaque beats — nothing cropped yet. (The R330
     * clock compresses the plaque era into the first third of the
     * scroll — by p=0.25 the card era is already cropping.) */
    await scrollToPin(page, 0.08, true);
    const early = await sheetState(page);
    expect(early.stage).toBe('1');
    expect(early.viewBox).toBe('0 0 1200 760');

    /* the release (p=1 ⇒ t=5.52s): the phone HOLDS the mastery
     * terminus crop (R322 3-b-fix3 R1-D2: CAM_FULL letterboxed a
     * 206px overview inside the 787px full-height window at the close
     * — the held zoomed room reads as the story's end). R347 D6e
     * re-key: the terminus is the label-safe mastery seat — the room
     * + its label + the exam/library context, ≥12 svg-unit margins
     * on every edge (the old [15,0,560,355] seat straddled «غرفة
     * الإتقان» at its bottom edge). */
    await scrollToPin(page, 1, true);
    const end = await sheetState(page);
    expect(end.stage).toBe('5');
    expect(end.finding).toBe('done');
    expect(end.viewBox).toBe('292 172 460 588');
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
      /* The R330 mobile clock front-loads the movie (t = 5.52·u^0.55):
       * stage 0 lives in the PRE-PIN runway (the sequence starts at
       * SEQ_START_PIN = −0.082 — before the column top the sweep
       * anchors on) and the plaque era compresses to ~2% after it, so
       * the sweep samples the runway, then that era finely, then a
       * uniform ladder — the invariant under test (all six states
       * visited, in order) is unchanged. */
      const ps: number[] = [];
      for (let i = 10; i >= 1; i -= 1) ps.push(-0.008 * i);
      for (let i = 0; i <= 8; i += 1) ps.push(i * 0.004);
      for (let i = 1; i <= 24; i += 1) ps.push(0.06 + (i / 24) * 0.94);
      const steps = ps.length - 1;
      /* warm-up: land on the pin's start ONCE and let the driver
       * converge before the recorded ladder — re-scrolling to the same
       * target fires no event, so sample 0 reads the settled state */
      window.scrollTo({ top: colTop, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 250));
      for (let i = 0; i <= steps; i += 1) {
        const p = ps[i]!;
        window.scrollTo({ top: colTop + p * cRect.height, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 140));
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

    /* a mobile frame at mid-story leaves the sheet CROPPED (the pan —
     * the 460×600 portrait family, R322 3-b round1; the R330 clock
     * rides the exam-hall crop at this u) */
    await scrollToPin(page, 0.5, true);
    const cropped = await sheetState(page);
    expect(cropped.viewBox).not.toBe('0 0 1200 760');
    const cvb = (cropped.viewBox ?? '').split(' ').map(Number);
    expect(cvb.length).toBe(4);
    /* R347 D6e re-key: the SNAP camera's exam+library era crop */
    expect(cvb[0]!).toBe(403);
    expect(cvb[2]!).toBe(500);

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
    expect(layers).toHaveLength(8);
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

    /* the frame: sticky, the measured column grid @1440. R342-04
     * re-pin: the frame's block-size is calc(100dvh − 1.56rem) — the
     * FROZEN SPEC's own frame row height (963+1+464 wide × 887 tall
     * @1440, home-map-wrap.1440.json div[1]>section[1]>div[1]>div[1]
     * >div[1] — h 887), not the retired pre-R342 100dvh=900 pin. */
    const s0 = await sheetState(page);
    expect(s0.pin?.position).toBe('sticky');
    expect(s0.pin?.height).toBe(887);
    /* R342-04 re-seat (the frozen spec's own measured column): the
     * closing column rides Heron's exact clamp(280px, 32.3vw, 464px)
     * — 464px @1440, always visible from frame one (every column
     * element records opacity 1 at rest in the spec; the R333 slimmed
     * 281px column and the R341 reserved-empty column are both
     * retired — the empty column read as a dead void). The pin
     * asserts the clamp's spec seat. */
    expect(s0.closeW).toBeGreaterThanOrEqual(280);
    expect(s0.closeW).toBeLessThanOrEqual(464);
    expect(s0.par).toBe('xMidYMid meet');
    expect(s0.viewBox).toBe('0 0 1200 760');

    /* R347 D6a re-key: the entrance drift is retired — the descent
     * parked the plan stack one viewport above its seat (on top of
     * the problems band); the stack now rests in the window from
     * frame one, so NO transform is ever written (at any pin
     * progress — before, during and after the pin). */
    await scrollToPin(page, -0.1, false);
    const drift = await page.evaluate(() => {
      const stack = document.querySelector('.jt-stack') as HTMLElement;
      return stack.style.transform;
    });
    expect(drift).toBe('');

    /* inside the pin: still no transform; the stage advances with
     * the pin (p=0.55 ⇒ t≈3.37 ⇒ stage 3, the findings era — R322
     * 3-b-fix3 D3: the card→findings boundary sits at t 3.0) */
    await scrollToPin(page, 0.55, false);
    const mid = await sheetState(page);
    expect(mid.stage).toBe('3');
    expect(
      await page.evaluate(() => (document.querySelector('.jt-stack') as HTMLElement).style.transform),
    ).toBe('');

    /* the scrub end: the closing reveal (opacity, never width) */
    await scrollToPin(page, 1, false);
    const end = await sheetState(page);
    expect(end.stage).toBe('5');
    expect(end.open).toBe('on');
    /* the geometry NEVER moved — the same spec closing box on the
     * R342-04 re-seat (clamp(280px, 32.3vw, 464px) — see above) */
    expect(end.closeW).toBeGreaterThanOrEqual(280);
    expect(end.closeW).toBeLessThanOrEqual(464);
  });
});
