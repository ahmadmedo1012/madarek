# 02 — الميزات: ما المنفَّذ فعليًا وكيف يعمل

هذه الوثيقة تصف ميزات مدارك **كما هي في الشيفرة**، لا كما تخيلت المواصفات.
لكل ميزة: الهدف، الملفات المسؤولة، وحالة الاكتمال. الرموز:

- **[منفَّذة]** تعمل فعلًا ومغطاة بأدلة/اختبارات.
- **[محاكاة معلنة]** تعمل بواجهة حقيقية ونتائج حتمية مُصنَّعة عن قصد (بدون
  خدمة خارجية) — موثقة بصدق داخل الشيفرة.
- **[جزئية]** نزلت أجزاء، وبقيت فجوات مسماة.
- **[مخططة]** موجودة في المواصفات فقط.

## قطاع الطالب

### الفصول المقلوبة (المحاضرات المسجلة) — [منفَّذة]
المحاضرة فيديو مسجل بأزمنة إدماج (checkpoints) يوقف المشغل عندها ويطرح
سؤالًا يُصحَّح فورًا مع تفسير. التتبع: تقرير مشاهدة كل 10 ثوانٍ، الإتمام =
مشاركة ≥ 0.95 من المدة المعرفة، الاستئناف = أعلى نقطة وصل − 3 ثوانٍ،
والحضور الذكي: مشاهدة كاملة تسجّل «حاضر» تلقائيًا.

الملفات: `frontend/src/pages/student/LecturePlayerPage.tsx`،
`frontend/src/components/player/VideoPlayerChrome.tsx`، تأليف الفصول:
`frontend/src/components/curriculum/CheckpointBuilder.tsx` و`ChapterBuilder.tsx`؛
الخلفية: `backend/src/http/routes/learning.routes.ts` (مسار `/lectures/:id/watch`
يعيد حساب `Enrollment.progressPct`)، النماذج: `Lecture`، `LectureChapter`،
`LectureCheckpoint`، `WatchEvent`، `AttendanceRecord`.

### مصفوفة الإتقان — [منفَّذة]
خريطة حرارية لكل مقرر/مفهوم بمستويات (إتقان ≥0.8، جيد، يحتاج مراجعة، ضعف،
لم يُختبر)، مع كشف فجوات وتوصيات. الملفات:
`frontend/src/pages/student/MatrixPage.tsx`، الخلفية `/me/matrix` و`/me/gaps`؛
النماذج: `KnowledgeConcept`، `StudentMastery`.

### دورة البحث العلمي — [منفَّذة + محاكاة معلنة للفحص]
إرسال بحث (رابط ملف PDF) → فحص → مراجعة الأستاذ بشروح داخلية على الصفحة →
نشر في المكتبة. استخراج نص PDF حقيقي عبر `pdf-parse`، أما **نسب الانتحال
والمحتوى الآلي فهي محاكاة حتمية** من معرف البحث (انتحال 3–20%، آلي 4–25%)
— موثقة في `learning.routes.ts` (دالة `scanResultsFor`).
الملفات: `frontend/src/pages/student/ResearchPage.tsx`،
`frontend/src/pages/teacher/ResearchReviewPage.tsx`،
`frontend/src/components/pdf/PdfViewer.tsx` (pdfjs كسولة)؛ النماذج:
`ResearchPaper` (آلة حالات UPLOADED→…→PUBLISHED)، `PaperAnnotation`.

### قارئ PDF ومكتبة البحوث — [منفَّذة]
قارئ كامل (صفحات، تكبير، بحث، تظليل، ملء شاشة، RTL) عبر pdfjs محمّل كسولًا،
وبحث نصي عبر المكتبة المنشورة مع تطبيع عربي (همزات/تشكيل/ة-ه/ى-ي).
الملفات: `frontend/src/pages/DocumentViewerPage.tsx`،
`frontend/src/pages/student/LibraryPage.tsx`،
`backend/src/modules/search/normalize.ts` (مُعاير مع مرآة واجهة).

