import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useReducedMotion';
import {
  desktopCursorAllowed,
  finePointerSupported,
  LINE_LERP_FACTOR,
  LERP_FACTOR,
  PointerTracker,
  STOP_EPS,
} from '../../lib/motion/pointer';
import './cursor.css';

/* ═════════════════════════════════════════════════════════════════════
   CursorManager — R305-A2 additive pointer layer (original Madarek
   implementation of the Heron-style cursor mechanics).

   PUBLIC CONTRACT
   ───────────────
   · <CursorManager /> — mount ONCE globally (parent wires it in
     App.tsx next to the toast stack). Renders null unless the gate
     passes, so inactive environments pay one hook read and no DOM.
   · Gate: (hover: hover) AND (pointer: fine) AND viewport >= 992px
     AND NOT reduced-motion (useReducedMotion is the single RM source).
     Re-evaluated on resize + fine-pointer media changes; the pointer
     pipeline re-subscribes whenever the gate flips.
   · R311 §1.3 — `suspended` prop: while true the layer is FULLY down
     (render null + pipeline teardown, never a hidden div): the landing
     route mounts its own measured square instrument (SheetCursor) and
     this app-level layer must not paint a second, circular glyph over
     it. App.tsx drives the prop from the router (pathname === '/').
   · Native cursor is NEVER hidden — the layer is pure decoration
     (pointer-events: none); if JS dies it never mounts.

   STATE DELEGATION (documented choice: DOM attribute writes, not
   React state — pointer traffic must not re-render the tree):
   · data-state on the layer: default | link | text | drag | hidden,
     plus "down" while pressed. resolveCursorState() is the pure
     mapping (exported for tests). R311 §1.5: `data-cursor="none"` is
     THE ONE suppression vocabulary across the app — the landing's
     zones (hero stage, entrance loader) migrated to it in R311:
       [data-cursor="none"]            → hidden (dot suppressed)
       [data-cursor="drag"]            → drag (crosshair)
       input/textarea/select/
       [contenteditable]               → text
       a, button, [role="button"],
       [role="link"], .btn, .nav-item,
       summary, label                  → link
   · data-active="true" after the first pointermove (layer starts
     inert: children sit at opacity 0 in cursor.css).
   · pointerdown/up → data-state="down" (restored from the last
     hovered target on release; hidden surfaces never show a press).

   CONSTRUCTION LINES (opt-in surface contract):
   · Any ancestor with data-cursor-lines="cross" | "x" | "y" turns the
     hairlines + mono readout on while the pointer is inside it
     ("x" = horizontal hairline, "y" = vertical hairline).
   · Geometry flows through CSS custom properties written on the
     .cursor-lines wrapper in the SAME rAF tick as the dot
     (--cursor-line-x/-y follower, --cursor-line-left/-top/-width/
     -height container bounds); cursor.css sizes/places the hairlines
     from those vars. Container rect is cached on enter and refreshed
     rAF-throttled on scroll (capture phase — the shell scrolls
     .content, and scroll events do not bubble) + resize.
   · Leaving the container (pointerout past its bounds or the
     container unmounting) flips data-lines back to "off".

   PERFORMANCE SHAPE: one window pointermove listener (passive) feeds
   two PointerTrackers; the rAF loop self-cancels when both converge
   (idle stop — zero perpetual work) and restarts on the next move.
   The dot anchor is JS-driven (translate3d only); state visuals are
   CSS transform/opacity transitions on child elements. StrictMode
   safe: every subscription lives in an effect with full cleanup, so
   mount → cleanup → mount leaves zero listeners and zero rAFs.
   ═════════════════════════════════════════════════════════════════════ */

export type CursorState = 'default' | 'link' | 'text' | 'drag' | 'hidden';

export type CursorManagerProps = {
  /** R311 §1.3 — while true the layer renders null and its pointer
   * pipeline is fully torn down (the landing route owns the pointer
   * with its square instrument; no circular glyph may compete). */
  suspended?: boolean;
};

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], [role="link"], .btn, .nav-item, summary, label';

const TEXT_FIELD_SELECTOR =
  'input, textarea, select, [contenteditable="true"], [contenteditable=""]';

