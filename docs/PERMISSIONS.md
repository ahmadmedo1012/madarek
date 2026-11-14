# PERMISSIONS — the matrix (R353 E3)

Generated from `shared/permissions-matrix.ts` by `scripts/gates/gen-permissions-doc.mjs` — edit the TABLE, never this file. The seats follow docs/ROLES-LIBYA.md. The enforcement points: backend `requireRole` / `requireCapability` / ownership asserts (`backend/src/lib/permissions.ts`); the menus: `frontend/src/lib/nav.ts`. The matrix test keeps table ↔ reality honest.

## The seats

| Seat | Arabic label | AuthN role | Office / position |
|---|---|---|---|
| STUDENT | الطالب | STUDENT | — |
| TEACHER | الأستاذ | TEACHER | — (all faculty ranks are profile data) |
| TEACHER+DEAN | الأستاذ · عميد الكلية | TEACHER | عميد الكلية (position + positionFacultyId) |
| TEACHER+ASSOCIATE_DEAN | الأستاذ · وكيل الكلية | TEACHER | وكيل الكلية |
| TEACHER+DEPARTMENT_HEAD | الأستاذ · رئيس القسم | TEACHER | رئيس القسم |
| ADMIN+REGISTRAR_GENERAL | المسجل العام | ADMIN | المسجل العام (unscoped) |
| ADMIN+COLLEGE_REGISTRAR | مسجل الكلية | ADMIN | مسجل الكلية (scopeFacultyId) |
| QUALITY+EXAMS_CONTROLLER | مراقب الامتحانات | QUALITY | قسم الدراسة والامتحانات (owns EXAMS_MODERATE) |
| QUALITY+QUALITY_OFFICER | موظف الجودة | QUALITY | مكتب الجودة (no exam moderation) |
| OWNER | مالك المنصة | OWNER | platform owner |

## The matrix (37 rules)

### users — حسابات المستخدمين

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | college registrar is narrowed to scopeFacultyId by the +fac guard (users.routes buildScopedUserWhere) |
| إنشاء (create) | المسجل العام · مسجل الكلية | المؤسسة | — |
| تعديل (edit) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | self-service edits (profile, password) are every-user actions outside this matrix |
| حذف (delete) | _none (by design)_ | المؤسسة | no seat deletes accounts — accounts are deactivated (isActive=false), preserving the academic record |

### bulk-import — الاستيراد الجماعي (قوائم الطلاب)

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | المسجل العام · مسجل الكلية | المؤسسة | — |

### reset-link — روابط إعادة تعيين كلمة المرور

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | المسجل العام · مسجل الكلية | المؤسسة | — |

### enrollments — التسجيل في الشُعب

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | الطالب · المسجل العام · مسجل الكلية · مالك المنصة | ما يملكه فقط | students see their own enrollments (GET /enrollments/me) |
| إنشاء (create) | المسجل العام · مسجل الكلية · الأستاذ | المؤسسة | teachers hold only the batch-enroll path (/import/enroll) for their own offerings — the R352-era contract, kept explicit |
| حذف (delete) | المسجل العام · مسجل الكلية | المؤسسة | — |

### catalog — دليل المقررات والكليات والأقسام

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | الطالب · الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مراقب الامتحانات · موظف الجودة · مالك المنصة | المؤسسة | — |
| إنشاء (create) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | the registrar RECORDS the catalogue; the academic approval workflow (dept head proposes → dean approves) is a documented next step |
| تعديل (edit) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | — |

### offerings — شُعب المقررات

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | — |
| اطلاع (view) | الطالب · الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مراقب الامتحانات · موظف الجودة · مالك المنصة | المؤسسة | content-level access is narrower: enrolled/taught/oversight (assertOfferingAccess); this row is the roster/catalog view |

### curriculum — المحاضرات والفصول والمواد

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم | ما يملكه فقط | CURRICULUM_EDIT_OWN — leadership seats keep the teaching powers they layer on top of |
| تعديل (edit) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | — |

### attendance — الحضور والغياب

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم | ما يملكه فقط | — |
| اطلاع (view) | الطالب · الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مراقب الامتحانات · موظف الجودة · مالك المنصة | ما يملكه فقط | students see only their own rows; oversight seats see within their scope |

### grades — الدرجات

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | the R353 E3 inventory flagged ADMIN grade-writes as a mismatch with the no-admin-grading philosophy — the registrar does NOT grade; the route still admits ADMIN today (documented deviation, owner decision pending) |
| اطلاع (view) | الطالب · الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مراقب الامتحانات · موظف الجودة · مالك المنصة | ما يملكه فقط | students see only their own rows |

### question-bank — بنك الأسئلة

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | EXAMS_AUTHOR |

### exam-templates — نماذج الامتحانات

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | — |

### exam-moderation — اعتماد نماذج الامتحانات

| Action | Seats | Scope | Note |
|---|---|---|---|
| اعتماد (approve) | مراقب الامتحانات · مالك المنصة | المؤسسة | R353 E2: the quality-office default is GONE — مراقب الامتحانات (قسم الدراسة والامتحانات) owns the control point per docs/ROLES-LIBYA.md |

### exam-attempts — اجتياز الامتحانات

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | الطالب · الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مالك المنصة | ما يملكه فقط | — |
| تقييم (grade) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | — |

### research-papers — أوراق البحث

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الطالب | ما يملكه فقط | — |
| تقييم (grade) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · مالك المنصة | ما يملكه فقط | — |

### quality-dashboards — لوحات الجودة والتقييم

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | مراقب الامتحانات · موظف الجودة · مالك المنصة | المؤسسة | — |

### quality-reports — تقارير الجودة

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | مراقب الامتحانات · موظف الجودة · مالك المنصة | المؤسسة | — |

### announcements-faculty — إعلانات الكلية/القسم/المقرر

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | الأستاذ · الأستاذ · عميد الكلية · الأستاذ · وكيل الكلية · الأستاذ · رئيس القسم · المسجل العام · مسجل الكلية · مراقب الامتحانات · موظف الجودة · مالك المنصة | كليته | — |

### announcements-platform — إعلانات المنصة

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | المسجل العام · مالك المنصة | المنصة كلها | — |

### teacher-verification — توثيق ملفات الأساتذة

| Action | Seats | Scope | Note |
|---|---|---|---|
| اعتماد (approve) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | credentials verification is a registrar job (the records office); the ROLES_ASSIGN capability gates it |

### teacher-positions — التعيينات الأكاديمية (عميد/وكيل/رئيس قسم)

| Action | Seats | Scope | Note |
|---|---|---|---|
| اعتماد (approve) | المسجل العام · مالك المنصة | المؤسسة | appointments are recorded by the registrar; the university council decides (outside the platform today) |

### role-assignment — منح الأدوار والصلاحيات

| Action | Seats | Scope | Note |
|---|---|---|---|
| اطلاع (view) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | ROLES_ASSIGN (view the grant surface); the owner console mints OWNERs (invitation-only) |
| تعديل (edit) | المسجل العام · مسجل الكلية · مالك المنصة | المؤسسة | grant/revoke capabilities + staff seats (R353 E2 validateStaffRoleSeat) |

### institutions — المؤسسات

| Action | Seats | Scope | Note |
|---|---|---|---|
| إنشاء (create) | مالك المنصة | المنصة كلها | — |

### system-settings — إعدادات المنصة وأعلام الميزات

| Action | Seats | Scope | Note |
|---|---|---|---|
| تعديل (edit) | مالك المنصة | المنصة كلها | — |

_Regenerated 2026-11-14 · 37 rules · 23 resources._
