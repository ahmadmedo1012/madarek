/* R338 T-06 → R368 T3 — the colophon, reworked against the frozen Heron
 * footer census (docs/redesign/r335/heron-spec/footer.{390,768,1024,
 * 1440,1920}.json). R338/R342-07 built the 355/715/357 grid + the
 * 42fu legal row; R368 T3 rebuilds the print model the reference
 * actually ships (the E=43.2 finding):
 *
 *   footer.fo-footer > .fo-in > .fo-grid (the 4-column print ladder:
 *     col1 = the contact block — brand lockup + the newsletter row;
 *     col2 = THREE hairline-divided link columns with terse Arabic
 *     headers المنصة/المنتج/الأدلة + the CONTACT/ADDRESS/REGION/
 *     CHANNELS bottom row) > .fo-cta-strip (the standalone underlined
 *     contact door + chevron) > .fo-fstrip (the GIANT outlined wordmark
 *     band — the reference's own tonal anchor, 1427×314 @1440) >
 *     .fo-footer-bottom (42: © + legal row).
 *
 * R368 T3 seat notes:
 *   · the col1 brow cluster (the 4+3+2 inline link rows) RETIRES — the
 *     reference's col1 carries the brand block + the newsletter row
 *     only; every brow href survives in the link columns (الكليات
 *     joins المنتج — the one href without a column seat).
 *   · the funnel pair moves from the retired ACCOUNT group to the
 *     CONTACT bottom group (the register form IS the honest channel).
 *   · the contact CTA (h3 التواصل + the /contact door) lifts OUT of
 *     the col2 CONTACT group into its own underlined strip above the
 *     wordmark — the reference's distinct CTA row, no longer inline
 *     body copy.
 *   · the strip band's skyline illustration RETIRES (the reference has
 *     no counterpart at that seat — its band is the giant outlined
 *     wordmark; the r342 skyline asset stays referenced by the col3
 *     mark-img stub and untouched in public/media).
 *   · copy diet: terse label-style rows (the reference's register);
 *     the independence paragraph stays VERBATIM (r188/r320 §D — the
 *     one prose block that is contract).
 *
 * Arabic = transformed expectations: RTL mirror, letter-spacing 0,
 * lh floor 1.35×fs (display seats ride lh=fs, the fo-brand-name law). */
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BRAND_LABEL, LOGIN } from '../copy';
import { MARK_AXIS, MARK_DIAMOND_PATH, MARK_POINT } from '../../../brand/mark';

/* the three link columns of the print ladder (R368 T3 — the reference's
 * LINKS/PRODUCTS/GUIDES model as terse Arabic headers) — [to, label] */
const INDEX_TOP: { label: string; links: [string, string][] }[] = [
  {
    label: 'المنصة',
    links: [
      ['/capabilities', 'ما يعمل اليوم'],
      ['#product', 'المنصّة'],
      ['#chapters', 'الفصول'],
      ['#roles', 'الأدوار'],
    ],
  },
  {
    label: 'المنتج',
    links: [
      ['#statement', 'البيان'],
      ['#live', 'التحديات'],
      ['/competitions', 'المسابقات'],
      ['#vision', 'الرؤية'],
      ['/colleges', 'الكليات'],
    ],
  },
  {
    label: 'الأدلة',
    links: [
      ['/app', 'تطبيق الجوال'],
      ['/help', 'المساعدة'],
    ],
  },
];

/* the col2 bottom CHANNELS group: single-line door links (the spec's
 * 2×3 fit-content grid) — [to, label], all real public routes */
const CHANNEL_LINKS: [string, string][] = [
  ['/contact', 'التواصل'],
  ['/about', 'عن مدارك'],
  ['/help', 'المساعدة'],
  ['/legal/data', 'البيانات'],
  ['/legal/privacy', 'الخصوصية'],
  ['/legal/terms', 'الشروط'],
];

/* the col3 construction mark — master/B1: RE-SOURCED from the ONE
 * brand geometry (frontend/src/brand/mark.ts — the same 32-unit khatam
 * grid <Logo> renders). The grid is projected onto the 215×215
 * construction canvas (scale 215/32) and authored as line-art: the two
 * squares + the orange point, plus the drawing's own construction axes
 * and registration frame. */
