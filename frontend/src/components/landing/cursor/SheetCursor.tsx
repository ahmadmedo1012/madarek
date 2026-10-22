/**
 * SheetCursor — R308 «أداة الإشارة» — the landing's custom pointer.
 *
 * An ORIGINAL implementation of the reference's measured cursor
 * grammar (docs/redesign/r308/reference-observations.md §4), on the
 * Madarek token system:
 *
 *  · Canvas 2D layer (fixed, viewport-sized, DPR-capped at 2): a 9px
 *    square in the ONE signal color, eased toward the pointer
 *    (lerp 0.18), with a velocity trail that appears ONLY above a
 *    speed threshold and vanishes on the first still frame — per-
 *    segment alpha ramps quadratically from 0 (oldest) to ≈1 (newest).
 *    A ground-color plate rides under the square so the dot stays
 *    readable over photography and the dark theme (the reference's
 *    colour-adaptation claim could not be reproduced on their DOM —
 *    this is the honest, always-readable equivalent).
 *  · Interactive-state layer: a 24px square outline that appears over
 *    real interactive elements and CONTRACTS into a targeting
 *    reticle (scale .56 / opacity .68) while pressed.
 *  · `data-cursor="none"` suppression zones (R311 §1.5 — the ONE
 *    unified vocabulary, the same token the app-level resolver
 *    honours): where a local system takes over (the hero instrument,
 *    the loader), both layers step aside. The native cursor returns
 *    there.
 *  · Wake/sleep: the whole system rides the ONE shared clock
 *    (sheetConductor) and UNSUBSCRIBES ~8 frames after the pointer
 *    settles — an idle page costs zero animation frames.
 *
 * Gating (the reference's own ladder): fine pointer + hover only, and
 * never under `prefers-reduced-motion` — the native cursor stays. The
 * authenticated application never mounts this component; it is a
 * landing-sheet instrument.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeSheetFrame, wakeSheet, lerp } from '../../../lib/motion/sheetConductor';

/* Measured reference constants (see reference-observations.md §4/§5). */
const DOT_SIZE = 9;
const PLATE_SIZE = 13; /* the ground-colour plate under the dot */
const LERP_K = 0.18;
const SPEED_SMOOTHING = 0.2;
const TRAIL_SPEED_THRESHOLD = 1.5; /* px/frame — trail only when fast */
const TRAIL_LINE_WIDTH = 1.4;
const TRAIL_MAX_POINTS = 26;
const IDLE_SLEEP_FRAMES = 8;
const IDLE_SPEED = 0.05;
const DPR_CAP = 2;

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, label, summary, [data-cursor="link"]';
const SUPPRESSED_SELECTOR = '[data-cursor="none"]';

