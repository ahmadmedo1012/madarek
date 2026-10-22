/**
 * SheetLoader — R308 «لوحة البدء» — the entrance sequence.
 *
 * The reference's loader (reference-observations.md §2) is a drafting
 * instrument coming alive: an asset-gated non-linear percentage, an
 * orange center band, a line drawing, a ruler with an X/Y readout, a
 * system log, and a center-out horizontal clip-path exit. This is
 * Madarek's original entrance in that grammar:
 *
 *  · R309 entrance clock (§4.1, re-measured against the live
 *    reference): a choreographed ~5s progression to the completed
 *    visual state, a measured hold in that state, then the geometric
 *    exit — the sheet hides ≈9.3s after first navigation. The
 *    percentage is the entrance sequence (the reference's own
 *    behavior); nothing waits on a resource, so a stalled asset can
 *    never trap the visitor, and a visible «تخطّي» (Esc/Enter/Space)
 *    always ends it.
 *  · The DRAWING is the platform's own original educational linework
 *    (the «مخطط مدارك» geometry, composed for the loader window) —
 *    staged `pathLength` draw-in in a deliberate order: ground →
 *    primary structures → secondary lines → registration marks →
 *    details → scan line → signal markers → labels.
 *  · Once per session (sessionStorage), never on internal navigation,
 *    never under `prefers-reduced-motion`, never in non-visual test
 *    environments without matchMedia — the page stands complete.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { shouldPlayIntro, markIntroSeen, INTRO_SEEN_KEY } from '../../lib/motion/introGate';
import { sheetEase } from '../../lib/motion/sheetConductor';

/* ── R309 entrance timing (§4.1, re-measured against the live
 * reference): the percentage is the CHOREOGRAPHED entrance clock —
 * a deliberate ~5s progression to the completed visual state (the
 * reference's own sequence; our re-measurement hit 100% at ≈6.3s on
 * a slower network), a measured HOLD in the completed state, then
 * the geometric exit — hidden ≈9.3s after first navigation. The
 * init log beside it stays HONEST: every line describes real work
 * the page is doing in parallel (fonts, eager media, feature state);
 * nothing waits on a resource, so a stalled asset can never trap the
 * visitor, and the skip (Esc/Enter/Space) always ends it. */
const PROGRESS_MS = 5000;
const HOLD_MS = 3600;
const EXIT_MS = 650;
const PROGRESS_EASE = 0.085;

export interface SheetLoaderProps {
  onDone: () => void;
}

/* ── The staged drawing groups (pathLength-normalized; CSS in
 * landing.css drives dashoffset per group with ordered delays). ── */
