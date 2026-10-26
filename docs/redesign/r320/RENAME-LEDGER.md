# RENAME-LEDGER — «الإدارة» → «المسجل العام» (R320 §B, task c1-RENAME)

The ADMIN role (enum `Role.ADMIN`, routes `/admin/*`, DB values, JWT claims,
CSS classes, test ids — ALL UNCHANGED) is renamed **everywhere a human reads
it**: «الإدارة» → «المسجل العام», «لوحة الإدارة» → «لوحة المسجل العام».

**Canonical forms** (spelling per the R320 board/mission — «مسجل» without
shadda, «عامّون/عامّين» with):

| Form | Use |
|---|---|
| «المسجل العام» | role chip, nav group label, demo button, badge, messages (definite singular) |
| «لوحة المسجل العام» | dashboard titles, breadcrumbs, `document.title`, tab titles |
| «تقارير المسجل العام» | reports surface |
| «نطاق المسجل العام: كلية …» | scoped-admin scope chip tooltip |
| «المسجل العام · كلية …» | scoped-admin visible scope chip |
| «مسجل عام» | indefinite (تعيين مسجل عام، حساب مسجل عام) |
| «المسجلون العامّون» / oblique «المسجلين العامّين» | plurals (owner filters, KPIs, backend messages) |
| «مسجلون عامّون» | indefinite plural (filter pill, parallel to «طلاب/أساتذة») |

