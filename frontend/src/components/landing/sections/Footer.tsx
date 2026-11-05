/* R338 T-06 — the colophon, REBUILT from scratch against the frozen
 * Heron footer census (docs/redesign/r335/heron-spec/footer.{390,768,
 * 1024,1440,1920}.json). The R313–R332 cell-grid colophon (strip-image
 * cell · tagline cell · link columns · FooterLens five-column strip ·
 * giant wordmark · double legal row) is RETIRED with this rewrite —
 * the spec's own composition, mirrored for RTL:
 *
 *   footer.fo-footer > .fo-in > .fo-grid (355 = col1 357 · col2 715 ·
 *   col3 357, hairline-ruled) > .fo-strip (314: the full-bleed ink
 *   render + the grayscale svg twin + the registration-mark chrome)
 *   > .fo-legal (42: the © row + the ruled nav links).
 *
 * col1 = the brand lockup (26.67px name) + three rows of small links +
 *   the subscribe seat (a REAL door: the input + arrow button route to
 *   /contact — the one real early-access channel; no fake opt-in copy).
 * col2 = the 3+3 link index (mono 11.67px labels, first link orange).
 * col3 = the drawn construction mark — Madarek's OWN Logo geometry as
 *   authored inline line-art (NEVER Heron's paths). Arabic = transformed
 *   expectations: RTL mirror, letter-spacing 0, lh ≥ 1.35×fs.
 *
 * R338 T-99 bundle diet: the four repeated seat shapes (single-line
 * anchor · mono label · hairline rule · legal nav link) are shared
 * components and the link tables are tuples — the SAME DOM renders
 * from a fraction of the compiled JS (777.6 → ≤777 KB gz gate). */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { LOGIN } from '../copy';

/* the small-link rows under the brand lockup (the spec's 4+3+2 inline
 * rows, 27px lines) — our honest platform index: [to, label] */
const BRAND_ROWS: [string, string][][] = [
  [
    ['/capabilities', 'ما يعمل اليوم'],
    ['#product', 'المنصّة'],
    ['#chapters', 'الفصول'],
    ['#roles', 'الأدوار'],
  ],
  [
    ['/colleges', 'الكليات'],
    ['#statement', 'البيان'],
    ['#live', 'التحديات'],
  ],
  [
    ['#vision', 'الرؤية'],
    ['/campus', 'الحياة الجامعية'],
  ],
];

/* the col2 index: three groups of four (top row) — mono label + links,
 * the FIRST link of the first group carries the accent ink */
const INDEX_TOP: { label: string; links: [string, string][] }[] = [
  {
    label: 'PLATFORM',
    links: [
      ['/capabilities', 'ما يعمل اليوم'],
      ['#product', 'المنصّة فعليًا'],
      ['#chapters', 'الفصول'],
      ['#roles', 'الأدوار والشرائح'],
    ],
  },
  {
    label: 'JOURNEY',
    links: [
      ['#statement', 'البيان'],
      ['#live', 'التحديات'],
      ['/campus', 'الحياة الجامعية'],
      ['#vision', 'المبدأ والرؤية'],
    ],
  },
  {
    label: 'ACCOUNT',
    links: [
      ['/auth/register', 'إنشاء حساب'],
      ['/auth', LOGIN],
      ['/app', 'تطبيق الجوال'],
      ['/help', 'المساعدة'],
    ],
  },
];

/* the col2 bottom row: the big two-line door + the address pair + the
 * contact pair (the spec's heading + 2-line link · two ruled sub-groups
 * · four 2-line contact links in a 2×2): [to, top, sub] */
const CONTACT_LINKS: [string, string, string][] = [
  ['/contact', 'التسجيل المبكر', 'استمارة التواصل'],
  ['/about', 'عن مدارك', 'المنصّة والفريق'],
  ['/help', 'المساعدة', 'الأسئلة والدليل'],
  ['/legal/data', 'البيانات', 'سياسة البيانات'],
];

/* the col3 construction mark — Madarek's OWN Logo geometry, authored
 * inline line-art (never Heron's paths) */
const MARK_PATHS = [
  'M177.5 37.5A94 94 0 1 0 190.4 122', // the orbit circle (open at the reading apex)
  'M158.9 56.1A67 67 0 1 0 168.1 116', // the inner second orbit
  'M107.5 10v195', // the vertical construction axis
  'M10 107.5h195', // the horizontal construction axis
  'M39.6 39.6l135.8 135.8', // the diagonal construction track
  'M177.5 37.5l.01.01', // the knowledge point on the orbit
  'M55 182h105', // the base line
  'M22 62V22h40M153 22h40v40M193 153v40h-40M62 193H22v-40', // frame corner ticks
];

/* T-99 diet — the four repeated seat shapes as shared components (the
 * retired inline JSX rendered the identical DOM) */
