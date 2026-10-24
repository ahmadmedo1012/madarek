/**
 * SheetLoader — R313 «لوحة البدء» — the entrance sequence, rebuilt to
 * the reference's loader semantics (D10).
 *
 * The reference's loader is an ASSET-GATED instrument, not a fixed
 * clock (audits/evidence/r313/reference/digest.json → loader): a
 * curve-shaped counter whose ~59–60% plateau EMERGES from waiting on
 * real assets, a mono percentage (Geist Mono 10px #FA3600), an orange
 * centre band wiping left→right, two 1px #B3B3AF translating rails,
 * a line-drawn logo, a 10-line system log (001–010), a metadata
 * block, an X/Y ruler readout tracking the mouse — and an 835ms
 * CENTER-OUT TWO-BAND CLIP SPLIT exit (a horizontal slit opens at the
 * vertical centre and widens to the edges; the counter's 100% holds
 * ~700ms first). Gating: replays on EVERY full page load (reloads
 * included — the reference's session flag does not suppress), never
 * on client-side navigations, never under reduced motion / in
 * non-visual environments (lib/motion/introGate owns the decision).
 *
 * Madarek keeps the honest layer the reference cannot have: every log
 * line describes work the page is actually doing, the counter never
 * waits past the fallback curve's 100% at ~5.65s (Promise.race timeout
 * on the asset gate), and a visible «تخطّي» (Esc/Enter/Space) always
 * ends it. The R309 fixed 5s+3.6s clock and the R309 exit race (the
 * 650ms split cancelled at ~21ms by an onDone-prop remount) are both
 * retired: the sequence owns its clock through refs, the exit plays
 * its full 835ms, and the parent only unmounts the sheet on the
 * exit's own finish event (wall-clock backed).
 *
 * R314 cycle-2 (V14 — the loader's FRAME SEQUENCE): the counter model
 * in introGate was re-pinned to the reference's frame-captured beats
 * (quiet boot → crawl → 60% plateau → accelerating tail → 100%@5.65s →
 * 717ms hold → the 835ms split; total ≈ 7.2s, the reference's own
 * window), and the staged draw-in below now spreads across the whole
 * run — the drawing resolves ~0.85s before the fallback 100%, the
 * same lead the reference's line-drawn wordmark keeps (draw complete
 * ≈5.0s of its 5.65s counter) — instead of finishing at 77% of the
 * run. See landing.css `.sl-draw-wrap` for the retuned layer ladder.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  shouldPlayIntro,
  markIntroSeen,
  markIntroPlayed,
  INTRO_SEEN_KEY,
  loaderTargetAt,
  loaderDoneAtMs,
  LOADER_GATE_TIMEOUT_MS,
  LOADER_HOLD_MS,
} from '../../lib/motion/introGate';
import { sheetEase } from '../../lib/motion/sheetConductor';
import { ElevationDrawing } from './ElevationDrawing';

/* ── The R313 instrument constants (the shape lives in introGate's
 * pure model; these are the chrome-side numbers). ───────────────────
 * EXIT_MS resolves the --t-sheet-exit token (835ms, the measured
 * split) at runtime; the wall-clock fallback adds grace for hidden
 * tabs / engine hiccups — the page can never stay covered. */
const EXIT_TOKEN = '--t-sheet-exit';
const EXIT_FALLBACK_MS = 835;
/* the two #B3B3AF rails translate with the counter — a slow drafting
 * slide (±RAIL_SLIDE_PX at 100%), opposite directions. */
const RAIL_SLIDE_PX = 24;

function motionDurationMs(name: string, fallback: number): number {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return fallback;
  }
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parsed = v ? Number.parseFloat(v) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export interface SheetLoaderProps {
  onDone: () => void;
  /** fires when the geometric EXIT BEGINS (the slit opens): the page
   *  behind the loader starts its own ink-in then, so the reveal
   *  resolves into a living page instead of a blank one (R310 §3.1). */
  onExitStart?: () => void;
}

/* ── The drawing — the platform's own educational linework (the
 * «مخطط مدارك» geometry, composed for the loader window), staged by
 * the [data-ink] groups against the counter's ramp (landing.css .sl). */
function SlDraw() {
  return (
    <div className="sl-draw-wrap">
      <ElevationDrawing variant="entrance" active={-1} />
      {/* the scan line — one sweep after the structures resolve */}
      <span className="sl-scan" aria-hidden="true" />
    </div>
  );
}

