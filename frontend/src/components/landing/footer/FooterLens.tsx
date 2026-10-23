/**
 * FooterLens — R308 «شريط الفحص» — the footer's pointer instrument.
 *
 * The reference's footer carries a pointer-controlled inspection lens
 * over an image strip: an SVG circle mask (main r≈99 + a pulse ring at
 * 1.05×, opacity .2) that lerps after the pointer (0.09 / 0.15),
 * opening in ≈0.55s and closing in ≈0.8s, revealing a filtered layer
 * inside the circle (reference-observations.md §13; the case study's
 * lens code). This is Madarek's original translation:
 *
 *  · The strip is authored SVG linework — a condensed wide elevation
 *    of «مخطط مدارك» (the five structures along the ground line). The
 *    SKETCH state (hairlines only) is the strip's ground; the lens
 *    reveals the RESOLVED state (full ink + the orange signals +
 *    labels) inside the circle. No photographs are involved.
 *  · The lens rides the shared conductor clock; the radius eases to
 *    its target (open/closed) and the whole instrument sleeps when
 *    settled — zero frames on an idle footer.
 *  · Touch / reduced motion: the RESOLVED strip stands statically
 *    (nothing hides content); the lens is a fine-pointer instrument.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeSheetFrame, wakeSheet, lerp, clamp } from '../../../lib/motion/sheetConductor';

/* Measured reference values (digest.json footer.lens — r308 §13
 * re-confirmed): main r 99.09 · pulse 1.05× = 104.04 · position
 * lerp 0.09 / 0.15 · open ≈0.55s · close ≈0.8s · pulse decay ≈1s
 * (60fps per-frame factors: .09 ≈ 3τ 555ms · .06 ≈ 3τ 833ms ·
 * .05 ≈ 3τ 1000ms). */
const LENS_R = 99.09; /* main radius in strip viewBox units */
const PULSE_SCALE = 1.05; /* 99.09 × 1.05 = 104.04 (the measured pulse ring) */
const LERP_MAIN = 0.09;
const LERP_PULSE = 0.15;
const R_LERP_IN = 0.09;  /* radius easing while opening — ≈0.55s to settle */
const R_LERP_OUT = 0.06; /* radius easing while closing — ≈0.8s to settle */
const PULSE_LERP_OUT = 0.05; /* the pulse ring's own decay — ≈1s */
const VB_W = 1000;
const VB_H = 210;

