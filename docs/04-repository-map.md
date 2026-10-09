# 04 — خريطة المستودع

> 859 ملفًا متتبعًا. هذه الخريطة تركز على ما له قيمة هندسية — ليس فهرسًا
> أعمى لكل ملف. للاستكشاف: `git ls-files` أو محررك.

## الشجرة الجذرية

```text
madarek/
├── AGENTS.md              ← عقد عمل وكلاء الذكاء الاصطناعي (ابدأ من هنا أنت أيضًا)
├── README.md              ← بوابة المشروع (عربي) · README.en.md (إنجليزي)
├── BACKEND.md             ← مرجع الخلفية (إنجليزي، متزامن مع الشيفرة)
├── DESIGN.md              ← كانون نظام التصميم كما يُشحَن (قيم من الشيفرة)
├── CHANGELOG.md           ← موجز الجولات rNNN
├── CONTRIBUTING.md        ← قواعد المساهمة وبوابات الجودة
├── SECURITY.md            ← الإفصاح الأمني المسؤول (قنوات خاصة فقط)
├── LICENSE                ← ترخيص احتكاري (© Ahmad Medo — لا حق نشر)
├── package.json           ← npm workspaces: backend + frontend (مدير الحزم الرسمي npm)
├── eslint.config.mjs      ← تكوين ESLint المسطح (src الجهتين)
├── render.yaml            ← مخطط نشر Render (الخدمة، المتغيرات، TZ=UTC)
│
├── backend/               ← الخلفية (Express + TS + Prisma)      [03-architecture]
│   ├── src/index.ts       ← نقطة الإقلاع: اتصال DB، استماع :4000، المجدول، إطفاء رشيق
│   ├── src/app.ts         ← تجميع التطبيق: الوسائط، CSP، الصحة، المسارات، SPA
│   ├── src/env.ts         ← تحليل متغيرات البيئة (فشل مبكر عند نقص الإلزامي)
│   ├── src/http/routes/   ← 25 ملف مسارات (188 endpoint مسجلًا) + 3 راوترات وحدات (4 مسارات)
│   ├── src/http/middleware/ ← auth، rate limits، errorHandler، validate
│   ├── src/modules/       ← auth (جلسات/أقفال/سياسة كلمات)، search (تطبيع عربي)،
│   │                        theme، onboarding، milestones، zu-sync
│   ├── src/lib/           ← jwt، password، permissions، governance، dates،
│   │                        risk، grading، compression، pagination، pdf، errors
│   ├── src/scheduler.ts   ← مهام يومية داخلية (zu-sync + تسريح LoginEvent)
│   ├── prisma/schema.prisma ← 75 نموذجًا و30 enum (مصدر الحقيقة للبيانات)
│   ├── prisma/migrations/ ← 16 ترحيلًا مطبقًا (لا تُعدّل)
│   ├── prisma/seed.ts     ← بذر تجريبي idempotent (حسابات demo الخمسة)
│   ├── scripts/migrate-deploy.mjs ← ترحيل صامد للنشر (pooler/direct ذكي)
│   ├── storage/papers/    ← ملفات PDF للبحوث (تُقرأ من المستودع؛ لا رفع تشغيلي)
│   └── tests/             ← 38 ملف اختبار (vitest، بلا DB) — 1021 اختبارًا
│
├── frontend/              ← الواجهة (React 18 + Vite + TS)          [03-architecture]
│   ├── index.html         ← القشرة: RTL، SEO، JSON-LD للكليات، bootstrap السمة الداخلي
│   ├── src/main.tsx       ← ترتيب CSS المقصود + StrictMode
│   ├── src/App.tsx        ← جدول المسارات (98 صفًا) + HomeRedirect + lazy
│   ├── src/components/layout/AppShell.tsx ← الهيكل: Sidebar/Topbar/BottomNav + ProtectedRoute
│   ├── src/pages/         ← 52 ملف صفحات (~95 مكون صفحة) مجمعة بالأدوار
│   ├── src/components/    ← layout، overlays، primitives، motion، pdf، curriculum،
│   │                        charts، player، landing، onboarding
│   ├── src/hooks/         ← useResources.ts (~120 هوك API)، useOwner، useAuth…
│   ├── src/stores/        ← Zustand: auth، theme، ui، onboarding
│   ├── src/lib/           ← api.ts (axios + refresh)، queryClient، nav، format،
│   │                        chartTheme، overlayStack، scrollLock
│   ├── src/styles/        ← 18 ملف CSS: tokens/motion/base/components… + زوج تصدير التكافؤ
│   ├── src/data/colleges.config.ts ← سجل هوية 25 كلية (موثق بتباين AA)
│   ├── tests/             ← 88 ملف (unit + motion + gallery) — 1015 اختبارًا
│   └── tests/audit/       ← جرد أسطح Playwright (opt-in عبر AUDIT_BASELINE=1)
│
├── docs/                  ← مركز التوثيق: هذا الدليل 01–16 + modules/ + المراجع المولّدة
│   ├── archive/           ← توثيق تاريخي مستبدل + تقارير جولات التصميم (لا يُحدَّث)
│   ├── superpowers/       ← مواصفة نموذج الحاكمية المعتمد (منفَّذ)
│   └── screenshots/       ← لقطات README + ملاحظات الالتقاط
├── specs/                 ← مواصفات الميزات 001–012 (نية زمنية — الحالة في SPECS-REFERENCE)
├── audits/                ← 27 تقرير تدقيق بصري (جولتا 4 و5) — أدلة تاريخية
├── scripts/               ← بوابات جودة (csp-hash، icons، motion، parity، i18n، colleges)
│                            + أدوات لقطات Playwright المحلية (snap*.mjs)
├── tools/                 ← boot-pg.sh: PostgreSQL مدمج للتطوير بلا Neon (:5433)
├── design-system/         ← مسودة SpeckKit قديمة (لافتة SUPERSEDED — لا تستخدمها)
└── .github/               ← ci.yml (7 وظائف) + قوالب Issues/PR ثنائية اللغة
```