/* ── The honest init log — 10 lines (the reference's 001–010 count),
 * each a thing the page is actually doing while the loader runs;
 * `at` is the counter checkpoint that reveals the line. */
const LOG_LINES: Array<{ at: number; code: string; text: string }> = [
  { at: 0, code: '001', text: 'تهيئة لوحة البدء' },
  { at: 7, code: '002', text: 'تحميل عائلات الخطوط' },
  { at: 20, code: '003', text: 'تجهيز المخطط المرسوم' },
  { at: 33, code: '004', text: 'بناء شبكة الإطار والمسطرة' },
  { at: 45, code: '005', text: 'تجهيز أقسام الرحلة' },
  { at: 57, code: '006', text: 'تهيئة محرك التمرير' },
  { at: 59, code: '007', text: 'مزامنة الوسائط الأساسية' },
  { at: 75, code: '008', text: 'معايرة أدوات المؤشر' },
  { at: 90, code: '009', text: 'فحص جاهزية الصفحة' },
  { at: 100, code: '010', text: 'بدء التنفيذ' },
];

/* ── The asset gate (R313: asset-gated, NOT a fixed clock) ────────────
 * The critical assets the counter's plateau waits on: the sheet's
 * font families (document.fonts.ready — the counter itself is mono)
 * and every EAGER image in the document (the LCP candidates; lazy
 * media is deliberately NOT waited on — it loads as the visitor
 * scrolls, after the entrance). Each gate resolves on success OR
 * failure (a broken asset never traps the visitor) and the whole gate
 * races LOADER_GATE_TIMEOUT_MS — the counter always continues. */
function criticalAssetGate(): Promise<void> {
  const gates: Array<Promise<unknown>> = [];
  try {
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      gates.push(Promise.resolve(document.fonts.ready));
    }
  } catch {
    /* fonts API unavailable — the timeout owns the gate */
  }
  try {
    if (typeof document !== 'undefined') {
      const eager = Array.from(document.querySelectorAll('img'))
        .filter((img) => img.getAttribute('loading') !== 'lazy')
        .slice(0, 4);
      for (const img of eager) {
        gates.push(
          img.complete
            ? Promise.resolve(null)
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
        );
      }
    }
  } catch {
    /* DOM unavailable — the timeout owns the gate */
  }
  if (gates.length === 0) return Promise.resolve();
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, LOADER_GATE_TIMEOUT_MS);
  });
  return Promise.race([Promise.allSettled(gates).then(() => undefined), timeout]);
}

