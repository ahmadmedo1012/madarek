/* R338 T-06 → R342-07 — the colophon, extended against the frozen Heron
 * footer census (docs/redesign/r335/heron-spec/footer.{390,768,1024,
 * 1440,1920}.json). The R338 rebuild established the 355/715/357 grid +
 * ink strip + 42px legal row; R342-07 widens the spec-mirror so the
 * link/label families carry honest counterparts at the census's recorded
 * windows (the depth-6 truncation law — the same walk
 * scripts/walk-footer-dom.mjs applies):
 *
 *   footer.fo-footer > .fo-in > .fo-grid (355 = col1 357 · col2 715 ·
 *   col3 357, hairline-ruled) > .fo-fstrip (the ink render + grayscale
 *   twin + registration chrome) > .fo-footer-bottom (42: © + legal row).
 *
 * col1 = the brand lockup (26.67px name + sub + the independence
 *   paragraph inside the 80px brand block) + three rows of small links +
 *   the subscribe seat (a REAL door: the input + arrow button route to
 *   /contact — the one real early-access channel; no fake opt-in copy).
 * col2 = the 3+3 link index (mono 11.67px labels, first link orange,
 *   fit-content seats) + CONTACT/ADDRESS/REGION/CHANNELS groups.
 * col3 = the drawn construction mark — Madarek's OWN Logo geometry as
 *   authored inline line-art (NEVER Heron's paths).
 *
 * R342-07 seat map (new ds keys ride the same grammar):
 *   · every col2 link seat is a fit-content <a> with its label div —
 *     the census's a[n] + a[n]>div[1] windows.
 *   · the legal row is a div[role=navigation] of NINE consecutive <a>
 *     (the r321 contract) — separators are CSS ::after glyphs (the §A6
 *     law), each link carries the 1×42 accent bar + label wrappers.
 *   · the strip chrome moves OUT of .fo-strip-in to the band's own
 *     second seat (the census's 1407×294 zone + inner wrapper).
 * Arabic = transformed expectations: RTL mirror, letter-spacing 0,
 * lh ≥ 1.35×fs. */
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BRAND_LABEL, LOGIN } from '../copy';

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
    /* the funnel pair (register primary + login ghost) renders as
     * literal <Link to=…> seats inside the group below — the R331
     * 5+6 source contract counts the to= surfaces, not tuple tables */
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

/* the col3 construction mark — Madarek's OWN Logo geometry, authored
 * inline line-art (never Heron's paths) */