function SlDraw() {
  return (
    <svg
      className="sl-draw"
      viewBox="0 0 760 300"
      role="img"
      aria-label="رسم خطّي لمسار التعلّم في مدارك: قاعة المحاضرة، نقطة الفحص، بوابة الاختبار، جناح المكتبة، وبرج الإتقان"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* g1 — the ground + ruler ticks */}
      <g className="sl-g sl-g-1">
        <line className="sl-ink" x1="28" y1="258" x2="732" y2="258" pathLength={1} />
        <g className="sl-hair">
          {Array.from({ length: 24 }, (_, i) => 40 + i * 29).map((x) => (
            <line key={x} x1={x} y1="258" x2={x} y2={x % 2 === 0 ? 264 : 261} pathLength={1} />
          ))}
        </g>
      </g>
      {/* g2 — primary structures: the lecture hall (reading start, RTL) */}
      <g className="sl-g sl-g-2">
        <rect className="sl-fill" x="606" y="150" width="112" height="108" pathLength={1} />
        <polygon className="sl-ink" points="606,150 662,116 718,150" pathLength={1} />
        <circle className="sl-fill" cx="672" cy="196" r="12" pathLength={1} />
        <polygon className="sl-signal" points="668,190 668,203 679,196" pathLength={1} />
      </g>
      {/* g3 — the checkpoint signal (the ONE orange flag) */}
      <g className="sl-g sl-g-3">
        <line className="sl-ink" x1="520" y1="258" x2="520" y2="182" pathLength={1} />
        <polygon className="sl-signal" points="520,182 550,190 520,198" pathLength={1} />
        <rect className="sl-fill" x="488" y="208" width="64" height="40" pathLength={1} />
      </g>
      {/* g4 — the exam gate */}
      <g className="sl-g sl-g-4">
        <rect className="sl-fill" x="366" y="164" width="12" height="94" pathLength={1} />
        <rect className="sl-fill" x="422" y="164" width="12" height="94" pathLength={1} />
        <rect className="sl-ink" x="356" y="152" width="88" height="12" pathLength={1} />
        <circle className="sl-fill" cx="400" cy="204" r="15" pathLength={1} />
      </g>
      {/* g5 — the research library wing */}
      <g className="sl-g sl-g-5">
        <rect className="sl-fill" x="188" y="164" width="110" height="94" pathLength={1} />
        <line className="sl-hair2" x1="188" y1="164" x2="298" y2="164" pathLength={1} />
        <g className="sl-hair2">
          <line x1="200" y1="180" x2="286" y2="180" pathLength={1} />
          <line x1="200" y1="194" x2="270" y2="194" pathLength={1} />
          <line x1="200" y1="208" x2="280" y2="208" pathLength={1} />
        </g>
        <polygon className="sl-signal" points="230,216 230,238 238,230 246,238 246,216" pathLength={1} />
      </g>
      {/* g6 — the mastery tower (reading end) + the rising line */}
      <g className="sl-g sl-g-6">
        <rect className="sl-fill" x="66" y="84" width="64" height="174" pathLength={1} />
        <g className="sl-hair2">
          <line x1="74" y1="124" x2="122" y2="124" pathLength={1} />
          <line x1="74" y1="164" x2="122" y2="164" pathLength={1} />
          <line x1="74" y1="204" x2="122" y2="204" pathLength={1} />
        </g>
        <polyline className="sl-ink" points="76,222 90,186 102,154 114,120 122,96" pathLength={1} />
      </g>
      {/* g7 — registration marks */}
      <g className="sl-g sl-g-7">
        <g className="sl-hair">
          <path d="M28 40 h14 M35 33 v14" pathLength={1} />
          <path d="M718 40 h14 M725 33 v14" pathLength={1} />
          <path d="M28 244 h14 M35 237 v14" pathLength={1} />
          <path d="M718 244 h14 M725 237 v14" pathLength={1} />
        </g>
        <line className="sl-dashline" x1="640" y1="286" x2="120" y2="286" pathLength={1} />
      </g>
      {/* g8 — labels */}
      <g className="sl-g sl-g-8">
        <text className="sl-name" x="662" y="286" textAnchor="middle">المحاضرة</text>
        <text className="sl-name" x="520" y="286" textAnchor="middle">نقطة الفحص</text>
        <text className="sl-name" x="400" y="286" textAnchor="middle">الاختبار</text>
        <text className="sl-name" x="243" y="286" textAnchor="middle">المكتبة</text>
        <text className="sl-name" x="98" y="286" textAnchor="middle">الإتقان</text>
      </g>
      {/* the scan line — one sweep after the draw (CSS keyframes) */}
      <line className="sl-scan" x1="28" y1="40" x2="732" y2="40" aria-hidden="true" />
    </svg>
  );
}

/* The honest init log — each line is a thing the page is actually
 * doing while the loader runs; thresholds are progress checkpoints. */
const LOG_LINES: Array<{ at: number; code: string; text: string }> = [
  { at: 0, code: '001', text: 'تهيئة لوحة الرسم' },
  { at: 25, code: '002', text: 'تحميل الخطوط' },
  { at: 50, code: '003', text: 'تحضير وسائط الجامعات' },
  { at: 75, code: '004', text: 'فهرسة قدرات المنصّة' },
  { at: 100, code: '005', text: 'جاهز — مدارك' },
];

