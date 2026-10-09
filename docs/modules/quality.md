# الوحدة: قطاع ضمان الجودة (QUALITY)

> الدور: `QUALITY` — **قطاع رقابة قرائي بالكامل**: لا endpoint كتابة
> واحد لهذا الدور. تصميم مقصود: الجودة تراقب ولا تعدّل. القدرة المفتاحية:
> `QUALITY_VIEW` (+ `EXAMS_MODERATE` لرقابة الاختبارات). ADMIN يرى نفس
> اللوحات (نطاق كلية إن وُجد).

## خريطة الصفحات (الواجهة)

7 لوحات مجمّعة في ملف واحد `frontend/src/pages/quality/QualityPages.tsx`
(1,221 سطرًا، 7 مكونات، هوكات استعلام محلية بمفاتيح `['quality', …]`)،
وشاشة ثامنة (رقابة الاختبارات) تعيش في `pages/exams/OnlineExamsPages.tsx`:

| المسار | المكوّن | المحتوى |
|---|---|---|
| `/quality/dashboard` | `QualityDashboardPage` | نظرة مجمعة: حلقي/أعمدة/خطوط عبر `ChartFrame` (كل رسم `role="img"` + جدول بديل مخفي) |
| `/quality/courses` | `QualityCoursesPage` | جودة المقررات بمقاييس فرز |
| `/quality/professors` | `QualityProfessorsPage` | رضا/التزام لكل أستاذ |
| `/quality/engagement` | `QualityEngagementPage` | منحنى تفاعل + مؤشر صدق `weeklyActiveEstimated` (تقدير معلن لا حقيقة مقيسة) |
| `/quality/curriculum` | `QualityCurriculumPage` | شجرة كلية→قسم→مقرر |
| `/quality/reports` | `QualityReportsPage` | تقارير |
| `/quality/alerts` | `QualityAlertsPage` | تنبيهات (مثل أعلام نسب فحص — بمدى المحاكاة المعلن) |
| `/quality/exam-moderation` | `ExamModerationPage` — في `pages/exams/OnlineExamsPages.tsx` | رقابة قوالب الاختبارات (قدرة `EXAMS_MODERATE`) |
| `/quality/community` | مشترك | إعلانات |

## الـendpoints (الخلفية)

ستة مسارات قراءة داخل `backend/src/http/routes/learning.routes.ts`، كلها
بوابة `requireCapability('QUALITY_VIEW')`:

- `GET /api/v1/quality/overview` — مجمّعة مؤسسية
- `GET /api/v1/quality/courses` — لكل مقرر
- `GET /api/v1/quality/professors` — أداء أساتذة
- `GET /api/v1/quality/engagement` — تفاعل (مع حقل تقدير أسبوعي)
- `GET /api/v1/quality/curriculum` — شجرة المناهج
- `GET /api/v1/quality/alerts` — تنبيهات (كشف انتحال: عتبات فوق مدى
  المحاكاة، فالأعلام تأتي من حالات أخرى)

رقابة الاختبارات تمتد عبر مسارات القوالب/المحاولات المتاحة لقدرة
`EXAMS_MODERATE` في ملفات الامتحانات.

## النماذج المرتبطة (قراءة)

كل شيء: `Course/CourseOffering`, `Enrollment`, `WatchEvent`, `StudentMastery`,
`ResearchPaper` (بدون `extractedText`), `AttendanceRecord`, `ExamTemplate/Attempt`،
وإحصاءات مجمعة — عبر تجميعات Prisma (groupBy/count) لا نماذج خاصة.

## النقاط الحرجة للتعديل

- **حافظ على القرائية**: إضافة endpoint كتابة للجودة = تغيير تصميمي
  يحتاج قرارًا وتوثيقًا في [../16](../16-decisions-and-limitations.md)،
  وليست تحسينًا.
- **الصدق في التسميات**: أي رقم تقديري يحمل لاحقة/علم «estimated» في
  الواجهة — اتبع النمط، لا تعرض التقدير كقياس.
- **الملف الضخم**: `QualityPages.tsx` مركز — إضافة لوحة جديدة إليه
  اتبع نمطه (هوك محلي + `ChartFrame`)؛ تقسيم الملف لاحقًا قرار منفصل.
- **نطاق الكلية**: إن كان لـADMIN نطاق، فالمرشح يطبق تلقائيًا عبر
  `buildScopedUserWhere` — لا تفترض رؤية جامعية كاملة.
