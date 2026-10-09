# الوحدة: قطاع الأستاذ

> الدور: `TEACHER` (+ الوصول المقروء لـADMIN/OWNER لحراس الملكية
> `assertOwnsOffering` بتجاوز المالك). المسار الجذري: `/teacher/*`.

## خريطة الصفحات (الواجهة)

| المسار | الملف | الغرض |
|---|---|---|
| `/teacher/dashboard` | `pages/teacher/TeacherDashboardPage.tsx` | KPIs + اتجاه 6 أسابيع (`groupBy` خلفي، غلاف `trendCoverage`) |
| `/teacher/intelligence` (+`/:offeringId`) | `TeacherIntelligencePage.tsx` + `TeacherOfferingDetailPage.tsx` | «الذكاء الأكاديمي»: مخاطرة/تحليلات شعبة |
| `/teacher/research` | `TeacherPages.tsx` → غلاف `ResearchReviewPage` | مسح/درجة/نشر بحوث بشروح PDF |
| `/teacher/{schedule,attendance,grades,materials,students,performance,assignments,messages}` | `pages/teacher/TeacherPages.tsx` (حزمة) | العمليات اليومية |
| `/teacher/{ai,library,alerts,labs,community,profile,live}` | مستقلة | أدوات مشتركة/قطاعية |
| — (غير مسجل) | `pages/teacher/ExamAuthorPages.tsx` | بنك الأسئلة/قوالب الاختبارات: **صفحة مبنية بلا مسار** — انظر الفجوة في [../16](../16-decisions-and-limitations.md) |

## الـendpoints (الخلفية)

| الملف | المسارات |
|---|---|
| `teacher.routes.ts` (10) | `/teacher/me/offerings`، `/teacher/offerings/:id/students` (نموذج مخاطرة)، `/:id/analytics`، `/teacher/risks`، `/:id/attendance`، `POST /:id/curriculum/suggest` — **ويستضيف أيضًا 4 مسارات حاكمية إدارية** (`/admin/teachers/...`, `/admin/users/:id/scope`) — بقايا ترتيب موثقة (11-d P2-19) |
| `teacher-dashboard.routes.ts` (3) | `/teacher/dashboard`، `/teacher/me/materials`، `/teacher/me/assignments` (بوابة TEACHER\|ADMIN\|OWNER) |
| `teacher-profile.routes.ts` (5) | `GET/PATCH /me/teacher-profile`، `GET/POST /live/sessions`، `POST /live/sessions/:id/lifecycle` (آلة حالات أمامية + مطالبة بـ`updateMany` شرطي) |
| `curriculum.routes.ts` (9) | CRUD للمحاضرات/الفصول/الإدماجيات تحت `/offerings/:offeringId/lectures` و`/lectures/:lectureId/...` — حذف محاضرة بسجل مشاهدة يرد 409 |
| `submissions.routes.ts` (2) | `POST /offerings/:offeringId/assignments/:assignmentId/submit` (طالب)، `POST /submissions/:id/grade` (تصحيح) |
| `offerings.routes.ts` (9) | قائمة (منتقي نطاق لكتّاب الإعلانات)، مواد، واجبات، درجات، حضور |

## النماذج المرتبطة

`TeacherProfile` (رتبة/منصب/توثيق)، `CourseOffering`, `Lecture/Chapter/Checkpoint`,
`WatchEvent`, `AttendanceSession/Record`, `Assignment/Submission/Grade`,
`ResearchPaper/PaperAnnotation`, `LiveSession`.

## النقاط الحرجة للتعديل

- **نموذج المخاطرة** مرجعيّ في `backend/src/lib/risk.ts`:
  `40%·حضور + 40%·درجة + 20%·مشاهدة` — الحضور المئوي يستثني EXCUSED،
  ودالتا الظرف (100% للمخاطرة، null للوحات) مقصودتان — غيّر بثنائي
  اختبارهما.
- **تصحيح دقيق فقط**: الدرجات تمر بـ`lib/grading.ts` (D12) — لا مطابقة
  جزئية إطلاقًا.
- **اقتراح المنهج حتمي** (قوالب كلمات مفتاحية) — لا تصفه «ذكاءً اصطناعيًا»
  في أي سطر.
- **مسارات الحاكمية في teacher.routes** بقايا تنظيم معروفة — عند لمسها
  لا توسّعها؛ الميل العكسي يظل قرارًا صريحًا موثقًا.
