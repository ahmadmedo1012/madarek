/**
 * seed-pilot — r323 B4 — the pilot cohort pack (idempotent, create-once).
 *
 * The brief: «≥ 8 realistic Arabic courses with weeks, materials,
 * assignments, ≥ 2 exams, ≥ 3 lectures each with chapters +
 * checkpoints, 30 sample students with plausible activity — clearly
 * flagged demo, removable by one registrar action». seed.ts already
 * ships the two institutions, the 25-faculty skeleton, SE301's rich
 * lectures and the exam pair; this module completes the pack:
 *
 *   - the 8th-course floor (DB302 + DS302 join the six 301 codes)
 *   - ≥ 3 lectures (3 chapters + 1 checkpoint each) per course that
 *     lacks them — SE301's authored set is never touched
 *   - one material + one assignment per offering that lacks them
 *   - 30 demo students (@demo.madarek.ly — the flag the registrar's
 *     «حذف بيانات العرض» action sweeps), enrolled across 5 of the 8
 *     offerings each, with a QUIZ_1 grade on their first course and
 *     an attendance row on today's SE301 session
 *   - progressPct stays 0 — the watch-event recompute is the only
 *     truth; a decorative percentage would be the frozen-lie class
 *     the premium-polish P0-2 note bans.
 *
 * Every write is an upsert / findFirst-guarded create: re-runs are
 * no-ops, teacher-authored rows are never rebuilt or overwritten.
 */
import { AssignmentType, GradeKind, MaterialType, PrismaClient, Role } from '@prisma/client';
// Same hash/dates helpers seed.ts rides (relative-to-prisma paths).
import { hashPassword } from '../src/lib/password.js';
import { utcDayStart } from '../src/lib/dates.js';

/** The demo-cohort flag: every pilot-sample student carries this
 *  domain — the registrar's removal action sweeps exactly it. */
export const DEMO_EMAIL_DOMAIN = '@demo.madarek.ly';

const TERM = '2024-FALL';

/** The two courses that lift the floor from 6 to 8 — same honest
 *  fictional catalogue grammar as seed.ts's six. */
const EXTRA_COURSE_DEFS = [
  { code: 'DB302', name: 'قواعد البيانات', icon: '🗄️', color: '#7E57C2' },
  { code: 'DS302', name: 'هياكل البيانات والخوارزميات', icon: '🧮', color: '#26A69A' },
] as const;

/** 30 realistic Arabic student names (first + last) — the pilot
 *  roster's faces. Demo-flagged by the email domain, never by a name
 *  gimmick: the roster must look like a real section. */
const STUDENT_NAMES = [
  'محمد الأمين الفيتوري', 'أسماء بن عمران', 'يوسف القذافي الورفلي', 'هبة الله المبروك',
  'عبد الرحمن الطرابلسي', 'مريم الشريف', 'إبراهيم الككلي', 'نور الهدى الزوي',
  'طلال البرعصي', 'سارة العقيلي', 'خالد المصراتي', 'جميلة الورفلي',
  'عمر بن سعيد', 'فاطمة القدادري', 'أحمد الرقيعي', 'ليلى بن عيسى',
  'الصديق الزنتاني', 'رقيّة الشويهدي', 'منصور العجيلي', 'أمل السويحلي',
  'طارق بن يونس', 'هيفاء الفرجاني', 'بدر الدين الكردي', 'سلمى الحسني',
  'نوري العبيدي', 'دعاء المغربي', 'شعبان الأحمر', 'وفاء الباروني',
  'ياسر درسي', 'عائشة الزليتني',
];

const MATERIAL_NAMES = [
  'مذكرة المحاضرات — الملخص الأساسي', 'سلايدات الأسبوع الأول (PDF)', 'ورقة تمارين محلولة',
];

/** Per-course lecture packs (3 each): title, description, the three
 *  chapter titles with their start/end seconds, and ONE checkpoint —
 *  original Arabic content, honest to the course's actual subject. */
