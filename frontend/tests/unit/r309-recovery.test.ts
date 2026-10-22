/**
 * r309-recovery.test.ts — the R309 recovery contracts (unit belt).
 *
 * Pure-geometry tests for the annotation-card layout pass that fixes
 * the production audit's hero defects: cards must clamp inside the
 * drawing frame, must never overlap each other, and the layout must
 * stay stable (a pure function of the frame + anchors — never of the
 * open-state). Plus the letterbox mapping invariants that keep the
 * stations glued to the artwork.
 */
import { describe, it, expect } from 'vitest';
import {
  fitViewBox,
  viewBoxPointToContainer,
  viewBoxRectToContainer,
  normalizeDragRect,
  rectsIntersect,
  layoutAnnotationCards,
  CARD_LAYOUT_DEFAULTS,
} from '../../src/lib/motion/sheetGeometry';

/* the hero's real stations (HeroInspect MARKERS) at display scale */
const STATIONS = [
  { id: 'mg', x: 105.6, y: 244.5, w: 204, h: 88 },
  { id: 'rr', x: 239.0, y: 246.3, w: 212, h: 88 },
  { id: 'cp', x: 491.3, y: 251.8, w: 204, h: 88 },
];

describe('r309 — layoutAnnotationCards (the collision-aware card layout)', () => {
  it('clamps every card inside the frame (the CP left-edge clip defect)', () => {
    /* a station anchored near the frame's left edge with a wide card */
    const out = layoutAnnotationCards(
      { width: 693, height: 420 },
      [{ id: 'edge', x: 20, y: 300, w: 204, h: 88 }],
    );
    const p = out.get('edge');
    expect(p).toBeDefined();
    expect(p!.left).toBeGreaterThanOrEqual(CARD_LAYOUT_DEFAULTS.pad);
    expect(p!.left + 204).toBeLessThanOrEqual(693 - CARD_LAYOUT_DEFAULTS.pad + 0.5);
  });

  it('never lets two cards overlap (the RR/MG overlap defect)', () => {
    /* the real 1440px desktop geometry: MG and RR anchored 133px apart
     * with 204/212px cards — centered side by side they WOULD collide
     * by ~75px; the layout must seat them apart. */
    const out = layoutAnnotationCards({ width: 693, height: 420 }, STATIONS);
    const a = out.get('mg')!;
    const b = out.get('rr')!;
    const c = out.get('cp')!;
    const rectOf = (p: { left: number; top: number }, w: number, h: number) => ({
      left: p.left, top: p.top, width: w, height: h,
    });
    expect(
      rectsIntersect(rectOf(a, 204, 88), rectOf(b, 212, 88)),
      'MG and RR must not overlap',
    ).toBe(false);
    expect(
      rectsIntersect(rectOf(b, 212, 88), rectOf(c, 204, 88)),
      'RR and CP must not overlap',
    ).toBe(false);
    expect(
      rectsIntersect(rectOf(a, 204, 88), rectOf(c, 204, 88)),
      'MG and CP must not overlap',
    ).toBe(false);
  });

  it('every card stays inside the frame after collision resolution', () => {
    /* the tight tablet frame: three wide cards, little room */
    const out = layoutAnnotationCards({ width: 326, height: 200 }, STATIONS);
    for (const s of STATIONS) {
      const p = out.get(s.id)!;
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left + s.w).toBeLessThanOrEqual(326 + 0.5);
      expect(p.top + s.h).toBeLessThanOrEqual(200 + 0.5);
    }
  });

  it('is a PURE function of frame + anchors (stable as cards appear)', () => {
    /* the same inputs must produce byte-identical placements — the
     * layout never depends on which cards are open, so opening one
     * never moves its siblings. */
    const runA = layoutAnnotationCards({ width: 693, height: 420 }, STATIONS);
    const runB = layoutAnnotationCards({ width: 693, height: 420 }, [...STATIONS].reverse());
    for (const s of STATIONS) {
      expect(runA.get(s.id)).toEqual(runB.get(s.id));
    }
  });

  it('seats a below-anchored card under its dot when there is no room above', () => {
    /* a dot near the frame's top: the card must go BELOW the dot */
    const out = layoutAnnotationCards(
      { width: 693, height: 420 },
      [{ id: 'top', x: 350, y: 30, w: 204, h: 88 }],
    );
    const p = out.get('top')!;
    expect(p.top).toBeGreaterThanOrEqual(30 + CARD_LAYOUT_DEFAULTS.anchorGap - 0.5);
  });

  it('oversized cards for a tiny frame clamp to the frame width (mobile floor)', () => {
    const out = layoutAnnotationCards(
      { width: 120, height: 120 },
      [{ id: 'big', x: 60, y: 60, w: 204, h: 88 }],
    );
    const p = out.get('big')!;
    expect(p.left).toBeGreaterThanOrEqual(0);
    expect(p.left + 108).toBeLessThanOrEqual(120); /* w clamped to 120-2*pad */
  });
});

describe('r309 — the letterbox mapping (unchanged invariants, re-pinned)', () => {
  it('fitViewBox produces the uniform centered letterbox', () => {
    /* wide container: height-limited */
    expect(fitViewBox(1000, 460, 760, 460)).toEqual({ scale: 1, offsetX: 120, offsetY: 0 });
    /* narrow container: width-limited */
    expect(fitViewBox(326, 460, 760, 460)).toEqual({
      scale: 326 / 760,
      offsetX: 0,
      offsetY: (460 - 460 * (326 / 760)) / 2,
    });
  });

  it('a station stays glued to its artwork anchor at every crop', () => {
    const crops: Array<[number, number]> = [[1000, 460], [693, 420], [326, 197]];
    for (const [w, h] of crops) {
      const fit = fitViewBox(w, h, 760, 460);
      const c = viewBoxPointToContainer(fit, 520, 258);
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThanOrEqual(w);
      expect(c.y).toBeGreaterThan(0);
      expect(c.y).toBeLessThanOrEqual(h);
    }
  });

  it('drag normalization + AABB intersection agree on the activation test', () => {
    const box = normalizeDragRect(100, 100, 300, 200);
    const hit = viewBoxRectToContainer(
      { scale: 1, offsetX: 0, offsetY: 0 },
      250, 150, 204, 88,
    );
    expect(rectsIntersect(box, hit)).toBe(true);
    const miss = viewBoxRectToContainer(
      { scale: 1, offsetX: 0, offsetY: 0 },
      600, 380, 204, 88,
    );
    expect(rectsIntersect(box, miss)).toBe(false);
  });
});
