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
 *
 * R366 L4 copy diet: the prose tightened to one line per substance
 * point (the R355 method — every fact kept, every filler dropped);
 * the section bars, the storage ledger and every pinned fact are
 * unchanged.
 */
import { Link } from 'react-router-dom';
import {
  CodeRun,
  CONTACT_CHANNEL,
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

/* R366 L4: the page titles — one const per page (the meta head and the
 * sheet h1 carried the same words as two literals). */
const PRIVACY_TITLE = 'سياسة الخصوصية';
const TERMS_TITLE = 'شروط الاستخدام';
const COOKIES_TITLE = 'ملفات تعريف الارتباط والتخزين المحلي';
const A11Y_TITLE = 'بيان إمكانية الوصول';
const SECURITY_TITLE = 'الأمن والإفصاح المسؤول';
const DATA_TITLE = 'البيانات وبيانات العرض';
/* ═══ [L-01] سياسة الخصوصية ═════════════════════════════════════════ */

export function PrivacyPage() {
  useLegalMeta({
    title: PRIVACY_TITLE,
    path: '/legal/privacy',
    description: 'ما نجمعه ولماذا وأين يُخزَّن، وحقوقك.',
  });

  return (
    <LegalSheet
      title={PRIVACY_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما الذي نجمعه" id="privacy-collect" />
      <LegalCell>
        <ul className="lg-list">
          <li>الحساب: <strong>البريد والاسم والدور</strong> ولون الصورة.</li>
          <li>للطالب: الكلية والقسم والسنة ورقم التسجيل.</li>
          <li>للأستاذ: المسمّى الأكاديمي.</li>
        </ul>
        <p className="lg-p">
          كلمة المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun> — لا تُخزَّن نصًا.
        </p>
        <p className="lg-p">
          ومحتواك: الرسائل ومحادثات المساعد والبحوث والمواد والإجابات وسجلّ تدقيق.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="لماذا نجمعه" id="privacy-why" />
      <LegalCell>
        <p className="lg-p">غرض واحد: تشغيل منصّة تعليمية تجريبية.</p>
        <ul className="lg-list">
          <li>تسجيل المقررات والتقدّم والمصفوفة.</li>
          <li>الرسائل وتصحيح الاختبارات وحفظ المواد.</li>
          <li>لا بيع ولا مشاركة ولا تحليلات ولا إعلانات.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={3} title="أين يُخزَّن" id="privacy-where" />
      <LegalCell>
        <p className="lg-p">
          الويب وقاعدة <CodeRun>PostgreSQL</CodeRun> على <strong>Vercel</strong> و<strong>Neon</strong>،
          والمرفوعات في مخزن يحدده المشغّل.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="مدة الاحتفاظ" id="privacy-retention" />
      <LegalCell>
        <p className="lg-p">
          رمز الوصول <CodeRun>15m</CodeRun> ورمز التحديث
          <CodeRun> 7d</CodeRun>، وقرارك يبقى حتى تغييره؛ سياسة الاحتفاظ
          وطلب الحذف <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="حقوقك" id="privacy-rights" />
      <LegalCell>
        <p className="lg-p">
          عدّل ملفك وكلمة مرورك متى شئت؛ التغيير يُنهي الجلسات.
          وللتصدير أو الحذف: قناة التواصل (08) — الآلية <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="الأطراف الثالثة" id="privacy-third-parties" />
      <LegalCell>
        <p className="lg-p">
          المساعد الذكي اختياري — مزوّد متوافق مع <CodeRun>OpenAI</CodeRun>
          يحدده المشغّل (<CodeRun>openai</CodeRun>/<CodeRun>openrouter</CodeRun>/<CodeRun>groq</CodeRun>).
        </p>
        <ul className="lg-list">
          <li>عند التعطيل: أداة محلية داخل الخادم — لا إرسال للخارج.</li>
          <li>المزوّد الفعلي وشروطه <PendingTag />.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={7} title="الكوكيز والتخزين" id="privacy-storage" />
      <LegalCell>
        <p className="lg-p">
          <strong>كوكي واحد</strong> و<strong> تسعة مفاتيح</strong> —
          والتفصيل في
          <Link to="/legal/cookies" className="lg-link">صفحة التخزين</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={8} title="التواصل" id="privacy-contact" />
      <LegalCell>
        <p className="lg-p">
          التسجيل المبكر هو القناة — لا بريد عام (<Link to="/contact" className="lg-link">صفحة التواصل</Link>).
        </p>
      </LegalCell>

      <LegalSectionBar index={9} title="آخر تحديث" id="privacy-updated" />
      <LegalCell>
        <p className="lg-p">تُراجع قبل الإطلاق وعند أي تعديل جوهري.</p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-02] شروط الاستخدام ═════════════════════════════════════════ */

export function TermsPage() {
  useLegalMeta({
    title: TERMS_TITLE,
    path: '/legal/terms',
    description: 'ما هي وما ليست.',
  });
  return (
    <LegalSheet
      title={TERMS_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما هي مدارك" id="terms-what" />
      <LegalCell>
        <p className="lg-p">
          منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي لمؤسّسة تعليمية ولا تمثّلها.
        </p>
        <p className="lg-p">
          <strong>مدارك ليست جامعة معتمدة ولا تمنح درجات</strong> — محتواها عرض تجريبي
          لـ«مؤسسة مدارك النموذجية».
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="الحساب" id="terms-account" />
      <LegalCell>
        <p className="lg-p">
          كلمة المرور بين <CodeRun>12</CodeRun> و<CodeRun>72</CodeRun> محرفًا، والشائعة مرفوضة.
          أنت مسؤول عن حسابك وما يُكتب منه.
        </p>
        <p className="lg-p">
          حسابات التجربة على <CodeRun>@test.ly</CodeRun> بكلمة مرور معروفة —
          لا بيانات حقيقية ولا خصوصية.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="المحتوى" id="terms-content" />
      <LegalCell>
        <p className="lg-p">
          ما ترفعه وتكتبه يبقى لك — والفصل في
          <Link to="/legal/data" className="lg-link">صفحة البيانات</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الخدمة كما هي" id="terms-as-is" />
      <LegalCell>
        <p className="lg-p">
          المنصّة تجريبية وتُقدَّم <strong>«كما هي»</strong>: قد تتغيّر الميزات أو تتوقف
          دون إشعار، بلا ضمانات.
        </p>
      </LegalCell>

      {/* R366 L4: the operator + governing-law + changes sections folded
          into one bar — three one-line facts, one heading. */}
      <LegalSectionBar index={5} title="المشغّل والقانون" id="terms-operator" />
      <LegalCell>
        <p className="lg-p">
          تُشغَّل كمشروع تجريبي مستقل؛ الهوية القانونية للمشغّل والقانون
          الحاكم <PendingTag /> — وقد تُحدَّث.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-03] ملفات تعريف الارتباط والتخزين المحلي ══════════════════ */

/** The REAL storage inventory — PAGES-GAP §2, each row cited to its
 * writer. The table the cookies page is WRITTEN FROM: same keys, same
 * purposes, same purge story as the code.
 * R366 L4: the purposes tightened to their noun core (the R355 review
 * kept them verbatim; the diet now carries the same facts in fewer
 * words — the key, what it stores, and the purge truth are unchanged). */
export const STORAGE_LEDGER = [
  { key: 'madarek.consent', purpose: 'قرار اللافتة (موافق/أرفض)', kind: 'أساسي', purge: 'هو نفسه' },
  { key: 'madarek.consent.record', purpose: 'القرار ووقته', kind: 'أساسي', purge: 'لا' },
  { key: 'madarek-theme', purpose: 'المظهر: فاتح/داكن/النظام', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-theme-profile', purpose: 'مظهر ما قبل التحميل', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-auth', purpose: 'جلسة الدخول والمؤسسة', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-ui', purpose: 'طيّ الشريط واللوحات', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-doc-side-w', purpose: 'عرض اللوحة الجانبية', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-academic-links', purpose: 'روابطك الأكاديمية', kind: 'بيانات مستخدم', purge: 'لا تُدمَّر' },
  { key: 'mdrk-auth::probe', purpose: 'فحص يُحذف فورًا', kind: 'عابر', purge: 'ينظّف نفسه' },
] as const;

export function CookiesPage() {
  useLegalMeta({
    title: COOKIES_TITLE,
    path: '/legal/cookies',
    description: 'الكوكي الوحيد وجدول المفاتيح.',
  });

  return (
    <LegalSheet
      title={COOKIES_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="المبدأ" id="cookies-principle" />
      <LegalCell>
        <p className="lg-p">
          التخزين محلي على جهازك، ولا يُرسل للخادم إلا ما يلزم طلبك؛
          والخطوط مستضافة داخليًا — لا تحليلات ولا تتبّع.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="جدول المفاتيح" id="cookies-table" />
      <LegalCell>
        <div className="lg-table-wrap">
          <table className="lg-table">
            <caption className="lg-table-caption">مفاتيح التخزين</caption>
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
                 * the thead is re-seated as per-row card lines.
                 * R366 L4: the card labels shortened to the noun (the
                 * column header keeps the full question). */
                <tr key={row.key}>
                  <td className="lg-table-key" dir="ltr" data-label="مفتاح">{row.key}</td>
                  <td data-label="غرض">{row.purpose}</td>
                  <td data-label="صنف">{row.kind}</td>
                  <td data-label="يُحذف؟">{row.purge}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lg-p">
          الرفض يحذف التفضيلات فقط — وبياناتك تبقى (القسم 04).
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الكوكي الوحيد" id="cookies-the-cookie" />
      <LegalCell>
        <p className="lg-p">
          كوكي واحد: <CodeRun>mdrk_refresh</CodeRun> — رمز تحديث الجلسة، <CodeRun>httpOnly</CodeRun>
          و<CodeRun>sameSite=strict</CodeRun> في <CodeRun>/api/v1/auth</CodeRun>،
          وينتهي خلال <CodeRun>7d</CodeRun>. حذفه يُخرجك من الجهاز.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="عند الرفض" id="cookies-reject" />
      <LegalCell>
        <p className="lg-p">
          تُحذف عند الرفض مفاتيح التفضيلات <CodeRun>mdrk-ui</CodeRun> و<CodeRun>mdrk-doc-side-w</CodeRun>؛
          وقرارك يُحفظ فلا تُسأل مجددًا.
        </p>
        <p className="lg-p">
          أما <CodeRun>mdrk-academic-links</CodeRun> <strong>فلا يُمس عند الرفض</strong>:
          بياناتك التي كتبتَها تبقى ملكك.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="المتصفح" id="cookies-browser" />
      <LegalCell>
        <p className="lg-p">
          امسح التخزين والكوكيز من إعدادات متصفحك.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-04] بيان إمكانية الوصول ═══════════════════════════════════ */

export function AccessibilityPage() {
  useLegalMeta({
    title: A11Y_TITLE,
    path: '/legal/accessibility',
    description: 'ما يُطبَّق فعلًا.',
  });

  return (
    <LegalSheet
      title={A11Y_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما نطبّقه" id="a11y-ships" />
      <LegalCell>
        <ul className="lg-list">
          <li>الواجهة عربية <CodeRun>rtl</CodeRun> من الأساس.</li>
          <li>روابط تخطٍّ في كل سطح، وتنقّل بلوحة المفاتيح بحلقات تركيز.</li>
          <li>أرضية لمس <CodeRun>44px</CodeRun> للأهداف التفاعلية.</li>
          <li>احترام «تقليل الحركة» في النظام.</li>
          <li>بوابات تباين في فحوص التكامل.</li>
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
          واجهت عائقًا؟ أخبرنا عبر <Link to="/contact" className="lg-link">{CONTACT_CHANNEL}</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-05] الأمن والإفصاح المسؤول ════════════════════════════════ */

export function SecurityPage() {
  useLegalMeta({
    title: SECURITY_TITLE,
    path: '/legal/security',
    description: 'الضوابط المطبَّقة فعلًا.',
  });

  return (
    <LegalSheet
      title={SECURITY_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="الضوابط المطبَّقة" id="sec-controls" />
      <LegalCell>
        <ul className="lg-list">
          <li>كلمات المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun> (<CodeRun>12-72</CodeRun> محرفًا) والشائعة مرفوضة.</li>
          <li>رمز وصول (<CodeRun>15m</CodeRun>) ورمز تحديث (<CodeRun>7d</CodeRun>) يدور عند كل تجديد؛ تغيير كلمة المرور يُبطل الجلسات.</li>
          <li>رمز التحديث في كوكي <CodeRun>httpOnly</CodeRun> و<CodeRun>sameSite=strict</CodeRun> في <CodeRun>/api/v1/auth</CodeRun> — لا يقرؤه سكربت.</li>
          <li>تحديد معدل المحاولات لكل IP، وقفل الحساب مؤقتًا بعد الفشل المتكرر.</li>
          <li>الأذونات تُفرض في الخادم حسب الدور؛ والمرفوض يعيد <CodeRun>403</CodeRun>.</li>
          <li>رؤوس سياسة أمان المحتوى (<CodeRun>CSP</CodeRun>) مع كل صفحة.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا ندّعيه" id="sec-no-claims" />
      <LegalCell>
        <p className="lg-p">
          لا شهادة <CodeRun>ISO</CodeRun> ولا <CodeRun>SOC</CodeRun> ولا اعتماد <CodeRun>GDPR</CodeRun> اليوم —
          وأي اعتماد يُعلن مع وثيقته.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الإفصاح المسؤول" id="sec-disclosure" />
      <LegalCell>
        <p className="lg-p">
          رصدت ثغرة؟ بلّغنا عبر <Link to="/contact" className="lg-link">{CONTACT_CHANNEL}</Link>.
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
    title: DATA_TITLE,
    path: '/legal/data',
    description: 'بيانات العرض مقابل بياناتك.',
  });

  return (
    <LegalSheet
      title={DATA_TITLE}
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="النوعان" id="data-types" />
      <LegalCell>
        <p className="lg-p">
          <strong>بيانات مبذورة اصطناعية بالكامل:</strong> «مؤسسة مدارك النموذجية» بكلياتها ومقرراتها
          وحسابات <CodeRun>@test.ly</CodeRun> ونتائجها —
          لا تمثّل أحدًا حقيقيًا.
        </p>
        <p className="lg-p">
          <strong>بياناتك الحقيقية:</strong> ما تدخله عند التسجيل وما تكتبه وترفعه.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="كيف تعرف الفرق" id="data-ledger" />
      <LegalCell>
        <p className="lg-p">
          سجلّ القدرات <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> يفصل
          الحقيقي من المحاكاة — وما لم يُذكر فهو عرض.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="التخزين والاحتفاظ" id="data-retention" />
      <LegalCell>
        <p className="lg-p">
          النوعان في مكان واحد (<Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link>)؛
          وكله عرض حتى استكمال سياسة الاحتفاظ <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأطراف الثالثة" id="data-third" />
      <LegalCell>
        <p className="lg-p">
          المساعد الأكاديمي وحده قد يغادر الخادم (التفصيل في الخصوصية).
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