### التدريب الذاتي والألعاب — [منفَّذة]
11 مسارًا تدريبيًا عربيًا بدروس واختبارات، نقاط وشارات ولوحة صدارة وشهادات.
الملفات: `frontend/src/pages/student/TrainingPages.tsx`، الخلفية
`backend/src/http/routes/training.routes.ts`؛ النماذج: `TrainingTrack`،
`TrainingLesson`، `PointsLedger`، `Badge`، `UserBadge`.

### الاختبارات الإلكترونية — [منفَّذة]
بنك أسئلة وقوالب اختبارات ومحاولات بتصحيح مطابقة صارمة (قرار D12: مطابقة
تامة فقط، تطبيع متسامح فواصل للتدريب). الملفات:
`frontend/src/pages/exams/OnlineExamsPages.tsx`، الخلفية نماذج `Question`،
`ExamTemplate`، `ExamAttempt`، `ExamAnswer`.

### مساعد «Oasis» الذكي — [محاكاة معلنة]
دردشة تعليمية محلية بلا نموذج لغوي خارجي: يؤلف ردودًا عربية واعية بمصفوفة
إتقان الطالب وفجواته (وسم النموذج: `gap-aware-composer`)، عدّاد التوكنات
يبقى صفرًا بصدق بدل تخمين أرقام. الملفات:
`frontend/src/pages/student/AiAssistantPage.tsx`،
`backend/src/http/routes/ai.routes.ts`، النماذج: `AiConversation`،
`AiMessage`، `AiTelemetry`.

### بقية سطوح الطالب — [منفَّذة]
جدول ونتائج مرجحة، مواد وواجبات، مكتبة ورقية (كتب/استعارة)، MOOC، وظائف،
معامل افتراضية وتجارب AR، بث مباشر (آلة حالات أمامية)، خريطة حرم، مجتمع
(منشورات بوسوم وتفاعلات)، إشعارات ورسائل خاصة، صفحة الجامعة وكوكبة 25 كلية.

## قطاع الأستاذ

### الذكاء الأكاديمي للشعب — [منفَّذة]
تحليلات لكل شعبة + نموذج مخاطرة مبكر: `40%·حضور + 40%·درجة + 20%·مشاهدة`
بأربع نطاقات (سليم/مراقبة/معرض للخطر/حرج) — المعادلة المرجعية في
`backend/src/lib/risk.ts`. الملفات:
`frontend/src/pages/teacher/TeacherIntelligencePage.tsx`،
`backend/src/http/routes/teacher.routes.ts`.

### تأليف المنهج — [منفَّذة + مولّد قوالب حتمي]
إنشاء محاضرات/فصول/أسئلة إدماجية، مع «اقتراح منهج» حتمي بمطابقة كلمات
مفتاحية (لا LLM). حذف محاضرة لها سجل مشاهدة يُرفض بـ409. الملفات:
`frontend/src/components/curriculum/`، `backend/src/http/routes/curriculum.routes.ts`.

### لوحة الأستاذ والتصحيح — [منفَّذة]
مؤشرات واتجاه 6 أسابيع، حضور، درجات، مواد، واجبات، رسائل، ومراجعة البحوث
(انظر أعلاه). الملفات: `backend/src/http/routes/teacher-dashboard.routes.ts`،
`frontend/src/pages/teacher/TeacherDashboardPage.tsx`.

> **تنبيه:** رابط جانب «بنك الأسئلة والاختبارات» (`/teacher/exams`) موجود
> في قائمة التنقل، لكن **المسار نفسه غير مسجَّل في `App.tsx`** — الصفحة
> (`ExamAuthorPages.tsx`) مبنية ومُختبَرة كوحدة لكنها تؤدي الآن إلى إعادة
> توجيه للوحة الأستاذ. هذه فجوة معروفة موثقة في
> [16-decisions-and-limitations](16-decisions-and-limitations.md).

## قطاع الإدارة (ADMIN)

