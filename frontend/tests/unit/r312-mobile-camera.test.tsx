/**
 * r312-mobile-camera.test.tsx — the R312 §R R1 integration belt
 * (vitest/jsdom side; the browser-truth side lives in
 * tests/e2e/r312-mobile-camera.e2e.ts).
 *
 * The R310 honest gap (the delta matrix §R R1): at ≤991px the whole
 * 1200×760 learning-plan sheet was squeezed into the ~350px column —
 * an unreadable drafting. The R312 art-direction pass answered with a
 * SECOND window instance (`.jt-cam`) cropped per stage.
 *
 * **R322 (3-b) override — the map transplant retires the twin.** The
 * camera survives, its seat does not: Heron's own mobile architecture
 * (map.md §mechanics) moves the sticky ONE level deeper — the plan
 * column (`.jt-map-col`) IS the scroll track and `.jt-map-in` is the
 * sticky window — so the ONE plan SVG instance pans its viewBox along
 * the finding timeline (a landscape crop family at the sheet's own
 * 1.5789 aspect: the CSS box is pinned to the full-sheet aspect, so a
 * pan can never resize the element and never letterboxes). The
 * `.jt-cam` twin, the `.jt-flow` block, the station cards and the
 * `.jt-side` column are all retired with the R310/R315 flow
 * architecture — ONE plan SVG in the a11y tree, by construction
 * (nothing display:none).
 *
 * The belt re-pins:
 *   · the ONE-window DOM (the sticky frame + the plan column + the
 *     reserved closing column; zero retired families);
 *   · the camera key table (the narrated rooms, inside the sheet);
 *   · the 6-state machine on the measured pin windows (Heron's
 *     entrance −0.167 · sequence −0.082→0.952 = the 1908→7495 scrub)
 *     + the ≤991 column clock;
 *   · landing.css: the sticky-in-column architecture @≤991, the
 *     reserved closing column, the docH track ladder, the perf seats;
 *   · the wash keys (the R310 off-by-one story, re-keyed [data-wash]);
 *   · the jsdom integration: the deterministic fallback, the
 *     geometry-driven camera pan, the RM static sheet, the ≥992px
 *     crossing restore.
 */
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import LandingPage from '../../src/pages/LandingPage';
import { PLAN_VB } from '../../src/components/landing/LearningPlanDrawing';

/* ── the sources under pin ──────────────────────────────────────── */
const HERE = dirname(new URL(import.meta.url).pathname);
const JOURNEY_SRC = readFileSync(join(HERE, '../../src/components/landing/journey/JourneyScene.tsx'), 'utf8');
const LANDING_CSS = readFileSync(join(HERE, '../../src/styles/landing.css'), 'utf8');
/* comments stripped so tombstone prose quoting retired seats can
 * never satisfy a pin (the r306 convention). */
const JOURNEY_LIVE = JOURNEY_SRC.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── jsdom plumbing (per the r311 belt) ─────────────────────────── */
let mobileWanted = false;
let reducedWanted = false;

function installMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = query.includes('max-width: 991px')
      ? mobileWanted
      : query.includes('reduce')
        ? reducedWanted
        : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }) as unknown as typeof window.matchMedia;
}