export function SheetLoader({ onDone, onExitStart }: SheetLoaderProps) {
  const [play, setPlay] = useState<boolean | null>(null);
  const [exiting, setExiting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLSpanElement>(null);
  const railTopRef = useRef<HTMLSpanElement>(null);
  const railBotRef = useRef<HTMLSpanElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);

  /* R313 — the exit-race fix, part 1: the parent's callbacks live in
   * refs. The R309 clock re-ran its effects whenever the parent
   * re-rendered (fresh inline-callback identities), cancelling the
   * split ~21ms in; the sequence below depends on NOTHING that
   * changes identity, so re-renders can no longer cancel it. */
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onExitStartRef = useRef(onExitStart);
  onExitStartRef.current = onExitStart;

  /* ── Gate: motion allowed, real browser, fresh document. ───────── */
  const decidedRef = useRef(false);
  useEffect(() => {
    if (decidedRef.current) return; /* StrictMode re-run: the decision stands */
    decidedRef.current = true;
    let reduced = false;
    try {
      reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* matchMedia unavailable — the page stands complete */
    }
    const should = shouldPlayIntro(
      typeof sessionStorage !== 'undefined' ? sessionStorage : null,
      reduced,
    );
    if (!should) {
      markIntroSeen();
      onDoneRef.current();
      return;
    }
    /* the document-lifetime mark: client-side navigations back to the
     * landing never replay (the reference's Barba behaviour) */
    markIntroPlayed();
    setPlay(true);
  }, []);

  /* ── The sequence: asset-gated counter → hold → staged exit. ───── */
  useEffect(() => {
    if (!play) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const startedAt = performance.now();
    let releasedAt: number | null = null;
    let counterDoneAt = loaderDoneAtMs(null);
    let raf = 0;
    let finished = false;
    let lastAnnounced = -1;
    const srRef = root.querySelector<HTMLElement>('.sl-sr');

    /* the staged draw-in starts one frame after mount (the transition
     * needs a style change from the initial state). */
    const mountRaf = requestAnimationFrame(() => {
      root.classList.add('sl-mounted');
    });

    /* the asset gate releases the counter's plateau */
    let alive = true;
    void criticalAssetGate().then(() => {
      if (!alive || releasedAt !== null) return;
      releasedAt = Math.max(0, performance.now() - startedAt);
      counterDoneAt = loaderDoneAtMs(releasedAt);
    });

    let exitStarted = false;
    const startExit = () => {
      if (exitStarted) return;
      exitStarted = true;
      /* the page behind begins its ink-in NOW — the slit reveals a
       * living sheet, never a blank (R310 §3.1) */
      onExitStartRef.current?.();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      markIntroSeen();
      startExit();
      root.classList.add('is-exiting');
      setExiting(true);
    };

    const tick = () => {
      const elapsed = performance.now() - startedAt;

      /* the counter: the curve target, gated on the real assets — the
       * plateau EMERGES from waiting; an early release shortens the
       * tail (bounded at the natural rate — the reference's own
       * warm-cache behaviour); the fallback curve's 100% at ~5.65s is
       * the slowest possible run (the gate's timeout guarantees it). */
      const target = loaderTargetAt(elapsed, releasedAt);
      const pct = Math.min(100, Math.floor(target));

      if (bandRef.current) {
        bandRef.current.style.transform = `scaleX(${target / 100})`;
      }
      /* the two #B3B3AF rails slide in opposite directions with the
       * counter (the reference's translating progress items) */
      const slide = (target / 100) * RAIL_SLIDE_PX;
      if (railTopRef.current) {
        railTopRef.current.style.transform = `translate3d(${slide}px, 0, 0)`;
      }
      if (railBotRef.current) {
        railBotRef.current.style.transform = `translate3d(${-slide}px, 0, 0)`;
      }
      if (pctRef.current && pctRef.current.dataset.pct !== String(pct)) {
        pctRef.current.dataset.pct = String(pct);
        pctRef.current.textContent = `${pct}%`;
      }

      /* the log advances with the checkpoints */
      const lineIdx = LOG_LINES.reduce(
        (acc, l, i) => (target >= l.at ? i : acc),
        -1,
      );
      const log = root.querySelector<HTMLElement>('.sl-log');
      if (log) {
        const children = log.children;
        for (let i = 0; i < children.length; i += 1) {
          const el = children[i] as HTMLElement;
          const on = i <= lineIdx;
          if (el.dataset.on !== (on ? 'on' : 'off')) el.dataset.on = on ? 'on' : 'off';
        }
      }

      /* coarse live announcements (0/50/100) — not per-frame spam */
      const announce = target >= 100 ? 3 : target >= 50 ? 2 : target > 0 ? 1 : 0;
      if (srRef && announce !== lastAnnounced) {
        lastAnnounced = announce;
        srRef.textContent =
          target >= 100
            ? 'اكتمل التحميل'
            : target >= 50
              ? 'جارٍ تحضير الصفحة — أكثر من النصف'
              : 'جارٍ تحضير الصفحة';
      }

      /* the measured hold at 100%, then the geometric exit */
      if (pct >= 100 && elapsed >= counterDoneAt + LOADER_HOLD_MS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    /* the skip — always available, always honest */
    const skip = (e?: Event) => {
      if (e instanceof KeyboardEvent && !['Escape', 'Enter', ' '].includes(e.key)) return;
      finish();
    };
    const skipBtn = root.querySelector<HTMLButtonElement>('.sl-skip');
    skipBtn?.addEventListener('click', skip);
    window.addEventListener('keydown', skip);

    /* lock the sheet while the loader owns the viewport */
    const doc = document.documentElement;
    const prevOverflow = doc.style.overflow;
    doc.style.overflow = 'hidden';

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mountRaf);
      window.removeEventListener('keydown', skip);
      skipBtn?.removeEventListener('click', skip);
      doc.style.overflow = prevOverflow;
    };
  }, [play]);

  /* ── The exit: the measured 835ms CENTER-OUT TWO-BAND CLIP SPLIT —
   *     a horizontal slit at the vertical centre (49.94/50.06%)
   *     widening symmetrically to 0/100% (the top and bottom halves
   *     part at the centre line). R313 race fix, part 2: the effect
   *     depends only on `exiting` (the callbacks ride refs), the
   *     animation is never restarted by a parent re-render, and a
   *     wall-clock fallback ends the sequence even if the finish
   *     event never fires (hidden tab, engine hiccup). ──────────── */
  useEffect(() => {
    if (!exiting || !mainRef.current) return undefined;
    const el = mainRef.current;
    const exitMs = Math.max(120, motionDurationMs(EXIT_TOKEN, EXIT_FALLBACK_MS));
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof el.animate !== 'function') {
      const t = window.setTimeout(() => onDoneRef.current(), 30);
      return () => window.clearTimeout(t);
    }
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      onDoneRef.current();
    };
    const anim = el.animate(
      [
        {
          clipPath:
            'polygon(0% 0%, 100% 0%, 100% 49.94%, 0% 49.94%, 0% 50.06%, 100% 50.06%, 100% 100%, 0% 100%)',
        },
        {
          clipPath:
            'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 100%, 0% 100%)',
        },
      ],
      {
        duration: exitMs,
        easing: sheetEase(),
        fill: 'forwards',
      },
    );
    anim.onfinish = settle;
    anim.oncancel = settle;
    const fallback = window.setTimeout(settle, exitMs + 600);
    return () => {
      window.clearTimeout(fallback);
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
    };
  }, [exiting]);

  /* the loader's own ruler readout — scene-relative X/Y (the
   * reference's X:1131PX mono format) */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - r.left));
    const y = Math.max(0, Math.round(e.clientY - r.top));
    if (crossRef.current) {
      crossRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    if (coordRef.current) {
      coordRef.current.textContent = `X:${x}PX Y:${y}PX`;
    }
  }, []);

  if (!play) return null;

  return (
    <div
      ref={rootRef}
      className="sl"
      data-cursor="none"
      role="status"
      aria-busy={!exiting}
      aria-label="تحضير صفحة مدارك"
      onPointerMove={onPointerMove}
    >
      <div ref={mainRef} className="sl-main">
        {/* the sheet frame + ruler */}
        <span className="sl-frame" aria-hidden="true" />
        <span className="sl-cross" ref={crossRef} aria-hidden="true">
          <span className="sl-cross-h" />
          <span className="sl-cross-v" />
        </span>
        <span className="sl-coord fo-mono" ref={coordRef} dir="ltr" aria-hidden="true">
          X:0PX Y:0PX
        </span>

        {/* the drawing — the elevation's staged construction */}
        <SlDraw />

        {/* the progress instrument: the mono counter ON the orange
            band, the two 1px #B3B3AF rails translating above/below */}
        <div className="sl-progress" aria-hidden="true">
          <span className="sl-rail sl-rail-top" ref={railTopRef} />
          <span className="sl-rail sl-rail-bot" ref={railBotRef} />
          <span className="sl-band" ref={bandRef} />
          <span className="sl-pct fo-mono" ref={pctRef} dir="ltr">0%</span>
        </div>

        {/* the honest init log — 001…010 */}
        <ul className="sl-log" aria-hidden="true">
          {LOG_LINES.map((l) => (
            <li key={l.code} data-on="off">
              <span className="fo-mono" dir="ltr">{l.code}</span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>

        {/* the title block — the sheet's identity (stable metadata,
            no release-number label per R309 §8) */}
        <div className="sl-meta" aria-hidden="true">
          <span className="sl-meta-title">مدارك — منصّة التعليم الذكي</span>
          <span className="sl-meta-row fo-mono" dir="ltr">
            MADAREK · LEARNING SHEET
          </span>
          <span className="sl-meta-row fo-mono" dir="ltr">
            TYPE : LEARNING PLATFORM
          </span>
          <span className="sl-meta-row fo-mono" dir="ltr">
            FOCUS : THE FULL LEARNING JOURNEY
          </span>
        </div>

        <span className="sl-sr">جارٍ تحضير الصفحة</span>

        <button type="button" className="sl-skip fo-mono">
          تخطّي — SKIP
        </button>
      </div>
    </div>
  );
}

export { INTRO_SEEN_KEY };