export function SheetLoader({ onDone }: SheetLoaderProps) {
  const [play, setPlay] = useState<boolean | null>(null);
  const [exiting, setExiting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const crossRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);

  /* ── Gate: once per session, motion allowed, real browser. ────── */
  useEffect(() => {
    let reduced = false;
    try {
      reduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      /* storage/matchMedia unavailable — the page stands complete */
    }
    const should = shouldPlayIntro(
      typeof sessionStorage !== 'undefined' ? sessionStorage : null,
      reduced,
    );
    if (!should) {
      markIntroSeen();
      onDone();
      return;
    }
    setPlay(true);
  }, [onDone]);

  /* ── The sequence: honest progress → staged exit. ─────────────── */
  useEffect(() => {
    if (!play) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const startedAt = performance.now();
    let displayed = 0;
    let raf = 0;
    let finished = false;
    let lastAnnounced = -1;
    const srRef = root.querySelector<HTMLElement>('.sl-sr');

    /* the staged draw-in starts one frame after mount (the
     * transition needs a style change from the initial state). */
    const mountRaf = requestAnimationFrame(() => {
      root.classList.add('sl-mounted');
    });

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      markIntroSeen();
      setExiting(true);
    };

    const tick = () => {
      const elapsed = performance.now() - startedAt;

      /* the choreographed entrance clock: the target rides a linear
       * ramp to 100% at PROGRESS_MS (the eased `displayed` gives the
       * instrument feel underneath). Real init work (fonts, media,
       * features) runs in parallel and is reported by the log — the
       * percentage never waits on it (a stalled resource can not
       * trap the visitor; R309 §4.2). */
      const target = elapsed >= PROGRESS_MS ? 100 : (elapsed / PROGRESS_MS) * 100;

      displayed += (target - displayed) * PROGRESS_EASE;
      if (elapsed >= PROGRESS_MS) displayed = 100;

      const pct = Math.floor(displayed);
      if (bandRef.current) {
        bandRef.current.style.transform = `scaleX(${displayed / 100})`;
      }
      if (pctRef.current && pctRef.current.dataset.pct !== String(pct)) {
        pctRef.current.dataset.pct = String(pct);
        pctRef.current.textContent = `${pct}%`;
      }
      /* the log advances with the checkpoints */
      const lineIdx = LOG_LINES.reduce(
        (acc, l, i) => (displayed >= l.at ? i : acc),
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
      const announce = displayed >= 100 ? 3 : displayed >= 50 ? 2 : displayed > 0 ? 1 : 0;
      if (srRef && announce !== lastAnnounced) {
        lastAnnounced = announce;
        srRef.textContent =
          displayed >= 100 ? 'اكتمل التحميل' : displayed >= 50 ? 'جارٍ تحضير الصفحة — أكثر من النصف' : 'جارٍ تحضير الصفحة';
      }

      if (displayed >= 100 && elapsed >= PROGRESS_MS + HOLD_MS) {
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
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mountRaf);
      window.removeEventListener('keydown', skip);
      skipBtn?.removeEventListener('click', skip);
      doc.style.overflow = prevOverflow;
    };
  }, [play]);

  /* ── The exit: center-out horizontal clip split (one element, a
   *     two-band polygon whose slit widens to the edges). A wall-clock
   *     fallback ends the sequence even if the animation's finish
   *     event never fires (hidden tab, engine hiccup) — the page can
   *     never stay covered (R309 §4.3). ────────────────────────── */
  useEffect(() => {
    if (!exiting || !mainRef.current) return undefined;
    const el = mainRef.current;
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof el.animate !== 'function') {
      const t = window.setTimeout(onDone, 30);
      return () => window.clearTimeout(t);
    }
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      onDone();
    };
    const anim = el.animate(
      [
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%, 0% 50%, 100% 50%, 100% 100%, 0% 100%)' },
        { clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%, 0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
      ],
      { duration: EXIT_MS, easing: sheetEase(), fill: 'forwards' },
    );
    anim.onfinish = settle;
    anim.oncancel = settle;
    const fallback = window.setTimeout(settle, EXIT_MS + 600);
    return () => {
      window.clearTimeout(fallback);
      anim.onfinish = null;
      anim.oncancel = null;
      anim.cancel();
    };
  }, [exiting, onDone]);

  /* the loader's own ruler readout — scene-relative X/Y */
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
      coordRef.current.textContent = `X:${x} Y:${y}`;
    }
  }, []);

  if (!play) return null;

  return (
    <div
      ref={rootRef}
      className="sl"
      data-cursor="hidden"
      role="status"
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
          X:0 Y:0
        </span>

        {/* the drawing — the platform's own linework, staged draw */}
        <div className="sl-draw-wrap">
          <SlDraw />
        </div>

        {/* the progress instrument: band + counter */}
        <div className="sl-progress" aria-hidden="true">
          <span className="sl-pct fo-mono" ref={pctRef} dir="ltr">0%</span>
          <span className="sl-band-track">
            <span className="sl-band" ref={bandRef} />
          </span>
        </div>

        {/* the honest init log */}
        <ul className="sl-log" aria-hidden="true">
          {LOG_LINES.map((l) => (
            <li key={l.code} data-on="off">
              <span className="fo-mono" dir="ltr">{l.code}</span>
              <span>{l.text}</span>
            </li>
          ))}
        </ul>

        {/* the title block — the sheet's identity (R309 §8: stable
            Madarek metadata — no release-number label) */}
        <div className="sl-meta" aria-hidden="true">
          <span className="sl-meta-title">مدارك — منصّة التعليم الذكي</span>
          <span className="sl-meta-row fo-mono" dir="ltr">
            MADAREK · LEARNING SHEET
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
