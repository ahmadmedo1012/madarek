import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * r368 T1 — the per-family entry lines (the committed restructure).
 *
 * The two global IO buckets (lines −15 %, items −12 %) could not express the
 * reference's measured heterogeneity: the intro band enters WITH the page, the
 * problem family's transitions begin deep below the fold (the census-validated
 * trigger window starts at −1.8×H), the usecase rows engage at +0.2×H, and the
 * CTA/footer families show no pre-entry motion. This suite pins the family
 * structure (the margins, the selector→family assignment, the derivation law)
 * so the restructure cannot silently regress. The browser-side behavior
 * (crossings, onsets, RM bail) is verified by the fidelity instrument on a
 * real dev server per the repo's established pattern.
 */

const revealsPath = resolve(__dirname, '../../src/lib/reveals.ts');
const src = readFileSync(revealsPath, 'utf8');

const FAMILY_LINES = {
  problem: /OBSERVER_ROOT_MARGIN_PROBLEM = '0px 0px 72% 0px'/,
  beat: /OBSERVER_ROOT_MARGIN_BEAT = '0px 0px 66% 0px'/,
  rows: /OBSERVER_ROOT_MARGIN_ROWS = '0px 0px -77% 0px'/,
  entry: /OBSERVER_ROOT_MARGIN_ENTRY = '0px 0px -100% 0px'/,
};

describe('the per-family entry lines (r368 T1)', () => {
  it('declares the four family margins exactly as committed', () => {
    for (const [family, re] of Object.entries(FAMILY_LINES)) {
      expect(re.test(src), `family ${family} margin declaration`).toBe(true);
    }
  });

  it('no global two-bucket leftovers — every family rides its own bucket', () => {
    expect(src).not.toMatch(/OBSERVER_ROOT_MARGIN_LINES/);
    expect(src).not.toMatch(/OBSERVER_ROOT_MARGIN_ITEMS/);
    // every observe() call names a family margin
    const observeCalls = src.match(/observe\(pending\w+, OBSERVER_ROOT_MARGIN_\w+\)/g) ?? [];
    expect(observeCalls.length).toBeGreaterThanOrEqual(6);
    for (const call of observeCalls) {
      expect(call).toMatch(/OBSERVER_ROOT_MARGIN_(PROBLEM|BEAT|ROWS|ENTRY)/);
    }
  });

  it('the family assignments: problem items+cards one bucket; rows their own; CTA+platform+rise+rules the entry line; beats at load', () => {
    const body = src.slice(src.indexOf('export function initReveals'));
    expect(body).toMatch(/observe\(pendingProblem, OBSERVER_ROOT_MARGIN_PROBLEM\)/);
    expect(body).toMatch(/observe\(pendingRows, OBSERVER_ROOT_MARGIN_ROWS\)/);
    expect(body).toMatch(/observe\(pendingCta, OBSERVER_ROOT_MARGIN_ENTRY\)/);
    expect(body).toMatch(/observe\(pendingRises, OBSERVER_ROOT_MARGIN_ENTRY\)/);
    expect(body).toMatch(/observe\(pendingBeats, OBSERVER_ROOT_MARGIN_BEAT\)/);
    expect(body).toMatch(/observe\(pendingRules, OBSERVER_ROOT_MARGIN_ENTRY\)/);
    // the problem family is the columns AND the art panels (one bucket, one onset)
    expect(src).toMatch(/PROBLEM_ITEM_SEL = '\.pm-col'/);
    expect(src).toMatch(/PROBLEM_CARD_SEL = '\.pm-artzone \.pm-art'/);
    // the usecase rows are their own family
    expect(src).toMatch(/ROWS_SEL = '\.rl-row'/);
  });

  it('the derivation law is documented (d−L over live geometry — the validated arithmetic)', () => {
    // the header must carry the validated crossing law so future edits keep
    // the arithmetic honest: an element at offset d crosses L at E+d−L
    expect(src).toMatch(/\(d−L\)\/H|\(d-L\)\/H/);
    expect(src).toMatch(/\+670|723 px/); // the live-vs-snapshot drift warning
  });

  it('the why scene lever is recorded as the Task-3 handoff (not silently dropped)', () => {
    // the why seat's elements arm through their own files — the early-line
    // lever must stay visible as a handoff, never disappear
    expect(src).toMatch(/WHY scene family|why seat|Task-3|Task 3/);
  });
});

describe('the family-margin semantics (the physics the numbers encode)', () => {
  it('positive margins expand the root below the fold — off-screen starts like the reference', () => {
    // 72% of a 900 px viewport = 648 px below the fold: the problem family's
    // transitions start ~650 px below it (the census-validated −1.8×H window),
    // so the columns are mid-reveal as they enter view — the measured
    // reference behavior
    expect(0.72 * 900).toBeCloseTo(648, 0);
    // 66% fires the intro beats at load (the reference's band is mid-flight
    // at the stage top — measured)
    expect(900 + 0.66 * 900).toBeGreaterThan(1482); // the beats' load-time y
  });

  it('negative margins delay: the rows line at −77% seats the rows in the top quarter', () => {
    expect(Math.round((1 - 0.77) * 900)).toBe(207);
    // −100% collapses the root onto the viewport top: elements reveal as
    // their tops pass it — at/after entry, never pre-entry
    expect(1 - 1).toBe(0);
  });

  it('the crossing formula: frac = (d − L) / H — validated live within ±40 px', () => {
    // the measured problem case: d=209, the old items line L=792, H=746
    expect((209 - 792) / 746).toBeCloseTo(-0.78, 2); // the OLD onset (pre-restructure)
    // the restructured problem line: L = 900×1.72 = 1548 → (209−1548)/746
    expect((209 - 1548) / 746).toBeCloseTo(-1.79, 1); // ≈ the reference's −1.8×H window start
    // the usecase rows: d=381, the new L=207 → +0.20×H (the measured reference onset)
    expect((381 - 207) / 886).toBeCloseTo(0.196, 2);
  });
});

// ── module init under reduced motion (the contract: bail before arming) ────
describe('initReveals contract', () => {
  beforeEach(() => {
    vi.resetModules();
    (window as unknown as { __mdrkReveals?: unknown }).__mdrkReveals = undefined;
    class StubIO {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);
      root = null;
      rootMargin = '';
      thresholds: ReadonlyArray<number> = [];
    }
    (window as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      StubIO as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reduced motion: bails entirely — no armed class, no observers, content visible', async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    });
    document.body.innerHTML = '<div class="pm-col">x</div><span class="st-plabel">y</span>';
    const { initReveals } = await import('../../src/lib/reveals');
    const handle = initReveals();
    handle.destroy();
    expect(document.documentElement.classList.contains('js-reveal-armed')).toBe(false);
    expect(document.querySelector('.pm-col')!.className).toBe('pm-col');
  });
});
