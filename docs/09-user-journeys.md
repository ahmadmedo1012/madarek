# 09 — رحلات المستخدم خطوة بخطوة

هذه التدفقات مستخرجة من جدول المسارات الفعلي (`frontend/src/App.tsx`)
ومسارات الخلفية. المسارات أدناه حقيقية وشحَنة؛ كل صفحة lazy-loaded داخل
`AppShell` مع حماية دور (`ProtectedRoute`).

## رحلة الطالب

### أ) من الزيارة إلى الجلسة الأولى
1. يفتح `/` → `LandingPage` («سماء مدارك»): بطل OrbitScene، كوكبة 25 كلية،
   مقاطع رحلة، أزرار أدوار، ومؤشر تقدم تمرير RTL.
2. «تسجيل الدخول» → `/auth` (`AuthPage`، نسقتا فاتح/داكن) أو إنشاء حساب
   `/auth/register` (طالب/أستاذ فقط — بقية الأدوار بالدعوة).
3. أول دخول: `HomeRedirect` يرسله إلى `/student/dashboard` ويبدأ
   التهيئة الأولى (4 إطارات) تلقائيًا على مسار الرئيسية — تُعلَّم
   `onboardingCompletedAt` على الخادم.
4. القائمة الجانبية تتلون بلون الدور (accent) والسمة الداكنة افتراضية
   (تُحفظ في `madarek-theme`).

### ب) يوم دراسي نموذجي
1. `/student/dashboard` — لوحة «يومك»: ترحيب، KPIs، محاضرات اليوم، واجبات.
2. `/student/schedule` — جدول التوقيت (نموذج `ScheduleSlot`).
3. `/student/courses` → `/student/courses/:offeringId` — مقرره وبنية
   منهجه؛ ثم `/student/lectures/:lectureId` — المشغّل: توقف عند زمن
   الإدماج، سؤال بأشرطة أ–و، تصحيح فوري وتفسير؛ استئناف من آخر نقطة.
4. مشاهدة كاملة → حضور «حاضر» تلقائيًا وتقدم الشعبة يتحدث (`/lectures/:id/watch`).
5. `/student/matrix` — مصفوفة إتقانه الحرارية + `/student/alerts` توصيات
   الفجوات (تُلغى ذاكرة `['me','gaps']` بعد كل إجابة إدماجية).
6. `/student/research` — يرسل بحثًا (رابط PDF) → فحص → بانتظار المراجعة
   → بعد التصحيح والنشر: يظهر في `/student/library` (تبويب البحوث) مع
   بحث نصي عربي مطبّع، والقراءة في `/document/:filename` بقارئ PDF
   وتظليلات وشروح الأستاذ.
7. `/student/results` — كشف درجات مرجّح؛ `/student/ai` — «Oasis» يجيب
   واعيًا بفجواته؛ `/training` — مسارات ذاتية بنقاط وشارات و`/achievements`.

### ج) حياة جامعية
`/community` (إعلانات رسمية بنطاقات) مقابل `/student/social` (منشورات
أقران بوسوم وتفاعلات — سطحان مختلفان عمدًا)، `/competitions`،
`/student/labs` و`/student/ar`، `/student/live`، `/student/mooc` و
`/student/jobs` و`/student/library` (كتب واستعارة)، و`/student/university`
(الرؤية والكليات)، وجرس الإشعارات بعدّاد حي كل 60 ثانية.

## رحلة الأستاذ

1. `/teacher/dashboard` — مؤشرات شعبه واتجاه 6 أسابيع.
2. `/teacher/intelligence` → `/teacher/intelligence/:offeringId` — «الذكاء
   الأكاديمي»: قائمة مخاطرة (نطاقات سليم/مراقبة/معرض/حرج)، تحليلات شعبة،
   حضور قابل للتعديل.
