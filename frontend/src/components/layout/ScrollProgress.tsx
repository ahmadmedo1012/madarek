import { useEffect, useRef, useState } from 'react';
// CONCRETE module import (r157, 6A4-2): the shell suites mock the
// motion BARREL (../motion) with PageTransition only, so a barrel
// import of useReducedMotion would resolve to undefined there — the
// landing components already import from the concrete module.
import { useReducedMotion } from '../motion/useReducedMotion';

/**
 * ScrollProgress — gradient progress bar at top of viewport.
 *
 * r157 (6A4-2 — dead chrome): the shell scrolls `.content`, not the
 * window (wave 7-b bounded .has-shell to 100dvh and made `.content`
 * the real scroller), so the old window listener never fired — the bar
 * sat at scaleX(0) forever. The hook targets `.content` the same way
 * useHideOnScroll and useScrollRestoration do.
 *
 * R366 (Agent 2 · L2, the trace harness): the old handler called
 * setProgress + setVisible on EVERY scroll event — a React re-render
 * of the shell chrome per scroll frame (and setProgress fired even when
 * the value only moved a sub-pixel), plus a synchronous scrollHeight
 * LAYOUT READ inside the event. The measured cost at 4×-throttled CPU:
 * the app pages' scroll windows showed 10–13 dropped frames > 50 ms.
 * The bar is DECORATIVE (aria-hidden, no role) — so it now rides the
 * useHideOnScroll pattern, taken to its conclusion: rAF-batched, one
 * layout read per FRAME (not per event — coalesced wheels cost one
 * read), and a DIRECT style write on the bar node. Zero React renders
 * during scroll; reduced-motion still skips the bar entirely (reactive:
 * the listener re-arms/tears-down when the flag flips).
 */
export function ScrollProgress({ className = 'scroll-progress' }: { className?: string }) {
  const barRef = useRef<HTMLDivElement>(null);
  // state stays OUT of the scroll path — mounted once, never re-rendered
  const [noop] = useState(0);
  void noop;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Skip entirely under prefers-reduced-motion (reactive: the
    // listener re-arms/tears-down when the flag flips).
    if (reducedMotion) return;

    // The app's scroll container is `.content` (see useHideOnScroll for
    // the same pattern). Guarded: chrome-less routes (public colleges
    // layout) never mount the shell, so `.content` may not exist.
    const el = document.querySelector('.content');
    const bar = barRef.current;
    if (!el || !bar) return;

    let raf = 0;
    const paint = () => {
      raf = 0;
      // ONE layout read per frame (scrollTop is cheap; scrollHeight
      // composes into the same forced-layout window this frame already
      // pays for) — coalesced with any other rAF work in the app.
      const scrollTop = el.scrollTop;
      const docHeight = el.scrollHeight - el.clientHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      // direct write — no React state, no re-render, transform-only
      bar.style.transform = `scaleX(${pct})`;
      bar.style.opacity = pct > 0.01 ? '1' : '0';
    };
    const onScroll = () => {
      if (raf) return; /* one pending paint per frame — coalesced */
      raf = requestAnimationFrame(paint);
    };

    paint(); // initial measure
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={barRef}
      className={className}
      style={{ transform: 'scaleX(0)', opacity: 0 }}
      // Decorative scroll indicator: the page's own scrollbar conveys the
      // same position, so the bar is aria-hidden and carries no progressbar
      // role (r134, audit R134-W1-M P2 — role on an aria-hidden element
      // contradicted itself in the accessibility tree).
      aria-hidden="true"
    />
  );
}