const GRID = 215 / 32; /* 6.71875 — the projection scale */
const g = (n: number) => +(n * GRID).toFixed(2);
const C = g(16); /* 107.5 — the shared centre */
const DIAMOND = (MARK_DIAMOND_PATH.match(/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?/g) ?? [])
  .map((pair) => pair.split(/\s+/).map(Number))
  .map(([x, y]) => `${g(x ?? 0)} ${g(y ?? 0)}`)
  .join('L');
const MARK_PATHS = [
  `M${C} 20v175`, // the vertical construction axis (through the centre)
  `M20 ${C}h175`, // the horizontal construction axis
  'M40 40l135 135', // the diagonal construction track (45°)
  `M${g(MARK_AXIS.x)} ${g(MARK_AXIS.y)}h${g(MARK_AXIS.size)}v${g(MARK_AXIS.size)}h-${g(MARK_AXIS.size)}Z`, // the axis square (the 8..24 grid seat)
  `M${DIAMOND}Z`, // the rotated square — vertices on the grid axes
  `M${g(MARK_POINT.x)} ${g(MARK_POINT.y)}h${g(MARK_POINT.size)}v${g(MARK_POINT.size)}h-${g(MARK_POINT.size)}Z`, // «النقطة» — the orange point on the NE intersection (filled)
  'M55 182h105', // the base line
  'M22 62V22h40M153 22h40v40M193 153v40h-40M62 193H22v-40', // frame corner ticks (the registration frame — stays lit)
];

/* T-99 diet — the repeated seat shapes as shared components (the
 * retired inline JSX rendered the identical DOM) */
const A = ({ to, cls, t, ds, tds }: { to: string; cls: string; t: string; ds?: string; tds?: string }) => (
  <a href={to} className={cls} data-spec={ds}>
    <div className={cls + '-t'} data-spec={tds}>{t}</div>
  </a>
);
const ML = ({ s, t, ts }: { s?: string; t: string; ts?: string }) => (
  <div className="fo-mono-label" data-spec={s}>
    <div className="fo-mono-label-t" data-spec={ts}>{t}</div>
  </div>
);
const R = ({ c, s }: { c: string; s?: string }) => <div className={c} data-spec={s} />;

/* R368 T3 — the CTA chevron: the house ArrowIcon grammar (Statement's
 * census arrow) on the footer's own 17×17 go-arrow geometry, mirrored
 * to the RTL forward direction (the reference's LTR → becomes ←). */
function ArrowIcon({ spec }: { spec: string }) {
  return (
    <svg className="fo-cta-arrow" viewBox="0 0 17 17" fill="none" aria-hidden="true" data-spec={spec}>
      <path className="fo-cta-arrow-path" d="M15 8.5H3M7.5 4L3 8.5 7.5 13" data-spec={`${spec}path`} />
    </svg>
  );
}