export function FooterLens() {
  const stripRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<SVGCircleElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);
  const revealRef = useRef<SVGGElement>(null);
  const [lensOn, setLensOn] = useState(false);

  /* eligibility: fine pointer + hover, and never under reduced motion */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = () => setLensOn(fine.matches && !reduced.matches);
    evaluate();
    fine.addEventListener('change', evaluate);
    reduced.addEventListener('change', evaluate);
    return () => {
      fine.removeEventListener('change', evaluate);
      reduced.removeEventListener('change', evaluate);
    };
  }, []);

  useEffect(() => {
    if (!lensOn) return undefined;
    const strip = stripRef.current;
    const main = mainRef.current;
    const pulse = pulseRef.current;
    const reveal = revealRef.current;
    if (!strip || !main || !pulse || !reveal) return undefined;

    /* lens state (viewBox units) */
    const target = { x: VB_W / 2, y: VB_H / 2, r: 0 };
    let pulseTarget = 0;
    const posMain = { x: VB_W / 2, y: VB_H / 2 };
    const posPulse = { x: VB_W / 2, y: VB_H / 2 };
    let rMain = 0;
    let rPulse = 0;
    let inside = false;
    let unsub: (() => void) | null = null;

    const apply = () => {
      main.setAttribute('cx', posMain.x.toFixed(1));
      main.setAttribute('cy', posMain.y.toFixed(1));
      main.setAttribute('r', Math.max(0, rMain).toFixed(1));
      pulse.setAttribute('cx', posPulse.x.toFixed(1));
      pulse.setAttribute('cy', posPulse.y.toFixed(1));
      pulse.setAttribute('r', Math.max(0, rPulse).toFixed(1));
      reveal.setAttribute('transform', `translate(${(posMain.x - VB_W / 2).toFixed(1)} ${(posMain.y - VB_H / 2).toFixed(1)})`);
    };

    const frame = () => {
      posMain.x = lerp(posMain.x, target.x, LERP_MAIN);
      posMain.y = lerp(posMain.y, target.y, LERP_MAIN);
      posPulse.x = lerp(posPulse.x, target.x, LERP_PULSE);
      posPulse.y = lerp(posPulse.y, target.y, LERP_PULSE);
      /* R313 (D14): the radius easing is DIRECTION-aware — the lens
         opens on the .55s curve and closes on the .8s curve; the
         pulse ring decays on its own ~1s curve (the old single
         0.16/0.13 factors settled both ways in ~0.3s — 40% too
         fast against the measured in/out times). */
      const rEase = inside ? R_LERP_IN : R_LERP_OUT;
      const pEase = inside ? R_LERP_IN : PULSE_LERP_OUT;
      rMain = lerp(rMain, target.r, rEase);
      rPulse = lerp(rPulse, pulseTarget, pEase);
      apply();
      /* sleep when everything has settled */
      const settled =
        Math.abs(posMain.x - target.x) < 0.5 &&
        Math.abs(posMain.y - target.y) < 0.5 &&
        Math.abs(rMain - target.r) < 0.5 &&
        Math.abs(rPulse - target.r) < 0.5;
      if (settled && !inside && unsub) {
        apply();
        unsub();
        unsub = null;
      }
    };

    const wake = () => {
      if (!unsub) {
        unsub = subscribeSheetFrame(frame);
      } else {
        wakeSheet();
      }
    };

    const local = (e: PointerEvent) => {
      const r = strip.getBoundingClientRect();
      target.x = clamp(((e.clientX - r.left) / r.width) * VB_W, 0, VB_W);
      target.y = clamp(((e.clientY - r.top) / r.height) * VB_H, 0, VB_H);
      wake();
    };

    const onEnter = (e: PointerEvent) => {
      inside = true;
      target.r = LENS_R;
      pulseTarget = LENS_R * PULSE_SCALE;
      local(e);
    };
    const onLeave = () => {
      inside = false;
      target.r = 0;
      pulseTarget = 0;
      wake();
    };

    strip.addEventListener('pointerenter', onEnter);
    strip.addEventListener('pointermove', local);
    strip.addEventListener('pointerleave', onLeave);
    return () => {
      if (unsub) unsub();
      strip.removeEventListener('pointerenter', onEnter);
      strip.removeEventListener('pointermove', local);
      strip.removeEventListener('pointerleave', onLeave);
    };
  }, [lensOn]);

  return (
    <div
      className="fl"
      ref={stripRef}
      aria-label="شريط الفحص — خلاصة مسار التعلّم"
    >
      {/* R310 §1 (cursor ownership): NO data-cursor suppression here — the
          reference keeps its global cursor live over the footer strip while
          the lens follows as a lagging inspection instrument (one pointer +
          one instrument), and so do we. */}
      <svg
        className="fl-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="رسم خطّي لخلاصة مسار التعلّم: المحاضرة، نقطة الفحص، الاختبار، المكتبة، والإتقان"
      >
        <defs>
          <mask id="fl-lens-mask" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="#fff" /* color-gate: allow — SVG mask luminance semantics, not a theme color */ />
            <circle ref={mainRef} cx={VB_W / 2} cy={VB_H / 2} r="0" fill="#000" /* color-gate: allow — SVG mask punch-out, not a theme color */ />
          </mask>
        </defs>

        {/* the SKETCH ground — hairline geometry only */}
        <g className="fl-sketch" aria-hidden="true">
          <line x1="30" y1="180" x2="970" y2="180" />
          <rect x="700" y="96" width="110" height="84" />
          <polygon points="700,96 755,64 810,96" />
          <line x1="545" y1="180" x2="545" y2="112" />
          <polygon points="545,112 573,120 545,128" />
          <rect x="380" y="120" width="76" height="60" />
          <line x1="386" y1="112" x2="450" y2="112" />
          <rect x="200" y="112" width="120" height="68" />
          <line x1="200" y1="104" x2="320" y2="104" />
          <rect x="80" y="48" width="64" height="132" />
          <line x1="88" y1="84" x2="136" y2="84" />
          <line x1="88" y1="120" x2="136" y2="120" />
          <line x1="88" y1="156" x2="136" y2="156" />
        </g>

        {/* the RESOLVED layer — revealed inside the lens (or statically
            when the lens is off: touch / reduced motion). */}
        <g
          className="fl-resolved"
          ref={revealRef}
          aria-hidden="true"
          {...(lensOn ? { mask: 'url(#fl-lens-mask)' } : {})}
        >
          <g className="fl-ink">
            <line x1="30" y1="180" x2="970" y2="180" strokeWidth="2" />
            <rect x="700" y="96" width="110" height="84" strokeWidth="2" />
            <polygon points="700,96 755,64 810,96" strokeWidth="2" />
            <circle cx="755" cy="130" r="12" strokeWidth="2" />
            <rect x="380" y="120" width="76" height="60" strokeWidth="2" />
            <circle cx="418" cy="146" r="15" strokeWidth="2" />
            <rect x="200" y="112" width="120" height="68" strokeWidth="2" />
            <line x1="196" y1="104" x2="324" y2="104" strokeWidth="2" />
            <rect x="80" y="48" width="64" height="132" strokeWidth="2" />
            <polyline points="90,168 104,132 116,100 128,66" strokeWidth="2" />
          </g>
          <g className="fl-signal">
            <polygon points="545,112 573,120 545,128" />
            <circle cx="755" cy="130" r="4" />
            <circle cx="418" cy="146" r="4" />
            <polygon points="86,48 108,54 86,60" />
          </g>
          <g className="fl-labels">
            <text x="755" y="200" textAnchor="middle">المحاضرة</text>
            <text x="545" y="200" textAnchor="middle">نقطة الفحص</text>
            <text x="418" y="200" textAnchor="middle">الاختبار</text>
            <text x="260" y="200" textAnchor="middle">المكتبة</text>
            <text x="112" y="200" textAnchor="middle">الإتقان</text>
          </g>
        </g>

        {/* the pulse ring — a second, faster-chasing circle outline */}
        {lensOn && (
          <circle ref={pulseRef} className="fl-pulse" cx={VB_W / 2} cy={VB_H / 2} r="0" />
        )}
      </svg>

      <span className="fl-coord fo-mono" dir="ltr" aria-hidden="true">
        [INSPECTION STRIP · R308]
      </span>
    </div>
  );
}
