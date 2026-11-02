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
import { HeroInspect } from '../cursor/HeroInspect';
import '../../../styles/r331/hero.css';

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
  { code: '01', text: 'المحاضرة التفاعلية' },
  { code: '03', text: 'مصفوفة الإتقان' },
] as const;

export function Hero() {
  return (
    <section className="fo-hero hro" aria-label="مدارك — منصّة التعليم الذكي">
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
            <span className="bp-measure bp-measure-h bp-measure-h1" />
            <span className="bp-measure bp-measure-h bp-measure-h2" />
            <span className="bp-measure bp-measure-v bp-measure-v1" />
            <span className="bp-measure bp-measure-v bp-measure-v2" />
            <span className="bp-measure bp-measure-marker bp-measure-m1" />
            <span className="bp-measure bp-measure-marker bp-measure-m2" />
          </div>

          {/* the ± registration marks — the dashed inner frame's corner
              chrome (R315 B1 · A.3); direct stage children so their 11px
              seats track the frame's own 16px inset. Hover-revealed with
              the frame they annotate (R332 W1 — clean corners at rest). */}
          <span className="bp-dmark bp-dmark-tl" aria-hidden="true" />
          <span className="bp-dmark bp-dmark-tr" aria-hidden="true" />
          <span className="bp-dmark bp-dmark-bl" aria-hidden="true" />
          <span className="bp-dmark bp-dmark-br" aria-hidden="true" />

          {/* the deco cards — mono micro-copy + the brand square's
              1.5s fade-loop pulse (decorative repetition of the
              ledger's own subjects — aria-hidden). ≥992 only. */}
          {DECO_CARDS.map((d, i) => (
            <div key={d.code} className={`hro-deco hro-deco-${i + 1}`} aria-hidden="true">
              <span className="hro-deco-sq" />
              <span className="hro-deco-label fo-mono" dir="ltr">[{d.code}]</span>
              <span className="hro-deco-text">{d.text}</span>
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
          <p className="hro-lead">
            {LEAD_LINES.map((line, i) => (
              <Fragment key={line}>
                {i > 0 ? ' ' : null}
                <span className="hro-lmask">
                  <span className="hro-line">{line}</span>
                </span>
              </Fragment>
            ))}
          </p>

          {/* the funnel contract (r164b → r188, kept byte-identical):
              ONE primary «أنشئ حسابك الجامعي» → /auth/register, now
              with the login secondary the reference's sub-wrap carries. */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="btn accent lg hro-cta fo-hero-cta">
              أنشئ حسابك الجامعي
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
            <Link to="/auth" className="hro-alt">
              تسجيل الدخول
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
          {HERO_WORK_ITEMS.map((cap, i) => (
            <span key={cap} className="hro-work-item">
              <span className="fo-mono" dir="ltr">[{String(i + 1).padStart(2, '0')}]</span>
              {cap}
            </span>
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
    </section>
  );
}
