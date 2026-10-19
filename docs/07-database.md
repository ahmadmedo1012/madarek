# 07 — قاعدة البيانات

- المحرك: **PostgreSQL** مُدار على **Neon** (إقليم قريب من Render virginia).
- ORM: **Prisma 5.22.0** — المخطط في `backend/prisma/schema.prisma`
  (مصدر الحقيقة): **79 نموذجًا، 31 enum، 20 ترحيلًا** مطبقًا.
- المرجع النموذج-بنموذج المولّد: [`DATABASE-REFERENCE.md`](DATABASE-REFERENCE.md).

## r178 — أساس التعدّد المؤسسي (النماذج والترحيل والبذور)

- **النماذج الجديدة**: `Institution` (جذر العزل؛ سياق تنظيمي معروض لا هوية
  بصرية — بلا شعار/ألوان/نطاق لكل مؤسسة) و`Membership`
  (`@@unique(userId, institutionId)`؛ الدور الفعلي داخل المؤسسة مصدره
  العضوية دائمًا؛ `isActive=false` مقبض سحب الصلاحية دون حذف التاريخ؛
  قيمة OWNER محظورة على مستوى التطبيق لأن Prisma 5.22 بلا قيود CHECK —
  الحراسة في Zod DTOs + الخدمات).
- **إعادة هيكلة الملفات**: `StudentProfile`/`TeacherProfile` صارا
  **ملحقين بالعضوية** (PK من نوع cuid جديد؛ `membershipId @unique` →
  Cascade؛ علاقة User أصبحت جمعًا `studentProfiles`/`teacherProfiles` —
  المستخدم قد يدرس في مؤسسة ويدرّس في أخرى). رقم القيد الجامعي
  `universityId` فقد تفرده العالمي لصالح `@@unique(institutionId,
  universityId)`؛ `StudentProfile` يحمل `institutionId` منزوعة الوثائق
  (denormalization مبرّرة للاستعلامات النطاقية) بينما أستاذ الملف
  يُحل عبر العضوية.
- **النطاق على المفاتيح**: `Faculty` يفقد افتراض مدينة «الزاوية» ويكسب
  `institutionId` إلزاميًا مع `@@unique(institutionId, name, city)`؛
  `Course.code` فريد داخل المؤسسة `@@unique(institutionId, code)` —
  العمود المنزوَس يُشتق من department→faculty ويُتحقق منه في كود
  التطبيق عند كل إنشاء/تحديث (ثابت على مستوى التطبيق)؛
  `UserPermission.institutionId?` (NULL = منحة عالمية؛ غير الفارغ =
  منحة مؤسسية؛ التفريد الثلاثي `userId+capability+institutionId`)
  و`AuditLog.institutionId?` (NULL = نطاق منصة).
- **الترحيل** (`20261017020724_multi_institution_foundation`): أنشأ
  المؤسسة والمجموعات ثم **استرجاع البيانات** قبل ضبط NOT NULL: مؤسسة
  العرض «جامعة مدارك التجريبية» بمعرّف ثابت `inst-zawia-showcase` (مرساة FK داخلية تاريخية — r188)؛ ربط كل
  الكليات القائمة بها؛ عضوية لكل مستخدم له ملف طالب/أستاذ (أو دور
  STUDENT/TEACHER/ADMIN/QUALITY) في مؤسسة العرض؛ إعادة بناء مفاتيح
  ملفات الطالب/الأستاذ بمفاتيح cuid جديدة مع `membershipId`؛ اشتقاق
  `Course.institutionId` عبر `UPDATE … FROM (Department JOIN Faculty)`
  مع تعويض أمان نحو مؤسسة العرض؛ إسقاط التفريدات العالمية القديمة
  (Course.code / Faculty(name,city) / StudentProfile.universityId /
  UserPermission(userId,capability)) قبل إنشاء المركّبة النطاقية. حرس
  `WHERE NOT EXISTS` يجعله آمنًا على قاعدة فارغة ومليئة معًا.
- **البذور**: مؤسسة العرض (25 كلية) + مؤسسة تجريبية ثانية «مؤسسة
  الأندلس التعليمية» (slug `alandalus-demo`؛ كلية واحدة وقسم ومقرر
  `SE301` **بنفس الرمز** مقرر الزاوية — إثبات التفريد داخل المؤسسة)
  + حسابات `student2@demo.madarek.ly` و`admin2@demo.madarek.ly`؛ رقم
  القيد نفسه يُزرع للطالبين (إثبات التفريد النطاقي للرقم)؛ المالك
  بلا عضوية (ملكية المنصة على User.role فقط). كلمات مرور حسابات
  العرض بذرة تطوير فقط داخل بيئات البناء المحلية (انظر رأس
  `backend/prisma/seed.ts`) — أسرار الإنتاج الفعلية دُوِّرت لكل
  حساب على حدة عبر مسار `db:rotate-password` الموثّق وسُلِّمت
  للمشغّل عبر قناة خاصة (r189: لا تُنشر أي كلمة مشتركة في ملف
  متتبَّع).
- القرارات التفصيلية والبدائل: [`architecture/multi-institution/`](architecture/multi-institution/).

## مجموعات النماذج (خريطة مجردة)

