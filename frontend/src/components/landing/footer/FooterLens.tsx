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
 *  · R319 §D2: the strip is now FIVE EQUAL COLUMNS — one per journey
 *    stage (المحاضرة · نقطة الفحص · الاختبار · المكتبة · الإتقان) —
 *    each an EQUAL-HEIGHT ink drawing: the licensed campus ink renders
 *    (manifest.json renders[] — public-domain / CC BY-SA sources, ADAPTED
 *    ShareAlike kept), seated ASPECT-TRUE (54×54 square windows — the
 *    R318 §A7 lesson: never slice the subject) with the five captions
 *    on ONE shared baseline, centered under their columns. The retired
 *    composition sat one 148px photo thumbnail among four empty outline
 *    placeholders at uneven seats — incoherent in both states.
 *  · The SKETCH state (hairline squares only — five equal empty cells)
 *    is the strip's ground; the lens opens onto the RESOLVED state (the
 *    five ink renders + the orange stage beacons + the aligned
 *    captions). Touch / reduced motion: the RESOLVED strip stands
 *    statically — nothing hides content.
 *  · The lens rides the shared conductor clock; the radius eases to
 *    its target (open/closed) and the whole instrument sleeps when
 *    settled — zero frames on an idle footer.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeSheetFrame, wakeSheet, lerp, clamp } from '../../../lib/motion/sheetConductor';

/* Measured reference values (digest.json footer.lens — r308 §13
 * re-confirmed): main r 99.09 of a 210-tall strip = 47.2% of the strip
 * height · pulse 1.05× · position lerp 0.09 / 0.15 · open ≈0.55s ·
 * close ≈0.8s · pulse decay ≈1s. R319 §D2 re-seats the lens on the
 * five-column strip (viewBox 1000×80) keeping the reference's own
 * proportion: 0.472 × 80 = 37.7 units. */
const LENS_R = 37.7;
const PULSE_SCALE = 1.05;
const LERP_MAIN = 0.09;
const LERP_PULSE = 0.15;
const R_LERP_IN = 0.09;  /* radius easing while opening — ≈0.55s to settle */
const R_LERP_OUT = 0.06; /* radius easing while closing — ≈0.8s to settle */
const PULSE_LERP_OUT = 0.05; /* the pulse ring's own decay — ≈1s */
const VB_W = 1000;
const VB_H = 80;

/* the five journey stages, RTL reading order — svg x grows LTR, so the
 * FIRST stage (المحاضرة, read first in Arabic) owns the RIGHTMOST
 * column. Each column is exactly VB_W/5 wide; the ink drawing is a
 * square window centered in its column (aspect-true, no crop); the
 * caption sits on the shared baseline under its column. */
const COL_W = VB_W / 5;
const IMG = 54;    /* the equal-height square ink window (units) */
const IMG_Y = 10;  /* y 10..64 — the drawing band (the 0..10 band keeps the [01] seat label clear) */
const CAP_Y = 77;  /* ONE shared caption baseline — aligned by construction */
const STAGES = [
  { label: 'المحاضرة', render: '/media/renders/hero-ink-1100.webp' },
  { label: 'نقطة الفحص', render: '/media/renders/crop-garyounis-1-640.webp' },
  { label: 'الاختبار', render: '/media/renders/crop-fateh-science-640.webp' },
  { label: 'المكتبة', render: '/media/renders/crop-garyounis-classic-640.webp' },
  { label: 'الإتقان', render: '/media/renders/crop-omu-agri-640.webp' },
] as const;
/* column x per stage: stage[0] (المحاضرة) at the RIGHTMOST column */
const colX = (i: number) => VB_W - (i + 1) * COL_W;
const imgX = (i: number) => colX(i) + (COL_W - IMG) / 2;

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
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="شريط الفحص — خمسة رسوم حبرية لعمارة حرم جامعي ليبي (مشتقّة من صور مرخّصة): المحاضرة، نقطة الفحص، الاختبار، المكتبة، والإتقان — خلاصة مسار التعلّم"
      >
        <defs>
          <mask id="fl-lens-mask" maskUnits="userSpaceOnUse">
            <rect x="0" y="0" width={VB_W} height={VB_H} fill="#fff" /* color-gate: allow — SVG mask luminance semantics, not a theme color */ />
            <circle ref={mainRef} cx={VB_W / 2} cy={VB_H / 2} r="0" fill="#000" /* color-gate: allow — SVG mask punch-out, not a theme color */ />
          </mask>
        </defs>

        {/* the SKETCH ground — five EQUAL hairline cells (the empty
            outline state the lens resolves; R319 §D2: the retired
            ground was four unequal structure outlines) */}
        <g className="fl-sketch" aria-hidden="true">
          {STAGES.map((_, i) => (
            <rect key={i} x={imgX(i)} y={IMG_Y} width={IMG} height={IMG} />
          ))}
          <line x1="0" y1={IMG_Y + IMG + 2} x2={VB_W} y2={IMG_Y + IMG + 2} />
        </g>

        {/* the RESOLVED layer — revealed inside the lens (or statically
            when the lens is off: touch / reduced motion). R319 §D2: the
            FIVE licensed ink renders at EQUAL height (54×54 square,
            aspect-true — no mid-subject crop), one per journey stage,
            each with its orange stage beacon; the five captions ride
            ONE shared baseline, centered under their columns. */}
        <g
          className="fl-resolved"
          ref={revealRef}
          aria-hidden="true"
          {...(lensOn ? { mask: 'url(#fl-lens-mask)' } : {})}
        >
          {STAGES.map((stage, i) => (
            <image
              key={stage.label}
              className="fl-render"
              href={stage.render}
              x={imgX(i)}
              y={IMG_Y}
              width={IMG}
              height={IMG}
              preserveAspectRatio="xMidYMid meet"
            />
          ))}
          <g className="fl-signal">
            {STAGES.map((_, i) => (
              <rect key={i} x={imgX(i) + IMG - 4} y={IMG_Y} width={4} height={4} />
            ))}
          </g>
          <g className="fl-labels">
            {STAGES.map((stage, i) => (
              <text key={stage.label} x={colX(i) + COL_W / 2} y={CAP_Y} textAnchor="middle">{stage.label}</text>
            ))}
          </g>
        </g>

        {/* the pulse ring — a second, faster-chasing circle outline */}
        {lensOn && (
          <circle ref={pulseRef} className="fl-pulse" cx={VB_W / 2} cy={VB_H / 2} r="0" />
        )}
      </svg>

      <span className="fl-coord fo-mono" dir="ltr" aria-hidden="true">
        {/* R319 §D2: the seat label rides the strip's own 0..10u top band
            (the drawings start at y=10) — clear of the five columns at
            every ≥768 width. */}
        [01] CAMPUS · INK RENDER
      </span>
    </div>
  );
}
