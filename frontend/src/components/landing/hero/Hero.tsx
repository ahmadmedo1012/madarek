/**
 * Hero — R331 (A-Web-Hero) — the Heron-mechanics rebuild of the landing
 * hero, Madarek's own content on Heron's construction.
 *
 * Port source of record: docs/redesign/r331/heron-program.md (§4 hero
 * recipe + §7 motion values) / heron-program.json (`imagery.hero`).
 * The reference's hero anatomy, mirrored for RTL:
 *
 *   .home-hero (full-bleed band, 100svh-class height)
 *   ├─ the art layer stack — interact (cursor crosshair — Madarek's
 *   │  own HeroInspect instrument) → the img (OUR ink elevation,
 *   │  HeroInkWindow, FULL-BLEED — R332 W1: the paper runs edge-to-edge
 *   │  and the ink breaks the viewport edge) → ruler (dashed ticks +
 *   │  measure graticule, inset 3.2rem) → deco cards ×2
 *   ├─ the content grid (title-wrap ‖ sub-wrap) + the work strip
 *   └─ the bg-border FRAME on the section itself — 4 edge strips +
 *      4 corner plus marks, inset 1.2rem from the viewport edges
 *      (R332 W1: the run-001 «window inside a window» kill — one
 *      viewport frame over the full-bleed drawing, never a box
 *      hugging an inner window)
 *
 * Mechanics (the reveal grammar, exact Heron values):
 *   · hairline wipes — the frame's 4 edges scaleX/scaleY 0→1,
 *     1.2s LINEAR, origin mirrored for RTL (top right — Heron's
 *     top-left in LTR);
 *   · title mask-lines — each display line rides its own
 *     overflow-hidden mask, translateY(103%)→0, 0.8s power2.out,
 *     0.02s stagger (y is direction-neutral — no RTL mirror);
 *   · img/frame/deco fades — 1s power3.out;
 *   · the ink itself DRAWS (the staged ink-in belt — Madarek's
 *     superior substitute for Heron's static img fade);
 *   · block/work rise — y 3.2rem→0, 1s power3.out.
 *
 * The motion engine is CSS transitions + the landing's OWN gates —
 * NO GSAP in the Madarek stack. The choreography hangs on the
 * `.landing.intro-draw → .landing.intro-done` flip (R308's entrance
 * gate: the loader plays once per session; on its exit slit the hero
 * timeline begins, exactly like the belt it replaces). The GSAP ease
 * curves are translated to cubic-bezier(·) equivalents (documented in
 * r331/hero.css — power2.out ≈ [.215,.61,.355,1], power3.out ≈
 * [.165,.84,.44,1], expo.out ≈ [.19,1,.22,1]). prefers-reduced-motion
 * collapses the whole timeline to the settled sheet (RM belt inside
 * hero.css); the intro gate never plays under RM.
 *
 * Stable hooks kept for the platform's contracts (tests/scripts —
 * see tests/unit/landing-funnel.test.tsx, tests/e2e/r312-*):
 *   .fo-hero (section) · .fo-hero-title (the H1) ·
 *   .fo-hero-actions .fo-hero-cta (the ONE primary) ·
 *   .fo-hero-work (the strip). Everything else is namespaced hro-*.
 */
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { HERO_WORK_ITEMS } from '../../../data/landing-ledger';
import { HeroInkWindow } from '../HeroInkWindow';
import { HeroGrid } from './HeroGrid';
import { HeroInspect } from '../cursor/HeroInspect';
import { useIsNarrowLayout } from '../../../hooks/useIsNarrowLayout';
import '../../../styles/landing/hero-mechanics.css';
import { BRAND_LABEL, LOGIN, REGISTER, LECTURE_INTERACTIVE, MASTERY_MATRIX} from '../copy';

/* The display title — 3 authored lines (the reference's h1 wraps to 9
 * mask lines inside its narrow title-wrap; Arabic carries the same
 * statement in 3, each riding the identical mask-line grammar).
 * UNVOCALISED (zero tashkeel — the display canon), no tracking. */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة', 'إلى الإتقان'] as const;

/* The lead — the honest funnel copy, hand-split at the em-dash into
 * two mask lines (the reference splits its sub on word-wrap; the
 * sentence seam is the Arabic-stable split point). */
const LEAD_LINES = [
  'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —',
  'تجربة عربية واحدة لخمسة أدوار وثلاث شرائح.',
] as const;

/* The deco cards — the reference's mono micro-copy cards over the
 * drawing (mono label + brand fade-loop square). OUR labels index the
 * honest capability ledger ([01] المحاضرات التفاعلية · [03] مصفوفة
 * الإتقان — same subjects as the work strip, never new claims). */
