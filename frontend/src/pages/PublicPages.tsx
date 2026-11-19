/**
 * PublicPages — R320 §D (c2-LEGAL) · the three public sheets.
 *
 * /about [C-04] · /help [C-05] · /contact [C-03]
 *
 * Same laws as the policy sheets (PAGES-GAP §6): every sentence from
 * real code/surfaces — the about page carries the landing's own
 * identity paragraph VERBATIM (nothing added: who-builds-it is a row
 * in LEGAL-TODO), the help page's nine answers each cite a real
 * surface, and the contact page invents NO channel — the early-access
 * register form IS the channel today, stated plainly.
 *
 * R366 L4 copy diet: the help answers are 1-2 lines each (same facts,
 * same cited surfaces), and the about/help chrome rides the shared
 * copy consts from LegalSheet (skip link, back link, brand word,
 * colophon) — one home per repeated string.
 */
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Logo } from '../brand';
import { GuestSheetChrome } from '../components/layout/GuestSheetChrome';
import {
  BACK_HOME,
  BRAND_WORD,
  COLOPHON_LINE,
  CONTACT_CHANNEL,
  LegalCell,
  LegalSectionBar,
  LegalSheet,
  PendingTag,
  SKIP_LINK,
  UPDATED_LABEL,
  useLegalMeta,
} from './legal/LegalSheet';
import { LEGAL_UPDATED } from './legal/LegalPages';
/* R341 D2 — the about sheet's own rules (ab-*): /about left the lg-*
 * legal-sheet family and rides the pattern library (pf-*) + this
 * about-scoped sheet. R341 D3 — /help likewise (hp-* in help.css);
 * /contact keeps LegalSheet below. */
import '../styles/about.css';
import '../styles/help.css';

/* R366 L4: one home per repeated string — the page titles (meta + h1),
 * the capabilities CTA (about + help + faq8) and the contact channel
 * (help CTA + faq3 twice). */
const ABOUT_TITLE = 'عن مدارك';
const HELP_TITLE = 'المساعدة والأسئلة الشائعة';
const CONTACT_TITLE = 'التواصل والتسجيل المبكر';
const CAPABILITIES_CTA = 'سجلّ القدرات';

/* ═══ [C-04] عن مدارك ═══════════════════════════════════════════════ */