const LECTURE_PACKS: Record<string, {
  title: string; description: string; durationSec: number;
  chapters: { title: string; startSec: number; endSec: number }[];
  checkpoint: { triggerSec: number; question: string; options: string[]; correctIndex: number; explanation: string };
}[]> = {
  CT301: [
    {
      title: 'مكونات الحاسوب وبنيته', description: 'من وحدة المعالجة إلى الذاكرة: كيف تتعاون طبقات الجهاز.',
      durationSec: 1500,
      chapters: [
        { title: 'وحدة المعالجة المركزية ودورة التعليمات', startSec: 0, endSec: 520 },
        { title: 'سلّم الذاكير: من الكاش إلى القرص', startSec: 520, endSec: 1080 },
        { title: 'المداخل والمخارج والناقل', startSec: 1080, endSec: 1500 },
      ],
      checkpoint: {
        triggerSec: 500, question: 'أي ترتيب يمثّل سرعة الوصول من الأسرع إلى الأبطأ؟',
        options: ['كاش ← ذاكرة رئيسية ← قرص', 'قرص ← ذاكرة رئيسية ← كاش', 'ذاكرة رئيسية ← كاش ← قرص'],
        correctIndex: 0, explanation: 'الكاش الأسرع ثم الذاكرة الرئيسية ثم التخزين الدائم.',
      },
    },
    {
      title: 'تمثيل البيانات والأرقام', description: 'الثنائي والست عشري وكيف تُخزَّن الأعداد والنصوص.',
      durationSec: 1320,
      chapters: [
        { title: 'النظام الثنائي والتحويلات', startSec: 0, endSec: 450 },
        { title: 'المتممة الثنائية والأعداد السالبة', startSec: 450, endSec: 900 },
        { title: 'ترميز النصوص: ASCII وUnicode', startSec: 900, endSec: 1320 },
      ],
      checkpoint: {
        triggerSec: 880, question: 'كم بتًا يحتاج تمثيل القيمة −1 بالمتممة الثنائية بثمانية بتات؟',
        options: ['11111111', '10000001', '00000001'],
        correctIndex: 0, explanation: 'بالمتممة الثنائية فإن −1 تُمثَّل بقلب جميع البتات حول صفر.',
      },
    },
    {
      title: 'أنظمة التشغيل: الدور والوظائف', description: 'الجدولة والذاكرة الافتراضية وعمليات الإدخال/الإخراج.',
      durationSec: 1440,
      chapters: [
        { title: 'طبقات النظام وواجهة الاستدعاء', startSec: 0, endSec: 480 },
        { title: 'جدولة العمليات والتبديل السياقي', startSec: 480, endSec: 1000 },
        { title: 'الذاكرة الافتراضية والترحيل', startSec: 1000, endSec: 1440 },
      ],
      checkpoint: {
        triggerSec: 980, question: 'ما الهدف الأساسي من الذاكرة الافتراضية؟',
        options: ['عزل العمليات وتوسيع العنوان المنطقي', 'تسريع الشبكة', 'تقليل حجم البرنامج على القرص'],
        correctIndex: 0, explanation: 'الافتراضية تعزل العمليات وتمنح كل واحدة فضاء عناوين مستقلًا.',
      },
    },
  ],
  IS301: [
    {
      title: 'دورة حياة تطوير النظم (SDLC)', description: 'من التحليل إلى الصيانة: مراحل بناء النظم وأساليبها.',
      durationSec: 1560,
      chapters: [
        { title: 'التحليل وجمع المتطلبات', startSec: 0, endSec: 540 },
        { title: 'التصميم المنطقي والفيزيائي', startSec: 540, endSec: 1100 },
        { title: 'التنفيذ والاختبار والصيانة', startSec: 1100, endSec: 1560 },
      ],
      checkpoint: {
        triggerSec: 520, question: 'أي نشاط ينتمي إلى مرحلة التحليل لا التصميم؟',
        options: ['مقابلات المستخدمين وجمع المتطلبات', 'رسم مخططات قاعدة البيانات', 'كتابة كود الواجهة'],
        correctIndex: 0, explanation: 'التحليل يفهم «ماذا» يُبنى؛ التصميم يحدد «كيف».',
      },
    },
    {
      title: 'مخططات تدفق البيانات (DFD)', description: 'قراءة ورسم DFD بالمستويات: السياق والتفصيل.',
      durationSec: 1380,
      chapters: [
        { title: 'مخطط السياق ومحدودية النطاق', startSec: 0, endSec: 460 },
        { title: 'المستوى صفر: العمليات والمخازن', startSec: 460, endSec: 960 },
        { title: 'التوازن بين المستويات', startSec: 960, endSec: 1380 },
      ],
      checkpoint: {
        triggerSec: 940, question: 'قاعدة التوازن في DFD تعني:',
        options: ['تطابق التدفقات الداخلة والخارجة بين المستويات', 'تساوي عدد العمليات', 'حجم مخزن البيانات ثابت'],
        correctIndex: 0, explanation: 'ما يدخل/يخرج عملية في مستوى أدق يجب أن يطابق مستواها الأعلى.',
      },
    },
    {
      title: 'أمن النظم المعلوماتية الإداري', description: 'السرية والسلامة والتوافر وضوابطها الإدارية.',
      durationSec: 1260,
      chapters: [
        { title: 'مثلث CIA وتهديداته', startSec: 0, endSec: 430 },
        { title: 'الضوابط الإدارية والتقنية', startSec: 430, endSec: 880 },
        { title: 'خطط الاستمرارية والتعافي', startSec: 880, endSec: 1260 },
      ],
      checkpoint: {
        triggerSec: 860, question: 'خطة التعافي من الكوارث تحمي أساسًا:',
        options: ['استمرارية الخدمة وسلامة البيانات', 'جمال الواجهة', 'سرعة الشبكة فقط'],
        correctIndex: 0, explanation: 'الهدف إعادة الخدمة خلال زمن مقبول وببيانات سليمة.',
      },
    },
  ],
  NET301: [
    {
      title: 'نموذج OSI وطبقاته السبع', description: 'رحلة الحزمة من الفيزياء إلى التطبيق.',
      durationSec: 1620,
      chapters: [
        { title: 'لماذا التقسيم إلى طبقات؟', startSec: 0, endSec: 520 },
        { title: 'الطبقات الدنيا: فيزيائي وربط بيانات', startSec: 520, endSec: 1120 },
        { title: 'الشبكة والنقل وما فوقها', startSec: 1120, endSec: 1620 },
      ],
      checkpoint: {
        triggerSec: 1100, question: 'أي طبقة تتكفل بالتوجيه بين الشبكات؟',
        options: ['طبقة الشبكة', 'طبقة النقل', 'طبقة الجلسة'],
        correctIndex: 0, explanation: 'التوجيه (Routing) عمل طبقة الشبكة (IP).',
      },
    },
    {
      title: 'عناوين IP والإرسال الفرعي', description: 'IPv4 والقناع والحساب الشبكي بالأمثلة.',
      durationSec: 1500,
      chapters: [
        { title: 'بنية العنوان والتصنيف التاريخي', startSec: 0, endSec: 500 },
        { title: 'قناع الشبكة وعملية AND', startSec: 500, endSec: 1020 },
        { title: 'تقسيم الشبكات (Subnetting) بمثال محلول', startSec: 1020, endSec: 1500 },
      ],
      checkpoint: {
        triggerSec: 1000, question: 'عدد الأجهزة الممكنة في شبكة /26 هو:',
        options: ['62', '64', '30'],
        correctIndex: 0, explanation: '‏/26 يترك 6 بتات للمضيف: 64 عنوانًا ناقص الشبكة والبث = 62.',
      },
    },
    {
      title: 'TCP مقابل UDP', description: 'متى نريد الموثوقية ومتى نريد السرعة.',
      durationSec: 1200,
      chapters: [
        { title: 'المصافحة الثلاثية وضمان الترتيب', startSec: 0, endSec: 420 },
        { title: 'UDP: البرقيات والبث الحي', startSec: 420, endSec: 830 },
        { title: 'اختيار البروتوكول بالحالة', startSec: 830, endSec: 1200 },
      ],
      checkpoint: {
        triggerSec: 810, question: 'أي خدمة تُبنى عادة على UDP؟',
        options: ['بث الفيديو الحي', 'تحويل بنكي', 'بريد إلكتروني'],
        correctIndex: 0, explanation: 'البث الحي يفضّل الاستمرارية على إعادة الإرسال.',
      },
    },
  ],
  WEB301: [
    {
      title: 'بنية الويب: HTTP والطلب والاستجابة', description: 'الأفعال والترويسات والحالات — لغة المتصفح مع الخادم.',
      durationSec: 1440,
      chapters: [
        { title: 'دورة الطلب/الاستجابة', startSec: 0, endSec: 480 },
        { title: 'الأفعال: GET وPOST وPUT وDELETE', startSec: 480, endSec: 980 },
        { title: 'رموز الحالة والترويسات المفيدة', startSec: 980, endSec: 1440 },
      ],
      checkpoint: {
        triggerSec: 960, question: '‏201 Created يُعاد عادة بعد:',
        options: ['إنشاء ناجح لمورد جديد', 'رفض مصادقة', 'انتهاء صلاحية'],
        correctIndex: 0, explanation: '‏201 تعني نجاح الإنشاء مع موقع المورد الجديد.',
      },
    },
    {
      title: 'HTML الدلالي و CSS الحديث', description: 'بنية معبّرة وتنسيق بمتغيرات وشبكات.',
      durationSec: 1560,
      chapters: [
        { title: 'دلالية العناصر وإتاحة الوصول', startSec: 0, endSec: 520 },
        { title: 'Flexbox وGrid عمليًا', startSec: 520, endSec: 1080 },
        { title: 'المتغيرات والاستجابة للاتجاه RTL', startSec: 1080, endSec: 1560 },
      ],
      checkpoint: {
        triggerSec: 500, question: 'أي عنصر يناسب الملاحة الرئيسية؟',
        options: ['<nav>', '<div>', '<section>'],
        correctIndex: 0, explanation: '‏<nav> يحمل كتلة الروابط الرئيسية دلاليًا وقارئات الشاشة تفهمه.',
      },
    },
    {
      title: 'JavaScript في المتصفح: DOM والأحداث', description: 'من التحديد إلى التفويض — تفاعل بلا ععبثية.',
      durationSec: 1620,
      chapters: [
        { title: 'شجرة DOM والاستعلام', startSec: 0, endSec: 540 },
        { title: 'الأحداث والتفويض', startSec: 540, endSec: 1120 },
        { title: 'التخزين المحلي والجلب (fetch)', startSec: 1120, endSec: 1620 },
      ],
      checkpoint: {
        triggerSec: 1100, question: 'تفويض الأحداث يعني:',
        options: ['الاستماع على الأب والاستفادة من الفقاعة', 'ربط مستمع لكل عنصر', 'تعطيل الأحداث'],
        correctIndex: 0, explanation: 'مستمع واحد على الحاوية يخدم الأبناء عبر event bubbling.',
      },
    },
  ],
  SEC301: [
    {
      title: 'أساسيات أمن المعلومات', description: 'التهديد والثغرة والخطر — والمصادقة مقابل التفويض.',
      durationSec: 1320,
      chapters: [
        { title: 'المصطلحات: ثغرة × استغلال × خطر', startSec: 0, endSec: 440 },
        { title: 'المصادقة والتفويض والتحقيق', startSec: 440, endSec: 900 },
        { title: 'الدفاع في العمق', startSec: 900, endSec: 1320 },
      ],
      checkpoint: {
        triggerSec: 880, question: 'الفرق بين المصادقة والتفويض:',
        options: ['من أنت؟ مقابل ما يُسمح لك به؟', 'كلمة مرور مقابل اسم مستخدم', 'شيء واحد بمرادفات'],
        correctIndex: 0, explanation: '‏AuthN تثبت الهوية؛ AuthZ تحدد الصلاحيات بعد ذلك.',
      },
    },
    {
      title: 'تشفير: متماثل وغير متماثل', description: 'AES وRSA والتوقيع والبصمة — بأمثلة واقعية.',
      durationSec: 1500,
      chapters: [
        { title: 'التشفير المتماثل ومشاركة المفتاح', startSec: 0, endSec: 500 },
        { title: 'زوج المفاتيح و RSA', startSec: 500, endSec: 1040 },
        { title: 'التوقيع الرقمي وسلاسل الشهادات', startSec: 1040, endSec: 1500 },
      ],
      checkpoint: {
        triggerSec: 1020, question: 'لإرسال رسالة سرية إلى زميل بمفتاحه العام تقوم بـ:',
        options: ['تشفيرها بالمفتاح العام له', 'تشفيرها بمفتاحك الخاص', 'تشفيرها بكلمة مرور مشتركة'],
        correctIndex: 0, explanation: 'المشفَّر بالمفتاح العام لا يُفك إلا بالمفتاح الخاص المقابل.',
      },
    },
    {
      title: 'ثغرات الويب الشائعة (OWASP)', description: '‏XSS وSQL Injection وCSRF — وكيف تُغلق كل واحدة.',
      durationSec: 1680,
      chapters: [
        { title: 'حقن SQL والاستعلامات المُعاملة', startSec: 0, endSec: 560 },
        { title: '‏XSS: المنعكس والمخزَّن', startSec: 560, endSec: 1160 },
        { title: '‏CSRF والرموز المضادة', startSec: 1160, endSec: 1680 },
      ],
      checkpoint: {
        triggerSec: 540, question: 'أفضل دفاع ضد حقن SQL:',
        options: ['استعلامات مُعاملة (Prepared)', 'تصفية الكلمات الممنوعة', 'إخفاء رسائل الخطأ'],
        correctIndex: 0, explanation: 'المعاملات تفصل البيانات عن الكود بنيويًا — التصفية تُخترق.',
      },
    },
  ],
  DB302: [
    {
      title: 'النموذج العلائقي والمفاتيح', description: 'الجداول والمفاتيح الأولية والأجنبية بلهجة عملية.',
      durationSec: 1440,
      chapters: [
        { title: 'من المخطط ER إلى الجداول', startSec: 0, endSec: 480 },
        { title: 'المفاتيح الأولية والأجنبية', startSec: 480, endSec: 990 },
        { title: 'القيود: NOT NULL وUNIQUE وCHECK', startSec: 990, endSec: 1440 },
      ],
      checkpoint: {
        triggerSec: 970, question: 'المفتاح الأجنبي يضمن:',
        options: ['سلامة الإحالة بين الجدولين', 'سرعة الاستعلام فقط', 'تشفير البيانات'],
        correctIndex: 0, explanation: '‏FK يمنع الإشارة إلى صف غير موجود (سلامة الإحالة).',
      },
    },
    {
      title: 'SQL: الاستعلام والتجميع', description: '‏SELECT وJOIN وGROUP BY حتى HAVING.',
      durationSec: 1560,
      chapters: [
        { title: 'الفلاتر والترتيب', startSec: 0, endSec: 500 },
        { title: '‏JOIN الداخلية والخارجية', startSec: 500, endSec: 1060 },
        { title: 'التجميع: GROUP BY وHAVING', startSec: 1060, endSec: 1560 },
      ],
      checkpoint: {
        triggerSec: 1040, question: '‏HAVING تختلف عن WHERE في أنها:',
        options: ['تُرشّح بعد التجميع', 'أسرع دائمًا', 'تعمل بلا GROUP BY'],
        correctIndex: 0, explanation: '‏WHERE قبل التجميع على الصفوف، HAVING بعده على المجموعات.',
      },
    },
    {
      title: 'التطبيع حتى 3NF', description: 'من التكرار الشاذ إلى التصميم النظيف.',
      durationSec: 1380,
      chapters: [
        { title: 'الحالات الشاذة: إدراج/تحديث/حذف', startSec: 0, endSec: 460 },
        { title: '‏1NF و2NF: الاعتماد الكلي', startSec: 460, endSec: 940 },
        { title: '‏3NF: لا اعتماد متعدي', startSec: 940, endSec: 1380 },
      ],
      checkpoint: {
        triggerSec: 920, question: 'الاعتماد المتعدي يُشطب عند:',
        options: ['‏3NF', '‏1NF', 'لا يُشطب أبدًا'],
        correctIndex: 0, explanation: '‏3NF يمنع تبعية صفة غير مفتاحية لصفة غير مفتاحية أخرى.',
      },
    },
  ],
  DS302: [
    {
      title: 'التعقيد الزمني وأسامة O', description: 'كيف نقيس الخوارزمية بلا ساعات.',
      durationSec: 1260,
      chapters: [
        { title: 'الأسوأ/المتوسط/الأفضل', startSec: 0, endSec: 420 },
        { title: '‏O(1) وO(log n) وO(n) وO(n²)', startSec: 420, endSec: 880 },
        { title: 'مقايضة الزمن بالذاكرة', startSec: 880, endSec: 1260 },
      ],
      checkpoint: {
        triggerSec: 860, question: 'البحث الثنائي على مصفوفة مرتبة هو:',
        options: ['‏O(log n)', '‏O(n)', '‏O(1)'],
        correctIndex: 0, explanation: 'كل خطوة تنصف فضاء البحث — لوغاريتمي.',
      },
    },
    {
      title: 'المكدس والطابور والقوائم المرتبطة', description: 'البنى الخطية وسلوكيات الدخول والخروج.',
      durationSec: 1380,
      chapters: [
        { title: '‏LIFO: المكدس وتطبيقاته', startSec: 0, endSec: 460 },
        { title: '‏FIFO: الطابور', startSec: 460, endSec: 920 },
        { title: 'القوائم المرتبطة: أحادية وثنائية', startSec: 920, endSec: 1380 },
      ],
      checkpoint: {
        triggerSec: 900, question: 'ترتيب عكسي سلسلة الحروف يخدمه مباشرة:',
        options: ['المكدس', 'الطابور', 'الجدول Hash'],
        correctIndex: 0, explanation: '‏LIFO يخرج آخر ما دخل — عكسٌ طبيعي.',
      },
    },
    {
      title: 'الأشجار والبحث الثنائي', description: '‏BST والعبورات والتوازن.',
      durationSec: 1500,
      chapters: [
        { title: 'المصطلحات: جذر/ورقة/عمق', startSec: 0, endSec: 500 },
        { title: '‏BST: الإدراج والبحث', startSec: 500, endSec: 1040 },
        { title: 'العبورات الثلاث ومتى توازن الشجرة', startSec: 1040, endSec: 1500 },
      ],
      checkpoint: {
        triggerSec: 1020, question: 'عبور In-order على BST يعطي القيم:',
        options: ['مرتبة تصاعديًا', 'عشوائية', 'معكوسة'],
        correctIndex: 0, explanation: 'يسار-جذر-يمين على BST = ترتيب تصاعدي.',
      },
    },
  ],
};

