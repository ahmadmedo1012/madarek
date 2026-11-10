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
/* R332 split: landing.css is now the per-section family under
 * styles/landing/ (imported in the original cascade order); the stub
 * landing.css is rule-free. The aggregated family text is unchanged. */
const LANDING_FAMILY = [
  'src/styles/landing/chrome.css',
  'src/styles/landing/hero.css',
  'src/styles/landing/statement.css',
  'src/styles/landing/journey.css',
  'src/styles/landing/pains.css',
  'src/styles/landing/roles.css',
  'src/styles/landing/colleges.css',
  'src/styles/landing/cta.css',
  'src/styles/landing/why.css',
  'src/styles/landing/footer.css',
  'src/styles/landing/shared.css',
  'src/styles/landing/platform.css',
  'src/styles/landing/strata.css',
] as const;
const LANDING_CSS = LANDING_FAMILY.map((f) => readFileSync(join(HERE, '../..', f), 'utf8')).join('\n');
const PLAN_SRC = readFileSync(join(HERE, '../../src/components/landing/LearningPlanDrawing.tsx'), 'utf8');
/* comments stripped so tombstone prose quoting retired seats can
 * never satisfy a pin (the r306 convention). */
const JOURNEY_LIVE = JOURNEY_SRC.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── jsdom plumbing (per the r311 belt) ─────────────────────────── */
let mobileWanted = false;
let phoneWanted = false;
let reducedWanted = false;

function installMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = query.includes('max-width: 991px')
      ? mobileWanted
      : query.includes('max-width: 767px')
        ? phoneWanted
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
  phoneWanted = false;
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

  it('the camera key table mirrors the plan geometry (R347 D6e — the snap rebuild)', () => {
    /* R347 D6e re-key: ONE crop family (the phone portrait band) and
     * it SNAPS — era-keyed cuts, never interpolated (a frozen
     * mid-sweep viewBox parked its edge inside «غرفة الإتقان» and
     * half-cut it at 390). The sheet band (768–991) rides the FULL
     * sheet (labels read at 12–17px there; the retired sheet zoom
     * only added straddle risk). Every crop is verified against the
     * drawing's full label inventory with ≥12 svg-unit margins on
     * all four edges; the exam+library eras share one wide seat; the
     * mastery era returns to the FULL sheet (the completed whole). */
    expect(JOURNEY_SRC).not.toContain('CAM_KEYS_SHEET');
    expect(JOURNEY_SRC).toMatch(/const CAM_KEYS_PHONE: ReadonlyArray<readonly \[number, CamRect\]> = \[/);
    const rects = [...JOURNEY_SRC.matchAll(/\[(\d+), (\d+), (\d+), (\d+)\]/g)]
      .map((m) => [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])] as const);
    /* the phone family's label-safe crops: lecture (right column),
     * checkpoint, and the shared exam+library wide seat */
    expect(rects).toContainEqual([690, 0, 460, 600]);
    expect(rects).toContainEqual([690, 160, 460, 600]);
    expect(rects).toContainEqual([403, 95, 500, 600]);
    /* every rect inside the sheet */
    for (const [x, y, w, h] of rects) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(PLAN_VB.w);
      expect(y + h).toBeLessThanOrEqual(PLAN_VB.h);
    }
    /* the overview key rides the PLAN_VB constants (never literals);
     * the terminus holds the label-safe mastery crop (R347 D6e) */
    expect(JOURNEY_SRC).toMatch(/const CAM_FULL: CamRect = \[0, 0, PLAN_VB\.w, PLAN_VB\.h\];/);
    expect(JOURNEY_SRC).toMatch(/\[5\.52, \[292, 172, 460, 588\]\]/);
    /* the snap: camRectAt never interpolates (no lerp between keys) */
    expect(JOURNEY_SRC).not.toContain('clamp01((t - t0) / (t1 - t0))');
  });

  it('the state machine: the measured pin windows + the 6-state flip + the ≤991 column clock', () => {
    /* Heron's measured scrub windows @1440 (map.md's trigger table):
     * sequence 1908→7495 ⇒ −0.082→0.952 — the 5.52s movie.
     * R347 D6a re-key: the ENTRANCE window pin is retired with the
     * drift (the descent parked the ghost stack one viewport above
     * its seat — on top of the problems band — and its room labels
     * fed the detector's pm-region text-on-text findings). */
    expect(JOURNEY_SRC).not.toContain('ENTRANCE_START_PIN');
    expect(JOURNEY_SRC).toMatch(/const SEQ_START_PIN = -0\.082;/);
    expect(JOURNEY_SRC).toMatch(/const SEQ_END_PIN = 0\.952;/);
    expect(JOURNEY_SRC).toMatch(/const SEQ_DUR_S = 5\.52;/);
    /* R347 D6f re-key: the six layer windows + the XL_GHOST floor are
     * retired — one consistent line weight; every layer stands at
     * full ink from frame one (constant idempotent '1' writes). */
    expect(JOURNEY_SRC).not.toContain('XL_GHOST');
    expect(JOURNEY_SRC).not.toContain('LAYER_WINDOWS');
    expect(JOURNEY_SRC).toMatch(
      /for \(const group of resolveLayers\(track\)\) \{\s*\n\s*for \(const el of group\) setSheetVar\(el\.style, 'opacity', '1'\);/,
    );
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
    // R347 D6f re-key: the ghost crossfade (XL_GHOST 0.18 → 1 per
    // layer window) is retired — "the plan keeps one consistent line
    // weight". The layers take one CONSTANT idempotent '1' write
    // (direct style.opacity, zero custom properties — the perf
    // architecture is unchanged); the CSS base is opacity: 1 for the
    // pre-driver/no-JS frames.
    expect(JOURNEY_SRC).toMatch(
      /for \(const group of resolveLayers\(track\)\) \{\s*\n\s*for \(const el of group\) setSheetVar\(el\.style, 'opacity', '1'\);/,
    );
    /* landing.css: the six layer groups stand at full ink (R347 D6f:
     * opacity 1 — one consistent line weight, never washed-out);
     * contain bounds the frame seats */
    expect(LANDING_CSS).toMatch(/\.jt \.jt-plan \[data-xl\] \{\s*opacity: 1;\s*\}/);
    expect(LANDING_CSS).toMatch(/\.jt-map-col \{[^}]*contain: layout paint;/);
    expect(LANDING_CSS).toMatch(/\.jt-close \{[^}]*contain: layout paint;/);
    /* the closing column's final geometry is RESERVED from stage 0
     * (Heron's exact 464px @1440 — the width flip is NOT transplanted) */
    expect(LANDING_CSS).toMatch(/\.jt-close \{[^}]*inline-size: clamp\(280px, 32\.3vw, 464px\);/);
    /* the window keeps its compositor hint (the camera age) */
    expect(LANDING_CSS).toMatch(/\.jt-window \{[^}]*will-change: transform;/);
  });

  it('landing.css: the sticky-in-column architecture + the track ladder @≤991', () => {
    const media = LANDING_CSS.slice(LANDING_CSS.indexOf('@media (max-width: 991px)'));
    /* the sticky moves INSIDE the plan column (Heron's own mobile
     * architecture): the frame yields, the column IS the track */
    expect(media).toMatch(/\.jt-pin \{[^}]*position: static;/);
    expect(media).toMatch(/\.jt-map-col \{[^}]*block-size: 466dvh;/);
    expect(media).toMatch(/\.jt-map-in \{[^}]*position: sticky;/);
    /* the docH track ladder (re-derived from the measured slack —
     * 380dvh @400–767 over the 466dvh tablet base; R322 3-b-fix3
     * override: the ≤399 rung 425→415 recovers the 320 never-raise pin
     * after the round-2 closing foot row) */
    expect(LANDING_CSS).toMatch(/@media \(max-width: 767px\) \{\s*\.jt-map-col \{\s*block-size: 380dvh;/);
    /* the ≤399 rung — re-seated at R322 3-b round-4 (415dvh, comment-
     * tolerant). R323 note: this same pin was independently re-pinned
     * in the R323 wave with an R323 override note; upstream's tolerant
     * form is the canonical survivor after the rebase.
     * R324 X14 override: 415→473dvh — the Heron-ledger anchor is the
     * REAL 390×844 pair (the pre-X14 probe read the stale
     * contain-intrinsic-size guess); 473dvh lands the section at
     * 4821 vs Heron 4819 (+0.04 %) — the ±2 % docH contract. */
    expect(LANDING_CSS).toMatch(/@media \(max-width: 399px\) \{[\s\S]*?\.jt-map-col \{[\s\S]*?block-size: 473dvh;/);
    /* the INTRODUCTION card sits IN FLOW below the plan (the V10
     * «شاهد»-clip class dies by construction: the card never overlaps
     * the drawing) */
    expect(media).toMatch(/\.jt-intro \{[^}]*position: static;/);
    /* the closing column stacks BELOW the track, full width, open */
    expect(media).toMatch(/\.jt-close \{[^}]*margin-block-start: var\(--sp-5\);/);
    expect(media).toMatch(/\.jt-close\[data-open='off'\] \.jt-close-title,/);
  });

  it('the wash keys warm the right door (the R310 off-by-one story, R322 re-key)', () => {
    /* the door warm is keyed to [data-wash] — rotating with the layer
     * builds. R322 3-b-fix4 override (review-c3 R3#4/ND1): the ACTIVE
     * glyph ink lives in PLAN_INK_CSS (the SVG's own sheet) — the
     * landing.css var() twin was DEAD CODE at (0,4,0) vs the (0,5,0)
     * chain and was deleted; the source contract re-seats HERE. */
    expect(PLAN_SRC).toMatch(/\.jt\[data-wash='mastery'\] \.jt-plan \.pl-station\[data-station='4'\]/);
    /* … and the R322 re-key finally gives the LIBRARY door [04] its
     * beat (the old design left it permanently quiet) */
    expect(PLAN_SRC).toMatch(/\.jt\[data-wash='library'\] \.jt-plan \.pl-station\[data-station='3'\]/);
    /* the AA ink on the #FA3600 chip ground: #1A1A1A (4.63:1), not
     * the 3.76:1 white */
    expect(PLAN_SRC).toMatch(/\.pl-station\[data-station='4'\] \{ fill: #1A1A1A; font-weight: 700; \}/);
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

  it('mobile: the driver snaps the ONE sheet through the finding timeline (the stubbed track)', async () => {
    /* R347 D6e: the camera lives on the PHONE band now — the test
     * mocks it (≤767) so the crop timeline is exercised. */
    mobileWanted = true;
    phoneWanted = true;
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

    /* mid-story (p=0.5 ⇒ seqU≈0.563 ⇒ t≈4.03 under the R330 mobile
     * clock t = 5.52·u^0.55 — the empty-pin fix): the camera rides the
     * exam-hall crop (just past the 4.0 key, toward the library),
     * quantized whole units; stage 3 (the findings era), finding 3,
     * the EXAM wash (the wash windows: lecture <3.52 · checkpoint
     * <4.02 · exam <4.52); every layer is fully inked (layer 6's
     * annotation window 3.02–3.52 closed at this t). */
    setScrollY(GEO.top + 0.5 * (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    /* R347 D6e re-key: the SNAP camera — t≈4.03 sits in the
     * exam+library era's single wide crop (403 95 500 600; the
     * label-safe seat verified against the drawing's inventory). */
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe('403 95 500 600'),
      { timeout: 2000 },
    );
    const track = document.querySelector<HTMLElement>('.jt');
    /* R330 mobile clock (the empty-pin fix): t≈4.03 is the FINDINGS
     * era (stage 3) with finding 3 + the exam wash. */
    expect(track?.dataset.stage).toBe('3');
    expect(track?.dataset.finding).toBe('3');
    expect(track?.dataset.wash).toBe('exam');
    /* R347 D6f: every layer stands at full ink — always (the constant
     * '1' writes; the annotation-era reveal rides the CSS era rules). */
    for (const xl of ['1', '2', '3', '4', '5']) {
      expect(parseFloat(document.querySelector<SVGGElement>(`.jt-plan [data-xl='${xl}']`)?.style.opacity ?? 'x')).toBeCloseTo(1, 2);
    }
    const layer6 = parseFloat(document.querySelector<SVGGElement>(".jt-plan [data-xl='6']")?.style.opacity ?? 'x');
    expect(layer6).toBeCloseTo(1, 2);

    /* the release (p=1): the mastery terminus holds (R347 D6e — the
     * goal room at the close; CAM_FULL letterboxed a 206px overview
     * inside the full-height window) while the closing column owns
     * the end of the track (the 809px map-end dead band is dead) */
    setScrollY(GEO.top + (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(document.querySelector<HTMLElement>('.jt')?.dataset.stage).toBe('5'),
      { timeout: 2000 },
    );
    expect(camSheet()?.viewBox).toBe('292 172 460 588');
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
    /* R347 D6e: the phone band (the camera's home). */
    mobileWanted = true;
    phoneWanted = true;
    installMatchMedia();
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* a mobile frame at mid-story leaves the sheet CROPPED (the pan —
     * the R330 mobile clock rides the exam-hall crop at this u) */
    setScrollY(GEO.top + 0.5 * (GEO.trackH - GEO.winH));
    fireEvent.scroll(window);
    await waitFor(
      () => expect(camSheet()?.viewBox).toBe('403 95 500 600'),
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

  it('desktop: the plan stack rests in the window (R347 D6a — the drift is dead)', async () => {
    installGeometry();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* R347 D6a re-key: the entrance drift is retired. The descent
     * parked the whole plan stack one viewport above its seat — on
     * top of the problems band — where its SVG room labels fed the
     * detector's pm-region text-on-text findings (and the paint-
     * clipped ghosts still counted). The stack now rests IN the
     * window from frame one: NO transform is ever written, at any
     * pin progress. */
    setScrollY(GEO.top - window.innerHeight);
    fireEvent.scroll(window);
    await new Promise((r) => setTimeout(r, 120));
    expect(document.querySelector<HTMLElement>('.jt-stack')?.style.transform).toBe('');

    /* inside the pin: still no transform — the seat never moves */
    setScrollY(GEO.top + 0.2 * (GEO.trackH - window.innerHeight));
    fireEvent.scroll(window);
    await new Promise((r) => setTimeout(r, 120));
    expect(document.querySelector<HTMLElement>('.jt-stack')?.style.transform).toBe('');
  });
});
