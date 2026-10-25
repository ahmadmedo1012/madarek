/**
 * r312-mobile-camera.test.tsx — the R312 §R R1 integration belt
 * (vitest/jsdom side; the browser-truth side lives in
 * tests/e2e/r312-mobile-camera.e2e.ts).
 *
 * The R310 honest gap (the delta matrix §R R1): at ≤991px the whole
 * 1200×760 learning-plan sheet was squeezed into the ~350px column —
 * an unreadable drafting. The R312 art-direction pass replaces it
 * with the CAMERA:
 *
 *   · a second window instance (`.jt-cam`) inside a `.jt-flow` block
 *     with the station cards — the sticky camera's containing block
 *     ENDS at the stations' end, so the side column (a sibling, order
 *     3) is never covered (the R312 invariant probe measured 0
 *     violations across the full sweep);
 *   · the driver crops the cam's sheet viewBox to the active stage's
 *     zone (slice cover), following the READING parameter — the card
 *     at the band below the frame's live bottom edge;
 *   · the mobile stage flip is floor(r*4) — the card AT the band
 *     always matches the zone on the sheet (the desktop keeps the
 *     R310 pin-band formula: a different, production-verified
 *     geometry);
 *   · the ≥992px crossing restores the full sheet exactly once;
 *   · the R310 off-by-one fix: stage 3 warms door [05] (mastery),
 *     never [04] (the library door).
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

/* the driver's sheet state on the cam twin */
function camSheet() {
  const svg = document.querySelector<SVGSVGElement>('.jt-cam .bp-svg');
  if (!svg) return null;
  return {
    viewBox: svg.getAttribute('viewBox'),
    par: svg.getAttribute('preserveAspectRatio'),
    flag: svg.dataset.cam ?? null,
  };
}

/* ═══ §A — the source pins ═════════════════════════════════════════ */

