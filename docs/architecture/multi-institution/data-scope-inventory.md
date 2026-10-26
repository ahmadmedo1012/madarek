# جرد نطاق البيانات — كل نماذج Prisma (المرحلة 1)

> **المنهجية:** العدّ برمجي من `backend/prisma/schema.prisma` عند الالتزام
> الأساس `bb651c3` (المرحلة 1): **77 نموذجًا و30 enumًا**
> (`grep -c '^model '` = 77، `grep -c '^enum '` = 30). لا تقديرات ولا
> أرقام منسوخة من جولات سابقة. التصنيف أدناه حسب ست فئات مطلوبة:
> `PLATFORM_GLOBAL` / `INSTITUTION_SCOPED` / `USER_GLOBAL` /
> `MEMBERSHIP_SCOPED` / `SHARED_CATALOG` / `AMBIGUOUS_OR_REQUIRES_DECISION`.
>
> الفئات تعني **النطاق المستهدف** بعد التعدّد المؤسسي — وعمود «الوضع
> الحالي» يوثّق الفجوة. «عضوية» = علاقة مستخدم×مؤسّسة (Membership
> المستقبلية). الجداول مختصرة عمدًا: الحقول الحساسة والقيود المفتاحية
> فقط، والتفصيل الكامل في `docs/DATABASE-REFERENCE.md`.

## ملخص الأعداد (يتطابق مع 77)

| الفئة | العدد | النماذج |
|---|---|---|
| `PLATFORM_GLOBAL` | 8 | AuditLog, PlatformSetting, FeatureFlag, AiTelemetry, OperationalAlert, LoginEvent, BinaryObject, RolePermission |
| `INSTITUTION_SCOPED` | 22 | Faculty, Department, Course, CourseOffering, ScheduleSlot, Material, Assignment, AttendanceSession, Lecture, LectureChapter, LectureCheckpoint, KnowledgeConcept, ResearchPaper, PaperAnnotation, QuestionCategory, Question, ExamTemplate, ExamTemplateQuestion, Announcement, UniversityFact, SyncRun, LiveSession |
| `MEMBERSHIP_SCOPED` | 22 | StudentProfile, TeacherProfile, Enrollment, Submission, Grade, AttendanceRecord, CheckpointAnswer, WatchEvent, StudentMastery, TrainingEnrollment, LessonProgress, ExamAttempt, ExamAnswer, UserAchievement, UserSkill, UserBadge, MoocEnrollment, JobApplication, Loan, LabSession, CompetitionEntry, EventRSVP |
| `USER_GLOBAL` | 6 | User, Notification, Message, AiMessage, Certificate, PointsLedger |
| `SHARED_CATALOG` | 10 | Book, MoocCourse, Job, VirtualLab, ArExperience, TrainingTrack, TrainingLesson, Badge, Achievement, Skill |
| `AMBIGUOUS_OR_REQUIRES_DECISION` | 8 | Post, PostComment, PostReaction, StudyRoom, StudyRoomMember, UserPermission, Competition, CampusEvent |

## 1) PLATFORM_GLOBAL (8)

| النموذج | الغرض | الوضع الحالي والهجرة | الاختبارات الواجبة |
|---|---|---|---|
| `AuditLog` | سجل تدقيق لكل فعل حسّاس | عالمي بلا سياق مؤسّسة. هجرة: عمود `institutionId` اختياري للتصفية/التصدير (سجل المالك يبقى عالميًا). | اختبار: أفعال مؤسّسة تُسجَّل بمُعرّفها وتُستعلم ضمن نطاقها |
| `PlatformSetting` | إعدادات المنصّة | عالمي صحيحًا — قرار مقصود | بوابة: لا يمكن لمسجل عام مؤسّسة كتابة مفاتيح منصّة |
| `FeatureFlag` | أعلام الميزات | عالمي؛ قرار مستقبلي: أعلام لكل مؤسّسة (additive) | علم منصّة يعمل عالميًا؛ علم مؤسّسة لا يسرّب عبر الحدود |
| `AiTelemetry` | قياس استخدام الذكاء | عالمي؛ أضف `institutionId` اختياريًا للتحليلات المؤسسية | لا تظهر بيانات مؤسّسة في لوحة مؤسّسة أخرى |
| `OperationalAlert` | تنبيهات تشغيل | عالمي صحيحًا (مشغّل المنصّة) | يبقى مرئيًا للمالك فقط |
| `LoginEvent` | قياس الدخول | عالمي صحيحًا (أمن المنصّة) | لا تسريب عبر واجهات المسجل العام المؤسسية |
| `BinaryObject` | بايتات PDF الدائمة | مفاتيح `papers/materials` بلا مؤسّسة؛ هجرة: ترميز `institutionId` داخل المفتاح أو عمود جانبي للتصدير/الحذف | حذف مؤسّسة يمتد لملفاتها؛ لا وصول عبر `files.routes.ts` خارج الملكية |
| `RolePermission` | قالب الأدوار الافتراضي (17 قدرة) | عالمي؛ قرار مفتوح: تجاوزات لكل مؤسّسة أم قالب واحد | اختبر عدم تأثير تجاوز مؤسّسة على أخرى |