const A = ({ to, cls, t }: { to: string; cls: string; t: string }) => (
  <a href={to} className={cls}>
    <div className={cls + '-t'}>{t}</div>
  </a>
);
const S = ({ to, t1, t2 }: { to: string; t1: string; t2: string }) => (
  <a href={to} className="fo-social" data-spec="footer.social">
    <div className="fo-social-t1">{t1}</div>
    <div className="fo-social-t2">{t2}</div>
  </a>
);
const ML = ({ s, t }: { s?: string; t: string }) => (
  <div className="fo-mono-label" data-spec={s}>
    <div className="fo-mono-label-t">{t}</div>
  </div>
);
const R = ({ c, s }: { c: string; s?: string }) => <div className={c} data-spec={s} />;
const N = ({ to, t1, t2 }: { to: string; t1: string; t2: string }) => (
  <Link to={to} className="fo-legal-nav">
    <div className="fo-rule fo-rule-v" />
    <div className="fo-legal-nav-t1">{t1}</div>
    <div className="fo-legal-nav-t2">{t2}</div>
  </Link>
);

export function Footer({ year }: { year: number }) {
  const [email, setEmail] = useState('');
  return (
    <footer className="fo-footer" data-spec="footer.root">
      <div className="fo-in" data-spec="footer.in">
        {/* ── the cell grid (355 @1440): col1 357 · col2 715 · col3 357 ── */}
        <div className="fo-grid" data-spec="footer.grid">
          {/* col1 (RTL: the right column) — brand + link rows + subscribe */}
          <div className="fo-col" data-spec="footer.col1">
            <div className="fo-c1-top" data-spec="footer.c1top">
              <div className="fo-brand" data-spec="footer.brand">
                <div className="fo-brand-name" data-spec="footer.brandname">مدارك</div>
                <div className="fo-brand-sub" data-spec="footer.brandsub">
                  منصّة التعليم الذكي — عربية أولًا
                </div>
              </div>
              {BRAND_ROWS.map((row, i) => (
                <div className="fo-brow" key={i} data-spec={`footer.brow.${i + 1}`}>
                  {row.map(([to, label]) => (
                    <A key={to} to={to} cls="fo-ilink" t={label} />
                  ))}
                </div>
              ))}
              {/* the hairline is the c1-top block's OWN last child (the
                  heron paint model — full-bleed past the cell padding) */}
              <R c="fo-rule fo-rule-h fo-rule-bleed" s="footer.c1rule" />
            </div>
            <div className="fo-c1-sub" data-spec="footer.c1sub">
              <ML s="footer.sublabel" t="[ EARLY ACCESS ]" />
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
                <div className="fo-form-copy">
                  <div className="fo-form-copy-t">
                    أدخل بريدك الجامعي ليصل بك رابط التسجيل المبكر عبر صفحة التواصل.
                    <br />
                    لا قائمة بريدية عامة في مرحلة الإطلاق التجريبي.
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
                    <div className="fo-go-ic">
                      <svg viewBox="0 0 17 17" role="img" aria-hidden="true">
                        <path d="M2 8.5h12M9.5 4l4.5 4.5L9.5 13" />
                      </svg>
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* col2 — the wide index: 3 groups up, 3 seats down, hairline-ruled.
              the heron model: col2 > [top wrapper (groups grid + its own
              hairline) · bottom grid] — the rule lives INSIDE the wrapper */}
          <div className="fo-col fo-col2" data-spec="footer.col2">
            <div>
              <div className="fo-c2-top" data-spec="footer.c2top">
                {INDEX_TOP.map((g, gi) => (
                  <div className="fo-lgroup" key={g.label} data-spec={`footer.lgroup.${gi + 1}`}>
                    <ML s={`footer.lglabel.${gi + 1}`} t={g.label} />
                    <div className="fo-lg-links" data-spec={`footer.lglinks.${gi + 1}`}>
                      {g.links.map(([to, label], li) => (
                        <A
                          key={to}
                          to={to}
                          cls={gi || li ? 'fo-link' : 'fo-link fo-link-accent'}
                          t={label}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <R c="fo-rule fo-rule-h" s="footer.c2rule" />
              </div>
            </div>
            <div className="fo-c2-bottom" data-spec="footer.c2bottom">
              <div className="fo-lgroup" data-spec="footer.bgroup.1">
                <ML s="footer.bg1label" t="CONTACT" />
                <a href="/contact" className="fo-biglink" data-spec="footer.biglink">
                  <div className="fo-biglink-t">
                    التواصل والتسجيل المبكر
                    <br />
                    صفحة واحدة — بلا بريد عام
                  </div>
                </a>
              </div>
              <div className="fo-lgroup" data-spec="footer.bgroup.2">
                <ML s="footer.bg2label.1" t="ADDRESS" />
                <A to="/about" cls="fo-link" t="جامعة مدارك التجريبية" />
                <R c="fo-rule fo-rule-h fo-rule-g" />
                <ML s="footer.bg2label.2" t="REGION" />
                <A to="/about" cls="fo-link" t="طرابلس، ليبيا" />
              </div>
              <div className="fo-lgroup">
                <ML s="footer.bg3label" t="CHANNELS" />
                <div className="fo-socials" data-spec="footer.socials">
                  {CONTACT_LINKS.map(([to, top, sub]) => (
                    <S key={to} to={to} t1={top} t2={sub} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* col3 (RTL: the left column) — the drawn construction mark:
              Madarek's OWN mark geometry, authored inline line-art (the
              circle + orbit + point construction), never Heron's paths */}
          <div className="fo-col fo-col3" data-spec="footer.col3">
            <R c="fo-rule fo-rule-v" s="footer.col3rule" />
            <div className="fo-mark" data-spec="footer.mark">
              <svg
                className="fo-mark-svg"
                data-spec="footer.marksvg"
                viewBox="0 0 215 215"
                role="img"
                aria-label="علامة مدارك — رسم بنائي لخط المدار والنقطة"
              >
                {MARK_PATHS.map((d, i) => (
                  <path key={i} className="fo-mark-p" data-spec={`footer.markpath.${i + 1}`} d={d} />
                ))}
              </svg>
            </div>
            {/* the spec's 0-height image seat (a 215×0 lazy stub) */}
            <img
              className="fo-mark-img"
              data-spec="footer.markimg"
              src="/media/renders/hero-ink-1100.webp"
              alt=""
              loading="lazy"
              width={215}
              height={0}
            />
          </div>
          {/* the grid's OWN closing hairline (its 4th child, full-bleed) */}
          <R c="fo-rule fo-rule-h fo-grid-rule" s="footer.striprule" />
        </div>

        {/* ── the strip band (314 @1440): OUR OWN licensed ink render,
            full-bleed, with its grayscale svg twin + registration chrome.
            The retired FooterLens pointer instrument is gone — the spec's
            strip is the image + the feComponentTransfer twin + the four
            corner crosshairs and edge rules. ── */}
        <div className="fo-strip" data-spec="footer.strip">
          <div className="fo-strip-in" data-spec="footer.stripin">
            <div className="fo-strip-media" data-spec="footer.stripmedia">
              <img
                className="fo-strip-img"
                data-spec="footer.stripimg"
                src="/media/renders/hero-ink-1100.webp"
                alt="رسم حبري لعمارة حرم جامعي ليبي — مشتق من صورة مرخّصة"
                loading="lazy"
              />
              <div className="fo-strip-twin" data-spec="footer.striptwin">
                <svg
                  className="fo-strip-svg"
                  data-spec="footer.stripsvg"
                  viewBox="0 0 1427 314"
                  preserveAspectRatio="xMidYMid slice"
                  aria-hidden="true"
                >
                  <defs>
                    <filter id="fo-gray" filterUnits="userSpaceOnUse">
                      <feComponentTransfer>
                        <feFuncR type="linear" slope="0.33" />
                        <feFuncG type="linear" slope="0.33" />
                        <feFuncB type="linear" slope="0.33" />
                      </feComponentTransfer>
                    </filter>
                  </defs>
                  <image
                    className="fo-strip-image"
                    data-spec="footer.stripimage"
                    href="/media/renders/hero-ink-1100.webp"
                    x="0"
                    y="0"
                    width="1427"
                    height="314"
                    filter="url(#fo-gray)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                </svg>
              </div>
            </div>
            {/* the registration chrome: edge rules + 4 corner crosshairs.
                the fo-wordmark-reg family is painted as CSS ::before '+'
                glyphs (R321 §A6 — decorative marks never carry DOM text) */}
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

        {/* ── the legal row (42 @1440): © + the ruled nav links ── */}
        <div className="fo-legal" data-spec="footer.legal">
          <div className="fo-legal-l" data-spec="footer.legall">
            <div className="fo-legal-lc" data-spec="footer.legallc">
              <div>
                <p className="fo-legal-p" data-spec="footer.legalp">
                  © {year} مدارك — منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل —{' '}
                  <a className="fo-legal-a" data-spec="footer.legalcta" href="/about">
                    عن المنصّة
                  </a>
                </p>
              </div>
            </div>
            <R c="fo-rule fo-rule-v" s="footer.legalrule" />
          </div>
          <div className="fo-legal-r" data-spec="footer.legalr">
            {[
              ['/legal/privacy', 'الخصوصية', 'سياسة الخصوصية'],
              ['/legal/terms', 'الشروط', 'شروط الاستخدام'],
              ['/help', 'المساعدة', 'الدليل والأسئلة'],
            ].map(([to, t1, t2]) => (
              <N key={to} to={to} t1={t1} t2={t2} />
            ))}
          </div>
          {/* the legal row's OWN closing hairline (its 3rd child) */}
          <R c="fo-rule fo-rule-h" s="footer.legalbot" />
        </div>
      </div>
    </footer>
  );
}
