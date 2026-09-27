import { useEffect } from 'react';

/**
 * useSmoothScroll — buttery wheel without hijacking anything that matters.
 *
 * What it does (desktop only): intercepts wheel events and walks the
 * window toward the wheel's target with an exponential lerp, instead of
 * the browser's discrete notches. This is the single biggest perceived-
 * quality delta on cinematic pages, and it is safe here because:
 *
 * · scrollbar dragging, keyboard (Space/PgDn/arrows/Home/End), anchor
 *   jumps, find-in-page and programmatic scrolls are NEVER touched —
 *   only the wheel input is re-timed;
 * · ctrl/meta+wheel (zoom) passes through untouched;
 * · any wheel over a scrollable descendant (nav rail, popover) is left
 *   for that element until it reaches its edge, then chains naturally;
 * · it disables itself for touch devices, coarse pointers and
 *   prefers-reduced-motion (native notch scroll is instant — that is
 *   the reduced-motion contract);
 * · it stops cleanly on unmount and when the page hides a modal.
 *
 * Implementation notes:
 * · One rAF loop, started only while settling; zero work at rest.
 * · Lerp factor 0.11/frame ≈ 90ms latency — feels weighted, not laggy.
 * · Max scroll is re-read every frame from the DOM (cheap, and always
 *   right after images/layout shift).
 */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    let targetY = window.scrollY;
    let raf = 0;
    let active = false;

    const maxScroll = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    const step = () => {
      const current = window.scrollY;
      const delta = targetY - current;
      if (Math.abs(delta) < 0.6) {
        // settled — snap exactly and rest
        if (Math.abs(targetY - current) > 0 && targetY <= maxScroll()) {
          window.scrollTo(0, targetY);
        }
        raf = 0;
        active = false;
        return;
      }
      // clamp target (layout may have shrunk the page)
      targetY = Math.min(targetY, maxScroll());
      const next = current + delta * 0.11;
      window.scrollTo(0, next);
      raf = requestAnimationFrame(step);
    };

    const ensureLoop = () => {
      if (!raf) {
        active = true;
        raf = requestAnimationFrame(step);
      }
    };

    const onWheel = (e: WheelEvent) => {
      // zoom gestures and horizontal input are not ours
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      // a scrollable element between us and the wheel keeps priority
      const chain = e.composedPath ? (e.composedPath() as EventTarget[]) : [];
      for (const node of chain) {
        if (node instanceof Element) {
          const style = window.getComputedStyle(node);
          const oy = style.overflowY;
          const scrollable =
            (oy === 'auto' || oy === 'scroll') &&
            node.scrollHeight > node.clientHeight + 1;
          if (scrollable) {
            const atTop = node.scrollTop <= 0;
            const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
            const goingDown = e.deltaY > 0;
            if (!(goingDown && atBottom) && !(!goingDown && atTop)) return; // let it scroll
          }
        }
      }

      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 24 : e.deltaMode === 2 ? window.innerHeight : 1);
      targetY = Math.min(maxScroll(), Math.max(0, (active ? targetY : window.scrollY) + dy));
      ensureLoop();
    };

    // keyboard / scrollbar / anchors: follow the user immediately
    const syncFromNative = () => {
      if (!active) targetY = window.scrollY;
    };
    const onKeyDown = () => {
      active = false;
      targetY = window.scrollY;
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', syncFromNative, { passive: true });
    window.addEventListener('keydown', onKeyDown, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', syncFromNative);
      window.removeEventListener('keydown', onKeyDown);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
