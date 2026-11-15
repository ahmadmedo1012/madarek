/**
 * LegalPages — R320 §D (c2-LEGAL) · the six policy sheets.
 *
 * /legal/privacy [L-01] · /legal/terms [L-02] · /legal/cookies [L-03]
 * /legal/accessibility [L-04] · /legal/security [L-05] · /legal/data [L-06]
 *
 * THE LAW (PAGES-GAP §6, binding): every sentence is written FROM the
 * code's actual behavior — the REAL storage inventory (§2), the REAL
 * auth mechanics, the REAL hosting + AI-provider story — never from a
 * template of a company we are not. No GDPR/ISO/SOC claims anywhere
 * (none are certified). Every unknown legal fact carries the visible
 * `[يُستكمل قبل الإطلاق]` marker AND a mirrored row in
 * docs/redesign/r320/LEGAL-TODO.md (rows 1-18) — the two can never
 * drift apart. Arabic display strings carry no tashkeel; Latin runs
 * (keys, cookie names, routes) ride dir=ltr mono <bdi> runs.
 */
import { Link } from 'react-router-dom';
import {
  CodeRun,
  LegalCell,
  LegalSectionBar,
  LegalSheet,
  PendingTag,
  useLegalMeta,
} from './LegalSheet';

/** The suite's build stamp — LEGAL-TODO row 9's interim rule: the build
 * stamps the REAL date the pages land; a pre-launch review pass
 * re-stamps at launch. */
export const LEGAL_UPDATED = '2026-10-27';

/** The belt's honesty vocabulary for the security page — the shipped
 * controls the unit belt sweeps for, so a copy edit that drops one is
 * a deliberate act (edit this list IN THE SAME COMMIT, with the page). */
export const SECURITY_MARKER_KEYS = ['argon2', '12-72', '15m', '7d', '403', 'CSP'] as const;

/* ═══ [L-01] سياسة الخصوصية ═════════════════════════════════════════ */