## 2) INSTITUTION_SCOPED (22) — العمود الفقري الأكاديمي

> **الفجوة الجوهرية الموحّدة:** لا يوجد نموذج `Institution` أصلًا؛ الجذر
> الضمني هو `Faculty` (بلا أب). `Faculty.city` افتراضه «الزاوية»
> (بيانات مؤسّسة العرض). الهجرة الموحّدة: نموذج `Institution` + عمود
> `institutionId` إلزامي على 22 جدولًا + ضابط FK + فهرس، والإنتاجية
> من علاقات `Faculty ← Department ← Course ← CourseOffering` تُكمل
> السلسلة تلقائيًا.

| النموذج | القيد المفتاحي الحالي | الخطر الحالي | الهجرة المطلوبة |
|---|---|---|---|
| `Faculty` | `@@unique([name, city])` | الافتراض أحادي الجامعة عبر `city` | `institutionId` FK؛ الفريدية → `(institutionId, name, city)`؛ إسقاط افتراض المدينة |
| `Department` | `@@unique([facultyId, name])` | يتبع الكلية — آمن بعد هجرة الأب | يكفي ربط الأب |
| `Course` | `code @unique` **عالمي** | **كلية مؤسّستان لا تستطيعان استخدام نفس الرمز** | الفريدية → `(institutionId, code)`؛ قرار منتج |
| `CourseOffering` | `@@unique([courseId, term, teacherId])` | عبر السلسلة | لا تغيير مباشر |
| `ScheduleSlot`, `Material`, `Assignment`, `AttendanceSession`, `Lecture`, `LectureChapter`, `LectureCheckpoint`, `KnowledgeConcept`, `ResearchPaper`, `PaperAnnotation`, `QuestionCategory` (بها `isShared` عابر كليات), `Question`, `ExamTemplate`, `ExamTemplateQuestion`, `LiveSession` | عبر السلسلة/فهارس أب | عزل ضمني عبر السلسلة — لا تُنسخ قيود النطاق إلى استعلامات مباشرة | `institutionId` مشتق (يُخزَّن أو يُستنتج عبر join) لضمان تصفية موحّدة وسرعة تصدير/حذف |
| `Announcement` | enum scope فيه `PLATFORM` أصلًا | تصميم جيد مسبقًا | نطاقات مؤسّسة ضمن enum الحالي |
| `UniversityFact` | `key @id` **عالمي** | **مفاتيح جامعة واحدة فقط** (مصدر `zu.edu.ly` ثابت في `static-source.ts`) | `institutionId` FK؛ المفتاح → `(institutionId, key)`؛ مصدر sync لكل مؤسّسة |
| `SyncRun` | بلا نطاق | مزامنة مؤسّسة واحدة | `institutionId` + مصدر لكل مؤسّسة |

**حساسية البيانات:** هذه الجداول تحمل المحتوى الأكاديمي والملفات
(عبر `Material.url`/`ResearchPaper.fileUrl`) — عزلها هو جوهر الثقة
التجارية للمنصّة.

## 3) MEMBERSHIP_SCOPED (22) — «المستخدم × السياق»

> غالبها اليوم «user × offering/track/book» — أي عضوية ضمنية. بعد
> التعدّد تصبح كلها خلف بوابة عضوية صريحة `Membership(user,
> institution, role)`.

