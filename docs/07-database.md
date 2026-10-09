# 07 — قاعدة البيانات

- المحرك: **PostgreSQL** مُدار على **Neon** (إقليم قريب من Render virginia).
- ORM: **Prisma 5.22.0** — المخطط في `backend/prisma/schema.prisma`
  (مصدر الحقيقة): **75 نموذجًا، 30 enum، 16 ترحيلًا** مطبقًا.
- المرجع النموذج-بنموذج المولّد: [`DATABASE-REFERENCE.md`](DATABASE-REFERENCE.md).

## مجموعات النماذج (خريطة مجردة)

| المجموعة | أمثلة النماذج | الغرض |
|---|---|---|
| الهوية والحاكمية | `User`، `StudentProfile`، `TeacherProfile`، `RolePermission`، `UserPermission`، `Faculty`، `Department` | حسابات، قدرات، نطاق كليات، `tokenVersion` للإبطال |
| الكتالوج والتدريس | `Course`، `CourseOffering`، `Enrollment`، `ScheduleSlot`، `Material`، `Assignment`، `Submission`، `Grade` | المقررات وشعبها والتسجيل (سعة بحرس `FOR UPDATE`) والواجبات والدرجات |
| الحضور | `AttendanceSession`، `AttendanceRecord` | حضور ذكي من إتمام المشاهدة؛ تفرد `(offeringId, date)` بمفتاح يوم UTC |
| التعلم | `Lecture`، `LectureChapter`، `LectureCheckpoint`، `WatchEvent`، `KnowledgeConcept`، `StudentMastery` | الفصول المقلوبة ومصفوفة الإتقان (`progressPct` حقيقة مشتقة — ترحيل backfill الأخير) |
| البحوث | `ResearchPaper`، `PaperAnnotation` | آلة حالات UPLOADED→…→PUBLISHED + شروح داخلية؛ `extractedText` للبحث النصي |
| الاختبارات | `Question`، `QuestionCategory`، `ExamTemplate(Question)`، `ExamAttempt`، `ExamAnswer` | بنك أسئلة وقوالب ومحاولات |
| التدريب والألعاب | `TrainingTrack/Lesson/Enrollment`، `LessonProgress`، `Badge`، `PointsLedger` | 11 مسارًا عربيًا + نقاط وشارات |
| المكتبة/MOOC/وظائف | `Book`، `Loan`، `MoocCourse(Enrollment)`، `Job`، `JobApplication` | خدمات حرم إضافية |
| الاجتماعي | `Post/Comment/Reaction`، `Message`، `Notification`، `Announcement`، `Competition`، `CampusEvent` | مجتمع جامعي وإعلانات بنطاقات |
| المختبرات/AR | `VirtualLab`، `LabSession`، `ArExperience` | مختبرات افتراضية وتجارب معززة |
| الذكاء | `AiConversation`، `AiMessage`، `AiTelemetry` | دردشة «Oasis» المحلية |
| التشغيل | `AuditLog`، `PlatformSetting`، `FeatureFlag`، `OperationalAlert`، `LoginEvent`، `UniversityFact`، `SyncRun`، `LiveSession` | تدقيق، إعدادات، تنبيهات، حقائق جامعية، بث |

## العلاقات والقيود المهمة

- `Enrollment @@unique(studentId, offeringId)` — التسجيل المزدوج مستحيل
  قاعديًا، والسعة تُخصم ذريًا (نفس المعاملة).
- `AttendanceSession @@unique(offeringId, date)` — مفتاح اليوم على تقويم
  UTC (`lib/dates.ts`)؛ سجلات الطلاب `AttendanceRecord @@unique(sessionId, studentId)`؛
  التسميات المعروضة بتقويم Africa/Tripoli.
- `Faculty @@unique(name, city)` — يسند هوية 25 كلية في البذور.
- كل تعديل حاكمية يكتب `AuditLog` **بنفس المعاملة** (لا تدقيق يتيم).

## استراتيجية الاتصال: pooler مقابل direct

الإنتاج يخدم الطلبات عبر **Neon pooler** (`DATABASE_URL`)، بينما الترحيلات
تحتاج اتصالًا مباشرًا. `backend/scripts/migrate-deploy.mjs` يتصرف بالترتيب:

1. `DIRECT_DATABASE_URL` إن وُجد.
2. مشتق تلقائي: حذف `-pooler` من المضيف وتنظيف معاملات pgbouncer.
3. fallback: pooler مع `pgbouncer=true&connection_limit=1`.

مع تشخيصات DNS/TCP، حلقة إيقاظ Neon (8×5 ثوانٍ `SELECT 1`)، تصنيف أخطاء
دائم/عابر، و3 محاولات. عند التشغيل يضاف إعادة محاولة واحدة لأخطاء
P1017/P1001/P1002 العابرة (`backend/src/db.ts`).

## الترحيلات

- 16 ترحيلًا من `20260523171735_init` حتى `20260929000000_progress_truth_backfill`.
- محليًا: `npm run db:migrate` (`prisma migrate dev`). الإنتاج: تطبيق
  `prisma migrate deploy` **أثناء خطوة بناء Render** (لا عند الإقلاع).
- **لا تعدّل ترحيلًا مطبقًا** — أنشئ ترحيلًا جديدًا دائمًا (التفصيل في
  [15-development-guide](15-development-guide.md)).

## البذور (`backend/prisma/seed.ts`)

- idempotent بـupserts: 25 كلية عبر مدن الجامعة (الزاوية/العجيلات/زوارة
  وأبو عيسى وناصر و«مناطق أخرى» — المصدر الرسمي zu.edu.ly)،
  مقررات وشعبة، مواد وواجبات ودرجات، حضور وأحداث مشاهدة، كتب ومووك ووظائف،
  بحوث بحالات مختلفة، 11 مسارًا تدريبيًا، قدرات أدوار، أسئلة وقوالب اختبار.
- **تحذيران:**
  1. يمسح (`deleteMany`) الإعلانات والمسابقات وأحداث الحرم في كل تشغيل.
  2. يعيد تعيين كلمات مرور الحسابات التجريبية الخمسة إلى كلمة demo
     المعروضة في [05-setup](05-setup.md).
- لا تشغّله إلا على بيئة تطوير.

## النسخ الاحتياطي والاستعادة

- **لا يوجد إجراء نسخ/استعادة موثق داخل المستودع** — هذه فجوة معروفة
  (انظر [16](16-decisions-and-limitations.md)). الجانب الوحيد المتاح هو
  أدوات Neon نفسها (فروع/استعادة نقطة زمنية حسب خطتك).
- توصية تشغيلية: قبل أي `db:seed` أو ترحيل كبير على بيئة مهمة، خذ snapshot
  من لوحة Neon، ووثّق خطوات الاستعادة لفريقك.

## الوصول والصلاحيات

الوصول الوحيد للقاعدة هو Prisma من الخلفية. لا مستخدمين مباشرين ولا
قراء خارجيين في الكود. سلسلة الاتصال سر كامل — لا تضعها في الوثائق أو
الاختبارات (انظر [06-configuration](06-configuration.md) و
[`SECRETS-REFERENCE.md`](SECRETS-REFERENCE.md)).
