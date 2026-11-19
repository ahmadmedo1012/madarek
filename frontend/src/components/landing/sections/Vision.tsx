/* P2-0 (r335 split) — [8] الخاتمة (the reference's cta) — the resolve.
 * R338 T-10b: the band closes on heron's RULED LEDGER — a drafting-table
 * grid: top ledger band (three mono-labelled cells), title band (kicker
 * rail + centered resolve + flank rule), sketch band (AUTHORED inline-SVG
 * line-art — the registration path as a drafting sketch; no reference
 * assets), joined by 1px column rules. The true numbers (colleges,
 * campuses, live capabilities) still ride the registry strip below,
 * computed from the real config. Debug text is not content. */
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Icon } from '../../Icon';
import { colleges } from '../../../data/colleges.config';
import { LIVE_COUNT } from '../../../data/landing-ledger';
import { formatInt } from '../../../utils/numbers';
import { LOGIN, REGISTER } from '../copy';

const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;

/* T-10f: heron's resolve label is a TWO-LINE stack inside a fixed label
 * column (w80 @phone) — the register copy splits on its natural Arabic
 * phrase break (copy.ts stays the single source). */
const REGISTER_WORDS = REGISTER.split(' ');
/* Trailing space on L1: jsdom's innerText ≈ textContent concatenates the
 * masked lines without whitespace — the funnel contract reads the full
 * phrase «أنشئ حسابك الجامعي» off .btn.accent. CSS ignores the trailing
 * space visually (the measured two-line masked wrappers are untouched). */
const REGISTER_L1 = REGISTER_WORDS.slice(0, 2).join(' ') + ' ';
const REGISTER_L2 = REGISTER_WORDS.slice(2).join(' ');

/* The sketch band's authored line-art: ruled baselines, the multi-tier
 * structural elevation, column grids, and the account journey path — pure stroke work. */