## نقاط الدخول الفعلية

| ماذا؟ | الملف |
|---|---|
| إقلاع الخادم (إنتاج ومحلي) | `backend/src/index.ts` |
| تجميع Express والوسائط | `backend/src/app.ts` → `createApp()` |
| إقلاع الواجهة | `frontend/src/main.tsx` → `frontend/src/App.tsx` |
| جدول مسارات الواجهة | `frontend/src/App.tsx` (`AppRoutes`) |
| بناء النشر (Render) | `package.json` الجذر: `npm run build` → build الواجهتين + `db:deploy` |

## «أين أعدّل ماذا؟» — دليل المهام الشائعة

| المهمة | الملفات | وثيقة التفصيل |
|---|---|---|
| endpoint جديد | `backend/src/http/routes/<القطاع>.routes.ts` + DTO بالـZod + اختبار قرار نقي | [15-development-guide](15-development-guide.md) |
| صفحة جديدة | `frontend/src/pages/<القطاع>/` + مسار في `App.tsx` + مدخل `lib/nav.ts` + عنوان في `NAV_TITLES` | [15-development-guide](15-development-guide.md) |
| نموذج/عمود جديد | `backend/prisma/schema.prisma` → `npm run db:migrate` → أرفق الترحيل | [07-database](07-database.md) |
| لون/حركة جديدة | `frontend/src/styles/tokens.css` أو `motion.css` فقط + زوج التصدير | `DESIGN.md` + بوابات الجودة |
| تعديل `index.html` الداخلي | حدّث بصمة CSP في `backend/src/app.ts` (خطأ شائع — بوابة `check-csp-hash` تلتقطه) | [10-security](10-security.md) |
| رسالة مستخدم جديدة | عربية صريحة في الصفحة (لا i18n بعد) | [16](16-decisions-and-limitations.md) |
| حقائق الجامعة | `backend/src/lib/zu-sync/static-source.ts` | [modules/admin.md](modules/admin.md) |
| هوية الكليات | `frontend/src/data/colleges.config.ts` (بوابة `validate:colleges` تفرض AA) | [modules/platform.md](modules/platform.md) |

## مجلدات لا تعدّلها مباشرة

| المجلد | لماذا |
|---|---|
| `node_modules/`، `backend/dist/`، `frontend/dist/` | مولّدة/اعتماديات — `.gitignore` يغطيها |
| `backend/prisma/migrations/` | ترحيلات مطبقة تاريخيًا — أنشئ ترحيلًا جديدًا لا تعدّل القديم |
| `docs/archive/`، `audits/`، `specs/*/` | مواد تاريخية بأدلة زمنية — لا تُحدَّث retrospectively |
| `design-system/madarek-zawia-university-lms/` | مسودة مُستبدلة بلافتة — المرجع `DESIGN.md` |
| `frontend/src/styles/unified-parity.css` + `shared-design-system.css` | زوج تصدير التكافؤ — مرجع داخلي **غير مستورد في التطبيق**؛ تتحقق منه بوابة parity 163/163 |
| `backend/storage/papers/` | ملفات مُقدَّمة تخدمها واجهة `/files/papers` — إضافة ملفات تتم عبر مسار مراجعة، لا يدويًا في الإنتاج |
| `.zcode/` | شخصيات وكلاء عامة غير خاصة بمشروع مدارك (انظر `.zcode/README.md`) |
