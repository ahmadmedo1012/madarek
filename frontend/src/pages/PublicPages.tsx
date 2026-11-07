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
  CodeRun,
  LegalCell,
  LegalSectionBar,
  LegalSheet,
  PendingTag,
  useLegalMeta,
} from './legal/LegalSheet';
import { LEGAL_UPDATED } from './legal/LegalPages';
/* R341 D2 — the about sheet's own rules (ab-*): /about left the lg-*
 * legal-sheet family and rides the pattern library (pf-*) + this
 * about-scoped sheet. /help + /contact keep LegalSheet below. */
import '../styles/about.css';

/* ═══ [C-04] عن مدارك ═══════════════════════════════════════════════ */

export function AboutPage() {
  useLegalMeta({
    title: 'عن مدارك',
    path: '/about',
    description: 'منصّة تعليمية تقنية مستقلّة، عربية أولًا — البيان كاملًا كما هو في صفحة البداية، بلا إضافات.',
  });

  /* R341 D2 — rebuilt on the pattern library (the r340 T-D1a recipe):
   * the pf-page/pf-page-header frame + the about sheet's own ab-*
   * grammar (about.css). Same chrome laws as the guest sheets: the
   * skip link first, GuestSheetChrome's frame + grain, the sticky
   * guest header, ONE h1, and the honest colophon — every word below
   * is the SAME text the lg sheet carried (tests are law). */
  return (
    <div className="ab">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="ab-header">
        <div className="ab-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
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
              <p className="pf-page-desc">
                كل ما يمكن قوله بصدق اليوم موجود في فقرة واحدة — نضعها هنا كما هي في صفحة البداية، حرفيًا.
              </p>
            </div>
            <div className="pf-page-actions">
              <Link to="/capabilities" className="btn accent">سجلّ القدرات</Link>
              <Link to="/" className="btn ghost">الصفحة الرئيسية</Link>
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
              {/* The landing's own identity paragraph, VERBATIM
                  (LandingPage.tsx:1346-1350 — the r188 honesty pin keeps
                  «اصطناعية بالكامل» contiguous on one source line; the same
                  discipline holds here). LEGAL-TODO row 14: nothing may be
                  added about who builds مدارك until the owner states it. */}
              <p className="ab-p ab-p-statement">
                منصّة تعليمية تقنية مستقلّة، عربية أولًا. لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛ وبيانات العرض داخلها تخصّ «جامعة مدارك التجريبية» — مؤسسة اصطناعية بالكامل لأغراض العرض.
              </p>
            </div>
          </section>

          <section aria-labelledby="about-works">
            <div className="pf-section-header">
              <h2 className="ab-bar" id="about-works">
                <span className="ab-bar-index ab-mono" dir="ltr" aria-hidden="true">[02]</span>
                <span className="ab-bar-title">ما الذي يعمل اليوم</span>
              </h2>
            </div>
            <div className="ab-cell">
              <p className="ab-p">
                المحاضرات التفاعلية، الاختبارات ذاتية التصحيح للموضوعي، مصفوفة الإتقان، مكتبة البحوث برفع
                <bdi className="ab-code ab-mono" dir="ltr">PDF</bdi> والمراجعة، الرسائل والإشعارات، والجدول الأسبوعي — والسجلّ الكامل الصادق
                (ما يعمل حقيقة وما هو محاكاة) في <Link to="/capabilities" className="ab-link">صفحة السجلّ</Link>.
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
                لا نضيف هنا شيئًا لم يقله المالك بعد — ما يمكن نشره عن من يبني مدارك (خلفية، فريق، تمويل)
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
                الفصل الكامل بين بيانات العرض الاصطناعية وبياناتك الحقيقية في
                {' '}<Link to="/legal/data" className="ab-link">صفحة البيانات</Link>،
                وسياسات المنصّة في <Link to="/legal/privacy" className="ab-link">سياسة الخصوصية</Link> و
                <Link to="/legal/terms" className="ab-link">شروط الاستخدام</Link>.
              </p>
            </div>
          </section>

          <footer className="ab-colophon">
            <p className="ab-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</p>
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
        بحسابات الاختبار الموزّعة على المختبرين: بريد ينتهي بـ <CodeRun>@test.ly</CodeRun> وكلمة المرور <CodeRun>12345678</CodeRun> —
        حساب واحد لكل دور، معروضة في لوحة «حسابات تجريبية» على صفحة الدخول في بيئة التطوير (زر «تعبئة»
        يملأ الحقول ثم «دخول» يدخل بها).
      </>
    ) : (
      <>
        حسابات التجربة تُوزّع على فريق المختبرين عند فتح كل مرحلة — إن كنت من المختبرين فاستخدم
        الحساب الذي وصلك من فريق مدارك، وإن لم يصل بعدُ فانتظر فتح التسجيل من
        {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب</Link>.
      </>
    ),
  },
  {
    q: 'ما الأدوار المتاحة في المنصّة؟',
    a: (
      <>
        خمسة أدوار: <strong>طالب</strong> و<strong>أستاذ</strong> (ومعه الأدوار القيادية: رئيس قسم وعميد)
        و<strong>إدارة</strong> (المسجل العام ومسجل كلية) و<strong>أخصائي جودة</strong> و<strong>مالك
        المنصّة</strong> — لكل دور لوحته وصلاحياته المفروضة في الخادم.
      </>
    ),
  },
  {
    q: 'نسيت كلمة المرور — ماذا أفعل؟',
    a: showPilotAccounts ? (
      <>
        الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حسابات <CodeRun>@test.ly</CodeRun> كلمة مرورها
        معروفة (<CodeRun>12345678</CodeRun>) فتُملأ من صفحة الدخول مباشرة؛ وإن كان حسابك الخاص فقدنا كلمة
        مروره فالطريق اليوم <Link to="/contact" className="lg-link">قناة التواصل</Link> — لا نعدك بغير ما
        يعمل.
      </>
    ) : (
      <>
        الحقيقة كاملة: لا يوجد بريد يُرسَل من المنصّة بعد. حساب تجريبي؟ استخدم بيانات الحساب الذي وصلك
        من فريق التجربة وادخل بها مباشرة من
        {' '}<Link to="/auth" className="lg-link">صفحة الدخول</Link>؛ وإن كان حسابك الخاص فقدنا كلمة
        مروره فالطريق اليوم <Link to="/contact" className="lg-link">قناة التواصل</Link> — لا نعدك بغير ما
        يعمل.
      </>
    ),
  },
  {
    q: 'ما المتصفحات المدعومة؟',
    a: (
      <>
        المتصفحات الحديثة بإصداراتها الأخيرة (<bdi>Chrome</bdi> و<bdi>Edge</bdi> و<bdi>Firefox</bdi>
        و<bdi>Safari</bdi>) مع تشغيل الجافاسكربت — وإن
        كانت معطلة فستقابلك رسالة عربية واحدة تطلب تفعيلها وإعادة التحميل.
      </>
    ),
  },
  {
    q: 'هل يمكن تخفيف الحركة في الواجهة؟',
    a: (
      <>
        نعم: فعّل «تقليل الحركة» في إعدادات نظامك وستنهار كل حركات الواجهة إلى ظهور هادئ — لا يحتاج
        أي إعداد داخل المنصّة.
      </>
    ),
  },
  {
    q: 'كيف أبدّل المظهر الفاتح والداكن؟',
    a: (
      <>
        بمفتاح المظهر في الشريط الجانبي داخل المنصّة، وعلى الشاشات الصغيرة من أعلى صفحة البداية —
        واختيارك يُحفظ على جهازك ويُستعاد في الزيارة التالية.
      </>
    ),
  },
  {
    q: 'ماذا تكتبون على جهازي؟',
    a: (
      <>
        كوكي واحد وتسعة مفاتيح تخزين محلي، لكل واحد غرض معلن — الجدول الكامل مع ما يُحذف عند الرفض في
        {' '}<Link to="/legal/cookies" className="lg-link">صفحة التخزين المحلي</Link>.
      </>
    ),
  },
  {
    q: 'ما الذي يعمل فعلًا وما الذي محاكاة؟',
    a: (
      <>
        سجلّ القدرات يفصل بصدق: <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> — كل
        سطر فيه حقيقة نظام يمكن التحقق منها، وما هو محاكاة أو قيد التطوير موسوم كذلك.
      </>
    ),
  },
  {
    q: 'هل يمكن طباعة السياسات؟',
    a: (
      <>
        نعم — صفحات <CodeRun>/legal/*</CodeRun> مصمّمة للطباعة كوثيقة نظيفة بعمود واحد: أرسل أمر الطباعة
        من متصفحك مباشرة وستحصل على النص والإطارات الحاكمة وتاريخ آخر تحديث دون أي زخرفة شاشة.
      </>
    ),
  },
];

export function HelpPage() {
  useLegalMeta({
    title: 'المساعدة والأسئلة الشائعة',
    path: '/help',
    description: 'إجابات قصيرة وصادقة عن مدارك — كل جواب يشير إلى سطح حقيقي في المنصّة، لا إلى وعود.',
  });

  /* r324 X15 — the credential-bearing FAQ variants render on dev/preview
   * builds, or a prod build explicitly made with VITE_PILOT_HELP_ACCOUNTS=1
   * for the pilot cohort. Default production: the honest, credential-free
   * answers. */
  const showPilotAccounts =
    import.meta.env.DEV || import.meta.env.VITE_PILOT_HELP_ACCOUNTS === '1';
  const faqList = faqs(showPilotAccounts);

  return (
    <LegalSheet
      title="المساعدة والأسئلة الشائعة"
      lede="تسعة أسئلة هي ما يسأله الزوار فعلًا — وكل جواب يستند إلى ما يعمل اليوم في المنصّة، بلا تجميل."
      updated={LEGAL_UPDATED}
    >
      {/* R333 P-G3a (T-G1-03): the FAQ is a real accordion now — native
          details/summary (keyboard + print + no-JS for free), the [nn]
          mono index stays on the summary row, and a hairline chevron at
          the inline end carries the open state (legal.css). The first
          question opens by default so the affordance is discoverable,
          not nine identical closed slabs.
          PI-REC reconciliation: the question text keeps its heading
          outline (R320 §D pins nine level-2 headings on this page) —
          the h2 rides INSIDE the summary (valid: summary = one optional
          heading), so the accordion and the document outline coexist. */}
      <div className="lg-faq">
        {faqList.map((f, i) => (
          <details className="lg-faq-item" key={f.q} open={i === 0}>
            <summary className="lg-faq-q">
              <span className="lg-mono" dir="ltr" aria-hidden="true">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <h2 className="lg-faq-q-text">{f.q}</h2>
              <span className="lg-faq-caret" aria-hidden="true" />
            </summary>
            <p className="lg-faq-a">{f.a}</p>
          </details>
        ))}
      </div>
    </LegalSheet>
  );
}

/* ═══ [C-03] التواصل والتسجيل المبكر ════════════════════════════════ */

export function ContactPage() {
  useLegalMeta({
    title: 'التواصل والتسجيل المبكر',
    path: '/contact',
    description: 'قناة التواصل المتاحة مع منصّة مدارك — التسجيل المبكر، بلا بريد ولا هواتف مخترعة.',
  });

  return (
    <LegalSheet
      title="التواصل والتسجيل المبكر"
      lede="لا نخترع قنوات تواصل — هذه هي القناة المتاحة فعلًا اليوم، مكتوبة كما هي."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="القناة المتاحة" id="contact-channel" />
      <LegalCell>
        <p className="lg-p">
          التسجيل المبكر من صفحة البداية هو قناة التواصل المتاحة حاليًا — لا بريد عام في مرحلة الإطلاق
          التجريبي. يمكنك تقديم طلبك من
          {' '}<Link to="/auth/register" className="lg-link">نموذج إنشاء الحساب الجامعي</Link>،
          وما يصل عبره هو ما يقرؤه المشغّل.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا نملكه بعد" id="contact-none" />
      <LegalCell>
        <p className="lg-p">
          لا بريد عام، ولا هاتف، ولا حسابات اجتماعية للمنصّة اليوم. أي قناة تُضاف فعلًا ستُعلن هنا أولًا —
          ولن نطلب منك بيانات عبر أي طريق غير هذا المكان.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="زمن الاستجابة" id="contact-sla" />
      <LegalCell>
        <p className="lg-p">
          لا نعد بمدة استجابة لم تُقرّ بعد — نافذة الرد الملتزمة <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأمور الأمنية" id="contact-security" />
      <LegalCell>
        <p className="lg-p">
          بلاغات الثغرات الأمنية تصل عبر القناة نفسها — وسياسة الإفصاح المسؤول في
          {' '}<Link to="/legal/security" className="lg-link">صفحة الأمن</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
