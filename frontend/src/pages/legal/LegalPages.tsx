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
    description: 'ما تجمعه مدارك من بيانات ولماذا وأين تُخزَّن، وحقوقك — من سلوك المنصّة الفعلي.',
  });

  return (
    <LegalSheet
      title="سياسة الخصوصية"
      lede="ما نجمعه فعلًا من سلوك المنصّة — لا وعود. ما لا نعرفه بعد يُكتب بوضوح: [يُستكمل قبل الإطلاق]."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما الذي نجمعه" id="privacy-collect" />
      <LegalCell>
        <ul className="lg-list">
          <li>عند إنشاء الحساب: <strong>البريد الإلكتروني والاسم والدور</strong> (طالب أو أستاذ أو مسجل عام…) ولون الصورة الرمزية وحروفها الأولى.</li>
          <li>للطالب: الكلية والقسم والسنة الدراسية ورقم التسجيل.</li>
          <li>للأستاذ: المسمّى الأكاديمي.</li>
        </ul>
        <p className="lg-p">
          <strong>كلمة المرور لا تُخزَّن نصًا أبدًا</strong> — تُحوَّل عند إنشائها إلى تجزئة عبر خوارزمية <CodeRun>argon2</CodeRun>.
        </p>
        <p className="lg-p">
          وما تكتبه داخل المنصّة يُخزَّن مع حسابك: الرسائل والإشعارات، محادثات المساعد الأكاديمي،
          البحوث والمواد التي ترفعها، وإجابات الاختبارات. وتحتفظ المنصّة بسجلّ تدقيق لعملياتها (من فعل ماذا ومتى).
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="لماذا نجمعه" id="privacy-why" />
      <LegalCell>
        <p className="lg-p">لغرض واحد: تشغيل منصّة تعليمية تجريبية.</p>
        <ul className="lg-list">
          <li>تسجيل المقررات ومتابعة التقدّم والمصفوفة.</li>
          <li>الرسائل مع الأساتذة والزملاء.</li>
          <li>تصحيح الاختبارات وحفظ المواد.</li>
          <li>لا نبيع بياناتك ولا نشاركها.</li>
          <li>لا تحليلات ولا إعلانات.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={3} title="أين يُخزَّن" id="privacy-where" />
      <LegalCell>
        <p className="lg-p">
          خدمة الويب تعمل على <strong>Render</strong>، وقاعدة البيانات <CodeRun>PostgreSQL</CodeRun> مُدارة على
          <strong> Neon</strong>. الملفات المرفوعة (البحوث والمواد) تُخزَّن في مخزن يحدده المشغّل: قرص محلي، أو مخزن
          متوافق مع <CodeRun>S3</CodeRun>، أو داخل قاعدة البيانات نفسها. لا خوادم أخرى تُستقبل بياناتك.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="مدة الاحتفاظ" id="privacy-retention" />
      <LegalCell>
        <p className="lg-p">
          اليوم: رمز الوصول ينتهي خلال <CodeRun>15m</CodeRun> ورمز تحديث الجلسة خلال
          <CodeRun> 7d</CodeRun>، وسجل قرارك على لافتة التخزين يبقى حتى تغيير قرارك. أما سياسة الاحتفاظ الكاملة
          وطلب حذف الحساب <PendingTag /> — وحتى ذلك الحين تُعامل جميع البيانات كبيانات عرض.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="حقوقك" id="privacy-rights" />
      <LegalCell>
        <p className="lg-p">
          يمكنك تعديل بيانات ملفك من صفحتك، وتغيير كلمة مرورك في أي وقت — تُنهي التغييرة جلساتك
          على كل الأجهزة. ولطلب تصدير بياناتك أو حذف حسابك فالطريق اليوم هو قناة التواصل (القسم 08) —
          آلية التنفيذ ومدة الاستجابة <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="الأطراف الثالثة" id="privacy-third-parties" />
      <LegalCell>
        <p className="lg-p">
          طرف واحد محتمل فقط: <strong>المساعد الأكاديمي الذكي</strong> — ميزة اختيارية عبر مزوّد
          متوافق مع <CodeRun>OpenAI</CodeRun> يحدده المشغّل، ويُوسم بصدق في الواجهة
          (<CodeRun>openai</CodeRun> أو <CodeRun>openrouter</CodeRun> أو <CodeRun>groq</CodeRun> حسب المضيف).
        </p>
        <ul className="lg-list">
          <li>عند تعطيل المزوّد: أداة محلية داخل الخادم، لا إرسال للخارج.</li>
          <li>المزوّد الفعلي المُعد في الإنتاج <PendingTag />.</li>
          <li>شروط معالجة المزوّد لمحتوى المحادثات <PendingTag />.</li>
        </ul>
        <p className="lg-p">
          غير ذلك: لا تحليلات، لا إعلانات، لا برامج تتبّع، لا خطوط من خدمات خارجية.
        </p>
      </LegalCell>

      <LegalSectionBar index={7} title="ملفات تعريف الارتباط والتخزين المحلي" id="privacy-storage" />
      <LegalCell>
        <p className="lg-p">
          تكتب مدارك على جهازك <strong>كوكيًا واحدًا</strong> (<CodeRun>mdrk_refresh</CodeRun>) و
          <strong> تسعة مفاتيح تخزين محلي</strong> — لكل مفتاح غرض معلن؛ الجدول الكامل مع ما يُحذف عند
          الرفض في <Link to="/legal/cookies" className="lg-link">صفحة التخزين المحلي</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={8} title="التواصل" id="privacy-contact" />
      <LegalCell>
        <p className="lg-p">
          قناة التواصل اليوم: التسجيل المبكر من صفحة البداية — لا بريد عام بعد. التفاصيل في
          <Link to="/contact" className="lg-link">صفحة التواصل</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={9} title="آخر تحديث" id="privacy-updated" />
      <LegalCell>
        <p className="lg-p">
          تُراجع هذه الصاسة وتُختم قبل الإطلاق وقبل أي تعديل جوهري — التاريخ أسفل الصفحة.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}

