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
 * the subscribe seat (a REAL door: the input + arrow button route to
 * /contact — the one real early-access channel; no fake opt-in copy).
 * col2 = the 3+3 link index (mono 11.67px labels, first link orange).
 * col3 = the drawn construction mark — Madarek's OWN Logo geometry as
 * authored inline line-art (NEVER Heron's paths). Arabic = transformed
 * expectations: RTL mirror, letter-spacing 0, lh ≥ 1.35×fs. */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { LOGIN } from '../copy';

/* the small-link rows under the brand lockup (the spec's 4+3+2 inline
 * rows, 27px lines) — our honest platform index */
const BRAND_ROWS: { to: string; label: string }[][] = [
  [
    { to: '/capabilities', label: 'ما يعمل اليوم' },
    { to: '#product', label: 'المنصّة' },
    { to: '#chapters', label: 'الفصول' },
    { to: '#roles', label: 'الأدوار' },
  ],
  [
    { to: '/colleges', label: 'الكليات' },
    { to: '#statement', label: 'البيان' },
    { to: '#live', label: 'التحديات' },
  ],
  [
    { to: '#vision', label: 'الرؤية' },
    { to: '/campus', label: 'الحياة الجامعية' },
  ],
];

/* the col2 index: three groups of four (top row) — mono label + links,
 * the FIRST link of the first group carries the accent ink */
const INDEX_TOP: { label: string; links: { to: string; label: string }[] }[] = [
  {
    label: 'PLATFORM',
    links: [
      { to: '/capabilities', label: 'ما يعمل اليوم' },
      { to: '#product', label: 'المنصّة فعليًا' },
      { to: '#chapters', label: 'الفصول' },
      { to: '#roles', label: 'الأدوار والشرائح' },
    ],
  },
  {
    label: 'JOURNEY',
    links: [
      { to: '#statement', label: 'البيان' },
      { to: '#live', label: 'التحديات' },
      { to: '/campus', label: 'الحياة الجامعية' },
      { to: '#vision', label: 'المبدأ والرؤية' },
    ],
  },
  {
    label: 'ACCOUNT',
    links: [
      { to: '/auth/register', label: 'إنشاء حساب' },
      { to: '/auth', label: LOGIN },
      { to: '/app', label: 'تطبيق الجوال' },
      { to: '/help', label: 'المساعدة' },
    ],
  },
];

/* the col2 bottom row: the big two-line door + the address pair + the
 * contact pair (the spec's heading + 2-line link · two ruled sub-groups
 * · four 2-line contact links in a 2×2) */
const CONTACT_LINKS: { to: string; top: string; sub: string }[] = [
  { to: '/contact', top: 'التسجيل المبكر', sub: 'استمارة التواصل' },
  { to: '/about', top: 'عن مدارك', sub: 'المنصّة والفريق' },
  { to: '/help', top: 'المساعدة', sub: 'الأسئلة والدليل' },
  { to: '/legal/data', top: 'البيانات', sub: 'سياسة البيانات' },
];

export function Footer({ year }: { year: number }) {
  const [email, setEmail] = useState('');
  return (
    <footer className="fo-footer" data-spec="footer.root">
      <div className="fo-in" data-spec="footer.in">
        {/* ── the cell grid (355 @1440): col1 357 · col2 715 · col3 357 ── */}
        <div className="fo-grid" data-spec="footer.grid">
          {/* col1 (RTL: the right column) — brand + link rows + subscribe */}
          <div className="fo-col fo-col1" data-spec="footer.col1">
            <div className="fo-c1-top" data-spec="footer.c1top">
              <div className="fo-brand" data-spec="footer.brand">
                <div className="fo-brand-name" data-spec="footer.brandname">مدارك</div>
                <div className="fo-brand-sub" data-spec="footer.brandsub">
                  منصّة التعليم الذكي — عربية أولًا
                </div>
              </div>
              {BRAND_ROWS.map((row, i) => (
                <div className="fo-brow" key={i} data-spec={`footer.brow.${i + 1}`}>
                  {row.map((l) => (
                    <a key={l.to} href={l.to} className="fo-ilink">
                      <div className="fo-ilink-t">{l.label}</div>
                    </a>
                  ))}
                </div>
              ))}
            </div>
            <div className="fo-rule fo-rule-h" data-spec="footer.c1rule" />
            <div className="fo-c1-sub" data-spec="footer.c1sub">
              <div className="fo-mono-label" data-spec="footer.sublabel">
                <div className="fo-mono-label-t">[ EARLY ACCESS ]</div>
              </div>
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

          {/* col2 — the wide index: 3 groups up, 3 seats down, hairline-ruled */}
          <div className="fo-col fo-col2" data-spec="footer.col2">
            <div className="fo-c2-top" data-spec="footer.c2top">
              {INDEX_TOP.map((g, gi) => (
                <div className="fo-lgroup" key={g.label} data-spec={`footer.lgroup.${gi + 1}`}>
                  <div className="fo-mono-label" data-spec={`footer.lglabel.${gi + 1}`}>
                    <div className="fo-mono-label-t">{g.label}</div>
                  </div>
                  <div className="fo-lg-links" data-spec={`footer.lglinks.${gi + 1}`}>
                    {g.links.map((l, li) => (
                      <a key={l.to + l.label} href={l.to} className={`fo-link${gi === 0 && li === 0 ? ' fo-link-accent' : ''}`}>
                        <div className="fo-link-t">{l.label}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="fo-rule fo-rule-h" data-spec="footer.c2rule" />
            <div className="fo-c2-bottom" data-spec="footer.c2bottom">
              <div className="fo-lgroup" data-spec="footer.bgroup.1">
                <div className="fo-mono-label" data-spec="footer.bg1label">
                  <div className="fo-mono-label-t">CONTACT</div>
                </div>
                <a href="/contact" className="fo-biglink" data-spec="footer.biglink">
                  <div className="fo-biglink-t">
                    التواصل والتسجيل المبكر
                    <br />
                    صفحة واحدة — بلا بريد عام
                  </div>
                </a>
              </div>
              <div className="fo-lgroup" data-spec="footer.bgroup.2">
                <div className="fo-mono-label" data-spec="footer.bg2label.1">
                  <div className="fo-mono-label-t">ADDRESS</div>
                </div>
                <a href="/about" className="fo-link">
                  <div className="fo-link-t">جامعة مدارك التجريبية</div>
                </a>
                <div className="fo-rule fo-rule-h fo-rule-g" />
                <div className="fo-mono-label" data-spec="footer.bg2label.2">
                  <div className="fo-mono-label-t">REGION</div>
                </div>
                <a href="/about" className="fo-link">
                  <div className="fo-link-t">طرابلس، ليبيا</div>
                </a>
              </div>
              <div className="fo-lgroup" data-spec="footer.bgroup.3">
                <div className="fo-mono-label" data-spec="footer.bg3label">
                  <div className="fo-mono-label-t">CHANNELS</div>
                </div>
                <div className="fo-socials" data-spec="footer.socials">
                  {CONTACT_LINKS.map((c) => (
                    <a key={c.to + c.top} href={c.to} className="fo-social" data-spec="footer.social">
                      <div className="fo-social-t1">{c.top}</div>
                      <div className="fo-social-t2">{c.sub}</div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* col3 (RTL: the left column) — the drawn construction mark:
              Madarek's OWN mark geometry, authored inline line-art (the
              circle + orbit + point construction), never Heron's paths */}
          <div className="fo-col fo-col3" data-spec="footer.col3">
            <div className="fo-rule fo-rule-v" data-spec="footer.col3rule" />
            <div className="fo-mark" data-spec="footer.mark">
              <svg
                className="fo-mark-svg"
                data-spec="footer.marksvg"
                viewBox="0 0 215 215"
                role="img"
                aria-label="علامة مدارك — رسم بنائي لخط المدار والنقطة"
              >
                {/* the orbit circle (open at the reading apex) */}
                <path className="fo-mark-p" data-spec="footer.markpath.1" d="M177.5 37.5A94 94 0 1 0 190.4 122" />
                {/* the inner second orbit */}
                <path className="fo-mark-p" data-spec="footer.markpath.2" d="M158.9 56.1A67 67 0 1 0 168.1 116" />
                {/* the vertical construction axis */}
                <path className="fo-mark-p" data-spec="footer.markpath.3" d="M107.5 10v195" />
                {/* the horizontal construction axis */}
                <path className="fo-mark-p" data-spec="footer.markpath.4" d="M10 107.5h195" />
                {/* the diagonal construction track */}
                <path className="fo-mark-p" data-spec="footer.markpath.5" d="M39.6 39.6l135.8 135.8" />
                {/* the knowledge point on the orbit */}
                <path className="fo-mark-p" data-spec="footer.markpath.6" d="M177.5 37.5l.01.01" />
                {/* the base line */}
                <path className="fo-mark-p" data-spec="footer.markpath.7" d="M55 182h105" />
                {/* the enclosing frame corner ticks */}
                <path className="fo-mark-p" data-spec="footer.markpath.8" d="M22 62V22h40M153 22h40v40M193 153v40h-40M62 193H22v-40" />
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
        </div>

        {/* ── the strip band (314 @1440): OUR OWN licensed ink render,
            full-bleed, with its grayscale svg twin + registration chrome.
            The retired FooterLens pointer instrument is gone — the spec's
            strip is the image + the feComponentTransfer twin + the four
            corner crosshairs and edge rules. ── */}
        <div className="fo-rule fo-rule-h fo-rule-full" data-spec="footer.striprule" />
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
            {/* the registration chrome: edge rules + 4 corner crosshairs */}
            <div className="fo-strip-chrome" data-spec="footer.stripchrome">
              <div className="fo-sc-edge fo-sc-t" data-spec="footer.sctop" />
              <div className="fo-sc-edge fo-sc-b" data-spec="footer.scbot" />
              <div className="fo-sc-edge fo-sc-l" data-spec="footer.scleft" />
              <div className="fo-sc-edge fo-sc-r" data-spec="footer.scright" />
              {[0, 1, 2, 3].map((i) => (
                <div className="fo-reg" key={i} data-spec={`footer.reg.${i + 1}`}>
                  <div className="fo-reg-in">
                    <svg viewBox="0 0 10 10" aria-hidden="true">
                      <path className="fo-reg-p" d="M5 0v10" />
                      <path className="fo-reg-p" d="M0 5h10" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── the legal row (42 @1440): © + the ruled nav links ── */}
        <div className="fo-legal" data-spec="footer.legal">
          <div className="fo-legal-l" data-spec="footer.legall">
            <div className="fo-legal-lc" data-spec="footer.legallc">
              <div className="fo-legal-lc-in">
                <p className="fo-legal-p" data-spec="footer.legalp">
                  © {year} مدارك — منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل —{' '}
                  <a className="fo-legal-a" data-spec="footer.legalcta" href="/about">
                    عن المنصّة
                  </a>
                </p>
              </div>
            </div>
            <div className="fo-rule fo-rule-v fo-rule-fullh" data-spec="footer.legalrule" />
          </div>
          <div className="fo-legal-r" data-spec="footer.legalr">
            {[
              { to: '/legal/privacy', t1: 'الخصوصية', t2: 'سياسة الخصوصية' },
              { to: '/legal/terms', t1: 'الشروط', t2: 'شروط الاستخدام' },
              { to: '/help', t1: 'المساعدة', t2: 'الدليل والأسئلة' },
            ].map((n) => (
              <Link key={n.to} to={n.to} className="fo-legal-nav">
                <div className="fo-rule fo-rule-v fo-rule-fullh" />
                <div className="fo-legal-nav-t1">{n.t1}</div>
                <div className="fo-legal-nav-t2">{n.t2}</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