export function Footer({ year }: { year: number }) {
  const [email, setEmail] = useState('');
  /* T-13: the interaction-state conformance binding. The frozen spec
   * records hover deltas for the footer's interactive seats by ORDINAL
   * (interactive[7…35] change color+bd; [5],[6] record NO change and are
   * deliberately left unbound). The extractor numbered Heron's footer
   * interactives in DOM order, so the counterpart binding stamps our own
   * a/button seats in DOM order too — starting at ordinal 7 (our first
   * five seats map onto Heron's unrecorded [0…4] prefix). This is a
   * measurement hook only: it carries no styles and no behaviour. */
  useEffect(() => {
    const root = document.querySelector('footer.fo-footer');
    if (!root) return;
    [...root.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('a, button')].forEach(
      (el, i) => {
        if (i >= 5) el.setAttribute('data-spec-hover', String(i + 2));
      },
    );
  }, []);
  /* R342-07 — the construction mark's scroll reveal. The frozen census
   * captured the mark's PRE-REVEAL state (paths 1–7 opacity 0 with a
   * 0.5s opacity tween; path 8 — the frame ticks — already visible),
   * so the counterpart reveal is authored here on the house grammar:
   * JS writes the class, CSS owns the tween, reduced-motion ships the
   * mark visible, no-JS ships the mark visible. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mark = document.querySelector('footer.fo-footer .fo-mark-svg');
    if (!mark) return;
    const veiled = [...mark.querySelectorAll<SVGPathElement>('.fo-mark-p')].slice(0, -1);
    veiled.forEach((p) => p.classList.add('fo-mark-veiled'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            veiled.forEach((p) => p.classList.remove('fo-mark-veiled'));
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(mark);
    return () => io.disconnect();
  }, []);
  return (
    <footer className="fo-footer" data-spec="footer.root" aria-label={BRAND_LABEL}>
      <div className="fo-in" data-spec="footer.in">
        {/* ── the 4-column print grid (355 @1440): col1 357 · col2 715 · col3 357 ── */}
        <div className="fo-grid" data-spec="footer.grid">
          {/* col1 (RTL: the right column) — the contact block: brand
              lockup + the newsletter row (the reference's colA model).
              R368 T3: the ≥1300 seat un-mirrors this column to the
              reference's physical LEFT (footer.1440.json x7..364) —
              the `fo-col1` hook is the explicit grid-column seat. */}
          <div className="fo-col fo-col1" data-spec="footer.col1">
            <div className="fo-c1-top" data-spec="footer.c1top">
              <div className="fo-brand" data-spec="footer.brand">
                <div className="fo-brand-name" data-spec="footer.brandname">مدارك</div>
                {/* r177: the descriptor seat — className rides LAST so the
                    source pin reads the class verbatim (one seat) */}
                <div data-spec="footer.brandsub" className="fo-brand-sub">منصّة التعليم الذكي — عربية أولًا</div>
                {/* r188/r320 §D: the independence paragraph — VERBATIM the
                    About page's own sentence (one text node; «اصطناعية
                    بالكامل» stays contiguous on one source line — the
                    brand-integrity gate). R368 T3: the one prose block that
                    is contract — it stays while the rest diets to labels. */}
                <p className="fo-footer-about">منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «مؤسسة مدارك النموذجية» — مؤسسة اصطناعية بالكامل لأغراض العرض.</p>
              </div>
              {/* the hairline is the c1-top block's OWN last child (the
                  heron paint model — full-bleed past the cell padding) */}
              <R c="fo-rule fo-rule-h fo-rule-bleed fo-rule-solid" s="footer.c1rule" />
            </div>
            <div className="fo-c1-sub" data-spec="footer.c1sub">
              <ML s="footer.sublabel" ts="footer.sublabelt" t="[ EARLY ACCESS ]" />
              {/* the newsletter row (123 @1440): its own mono label + the
                  form wrapper — the census's div[2] > [label, div[1] > form] */}
              <div className="fo-form-zone" data-spec="footer.formzone">
                <div className="fo-form-label" data-spec="footer.formlabel">
                  <div className="fo-form-label-t" data-spec="footer.formlabelt">التسجيل المبكر</div>
                </div>
                <div className="fo-form-wrap" data-spec="footer.formwrap">
                  <form
                    className="fo-form"
                    data-spec="footer.form"
                    action="/contact"
                    method="get"
                    onSubmit={(e) => {
                      /* a REAL door: the early-access channel is the page's own
                      * /contact form — the footer's input carries the address
                      * over to it (no invented mailing list, no fake opt-in) */
                      e.preventDefault();
                      window.location.assign(
                        `/contact${email ? `?email=${encodeURIComponent(email)}` : ''}`,
                      );
                    }}
                  >
                    <div className="fo-form-copy" data-spec="footer.formcopy">
                      <div className="fo-form-line" data-spec="footer.formline.1">
                        أدخل بريدك الجامعي ليصل بك رابط التسجيل
                      </div>
                      <div className="fo-form-line" data-spec="footer.formline.2">
                        لا قائمة بريدية عامة في الإطلاق التجريبي
                      </div>
                    </div>
                    <div className="fo-form-row" data-spec="footer.formrow">
                      <input
                        className="fo-input"
                        data-spec="footer.input"
                        type="email"
                        name="email"
                        dir="ltr"
                        placeholder="you@university.edu"
                        aria-label="البريد الجامعي للتسجيل المبكر"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <button
                        className="fo-go"
                        data-spec="footer.go"
                        type="submit"
                        aria-label="الانتقال إلى التسجيل المبكر"
                      >
                        <div className="fo-go-ic" data-spec="footer.goic">
                          <div className="fo-go-ic-in" data-spec="footer.goicin">
                            <svg viewBox="0 0 17 17" aria-hidden="true" data-spec="footer.goicsvg">
                              <path d="M2 8.5h12M9.5 4l4.5 4.5L9.5 13" data-spec="footer.goicpath" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              {/* R343 — the form zone's four corner registration marks (the
                  census's own 8×8 ink crosshair seats at the zone's corners,
                  div[5..8] > div[1] > svg — the same registration grammar the
                  strip band carries; our OWN hairline glyph geometry, never
                  the reference's paths) */}
              {(['tl', 'tr', 'bl', 'br'] as const).map((pos, i) => (
                <div className={`fo-freg fo-freg-${pos}`} key={pos} data-spec={`footer.freg.${i + 1}`} aria-hidden="true">
                  <svg className="fo-freg-svg" viewBox="0 0 8 8" fill="none" data-spec={`footer.fregsvg.${i + 1}`}>
                    <path className="fo-freg-p" d="M4 0v8M0 4h8" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* col2 — the print ladder: three hairline-divided link columns
              (terse Arabic headers, aligned tops) + the bottom row. */}
          <div className="fo-col fo-col2" data-spec="footer.col2">
            <div data-spec="footer.c2wrap">
              <div className="fo-c2-top" data-spec="footer.c2top">
                {INDEX_TOP.map((g, gi) => (
                  <div className="fo-lgroup" key={g.label} data-spec={`footer.lgroup.${gi + 1}`}>
                    <ML s={`footer.lglabel.${gi + 1}`} ts={`footer.lglabelt.${gi + 1}`} t={g.label} />
                    <div className="fo-lg-links" data-spec={`footer.lglinks.${gi + 1}`}>
                      {g.links.map(([to, label], li) => (
                        <A
                          key={to}
                          to={to}
                          cls={gi || li ? 'fo-link' : 'fo-link fo-link-accent'}
                          t={label}
                          ds={`footer.ilink.${gi + 1}.${li + 1}`}
                          tds={`footer.ilinkt.${gi + 1}.${li + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <R c="fo-rule fo-rule-h" s="footer.c2rule" />
              </div>
            </div>
            <div className="fo-c2-bottom" data-spec="footer.c2bottom">
              {/* the census's inner wrapper (715×152) — the bottom groups'
                  own seat between the c2 hairline and the group grid */}
              <div className="fo-c2-binner" data-spec="footer.c2binner">
                <div className="fo-lgroup" data-spec="footer.bgroup.1">
                  <ML s="footer.bg1label" ts="footer.bg1labelt" t="CONTACT" />
                  {/* the funnel pair (register primary + login ghost) rides
                      the CONTACT group — the register form IS the honest
                      channel (the R331 5+6 source contract counts the to=
                      surfaces, not tuple tables; L1-e: cta.css owns the
                      phone-belt underline grammar) */}
                  <div className="fo-lg-links" data-spec="footer.acctzone">
                    <Link to="/auth/register" className="fo-link fo-link-account" data-spec="footer.acct.1">
                      <div className="fo-link-t" data-spec="footer.acctt.1">إنشاء حساب</div>
                    </Link>
                    <Link to="/auth" className="fo-link fo-link-account" data-spec="footer.acct.2">
                      <div className="fo-link-t" data-spec="footer.acctt.2">{LOGIN}</div>
                    </Link>
                  </div>
                </div>
                <div className="fo-lgroup" data-spec="footer.bgroup.2">
                  <ML s="footer.bg2label.1" ts="footer.bg2labelt.1" t="ADDRESS" />
                  <A to="/about" cls="fo-link" t="مؤسسة مدارك النموذجية" ds="footer.b2link.1" tds="footer.b2linkt.1" />
                  <R c="fo-rule fo-rule-h fo-rule-g" s="footer.b2rule" />
                  <ML s="footer.bg2label.2" ts="footer.bg2labelt.2" t="REGION" />
                  <A to="/about" cls="fo-link" t="طرابلس، ليبيا" ds="footer.b2link.2" tds="footer.b2linkt.2" />
                </div>
                <div className="fo-lgroup" data-spec="footer.bgroup.3">
                  <ML s="footer.bg3label" ts="footer.bg3labelt" t="CHANNELS" />
                  <div className="fo-socials" data-spec="footer.socials">
                    {CHANNEL_LINKS.map(([to, label], i) => (
                      <a
                        key={to}
                        href={to}
                        className="fo-social"
                        data-spec={`footer.social.${i + 1}`}
                      >
                        <div className="fo-social-t" data-spec={`footer.socialt.${i + 1}`}>{label}</div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* col3 (RTL: the left column) — the drawn construction mark:
              Madarek's OWN khatam geometry re-sourced from brand/mark
              (the two squares + the orange point as authored line-art),
              never Heron's paths */}
          <div className="fo-col fo-col3" data-spec="footer.col3">
            <R c="fo-rule fo-rule-v fo-rule-solid" s="footer.col3rule" />
            <div className="fo-mark" data-spec="footer.mark">
              <div className="fo-mark-in" data-spec="footer.markin">
                <svg
                  className="fo-mark-svg"
                  data-spec="footer.marksvg"
                  viewBox="0 0 215 215"
                  role="img"
                  aria-label="علامة مدارك — رسم بنائي للخاتم والنقطة"
                >
                  {MARK_PATHS.map((d, i) => (
                    <path
                      key={i}
                      className={i === 5 ? 'fo-mark-p fo-mark-p--point' : 'fo-mark-p'}
                      data-spec={`footer.markpath.${i + 1}`}
                      d={d}
                    />
                  ))}
                </svg>
              </div>
            </div>
            {/* the spec's 17px caption seat under the mark (the 0-height
                image stub rides inside its own wrapper) */}
            <div className="fo-mark-cap" data-spec="footer.markcap">
              {/* R343 C-2 — the 0-height caption stub keeps its recorded
                  seat; the strip's skyline render retired with the band's
                  wordmark rework (R368 T3) — the asset stays referenced
                  here (ASSET-CONTRACT §3.8) */}
              <img
                className="fo-mark-img"
                data-spec="footer.markimg"
                src="/media/illustrations/r342/footer/footer-skyline-light.webp"
                alt=""
                loading="lazy"
              />
            </div>
          </div>
          {/* the grid's OWN closing hairline (its 4th child, full-bleed,
              painted — the census records the seat's own ink) */}
          <R c="fo-rule fo-rule-h fo-rule-solid fo-grid-rule" s="footer.striprule" />
        </div>

        {/* ── R368 T3 — the CTA strip: the reference's distinct contact
            row above the wordmark (underlined email+phone grammar), our
            ONE honest door: the /contact page. The h3 + the biglink lift
            out of the col2 CONTACT group as a standalone row. ── */}
        <div className="fo-cta-strip" data-spec="footer.ctastrip">
          <h3 className="fo-contact-h" data-spec="footer.contacth">التواصل</h3>
          <Link to="/contact" className="fo-cta-link" data-spec="footer.biglink">
            <div className="fo-biglink-t" data-spec="footer.biglinkt">التواصل والتسجيل المبكر</div>
            <ArrowIcon spec="footer.ctaarrow" />
          </Link>
        </div>

        {/* ── the wordmark band (314 @1440): the reference's own tonal
            anchor — the giant outlined «مدارك» wordmark, full footer
            width, stroke-only ink on the paper ground (the census's
            1427×314 img + svg-twin seats). The r342 skyline photo strip
            is retired from this seat (no counterpart in the reference
            at this position; the asset files stay). ── */}
        <div className="fo-fstrip" data-spec="footer.strip">
          <div className="fo-strip-in" data-spec="footer.stripin">
            <div className="fo-strip-media" data-spec="footer.smedia">
              {/* the primary render: DOM text with -webkit-text-stroke
                  (transparent fill) — the ink var, opacity ~0.9 */}
              <div className="fo-wordmark" data-spec="footer.stripimg" aria-hidden="true">مدارك</div>
              {/* the census's svg twin seat — our own SVG-text wordmark
                  (stroke + transparent fill), the hidden tonal twin under
                  the DOM-text primary (the twin-swap grammar's hidden arm) */}
              <div className="fo-strip-twin" data-spec="footer.striptwin" aria-hidden="true">
                <svg
                  className="fo-strip-svg"
                  data-spec="footer.stripsvg"
                  viewBox="0 0 1427 314"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <text className="fo-strip-image" data-spec="footer.stripimage" x="713.5" y="221" textAnchor="middle">مدارك</text>
                </svg>
              </div>
            </div>
          </div>
          {/* the registration chrome: edge rules + 4 corner crosshairs.
              the fo-wordmark-reg family is painted as CSS ::before '+'
              glyphs (R321 §A6 — decorative marks never carry DOM text) */}
          <div className="fo-sc-zone" data-spec="footer.sczone">
            <div className="fo-strip-chrome" data-spec="footer.stripchrome">
              <R c="fo-sc-edge fo-sc-t" s="footer.sctop" />
              <R c="fo-sc-edge fo-sc-b" s="footer.scbot" />
              <R c="fo-sc-edge fo-sc-l" s="footer.scleft" />
              <R c="fo-sc-edge fo-sc-r" s="footer.scright" />
              {(['tl', 'tr', 'bl', 'br'] as const).map((pos, i) => (
                <div className={`fo-wordmark-reg fo-reg-${pos}`} key={pos} data-spec={`footer.reg.${i + 1}`} />
              ))}
            </div>
          </div>
        </div>

        {/* ── the © bar + the legal row (42 @1440) — R321 §A2: the nine
            public sheets' links ride the © bar's own row (ONE ruled
            line instead of two; the nav closes inside the bar's own
            closing tag) — R332: this sheet owns the row language.
            R342-07: the links gain data-spec seats (footer.llink.N) —
            the mapping binds them to the census's a[n] windows by key
            (the runtime pairing is ds-based; the nav + separator
            grammar is the r321/r332 test contract, unchanged). ── */}
        <div className="fo-footer-bottom" data-spec="footer.legal">
          <div className="fo-legal-l" data-spec="footer.legall">
            {/* T-06k — the spec's strip-media seat: heron nests a © line
                box (431×15 @1440, the stripmedia binding) between the
                legal-l box and the lc line box — the strip family lives IN
                the legal zone, not on the ink band */}
            <div className="fo-legal-strip" data-spec="footer.stripmedia">
            <div className="fo-legal-lc" data-spec="footer.legallc">
              {/* the © line: the pinned r193 span (western-digit year)
                  + DIRECT text so the census's tc=medium p[1] holds — the
                  link rides inline at its end */}
              <p className="fo-legal-p" data-spec="footer.legalp">
                <span className="fo-mono">© {year} مدارك</span>
                {' '}— منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل —{' '}
                <a className="fo-legal-a" data-spec="footer.legalcta" href="/about">
                  عن المنصّة
                </a>
              </p>
            </div>
            </div>
            <R c="fo-rule fo-rule-v fo-rule-solid" s="footer.legalrule" />
          </div>
          <nav className="fo-legal-row" aria-label="سياسات المنصّة وصفحاتها العامة" data-spec="footer.legalr">
            <Link to="/legal/privacy" className="fo-legal-link" data-spec="footer.llink.1">سياسة الخصوصية</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/terms" className="fo-legal-link" data-spec="footer.llink.2">شروط الاستخدام</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/cookies" className="fo-legal-link" data-spec="footer.llink.3">التخزين المحلي</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/accessibility" className="fo-legal-link" data-spec="footer.llink.4">إمكانية الوصول</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/security" className="fo-legal-link" data-spec="footer.llink.5">الأمن</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/data" className="fo-legal-link" data-spec="footer.llink.6">البيانات</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/about" className="fo-legal-link" data-spec="footer.llink.7">عن مدارك</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/help" className="fo-legal-link" data-spec="footer.llink.8">المساعدة</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/contact" className="fo-legal-link" data-spec="footer.llink.9">التواصل</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            {/* R327 D1 — the distribution sheet beside the legal row */}
            <Link to="/app" className="fo-legal-link" data-spec="footer.llink.10">تطبيق الجوال</Link>
          </nav>
          {/* the bar's OWN closing hairline — full-bleed at the row top
              (the census divider between the band and the legal row) */}
          <R c="fo-rule fo-rule-h fo-rule-solid fo-legalbot" s="footer.legalbot" />
        </div>
      </div>
    </footer>
  );
}