const DECO_CARDS = [
  { code: '01', text: LECTURE_INTERACTIVE, seat: '8' },
  { code: '03', text: MASTERY_MATRIX, seat: '9' },
] as const;

/* r338 T-13b — the hero's interaction-state seat ordinals: the heron
 * census recorded 21 interactive twins in div.home-hero-sub-wrap
 * (docs/redesign/r335/heron-spec/home-hero-wrap.<bp>.json `hovers`).
 * data-spec-hover=N binds each twin to its counterpart so
 * scripts/conformance/interact.mjs resolves every recorded delta;
 * the per-bp gating (a NOCHANGE record at a bp = no twin arm there)
 * and the hover/focus twins live in hero.css. Ordinals whose records
 * are NOCHANGE at every bp (10) carry no seat at all.
 *   0 login · 3 register · 1/2/5/7/4/6 the work strip · 8/9 the deco
 *   cards · 11–14 the ± registration marks · 15–20 the graticule. */
const WORK_SEAT_ORD = ['1', '2', '5', '7', '4', '6'] as const;
const DMARK_SEAT: Record<string, string> = { tl: '11', tr: '12', bl: '13', br: '14' };
const MEASURE_SEAT: Record<string, string> = { m1: '15', m2: '16', h1: '17', h2: '18', v1: '19', v2: '20' };