export function AboutPage() {
  useLegalMeta({
    title: ABOUT_TITLE,
    path: '/about',
    description: 'منصّة تعليمية عربية مستقلّة.',
  });

  /* R341 D2 — rebuilt on the pattern library (the r340 T-D1a recipe):
   * the pf-page/pf-page-header frame + the about sheet's own ab-*
   * grammar (about.css). Same chrome laws as the guest sheets: the
   * skip link first, GuestSheetChrome's frame + grain, the sticky
   * guest header, ONE h1, and the honest colophon — every claim
   * below is the lg sheet's statement, dieted (r353). */
  return (
    <div className="ab">
      <a href="#main" className="skip-link">{SKIP_LINK}</a>
      <GuestSheetChrome />

      <header className="ab-header">
        <div className="ab-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            {BACK_HOME}
          </Link>
          <Link to="/" className="ab-header-brand" aria-label="مدارك — الرئيسية">
            <Logo variant="mark" size={22} />
            {BRAND_WORD}
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="ab-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">بيان المنصّة</p>
              <h1 className="pf-page-title">{ABOUT_TITLE}</h1>
            </div>
            <div className="pf-page-actions">
              <Link to="/capabilities" className="ab-cta-primary">{CAPABILITIES_CTA}</Link>
            </div>
          </div>

          <section aria-labelledby="about-statement">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-statement">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[01]</span>
                <span className="ab-bar-title">البيان</span>
              </h2>
            </div>
            <div className="ab-cell">
              {/* The landing's identity paragraph, dieted (r353) to its
                  three claims — independent, Arabic-first, artificial
                  demo data. The full no-affiliation clause stays
                  verbatim on the landing footer + /legal/terms.
                  LEGAL-TODO row 14: nothing may be added about who
                  builds مدارك until the owner states it. */}
              <p className="ab-p ab-p-statement">
                منصّة تعليمية مستقلّة عربية أولًا — بيانات العرض اصطناعية بالكامل.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-works">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-works">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[02]</span>
                <span className="ab-bar-title">ما يعمل اليوم</span>
              </h2>
            </div>
            <div className="ab-cell">
              <p className="ab-p">
                المحاضرات والاختبارات ومصفوفة الإتقان والبحوث والرسائل
                والجدول — التفصيل في
                <Link to="/capabilities" className="ab-link">السجلّ</Link>.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-builders">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-builders">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[03]</span>
                <span className="ab-bar-title">من يبنيها</span>
              </h2>
            </div>
            <div className="ab-cell">
              <p className="ab-p">
                لم يُعلن المالك بعد —
                <span className="ab-pending">[يُستكمل قبل الإطلاق]</span>.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-data">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-data">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[04]</span>
                <span className="ab-bar-title">البيانات والسياسات</span>
              </h2>
            </div>
            <div className="ab-cell">
              <p className="ab-p">
                بيانات العرض مقابل بياناتك في
                {' '}<Link to="/legal/data" className="ab-link">صفحة البيانات</Link>؛
                والسياسات: <Link to="/legal/privacy" className="ab-link">الخصوصية</Link> و
                <Link to="/legal/terms" className="ab-link">الشروط</Link>.
              </p>
            </div>
          </section>

          <footer className="ab-colophon">
            <p className="ab-colophon-line">{COLOPHON_LINE}</p>
            <p className="ab-colophon-stamp">
              {UPDATED_LABEL} <span className="ab-mono" dir="ltr">{LEGAL_UPDATED}</span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ═══ [C-05] المساعدة والأسئلة الشائعة ══════════════════════════════ */

/** The nine FAQs — every answer cites a real surface (PAGES-GAP P1-5):
 * the five roles, the honest password-reset truth, the noscript line,
 * the reduced-motion paths, the theme toggle, the storage ledger, the
 * capability ledger, the print stylesheet. No invented support channels.
 * R366 L4: each answer is 1-2 lines — same facts, fewer words.
 *
 * r324 X15 — the pilot CREDENTIALS (@test.ly / the shared password)
 * ride `showPilotAccounts`: true on dev/preview builds and on a prod
 * build explicitly made with VITE_PILOT_HELP_ACCOUNTS=1 for the pilot
 * cohort. Default production builds get the honest credential-free
 * variants — a public help page never publishes a working password. */
const faqs = (showPilotAccounts: boolean): ReadonlyArray<{ q: string; a: ReactNode }> => [
  {
    q: 'كيف أجرّب المنصّة؟',
    a: showPilotAccounts ? (
      <>
        بريد <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> وكلمة المرور <bdi className="hp-code hp-mono" dir="ltr">12345678</bdi> —
        لكل دور حساب في لوحة «حسابات تجريبية» بصفحة الدخول.
      </>
    ) : (
      <>
        استخدم الحساب الذي وصلك أو انتظر فتح التسجيل من
        {' '}<Link to="/auth/register" className="hp-link">نموذج التسجيل</Link>.
      </>
    ),
  },
  {
    q: 'ما الأدوار المتاحة؟',
    a: (
      <>
        خمسة أدوار: <strong>طالب</strong>، <strong>أستاذ</strong> (ورئيس قسم وعميد)،
        <strong>إدارة</strong> (مسجّل عام ومسجل كلية)، <strong>أخصائي جودة</strong>، و<strong>مالك</strong>.
      </>
    ),
  },
  {
    q: 'نسيت كلمة المرور؟',
    a: showPilotAccounts ? (
      <>
        لا بريد يُرسَل بعد. كلمة مرور <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi>
        معروفة (<bdi className="hp-code hp-mono" dir="ltr">12345678</bdi>)؛
        لحسابك الخاص: <Link to="/contact" className="hp-link">{CONTACT_CHANNEL}</Link>.
      </>
    ) : (
      <>
        لا بريد يُرسَل بعد. للحساب الخاص:
        {' '}<Link to="/contact" className="hp-link">{CONTACT_CHANNEL}</Link>.
      </>
    ),
  },
  {
    q: 'ما المتصفحات المدعومة؟',
    a: (
      <>
        <bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi>
        و<bdi>Safari</bdi> مع الجافاسكربت — وإن عُطّلت تظهر رسالة التفعيل.
      </>
    ),
  },
  {
    q: 'هل يمكن تخفيف الحركة؟',
    a: (
      <>
        نعم — فعّل «تقليل الحركة» في نظامك.
      </>
    ),
  },
  {
    q: 'كيف أبدّل المظهر؟',
    a: (
      <>
        مفتاح المظهر في الشريط الجانبي.
      </>
    ),
  },
  {
    q: 'ماذا تكتبون على جهازي؟',
    a: (
      <>
        كوكي واحد وتسعة مفاتيح — التفصيل في
        {' '}<Link to="/legal/cookies" className="hp-link">صفحة التخزين</Link>.
      </>
    ),
  },
  {
    q: 'ما يعمل وما هو محاكاة؟',
    a: (
      <>
        سجلّ <Link to="/capabilities" className="hp-link">«ما يعمل اليوم»</Link> يفصل —
        والمحاكاة موسومة.
      </>
    ),
  },
  {
    q: 'هل تُطبع السياسات؟',
    a: (
      <>
        نعم — <bdi className="hp-code hp-mono" dir="ltr">/legal/*</bdi> بعمود
        واحد وتاريخ التحديث.
      </>
    ),
  },
];

export function HelpPage() {
  useLegalMeta({
    title: HELP_TITLE,
    path: '/help',
    description: 'إجابات قصيرة إلى أسطح حقيقية.',
  });

  /* r324 X15 — the credential-bearing FAQ variants render on dev/preview
   * builds, or a prod build explicitly made with VITE_PILOT_HELP_ACCOUNTS=1
   * for the pilot cohort. Default production: the honest, credential-free
   * answers. */
  const showPilotAccounts =
    import.meta.env.DEV || import.meta.env.VITE_PILOT_HELP_ACCOUNTS === '1';
  const faqList = faqs(showPilotAccounts);

  /* R341 D3 — rebuilt on the pattern library (the r340 T-D1a recipe,
   * D2's /about shape): the pf-page/pf-page-header frame + the help
   * sheet's own hp-* grammar (help.css). Same chrome laws as the guest
   * sheets: the skip link first, GuestSheetChrome's frame + grain, the
   * sticky guest header, ONE h1, and the honest colophon. The FAQ keeps
   * the R333 P-G3a native details/summary accordion: the [nn] mono
   * index stays on the summary row, and a hairline chevron at the
   * inline end carries the open state (help.css). The first question
   * opens by default so the affordance is discoverable, not nine
   * identical closed slabs.
   * PI-REC reconciliation: the question text keeps its heading
   * outline (R320 §D pins nine level-2 headings on this page) —
   * the h2 rides INSIDE the summary (valid: summary = one optional
   * heading), so the accordion and the document outline coexist. */
  return (
    <div className="hp">
      <a href="#main" className="skip-link">{SKIP_LINK}</a>
      <GuestSheetChrome />

      <header className="hp-header">
        <div className="hp-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            {BACK_HOME}
          </Link>
          <Link to="/" className="hp-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            {BRAND_WORD}
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="hp-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">أسئلة الزوّار</p>
              <h1 className="pf-page-title">{HELP_TITLE}</h1>
            </div>
            <div className="pf-page-actions">
              <Link to="/capabilities" className="hp-cta-primary">{CAPABILITIES_CTA}</Link>
              <Link to="/contact" className="hp-cta-ghost">{CONTACT_CHANNEL}</Link>
            </div>
          </div>

          <div className="hp-faq">
            {faqList.map((f, i) => (
              <details className="hp-faq-item" key={f.q} open={i === 0}>
                <summary className="hp-faq-q">
                  <span className="hp-mono" dir="ltr" aria-hidden="true">
                    [{String(i + 1).padStart(2, '0')}]
                  </span>
                  <h2 className="hp-faq-q-text">{f.q}</h2>
                  <span className="hp-faq-caret" aria-hidden="true" />
                </summary>
                <p className="hp-faq-a">{f.a}</p>
              </details>
            ))}
          </div>

          <footer className="hp-colophon">
            <p className="hp-colophon-line">{COLOPHON_LINE}</p>
            <p className="hp-colophon-stamp">
              {UPDATED_LABEL} <span className="hp-mono" dir="ltr">{LEGAL_UPDATED}</span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/* ═══ [C-03] التواصل والتسجيل المبكر ════════════════════════════════ */

export function ContactPage() {
  useLegalMeta({
    title: CONTACT_TITLE,
    path: '/contact',
    description: 'التسجيل المبكر هو القناة.',
  });

  return (
    <LegalSheet
      title={CONTACT_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="القناة المتاحة" id="contact-channel" />
      <LegalCell>
        <p className="lg-p">
          لا بريد عام بعد — قدّم طلبك من
          {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب</Link>؛
          ويقرؤه المشغّل.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا نملكه بعد" id="contact-none" />
      <LegalCell>
        <p className="lg-p">
          لن نطلب بياناتك إلا عبر ما يُعلن هنا.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="زمن الاستجابة" id="contact-sla" />
      <LegalCell>
        <p className="lg-p">
          لا نعد بمدة لم تُقرّ — نافذة الرد الملتزمة <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأمور الأمنية" id="contact-security" />
      <LegalCell>
        <p className="lg-p">
          بلاغات الثغرات عبر القناة نفسها — والسياسة في
          {' '}<Link to="/legal/security" className="lg-link">صفحة الأمن</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