| المجموعة | أمثلة النماذج | الغرض |
|---|---|---|
| الهوية والحاكمية | `User`، `Institution`، `Membership`، `StudentProfile`، `TeacherProfile`، `RolePermission`، `UserPermission`، `Faculty`، `Department` | حسابات، مؤسسات وعضويات (r178)، قدرات، نطاق كليات، `tokenVersion` للإبطال |
| الكتالوج والتدريس | `Course`، `CourseOffering`، `Enrollment`، `ScheduleSlot`، `Material`، `Assignment`، `Submission`، `Grade` | المقررات وشعبها والتسجيل (سعة بحرس `FOR UPDATE`) والواجبات والدرجات |
| الحضور | `AttendanceSession`، `AttendanceRecord` | حضور ذكي من إتمام المشاهدة؛ تفرد `(offeringId, date)` بمفتاح يوم UTC |
| التعلم | `Lecture`، `LectureChapter`، `LectureCheckpoint`، `CheckpointAnswer`، `WatchEvent`، `KnowledgeConcept`، `StudentMastery` | الفصول المقلوبة ومصفوفة الإتقان (`progressPct` حقيقة مشتقة — ترحيل backfill)؛ `CheckpointAnswer` ذاكرة إجابات نقاط التحقّق (ترحيل r157 الأخير) |
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
- `Faculty @@unique(institutionId, name, city)` (r178؛ كانت `name, city`
  عالمية) — يسند هوية 25 كلية في البذور داخل مؤسسة العرض، ويسمح
  بنفس الاسم في مؤسسات مختلفة.
- `Course @@unique(institutionId, code)` و`StudentProfile
  @@unique(institutionId, universityId)` و`Membership
  @@unique(userId, institutionId)` (r178) — التفريد على مستوى المؤسسة
  لا المنصة (مقنّن بأن كود المقرر ورقم القيد يُصدرهما كل مؤسسة
  بنفسها).
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

- 20 ترحيلًا من `20260523171735_init` حتى
  `20261017020724_multi_institution_foundation` (r178: أساس التعدّد
  المؤسسي — نماذج Institution/Membership + إعادة هيكلة الملفات +
  التفريد النطاقي؛ قبلها `20261016190858_postgres_binary_objects`
  r175: `BinaryObject` — تخزين BYTEA دائم لرفعات PDF على خطة Render
  المجانية).
- محليًا: `npm run db:migrate` (`prisma migrate dev`). الإنتاج: تطبيق
  `prisma migrate deploy` **أثناء خطوة بناء Render** (لا عند الإقلاع).
- **لا تعدّل ترحيلًا مطبقًا** — أنشئ ترحيلًا جديدًا دائمًا (التفصيل في
  [15-development-guide](15-development-guide.md)).

## البذور (`backend/prisma/seed.ts`)

- idempotent بـupserts: 25 كلية عبر مدن الجامعة (الزاوية/العجيلات/زوارة
  وأبو عيسى وناصر و«مناطق أخرى» — المصدر الرسمي الراحل zu.edu.ly؛ r188: السجل اصطناعي بالكامل بثلاثة حرَم معرفيّة)،
  مقررات وشعبة، مواد وواجبات ودرجات، حضور وأحداث مشاهدة، كتب ومووك ووظائف،
  بحوث بحالات مختلفة، 11 مسارًا تدريبيًا، قدرات أدوار، أسئلة وقوالب اختبار.
- **ثلاثة تحذيرات:**
  1. يمسح (`deleteMany`) الإعلانات والمسابقات وأحداث الحرم في كل تشغيل.
  2. يعيد تعيين كلمات مرور الحسابات التجريبية الخمسة إلى كلمة demo
     المعروضة في [05-setup](05-setup.md).
  3. (r145 — أضيف بعد تدقيق قاعدة البيانات) يمسح أيضًا محتوى الاختبارات
     بالكامل (examAnswer→examAttempt→examTemplateQuestion→examTemplate→
     question) وفصول/دروس المسارات التدريبية.
- لا تشغّله إلا على بيئة تطوير — ومنذ r145 يرفض الاشتغال فورًا عند
  `NODE_ENV=production` قبل تنفيذ أي استعلام (حارس fail-closed داخل
  `seed.ts` نفسه).

## النسخ الاحتياطي والاستعادة

- الدليل المكتوب (أدوات Neon التلقائية + قوالب `pg_dump`/`pg_restore`
  بقواعد استراتيجية الاتصال pooler/direct نفسها الموصوفة أعلاه + قائمة
  تجربة استعادة على قاعدة تجريبية بخطوات ومخرجات متوقعة) في
  [12-deployment](12-deployment.md) منذ r164-l. **التجربة العملية نفسها
  فعل مالك** — بيئة التطوير بلا أدوات pg ولا قاعدة حية.
- توصية تشغيلية باقية: قبل أي `db:seed` أو ترحيل كبير على بيئة مهمة، خذ
  snapshot من لوحة Neon أولًا.

## الوصول والصلاحيات

الوصول الوحيد للقاعدة هو Prisma من الخلفية. لا مستخدمين مباشرين ولا
قراء خارجيين في الكود. سلسلة الاتصال سر كامل — لا تضعها في الوثائق أو
الاختبارات (انظر [06-configuration](06-configuration.md) و
[`SECRETS-REFERENCE.md`](SECRETS-REFERENCE.md)).