beforeAll(() => {
  window.innerWidth = 1440;
  if (!('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

beforeEach(() => {
  mobileWanted = false;
  reducedWanted = false;
  installMatchMedia();
  try { sessionStorage.clear(); } catch { /* storage can be locked */ }
});

afterEach(() => {
  restoreGeometry();
  vi.restoreAllMocks();
});

function mountLanding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── the geometry stub (the R322 camera belt) ──────────────────────
 * jsdom lays out nothing (every rect is 0×0 at 0,0), so the driver's
 * pin metric clamps to 1 and the sheet stands at its closing state.
 * The camera pan needs REAL track geometry: this stub shapes the three
 * seats the driver reads — the track (.jt), the plan column
 * (.jt-map-col) and the sticky window (.jt-map-in) — into a fixed
 * document-space story (top 2400 · track 5400 tall · window 700) and
 * pins window.scrollY per frame. Everything else keeps the native
 * (zero) rect. The conductor's fresh epochs re-read through the same
 * stub, so the settle frames land on the identical story. */
const GEO = { top: 2400, trackH: 5400, winH: 700 };
let scrollYNow = 0;
let geoNative: (typeof Element.prototype.getBoundingClientRect) | null = null;

function installGeometry() {
  if (geoNative) return;
  geoNative = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.classList?.contains('jt') || this.classList?.contains('jt-map-col')) {
      const top = GEO.top - scrollYNow;
      return { top, bottom: top + GEO.trackH, left: 0, right: 1440, width: 1440, height: GEO.trackH, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    }
    if (this.classList?.contains('jt-map-in')) {
      return { top: 0, bottom: GEO.winH, left: 0, right: 1440, width: 1440, height: GEO.winH, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    }
    return geoNative!.call(this) as DOMRect;
  };
}

function restoreGeometry() {
  if (geoNative) {
    Element.prototype.getBoundingClientRect = geoNative;
    geoNative = null;
  }
  scrollYNow = 0;
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
}

function setScrollY(y: number) {
  scrollYNow = y;
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
}

/* the driver's sheet state on the ONE window instance */
function camSheet() {
  const svg = document.querySelector<SVGSVGElement>('.jt-window .bp-svg');
  if (!svg) return null;
  return {
    viewBox: svg.getAttribute('viewBox'),
    par: svg.getAttribute('preserveAspectRatio'),
  };
}

/* ═══ §A — the source pins ═════════════════════════════════════════ */

describe('R312 mobile camera — the source contracts (R322 map override)', () => {
  it('the ONE-window DOM: the sticky frame + the plan column + the reserved closing column', () => {
    expect(JOURNEY_SRC).toMatch(/<div className="jt-pin">/);
    expect(JOURNEY_SRC).toMatch(/<div className="jt-map-col">/);
    expect(JOURNEY_SRC).toMatch(/<div className="jt-map-in" ref=\{mapInRef\}>/);
    expect(JOURNEY_SRC).toMatch(/<div className="jt-window" ref=\{windowRef\}>/);
    /* ONE plan SVG instance — the twin is retired (the display:none
     * discipline is now "no twin at all"). */
    expect(JOURNEY_LIVE.match(/<LearningPlanDrawing/g)).toHaveLength(1);
    expect(JOURNEY_LIVE).not.toContain('PlanWindow');
    expect(JOURNEY_LIVE).not.toContain('jt-cam');
    expect(JOURNEY_LIVE).not.toContain('jt-flow');
    expect(JOURNEY_LIVE).not.toContain('jt-station');
    expect(JOURNEY_LIVE).not.toContain('jt-side');
    /* the reserved closing column rides the frame (the geometry never
     * animates — the pin-end 0.187 CLS dies by construction) */
    expect(JOURNEY_SRC).toMatch(/<div className="jt-close" ref=\{closeRef\} data-open="off">/);
    /* the INTRODUCTION card is the frame's own seat (not a station
     * card in a flow block) */
    expect(JOURNEY_SRC).toMatch(/<aside className="jt-intro" aria-label=\{INTRO_TITLE_AR\}>/);
  });

  it('the camera key table mirrors the plan geometry (the narrated rooms, two crop families)', () => {
    /* seven keys over the 5.52s movie: the full overview through the
     * statement era → each narrated room in turn → the completed
     * overview at the close. R322 3-b-fix override (review-c3 R1#5/
     * R2#4): TWO crop families — TABLET keeps the LANDSCAPE sheet
     * aspect (560/355 ≈ 1200/760); PHONE adds the PORTRAIT family
     * (460×600) so the plan element fills ~75% of the full-height
     * sticky window (the 26%-area plan + the mid-map dead band both
     * die). Every key still fills its element exactly (the CSS
     * aspect-ratio matches the family), a viewBox pan can never
     * resize the element, and the overview keys still ride PLAN_VB. */
    expect(JOURNEY_SRC).toMatch(/const CAM_KEYS_SHEET: ReadonlyArray<readonly \[number, CamRect\]> = \[/);
    expect(JOURNEY_SRC).toMatch(/const CAM_KEYS_PHONE: ReadonlyArray<readonly \[number, CamRect\]> = \[/);
    const rects = [...JOURNEY_SRC.matchAll(/\[(\d+), (\d+), (\d+), (\d+)\]/g)]
      .map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as const);
    /* the four pinned sheet-family room nodes (lecture / checkpoint /
     * exam / mastery — the narrated rooms of the findings) */
    expect(rects).toContainEqual([640, 54, 560, 355]);
    expect(rects).toContainEqual([640, 390, 560, 355]);
    expect(rects).toContainEqual([308, 54, 560, 355]);
    expect(rects).toContainEqual([0, 54, 560, 355]);
    /* the phone family's portrait crops (460×600) — same rooms,
     * portrait slices for the full-height window */
    expect(rects).toContainEqual([713, 0, 460, 600]);
    expect(rects).toContainEqual([358, 0, 460, 600]);
    /* every rect inside the sheet; each family's crops at its OWN
     * aspect (the sheet family at 1200/760, the phone family at
     * 460/600 — the CSS aspect-ratio per band matches) */
    for (const [x, y, w, h] of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(PLAN_VB.w);
      expect(y + h).toBeLessThanOrEqual(PLAN_VB.h);
      if (w !== PLAN_VB.w) {
        const sheetFamily = Math.abs(w / h - PLAN_VB.w / PLAN_VB.h) < 0.01;
        const phoneFamily = Math.abs(w / h - 460 / 600) < 0.01;
        expect(sheetFamily || phoneFamily).toBe(true);
      }
    }
    /* the overview keys ride the PLAN_VB constants (never literals) */
    expect(JOURNEY_SRC).toMatch(/const CAM_FULL: CamRect = \[0, 0, PLAN_VB\.w, PLAN_VB\.h\];/);
    expect(JOURNEY_SRC).toMatch(/\[5\.52, CAM_FULL\]/);
  });

  it('the state machine: the measured pin windows + the 6-state flip + the ≤991 column clock', () => {
    /* Heron's measured scrub windows @1440 (map.md's trigger table):
     * entrance 1465→2352 ⇒ −0.167→0 · sequence 1908→7495 ⇒
     * −0.082→0.952 — the 5.52s movie. */
    expect(JOURNEY_SRC).toMatch(/const ENTRANCE_START_PIN = -0\.167;/);
    expect(JOURNEY_SRC).toMatch(/const SEQ_START_PIN = -0\.082;/);
    expect(JOURNEY_SRC).toMatch(/const SEQ_END_PIN = 0\.952;/);
    expect(JOURNEY_SRC).toMatch(/const SEQ_DUR_S = 5\.52;/);
    /* the six progressive layer windows — layer 1 at t 2.5, then one
     * per 0.5s step (Heron's 3.02/3.52/4.02/4.52/5.02 table) */
    expect(JOURNEY_SRC).toMatch(/\[2\.5, 3\.0\],\s*\n\s*\[3\.02, 3\.52\],\s*\n\s*\[3\.52, 4\.02\],\s*\n\s*\[4\.02, 4\.52\],\s*\n\s*\[4\.52, 5\.02\],\s*\n\s*\[5\.02, 5\.52\],/);
    /* the stage flip: the closing owns the scrub end (stage 5), the
     * statement/plan/card/findings/room eras cut at t 1.5/2.5/3.5/5 */
    expect(JOURNEY_SRC).toMatch(/pRaw >= SEQ_END_PIN\s*\?\s*5/);
    /* the ≤991 clock is the PLAN COLUMN's sticky progress — derived
     * per frame from the cached document geometry + scrollY (never a
     * layout read on steady ticks) */
    expect(JOURNEY_SRC).toMatch(
      /\(window\.scrollY - geo\.top \+ geo\.stickyTop\) \/ \(geo\.height - geo\.winH\)/,
    );
    /* power2.out — the reference's own scrub ease */
    expect(JOURNEY_SRC).toMatch(/function p2o\(x: number\): number/);
  });

  it('the perf architecture: direct opacity writes — the inherited var walk is dead', () => {
    /* perf-baseline §7-1: NO custom property is written during
     * scroll — the 756-element inherited --jt-p walk (3,885ms of
     * UpdateLayoutTree in the map band) is dead; the six layer groups
     * take DIRECT style.opacity writes (opacity does not inherit). */
    expect(JOURNEY_LIVE).not.toContain("'--jt-p'");
    expect(JOURNEY_LIVE).not.toContain('"--jt-p"');
    expect(JOURNEY_LIVE).not.toContain("'--wr-p'");
    expect(JOURNEY_SRC).toMatch(
      /for \(const el of groups\[i\] \?\? \[\]\) setSheetVar\(el\.style, 'opacity', o\.toFixed\(3\)\);/,
    );
    /* landing.css: the six crossfade groups are opacity-only roots
     * with the will-change budget; contain bounds the frame seats */
    expect(LANDING_CSS).toMatch(/\.jt \.jt-plan \[data-xl\] \{\s*opacity: 0;\s*will-change: opacity;\s*\}/);
    expect(LANDING_CSS).toMatch(/\.jt-map-col \{[^}]*contain: layout paint;/);
    expect(LANDING_CSS).toMatch(/\.jt-close \{[^}]*contain: layout paint;/);
    /* the closing column's final geometry is RESERVED from stage 0
     * (Heron's exact 464px @1440 — the width flip is NOT transplanted) */
    expect(LANDING_CSS).toMatch(/\.jt-close \{[^}]*inline-size: clamp\(280px, 32\.3vw, 464px\);/);
    /* the entrance drift rides a transform, never layout */
    expect(LANDING_CSS).toMatch(/\.jt-window \{[^}]*will-change: transform;/);
  });

  it('landing.css: the sticky-in-column architecture + the track ladder @≤991', () => {
    const media = LANDING_CSS.slice(LANDING_CSS.indexOf('@media (max-width: 991px)'));
    /* the sticky moves INSIDE the plan column (Heron's own mobile
     * architecture): the frame yields, the column IS the track */
    expect(media).toMatch(/\.jt-pin \{[^}]*position: static;/);
    expect(media).toMatch(/\.jt-map-col \{[^}]*block-size: 450dvh;/);
    expect(media).toMatch(/\.jt-map-in \{[^}]*position: sticky;/);
    /* the docH track ladder (re-derived from the measured slack —
     * 380dvh @400–767 · 425dvh @≤399 over the 450dvh tablet base) */
    expect(LANDING_CSS).toMatch(/@media \(max-width: 767px\) \{\s*\.jt-map-col \{\s*block-size: 380dvh;/);
    expect(LANDING_CSS).toMatch(/@media \(max-width: 399px\) \{\s*\.jt-map-col \{\s*block-size: 425dvh;/);
    /* the INTRODUCTION card sits IN FLOW below the plan (the V10
     * «شاهد»-clip class dies by construction: the card never overlaps
     * the drawing) */
    expect(media).toMatch(/\.jt-intro \{[^}]*position: static;/);
    /* the closing column stacks BELOW the track, full width, open */
    expect(media).toMatch(/\.jt-close \{[^}]*margin-block-start: var\(--sp-5\);/);
    expect(media).toMatch(/\.jt-close\[data-open='off'\] \.jt-close-title,/);
  });

  it('the wash keys warm the right door (the R310 off-by-one story, R322 re-key)', () => {
    /* the door warm is keyed to [data-wash] now — rotating with the
     * layer builds: [05] mastery warms with the mastery wash … */
    expect(LANDING_CSS).toMatch(/\.jt\[data-wash='mastery'\] \.pl-station\[data-station='4'\]/);
    /* … and the R322 re-key finally gives the LIBRARY door [04] its
     * beat (the old design left it permanently quiet) */
    expect(LANDING_CSS).toMatch(/\.jt\[data-wash='library'\] \.pl-station\[data-station='3'\]/);
    /* the retired stage-keyed pairing must be gone */
    expect(LANDING_CSS).not.toMatch(/\.jt\[data-stage='3'\] \.pl-station\[data-station='3'\]/);
    expect(LANDING_CSS).not.toMatch(/\.jt\[data-stage='3'\] \.pl-station\[data-station='4'\]/);
  });
});

/* ═══ §B — the jsdom integration (the real landing mount) ══════════ */

describe('R312 mobile camera — the real landing in jsdom (R322 map override)', () => {
  it('the ONE window mounts; the sheet starts full; the frame holds the intro + closing seats', async () => {
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* the structural contract: the sticky frame + the plan column +
     * the stack seat + the ONE window instance */
    expect(document.querySelector('.jt-pin .jt-map-col .jt-map-in .jt-window')).not.toBeNull();
    expect(document.querySelectorAll('.jt .bp-svg')).toHaveLength(1);
    /* the retired families are gone from the mount */
    expect(document.querySelectorAll('.jt-cam, .jt-flow, .jt-stations, .jt-side, .jt-station')).toHaveLength(0);
    /* the INTRODUCTION card + the reserved closing column */
    expect(document.querySelector('.jt-intro .jt-intro-head')?.textContent).toBe('مقدمة');
    expect(document.querySelectorAll('.jt-intro-finding')).toHaveLength(5);
    expect(document.querySelector('.jt-close .jt-close-chip')).not.toBeNull();

    /* the sheet starts as the FULL plan (meet) — nothing cropped */
    const svg = document.querySelector<SVGSVGElement>('.jt .bp-svg');
    expect(svg?.getAttribute('viewBox')).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    await waitFor(() => expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`), { timeout: 2000 });
    expect(camSheet()?.par).toBe('xMidYMid meet');
  });

  it('the deterministic fallback: empty jsdom rects clamp the pin — the sheet stands at the close', async () => {
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });
    /* the prime frame runs on mount (rAF): the jsdom rects are empty
     * so the pin metric clamps to 1 — the completed overview (the
     * closing state), exactly the last camera key (never garbage). */
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt')?.dataset.stage).toBe('5'),
      { timeout: 2000 },
    );
    const track = document.querySelector<HTMLElement>('.jt');
    expect(track?.dataset.finding).toBe('done');
    expect(track?.dataset.wash).toBe('mastery');
    expect(document.querySelector<HTMLElement>('.jt-close')?.dataset.open).toBe('on');
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);

    /* a fresh scroll burst keeps the same state (idempotent writes) */
    fireEvent.scroll(window);
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`),
      { timeout: 1000 },
    );
    expect(document.querySelector<HTMLElement>('.jt')?.dataset.stage).toBe('5');
  });

  it('mobile: the driver pans the ONE sheet through the finding timeline (the stubbed track)', async () => {
    mobileWanted = true;
    installMatchMedia();
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* engage the pin (p=0): the statement era — the sheet is still the
     * full overview, stage 0, plaque 1 arriving (the entrance era) */
    setScrollY(GEO.top);
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt')?.dataset.stage).toBe('0'),
      { timeout: 2000 },
    );
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    expect(document.querySelector<HTMLElement>('.jt')?.dataset.wash).toBe('none');

    /* mid-story (p=0.5 ⇒ t≈3.11): the camera sits between the lecture
     * and checkpoint nodes — the interpolated landscape crop, quantized
     * whole units; stage 2 (the card era), finding 2, the checkpoint
     * wash; layer 1 fully in, layer 2 arriving, layers 3–6 still out */
    setScrollY(GEO.top + 0.5 * (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe('640 226 560 355'),
      { timeout: 2000 },
    );
    const track = document.querySelector<HTMLElement>('.jt');
    expect(track?.dataset.stage).toBe('2');
    expect(track?.dataset.finding).toBe('2');
    expect(track?.dataset.wash).toBe('checkpoint');
    expect(parseFloat(document.querySelector<SVGGElement>(".jt-plan [data-xl='1']")?.style.opacity ?? 'x')).toBeCloseTo(1, 2);
    const layer2 = parseFloat(document.querySelector<SVGGElement>(".jt-plan [data-xl='2']")?.style.opacity ?? 'x');
    expect(layer2).toBeGreaterThan(0.2);
    expect(layer2).toBeLessThan(0.5);
    expect(parseFloat(document.querySelector<SVGGElement>(".jt-plan [data-xl='3']")?.style.opacity ?? 'x')).toBe(0);

    /* the release (p=1): the completed overview — the closing owns the
     * end of the track (the 809px map-end dead band is dead) */
    setScrollY(GEO.top + (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt')?.dataset.stage).toBe('5'),
      { timeout: 2000 },
    );
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    expect(document.querySelector<HTMLElement>('.jt-close')?.dataset.open).toBe('on');
  });

  it('reduced motion at mobile: the complete static sheet — never a mid-pan', async () => {
    mobileWanted = true;
    reducedWanted = true;
    installMatchMedia();
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* mid-story scroll, then the RM branch wins: every layer stands,
     * the camera holds the FULL overview (the discrete end state —
     * never a mid-pan), the findings all readable, the closing open */
    setScrollY(GEO.top + 0.5 * (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt')?.dataset.rm).toBe('on'),
      { timeout: 2000 },
    );
    const track = document.querySelector<HTMLElement>('.jt');
    expect(track?.dataset.finding).toBe('all');
    expect(track?.dataset.stage).toBe('4');
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    for (const g of document.querySelectorAll<SVGGElement>('.jt-plan [data-xl]')) {
      expect(parseFloat(g.style.opacity ?? 'x')).toBe(1);
    }
    expect(parseFloat(document.querySelector<HTMLElement>('.jt-card1')?.style.opacity ?? 'x')).toBe(0);
    expect(document.querySelector<HTMLElement>('.jt-close')?.dataset.open).toBe('on');
  });

  it('the ≥992px crossing restores the full sheet exactly once', async () => {
    mobileWanted = true;
    installMatchMedia();
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* a mobile frame at mid-story leaves the sheet CROPPED (the pan) */
    setScrollY(GEO.top + 0.5 * (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe('640 226 560 355'),
      { timeout: 2000 },
    );

    /* crossing up: the desktop branch restores the full overview */
    mobileWanted = false;
    installMatchMedia();
    fireEvent.scroll(window);
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`),
      { timeout: 2000 },
    );

    /* the restore is consumed ONCE: corrupt the attribute and fire
     * another desktop frame — nothing rewrites it (the flag is
     * cleared; the desktop branch never touches the viewBox) */
    const svg = document.querySelector<SVGSVGElement>('.jt-window .bp-svg');
    svg?.setAttribute('viewBox', '1 2 3 4');
    fireEvent.scroll(window);
    await new Promise((r) => setTimeout(r, 120));
    expect(camSheet()?.viewBox).toBe('1 2 3 4');
  });

  it('desktop: the entrance descent rides a transform (never layout)', async () => {
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* before the pin engages (p<0): the whole plan stack sits one
     * viewport above its seat — the transform is live */
    setScrollY(GEO.top - window.innerHeight);
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt-window')?.style.transform).toMatch(/translateY\(-\d+\.\dpx\)/),
      { timeout: 2000 },
    );

    /* inside the pin: the descent completes — translateY(0) */
    setScrollY(GEO.top + 0.2 * (GEO.trackH - window.innerHeight));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt-window')?.style.transform).toBe('translateY(0.0px)'),
      { timeout: 2000 },
    );
  });
});