/* ═══ [L-02] شروط الاستخدام ═════════════════════════════════════════ */

export function TermsPage() {
  useLegalMeta({
    title: 'شروط الاستخدام',
    path: '/legal/terms',
    description: 'شروط استخدام منصّة مدارك التجريبية — ما هي المنصّة وما ليست، وقواعد الحساب والمحتوى.',
  });

  return (
    <LegalSheet
      title="شروط الاستخدام"
      lede="شروط قصيرة وصادقة لمنصّة تجريبية: ما هي مدارك بالضبط، وما ليست، وما نطلبه منك مقابل حسابك."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما هي مدارك" id="terms-what" />
      <LegalCell>
        <p className="lg-p">
          مدارك منصّة تعليمية تقنية مستقلّة، عربية أولًا — لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها؛
          وبيانات العرض داخلها تخصّ «مؤسسة مدارك النموذجية» الاصطناعية بالكامل.
        </p>
        <p className="lg-p">
          <strong>مدارك ليست جامعة معتمدة ولا تمنح درجات</strong> — الكليات والمقررات والنتائج
          داخلها محتوى عرض تجريبي.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="الحساب" id="terms-account" />
      <LegalCell>
        <p className="lg-p">
          كلمة المرور يجب أن تكون بين <CodeRun>12</CodeRun> و<CodeRun>72</CodeRun> محرفًا، وتُرفض الكلمات
          الشائعة المسجَّلة في قائمة المنع. أنت مسؤول عن حسابك وعمّا يُكتب منه.
        </p>
        <p className="lg-p">
          للتجربة ننشر <strong>حسابات اختبار</strong> على نطاق <CodeRun>@test.ly</CodeRun> بكلمة مرور واحدة
          معروفة — حسابات مكشوفة بتصميمها: لا بيانات حقيقية فيها ولا خصوصية.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="المحتوى" id="terms-content" />
      <LegalCell>
        <p className="lg-p">
          ما ترفعه وتكتبه أنت (بحوثك، موادك، رسائلك) يبقى لك — وبيانات العرض اصطناعية بالكامل.
          الفصل بينهما موثّق في <Link to="/legal/data" className="lg-link">صفحة البيانات</Link>.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الخدمة كما هي" id="terms-as-is" />
      <LegalCell>
        <p className="lg-p">
          المنصّة تجريبية وتُقدَّم <strong>«كما هي»</strong>: قد تتغير الميزات أو تتوقف خدمات دون إشعار،
          ولا ضمانات للاستمرارية أو الخلوّ من الأخطاء.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="المشغّل والقانون الحاكم" id="terms-operator" />
      <LegalCell>
        <p className="lg-p">
          تُشغَّل مدارك حاليًا كمشروع تقني تجريبي مستقل؛ الهوية القانونية للمشغّل <PendingTag />، والقانون
          الحاكم لهذه الشروط <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="تعديل الشروط" id="terms-changes" />
      <LegalCell>
        <p className="lg-p">
          قد نحدّث هذه الشروط مع تطوير المنصّة — آخر تحديث أسفل الصفحة هو المرجع:
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
  { key: 'madarek.consent', purpose: 'قرارك على لافتة التخزين (موافق/أرفض)', kind: 'أساسي', purge: 'لا — هو القرار نفسه' },
  { key: 'madarek.consent.record', purpose: 'سجل القرار مع طابعه الزمني (JSON)', kind: 'أساسي', purge: 'لا' },
  { key: 'madarek-theme', purpose: 'اختيارك للمظهر: فاتح أو داكن أو النظام', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-theme-profile', purpose: 'ذاكرة المظهر قبل تحميل الصفحة', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-auth', purpose: 'جلسة الدخول: المستخدم ورمز الوصول القصير وسياق المؤسسة', kind: 'أساسي', purge: 'لا' },
  { key: 'mdrk-ui', purpose: 'طيّ الشريط الجانبي وآخر اللوحات المفتوحة (4 على الأكثر)', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-doc-side-w', purpose: 'عرض اللوحة الجانبية في عارض المستندات', kind: 'تفضيل', purge: 'نعم' },
  { key: 'mdrk-academic-links', purpose: 'روابطك الأكاديمية التي تحفظها بنفسك — بياناتك أنت', kind: 'بيانات مستخدم', purge: 'لا — لا تُدمَّر أبدًا' },
  { key: 'mdrk-auth::probe', purpose: 'فحص توفر التخزين — يُكتب ويُحذف في اللحظة نفسها', kind: 'عابر', purge: 'ينظّف نفسه' },
] as const;

export function CookiesPage() {
  useLegalMeta({
    title: 'ملفات تعريف الارتباط والتخزين المحلي',
    path: '/legal/cookies',
    description: 'الكوكي الوحيد ومفاتيح التخزين المحلي التسعة التي تكتبها منصّة مدارك — الجدول الكامل وما يُحذف عند الرفض.',
  });

  return (
    <LegalSheet
      title="ملفات تعريف الارتباط والتخزين المحلي"
      lede="هذه هي القائمة الكاملة لما تكتبه مدارك على جهازك: كوكي واحد وتسعة مفاتيح تخزين محلي — لا شيء غيرها، ولا تحليلات ولا تتبّع."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="المبدأ" id="cookies-principle" />
      <LegalCell>
        <p className="lg-p">
          التخزين المحلي يبقى على جهازك — لا يُرسل إلى الخادم إلا ما يلزم طلبك نفسه. لا سكربتات
          تحليلات أو إعلانات أو تتبّع من أي طرف ثالث — والخطوط مستضافة داخل المنصّة.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="جدول المفاتيح" id="cookies-table" />
      <LegalCell>
        <div className="lg-table-wrap">
          <table className="lg-table">
            <caption className="lg-table-caption">مفاتيح التخزين المحلي التي تكتبها المنصّة — كاملة</caption>
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
          «يُحذف عند الرفض»: تُمسح مفاتيح التفضيلات القابلة للاشتقاق — وتبقى بياناتك أنت
          كما هي (التفصيل في القسم 04).
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الكوكي الوحيد" id="cookies-the-cookie" />
      <LegalCell>
        <p className="lg-p">
          كوكي واحد فقط: <CodeRun>mdrk_refresh</CodeRun> — يحمل رمز تحديث الجلسة، بسمات <CodeRun>httpOnly</CodeRun>
          (لا تقرؤه سكربتات الصفحة) و<CodeRun>sameSite=strict</CodeRun>، ومحصور في المسار <CodeRun>/api/v1/auth</CodeRun>،
          وينتهي خلال <CodeRun>7d</CodeRun> مع دوران الرمز. حذفك له من المتصفح يعني تسجيل خروجك من هذا الجهاز.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الرفض وما يحدث عنده" id="cookies-reject" />
      <LegalCell>
        <p className="lg-p">
          عند الرفض تُحذف مفاتيح التفضيلات <CodeRun>mdrk-ui</CodeRun> و<CodeRun>mdrk-doc-side-w</CodeRun> —
          كلاهما تُعيد المنصّة اشتقاقه افتراضيًا، فلا يتعطل شيء. ويُحفظ قرار الرفض نفسه
          حتى لا تُسأل في كل زيارة.
        </p>
        <p className="lg-p">
          أما <CodeRun>mdrk-academic-links</CodeRun> (روابطك الأكاديمية) <strong>فلا يُمس عند الرفض
          أبدًا</strong>: بياناتك التي كتبتَها تبقى ملكك — وكذلك جلسة الدخول واختيار المظهر وذاكرته.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="المتصفح" id="cookies-browser" />
      <LegalCell>
        <p className="lg-p">
          يمكنك في أي وقت مسح التخزين المحلي والكوكيز من إعدادات متصفحك — أدوات المنصّة لا تحتاج
          أكثر من الجدول أعلاه لتعمل من جديد.
        </p>
      </LegalCell>

      <LegalSectionBar index={6} title="آخر تحديث" id="cookies-updated" />
      <LegalCell>
        <p className="lg-p">
          الجدول يُحدَّث في الوقت نفسه مع أي مفتاح جديد يضيفه التطوير — التاريخ أسفل الصفحة.
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
    description: 'ما تطبّقه مدارك فعلًا لإمكانية الوصول — عربية أولًا، لوحة مفاتيح، تقليل الحركة، تباين.',
  });

  return (
    <LegalSheet
      title="بيان إمكانية الوصول"
      lede="هذا البيان يذكر ما يشحنه التطبيق فعلًا اليوم — لا ادّعاء اجتياز معيار رسمي قبل أن يحدث."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما نطبّقه اليوم" id="a11y-ships" />
      <LegalCell>
        <ul className="lg-list">
          <li>عربية أولًا: الواجهة <CodeRun>rtl</CodeRun> من الأساس، لا طبقة مترجمة.</li>
          <li>روابط «تخطَّ إلى المحتوى» في كل سطح، وتنقّل منطقي بلوحة المفاتيح مع حلقات تركيز ظاهرة.</li>
          <li>أرضية لمس لا تقل عن <CodeRun>44px</CodeRun> للأهداف التفاعلية على الشاشات الصغيرة.</li>
          <li>احترام إعداد «تقليل الحركة» في النظام: تنهار الحركات إلى ظهور هادئ.</li>
          <li>بوابات تباين ضمن فحوص التكامل المستمرة، فاتحًا وداكنًا.</li>
          <li>اقتران خطّي <CodeRun>IBM Plex Sans Arabic</CodeRun> للنص و<CodeRun>Geist Mono</CodeRun> للأرقام والرموز.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={2} title="الحدود المعروفة" id="a11y-limits" />
      <LegalCell>
        <p className="lg-p">
          لم يُجرَ تقييم رسمي بعد، ومستوى الالتزام المستهدف (مثل <CodeRun>WCAG 2.1 AA</CodeRun>)
          <PendingTag /> — لا نعلن اجتيازًا لم نُختبر عليه.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الإبلاغ عن عائق" id="a11y-report" />
      <LegalCell>
        <p className="lg-p">
          إن واجهت عائقًا فأخبرنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link> — وصف الخطوة
          والمتصفح يعجّل الإصلاح.
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
    description: 'الضوابط الأمنية المطبَّقة فعلًا — تجزئة كلمات المرور، دوران الجلسات، الحدود.',
  });

  return (
    <LegalSheet
      title="الأمن والإفصاح المسؤول"
      lede="قائمة الضوابط التي يشحنها النظام فعلًا — لا شهادات ولا اعتمادات: لا ندّعي ما ليس لدينا."
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="الضوابط المطبَّقة" id="sec-controls" />
      <LegalCell>
        <ul className="lg-list">
          <li>كلمات المرور تُجزَّأ بـ <CodeRun>argon2</CodeRun>، وسياستها <CodeRun>12-72</CodeRun> محرفًا مع قائمة منع للكلمات الشائعة.</li>
          <li>رمز وصول قصير (<CodeRun>15m</CodeRun>) ورمز تحديث (<CodeRun>7d</CodeRun>) يدور عند كل تجديد؛ وتغيير كلمة المرور يُبطل جلسات كل الأجهزة فورًا.</li>
          <li>رمز التحديث في كوكي <CodeRun>httpOnly</CodeRun> بسمة <CodeRun>sameSite=strict</CodeRun> محصور في <CodeRun>/api/v1/auth</CodeRun> — لا يستطيع أي سكربت في الصفحة قراءته.</li>
          <li>تحديد معدل المحاولات لكل عنوان IP، وقفل الحساب مؤقتًا بعد المحاولات الفاشلة المتكررة.</li>
          <li>الأذونات تُفرض في الخادم لكل مسار حسب الدور — المرفوض يعيد <CodeRun>403</CodeRun> من الخادم، لا من الواجهة فقط.</li>
          <li>رؤوس سياسة أمان المحتوى (<CodeRun>CSP</CodeRun>) تُرسل مع الصفحة.</li>
        </ul>
      </LegalCell>

      <LegalSectionBar index={2} title="ما لا ندّعيه" id="sec-no-claims" />
      <LegalCell>
        <p className="lg-p">
          لا شهادة <CodeRun>ISO</CodeRun> ولا <CodeRun>SOC</CodeRun> ولا اعتماد <CodeRun>GDPR</CodeRun> — لا يوجد
          أي منها اليوم، ولا نضع شعاراتها. إن أُضيف اعتماد يومًا فسيُعلن هنا مع وثيقته.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="الإفصاح المسؤول" id="sec-disclosure" />
      <LegalCell>
        <p className="lg-p">
          إن رصدت ثغرة فبلّغنا عبر <Link to="/contact" className="lg-link">قناة التواصل</Link> — نقدّر الإبلاغ
          المسؤول. سياسة الإفصاح التفصيلية (النطاق ومدة الاستجابة والملاذ الآمن)
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
    description: 'الفصل بين البيانات الاصطناعية المبذورة وبياناتك الحقيقية داخل منصّة مدارك التجريبية.',
  });

  return (
    <LegalSheet
      title="البيانات وبيانات العرض"
      lede="سؤال واحد: ما الذي داخل مدارك اصطناعي للعرض، وما الذي بيانات حقيقية كتبتها أنت؟"
      updated={LEGAL_UPDATED}
    >
      <LegalSectionBar index={1} title="ما الذي نجمعه — النوعان" id="data-types" />
      <LegalCell>
        <p className="lg-p">
          <strong>بيانات مبذورة اصطناعية بالكامل:</strong> «مؤسسة مدارك النموذجية» بكلياتها ومقرراتها
          وخططها الدراسية، والمستخدمون التجريبيون وحسابات الاختبار <CodeRun>@test.ly</CodeRun> ونتائجهم —
          كلها من سكربت البذرة لأغراض العرض، ولا تمثّل أحدًا حقيقيًا.
        </p>
        <p className="lg-p">
          <strong>بياناتك الحقيقية:</strong> ما تدخله عند التسجيل (بريدك واسمك وملفك الأكاديمي)، وما
          تكتبه أو ترفعه — رسائلك، بحوثك، موادك، إجاباتك.
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="كيف تعرف الفرق" id="data-ledger" />
      <LegalCell>
        <p className="lg-p">
          سجلّ القدرات <Link to="/capabilities" className="lg-link">«ما يعمل اليوم»</Link> يفصل بصدق بين ما
          يعمل حقيقة وما هو محاكاة — والمبدأ نفسه يسري على البيانات: ما لم يُذكر أنه حقيقي
          فهو عرض تجريبي.
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="أين تُخزَّن ومدة الاحتفاظ" id="data-retention" />
      <LegalCell>
        <p className="lg-p">
          النوعان في المكان نفسه: الويب على <strong>Render</strong> وقاعدة <CodeRun>PostgreSQL</CodeRun>
          على <strong>Neon</strong> (التفصيل في <Link to="/legal/privacy" className="lg-link">سياسة الخصوصية</Link>).
          وتُعامل جميع البيانات كبيانات عرض حتى استكمال سياسة الاحتفاظ <PendingTag />.
        </p>
      </LegalCell>

      <LegalSectionBar index={4} title="الأطراف الثالثة" id="data-third" />
      <LegalCell>
        <p className="lg-p">
          المساعد الأكاديمي وحده قد يغادر الخادم (مزوّد متوافق مع <CodeRun>OpenAI</CodeRun> حسب الإعداد، أو
          أداة محلية عند تعطيله) — والتفصيل في سياسة الخصوصية. لا تحليلات ولا إعلانات.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