/** Pure state mapping for a pointerover/out target. Precedence:
 *  explicit data-cursor wins over implicit semantics ("none" beats
 *  everything — contract for custom surfaces like the landing world). */
export function resolveCursorState(target: Element | null): CursorState {
  if (!target) return 'default';
  if (target.closest('[data-cursor="none"]')) return 'hidden';
  if (target.closest('[data-cursor="drag"]')) return 'drag';
  if (target.closest(TEXT_FIELD_SELECTOR)) return 'text';
  if (target.closest(INTERACTIVE_SELECTOR)) return 'link';
  return 'default';
}

type LinesAxis = 'cross' | 'x' | 'y';

export function CursorManager({ suspended = false }: CursorManagerProps): JSX.Element | null {
  const reduced = useReducedMotion();
  const [gateOpen, setGateOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return finePointerSupported() && desktopCursorAllowed(window.innerWidth);
  });
  const layerRef = useRef<HTMLDivElement | null>(null);

  const active = gateOpen && !reduced && !suspended;

  /* Gate watch: re-evaluate on resize and fine-pointer media changes
   * (passive, rAF-throttled). Skipped entirely under reduced motion —
   * the layer is down regardless, so no subscriptions at all. */
  useEffect(() => {
    if (reduced) return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    let raf = 0;
    const evaluate = () => {
      raf = 0;
      setGateOpen(finePointerSupported() && desktopCursorAllowed(window.innerWidth));
    };
    const onEvaluate = () => {
      if (raf) return;
      raf = requestAnimationFrame(evaluate);
    };

    evaluate();
    const fineMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onFineChange = () => onEvaluate();
    fineMedia.addEventListener('change', onFineChange);
    window.addEventListener('resize', onEvaluate, { passive: true });

    return () => {
      fineMedia.removeEventListener('change', onFineChange);
      window.removeEventListener('resize', onEvaluate);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced]);

  /* Pointer pipeline: tracks, state delegation, construction lines.
   * Re-runs (full resubscribe) whenever the gate flips. */
  useEffect(() => {
    if (!active) return;
    const layer = layerRef.current;
    if (!layer) return;

    const dotAnchor = layer.querySelector<HTMLElement>('.cursor-dot');
    const linesWrap = layer.querySelector<HTMLElement>('.cursor-lines');
    const readout = layer.querySelector<HTMLElement>('.cursor-readout');

    const dotTracker = new PointerTracker(LERP_FACTOR, STOP_EPS);
    const lineTracker = new PointerTracker(LINE_LERP_FACTOR, STOP_EPS);

    let rafId = 0;
    let rectRaf = 0;
    let hasMoved = false;
    let pressed = false;
    let lastTarget: Element | null = null;
    let lastX = 0;
    let lastY = 0;
    let linesOn = false;
    let linesContainer: Element | null = null;
    let linesRect: DOMRect | null = null;

    const scheduleFrame = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(frame);
    };

    const frame = () => {
      rafId = 0;
      // Belt: container removed from the DOM while its lines are on.
      if (linesOn && linesContainer && !linesContainer.isConnected) leaveLines();

      const dotMoving = dotTracker.step();
      const lineMoving = lineTracker.step();
      const cx = dotTracker.current.x;
      const cy = dotTracker.current.y;

      if (dotAnchor) {
        dotAnchor.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      }

      if (linesOn && linesRect && linesWrap) {
        const s = linesWrap.style;
        s.setProperty('--cursor-line-x', `${cx.toFixed(2)}px`);
        s.setProperty('--cursor-line-y', `${cy.toFixed(2)}px`);
        s.setProperty('--cursor-line-left', `${linesRect.left.toFixed(2)}px`);
        s.setProperty('--cursor-line-top', `${linesRect.top.toFixed(2)}px`);
        s.setProperty('--cursor-line-width', `${linesRect.width.toFixed(2)}px`);
        s.setProperty('--cursor-line-height', `${linesRect.height.toFixed(2)}px`);
        if (readout) {
          const vw = window.innerWidth || 1;
          const vh = window.innerHeight || 1;
          readout.textContent = `${Math.round((cx / vw) * 100)}% · ${Math.round((cy / vh) * 100)}%`;
        }
      }

      // Self-cancelling loop: idle stop when both followers converge.
      if (dotMoving || lineMoving) rafId = requestAnimationFrame(frame);
    };

    const applyState = (state: CursorState) => {
      if (layer.getAttribute('data-state') === state) return;
      layer.setAttribute('data-state', state);
    };

    const leaveLines = () => {
      linesOn = false;
      linesContainer = null;
      linesRect = null;
      layer.setAttribute('data-lines', 'off');
    };

    const enterLines = (container: Element | null) => {
      if (!container) {
        if (linesOn) leaveLines();
        return;
      }
      const mode = container.getAttribute('data-cursor-lines');
      const axis: LinesAxis = mode === 'x' || mode === 'y' ? mode : 'cross';
      linesContainer = container;
      linesRect = container.getBoundingClientRect();
      linesOn = true;
      // Lines appear at the pointer, then trail it with the softer factor.
      lineTracker.reset(lastX, lastY);
      layer.setAttribute('data-lines', 'on');
      layer.setAttribute('data-lines-axis', axis);
      scheduleFrame();
    };

    const onPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      lastX = x;
      lastY = y;
      if (!hasMoved) {
        hasMoved = true;
        // Snap on first sight — no fly-in from the layer origin.
        dotTracker.reset(x, y);
        lineTracker.reset(x, y);
        layer.setAttribute('data-active', 'true');
      }
      dotTracker.target.x = x;
      dotTracker.target.y = y;
      if (linesOn) {
        lineTracker.target.x = x;
        lineTracker.target.y = y;
      } else {
        // Keep the lines follower parked so the loop can idle-stop.
        lineTracker.reset(x, y);
      }
      scheduleFrame();
    };

    const onPointerOver = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      lastTarget = target;
      if (!pressed) applyState(resolveCursorState(target));
      enterLines(target ? target.closest('[data-cursor-lines]') : null);
    };

    const onPointerOut = (e: PointerEvent) => {
      const next = e.relatedTarget instanceof Element ? e.relatedTarget : null;
      if (linesOn && linesContainer) {
        const nextContainer = next ? next.closest('[data-cursor-lines]') : null;
        if (nextContainer !== linesContainer) leaveLines();
      }
      applyState(resolveCursorState(next));
      if (!next) lastTarget = null;
    };

    const onPointerDown = () => {
      if (!hasMoved || pressed) return;
      // Custom surfaces suppress the dot; they must not flash a press.
      if (layer.getAttribute('data-state') === 'hidden') return;
      pressed = true;
      layer.setAttribute('data-state', 'down');
    };

    const onPointerUp = () => {
      if (!pressed) return;
      pressed = false;
      applyState(resolveCursorState(lastTarget));
    };

    // Rect refresh while lines are on: capture-phase scroll catches the
    // shell's inner scroller (.content — scroll events do not bubble),
    // resize covers viewport changes. rAF-throttled, passive.
    const refreshRect = () => {
      if (!linesOn || !linesContainer) return;
      linesRect = linesContainer.getBoundingClientRect();
      scheduleFrame();
    };
    const onGeometryChange = () => {
      if (rectRaf) return;
      rectRaf = requestAnimationFrame(() => {
        rectRaf = 0;
        refreshRect();
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointerover', onPointerOver, { passive: true });
    document.addEventListener('pointerout', onPointerOut, { passive: true });
    document.addEventListener('scroll', onGeometryChange, { capture: true, passive: true });
    window.addEventListener('resize', onGeometryChange, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('pointerout', onPointerOut);
      document.removeEventListener('scroll', onGeometryChange, { capture: true });
      window.removeEventListener('resize', onGeometryChange);
      if (rafId) cancelAnimationFrame(rafId);
      if (rectRaf) cancelAnimationFrame(rectRaf);
      rafId = 0;
      rectRaf = 0;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={layerRef}
      className="cursor-layer"
      role="presentation"
      aria-hidden="true"
      data-state="default"
      data-lines="off"
      data-lines-axis="cross"
    >
      <div className="cursor-dot">
        <div className="cursor-dot-core" />
        <div className="cursor-dot-ring" />
      </div>
      <div className="cursor-lines">
        <div className="cursor-line-h" />
        <div className="cursor-line-v" />
        <div className="cursor-readout" />
      </div>
    </div>
  );
}

(CursorManager as { displayName?: string }).displayName = 'CursorManager';
