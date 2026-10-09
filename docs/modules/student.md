# الوحدة: قطاع الطالب

> المسارات: `/student/*` + صفحات مشتركة (تدريب/إنجازات/مجتمع). الدور:
> `STUDENT`. المرجع الكامل لرحلاته: [../09-user-journeys.md](../09-user-journeys.md).

## خريطة الصفحات (الواجهة)

| المسار | المكوّن | الملف | ملاحظة |
|---|---|---|---|
| `/student/dashboard` | `DashboardPage` | `pages/student/DashboardPage.tsx` | استعلام مجمّع جولة واحدة `/me/dashboard` |
| `/student/courses` + `/:offeringId` | `CoursesPage`/`CourseDetailPage` | `pages/student/CoursesPage.tsx` + `CourseDetailPage.tsx` | تسليم واجبات عبر `SubmitAssignmentModal` |
| `/student/lectures/:lectureId` | `LecturePlayerPage` | `pages/student/LecturePlayerPage.tsx` | قلب الفصول المقلوبة (تتبع 10 ثوانٍ، إدماجيات) |
| `/student/matrix` | `MatrixPage` | `pages/student/MatrixPage.tsx` | خريطة حرارية + مرشحات مستويات |
| `/student/research` | `ResearchPage` | `pages/student/ResearchPage.tsx` | آلة حالات البحث بالتسميات العربية |
| `/student/library` | `LibraryPage` | `pages/student/LibraryPage.tsx` | تبويبا كتب/بحوث + بحث مطبّع 250ms |
| `/student/online-exams` (+`/:id`) | `OnlineExamsPage`/`ExamTakerPage` | `pages/exams/OnlineExamsPages.tsx` | استعادة إجابات + دفع متأخر كل 10 ثوانٍ |
| `/training`, `/:slug`, `/:slug/lesson/:lessonId` | `TrainingPages` | `pages/student/TrainingPages.tsx` | 11 مسارًا عربيًا + دروس/اختبارات |
| `/achievements`, `/student/gamification`, `/student/skills` | `TrainingPages`/`MorePages` | كما أعلاه | نقاط/شارات/مهارات |
| باقي `/student/*` (social, alerts, downloads, university, live, payment, map, profile, webinars, mooc, jobs, labs, ar, ai, results, schedule) | `MorePages`/مستقلة | `pages/student/MorePages.tsx` ومستقلات | `MorePages` حزمة مركبة (الشبكة الاجتماعية داخلها) |

## الـendpoints (الخلفية)

| المجموعة | الملف | أبرز المسارات |
|---|---|---|
| لوحة/نتائج/مواد | `student-dashboard.routes.ts` | `GET /me/dashboard`، `/me/results`، `/me/materials`، `/me/lab-sessions` |
| التعلم | `learning.routes.ts` | `GET /offerings/:id/full`، `POST /lectures/:id/watch`، إدماجيات، `GET/POST /me/research`، `POST /research/:id/scan` (10/د)، annotations، `/me/matrix`، `/me/gaps` |
| التدريب | `training.routes.ts` | `catalog`، `tracks/:slug/enroll`، `lessons/:lessonId/complete`، `me/badges`، `certificates`، `leaderboard` |
| اختبارات | نماذج `Question/ExamTemplate/ExamAttempt` | الطالب يتخذ فقط (البناء للإدارة/الأستاذ) |
| إشعارات/رسائل | `me.routes.ts` | قراءة/قراءة الكل (رسائل بحد 30/د) |
| ذكاء | `ai.routes.ts` | `POST /ai/chat` (مؤلف `gap-aware-composer`) |

## النماذج المرتبطة

`Enrollment`، `Lecture/Chapter/Checkpoint`، `WatchEvent`، `KnowledgeConcept`،
`StudentMastery`، `ResearchPaper`، `PaperAnnotation`، `Submission/Grade`،
`TrainingTrack/Lesson/Enrollment`، `LessonProgress`، `Badge`، `PointsLedger`،
`Question/ExamAttempt/ExamAnswer`، `AiConversation/Message`، `Loan`،
`MoocEnrollment`، `JobApplication`، `Post/Comment/Reaction`، `Notification`، `Message`.

## النقاط الحرجة للتعديل

- **إتمام المشاهدة**: معادلة `isWatchComplete` (≥0.95 من مدة معرفة، بلا
  قسمة صفر) و`resumeSeekSec` (أعلى نقطة −3s) — غيّرها مع اختبارها
  (`LecturePlayerPage.test.tsx`).
- **الحضور التلقائي**: إتمام كامل ⇒ PRESENT؛ مفتاح اليوم UTC — لا تلعب
  بالتواريخ خارج `backend/src/lib/dates.ts`.
- **التطبيع العربي**: أي تحسين بحث يُطبق على `backend/src/modules/search/normalize.ts`
  ومرآته الواجهية معًا (اختبارات الجهتين تثبت التكافؤ).
- **فحص البحث المحاكى**: `scanResultsFor` في `learning.routes.ts` — إن
  حوّلته لفحص حقيقي فأزل وسم المحاكاة من كل السطوح دفعة واحدة
  ([16](../16-decisions-and-limitations.md)).
