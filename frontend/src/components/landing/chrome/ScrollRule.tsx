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
import { useEffect, useRef } from 'react';
import { registerProgressSeat } from '../../../lib/progressRegistry';
import { useReducedMotion } from '../../motion/useReducedMotion';
import '../../../styles/landing/scroll-rule.css';

/* R340 T-P1x — the landing's stage count (the BootLog's own nine,
 * kept here too: the tick rail draws one tick per stage). */
const STAGE_TICKS = 9;

export function ScrollRule() {
  const pctRef = useRef<HTMLDivElement>(null);
  const ticksRef = useRef<HTMLDivElement>(null);
  /* RM guard — the docblock's own law: reduced motion never mounts
   * the instrument. The canonical hook (single source of truth — the
   * r340 refactor also retired this file's inline duplicate, the
   * jscpd +1). jsdom-safe (no matchMedia → false → mounted, the CSS
   * belt still bounds it). */
  const reduced = useReducedMotion();

  useEffect(() => {
    /* the readout: document scroll traversal as a mono % — the same
     * "you always know where you are" the reference's boot-log gives.
     * rAF-throttled passive listener; the write is idempotent so the
     * engine skips identical frames (zero style recalcs at rest).
     *
     * R340 T-P1x — the same driver now also feeds the tick rail (one
     * tick per stage, data-passed as its top crosses 40% vh — the
     * BootLog's own threshold) and refreshes the progress registry
     * ranges (max scroll is viewport-derived). The registry is the
     * conformance instrument's inventory (lib/progressRegistry.ts);
     * each seat must MOVE with scroll or the check fails it — these
     * four do: the split pair (scroll-driven animation), the readout
     * (text), the ticks (discrete data-passed flips). */
    if (reduced) return undefined;
    const el = pctRef.current;
    const ticks = ticksRef.current;
    if (!el) return undefined;

    const topSeat = (el.parentElement?.querySelector('.scr-rule--top') as HTMLElement | null) ?? null;
    const botSeat = (el.parentElement?.querySelector('.scr-rule--bot') as HTMLElement | null) ?? null;
    const pctSeat = { el, label: 'scr-pct', range: [0, 1] as [number, number] };
    const tickSeat = ticks ? { el: ticks, label: 'scr-ticks', range: [0, 1] as [number, number] } : null;
    const ruleTopSeat = topSeat ? { el: topSeat, label: 'scr-rule-top', range: [0, 1] as [number, number] } : null;
    const ruleBotSeat = botSeat ? { el: botSeat, label: 'scr-rule-bot', range: [0, 1] as [number, number] } : null;
    const unreg = [
      ...(ruleTopSeat ? [registerProgressSeat(ruleTopSeat)] : []),
      ...(ruleBotSeat ? [registerProgressSeat(ruleBotSeat)] : []),
      registerProgressSeat(pctSeat),
      ...(tickSeat ? [registerProgressSeat(tickSeat)] : []),
    ];

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
      if (ticks) {
        const children = ticks.children;
        const passed = Math.min(STAGE_TICKS, Math.max(0, Math.round((window.scrollY / Math.max(1, max)) * STAGE_TICKS)));
        for (let i = 0; i < children.length; i++) {
          const t = children[i] as HTMLElement;
          const on = i < passed;
          if (on !== t.hasAttribute('data-passed')) {
            if (on) t.setAttribute('data-passed', '');
            else t.removeAttribute('data-passed');
          }
        }
      }
      for (const s of [pctSeat, tickSeat]) {
        if (s) s.range = [0, Math.max(1, max)];
      }
      /* the pair scrubs over the FIRST 50% of the document — the
       * animation-range law below; the registry mirrors it. */
      const half = Math.max(1, Math.round(max / 2));
      if (ruleTopSeat) ruleTopSeat.range = [0, half];
      if (ruleBotSeat) ruleBotSeat.range = [0, half];
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
      unreg.forEach((u) => u());
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <div className="scr" aria-hidden="true" data-spec="chrome.scrollrule">
      <div className="scr-rule scr-rule--top" />
      <div className="scr-rule scr-rule--bot" />
      {/* R340 T-P1x — the tick rail: one tick per stage, data-passed
          flips as the document scrolls (discrete background flips —
          the BootLog's counter twin at the rule's inline-start). */}
      <div className="scr-ticks" ref={ticksRef}>
        {Array.from({ length: STAGE_TICKS }, (_, i) => (
          <span key={i} className="scr-tick" />
        ))}
      </div>
      <div className="scr-pct" dir="ltr" ref={pctRef}>0%</div>
    </div>
  );
}
