/* P2-0 (r335 split) — [9] FOOTER — R314 V9: the reference's cell grid
 * (pair-100): strip-image cell · tagline cell · link columns ·
 * subscribe cell · address/contact cells · drawn-mark cell — every
 * cell hairline-ruled — closed by the GIANT outlined construction-line
 * wordmark (Madarek's own: مدارك + MADAREK) and the legal row. Honest
 * copy throughout (demo-data disclosure, no fake subscribe, no
 * invented contacts).
 *
 * Composition (R313 · D14): the inspection strip (the pointer lens
 * resolving the journey drawing) over a THREE-column grid —
 * (1) the identity + the subscribe seat, (2) the wide index +
 * the honest address, (3) the giant line-art mark fading in
 * with the scroll — closed by the legal row.
 *
 * The composer passes the render year (one clock for the whole
 * sheet — the vision strip's meta row reads the same value). */
import { Link } from 'react-router-dom';
import { Logo } from '../../../brand';
import { FooterLens } from '../footer/FooterLens';

export function Footer({ year }: { year: number }) {
  return (
    <footer className="fo-footer">
      {/* R314 (cycle-2 §7 heights): the colophon re-orders to the
          measured reference composition (711px = cell grid 355 +
          image strip 314 + legal row 42) — the grid FIRST, then the
          strip band (the inspection lens + the closing wordmark
          riding the same full-bleed band — the reference's own
          graphic|text strip split), then the legal row. */}
      <div className="fo-footer-inner">
        <div className="fo-fgrid">

          {/* [01] the strip-image cell — the ink-rendered architecture
              (own subject/licence; the reference's rendered stairs seat) */}
          <div className="fo-fcell fo-fcell-strip">
            <img
              className="fo-fstrip-img"
              src="/media/renders/crop-garyounis-classic-960.webp"
              alt="رسم حبري لعمارة حرم جامعي ليبي — مشتق من صورة مرخّصة"
              loading="lazy"
              width={960}
              height={960}
            />
            <span className="fo-fcell-tag fo-mono" dir="ltr">[01] CAMPUS · INK RENDER</span>
          </div>

          {/* [02] the tagline cell — the honest identity paragraph.
              R323 (A3 · defects 1+9): the identity mark draws the NEW
              <Logo> (the retired StarMark is gone) and the filler
              newsletter block («قريبًا — لا توجد قائمة بريدية») is
              removed entirely — the honest-copy rule: dropping the
              seat is the approved option, no fake opt-in remains. */}
          <div className="fo-fcell fo-fcell-tagline">
            <Link to="/" className="fo-brand" aria-label="مدارك — منصّة التعليم الذكي">
              <Logo variant="mark" size={26} className="fo-brand-mark" />
              <span className="fo-brand-stack">
                <span className="fo-brand-name">مدارك</span>
                <span className="fo-brand-sub">منصّة التعليم الذكي</span>
              </span>
            </Link>
            <p className="fo-footer-about">
              {/* r188 honesty pin: «اصطناعية بالكامل» must stay contiguous
                  on one source line (the r188-brand-integrity gate). */}
              منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسسة اصطناعية بالكامل لأغراض العرض.
            </p>
          </div>

          {/* [03–05] the three link columns (the reference's
              COMPANY/PRODUCT/RESOURCES seats, Madarek's own index) */}
          <nav className="fo-fcell fo-fcell-links" aria-label="فهرس المنصّة">
            <div className="fo-footer-heading">المنصّة</div>
            <Link to="/capabilities" className="fo-footer-link">ما يعمل اليوم</Link>
            <a href="#product" className="fo-footer-link">المنصّة فعليًا</a>
            <a href="#chapters" className="fo-footer-link">الفصول</a>
            <a href="#roles" className="fo-footer-link">الأدوار والشرائح</a>
            <Link to="/colleges" className="fo-footer-link">الكليات التجريبية</Link>
          </nav>
          <nav className="fo-fcell fo-fcell-links" aria-label="المحتوى والرحلة">
            <div className="fo-footer-heading">الرحلة</div>
            <a href="#statement" className="fo-footer-link">البيان</a>
            <a href="#live" className="fo-footer-link">التحديات</a>
            <Link to="/campus" className="fo-footer-link">الحياة الجامعية</Link>
            <a href="#vision" className="fo-footer-link">المبدأ والرؤية</a>
            <a href="#main" className="fo-footer-link">أعلى الصفحة</a>
          </nav>
          <nav className="fo-fcell fo-fcell-links" aria-label="الحساب">
            <div className="fo-footer-heading">الحساب</div>
            <Link to="/auth/register" className="fo-footer-link">إنشاء حساب جامعي</Link>
            <Link to="/auth" className="fo-footer-link">تسجيل الدخول</Link>
          </nav>

          {/* [06] the address cell — the reference's Sydney seat becomes
              the demo institution's own identity: an explicitly fictional
              place and the platform's real country (honest-copy rule:
              nothing invented, no real-institution affiliation). */}
          <div className="fo-fcell fo-fcell-addr">
            <div className="fo-footer-heading">العنوان</div>
            <p className="fo-footer-addr-line">جامعة مدارك التجريبية — مؤسسة عرض اصطناعية</p>
            <p className="fo-footer-addr-line">طرابلس، ليبيا</p>
          </div>

          {/* [07] the contact cell — honest and personal-data-free (owner
              order R315: the repo link and every owner-identity trace are
              retired from all surfaces). The page's own early-access
              form is the one real channel today — R320 §D promotes the
              prose to a link: the honest-channel copy moved onto
              /contact, the footer carries the door. */}
          <div className="fo-fcell fo-fcell-addr">
            <div className="fo-footer-heading">التواصل</div>
            <Link to="/contact" className="fo-footer-link">التواصل والتسجيل المبكر</Link>
            <p className="fo-footer-addr-line">لا بريد عام في مرحلة الإطلاق التجريبي.</p>
          </div>

          {/* R323 (A3 · defect 1): the [08] drawn-mark cell (the big
              circle-star construction drawing) is REMOVED — one mark
              per view; the sheet's mark lives in the header, the
              identity cell above and the wordmark below. */}
        </div>

        {/* the image-strip band (the reference's footer-img-wrap): the
            five-column inspection strip (FooterLens — R319 §D2) rides
            BELOW the grid, above the legal row (the measured order),
            and the GIANT wordmark — Madarek's own «مدارك», REAL
            letterforms shaped from the site's Alexandria 700 display
            font (R318 §A6 → R319 §D1: scripts/r318/wordmark-build.mjs
            → the committed wordmark-art.generated.ts) — spans the
            footer's FULL inner measure at EVERY viewport
            (width:100% + viewBox scaling): CONNECTED shaping (no
            construction track — the owner read the tracked word as
            letter-spaced disconnected letters), STROKE-ONLY ink
            (fill:none; stroke:currentColor; ~1.7px non-scaling),
            the svg's own aria-label + <title> carrying the reading.
            The strip hides ≤767px (the reference hides its strip
            there too); the wordmark flows as its own band on mobile
            in the SAME full-width cut. */}
        <div className="fo-fstrip">
          <FooterLens />
          <div className="fo-wordmark">
            <span className="fo-wordmark-reg fo-wordmark-reg-tl" aria-hidden="true" />
            <span className="fo-wordmark-reg fo-wordmark-reg-tr" aria-hidden="true" />
            <span className="fo-wordmark-reg fo-wordmark-reg-bl" aria-hidden="true" />
            <span className="fo-wordmark-reg fo-wordmark-reg-br" aria-hidden="true" />

            {/* ── R323 (A3 · defect 1): the ONE full-cell-width cut is
                the NEW brand system's outlined wordmark — <Logo
                variant="wordmark"> (the generated Plex 600 letterforms
                of «مدارك», stroke-only currentColor, the orange point
                rides the mark seats only). The full-cell-width
                behaviour is kept: the sheet spans the cell at every
                viewport (landing.css .fo-wordmark .mdrk-logo). The
                reading rides the svg's role="img" + aria-label +
                <title> «مدارك». */}
            <Logo variant="wordmark" size={100} className="fo-wordmark-logo" />

            <span className="fo-wordmark-en fo-mono" dir="ltr" aria-hidden="true">MADAREK — ARABIC-FIRST LEARNING PLATFORM</span>
          </div>
        </div>

        {/* R320 §D (c2-LEGAL · §A5) → R321 §A2: the nine public sheets'
            legal links ride the © bar's own row now (ONE ruled line
            instead of two — the footer grew +267px over the reference
            across R320's wordmark/strip/legal additions; the §A2
            ratchet brings docH back inside ±1.5% of Heron at every
            measured viewport). Every policy/public page stays
            reachable from the footer; the nav keeps its own label. */}
        <div className="fo-footer-bottom">
          <span className="fo-mono">© {year} مدارك</span>
          <nav className="fo-legal-row" aria-label="سياسات المنصّة وصفحاتها العامة">
            <Link to="/legal/privacy" className="fo-legal-link">سياسة الخصوصية</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/terms" className="fo-legal-link">شروط الاستخدام</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/cookies" className="fo-legal-link">التخزين المحلي</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/accessibility" className="fo-legal-link">إمكانية الوصول</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/security" className="fo-legal-link">الأمن</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/legal/data" className="fo-legal-link">البيانات</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/about" className="fo-legal-link">عن مدارك</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/help" className="fo-legal-link">المساعدة</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            <Link to="/contact" className="fo-legal-link">التواصل</Link>
            <span className="fo-legal-sep" aria-hidden="true">·</span>
            {/* R327 D1 — the distribution sheet beside the legal row */}
            <Link to="/app" className="fo-legal-link">تطبيق الجوال</Link>
          </nav>
          <span className="fo-footer-cluster">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</span>
        </div>
      </div>
    </footer>
  );
}
