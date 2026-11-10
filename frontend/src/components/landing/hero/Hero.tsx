/**
 * Hero — R331 (A-Web-Hero) — the Heron-mechanics rebuild of the landing
 * hero, Madarek's own content on Heron's construction.
 *
 * Port source of record: docs/redesign/r331/heron-program.md (§4 hero
 * recipe + §7 motion values) / heron-program.json (`imagery.hero`).
 * The reference's hero anatomy, mirrored for RTL:
 *
 *   .home-hero (full-bleed band, 100svh-class height)
 *   ├─ the art layer — the img (OUR ink elevation, HeroInkWindow,
 *   │  FULL-BLEED — R332 W1) + the checkpoint stations (HeroInspect —
 *   │  «محطات الفحص», the drawing's own content)
 *   ├─ the content grid (title-wrap ‖ sub-wrap) + the work strip
 *   └─ the bg-border FRAME on the section itself (4 edge strips +
 *      4 corner plus marks, inset 1.2rem from the viewport edges)
 *
 * R347 D4 — ONE CALM ARTWORK (the owner's directive): the drafting
 * noise chrome that buried the elevation is RETIRED with its elements —
 * the dashed rulers, the ± registration marks, the measure graticule,
 * the deco [0x] cards, the section edge frame + corner plusses, and the
 * per-div grid/vector-chrome layers (HeroGrid/HeroChrome, deleted).
 * What Heron's own hero carries (live capture): a line drawing over
 * paper, a large headline, one CTA pair, a numbered subject strip.
 *
 * Mechanics (the reveal grammar, exact Heron values):
 *   · title mask-lines — each display line rides its own
 *     overflow-hidden mask, translateY(103%)→0, 0.8s power2.out,
 *     0.02s stagger (y is direction-neutral — no RTL mirror);
 *   · img fades — 1s power3.out; the ink itself DRAWS (the staged
 *     ink-in belt — Madarek's superior substitute for Heron's static
 *     img fade);
 *   · block/work rise — y 3.2rem→0, 1s power3.out.
 *
 * The motion engine is CSS transitions + the landing's OWN gates —
 * NO GSAP in the Madarek stack. The choreography hangs on the
 * `.landing.intro-draw → .landing.intro-done` flip (R308's entrance
 * gate). The GSAP ease curves are translated to cubic-bezier(·)
 * equivalents (documented in hero.css). prefers-reduced-motion
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
import '../../../styles/landing/hero-mechanics.css';
import { BRAND_LABEL, LOGIN, REGISTER } from '../copy';

/* The display title — R342-02: TWO authored lines (the frozen spec's own
 * h1 box is the 2-line seat at 1440/1920/1024: 772×93 · 1029×124 ·
 * 549×66 — lh = fs exactly, 2 lines). UNVOCALISED (zero tashkeel — the
 * display canon), no tracking; the second line carries the whole
 * «من المحاضرة إلى الإتقان» clause so the pair reads as one sentence
 * seam-to-seam at every belt. */
const TITLE_LINES = ['رحلة تعلم واحدة', 'من المحاضرة إلى الإتقان'] as const;

/* The lead — the honest funnel copy, hand-split at the em-dash into
 * two mask lines (the reference splits its sub on word-wrap; the
 * sentence seam is the Arabic-stable split point). */
const LEAD_LINES = [
  'محاضرات تفاعلية، ومصفوفة إتقان، واختبارات، وبحوث، ورسائل —',
  'تجربة عربية واحدة لخمسة أدوار وثلاث شرائح.',
] as const;

/* r338 T-13b — the hero's interaction-state seat ordinals: the heron
 * census recorded 21 interactive twins in div.home-hero-sub-wrap
 * (docs/redesign/r335/heron-spec/home-hero-wrap.<bp>.json `hovers`).
 * data-spec-hover=N binds each twin to its counterpart so
 * scripts/conformance/interact.mjs resolves every recorded delta.
 * R347 D4 — the noise chrome (deco cards 8/9, dmarks 11–14, graticule
 * 15–20, grid/chrome layers) is retired with its elements; the login
 * (0), register (3) and work-strip (1/2/5/7/4/6) seats stay. */
const WORK_SEAT_ORD = ['1', '2', '5', '7', '4', '6'] as const;

export function Hero() {
  /* R347 D4 — the noise chrome is retired; the art band is ONE calm
   * ink elevation and the content band carries the fold (headline +
   * lead + the ONE CTA pair + the work strip). */
  return (
    <section className="fo-hero hro" aria-label={BRAND_LABEL}>
      {/* ══ [1] THE ART BAND — R347 D4: ONE calm artwork. The reference's
          own hero (live capture) is a line-drawing elevation over paper
          and nothing else; our ink elevation rides with the checkpoint
          stations alone — the dashed rulers, the ± registration marks,
          the measure graticule, the deco [0x] cards, the edge frame and
          the grid/vector chrome layers are retired with their elements
          (they buried the drawing; the owner's R347 D4 directive). The
          stations' crosshair instrument chrome is hover-only (invisible
          at rest — hero.css gates it with the readout). ══ */}
      <div className="hro-art">
        <div className="bp-stage hro-stage" data-cursor="none">
          {/* the ink — the whole frontal elevation on transparent
              paper, drawn in by the staged ink-in belt. */}
          <HeroInkWindow />
          {/* R347 D4 — the checkpoint stations («محطات الفحص», the
              lecture-checkpoints feature + the r308/r309 e2e contract)
              STAY: the instrument's crosshair chrome is hover-only
              (invisible at rest); the stations are the drawing's own
              content, not noise. */}
          <HeroInspect />
        </div>
      </div>

      {/* ══ [2] THE CONTENT BAND — R342-02: the measured closing collage of
          the fold — title cell (the 2-line H1, reading-start) ‖ sub cell
          (the lead paragraph + the register CTA under it) ‖ alt cell (the
          login secondary, accent ink); the work strip closes the band as
          an absolutely-seated row inside the sub/alt column's lower zone
          (the spec's own overlap — the h1's box-bottom is the fold's
          last line, the subjects run under the short columns). ══ */}
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
              ONE primary «أنشئ حسابك الجامعي» → /auth/register, styled as
              the reference's own hero CTA seat (a 600-weight text link
              with the arrow glyph — the editorial voice; the .btn mass
              era ends with the R342 seat). */}
          <div className="hro-actions fo-hero-actions">
            <Link to="/auth/register" className="hro-cta fo-hero-cta" data-spec-hover="3">
              {REGISTER}
              <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* the alt cell — the login secondary in its own measured column
            (the spec's a[2]: accent ink, the text row + the arrow glyph
            stacked — the tall link box at the fold's inline-end edge) */}
        <div className="hro-alt-cell">
          <Link to="/auth" className="hro-alt" data-spec-hover="0">
            {LOGIN}
            <Icon icon={ArrowLeft} size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* ══ [3] THE WORK STRIP — the six honest live-capability
          subjects (the reference's home-hero-work band ≈ Heron's own
          numbered boot list): ONE static row ≥1200 (space-between, zero
          mask), a snap-scrolling strip below — riding the work-card rise
          (3.2rem · 1s p3.out). ══ */}
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
    </section>
  );
}
