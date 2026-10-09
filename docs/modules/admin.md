# الوحدة: قطاع الإدارة (ADMIN)

> الدور: `ADMIN` (مقيد اختياريًا بنطاق كلية عبر `User.scopeFacultyId`).
> المسارات الجذرية: `/admin/*` + إدارة المستخدمين والمقررات.

## خريطة الصفحات (الواجهة)

| المسار | الملف | الغرض |
|---|---|---|
| `/admin/dashboard` | `pages/admin/AdminPages.tsx` | مؤشرات `/admin/stats` من قاعدة البيانات |
| `/admin/faculties`, `/admin/courses`, `/admin/reports` | `AdminPages.tsx` | بنية الجامعة + تقارير حية + مقررات بصفحات |
| `/admin/students`, `/admin/digital`, `/admin/settings`, `/admin/analysis` | `pages/admin/AdminExtraPages.tsx` | كشوف ببحث عميق `?q=`، تبنٍّ رقمي، إعدادات؛ «analysis» يعيد التوجيه إلى `/admin/reports` |
| `/admin/teachers`, `/admin/permissions/:id` | `pages/admin/AdminGovernancePages.tsx` | توثيق أستاذ + تعيين منصب + محرر قدرات |
| `/admin/sync` | `pages/admin/AdminSyncPage.tsx` | zu-sync: زناد يدوي + سجل `SyncRun` |
| `/admin/community`, `/admin/alerts` | حزم مشتركة | إعلانات بنطاق + تنبيهات |

## الـendpoints (الخلفية)

| الملف | المسارات وملاحظاتها |
|---|---|
| `users.routes.ts` (3) | `GET /users` (مقيد نطاقًا)، `GET /users/:id` (select صريح — لا تسريب)، `PATCH /users/:id` (حرس تعطيل ذاتي + قفل آخر مالك + تدقيق) |
| `permissions.routes.ts` (5) | `GET /me/permissions`، `GET /admin/users`، `GET/PUT /admin/users/:id/permissions`، `POST /admin/users/:id/role` — كل تغيير يرفع `tokenVersion` |
| `courses.routes.ts` (5) | CRUD مقررات؛ حذف يفحص التبعيات → 409؛ يصدّر `offeringVisibilityFilter` (يستهلكه sibling — بقايا تنظيم معروفة) |
| `catalog.routes.ts` (23) | الكتب/الاستعارة/إرجاع، MOOC وتسجيله، الوظائف والتقديم، المنشورات والتفاعلات، مختبرات/AR، وحزمة إدارة `/admin/stats|faculties|reports|courses` |
| `admin-extras.routes.ts` (3) | `/admin/students`، `/admin/papers` (**لا يُشحن `extractedText` أبدًا**)، `/admin/digital` |
| `sync.routes.ts` | `GET /admin/sync` (قدرة `USERS_MANAGE|QUALITY_VIEW`)، `POST /admin/sync/trigger` (حرس تزامن مشترك مع المجدول → 409 عند التعارض) |
| `enrollments.routes.ts` | تسجيل/إلغاء (إداري): سعة بـ`SELECT … FOR UPDATE`، إلغاء مدقّق |

## النماذج المرتبطة

`User/RolePermission/UserPermission`، `Faculty/Department`، `Course/CourseOffering/Enrollment`،
`Book/Loan`، `MoocCourse/Enrollment`، `Job/JobApplication`، `Post/…`، `Announcement`،
`UniversityFact/SyncRun`، `AuditLog`.

## النقاط الحرجة للتعديل

- **حقائق الجامعة**: `backend/src/lib/zu-sync/static-source.ts` — مصدر
  منسّق قابل للاستبدال بجالب حقيقي (واجهة fetcher جاهزة). `collegeCount`
  هناك = 26 (قائمة الجامعة) بينما سجل الواجهة 25 — التوازن موثق في
  [../02](../02-features.md) و[../16](../16-decisions-and-limitations.md)؛
  لا تلمس أحد الجانبين دون قرار.
- **الحاكمية أولاً**: أي تعديل أدوار/حالات يمر بـ`lib/governance.ts`
  (قفل آخر مالك، توفير أستاذ، تدقيق بنفس المعاملة) — لا تتجاوزه أبدًا.
- **الخصوصية في القوائم**: حذّ إظهار حقول حساسة (`extractedText`,
  `passwordHash`) — اختبارات المخططات تثبّت انتقائية الحقول.