describe('R312 mobile camera — the source contracts', () => {
  it('the two-window DOM: the pin instance + the cam twin inside the flow block', () => {
    expect(JOURNEY_SRC).toMatch(/<div className="jt-pin">/);
    expect(JOURNEY_SRC).toMatch(/<div className="jt-flow">/);
    /* the cam is INSIDE the flow, before the stations */
    const flow = JOURNEY_SRC.slice(JOURNEY_SRC.indexOf('<div className="jt-flow">'));
    expect(flow.indexOf('<PlanWindow cam />')).toBeLessThan(flow.indexOf('jt-stations'));
    expect(flow.indexOf('jt-stations')).toBeGreaterThan(-1);
    /* the pin's window is the plain instance */
    expect(JOURNEY_SRC).toMatch(/<PlanWindow \/>/);
  });

  it('the camera crop table mirrors the plan geometry (the washed zones + doors)', () => {
    /* four crops, each 460×500, clamped inside the 1200×760 sheet.
     * R314-cycle2 override (§7 map share): windows widened 560×420 →
     * 480×500 — more plan per stage; the nodes moved with them.
     * R319 override (§D6 c2-L3): windows narrowed 480→460 and
     * re-centred (y0 30/60→0) — the phone frame is one rung shorter
     * (34svh ≤640px) so a centred station card clears the pinned
     * plan, and the 95.9%-width breakout keeps the slice scale ≥0.76
     * (corridor poché ≥ the 12px floor). */
    expect(JOURNEY_SRC).toMatch(/MOBILE_CROPS: readonly CamRect\[\] = \[/);
    const crops = JOURNEY_SRC.match(/\[690, 0, 460, 500\]/);
    const crop1 = JOURNEY_SRC.match(/\[690, 260, 460, 500\]/);
    const crop2 = JOURNEY_SRC.match(/\[358, 0, 460, 500\]/);
    const crop3 = JOURNEY_SRC.match(/\[12, 0, 460, 500\]/);
    expect(crops).not.toBeNull();
    expect(crop1).not.toBeNull();
    expect(crop2).not.toBeNull();
    expect(crop3).not.toBeNull();
    /* every crop inside the sheet */
    for (const m of [crops, crop1, crop2, crop3]) {
      const nums = m![0].slice(1, -1).split(',').map((v) => Number(v.trim()));
      const x = nums[0] ?? 0;
      const y = nums[1] ?? 0;
      const w = nums[2] ?? 0;
      const h = nums[3] ?? 0;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(PLAN_VB.w);
      expect(y + h).toBeLessThanOrEqual(PLAN_VB.h);
    }
  });

  it('the mobile flip formula is floor(r*4) — the card at the band matches the zone', () => {
    /* the mobile branch carries the flip comment + the bare floor */
    expect(JOURNEY_SRC).toMatch(/Math\.floor\(r \* STAGES_J\.length\)/);
    /* the desktop branch keeps the R310 pin-band formula untouched */
    expect(JOURNEY_SRC).toMatch(/Math\.floor\(pin \* STAGES_J\.length \+ 0\.5\)/);
  });

  it('landing.css: the flow architecture + the sticky frame + the twin discipline', () => {
    /* base: the flow is display:contents (the desktop stays exactly
     * the R310 layout — the stations absolute against the track) */
    expect(LANDING_CSS).toMatch(/\.jt-flow \{\s*display: contents;\s*\}/);
    /* the cam twin is display:none at ≥992px */
    expect(LANDING_CSS).toMatch(/\.jt-cam \{\s*display: none;\s*\}/);
    /* ≤991px: the flow becomes the sticky container; the pin's window
     * yields; the cam sticks below the header at ≤420px tall.
     * R314-cycle2 override (§7 map share): the frame grew 40svh →
     * 48svh to carry the widened 480×500 crop windows. */
    const media = LANDING_CSS.slice(LANDING_CSS.indexOf('@media (max-width: 991px)'));
    expect(media).toMatch(/\.jt-flow \{\s*display: block;\s*order: 1;/);
    expect(media).toMatch(/\.jt-pin \.jt-window \{\s*display: none;\s*\}/);
    expect(media).toMatch(/\.jt-cam \{[^}]*position: sticky;/);
    expect(media).toMatch(/\.jt-cam \{[^}]*block-size: clamp\(300px, 48svh, 420px\);/);
    expect(media).toMatch(/\.jt-cam \{[^}]*z-index: 2;/);
    /* the side column is inert at ≤991px — the desktop clamp can
     * never narrow it mid-flow */
    expect(media).toMatch(/\.jt-side\[data-open='on'\] \{\s*inline-size: 100%;/);
  });

  it('the R310 off-by-one fix: stage 3 warms door [05] (mastery), never [04] (library)', () => {
    expect(LANDING_CSS).toMatch(/\.jt\[data-stage='3'\] \.pl-station\[data-station='4'\]/);
    /* the old wrong pairing must be gone */
    expect(LANDING_CSS).not.toMatch(/\.jt\[data-stage='3'\] \.pl-station\[data-station='3'\]/);
  });
});

/* ═══ §B — the jsdom integration (the real landing mount) ══════════ */

describe('R312 mobile camera — the real landing in jsdom', () => {
  it('the two windows mount; the flow holds the cam + the stations; the sheet starts full', async () => {
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* the structural contract */
    expect(document.querySelector('.jt-pin .jt-window')).not.toBeNull();
    expect(document.querySelector('.jt-flow .jt-cam')).not.toBeNull();
    expect(document.querySelector('.jt-flow .jt-stations')).not.toBeNull();
    expect(document.querySelector('.jt-flow .jt-side')).toBeNull();

    /* both sheets start as the FULL plan (meet) — nothing cropped yet */
    const pinSvg = document.querySelector<SVGSVGElement>('.jt-pin .bp-svg');
    expect(pinSvg?.getAttribute('viewBox')).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    await waitFor(() => expect(camSheet()).not.toBeNull(), { timeout: 2000 });
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
    expect(camSheet()?.par).toBe('xMidYMid meet');
    expect(camSheet()?.flag).toBeNull();
  });

  it('mobile: the driver crops the cam (slice + flag) and flips the stage', async () => {
    mobileWanted = true;
    installMatchMedia();
    mountLanding();
    await waitFor(() => expect(document.querySelector('.jt')).not.toBeNull(), { timeout: 2000 });

    /* the prime frame runs on mount (rAF): the jsdom rects are empty
     * so reading falls back to the pin metric (clamped 1) — the cam
     * holds the LAST crop, exactly the node rect (never garbage).
     * R314-cycle2 override: the mastery node is the widened window. */
    await waitFor(
      () => expect(camSheet()?.flag).toBe('cropped'),
      { timeout: 2000 },
    );
    expect(camSheet()?.viewBox).toBe('12 0 460 500'); // R319 override (§D6)
    expect(camSheet()?.par).toBe('xMidYMid slice');
    /* the stage flips with the reading (pin=1 here) */
    const track = document.querySelector<HTMLElement>('.jt');
    expect(track?.dataset.stage).toBe('3');

    /* a fresh scroll burst keeps the same state (idempotent writes) */
    fireEvent.scroll(window);
    await waitFor(() => expect(camSheet()?.viewBox).toBe('12 0 460 500'), { timeout: 1000 }); // R319 override (§D6)
  });

  it('reduced motion at mobile: the crop is the discrete node — never a mid-pan', async () => {
    mobileWanted = true;
    reducedWanted = true;
    installMatchMedia();
    mountLanding();
    await waitFor(() => expect(camSheet()?.flag).toBe('cropped'), { timeout: 2000 });
    /* the reduced branch picks MOBILE_CROPS[idx] — an exact node rect
     * (R314-cycle2 override: the widened mastery node) */
    expect(camSheet()?.viewBox).toBe('12 0 460 500'); // R319 override (§D6)
  });

  it('the ≥992px crossing restores the full sheet exactly once', async () => {
    mobileWanted = true;
    installMatchMedia();
    mountLanding();
    await waitFor(() => expect(camSheet()?.flag).toBe('cropped'), { timeout: 2000 });

    /* crossing up: the desktop branch restores */
    mobileWanted = false;
    installMatchMedia();
    fireEvent.scroll(window);
    await waitFor(
      () => {
        expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
        expect(camSheet()?.par).toBe('xMidYMid meet');
        expect(camSheet()?.flag).toBeNull();
      },
      { timeout: 2000 },
    );

    /* a second desktop frame is a no-op (restore runs once — the
     * flag is cleared; nothing left to restore) */
    fireEvent.scroll(window);
    await new Promise((r) => setTimeout(r, 60));
    expect(camSheet()?.viewBox).toBe(`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`);
  });
});
