import { useEffect, useState } from 'react';
// CONCRETE module import (r157, 6A4-2): the shell suites mock the
// motion BARREL (../motion) with PageTransition only, so a barrel
// import of useReducedMotion would resolve to undefined there — the
// landing components already import from the concrete module.
import { useReducedMotion } from '../motion/useReducedMotion';

/**
 * ScrollProgress — gradient progress bar at top of viewport.
 *
 * r157 (6A4-2 — dead chrome): the shell scrolls `.content`, not the
 * window (wave 7-b bounded .has-shell to 100dvh and made .content the
 * real scroller), so the old window listener NEVER fired — the bar sat
 * at scaleX(0) forever. The hook now targets `.content` the same way
 * useHideOnScroll and useScrollRestoration do: post-mount
 * querySelector, guard when the element is absent (chrome-less public
 * layouts), removeEventListener cleanup. Reduced-motion is the shared
 * reactive useReducedMotion() — toggling the OS setting mid-session
 * re-evaluates instead of freezing the mount-time decision.
 */
export function ScrollProgress({ className = 'scroll-progress' }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Skip entirely under prefers-reduced-motion (reactive: the
    // listener re-arms/tears-down when the flag flips).
    if (reducedMotion) return;

    // The app's scroll container is .content (see useHideOnScroll for
    // the same pattern). Guarded: chrome-less routes (public colleges
    // layout) never mount the shell, so .content may not exist.
    const el = document.querySelector('.content');
    if (!el) return;

    const onScroll = () => {
      const scrollTop = el.scrollTop;
      const docHeight = el.scrollHeight - el.clientHeight;
      const pct = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(pct);
      setVisible(pct > 0.01);
    };

    onScroll(); // initial measure
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [reducedMotion]);

  return (
    <div
      className={className}
      style={{ transform: `scaleX(${progress})`, opacity: visible ? 1 : 0 }}
      // Decorative scroll indicator: the page's own scrollbar conveys the
      // same position, so the bar is aria-hidden and carries no progressbar
      // role (r134, audit R134-W1-M P2 — role on an aria-hidden element
      // contradicted itself in the accessibility tree).
      aria-hidden="true"
    />
  );
}