| النموذج | القيد الحالي | ملاحظة النطاق |
|---|---|---|
| `StudentProfile` | `universityId @unique` **عالمي** + facultyId+departmentId إلزامية | **أخطر قيد أحادي المؤسسة**: الطالب في مؤسّسة واحدة فقط ورقم القيد فريد عالميًا؛ الهجرة: نعمودية لجدول عضوية بفريدية `(institutionId, universityId)` + `userId` غير فريد |
| `TeacherProfile` | قسم رئيس واحد لكل أستاذ | نفس المعالجة: قسم رئيس **لكل عضوية**؛ المناصب القيادية `position`/`positionFacultyId` تتبع المؤسّسة |
| `Enrollment` | `@@unique([studentId, offeringId])` | سليمة ضمن مؤسّسة (offering مؤسسي) — تحتاج فقط ضمان أن studentId عضو بالمؤسّسة نفسها |
| `Submission`, `Grade`, `AttendanceRecord`, `CheckpointAnswer`, `WatchEvent`, `StudentMastery`, `ExamAttempt`, `ExamAnswer`, `LessonProgress`, `TrainingEnrollment` | فريدية مزدوجة (student×شيء مؤسسي) | نفس القاعدة: صحة العضوية تُفرض على مستوى التطبيق/القاعدة قبل الكتابة |
| `ResearchPaper` مرَّ في §2 (مؤسسي) — التعليقات/التقييم داخله | | |
| `UserAchievement`, `UserSkill`, `UserBadge`, `MoocEnrollment`, `JobApplication`, `Loan`, `LabSession`, `CompetitionEntry`, `EventRSVP` | فريدية (userId × عنصر كتالوج) | قرار منتج: هل إنجازات/نقاط/مقترضات المستخدم **عالمية** (هوية واحدة) أم لكل مؤسّسة؟ الافتراض المستهدف: عالمية للهوية، مع عمود مصدر مؤسّسة للسياق |
| `UserPermission` — مصنّف أيضًا AMBIGUOUS | `@@unique([userId, capability])` | هجرة مقترحة: `(userId, institutionId, capability)` — القدرة تُمنح **داخل عضوية** لا على مستخدم عالمي |

## 4) USER_GLOBAL (7)

| النموذج | القرار المستهدف | المخاطر |
|---|---|---|
| `User` | هوية عالمية واحدة (`email @unique` **يبقى عالميًا عمدًا** — قرار منتج: حساب واحد لكل شخص عبر المؤسسات) | `role` **عالمي واحد** — يجب أن ينتقل للعضوية (القرار المعماري الكبير)؛ `scopeFacultyId` حاكمية أحادية المؤسّسة → نطاق لكل عضوية؛ `firedMilestones`/`themePreference` تبقى عالمية |
| `Notification` | مملوكة للمستخدم؛ أضف `institutionId` على المصدر للفلترة والتصدير | إشعار مؤسّسة يظهر لمستخدم ليس عضوًا فيها |
| `Message` | مستخدم↔مستخدم؛ **قرار مفتوح**: هل الرسائل تسمح عابرًا للمؤسسات؟ | ذكر سياق المؤسّسة في الرسائل |
| `AiConversation`/`AiMessage` | **r179 (منفَّذ)**: المحادثة تحمل `institutionId` (عمود + فهرس) والقائمة/الإضافة/الحذف/الرسائل مقيّدة بسياق المتصل المتحقَّق؛ سياق التلقيم (الإتقان/التسجيل/التدريس) يُبنى بمدخل مؤسسة صريح مقيّد بالسلسلة | مغلق — اختبارات تكامل عابرة للمؤسستين (two-institution-regression + ai-chat-provider-path) |
| `Certificate` | ملك المستخدم (حقل issuer حر) | شهادات تدريب المنصّة عالمية؛ شهادات مؤسّسات مستقبلًا مؤسسية |
| `PointsLedger` | سجل نقوط append-only للمستخدم | قرار: النقاط عالمية أم لكل مؤسّسة (يربط totalXp في StudentProfile) |

## 5) SHARED_CATALOG (10)