function SketchArt() {
  return (
    <svg
      className="fo-cta-sketch-art"
      data-spec="cta.sketch-art"
      viewBox="0 0 713 386"
      fill="none"
      role="img"
      aria-label="رسم تخطيطي لمسار إنشاء الحساب الجامعي"
    >
      <g stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
        {/* outer boundary datum rules */}
        <path d="M0 .5h713M0 385.5h713" opacity=".7" />
        <path d="M.5 0v386M712.5 0v386" opacity=".35" />

        {/* architectural grid columns (1 through 6) */}
        <path d="M118 24v330M236 24v330M354 24v330M472 24v330M590 24v330" opacity=".18" strokeDasharray="3 3" />

        {/* datum levels & floor elevations */}
        <path d="M64 84h585M64 168h585M64 252h585M64 336h585" opacity=".22" />

        {/* foundation podium and plinth steps */}
        <path d="M96 336h522v16H96z" opacity=".5" />
        <path d="M128 352h458v8H128z" opacity=".3" />

        {/* lower level: structural colonnade & entry bays */}
        <path d="M148 252h418v84H148z" />
        <path d="M178 252v84M208 252v84M338 252v84M376 252v84M506 252v84M536 252v84" opacity=".4" />
        {/* central arch / portal */}
        <path d="M338 336v-54a19 19 0 0 1 38 0v54" />

        {/* middle tier: faculty bays & cross-braced drafting modules */}
        <path d="M178 168h358v84H178z" />
        <path d="M178 168l60 84M238 168l-60 84" opacity=".25" />
        <path d="M296 168h122v84H296z" />
        <path d="M312 186h90v48h-90z" opacity=".6" />
        <path d="M476 168l60 84M536 168l-60 84" opacity=".25" />

        {/* upper tier: clerestory gallery & cantilevered canopy */}
        <path d="M208 104h298v64H208z" />
        <path d="M188 104h338" strokeWidth="1.5" />
        <path d="M236 104v64M276 104v64M316 104v64M356 104v64M396 104v64M436 104v64M476 104v64" opacity=".3" />

        {/* roof truss & skylight pavilion */}
        <path d="M268 64h178v40H268z" />
        <path d="M268 64l89-28 89 28" strokeWidth="1.2" />
        <path d="M357 36v68" opacity=".5" />
        <path d="M268 64l89 40M446 64l-89 40" opacity=".2" />

        {/* dimension witness lines and measurement annotations */}
        <path d="M48 84v252M42 84h12M42 336h12" opacity=".4" />
        <path d="M44 84l4 8M44 336l4-8" opacity=".6" />
        <path d="M666 168v168M660 168h12M660 336h12" opacity=".4" />

        {/* registration crosshairs at structural nodal points */}
        <path d="M118 78v12M112 84h12" opacity=".6" />
        <path d="M590 78v12M584 84h12" opacity=".6" />
        <path d="M118 330v12M112 336h12" opacity=".6" />
        <path d="M590 330v12M584 336h12" opacity=".6" />

        {/* learning journey trajectory curve & account registration milestone nodes */}
        <path d="M64 322c88-42 148-118 256-118s168 58 256 58" strokeWidth="1.5" />
        <circle cx="64" cy="322" r="10" />
        <circle cx="64" cy="322" r="4" fill="currentColor" opacity=".5" />
        <circle cx="320" cy="204" r="8" opacity=".8" />
        <circle cx="576" cy="262" r="10" />
        <circle cx="576" cy="262" r="4" fill="currentColor" opacity=".5" />
        <path d="M576 262l32-22-8 30M576 262l34 10" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/* T-13: the registry cloud's ordinal binding — the frozen spec's cta
 * hover records (ordinals 2·14 + the mobile-only set). Each seat links
 * the registry's own /colleges page under the college's real name. */
const CTA_CLOUD_ORD = [2, 14, 3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18];

export function Vision({ year }: { year: number }) {
  return (
    <section className="fo-cta" id="vision" data-spec="cta.section" aria-label="ابدأ رحلتك — أنشئ حسابك">
      <div className="fo-cta-frame" data-spec="cta.frame">
        <section className="fo-cta-sheet" data-spec="cta.sheet" aria-label="الخاتمة">
          <div className="fo-cta-ledger" data-spec="cta.ledger">
            {/* the top ledger band — three ruled cells, mono kickers */}
            <div className="fo-cta-band fo-cta-band-top" data-spec="cta.band-top">
              <div className="fo-cta-hrule" data-spec="cta.top-hrule" aria-hidden="true" />
              <div className="fo-cta-cell fo-cta-rail" data-spec="cta.top-rail">
                <div className="fo-cta-kick" data-spec="cta.top-rail-kick-wrap">
                  <div className="lp-kicker lp-kicker--cta-ink fo-mono" dir="ltr" data-spec="cta.top-rail-kicker">[07] CTA</div>
                </div>
              </div>
              <div className="fo-cta-cell fo-cta-mid" data-spec="cta.top-mid">
                <div className="fo-cta-kick" data-spec="cta.top-mid-kick-wrap">
                  <div className="lp-kicker lp-kicker--cta-ink fo-mono" dir="ltr" data-spec="cta.top-mid-kicker">RESOLVE</div>
                </div>
                <div className="fo-cta-vrule" data-spec="cta.top-mid-rule" aria-hidden="true" />
              </div>
              <div className="fo-cta-cell fo-cta-side" data-spec="cta.top-side">
                <div className="fo-cta-kick" data-spec="cta.top-side-kick-wrap">
                  <div className="lp-kicker lp-kicker--cta-ink fo-mono" dir="ltr" data-spec="cta.top-side-kicker">MADAREK</div>
                </div>
                <div className="fo-cta-vrule" data-spec="cta.top-side-rule" aria-hidden="true" />
              </div>
            </div>

            {/* the title band — kicker rail + the centered resolve + flank rule */}
            <div className="fo-cta-band fo-cta-band-title" data-spec="cta.band-title">
              <div className="fo-cta-cell fo-cta-rail" data-spec="cta.title-rail">
                <div className="fo-cta-kick" data-spec="cta.title-rail-kick-wrap">
                  <div className="lp-kicker lp-kicker--cta-ink fo-mono" dir="ltr" data-spec="cta.title-rail-kicker">FIN</div>
                </div>
              </div>
              <div className="fo-cta-cell fo-cta-inner" data-spec="cta.title-mid">
                <div className="fo-cta-copy" data-spec="cta.title-box">
                  <h2 className="fo-cta-title" data-spec="cta.title" data-mdrk-reveal="lines">
                    اكتشف ما يمكن لمدارك تحقيقه<br />
                    <em>في مسيرتك الأكاديمية</em>
                  </h2>
                </div>
                <div className="fo-cta-lede-wrap" data-spec="cta.lede-wrap">
                  {/* T-10f: the instrument asserts tags — heron's lede seat is a
                      div (p margins are globally reset, so the swap is neutral). */}
                  <div className="fo-cta-lede" data-spec="cta.lede" data-mdrk-reveal="item">
                    أنشئ حسابك الجامعي في دقائق برقم قيدك، وتابع تقدّمك.
                  </div>
                </div>
                <div className="fo-cta-actions" data-spec="cta.actions" data-mdrk-reveal="item" id="cta">
                  {/* T-10f RESTRUCTURE — heron's measured resolve-button tree:
                      a (transparent interactive shell) > bg div (the orange
                      wash + border-color/color voice) > label column (two
                      masked two-line wrappers, transform tween) + icon box
                      (dual swap chevrons, transform tween). The arrow is our
                      own authored line-art, mirrored for RTL. */}
                  <Link to="/auth/register" className="btn accent lg" data-spec="cta.primary" data-spec-hover="1">
                    <div className="fo-cta-rbtn" data-spec="cta.primary-bg">
                      <div className="fo-cta-rlabel" data-spec="cta.primary-label">
                        <div className="fo-cta-rline" data-spec="cta.primary-l1">
                          <div className="fo-cta-rtext" data-spec="cta.primary-l1t">{REGISTER_L1}</div>
                        </div>
                        <div className="fo-cta-rline fo-cta-rline2" data-spec="cta.primary-l2">
                          <div className="fo-cta-rtext" data-spec="cta.primary-l2t">{REGISTER_L2}</div>
                        </div>
                      </div>
                      <div className="fo-cta-ricons" data-spec="cta.primary-icons">
                        <div className="fo-cta-ricon" data-spec="cta.primary-i1">
                          <div className="fo-cta-ricell" data-spec="cta.primary-i1c">
                            <div className="fo-cta-ricore" data-spec="cta.primary-i1k">
                              <svg className="fo-cta-rsvg" data-spec="cta.primary-i1s" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                                <path data-spec="cta.primary-i1p" d="M14 8.5H3.5M6.5 5.5 3.5 8.5l3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <div className="fo-cta-ricon fo-cta-ricon2" data-spec="cta.primary-i2">
                          <div className="fo-cta-ricell" data-spec="cta.primary-i2c">
                            <div className="fo-cta-ricore" data-spec="cta.primary-i2k">
                              <svg className="fo-cta-rsvg" data-spec="cta.primary-i2s" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                                <path data-spec="cta.primary-i2p" d="M14 8.5H3.5M6.5 5.5 3.5 8.5l3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <Link to="/auth" className="btn ghost lg" data-spec="cta.secondary" data-spec-hover="4">{LOGIN}</Link>
                </div>
                <div className="fo-cta-flank" data-spec="cta.flank-rule" aria-hidden="true" />
              </div>
              <div className="fo-cta-cell fo-cta-side" data-spec="cta.title-side">
                <div className="fo-cta-vrule" data-spec="cta.title-side-rule" aria-hidden="true" />
              </div>
            </div>

            {/* the sketch band — the authored drafting sketch under the rule */}
            <div className="fo-cta-band fo-cta-band-sketch" data-spec="cta.band-sketch">
              <div className="fo-cta-hrule" data-spec="cta.band-sketch-hrule" aria-hidden="true" />
              <div className="fo-cta-cell fo-cta-rail" data-spec="cta.sketch-rail" aria-hidden="true" />
              <div className="fo-cta-cell fo-cta-mid" data-spec="cta.sketch-mid">
                <div className="fo-cta-sketch-wrap" data-spec="cta.sketch-wrap">
                  <div className="fo-cta-sketch-frame" data-spec="cta.sketch-frame">
                    <div className="fo-cta-sketch-holder" data-spec="cta.sketch-holder">
                      <SketchArt />
                    </div>
                    <div className="fo-cta-sketch-veil" data-spec="cta.sketch-veil" aria-hidden="true" />
                    {/* r321 §A6: the decorative registration mark — glyph
                        lives in CSS ::before content, the span stays textless */}
                    <span className="fo-cta-sketch-mark" aria-hidden="true" />
                  </div>
                  <div className="fo-cta-sketch-matte" data-spec="cta.sketch-matte" aria-hidden="true" />
                </div>
                <div className="fo-cta-vrule" data-spec="cta.sketch-mid-rule" aria-hidden="true" />
              </div>
              <div className="fo-cta-cell fo-cta-side" data-spec="cta.sketch-side">
                <div className="fo-cta-vrule" data-spec="cta.sketch-side-rule" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="fo-cta-sheet-rule" data-spec="cta.sheet-rule" aria-hidden="true" />
        </section>
      </div>

      <p className="fo-cta-meta" data-spec="cta.meta" data-mdrk-reveal="item">
        <Icon icon={Check} size={13} />
        مدارك · {year} · منصّة تعليمية مستقلّة
      </p>

      {/* [8] the colleges registry strip — the ruled hairline row
          linking the public registry (the funnel's 5th login
          affordance lives here; the demo-data disclosure rides the
          row, never a tooltip). The TRUE numbers (colleges,
          campuses, the live-capability count) ride HERE, computed
          from the real config/data — never invented. */}
      <div className="cg-strip" id="colleges" data-spec="cta.registry">
        <span className="cg-strip-label fo-mono" dir="ltr" data-spec="cta.registry-label">[08] · REGISTRY</span>
        <p className="cg-strip-text" data-spec="cta.registry-text">
          <strong><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية</strong> في{' '}
          <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرام —{' '}
          <span className="fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}]</span> قدرات تعمل اليوم.
          بيانات «مؤسسة مدارك النموذجية»: اصطناعية بالكامل لأغراض العرض.
        </p>
        <div className="cg-strip-links" data-spec="cta.registry-links">
          <Link to="/colleges" className="btn ghost sm" data-spec-hover="6">تصفح الكليات التجريبية</Link>
          <Link to="/auth" className="fo-text-link" data-spec-hover="9">سجل الدخول لاستعراض كليتك</Link>
        </div>
        {/* T-13: the registry index cloud — the recorded cta interaction
            seats. Honest counterparts: the registry's OWN college names,
            each a real door to /colleges (no invented labels). */}
        <div className="cg-cloud" aria-label="فهرس الكليات التجريبية">
          {colleges.slice(0, 14).map((c, i) => (
            <Link key={c.slug} to="/colleges" className="cg-cloud-link" data-spec-hover={CTA_CLOUD_ORD[i]}>
              {c.nameAr}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