async function ensureDemoStudent(
  prisma: PrismaClient,
  ctx: { institutionId: string; facultyId: string; departmentId: string; passwordHash: string; regBase: string },
  index: number,
) {
  const [firstName, ...rest] = STUDENT_NAMES[index]!.split(' ');
  const lastName = rest.join(' ');
  const email = `demo-student-${String(index + 1).padStart(2, '0')}${DEMO_EMAIL_DOMAIN}`;
  const universityId = `DEMO-2026-${String(index + 1).padStart(3, '0')}`;
  const user = await prisma.user.upsert({
    where: { email },
    // re-run: the documented demo password stays in sync with the docs
    update: { passwordHash: ctx.passwordHash, isActive: true },
    create: {
      email,
      passwordHash: ctx.passwordHash,
      role: Role.STUDENT,
      firstName: firstName ?? 'طالب',
      lastName: lastName || 'عرض',
      avatarInitials: `${(firstName ?? 'ط').slice(0, 1)}${(lastName || 'ع').slice(0, 1)}`,
      avatarColor: '#4F8EF7',
      emailVerifiedAt: new Date(),
    },
  });
  const membership = await prisma.membership.upsert({
    where: { userId_institutionId: { userId: user.id, institutionId: ctx.institutionId } },
    update: { role: Role.STUDENT, isActive: true },
    create: { userId: user.id, institutionId: ctx.institutionId, role: Role.STUDENT, isActive: true },
  });
  await prisma.studentProfile.upsert({
    where: { institutionId_universityId: { institutionId: ctx.institutionId, universityId } },
    update: { membershipId: membership.id, facultyId: ctx.facultyId, departmentId: ctx.departmentId },
    create: {
      userId: user.id,
      membershipId: membership.id,
      institutionId: ctx.institutionId,
      universityId,
      facultyId: ctx.facultyId,
      departmentId: ctx.departmentId,
      year: 3,
    },
  });
  return user;
}