const MARK_PATHS = [
  'M178 38A94 94 0 1 0 190 122', // the orbit circle (open at the reading apex)
  'M159 56A67 67 0 1 0 168 116', // the inner second orbit
  'M108 10v195', // the vertical construction axis
  'M10 108h195', // the horizontal construction axis
  'M40 40l136 136', // the diagonal construction track
  'M178 38h.01', // the knowledge point on the orbit
  'M55 182h105', // the base line
  'M22 62V22h40M153 22h40v40M193 153v40h-40M62 193H22v-40', // frame corner ticks
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
        {/* ── the cell grid (355 @1440): col1 357 · col2 715 · col3 357 ── */}
        <div className="fo-grid" data-spec="footer.grid">
          {/* col1 (RTL: the right column) — brand + link rows + subscribe */}
          <div className="fo-col" data-spec="footer.col1">
            <div className="fo-c1-top" data-spec="footer.c1top">
              <div className="fo-brand" data-spec="footer.brand">
                <div className="fo-brand-name" data-spec="footer.brandname">مدارك</div>
                {/* r177: the descriptor seat — className rides LAST so the
                    source pin reads the class verbatim (one seat) */}
                <div data-spec="footer.brandsub" className="fo-brand-sub">منصّة التعليم الذكي — عربية أولًا</div>
                {/* r188/r320 §D: the independence paragraph — VERBATIM the
                    About page's own sentence (one text node; «اصطناعية
                    بالكامل» stays contiguous on one source line — the
                    brand-integrity gate). R342-07: it rides INSIDE the brand
                    block as the census's third 27px row family. */}
                <p className="fo-footer-about">منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسسة اصطناعية بالكامل لأغراض العرض.</p>
              </div>
              {BRAND_ROWS.map((row, i) => (
                <div className="fo-brow" key={i} data-spec={`footer.brow.${i + 1}`}>
                  {row.map(([to, label], j) => (
                    <A
                      key={to}
                      to={to}
                      cls="fo-ilink"
                      t={label}
                      ds={`footer.br.${i + 1}.${j + 1}`}
                      tds={`footer.brt.${i + 1}.${j + 1}`}
                    />
                  ))}
                </div>
              ))}
              {/* the hairline is the c1-top block's OWN last child (the
                  heron paint model — full-bleed past the cell padding) */}
              <R c="fo-rule fo-rule-h fo-rule-bleed fo-rule-solid" s="footer.c1rule" />
            </div>
            <div className="fo-c1-sub" data-spec="footer.c1sub">
              <ML s="footer.sublabel" ts="footer.sublabelt" t="[ EARLY ACCESS ]" />
              {/* the subscribe zone (123 @1440): its own mono label + the
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
                        أدخل بريدك الجامعي ليصل بك رابط التسجيل المبكر
                      </div>
                      <div className="fo-form-line" data-spec="footer.formline.2">
                        عبر صفحة التواصل — لا قائمة بريدية عامة في الإطلاق التجريبي
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

          {/* col2 — the wide index: 3 groups up, 3 seats down, hairline-ruled.
              the heron model: col2 > [top wrapper (groups grid + its own
              hairline) · bottom grid] — the rule lives INSIDE the wrapper */}
          <div className="fo-col fo-col2" data-spec="footer.col2">
            <div data-spec="footer.c2wrap">
              <div className="fo-c2-top" data-spec="footer.c2top">
                {INDEX_TOP.map((g, gi) => (
                  <div className="fo-lgroup" key={g.label} data-spec={`footer.lgroup.${gi + 1}`}>
                    <ML s={`footer.lglabel.${gi + 1}`} ts={`footer.lglabelt.${gi + 1}`} t={g.label} />
                    <div className="fo-lg-links" data-spec={`footer.lglinks.${gi + 1}`}>
                      {gi === 2 && (
                        <>
                          {/* L2-e (R341): fo-link-account — the funnel pair's
                              affordance + hit-slop seat (cta.css owns the
                              phone-belt underline grammar; the class adds no
                              box of its own). */}
                          <Link to="/auth/register" className="fo-link fo-link-account" data-spec="footer.acct.1">
                            <div className="fo-link-t" data-spec="footer.acctt.1">إنشاء حساب</div>
                          </Link>
                          <Link to="/auth" className="fo-link fo-link-account" data-spec="footer.acct.2">
                            <div className="fo-link-t" data-spec="footer.acctt.2">{LOGIN}</div>
                          </Link>
                        </>
                      )}
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
                  {/* r320 §D: the contact cell — the /contact door under its
                      own التواصل heading (the honest prose moved onto the
                      page; the footer carries the door) */}
                  <h3 className="fo-contact-h" data-spec="footer.contacth">التواصل</h3>
                  <Link to="/contact" className="fo-biglink" data-spec="footer.biglink">
                    <div className="fo-biglink-t" data-spec="footer.biglinkt">
                      التواصل والتسجيل المبكر
                      <br />
                      صفحة واحدة — بلا بريد عام
                    </div>
                  </Link>
                </div>
                <div className="fo-lgroup" data-spec="footer.bgroup.2">
                  <ML s="footer.bg2label.1" ts="footer.bg2labelt.1" t="ADDRESS" />
                  <A to="/about" cls="fo-link" t="جامعة مدارك التجريبية" ds="footer.b2link.1" tds="footer.b2linkt.1" />
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
              Madarek's OWN mark geometry, authored inline line-art (the
              circle + orbit + point construction), never Heron's paths */}
          <div className="fo-col fo-col3" data-spec="footer.col3">
            <R c="fo-rule fo-rule-v fo-rule-solid" s="footer.col3rule" />
            <div className="fo-mark" data-spec="footer.mark">
              <div className="fo-mark-in" data-spec="footer.markin">
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
            </div>
            {/* the spec's 17px caption seat under the mark (the 0-height
                image stub rides inside its own wrapper) */}
            <div className="fo-mark-cap" data-spec="footer.markcap">
              <img
                className="fo-mark-img"
                data-spec="footer.markimg"
                src="/media/renders/hero-ink-1100.webp"
                alt=""
                loading="lazy"
              />
            </div>
          </div>
          {/* the grid's OWN closing hairline (its 4th child, full-bleed,
              painted — the census records the seat's own ink) */}
          <R c="fo-rule fo-rule-h fo-rule-solid fo-grid-rule" s="footer.striprule" />
        </div>

        {/* ── the strip band (314 @1440): OUR OWN licensed ink render,
            full-bleed, with its grayscale svg twin + registration chrome.
            R342-07: the chrome zone moves to the band's own second seat
            (outside .fo-strip-in — the census's 1407×294 zone + inner
            wrapper), so the edge rules + registration marks bind at the
            recorded windows. ── */}
        <div className="fo-fstrip" data-spec="footer.strip">
          <div className="fo-strip-in" data-spec="footer.stripin">
            <div className="fo-strip-media" data-spec="footer.smedia">
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
                    width="1427"
                    height="314"
                    filter="url(#fo-gray)"
                  />
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
