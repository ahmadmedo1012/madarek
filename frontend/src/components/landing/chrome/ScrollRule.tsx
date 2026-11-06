/**
 * ScrollRule — r339 T-18 (A6) — the landing's scroll progress rule.
 *
 * The reference's measured chrome (live https://heronaiapp.com/,
 * 2026-11-07, 1440×900): a fixed 1px accent rule pair spanning the
 * content width (x7 → x1434, the page frame's own 7px inset) at the
 * viewport's vertical centre (y = 50vh), that SPLITS as the page
 * scrolls — the top rule rises ∓387.5px, the bottom sinks +310.5px
 * (the same recorded flight distances as the preloader's band exit,
 * r335 _motion.1440) on the recorded band-exit curve, gone by ~50%
 * of the document — plus a mono percentage readout 18px above the
 * rule at the frame's inline-start edge (measured x33 = 26px inside
 * the frame).
 *
 * Reproduced in Madarek's own construction (never the reference's
 * source): the split is a CSS SCROLL-DRIVEN animation over the first
 * 50% of the root scroll (animation-timeline: scroll()) — zero JS per
 * tick, zero keyframe durations (gate law), the curve rides the
 * canonical --motion-ease-band-exit token. Browsers without scroll
 * timelines (WebKit today) render NOTHING (the seats stay at their
 * opacity-0 base — progressive enhancement, no permanent chrome).
 * The percentage text is the one JS seat: a rAF-throttled passive
 * scroll listener writing textContent (idempotent, zero renders).
 * Reduced motion never mounts it (the matchMedia guard below + the
 * scroll-rule.css display:none belt); it is decorative chrome, pointer
 * events none, z 45 (above content, under the nav's 60).
 */
import { useEffect, useRef, useState } from 'react';
import '../../../styles/landing/scroll-rule.css';

export function ScrollRule() {
  const pctRef = useRef<HTMLDivElement>(null);
  /* RM guard — the docblock's own law: reduced motion never mounts
   * the instrument. Checked once + on change; jsdom-safe (no
   * matchMedia → stays mounted, the CSS belt still bounds it). */
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    /* the readout: document scroll traversal as a mono % — the same
     * "you always know where you are" the reference's boot-log gives.
     * rAF-throttled passive listener; the write is idempotent so the
     * engine skips identical frames (zero style recalcs at rest). */
    if (reduced) return undefined;
    const el = pctRef.current;
    if (!el) return undefined;
    let raf = 0;
    let last = '';
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? String(Math.round(window.scrollY / max * 100)) : '0';
      if (pct !== last) {
        el.textContent = `${pct}%`;
        last = pct;
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="scr" aria-hidden="true" data-spec="chrome.scrollrule">
      <div className="scr-rule scr-rule--top" />
      <div className="scr-rule scr-rule--bot" />
      <div className="scr-pct" dir="ltr" ref={pctRef}>0%</div>
    </div>
  );
}