3. تأليف المنهج: من صفحة المقرر يفتح لوحة `CurriculumAuthoringPanel` —
   محاضرات/فصول/أسئلة إدماجية مع حارس إهمال (`useDiscardGuard`)،
   أو «اقتراح منهج» الحتمي (`POST /teacher/offerings/:id/curriculum/suggest`).
4. تصحيح البحوث: `/teacher/research` → `ResearchReviewPage` — مسح، درجة،
   شروح داخلية على صفحات PDF، نشر للمكتبة.
5. التصحيح اليومي: `/teacher/assignments` (تسليمات→درجات تُلغي ذاكرة
   لوحتَي الأستاذ والطالب)، `/teacher/grades`، `/teacher/attendance`،
   `/teacher/messages`، و`/teacher/live` لإدارة جلسات البث (آلة حالات
   أمامية فقط forward).

## رحلة الإدارة (ADMIN)

1. `/admin/dashboard` — إحصاءات حية من قاعدة البيانات (`/admin/stats`).
2. `/admin/faculties` و`/admin/courses` — بنية الجامعة والمقررات (حذف
   آمن يرفض 409 مع التبعيات).
3. `/admin/students` — كشوف بالبحث العميق `?q=`؛ `/admin/reports` —
   تقارير DB-driven؛ `/admin/digital` — مؤشرات تبنٍّ رقمي.
4. `/admin/teachers` — توثيق أساتذة وتعيين مناصب (عميد/رئيس قسم)؛
   `/admin/permissions/:id` — محرر قدرات لكل مستخدم (كل تعديل role/
   status يرفع `tokenVersion` ويكتب تدقيقًا).
5. `/admin/sync` — مزامنة حقائق الجامعة (zu-sync) بزناد يدوي محمي من
   التزامن، وسجل `SyncRun` مرئي.

## رحلة الجودة (QUALITY — قراءة فقط)

1. `/quality/dashboard` — صحة مؤسسية مجمّعة (حلقي/أعمدة/خطوط عبر
   `ChartFrame` بجدول بديل مخفي لكل رسم).
2. `/quality/courses` (مع مقاييس فرز) — جودة المقررات؛ `/quality/professors`
   — رضا/التزام؛ `/quality/engagement` — تفاعل مع مؤشر صدق التقدير
   الأسبوعي؛ `/quality/curriculum` — شجرة الكليات→الأقسام→المقررات.
3. `/quality/exam-moderation` — رقابة قوالب الاختبارات (قدرة
   `EXAMS_MODERATE`)؛ `/quality/alerts` — تنبيهات (مثل أوراق عالية
   النسبة — علِمًا أن نسب الفحص محاكاة بمدى معلوم).
4. لا مسارات كتابة للجودة — تصميم قرائي مقصود.

## رحلة المالك (OWNER)

1. `/owner/dashboard` — KPIs ورسم توزيع مستخدمين وشريط إجراءات.
2. `/owner/users` — إدارة أدوار/حالات بحرس «آخر مالك نشط» (لا يمكن
   تعطيل آخر مالك)؛ `/owner/governance` — نظرة الحاكمية.
3. `/owner/activity` — سجل التدقيق الكامل بعناوين عربية لكل إجراء/مورد.
4. `/owner/system` و`/owner/realtime` و`/owner/ai` — حالة النظام
   والمؤشرات؛ `/owner/alerts` — تنبيهات تشغيلية (5xx، DB) بخنق 5 دقائق
   وقابلية «حل»؛ `/owner/content` و`/owner/education` — نظرة محتوى
   وتعليم؛ `/owner/settings` — إعدادات المنصة وأعلام الميزات.

## ملاحظات عرضية تهم كل الرحلات

- زائر لمسار غير مصرح → إعادة توجيه لدوره أو `/auth` مع `state.from`.
- `/login` شفرة قديمة تُعيد إلى `/auth`؛ `/student/exams` تُعيد إلى
  `/student/online-exams`.
- كل صفحة تضبط عنوان المستند من `lib/nav.ts` (بوابة اختبارات تغطية
  العناوين تمنع النسيان).