export async function seedPilotCohort(prisma: PrismaClient): Promise<{ students: number; lectures: number }> {
  const institution = await prisma.institution.findUnique({ where: { slug: 'madarek-demo' } });
  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@test.ly' }, select: { id: true } });
  if (!institution || !teacher) return { students: 0, lectures: 0 };

  const itFaculty = await prisma.faculty.findFirst({ where: { institutionId: institution.id }, orderBy: { createdAt: 'asc' } });
  const csDept = await prisma.department.findFirst({
    where: { facultyId: itFaculty?.id, name: 'علوم الحاسوب' },
  });
  if (!itFaculty || !csDept) return { students: 0, lectures: 0 };

  const term = TERM;
  const passwordHash = await hashPassword('Demo#Pilot2026');

  // ── 1. the 8-course floor: the two extra courses join the six ──
  for (const def of EXTRA_COURSE_DEFS) {
    const course = await prisma.course.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: def.code } },
      update: {},
      create: {
        code: def.code,
        name: def.name,
        credits: 3,
        iconEmoji: def.icon,
        themeColor: def.color,
        departmentId: csDept.id,
        institutionId: institution.id,
      },
    });
    await prisma.courseOffering.upsert({
      where: { courseId_term_teacherId: { courseId: course.id, term, teacherId: teacher.id } },
      update: {},
      create: { courseId: course.id, teacherId: teacher.id, term, room: 'قاعة 204', capacity: 45 },
    });
  }

  const offerings = await prisma.courseOffering.findMany({
    where: { teacherId: teacher.id, term, course: { institutionId: institution.id } },
    include: { course: { select: { code: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // ── 2. ≥ 3 lectures per course that lacks them (create-once) ──
  let lecturesCreated = 0;
  for (const offering of offerings) {
    const pack = LECTURE_PACKS[offering.course.code];
    if (!pack) continue; // SE301's authored set (seed.ts) stays untouched
    const existing = await prisma.lecture.count({ where: { offeringId: offering.id } });
    if (existing >= 3) continue;
    for (const [i, def] of pack.entries()) {
      const exists = await prisma.lecture.findFirst({ where: { offeringId: offering.id, title: def.title }, select: { id: true } });
      if (exists) continue;
      const lec = await prisma.lecture.create({
        data: {
          offeringId: offering.id,
          title: def.title,
          description: def.description,
          ordinal: i,
          durationSec: def.durationSec,
          // the honest self-hosted chapter-card clip the player ships
          videoUrl: `/media/generated/chapter-card-${offering.course.code.toLowerCase()}-${i + 1}.mp4`,
          posterUrl: '/brand/madarek-mark.svg',
        },
      });
      lecturesCreated++;
      let chOrd = 0;
      for (const ch of def.chapters) {
        await prisma.lectureChapter.create({
          data: { lectureId: lec.id, title: ch.title, startSec: ch.startSec, endSec: ch.endSec, ordinal: chOrd++ },
        });
      }
      await prisma.lectureCheckpoint.create({
        data: {
          lectureId: lec.id,
          triggerSec: def.checkpoint.triggerSec,
          question: def.checkpoint.question,
          options: def.checkpoint.options,
          correctIndex: def.checkpoint.correctIndex,
          explanation: def.checkpoint.explanation,
        },
      });
    }
  }

  // ── 3. one material per offering that lacks any (DOC link — an
  //      honest pointing-at-the-library placeholder, no fake bytes) ──
  for (const offering of offerings) {
    const count = await prisma.material.count({ where: { offeringId: offering.id } });
    if (count > 0) continue;
    await prisma.material.create({
      data: {
        offeringId: offering.id,
        uploaderId: teacher.id,
        name: MATERIAL_NAMES[offerings.indexOf(offering) % MATERIAL_NAMES.length]!,
        description: 'مادة العرض التجريبي — يستبدلها الأستاذ بمحتواه الحقيقي.',
        type: MaterialType.DOC,
        sizeBytes: 1024n * 48n,
        url: '#',
      },
    });
  }

  // ── 4. one future-due assignment per offering that lacks any ──
  for (const offering of offerings) {
    const count = await prisma.assignment.count({ where: { offeringId: offering.id } });
    if (count > 0) continue;
    await prisma.assignment.create({
      data: {
        offeringId: offering.id,
        title: `واجب الأسبوع الأول — ${offering.course.name}`,
        type: AssignmentType.HOMEWORK,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        weight: 10,
        maxScore: 100,
      },
    });
  }

  // ── 5. the 30-student demo cohort ──
  const hashCtx = { institutionId: institution.id, facultyId: itFaculty.id, departmentId: csDept.id, passwordHash, regBase: 'DEMO' };
  const cohort = [];
  for (let i = 0; i < 30; i++) cohort.push(await ensureDemoStudent(prisma, hashCtx, i));

  // ── 6. enrollments: each student into 5 of the 8 offerings — the
  //      deterministic (i + idx) % 8 pattern spreads the rosters ──
  for (const [i, stu] of cohort.entries()) {
    for (const [idx, offering] of offerings.entries()) {
      if ((i + idx) % 8 === 3) continue; // skip pattern → 5 of 8 each
      const exists = await prisma.enrollment.findUnique({
        where: { studentId_offeringId: { studentId: stu.id, offeringId: offering.id } },
        select: { id: true },
      });
      if (!exists) {
        await prisma.enrollment.create({ data: { studentId: stu.id, offeringId: offering.id, status: 'active', progressPct: 0 } });
      }
    }
  }

  // ── 7. a QUIZ_1 grade on each student's first enrolled offering ──
  for (const [i, stu] of cohort.entries()) {
    const firstEnrollment = await prisma.enrollment.findFirst({
      where: { studentId: stu.id, offering: { term } },
      orderBy: { enrolledAt: 'asc' },
      select: { offeringId: true },
    });
    if (!firstEnrollment) continue;
    await prisma.grade.upsert({
      where: {
        offeringId_studentId_kind: { offeringId: firstEnrollment.offeringId, studentId: stu.id, kind: GradeKind.QUIZ_1 },
      },
      update: {},
      create: {
        offeringId: firstEnrollment.offeringId,
        studentId: stu.id,
        kind: GradeKind.QUIZ_1,
        // deterministic spread 58–96 — a believable bell, not a line
        score: 58 + ((i * 7) % 39),
      },
    });
  }

  // ── 8. attendance on today's SE301 session (the one seed.ts opens) ──
  const seOffering = offerings.find((o) => o.course.code === 'SE301');
  if (seOffering) {
    const session = await prisma.attendanceSession.upsert({
      where: { offeringId_date: { offeringId: seOffering.id, date: utcDayStart(new Date()) } },
      update: {},
      create: { offeringId: seOffering.id, date: utcDayStart(new Date()), topic: 'مقدمة في UML' },
    });
    for (const [i, stu] of cohort.entries()) {
      const exists = await prisma.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId: session.id, studentId: stu.id } },
        select: { id: true },
      });
      if (!exists) {
        await prisma.attendanceRecord.create({
          // a believable mixed section: every 6th late, every 9th absent
          data: {
            sessionId: session.id,
            studentId: stu.id,
            status: i % 9 === 8 ? 'ABSENT' : i % 6 === 5 ? 'LATE' : 'PRESENT',
          },
        });
      }
    }
  }

  return { students: cohort.length, lectures: lecturesCreated };
}