export function SheetCursor() {
  const [live, setLive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  /* ── Eligibility: fine pointer + hover, and never under reduced
   *     motion (the native cursor is the complete fallback). ─────── */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = () => setLive(fine.matches && !reduced.matches);
    evaluate();
    fine.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);
    return () => {
      fine.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  /* ── The instrument itself: runs only while eligible. ──────────── */
  useEffect(() => {
    if (!live) return undefined;
    const canvas = canvasRef.current;
    const ring = ringRef.current;
    if (!canvas || !ring) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let vw = 0;
    let vh = 0;
    let dpr = 1;

    /* colours re-read on every wake — theme flips mid-session stay
     * correct because the next pointer movement re-wakes the system. */
    let ink = '#FA3600';
    let plate = '#F6F8FA';

    const readColors = () => {
      const styles = getComputedStyle(document.documentElement);
      ink = styles.getPropertyValue('--accent').trim() || ink;
      plate = styles.getPropertyValue('--bg').trim() || plate;
    };

    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      canvas.style.inlineSize = `${vw}px`;
      canvas.style.blockSize = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    readColors();

    /* mark the document so the CSS hides the native cursor ONLY while
     * the instrument is actually live (any failure → native cursor). */
    document.documentElement.dataset.sheetCursor = 'live';

    /* ── pointer state (refs — zero React renders per event) ─────── */
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let speed = 0;
    let trail: Array<{ x: number; y: number }> = [];
    let hasMoved = false;
    let overInteractive = false;
    let suppressed = false;
    let pressed = false;
    let ringVisible = false;
    let idleFrames = 0;
    let lastMoveAt = 0;
    let unsubFrame: (() => void) | null = null;

    const setRingState = () => {
      const show = overInteractive && !suppressed && hasMoved;
      if (show !== ringVisible) {
        ringVisible = show;
        ring.dataset.on = show ? 'on' : 'off';
      }
      ring.dataset.pressed = pressed ? 'on' : 'off';
    };

    /* ── the frame: reads state, draws, and sleeps when settled ──── */
    const frame = (now: number) => {
      /* read phase */
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const instant = Math.hypot(dx, dy);
      speed += (instant - speed) * SPEED_SMOOTHING;

      /* write phase */
      pos.x = lerp(pos.x, target.x, LERP_K);
      pos.y = lerp(pos.y, target.y, LERP_K);
      ringPos.x = lerp(ringPos.x, target.x, LERP_K);
      ringPos.y = lerp(ringPos.y, target.y, LERP_K);
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;

      if (speed > TRAIL_SPEED_THRESHOLD) {
        trail.push({ x: pos.x, y: pos.y });
        if (trail.length > TRAIL_MAX_POINTS) trail.shift();
      } else if (trail.length > 0) {
        trail = []; /* the trail vanishes on the first still frame */
      }

      ctx.clearRect(0, 0, vw, vh);
      if (!suppressed && hasMoved) {
        if (trail.length > 1) {
          ctx.lineWidth = TRAIL_LINE_WIDTH;
          ctx.strokeStyle = ink;
          ctx.lineCap = 'round';
          for (let i = 1; i < trail.length; i += 1) {
            const a = trail[i - 1];
            const b = trail[i];
            if (!a || !b) continue;
            const t = i / (trail.length - 1); /* 0 oldest → 1 newest */
            ctx.globalAlpha = t * t; /* quadratic ramp */
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }
        /* the ground plate keeps the dot readable over photos + dark */
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = plate;
        ctx.fillRect(
          Math.round(pos.x - PLATE_SIZE / 2),
          Math.round(pos.y - PLATE_SIZE / 2),
          PLATE_SIZE,
          PLATE_SIZE,
        );
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        ctx.fillRect(
          Math.round(pos.x - DOT_SIZE / 2),
          Math.round(pos.y - DOT_SIZE / 2),
          DOT_SIZE,
          DOT_SIZE,
        );
      }

      /* sleep when the pointer has settled — the system unsubscribes
       * itself and costs nothing until the next movement wakes it. */
      if (hasMoved && now - lastMoveAt > 120 && speed < IDLE_SPEED) {
        idleFrames += 1;
        if (idleFrames >= IDLE_SLEEP_FRAMES && unsubFrame) {
          unsubFrame();
          unsubFrame = null;
        }
      } else {
        idleFrames = 0;
      }
    };

    const wake = () => {
      readColors();
      if (!unsubFrame) {
        unsubFrame = subscribeSheetFrame(frame);
      } else {
        wakeSheet();
      }
    };

    /* ── listeners ────────────────────────────────────────────────── */
    /* R311 §1.6 (initial pointer entry): the boundary events can fire
     * BEFORE the first pointermove (a pointer entering the viewport
     * straight onto a link), so setRingState() saw hasMoved=false and
     * the reticle missed its transition until the next crossing. The
     * move handler now owns the state as well — every move re-derives
     * interactive/suppressed from its own target and re-evaluates. */
    const onPointerMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      lastMoveAt = performance.now();
      hasMoved = true;
      const el = e.target instanceof Element ? e.target : null;
      if (el && typeof el.closest === 'function') {
        overInteractive = !!el.closest(INTERACTIVE_SELECTOR);
        suppressed = !!el.closest(SUPPRESSED_SELECTOR);
      }
      setRingState();
      idleFrames = 0;
      wake();
    };

    const onPointerOver = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el || typeof el.closest !== 'function') return;
      overInteractive = !!el.closest(INTERACTIVE_SELECTOR);
      suppressed = !!el.closest(SUPPRESSED_SELECTOR);
      setRingState();
    };

    const onPointerDown = (e: PointerEvent) => {
      pressed = true;
      setRingState();
      onPointerMove(e);
    };
    const onPointerUp = () => {
      pressed = false;
      setRingState();
    };

    const onVisibility = () => {
      if (document.hidden && unsubFrame) {
        unsubFrame();
        unsubFrame = null;
      }
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerover', onPointerOver, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (unsubFrame) unsubFrame();
      delete document.documentElement.dataset.sheetCursor;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerover', onPointerOver);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [live]);

  if (!live) return null;

  return (
    <>
      <canvas ref={canvasRef} className="sc-canvas" aria-hidden="true" />
      <div ref={ringRef} className="sc-ring" data-on="off" data-pressed="off" aria-hidden="true" />
    </>
  );
}