export function Hero() {
  /* r338 T-13b — the deco cards are ≥992 chrome (hero.css hides them
   * below that). Render-gate them on the same band (the shared
   * useIsNarrowLayout belt, viewport-live): a display:none node can't
   * hold programmatic focus, and the interact probe focus-walks the
   * census twins 8/9 at every recorded bp — an unmount at the phone
   * band keeps the keyboard-parity read honest (not-found → skipped)
   * without ever making the decorative cards tab stops. */
  const phoneBand = useIsNarrowLayout(991);

  return (
    <section className="fo-hero hro" aria-label={BRAND_LABEL}>
      {/* ══ [1] THE ART BAND — the drafting stage (the reference's
          home-hero-img layer stack, ONE physical frame for the ink,
          the inspection instrument and the drafting chrome). ══ */}
      <div className="hro-art">
        <div className="bp-stage hro-stage" data-cursor="none">
          {/* the ink — the whole frontal elevation on transparent
              paper (the reference's img-inner seat, drawn in by the
              staged ink-in belt). */}
          <HeroInkWindow />
          {/* the cursor instrument — crosshair guides + coordinate
              readout + the drag-to-inspect stations (fine pointers,
              ≥992 — the reference's interact-wrap, Madarek's own). */}
          <HeroInspect />
          {/* the ruler chrome — dashed ticks, corner plus marks,
              registration marks and the measure graticule (the
              reference's ruler layer, visible at rest). */}
          <div className="bp-rulers" aria-hidden="true">
            <span className="bp-ruler bp-ruler-t" />
            <span className="bp-ruler bp-ruler-b" />
            <span className="bp-ruler bp-ruler-s" />
            <span className="bp-ruler bp-ruler-e" />
            <span className="bp-measure bp-measure-h bp-measure-h1" data-spec-hover={MEASURE_SEAT.h1} />
            <span className="bp-measure bp-measure-h bp-measure-h2" data-spec-hover={MEASURE_SEAT.h2} />
            <span className="bp-measure bp-measure-v bp-measure-v1" data-spec-hover={MEASURE_SEAT.v1} />
            <span className="bp-measure bp-measure-v bp-measure-v2" data-spec-hover={MEASURE_SEAT.v2} />
            <span className="bp-measure bp-measure-marker bp-measure-m1" data-spec-hover={MEASURE_SEAT.m1} />
            <span className="bp-measure bp-measure-marker bp-measure-m2" data-spec-hover={MEASURE_SEAT.m2} />
          </div>

          {/* the ± registration marks — the dashed inner frame's corner
              chrome (R315 B1 · A.3); direct stage children so their 11px
              seats track the frame's own 16px inset. Hover-revealed with
              the frame they annotate (R332 W1 — clean corners at rest). */}
          <span data-spec-hover={DMARK_SEAT.tl} className="bp-dmark bp-dmark-tl" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.tr} className="bp-dmark bp-dmark-tr" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.bl} className="bp-dmark bp-dmark-bl" aria-hidden="true" />
          <span data-spec-hover={DMARK_SEAT.br} className="bp-dmark bp-dmark-br" aria-hidden="true" />

          {/* the deco cards — mono micro-copy + the brand square's
              1.5s fade-loop pulse (decorative repetition of the
              ledger's own subjects — aria-hidden). ≥992 only. */}
          {!phoneBand && DECO_CARDS.map((d, i) => (
            /* r338 T-13b — tabIndex -1: the interact probe focus-walks
               the first ten census twins (the deco seats are 8/9), so
               the cards must hold programmatic focus for the keyboard
               parity read; -1 keeps them out of the tab order (they
               stay aria-hidden decorative chrome) */
            <div
              key={d.code}
              className={`hro-deco hro-deco-${i + 1}`}
              aria-hidden="true"
              tabIndex={-1}
              data-spec-hover={d.seat}
            >
              <span className="hro-deco-sq" />
              <span className="hro-deco-label fo-mono" dir="ltr">[{d.code}]</span>
              <div className="hro-deco-text">{d.text}</div>
            </div>
          ))}

        </div>
      </div>

      {/* ══ [2] THE CONTENT BAND — the measured strip: H1 cell ‖ 1px
          divider ‖ sub cell (lead + the register CTA + the login
          secondary). ══ */}
      <div className="hro-content">
        <div className="hro-title-cell">
          <h1 className="hro-title fo-hero-title">
            {TITLE_LINES.map((line, i) => (
              <Fragment key={line}>
                {/* the whitespace text node between mask lines is the
                    accessible-text seam: display:block masks render no
                    box for it (visually inert), but textContent keeps
                    the natural sentence spacing — screen readers and
                    text pins read «من المحاضرة إلى الإتقان», not glue */}
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </h1>
        </div>

        <div className="hro-sub-cell">
          {/* div, not p — the reference's lead is a measured div box (T-11c) */}
          <div className="hro-lead">
            {LEAD_LINES.map((line, i) => (
              <Fragment key={line}>
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </div>

          {/* the funnel contract (r164b → r188, kept byte-identical):
              ONE primary «أنشئ حسابك الجامعي» → /auth/register, now
              with the login secondary the reference's sub-wrap carries. */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="btn accent lg hro-cta fo-hero-cta" data-spec-hover="3">
              {REGISTER}
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
            <Link to="/auth" className="hro-alt" data-spec-hover="0">
              {LOGIN}
            </Link>
          </div>
        </div>
      </div>

      {/* ══ [3] THE WORK STRIP — the six honest live-capability
          subjects (the reference's home-hero-work band): ONE static
          row ≥1200 (space-between, zero mask), a snap-scrolling strip
          below — riding the work-card rise (3.2rem · 1s p3.out). ══ */}
      <div className="hro-work fo-hero-work" aria-label="قدرات مدارك العاملة اليوم">
        <div className="hro-work-track">
          {/* divs, not spans — the instrument asserts the reference's
              measured div boxes (T-11c) */}
          {HERO_WORK_ITEMS.map((cap, i) => (
            <div
              key={cap}
              className="hro-work-item"
              /* r338 T-13b — the census twin seat (heron's strip items
                 carry hover twins at the recorded bps; tabIndex -1 keeps
                 the programmatic-focus parity path without turning the
                 labels into tab stops — the strip stays decorative) */
              tabIndex={-1}
              data-spec-hover={WORK_SEAT_ORD[i]}
            >
              <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
              {cap}
            </div>
          ))}
        </div>
      </div>

      {/* ══ [4] THE FRAME — the reference's bg-border frame (R332 W1):
          4 wiping edge strips (1.2s linear; origin mirrored for RTL)
          + 4 corner plus marks, seated on the SECTION — inset 1.2rem
          from the viewport edges over the full-bleed drawing, never
          hugging an inner window (the run-001 kill). ══ */}
      <span className="hro-edge hro-edge-t" aria-hidden="true" />
      <span className="hro-edge hro-edge-b" aria-hidden="true" />
      <span className="hro-edge hro-edge-s" aria-hidden="true" />
      <span className="hro-edge hro-edge-e" aria-hidden="true" />
      <span className="bp-plus bp-plus-tl" aria-hidden="true" />
      <span className="bp-plus bp-plus-tr" aria-hidden="true" />
      <span className="bp-plus bp-plus-bl" aria-hidden="true" />
      <span className="bp-plus bp-plus-br" aria-hidden="true" />

      {/* ══ [5] THE DRAFTING GRID — R341 H1-a: the per-div hairline layer
          (the reference's ~95 grid divs, measured seats; appended LAST so
          no existing census ordinal shifts). ══ */}
      <HeroGrid />
    </section>
  );
}
