# R190 Wave D — وصفة تحويل الأسطح المُصادَق عليها (Agent Recipe)

> **المرجع**: docs/design/r190-reference-matrix.md · النظام الجديد حيّ في `93b1f7a+` (tokens + §R190 telemetry layer).
> **الأساس البصري الجديد مثبَّت مسبقًا** (بواسطة الكابتن): بنفسجي `--accent`، إسكواش الزوايا (2–6px)، خط Alexandria للعرض، IBM Plex Mono للقياس، الطبقة التلمترية (علامات ■ 7px، حواف hover بنفسجية، ألواح زجاجية داكنة، توهّج الحلقة، عقدة الترويسة).

## قواعد صارمة (بوابات ملزمة)

1. **الملفات المسموحة لك فقط** — لا تلمس شيئًا آخر إطلاقًا:
   - الوكيل D-1: `frontend/src/pages/student/**` + `frontend/src/styles/student.css`
   - الوكيل D-2: `frontend/src/pages/teacher/**` (+ ملف CSS جديد خاص `frontend/src/styles/teacher.css` إن لزم)
   - الوكيل D-3: `frontend/src/pages/admin/**`, `frontend/src/pages/colleges/**`, `frontend/src/pages/training/**` + `admin.css`, `colleges.css`, `training.css`
   - الوكيل D-4: `frontend/src/pages/quality/**`, `frontend/src/pages/owner/**` + `owner.css`
2. **ممنوع من الجميع**: `tokens.css` · `fonts.css` · `components.css` · `layout.css` · `polish.css` · `base.css` · `landing.css` · `auth.css` · `App.tsx` · `main.tsx` · أي ملف مشترك · `scripts/**` · `backend/**`. التعديلات المشتركة تُبلَّغ للكابتن في تقريرك فقط.
3. **الألوان**: `var(--*)` أو `color-mix(in srgb, var(--x) N%, transparent)` فقط — لا hex/rgb خام أبدًا (`check-colors.sh --strict` يفشل بها).
4. **المسافات/الأحجام/الأنصاف**: `var(--sp-*)` / `var(--fs-*)` / `var(--r-*)` — لا قيم خام (`check-raw-css.sh` strict).
5. **الحركة**: `var(--t-*)`/`var(--ease-*)` فقط (`check-motion-tokens.sh`).
6. **الأيقونات**: Lucide عبر `<Icon icon={...} />` فقط (`check-icons.sh`).
7. **العربية أولًا**: لا letter-spacing على نص عربي؛ لا uppercase وهمي؛ RTL منطقي (inset-inline/logical) دائمًا.
8. **التباين**: كل نص ≥4.5:1 — شغّل الصفحة واستمع لأخطاء console (axe dev-mode يطبع الانتهاكات حيًّا)؛ صلّحها.
9. **الاختبارات**: شغّل ملفات الاختبار الخاصة بدورك فقط (`npx vitest run tests/unit/<your-files> --root frontend` من مجلد frontend، أو نمط `npm run test -w frontend -- tests/unit/...`). أعد تثبيت الدبابيس (re-pin) **فقط** إذا تغيّر عقد المنتج فعليًا (تشريح جديد للعنوان مثلًا) — ولا تحذف اختبارًا أبدًا. أضف دبابيس جديدة للسلوك الجديد.
10. **لا تكسر وظيفة**: العقود (5 أدوار، 107 مسارات، البيانات، الصلاحيات) مقدسة. غيّر التكوين البصري لا المنطق.

## ماذا تفعل عمليًا (لكل صفحة في نطاقك)

1. **شغّل وافحص**: البيئة المحلية جاهزة — vite على `http://localhost:5173` والـ API على `:4000`. دخول: `curl -X POST localhost:4000/api/v1/auth/login -H 'content-type: application/json' -d '{"email":"<role>@demo.madarek.ly","password":"Madarek2026!"}'` → خزّن `mdrk-auth` (نمط persisted state في `tests/` أو `/home/z/probes/r190-before.mjs`) + `madarek-theme` بالموضوع. **مهم**: Playwright في هذه البيئة يمرر وسيطًا واحدًا فقط لـ `addInitScript` — غلّف كل شيء في JSON واحد (`JSON.stringify({a,t})` + `JSON.parse`).
2. **الموضوع للقطة مصادَق عليها**: `PUT /me/theme` بـ `LIGHT`/`DARK` قبل اللقطة (وأعده `SYSTEM` بعدها) — أو localStorage `{mode, ts:1}` (يعمل للمصفوفات العامة).
3. **قيّم بصدق**: هل الصفحة تحمل الهوية الجديدة؟ (ترويسة masthead بعقدة بنفسجية · بيانات بلغة ledger/stat-strip مع العلامات ■ · زوايا شبه مربعة · عمق داكن زجاجي). صوّر قبل/بعد لكل تغيير في `/home/z/probes/r190-d<N>/`.
4. **صلّح الملموس**: انحرافات محاذاة، تباين منخفض، فراغ ميت، عناصر r189 القديمة التي تصرخ «قالب» (شبكات بطاقات متطابقة، آبار أيقونات، eyebrow مزدحم).
5. **ارفع الحس البصري حيث يستحق**: أرقام mono بـ tabular-nums، تسميات قياس مربّعة، تسمية منطقة بلون العائلة، تدرّج لمعان على البطاقات الداكنة (`color-mix(in srgb, var(--text) 3%, var(--surface))`).
6. **اختبر**: unit tests لنطاقك + typecheck (`npx tsc --noEmit -p frontend/tsconfig.json` من جذر المستودع) + lint (`npx eslint frontend/src/pages/<your-scope>`).
7. **وثّق**: قائمة ملفات متغيرة + نتائج الاختبارات + لقطات + أي أمر يحتاج الكابتن.

## معالم البنية (كما هي في الكود — استخدمها)

- الترويسة: `PageHeader` (components/primitives) → `.page-header` (masthead + عقدة ::after بنفسجية من §R190 تلقائيًا) + `meta` mono.
- البيانات: `LedgerPanel/LedgerRow/StatStrip/Sparkline/ProgressRing/WeekRow` (components/primitives/Ledger.tsx) — كلها استلمت الطبقة التلمترية تلقائيًا.
- المناطق: `.ledger.zone-{sky|rose|mint|copper|lavender}` — رؤوس ملونة شفافة على الداكن الآن.
- الأزرار: `.btn primary` (أبيض على الداكن!) · `.btn accent` (بنفسجي) · `.btn ghost`.
- الحالة الفارغة: `.ledger-row-flat` · التحميل: skeletons القائمة.

## تسليمك النهائي (تقرير الوكيل)

- قائمة الملفات المعدّلة (paths) مع سطر واحد لكل تغيير.
- نتائج: vitest (أرقام) · tsc · eslint · لقطات (paths) قبل/بعد.
- أخطاء وحدة لا تملك صلاحية إصلاحها (CSS مشترك) → للكابتن.
- أي دبوس أعيد تثبيته ولماذا (عقد المنتج الذي تغيّر).
