/**
 * Preloader — R333 «تتابع الدخول» — the entry overlay (heron-craft row 1).
 *
 * A full-screen paper overlay on the page ground (var(--bg)): the brand
 * mark + the «مدارك» outlined wordmark draw in via the ONE brand
 * system's own stroke-draw (<Logo animated> — hairlines first, the
 * orange point last, complete-and-static under reduced motion), with a
 * mono percentage counter (0→100) tied to REAL asset readiness
 * (document load + document.fonts.ready) bounded to min 900 ms /
 * max 2.2 s — the counter never lies and never stalls.
 *
 * Exit: a GSAP wipe — the paper sheet collapses via clip-path
 * inset(0 100% 0 0) over 0.6 s power3.inOut after a short 100% hold,
 * revealing the page right-first (the RTL reading side). At exit START
 * the component dispatches the `mdrk:entry-done` custom event AND calls
 * onExitStart, so downstream chrome (the consent banner) mounts under
 * the reveal and never overlaps the overlay.
 *
 * Gating (owned by the parent through the introGate decision):
 * plays once per session (the `madarek-intro-seen` sessionStorage flag
 * is stamped here on play), never under prefers-reduced-motion (the
 * parent never mounts it; a defensive in-component guard completes
 * instantly), never for save-data/slow-device visitors.
 */
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Logo } from '../../../brand';
import { markIntroSeen } from '../../../lib/motion/introGate';
import '../../../styles/landing/preloader.css';

const MIN_HOLD_MS = 900; /* the counter never resolves faster than this */
const MAX_RUN_MS = 2200; /* the hard cap — readiness races this timer */
const EXIT_HOLD_MS = 280; /* the 100% beat before the wipe opens */
const EXIT_WIPE_S = 0.6; /* heron-craft row 20 physics: power3.inOut */
const ENTRY_DONE_EVENT = 'mdrk:entry-done';

type PreloaderProps = {
  /** the exit wipe is about to open — chrome may mount beneath it */
  onExitStart?: () => void;
  /** the overlay has fully revealed the page — safe to unmount */
  onDone?: () => void;
};

export function Preloader({ onExitStart, onDone }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const [pct, setPct] = useState(0);

  /* the callbacks ride refs so the instrument below owns its clock
   * exactly once per mount (parent re-renders must not restart it). */
  const cbsRef = useRef({ onExitStart, onDone });
  useEffect(() => {
    cbsRef.current = { onExitStart, onDone };
  }, [onExitStart, onDone]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    /* session-once: the introGate's sessionStorage seen-flag is THE
     * flag — stamped the moment the overlay plays so in-session
     * navigations never replay the sequence. */
    markIntroSeen();

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      /* belt-and-braces: the parent's gate already refuses to mount
       * under RM — if the gate is ever bypassed, skip entirely. */
      cbsRef.current.onExitStart?.();
      cbsRef.current.onDone?.();
      return undefined;
    }

    const start = performance.now();
    let solved = false; /* real assets are in */
    let exited = false;
    let raf = 0;
    let shown = 0; /* the eased display value behind the counter */
    let timeline: gsap.core.Timeline | null = null;
    const cleanups: Array<() => void> = [];

    const runExit = () => {
      if (exited) return;
      exited = true;
      cancelAnimationFrame(raf);
      setPct(100);
      if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)';
      /* the consent banner (and any late chrome) mounts under the
       * reveal, never on top of the overlay */
      document.dispatchEvent(new CustomEvent(ENTRY_DONE_EVENT));
      cbsRef.current.onExitStart?.();
      /* the wipe: the RIGHT cut grows — the paper collapses toward the
       * left edge and the page reveals right-first (RTL reading side). */
      timeline = gsap.timeline({
        delay: EXIT_HOLD_MS / 1000,
        onComplete: () => cbsRef.current.onDone?.(),
      });
      timeline.to(root, {
        clipPath: 'inset(0 100% 0 0)',
        duration: EXIT_WIPE_S,
        ease: 'power3.inOut',
      }, 0);
    };

    const release = () => { solved = true; };
    if (document.readyState === 'complete') {
      release();
    } else {
      window.addEventListener('load', release, { once: true });
      cleanups.push(() => window.removeEventListener('load', release));
    }
    document.fonts?.ready.then(release).catch(() => undefined);

    /* the hard cap: readiness never holds the entry past 2.2 s */
    const cap = window.setTimeout(runExit, MAX_RUN_MS);
    cleanups.push(() => window.clearTimeout(cap));

    const frame = (now: number) => {
      if (exited) return;
      const t = now - start;
      /* the crawl: a calm synthetic ramp toward 92% while the real
       * gate is pending; the tail 92→100 belongs to the real release */
      const target = solved
        ? 100
        : Math.min(92, (t / (MAX_RUN_MS * 0.72)) * 92);
      shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.4) shown = target;
      const next = Math.round(shown);
      setPct(next);
      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
      }
      if (solved && t >= MIN_HOLD_MS && shown >= 99.5) {
        runExit();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    cleanups.push(() => cancelAnimationFrame(raf));

    return () => {
      cleanups.forEach((fn) => fn());
      timeline?.kill();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="pl"
      data-cursor="none"
      role="progressbar"
      aria-label="تحميل صفحة مدارك"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div className="pl-inner">
        <div className="pl-mark" aria-hidden="true">
          <Logo variant="mark" size={40} animated />
        </div>
        <div className="pl-wordmark" aria-hidden="true">
          <Logo variant="wordmark" size={64} animated />
        </div>
        <div className="pl-counter" dir="ltr" aria-hidden="true">
          {pct}%
        </div>
        <div className="pl-rail" aria-hidden="true">
          <span className="pl-rail-track" />
          <span ref={fillRef} className="pl-rail-fill" style={{ transform: 'scaleX(0)' }} />
        </div>
      </div>
    </div>
  );
}