### الكليات والمقررات والتقارير — [منفَّذة]
إدارة الكليات/الأقسام/المقررات مع حذف آمن (409 عند وجود تبعيات)، تقارير
مبنية من قاعدة البيانات فعليًا (وليس أرقامًا ثابتة). الملفات:
`backend/src/http/routes/courses.routes.ts`، `catalog.routes.ts`،
`frontend/src/pages/admin/AdminPages.tsx`.

### الحاكمية والصلاحيات — [منفَّذة]
نموذج قدرات (17 capability) فوق الأدوار الخمسة: افتراضيات الدور + صفوف
`RolePermission` + منح/سحب لكل مستخدم، مع حرس «آخر مالك نشط» وقفل صفوف
بـ`SELECT … FOR UPDATE` ونطاق كليات لـADMIN/QUALITY. الملفات:
`backend/src/lib/permissions.ts`، `lib/governance.ts`،
`frontend/src/pages/admin/AdminGovernancePages.tsx`.

### مزامنة الجامعة (zu-sync) — [منفَّذة]
حقائق جامعية (كليات، إحصاءات) من مصدر منسّق ثابت قابل للاستبدال بجالب
حقيقي، بسجل `SyncRun` وحرس تزامن ومسح سجلات دخول أقدم من 180 يومًا
يوميًا. الملفات: `backend/src/lib/zu-sync/`، `backend/src/scheduler.ts`،
`frontend/src/pages/admin/AdminSyncPage.tsx`.

## قطاع الجودة (QUALITY) — «القطاع الرابع»

### رقابة قرائية مؤسسية — [منفَّذة]
ستة لوحات قراءة فقط: نظرة عامة، مقررات، أساتذة، تفاعل (مع مؤشر صدق
`weeklyActiveEstimated`)، شجرة مناهج، تنبيهات — ورقابة اختبارات عبر
قدرة `EXAMS_MODERATE`. الملفات:
`frontend/src/pages/quality/QualityPages.tsx`، مسارات `/quality/*` في
`learning.routes.ts`.

## قطاع المالك (OWNER)

### الحاكمية والتشغيل — [منفَّذة]
مؤشرات من قاعدة البيانات، إدارة مستخدمين وأدوار (بحرس آخر مالك)، سجل
نشاط (AuditLog) بعناوين عربية كاملة، حالة النظام/الزمن الحقيقي/مؤشرات
الذكاء/تنبيهات تشغيلية (OperationalAlert بخنق 5 دقائق)، إعدادات
`PlatformSetting` و`FeatureFlag`. الملفات:
`backend/src/http/routes/owner.routes.ts` (17 مسارًا)،
`frontend/src/pages/owner/`.

## المشترك (كل الأدوار)

| الميزة | الحالة | أين |
|---|---|---|
| السمتان الفاتح/الداكن + لكل دور لون مميزة | منفَّذة | `frontend/src/styles/tokens.css`، `useRoleAccent` |
| التهيئة الأولى (onboarding) ومشاهد الميلستونات | منفَّذة | `frontend/src/components/onboarding/`، `backend/src/modules/onboarding/` |
| البحث الشامل (⌘K) | منفَّذة | `frontend/src/components/layout/GlobalSearch.tsx`، `/search/global` |
| الإشعارات (جرس + عدّاد حي كل 60 ثانية) | منفَّذة | `frontend/src/components/layout/NotificationDropdown.tsx`، `me.routes.ts` |
| قارئ PDF للوثائق مع حماية مسارات | منفَّذة | `backend/src/http/routes/files.routes.ts` |
| الواجهة التعريفية (سماء مدارك، كوكبة الكليات) | منفَّذة | `frontend/src/pages/LandingPage.tsx`، `frontend/src/components/landing/` (canvas بلا اعتماديات) |
| i18n إنجليزي | مخططة (US7 من 011) | لا يوجد `frontend/src/i18n/` بعد |

## ربط سريع ميزة → وحدة

للانتقال من أي ميزة إلى ملفاتها التقنية (مسارات + صفحات + نماذج)، راجع
وثيقة القطاع في [`modules/`](modules/) المقابلة للدور أعلاه.
