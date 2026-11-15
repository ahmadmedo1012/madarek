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
 */
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Logo } from '../brand';
import { GuestSheetChrome } from '../components/layout/GuestSheetChrome';
import {
  LegalCell,
  LegalSectionBar,
  LegalSheet,
  PendingTag,
  useLegalMeta,
} from './legal/LegalSheet';
import { LEGAL_UPDATED } from './legal/LegalPages';
/* R341 D2 — the about sheet's own rules (ab-*): /about left the lg-*
 * legal-sheet family and rides the pattern library (pf-*) + this
 * about-scoped sheet. R341 D3 — /help likewise (hp-* in help.css);
 * /contact keeps LegalSheet below. */
import '../styles/about.css';
import '../styles/help.css';

/* ═══ [C-04] عن مدارك ═══════════════════════════════════════════════ */

export function AboutPage() {
  useLegalMeta({
    title: 'عن مدارك',
    path: '/about',
    description: 'منصّة تعليمية تقنية مستقلّة، عربية أولًا.',
  });

  /* R341 D2 — rebuilt on the pattern library (the r340 T-D1a recipe):
   * the pf-page/pf-page-header frame + the about sheet's own ab-*
   * grammar (about.css). Same chrome laws as the guest sheets: the
   * skip link first, GuestSheetChrome's frame + grain, the sticky
   * guest header, ONE h1, and the honest colophon — every claim
   * below is the lg sheet's statement, dieted (r353). */
  return (
    <div className="ab">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="ab-header">
        <div className="ab-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الرئيسية
          </Link>
          <Link to="/" className="ab-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            مدارك
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="ab-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">بيان المنصّة</p>
              <h1 className="pf-page-title">عن مدارك</h1>
            </div>
            <div className="pf-page-actions">
              <Link to="/capabilities" className="ab-cta-primary">سجلّ القدرات</Link>
              <Link to="/" className="ab-cta-ghost">الصفحة الرئيسية</Link>
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
                منصّة تعليمية تقنية مستقلّة، عربية أولًا — بيانات العرض اصطناعية بالكامل.
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
                المحاضرات التفاعلية، الاختبارات، مصفوفة الإتقان، مكتبة البحوث، الرسائل
                والإشعارات، والجدول الأسبوعي — التفصيل في
                <Link to="/capabilities" className="ab-link">صفحة السجلّ</Link>.
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
                لم يُعلن المالك عن نفسه بعد —
                <span className="ab-pending">[يُستكمل قبل الإطلاق]</span>.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-data">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-data">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[04]</span>
                <span className="ab-bar-title">البيانات</span>
              </h2>
            </div>
            <div className="ab-cell">
              <p className="ab-p">
                الفصل بين بيانات العرض وبياناتك الحقيقية في
                {' '}<Link to="/legal/data" className="ab-link">صفحة البيانات</Link>،
                والسياسات في <Link to="/legal/privacy" className="ab-link">سياسة الخصوصية</Link> و
                <Link to="/legal/terms" className="ab-link">شروط الاستخدام</Link>.
              </p>
            </div>
          </section>

          <footer className="ab-colophon">
            <p className="ab-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية</p>
            <p className="ab-colophon-stamp">
              آخر تحديث: <span className="ab-mono" dir="ltr">{LEGAL_UPDATED}</span>
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
        بريد ينتهي بـ <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> وكلمة المرور <bdi className="hp-code hp-mono" dir="ltr">12345678</bdi> —
        حساب لكل دور، في لوحة «حسابات تجريبية» على صفحة الدخول (زر «تعبئة» ثم «دخول»).
      </>
    ) : (
      <>
        تُوزّع حسابات التجربة على المختبرين مع كل مرحلة — استخدم الحساب الذي وصلك،
        وإن لم يصل فانتظر فتح التسجيل من
        {' '}<Link to="/auth/register" className="hp-link">نموذج إنشاء الحساب</Link>.
      </>
    ),
  },
  {
    q: 'ما الأدوار المتاحة في المنصّة؟',
    a: (
      <>
        خمسة أدوار: <strong>طالب</strong> و<strong>أستاذ</strong> (ومعه رئيس قسم وعميد)
        و<strong>إدارة</strong> (المسجل العام ومسجل كلية) و<strong>أخصائي جودة</strong> و<strong>مالك
        المنصّة</strong> — الصلاحيات مفروضة في الخادم.
      </>
    ),
  },
  {
    q: 'نسيت كلمة المرور — ماذا أفعل؟',
    a: showPilotAccounts ? (
      <>
        لا يوجد بريد يُرسَل من المنصّة بعد. حسابات <bdi className="hp-code hp-mono" dir="ltr">@test.ly</bdi> كلمة مرورها معروفة
        (<bdi className="hp-code hp-mono" dir="ltr">12345678</bdi>) فتُملأ من صفحة الدخول؛ حسابك الخاص؟ فالطريق
        <Link to="/contact" className="hp-link">قناة التواصل</Link>.
      </>
    ) : (
      <>
        لا يوجد بريد يُرسَل من المنصّة بعد. حساب تجريبي؟ ادخل ببياناته من
        {' '}<Link to="/auth" className="hp-link">صفحة الدخول</Link>؛ حسابك الخاص؟ فالطريق
        <Link to="/contact" className="hp-link">قناة التواصل</Link>.
      </>
    ),
  },
  {
    q: 'ما المتصفحات المدعومة؟',
    a: (
      <>
        المتصفحات الحديثة (<bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi>
        و<bdi>Safari</bdi>) مع تشغيل الجافاسكربت — وإن
        عُطّلت فستقابلك رسالة تطلب التفعيل وإعادة التحميل.
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
        بمفتاح المظهر في الشريط الجانبي — ويُحفظ اختيارك على جهازك.
      </>
    ),
  },
  {
    q: 'ماذا تكتبون على جهازي؟',
    a: (
      <>
        كوكي واحد وتسعة مفاتيح تخزين — الجدول الكامل وما يُحذف عند الرفض في
        {' '}<Link to="/legal/cookies" className="hp-link">صفحة التخزين المحلي</Link>.
      </>
    ),
  },
  {
    q: 'ما يعمل فعلًا وما هو محاكاة؟',
    a: (
      <>
        سجلّ القدرات يفصل: <Link to="/capabilities" className="hp-link">«ما يعمل اليوم»</Link> — وما هو
        محاكاة أو قيد التطوير موسوم كذلك.
      </>
    ),
  },
  {
    q: 'هل يمكن طباعة السياسات؟',
    a: (
      <>
        نعم — صفحات <bdi className="hp-code hp-mono" dir="ltr">/legal/*</bdi> تُطبع كوثيقة بعمود واحد: النص
        والإطارات الحاكمة وتاريخ آخر تحديث.
      </>
    ),
  },
];

export function HelpPage() {
  useLegalMeta({
    title: 'المساعدة والأسئلة الشائعة',
    path: '/help',
    description: 'إجابات قصيرة — كل جواب يشير إلى سطح حقيقي في المنصّة.',
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
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="hp-header">
        <div className="hp-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الرئيسية
          </Link>
          <Link to="/" className="hp-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            مدارك
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="hp-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">أسئلة الزوّار</p>
              <h1 className="pf-page-title">المساعدة والأسئلة الشائعة</h1>
              <p className="pf-page-desc">
                تسعة أسئلة — وكل جواب مما يعمل اليوم.
              </p>
            </div>
            <div className="pf-page-actions">
              <Link to="/capabilities" className="hp-cta-primary">سجلّ القدرات</Link>
              <Link to="/contact" className="hp-cta-ghost">قناة التواصل</Link>
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
            <p className="hp-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية</p>
            <p className="hp-colophon-stamp">
              آخر تحديث: <span className="hp-mono" dir="ltr">{LEGAL_UPDATED}</span>
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
    title: 'التواصل والتسجيل المبكر',
    path: '/contact',
    description: 'قناة التواصل — التسجيل المبكر، بلا بريد مخترع.',
  });

  return (
    <LegalSheet
      title="التواصل والتسجيل المبكر"
      lede="لا نخترع قنوات — هذه المتاحة اليوم."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="القناة المتاحة" id="contact-channel" />
      <LegalCell>
        <p className="lg-p">
          لا بريد عام بعد — قدّم طلبك من
          {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب الجامعي</Link>،
          وما يصل عبره يقرؤه المشغّل.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا نملكه بعد" id="contact-none" />
      <LegalCell>
        <p className="lg-p">
          أي قناة تُعلن هنا — ولن نطلب بياناتك عبر طريق غيره.
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
          بلاغات الثغرات عبر القناة نفسها — وسياسة الإفصاح المسؤول في
          {' '}<Link to="/legal/security" className="lg-link">صفحة الأمن</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