**Classification rules applied** (from the mission):
- **RENAME** — names the role / person / office / dashboard of `Role.ADMIN`.
- **KEEP** — a genuinely DIFFERENT thing: the university **building**
  («الإدارة المركزية» captions in university-media), **management-function**
  names («إدارة الأساتذة/الطلاب/المقرّرات/المنهج/المستخدمين/الصلاحيات…»),
  the **finance office** («الإدارة الماليّة», PaymentPage), the
  **platform-administration voice** («إدارة المنصّة» — the r177
  brand-neutrality register owned by `r177-brand-neutrality.test.ts`, and the
  OWNER's «مدير المنصة» wording), generic adjectives («إداريّ» =
  administrative), content data (course topics, research abstracts, study
  skills), historical records (CHANGELOG, docs/archive, docs/redesign/*,
  docs/releases), technical identifiers.
- **REWORD** — grammar/naming must bend around the new masculine-singular
  term, or a comment/doc that names the role needed its prose updated.

Technical identifiers untouched by construction: `Role.ADMIN`, `ADMIN_NAV`,
`isAdmin`, `/admin/*` URLs, DB values, JWT claims, CSS class names, test ids,
`sheet-code.ts` (`A-01 · ADMIN`), BottomNav ADMIN slot labels (الرئيسية/
الكلّيّات/الطلاب/الأساتذة/التقارير — no role name), `ADMIN_USER` fixture ids.

Machine-readable KEEP sidecar: `docs/redesign/r320/rename-keep.json`.
One source of truth: `frontend/src/lib/roleLabels.ts` + backend twin
`backend/src/lib/roleLabels.ts` (cross-referenced, belt-locked equal).

---

## 1. frontend/src — role-label sources (Step 2: all consume roleLabels.ts)

| File | Occurrence | Decision | Action |
|---|---|---|---|
| `lib/roleLabels.ts` | NEW | — | `ROLE_LABELS` (STUDENT طالب · TEACHER أستاذ · ADMIN **المسجل العام** · QUALITY أخصائي جودة · OWNER مالك المنصة — other roles keep their established wording) + `roleLabel()` + `ROLE_DASHBOARD_LABELS`/`roleDashboardLabel()` (ADMIN → «لوحة المسجل العام») + `AUTH_DEMO_ROLE_LABELS` (the auth demo buttons' established short forms, ADMIN now «المسجل العام») |
| `lib/nav.ts:390` | `ROLE_LABELS.ADMIN: 'إداري'` | RENAME | map moves to roleLabels.ts; nav.ts re-exports it (every current import keeps working) |
| `lib/nav.ts:235` | ADMIN nav group label `'الإدارة'` | RENAME | → `'المسجل العام'` (NOT «الإدارة العامة») — sidebar/drawer group label + topbar kicker + r305-nav-maps belt |
| `lib/nav.ts:237` | `'لوحة الإدارة'` nav item | RENAME | → `'لوحة المسجل العام'` — feeds NAV_TITLES → sidebar/topbar/`document.title` |
| `lib/nav.ts:238,252,258` | إدارة الأساتذة/المقرّرات/الطلاب | KEEP | management-function names (mission: «إدارة الطلاب» stays) |
| `lib/nav.ts:322` | owner: إدارة المستخدمين | KEEP | management function |
| `lib/nav.ts:205,207` | teacher: إدارة البث المباشر | KEEP | teacher surface's function name |
| `lib/nav.ts:409-410` | doc comment «admin → "إداري" / "إداري كلّيّة"» | REWORD | comment updated to the new labels |
| `components/layout/Topbar.tsx:283` | title `نطاق الإدارة: ${name}` | RENAME | → `نطاق المسجل العام: …` (ADMIN) / `نطاق أخصائي الجودة: …` (QUALITY — was sharing the admin wording; role-aware now) |
| `components/layout/Topbar.tsx:284` | chip `'إداري كلّيّة'` | REWORD | → `ROLE_LABELS.ADMIN` («المسجل العام · كلية …») — QUALITY branch unchanged |
| `components/layout/Topbar.tsx:179` | `ROLE_LABELS[membership.role]` | (auto) | consumes nav's re-export → new label for free |
| `components/layout/Sidebar.tsx` | `displayRoleLabel(...)` + group labels | (auto) | flows from nav.ts/roleLabels.ts |
| `components/layout/AppShell.tsx:94` | `/admin/permissions/:id` title «إدارة الصلاحيات» | KEEP | management function |
| `pages/AuthPage.tsx:563` | demo button `<span>الإدارة</span>` | RENAME | buttons consume `AUTH_DEMO_ROLE_LABELS` (ADMIN → «المسجل العام»; other roles' wording unchanged) |
| `pages/community/CommunityPages.tsx:53` | `ROLE_LABEL.ADMIN: 'الإدارة'` (badge map) | RENAME | consumes shared `roleLabel()` (badge = role label, mission: community role badge) |
| `pages/owner/OwnerUsersPage.tsx:52-59` | local `ROLE_LABELS` ADMIN `'إداري'` | RENAME | consumes shared map |
| `pages/owner/OwnerUsersPage.tsx:254` | filter pill `'إداريون'` | RENAME | → `'مسجلون عامّون'` (mission: owner users filter) |
| `pages/owner/OwnerUsersPage.tsx:313` | KPI `'إداريون وجودة'` | REWORD | → `'مسجلون عامّون وجودة'` (parallel to طلاب/أساتذة pills); hint `'إدارة ومتابعة'` KEEP (function description) |
| `pages/owner/OwnerUsersPage.tsx:301` | title «إدارة المستخدمين» | KEEP | management function |
| `pages/admin/AdminGovernancePages.tsx:87-94` | local `ROLE_LABEL` ADMIN `'إداري'` | RENAME | consumes shared map |
| `pages/admin/AdminGovernancePages.tsx:803` | `roleLabel = role === 'ADMIN' ? 'الإداريّ' : 'مكتب الجودة'` | RENAME | → `roleLabel('ADMIN')` = «المسجل العام» («نطاق صلاحيّة المسجل العام») |
| `components/pdf/AnnotationsPanel.tsx:313-318` | RoleBadge ADMIN `'إداري'` | RENAME | consumes shared `roleLabel()`; comment updated (R320 note) |
| `components/onboarding/OnboardingFlow.tsx:88` | ADMIN greeting `'مرحباً بك أيها المسؤول'` | REWORD | → `'مرحباً بك أيها المسجل العام'` |
| `components/onboarding/OnboardingFlow.tsx:90,96` | OWNER `'مدير المنصة'`; ADMIN `'أدواتك الإدارية'` | KEEP | OWNER wording (other role); generic adjective |
| `data/university-media.ts:63-65,185-187` | «مقرّ إدارة جامعة بنغازي», «الإدارة المركزية بالقبّة», alts | KEEP | the university BUILDING (Commons photos + captions — mission KEEP example) |
| `data/university-media.ts:280,282` | capture `titleAr/altAr: 'لوحة الإدارة'` | RENAME | → `'لوحة المسجل العام'` (the ADMIN dashboard product capture) |
| `data/university-media.ts:336` | `roleAr: 'للإدارة'` (5-role showcase) | REWORD | → `'المسجل العام'` — LandingPage strips a leading `ل` for the card title; a «للمسجل العام» entry would render the dangling «لمسجل العام», so the definite form (no leading ل) renders the clean card title «المسجل العام» |
| `pages/LandingPage.tsx:961` | statement line `<strong>للإدارة</strong>` | RENAME | → `'للمسجل العام'` (3-line roles statement; 3-segment personas list has no admin row — verified) |
| `pages/teacher/TeacherIntelligencePage.tsx:344` | tab `'إدارة المنهج'` | KEEP | curriculum management function |
| `pages/teacher/TeacherIntelligencePage.tsx:180` | `'من قِبَل إدارة الشؤون الأكاديمية'` | RENAME | → `'من قِبَل المسجل العام'` — the platform actor that assigns offerings is Role.ADMIN (offerings.routes); the office that names it is now the registrar |
| `pages/teacher/TeacherLivePage.tsx:161` | h1 «إدارة البث المباشر» | KEEP | management function |
| `pages/teacher/TeacherLabsPage.tsx:182` | «تواصل مع إدارة المنصة» | KEEP | r177 platform-administration voice |
| `pages/teacher/ExamAuthorPages.tsx:662,1282` | «إدارة المنصة» ×2 | KEEP | r177 platform-administration voice (capability grants/categories) |
| `pages/teacher/TeacherPages.tsx:184` | «فور تسجيل الجداول … من قِبَل الإدارة» | RENAME | → «من قِبَل المسجل العام» |
| `pages/teacher/TeacherPages.tsx:1255,1940` | «تواصل مع الإدارة» ×2 | RENAME | → «تواصل مع المسجل العام» |
| `pages/teacher/TeacherProfilePage.tsx:164` | «تواصل مع إدارة شؤون أعضاء هيئة التدريس» | RENAME | → «تواصل مع المسجل العام» (the platform actor that links profiles/verifies teachers is ADMIN) |
| `pages/teacher/TeacherProfilePage.tsx:216` | «كما يظهر للإدارة» | RENAME | → «كما يظهر للمسجل العام» |
| `pages/teacher/TeacherProfilePage.tsx:453,486` | «لدى إدارة الجامعة» ×2 | RENAME | → «لدى المسجل العام» (research records are managed by ADMIN on the platform) |
| `pages/teacher/TeacherProfilePage.tsx:511` | «من قِبَل إدارة الشؤون الأكاديمية» | RENAME | → «من قِبَل المسجل العام» |
| `pages/student/PaymentPage.tsx:139,181` | «إعلانات الإدارة الماليّة» ×2 | KEEP | the finance office (mission KEEP example) |
| `pages/student/PaymentPage.tsx:175` | «الساعات المعتمدة من الإدارة» | KEEP | continues the finance-office working-hours card (office hours approved by the administration) — not the role name |
| `pages/student/CatalogPage.tsx:33` | comment `(إدارة الكلية)` | REWORD | comment → `(مكتب المسجل العام)` matching the door note |
| `pages/student/CatalogPage.tsx:175` | «التسجيل … عبر إدارة الكلية — تواصل مع إدارة مؤسستك» | RENAME | → «التسجيل في المقرّرات يتم عبر مكتب المسجل العام — تواصل مع مؤسستك.» (the enrollment door is the scoped ADMIN) |
| `pages/student/CatalogPage.tsx:227` | «ستظهر هنا فور إضافتها من الإدارة» | RENAME | → «من المسجل العام» |
| `pages/student/CoursesPage.tsx:234` | «تواصل مع إدارة الكلّيّة لإكمال تسجيل مقرّرات الفصل» | RENAME | → «تواصل مع المسجل العام لإكمال تسجيل مقرّرات الفصل» |
| `pages/student/MoocPage.tsx:158` | «تربط إدارة الكلّيّة دورات Coursera…» | RENAME | → «يربط المسجل العام دورات Coursera…» (MOOC linking is the ADMIN catalog surface) |
| `pages/student/MorePages.tsx:477` | css-note «صفوف إدارة هادئة» | KEEP | design comment, management-function |
| `pages/student/MorePages.tsx:1214` | «حين يقوم الإداريّون بإضافتها» | REWORD | → «حين يضيفها المسجل العام» (AR/VR catalog = ADMIN surface) |
| `pages/colleges/CollegePages.tsx:346` | «حين يقوم الإداريّون بإضافتها» | REWORD | → «حين يضيفها المسجل العام» (faculties CRUD = ADMIN) |
| `pages/RegisterPage.tsx:106` | «تواصل مع إدارة الجامعة» | RENAME | → «تواصل مع المسجل العام» (departments are managed by ADMIN) |
| `pages/RegisterPage.tsx:112,114` | «إدارة المنصّة» | KEEP | r177 platform-administration voice (institutions are OWNER-created) |
| `pages/RegisterPage.tsx:448` | «والإدارة وضمان الجودة تُمنح بالتعيين» | RENAME | → «والمسجل العام وضمان الجودة تُمنح بالتعيين» |
| `pages/RegisterPage.tsx:449` | «تواصل مع إدارة جامعتك» | REWORD | → «تواصل مع المسجل العام في جامعتك» |
| `pages/quality/QualityPages.tsx:403` | «الأكاديمي والإداري والتقني» | KEEP | generic adjective |
| `pages/owner/OwnerInstitutionsPage.tsx:113,320,324,403,410,511,524,610,646,648,705,708` | «مدير مؤسسة / المديرون / تعيين المدير / مديرًا / لا مديرين» ×12 | RENAME | the institution-admin provisioned here IS `Role.ADMIN` (institution.routes.ts creates role ADMIN) — two names for one role is exactly the drift §B kills → «مسجل عام» forms: «تعيين مسجل عام للمؤسسة», «تعيين المسجل العام», «تمّ تعيين X مسجلاً عاماً لـ«Y»», «إلغاء عضوية المسجل العام», «المسجلون العامّون» (column), «لا مسجلين عامّين بعد», «تعيين مسجل عام» |
| `pages/owner/OwnerInstitutionsPage.tsx:574` | «إدارة المؤسسات التعليمية على المنصّة» | KEEP | management function |
| `pages/owner/OwnerContentPage.tsx:113`, `OwnerDashboardPage.tsx:543`, `OwnerSystemPage.tsx:209`, `OwnerAlertsPage.tsx:147` | إدارة الإعلانات/المستخدمين/البنية التحتية/والمراقبة | KEEP | management functions |
| `App.tsx:450` | comment «الارتداد إلى لوحة الإدارة» | REWORD | → «لوحة المسجل العام» |
| `lib/authErrors.ts:9` | comment quoting 403 «…إدارة الجامعة» | KEEP | quotes a backend message example (the platform-administration voice — unchanged; the passthrough contract is verbatim) |
| `lib/paperStatus.ts:5,6` | comments «الإداري يرى العكس» / «خريطة الإدارة» | REWORD | comments → «المسجل العام» (names the role's view) |
| `hooks/resources/student.ts:305` | comment `(إدارة الكلية)` | REWORD | → `(مكتب المسجل العام)` matching the catalog door note |
| `hooks/resources/learning.ts:137` | comment «إدارة المنهج» | KEEP | management function |
| `components/curriculum/*` (5 files) | «إدارة المنهج» panel names | KEEP | management function |
| `styles/notifications.css:647`, `styles/training.css:150` | «صفوف إدارة هادئة» / family list «الإدارة» | KEEP / REWORD | notifications.css = function (KEEP); training.css lists the surfaces family → «المسجل العام» |
| `styles/polish.css:1128` | comment «لوحة الإدارة (37px)» | REWORD | → «لوحة المسجل العام» (names the admin dashboard's touch floor) |
| `data/testimonials.config.ts` | EMPTY BY DESIGN | — | no role labels exist (verified) |

## 2. frontend/src — admin page titles/breadcrumbs (Step 3)

All breadcrumbs `{ label: 'لوحة الإدارة', to: '/admin/dashboard' }` and every
`title="لوحة الإدارة"` page header → **«لوحة المسجل العام»** (consumes
`roleDashboardLabel('ADMIN')`):

| File | Lines | Decision |
|---|---|---|
| `pages/admin/AdminPages.tsx` | 260, 291, 325 (headers ×3), 707, 720, 756, 1210, 1223, 1240, 1665 (breadcrumbs ×7) | RENAME ×10 |
| `pages/admin/AdminPages.tsx:192` | hint «فتح إدارة المقرّرات» | KEEP (function) |
| `pages/admin/AdminPages.tsx:1025` | comment «للطالب والإداري» | REWORD → «للطالب والمسجل العام» |
| `pages/admin/AdminPages.tsx:1661` | title «إدارة المقرّرات» | KEEP (function) |
| `pages/admin/AdminSyncPage.tsx` | 230, 250, 269, 296 breadcrumbs ×4 | RENAME |
| `pages/admin/AdminExtraPages.tsx` | 148, 470, 591 breadcrumbs ×3 | RENAME |
| `pages/admin/AdminExtraPages.tsx:675` | link «تقارير الإدارة» | RENAME → «تقارير المسجل العام» |
| `pages/admin/AdminExtraPages.tsx:653` | comment «المتاح فعلياً للإدارة» | REWORD → «للمسجل العام» |
| `pages/admin/AdminExtraPages.tsx:146` | title «إدارة الطلاب» | KEEP |
| `pages/admin/AdminGovernancePages.tsx` | 339 breadcrumb | RENAME |
| `pages/admin/AdminGovernancePages.tsx:104,337,573,1054` | إدارة المستخدمين/الأساتذة/الصلاحيات/صلاحيات هذا المستخدم | KEEP (functions) |
| `pages/admin/AdminGovernancePages.tsx:660` | «بالتعيين الإداريّ» | KEEP (adjective) |
| `pages/admin/AdminGovernancePages.tsx:930` | comment (r183-B6 note) | KEEP (historical decision note) |

`document.title` flows from nav.ts NAV_TITLES + AppShell's title effect — no
separate call sites exist (verified: AppShell.tsx:276 writes
`${title} · مدارك` from the resolved nav title).

## 3. backend/src + backend/prisma

| File | Occurrence | Decision | Action |
|---|---|---|---|
| `src/lib/roleLabels.ts` | NEW | — | backend twin (cross-ref comment ↔ frontend twin; belt-locked equal) |
| `http/routes/teacher.routes.ts:1087` | «نطاق الإدارة يخص الإداريين وأخصائيي الجودة فقط» | REWORD | → «تعيين النطاق يخص المسجلين العامّين وأخصائيي الجودة فقط» (names the ADMIN/QUALITY scope feature) |
| `http/routes/teacher.routes.ts:599` | «إدارة الكود» course topic | KEEP | content data |
| `modules/auth/auth.service.ts:174,451` | «إدارة المنصّة» ×2 | KEEP | r177 platform-administration voice (invitation-only accounts / disabled accounts); pinned by r177-brand-neutrality.test.ts:227 (≥2 occurrences) |
| `http/routes/institution.routes.ts:249` | «عند إنشاء حساب مدير جديد» | RENAME | → «عند إنشاء حساب مسجل عام جديد» (the provisioned account is Role.ADMIN) |
| `http/routes/institution.routes.ts:294` | «مالك المنصة لا يُعيَّن مديراً لمؤسسة» | RENAME | → «لا يُعيَّن مسجلاً عاماً لمؤسسة» |
| `modules/institution/institution.dto.ts:68,75` | «حساب مدير جديد» ×2 | RENAME | → «حساب مسجل عام جديد» |
| `lib/ai.ts:313` | system prompt «لأعضاء هيئة التدريس والإدارة» | REWORD | → «لأعضاء هيئة التدريس والمسجلين العامّين» |
| `prisma/seed.ts:342-356` | admin demo user `إدارة/الجامعة`, initials `إد` | RENAME | → firstName `المسجل` / lastName `العام` (renders «المسجل العام»), initials `مع` (mission: «إدارة الجامعة» demo user → «المسجل العام») |
| `prisma/seed.ts:455-470` | admin2 demo user `إدارة/الأندلس`, initials `إأ` | RENAME | → `المسجل`/`العام` + initials `مع` (same role, second institution) |
| `prisma/seed.ts:25,29` | header comments «(إدارة الجامعة)»/«(إدارة الأندلس)» | REWORD | → «(المسجل العام)» ×2 matching the new display names |
| `prisma/seed.ts:785,1195,1334,1355,1427,1431` | إدارة المشاريع/الجلسة/الوقت/المراجع/المهام | KEEP | content data (skills, research abstracts, study topics) |
| `src/modules/search/__tests__/normalize.test.ts:18` | `normalizeArabicSearch('إدارة')` | KEEP | arbitrary Arabic word for the normalizer test — not a role label |

No backend email/notification/CSV/PDF templates name the role (verified:
`rg "Role.ADMIN" backend/src` consumers are guards/queries; the exports and
notification modules carry no role labels; `lib/pdf.ts` has none).

## 4. Tests (re-pinned with `R320 override` notes; repo convention)

| File | Occurrence | Decision |
|---|---|---|
| `unit/AuthPage-alignment.test.tsx:227` | roleButtons `['طالب','أستاذ','الإدارة',…]` | RE-PIN → 'المسجل العام' |
| `unit/r305-topbar-cluster.test.tsx:363-374` | ADMIN chip `'إداري كلّيّة'` + kicker `'الإدارة'` + title `'نطاق الإدارة: …'` | RE-PIN → 'المسجل العام' / kicker 'المسجل العام' / role-aware titles (QUALITY row re-pinned to its own title) |
| `unit/loading-closure.test.tsx:194` | h1 `'لوحة الإدارة'` | RE-PIN → 'لوحة المسجل العام' |
| `unit/r305a8-admin-core-heron.test.tsx:235` | `'لوحة الإدارة'` | RE-PIN |
| `unit/RegisterPage-departments-errors.test.tsx:110` | the no-departments message | RE-PIN → new message |
| `unit/OwnerInstitutionsPage.test.tsx` | 14 × «تعيين مدير/المدير/مدير مؤسسة» | RE-PIN → مسجل عام forms |
| `unit/r305a8-owner-core-heron.test.tsx:126,400` | fixture `firstName: 'مدير'` + button «تعيين مدير» | RE-PIN → «مسجل عام» forms |
| `unit/TeacherPages-messages-compose.test.tsx:205,209` | fixture user «إدارة الجامعة» (an ADMIN correspondent) | RE-PIN → «المسجل العام» |
| `unit/AdminConsolePages.test.tsx:362,376,390` | comments citing «لوحة الإدارة» | REWORD comments (assertions untouched) |
| `e2e/r319-auth-stack.e2e.ts:36` | ADMIN dashboard heading `'لوحة الإدارة'` | RE-PIN → 'لوحة المسجل العام' |
| `unit/r177-brand-neutrality.test.ts:226-227` | asserts auth.service «إدارة المنصّة» ≥2, NOT «إدارة الجامعة» | KEEP (messages unchanged — stays green) |
| `unit/AuthPage-rate-limit.test.tsx:19,140,144` | fabricated passthrough message «…إدارة الجامعة» | KEEP (verbatim-passthrough fixture, not a role label) |
| `unit/r305a8-admin-gov-heron.test.tsx:229,273` | «إدارة الأساتذة/الطلاب» | KEEP (functions) |
| `unit/r305a8-owner-ops-heron.test.tsx:216` | «إدارة المستخدمين» | KEEP |
| `unit/r305a7-lib-heron.test.tsx:326` | research title «إدارة قواعد البيانات» | KEEP (content) |
| `unit/search-normalize.test.ts:32` | normalizer input | KEEP |
| `unit/r305-nav-maps.test.tsx` | ROLE_LABELS-driven assertions | RE-PIN → the ADMIN role label «المسجل العام» now EQUALS the ADMIN nav group label (one name everywhere) → `getByText` saw both; group labels re-pinned as an exact ordered census on `.nav-section-label`, the account chip on `.sidebar-user-role` (R320 override notes in-file) |
| `unit/CurriculumAuthoringPanel.test.tsx` | «إدارة المنهج» ×4 | KEEP |
| `e2e/admin-confirm.e2e.ts:44` | title «إدارة المقرّرات · مدارك» | KEEP (function) |
| `e2e/fixtures/api-fixtures.ts:112` | OWNER fixture `المدير الأعلى` | KEEP (OWNER role wording) |
| NEW `unit/r320-rename-belt.test.ts` | — | belt 1 (no «الإدارة» role label outside KEEP allowlist, source-scan of role-label code paths) + belt 2 (frontend/backend roleLabels twins match, same keys, ADMIN = «المسجل العام») |

## 5. Docs / README (role names in prose)

RENAME (living docs — applied): `README.md:14` (roles list), `README.md:43`
(sector heading «إدارة وحاكمية» → «المسجل العام والحاكمية»), `AGENTS.md:42`,
`docs/README.md:47`, `docs/01-overview.md:39,66`, `docs/02-features.md:114,138,164,226`,
`docs/03-architecture.md:111`, `docs/05-setup.md:84,88` (seed display names),
`docs/08-api-reference.md:51`, `docs/09-user-journeys.md:72,102` (journey
heading + the owner institutions journey's «تعيين مديرها» → «تعيين مسجلها
العام»), `docs/10-security.md:27`, `docs/11-testing.md:60,95,145,236`
(journey coverage + «الحذف الإداري» → «حذف المسجل العام» + the
institutions-flow row's «بذر مدير/دخول المدير» → «بذر مسجل عام/دخول
المسجل العام»), `docs/16-decisions-and-limitations.md:31`,
`docs/launch-readiness.md:81` («الطلبة في الإدارة» → «الطلبة في لوحة
المسجل العام»), `docs/FRONTEND-REFERENCE.md:209` (ADMIN_NAV group list),
`docs/modules/admin.md:1` (module title), `docs/modules/student.md:29`,
`docs/PROJECT-REFERENCE.md:198`, `docs/SECRETS-REFERENCE.md:72` (seed
display names), `docs/runbooks/operator-pilot-guide.md:29,49` (the LIVING
operator guide's demo-account role label — re-classified from the initial
«historical runbook» KEEP: the guide drives real demos today, so its role
label must not drift), `docs/architecture/multi-institution/data-scope-inventory.md:31,35`
(«مدير مؤسّسة»/«واجهات الإدارة المؤسسية» — both NAME `Role.ADMIN`),
`docs/architecture/multi-institution/architecture-decisions.md:26,114`
(«مدير مؤسّسة (ADMIN)» — the doc explicitly equates the term with the
role; «يُجهِّز مديرها الأول» → «يُجهِّز مسجلها العام الأول»).

KEEP (historical records / different meanings): `CHANGELOG.md` (release
history — names as they shipped), `docs/archive/**`, `docs/releases/**`,
`docs/redesign/**` (past-cycle boards/handoffs — historical; the live r320
BOARD quotes the rename itself), `docs/design/**` (historical fidelity
specs — e.g. `r191-turion-fidelity-spec.md:112` quotes the landing card
copy as it was specced), `docs/phase-completion-ledger.md:24` (closed
phase record), `README.md:17` («وإدارة أكاديمية بحاكمية» — governance
capability prose), `docs/01-overview.md:7` («أدوات الإدارة الأكاديمية» —
capability prose), `docs/13-maintenance.md:1,34,48`
(maintenance/schema/content management), `docs/06-configuration.md:4`
(«الأسرار الإداري» adjective), `docs/12-deployment.md:290` («مسار إدارة»
management path), `docs/modules/owner.md:39` (management function),
`docs/modules/admin.md:4,24` («إدارة المستخدمين والمقررات» root paths +
«حزمة إدارة /admin/stats…» bundle — management functions; the initial
draft counted line 4 as RENAME, corrected on application), `docs/README.md:33,73`
(management functions), `docs/02-features.md:171,204`
(«مودال إدارة تسجيلات» / «إدارة مستخدمين وأدوار» functions),
`docs/16-…:52,75,80` (function/adjective), `docs/11-testing.md:132`
(«المقرّر الإداري» adjective), `docs/API-REFERENCE.md:370` («Admin
Extras» — the `admin-extras.routes.ts` module's name, a technical
identifier), «مدير حزم» (package manager — npm) wherever it appears,
`README.en.md` (verified: no ADMIN role-name prose — English mentions
are technical identifiers only).

## 6. Census totals

- `rg "الإدارة|الادارة|إدارة|الإداري|الإدارية|مدير|Administration"` over
  frontend/src + backend/src + backend/prisma + frontend/tests: **185 hits /
  72 files** pre-sweep (docs add ~97 more; CHANGELOG/archive dominate the
  KEEP side).
- Ledger rows: **RENAME 101 · KEEP 67 · REWORD 28** (row = one decision over
  one occurrence or a same-decision run within a file; the per-file tables
  above are the authoritative rows — the close-out docs sweep added the
  operator-pilot-guide/architecture-docs RENAME rows and split the
  admin.md line-4 correction, totals recomputed at close).

## 7. Post-sweep audit (filled at close — the verification bar)

`rg -n "الإدارة" frontend/src backend/src` → **9 hits / 3 files, every one a
KEEP row**:

| Hit | KEEP reason |
|---|---|
| `backend/src/lib/__tests__/roleLabels.test.ts:57,59` | the twin-lock belt itself — its test name + regex QUOTE the retired label to assert its absence from every role label (a belt quoting the pattern it bans; added at close, the file post-dates the §3 table) |
| `frontend/src/data/university-media.ts:64,65,185,186` | the university BUILDING — «الإدارة المركزية» captions/alt ×3 + «تفصيلة من مبنى الإدارة» ×1 (mission KEEP example; keep.json rows) |
| `frontend/src/pages/student/PaymentPage.tsx:139,175,181` | the finance office — «إعلانات الإدارة الماليّة» ×2 + the working-hours card's «الساعات المعتمدة من الإدارة» (mission KEEP example; keep.json rows) |

Belt 1 (`frontend/tests/unit/r320-rename-belt.test.ts`) locks the same
invariant going forward: the 13 role-label code paths it scans may carry
the definite-form label ONLY on lines covered by a `rename-keep.json`
KEEP phrase (the 4 keep rows above), the live maps must carry
«المسجل العام» / «لوحة المسجل العام», and the ADMIN nav group label =
the role label (one name everywhere).

Living-docs audit: `rg "الإدارة|الادارة" README.md README.en.md AGENTS.md
docs/` (minus archive/releases/redesign) → 3 hits, all KEEP
(`docs/01-overview.md:7` capability prose, `docs/13-maintenance.md:1`
management, `docs/design/r191-turion-fidelity-spec.md:112` historical
spec snapshot). CHANGELOG + archive + releases + redesign/** carry the
historical record untouched.

## 8. Close-out verification (the bar)

- `npx tsc -b --noEmit` (frontend) → **0 errors**
- `npx tsc --noEmit` (backend) → **0 errors**
- `npm run test -w frontend` → **225 files / 2621/2621 passed** (218s;
  2599 baseline + 22 new belt tests)
- `npm run test -w backend` → **77 files / 1790/1790 passed** (34s;
  1783 baseline + 7 new twin-lock tests)
- `npm run lint` → **0 errors** (15 pre-existing warnings — the R319
  close's own count, untouched)
- new belts: `r320-rename-belt.test.ts` **22/22** ·
  `backend/src/lib/__tests__/roleLabels.test.ts` **7/7**
- wrap check (evidence: `audits/evidence/r320/rename/` — 30 WebP ≤48KB
  each + EVIDENCE.md): every surface renders the longer label with no
  truncation/ellipsis/shrink/overflow — demo button 120×44 1L, drawer
  group label ONE line (33px = padding + line box, same as «النظام»),
  role chip 179×21 nowrap, h1 wraps to 2 lines @390 (the sanctioned
  Heron fix), breadcrumbs 1L @390/1440 × light/dark. No CSS fix needed.
  VLM read-back on the before pair confirms the old label («الإدارة»)
  was what shipped pre-sweep.