| النموذج | القرار |
|---|---|
| `Book` | كتالوج مكتبة منصّة مشترك (البذرة الحالية عالمية) — قرار مفتوح: نسخ مؤسسية؟ الافتراض: مشترك |
| `MoocCourse` | كتالوج خارجي مشترك — عالمي صحيحًا |
| `Job` | لوحة فرص: مشتركة منصّة أم لكل مؤسّسة؟ **قرار مفتوح** (البذرة تقول «لطلاب جامعة الزاوية» — نص واجهة مستهدف بالتعديل في المرحلة اللاحقة) |
| `VirtualLab`, `ArExperience` | كتالوجات منصّة مشتركة |
| `TrainingTrack`, `TrainingLesson` | محتوى تطوير ذاتي عربي من المنصّة — مشترك |
| `Badge`, `Achievement`, `Skill` | كتالوجات إنجاز منصّة — مشتركة |

## 6) AMBIGUOUS_OR_REQUIRES_DECISION (8)

| النموذج | السؤال المفتوح |
|---|---|
| `Post`/`PostComment`/`PostReaction` (3) | هل «مجتمع مدارك» عالمي واحد أم مجتمع لكل مؤسّسة؟ (اليوم: منشورات لكل مستخدم بلا نطاق) |
| `StudyRoom`/`StudyRoomMember` (2) | غرف دراسة لكل مؤسّسة أم عالمية؟ |
| `UserPermission` | انظر §3 — ينتقل عمليًا للعضوية |
| `Competition` | مسابقات «جامعية» اليوم → مؤسسية بالطبيعة؛ قرار النطاق |
| `CampusEvent` | فعاليات حرم — مؤسسية بالطبيعة؛ قرار النطاق |

## مفاتيح الفريدية العالمية — قرارات مفردة

| القيد | القرار المستهدف |
|---|---|
| `User.email @unique` | **يبقى عالميًا** (هوية واحدة متعددة العضويات — قرار منتج) |
| `StudentProfile.universityId @unique` | يصبح `(institutionId, universityId)` — رقم القيد فريد **داخل** مؤسّسته |
| `Course.code @unique` | يصبح `(institutionId, code)` |
| `UniversityFact.key @id` | يصبح `(institutionId, key)` |
| `Faculty.@@unique([name, city])` | يصبح `(institutionId, name, city)` |
| `Achievement.code`, `Skill.name`, `TrainingTrack.slug`, `Badge.slug`, `QuestionCategory.slug`, `PlatformSetting.key`, `FeatureFlag.slug` | تبقى **عالمية عمدًا** (كتالوجات/إعدادات منصّة) |
| `User.email` + تسجيل الدخول برقم القيد (`loginUser`) | مسار الرقم الجامعي سيحتاج تفكيك «رقم → عضوية → مستخدم» بدل بحث عالمي مباشر |

## الـenums الثلاثون

كل الـenums (`Role`, `Capability`, `AcademicRank`, … `LiveSessionStatus`)
تبقى **عالمية كقيم** — هي معجم المنصّة المشترك ولا تحمل بيانات. الاستثناء
الإجرائي الوحيد: قيمة `Role` على `User.role` تفقد مكانها كحقيقة عالمية
(الدور يعيش في العضوية) — انظر architecture-decisions.md §4.

## التزامات الاختبار (المرحلة 2+)

لكل جدول مؤسسي: اختبار عزل إيجابي (عضو يرى/يكتب ضمن مؤسّسته) واختبار
رفض عابر (طلب مباشر بمعرّف من مؤسّسة أخرى يرجع 404/403 لا 200)، واختبار
فريدية مركّبة، واختبار حذف/تصدير مؤسّسة كاملة، واختبار مواظبة المهام
الخلفية (sync/badges/points) على نطاق المؤسّسة الصحيح. لا يُدّعى الآن

> **تحديث r179 (منفَّذ)**: الجولة الخامسة أضافت أعمدة `institutionId`
> صريحة للمحتوى الذي لا سلسلة أب له: `Post` و`StudyRoom` و
> `CampusEvent` و`Competition` و`ResearchPaper` و`AiConversation` و
> `UniversityFact` (مفتاح مركّب institutionId+key) و`SyncRun` — بترحيل
> واحد بتعبئة بيانات العرض القائمة لمؤسسة الزاوية. `Material` بقيت
> على سلسلة العرض (offering→course→department→faculty→institution) بلا
> عمود مكرر، و`Message` بلا عمود (الحدود عند الإرسال: عضوية مشتركة
> مطلوبة)، وكتالوج التدريب مشترك عمدًا.
تنفيذ أي منها — لم يُنفّذ العزل بعد.