export function PrivacyPage() {
  useLegalMeta({
    title: 'سياسة الخصوصية',
    path: '/legal/privacy',
    description: 'ما نجمعه ولماذا وأين يُخزَّن، وحقوقك.',
  });

  return (
    <LegalSheet
      title="سياسة الخصوصية"
      lede="من السلوك الفعلي — لا وعود."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما الذي نجمعه" id="privacy-collect" />
      <LegalCell>
        <ul className="lg-list">
          <li>الحساب: <strong>البريد والاسم والدور</strong> ولون الصورة الرمزية.</li>
          <li>للطالب: الكلية والقسم والسنة ورقم التسجيل.</li>
          <li>للأستاذ: المسمّى الأكاديمي.</li>
        </ul>
        <p className="lg-p">
          <strong>كلمة المرور لا تُخزَّن نصًا أبدًا</strong> — تُجزَّأ عبر <CodeRun>argon2</CodeRun>.
        </p>
        <p className="lg-p">
          وما تكتبه يُخزَّن مع حسابك: الرسائل، محادثات المساعد، بحوثك وموادك، وإجابات الاختبارات — وسجلّ تدقيق.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="لماذا نجمعه" id="privacy-why" />
      <LegalCell>
        <p className="lg-p">لغرض واحد: تشغيل منصّة تعليمية تجريبية.</p>
        <ul className="lg-list">
          <li>تسجيل المقررات والتقدّم والمصفوفة.</li>
          <li>الرسائل مع الأساتذة والزملاء.</li>
          <li>تصحيح الاختبارات وحفظ المواد.</li>
          <li>لا نبيع بياناتك ولا نشاركها، ولا تحليلات ولا إعلانات.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={3} title="أين يُخزَّن" id="privacy-where" />
      <LegalCell>
        <p className="lg-p">
          خدمة الويب وقاعدة <CodeRun>PostgreSQL</CodeRun> على <strong>Render</strong> و<strong>Neon</strong>،
          والمرفوعات في مخزن يحدده المشغّل — لا خوادم أخرى.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="مدة الاحتفاظ" id="privacy-retention" />
      <LegalCell>
        <p className="lg-p">
          رمز الوصول خلال <CodeRun>15m</CodeRun> ورمز التحديث خلال
          <CodeRun> 7d</CodeRun>، وسجل قرارك يبقى حتى تغييره. سياسة الاحتفاظ الكاملة
          وطلب الحذف <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="حقوقك" id="privacy-rights" />
      <LegalCell>
        <p className="lg-p">
          عدّل ملفك وكلمة مرورك أي وقت — التغيير يُنهي جلساتك على كل الأجهزة.
          وللتصدير أو الحذف: قناة التواصل (08) — الآلية <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="الأطراف الثالثة" id="privacy-third-parties" />
      <LegalCell>
        <p className="lg-p">
          المساعد الذكي — ميزة اختيارية عبر مزوّد متوافق مع <CodeRun>OpenAI</CodeRun>
          يحدده المشغّل (<CodeRun>openai</CodeRun>/<CodeRun>openrouter</CodeRun>/<CodeRun>groq</CodeRun>).
        </p>
        <ul className="lg-list">
          <li>عند التعطيل: أداة محلية داخل الخادم، لا إرسال للخارج.</li>
          <li>المزوّد الفعلي وشروط معالجته للمحادثات <PendingTag />.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={7} title="الكوكيز والتخزين" id="privacy-storage" />
      <LegalCell>
        <p className="lg-p">
          <strong>كوكي واحد</strong> و<strong> تسعة مفاتيح تخزين محلي</strong> —
          ما يُحذف عند الرفض في
          <Link to="/legal/cookies" className="lg-link">صفحة التخزين</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={8} title="التواصل" id="privacy-contact" />
      <LegalCell>
        <p className="lg-p">
          القناة اليوم: التسجيل المبكر — لا بريد عام (التفاصيل في
          <Link to="/contact" className="lg-link">صفحة التواصل</Link>).
        </p>
      </LegalCell>

      <LegalSectionBar index={9} title="آخر تحديث" id="privacy-updated" />
      <LegalCell>
        <p className="lg-p">تُراجع قبل الإطلاق وقبل أي تعديل جوهري.</p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-02] شروط الاستخدام ═════════════════════════════════════════ */

export function TermsPage() {
  useLegalMeta({
    title: 'شروط الاستخدام',
    path: '/legal/terms',
    description: 'ما المنصّة وما ليست — وقواعد الحساب والمحتوى.',
  });
  return (
    <LegalSheet
      title="شروط الاستخدام"
      lede="ما هي مدارك، وما ليست."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما هي مدارك" id="terms-what" />
      <LegalCell>
        <p className="lg-p">
          مدارك منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي إلى مؤسّسة تعليمية ولا تمثّلها.
        </p>
        <p className="lg-p">
          <strong>مدارك ليست جامعة معتمدة ولا تمنح درجات</strong> — محتواها عرض تجريبي
          لـ«مؤسسة مدارك النموذجية».
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="الحساب" id="terms-account" />
      <LegalCell>
        <p className="lg-p">
          كلمة المرور بين <CodeRun>12</CodeRun> و<CodeRun>72</CodeRun> محرفًا، وتُرفض الشائعة في قائمة المنع. أنت مسؤول عن حسابك وعمّا يُكتب منه.
        </p>
        <p className="lg-p">
          للتجربة ننشر <strong>حسابات اختبار</strong> على <CodeRun>@test.ly</CodeRun> بكلمة مرور
          معروفة — لا بيانات حقيقية ولا خصوصية.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="المحتوى" id="terms-content" />
      <LegalCell>
        <p className="lg-p">
          ما ترفعه وتكتبه يبقى لك — والفصل بينه وبين بيانات العرض في
          <Link to="/legal/data" className="lg-link">صفحة البيانات</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الخدمة كما هي" id="terms-as-is" />
      <LegalCell>
        <p className="lg-p">
          المنصّة تجريبية وتُقدَّم <strong>«كما هي»</strong>: قد تتغير الميزات أو تتوقف دون إشعار —
          ولا ضمانات استمرارية أو خلوًّا من الأخطاء.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="المشغّل والقانون الحاكم" id="terms-operator" />
      <LegalCell>
        <p className="lg-p">
          تُشغَّل اليوم كمشروع تجريبي مستقل؛ الهوية القانونية للمشغّل <PendingTag />، والقانون
          الحاكم <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="تعديل الشروط" id="terms-changes" />
      <LegalCell>
        <p className="lg-p">
          قد نحدّثها — المرجع آخر تحديث أسفل الصفحة:
          {' '}<CodeRun>{LEGAL_UPDATED}</CodeRun>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-03] ملفات تعريف الارتباط والتخزين المحلي ══════════════════ */

/** The REAL storage inventory — PAGES-GAP §2, each row cited to its
 * writer. The table the cookies page is WRITTEN FROM: same keys, same
 * purposes, same purge story as the code. */
export const STORAGE_LEDGER = [
  { key: 'madarek.consent', purpose: 'قرار لافتة التخزين (موافق/أرفض)', kind: 'أساسي', purge: 'هو القرار نفسه' },
  { key: 'madarek.consent.record', purpose: 'القرار مع طابعه الزمني (JSON)', kind: 'أساسي', purge: 'لا' },
  { key: 'madarek-theme', purpose: 'المظهر: فاتح أو داكن أو النظام', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-theme-profile', purpose: 'ذاكرة المظهر قبل التحميل', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-auth', purpose: 'جلسة الدخول: المستخدم والرمز وسياق المؤسسة', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-ui', purpose: 'طيّ الشريط وآخر اللوحات (4)', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-doc-side-w', purpose: 'عرض اللوحة الجانبية في العارض', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-academic-links', purpose: 'روابطك الأكاديمية — بياناتك أنت', kind: 'بيانات مستخدم', purge: 'لا تُدمَّر أبدًا' },
  { key: 'mdrk-auth::probe', purpose: 'فحص التخزين — يُكتب ويُحذف فورًا', kind: 'عابر', purge: 'ينظّف نفسه' },
] as const;

export function CookiesPage() {
  useLegalMeta({
    title: 'ملفات تعريف الارتباط والتخزين المحلي',
    path: '/legal/cookies',
    description: 'الكوكي الوحيد ومفاتيح التخزين التسعة — الجدول الكامل.',
  });

  return (
    <LegalSheet
      title="ملفات تعريف الارتباط والتخزين المحلي"
      lede="كوكي واحد وتسعة مفاتيح تخزين — لا تحليلات ولا تتبّع."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="المبدأ" id="cookies-principle" />
      <LegalCell>
        <p className="lg-p">
          التخزين المحلي يبقى على جهازك — لا يُرسل للخادم إلا ما يلزم طلبك،
          والخطوط مستضافة داخل المنصّة.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="جدول المفاتيح" id="cookies-table" />
      <LegalCell>
        <div className="lg-table-wrap">
          <table className="lg-table">
            <caption className="lg-table-caption">مفاتيح التخزين المحلي</caption>
            <thead>
              <tr>
                <th scope="col">المفتاح</th>
                <th scope="col">الغرض</th>
                <th scope="col">الصنف</th>
                <th scope="col">يُحذف عند الرفض؟</th>
              </tr>
            </thead>
            <tbody>
              {STORAGE_LEDGER.map((row) => (
                /* R321 §A4 — data-label feeds the ≤767 card
                 * transformation (legal.css §5): each td names its
                 * column so the mono ::before can carry the label when
                 * the thead is re-seated as per-row card lines. */
                <tr key={row.key}>
                  <td className="lg-table-key" dir="ltr" data-label="المفتاح">{row.key}</td>
                  <td data-label="الغرض">{row.purpose}</td>
                  <td data-label="الصنف">{row.kind}</td>
                  <td data-label="يُحذف عند الرفض؟">{row.purge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lg-p">
          «يُحذف عند الرفض»: تُمسح مفاتيح التفضيلات — وتبقى بياناتك (القسم 04).
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الكوكي الوحيد" id="cookies-the-cookie" />
      <LegalCell>
        <p className="lg-p">
          كوكي واحد فقط: <CodeRun>mdrk_refresh</CodeRun> — رمز تحديث الجلسة، <CodeRun>httpOnly</CodeRun>
          و<CodeRun>sameSite=strict</CodeRun>، محصور في المسار <CodeRun>/api/v1/auth</CodeRun>،
          وينتهي خلال <CodeRun>7d</CodeRun> مع دوران الرمز. حذفه يسجّل خروجك من الجهاز.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="عند الرفض" id="cookies-reject" />
      <LegalCell>
        <p className="lg-p">
          عند الرفض تُحذف مفاتيح التفضيلات <CodeRun>mdrk-ui</CodeRun> و<CodeRun>mdrk-doc-side-w</CodeRun>
          وتُشتق من جديد، ويُحفظ قرار الرفض حتى لا تُسأل مجددًا.
        </p>
        <p className="lg-p">
          أما <CodeRun>mdrk-academic-links</CodeRun> <strong>فلا يُمس عند الرفض
          أبدًا</strong>: بياناتك التي كتبتَها تبقى ملكك.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="المتصفح" id="cookies-browser" />
      <LegalCell>
        <p className="lg-p">
          امسح التخزين والكوكيز من إعدادات متصفحك متى شئت.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="آخر تحديث" id="cookies-updated" />
      <LegalCell>
        <p className="lg-p">
          الجدول يُحدَّث مع أي مفتاح جديد.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-04] بيان إمكانية الوصول ═══════════════════════════════════ */

export function AccessibilityPage() {
  useLegalMeta({
    title: 'بيان إمكانية الوصول',
    path: '/legal/accessibility',
    description: 'ما يُطبَّق فعلًا — لوحة مفاتيح، تقليل الحركة، تباين.',
  });

  return (
    <LegalSheet
      title="بيان إمكانية الوصول"
      lede="ما يشحنه التطبيق فعلًا — لا ادّعاء اجتياز قبل حدوثه."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما نطبّقه اليوم" id="a11y-ships" />
      <LegalCell>
        <ul className="lg-list">
          <li>عربية أولًا: الواجهة <CodeRun>rtl</CodeRun> من الأساس.</li>
          <li>روابط «تخطَّ إلى المحتوى» في كل سطح، وتنقّل بلوحة المفاتيح وحلقات تركيز ظاهرة.</li>
          <li>أرضية لمس <CodeRun>44px</CodeRun> للأهداف التفاعلية على الشاشات الصغيرة.</li>
          <li>احترام «تقليل الحركة» في النظام — حركات هادئة.</li>
          <li>بوابات تباين ضمن فحوص التكامل، فاتحًا وداكنًا.</li>
          <li><CodeRun>IBM Plex Sans Arabic</CodeRun> للنص و<CodeRun>Geist Mono</CodeRun> للأرقام والرموز.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={2} title="الحدود المعروفة" id="a11y-limits" />
      <LegalCell>
        <p className="lg-p">
          لم يُجرَ تقييم رسمي بعد، ومستوى الالتزام المستهدف (مثل <CodeRun>WCAG 2.1 AA</CodeRun>)
          <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الإبلاغ عن عائق" id="a11y-report" />
      <LegalCell>
        <p className="lg-p">
          إن واجهت عائقًا فأخبرنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-05] الأمن والإفصاح المسؤول ════════════════════════════════ */

export function SecurityPage() {
  useLegalMeta({
    title: 'الأمن والإفصاح المسؤول',
    path: '/legal/security',
    description: 'الضوابط المطبَّقة فعلًا — التجزئة، دوران الجلسات، الحدود.',
  });

  return (
    <LegalSheet
      title="الأمن والإفصاح المسؤول"
      lede="الضوابط التي يشحنها النظام فعلًا."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="الضوابط المطبَّقة" id="sec-controls" />
      <LegalCell>
        <ul className="lg-list">
          <li>كلمات المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun>، وسياستها <CodeRun>12-72</CodeRun> محرفًا مع قائمة منع.</li>
          <li>رمز وصول قصير (<CodeRun>15m</CodeRun>) ورمز تحديث (<CodeRun>7d</CodeRun>) يدور عند كل تجديد، وتغيير كلمة المرور يُبطل جلسات كل الأجهزة.</li>
          <li>رمز التحديث في كوكي <CodeRun>httpOnly</CodeRun> و<CodeRun>sameSite=strict</CodeRun> محصور في <CodeRun>/api/v1/auth</CodeRun> — لا يقرؤه سكربت في الصفحة.</li>
          <li>تحديد معدل المحاولات لكل IP، وقفل الحساب مؤقتًا بعد الفشل المتكرر.</li>
          <li>الأذونات تُفرض في الخادم لكل مسار حسب الدور — المرفوض يعيد <CodeRun>403</CodeRun> من الخادم نفسه.</li>
          <li>رؤوس سياسة أمان المحتوى (<CodeRun>CSP</CodeRun>) تُرسل مع الصفحة.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا ندّعيه" id="sec-no-claims" />
      <LegalCell>
        <p className="lg-p">
          لا شهادة <CodeRun>ISO</CodeRun> ولا <CodeRun>SOC</CodeRun> ولا اعتماد <CodeRun>GDPR</CodeRun> اليوم —
          وإن أُضيف اعتماد فسيُعلن مع وثيقته.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الإفصاح المسؤول" id="sec-disclosure" />
      <LegalCell>
        <p className="lg-p">
          رصدت ثغرة؟ بلّغنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link>.
          سياسة الإفصاح (النطاق والاستجابة والملاذ الآمن)
          <PendingTag />.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-06] البيانات وبيانات العرض ════════════════════════════════ */

export function DataPage() {
  useLegalMeta({
    title: 'البيانات وبيانات العرض',
    path: '/legal/data',
    description: 'الفصل بين البيانات الاصطناعية المبذورة وبياناتك الحقيقية.',
  });

  return (
    <LegalSheet
      title="البيانات وبيانات العرض"
      lede="ما الاصطناعي للعرض، وما كتبته أنت؟"
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="النوعان" id="data-types" />
      <LegalCell>
        <p className="lg-p">
          <strong>بيانات مبذورة اصطناعية بالكامل:</strong> «مؤسسة مدارك النموذجية» بكلياتها ومقرراتها،
          والمستخدمون التجريبيون وحسابات <CodeRun>@test.ly</CodeRun> ونتائجهم —
          ولا تمثّل أحدًا حقيقيًا.
        </p>
        <p className="lg-p">
          <strong>بياناتك الحقيقية:</strong> ما تدخله عند التسجيل، وما تكتبه أو ترفعه —
          رسائلك، بحوثك، موادك، إجاباتك.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="كيف تعرف الفرق" id="data-ledger" />
      <LegalCell>
        <p className="lg-p">
          سجلّ القدرات <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> يفصل الحقيقي
          من المحاكاة — والمنطق نفسه للبيانات: ما لم يُذكر حقيقيًا فهو عرض.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="أين تُخزَّن ومدة الاحتفاظ" id="data-retention" />
      <LegalCell>
        <p className="lg-p">
          النوعان في مكان واحد (التفصيل في <Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link>).
          وجميع البيانات بيانات عرض حتى استكمال سياسة الاحتفاظ <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأطراف الثالثة" id="data-third" />
      <LegalCell>
        <p className="lg-p">
          المساعد الأكاديمي وحده قد يغادر الخادم — والتفصيل في سياسة الخصوصية.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
