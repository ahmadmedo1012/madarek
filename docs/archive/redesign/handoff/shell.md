# Agent S (Shell) — التسليم النهائي

> عائلة الهيكل: الهيكل الموثّق + التنقّل + الدخول + أنماط الصفحات المشتركة،
> باتجاه Superlist، على فرع `redesign/shell`.

## 1) الفرع والالتزامات

| البند | القيمة |
|---|---|
| الفرع | `redesign/shell` (منشور على origin، تتبّع مثبّت) |
| القاعدة | origin/main `cabc3a3` (= r197 + r198 عبر PR #35) |
| الالتزامات | `41c5aab` feat(r210) عقد الأنماط · `986c8ab` docs(r210) إعلان الجاهزية · `4ff866c` art(r211) إكساء الهيكل · `9141c28` art(r212) تقاعد mono من الدخول · `b1fd1c9` test(r213) تثبيت e2e · r214 اعتماد تغييرات الوكلاء المتوقّفين + هذا الملف |
| الدمج | `git merge origin/redesign/shell` — بلا rebase، بلا force |

## 2) المنجز مقابل المتبقّي

**منجز (كود + UI حقيقي مُتحقَّق فيه متصفحًا):**
- **عقد الأنماط المشتركة (r210)**: `components/patterns/` الثمانية + `styles/patterns.css` —
  الصفحات (4A–4E) تستهلكها فورًا؛ التفصيل في `components/patterns/CONTRACT.md` و
  `docs/redesign/handoff/shell-contract-ready.md`.
- **إكساء الهيكل (r211)**: sidebar/topbar/bottom-nav — تقاعد smاء الليل والكوكبة
  والهالات وتسميات mono؛ صفوف أهدأ (36px سطح مكتب / 44px لمس)؛ bottom-nav
  = 4 وجهات مُقدَّمة + «المزيد» يفتح الدرج (ورقة «الأكثر» المصمّمة هي الدرج نفسه).
- **الدخول (r212 + r214)**: بطاقة سطح معتم هادئة بلا glass، تقاعد صوت mono من
  `.auth-meta`، عزل bidi لشارة الجرس.
- **الجرس ولوحة الأوامر**: مُدقَّقة حيًّا — عدّاد غير المقروء حقيقة خادم
  (`GET /notifications?limit=1` meta، سحب 60s، سقف 99+ بعزل bidi، إعلان SR)؛
  ⌘K يستدعي `/search/global` الحقيقي (تنبيع عربي) ويعرض 4 أنواع نتائج حقيقية
  (مقررات/محاضرات/بحوث/مسارات) + إجراءات التنقّل — لا بحث مزيّف.
- **التنقّل لكل دور**: `lib/nav.ts` باقٍ كما هو (مجموعات مهام مُنسَّقة r183 —
  كل وجهة تبقى قابلة للوصول)؛ حالات النشاط هادئة موحّدة.
- **404/خطأ/ممنوع**: مصمّمة سلفًا (مشهد 404 المرسوم + PermissionDeniedState +
  ErrorBoundary) — مُتحقَّق أنها على التوكنات؛ لا إعادة صياغة لازمة.

**المتبقّي (خارج ملكيتي — للمنسّق):**
- ترويسة الصفحات القديمة (`primitives/PageHeader`) تواصل خدمة صفحات 4A–4D حتى
  موجة ترحيلها إلى patterns — قرارات الترحيل للمنسّق/4E.
- إكساء onboarding البصري: أنماطه في `components.css` (ملك 4E) ومنطقه 4A —
  التزامن التوكني قائم؛ لا تعارض.
- ترقية أساس سطح السحب (audit baseline): **لم أرقّها** (ممنوع عليّ وفق المهمة) —
  على Agent Z ترقيتها بعد الدمج.

## 3) واجهة patterns النهائية (مجمّدة — CONTRACT.md هو المرجع)

```ts
PageFrame { width?: 'reading'|'default'|'wide'|'full'; children }
PageHeader { title: string; description?; eyebrow?; meta?; actions?;
             breadcrumbs?: {label: string; to?: string}[]; tabs? }
SectionHeader { title: ReactNode; description?; actions?; as?: 'h2'|'h3' }
RowList { children; density?: 'comfortable'|'compact'; 'aria-label'?; loading?; empty? }
RowItem { leading?; title; meta?; trailing?; children?(توسيع); defaultExpanded?; expandLabel? }
SplitView { list; detail: ReactNode|null; detailOpen; onDetailClose();
            detailTitle?; listWidth?: 'narrow'|'default'; emptyDetail? }
StatLine { items: {label; value; hint?; tone?; to?}[] }
FilterBar { search?: {value; onChange; placeholder?}; filters?; sort?; trailing?; sticky? }
TodayList { title?; items: {id; title; meta?; leading?; action?; to?; urgency?}[]; emptyState? }
```

## 4) مصفوفة التنقّل لكل دور (تحقّق الوصول)

| الدور | المجموعات (nav.ts — بلا تغيير) | الوصول |
|---|---|---|
| STUDENT | الرئيسية 6 · التعلم الذكي 5 · المعامل والتقنيات 3 (مطوية) · التطوير والتقدّم 6 (مطوية) · المجتمع والفرص 5 (مطوية) · حسابي 3 · خدمات الجامعة 5 (مطوية) | شريط سفلي 4 + المزيد→الدرج |
| TEACHER | لوحة التدريس 7 · التقييم والتصحيح 3 · البحث والمحاضرة 5 · حسابي 7 | نفس النمط |
| ADMIN | الإدارة 5 · النظام 8 | نفس النمط |
| QUALITY | مركز ضمان الجودة 4 · المراجعة والتقارير 8 | نفس النمط |
| OWNER | لوحة المالك 5 · المنصة 4 · المراقبة والتحليل 5 | نفس النمط |

كل وجهة قائمة قبل r211 تبقى قابلة للوصول (الخامسة في الشريط السفلي عبر الدرج).

## 5) التحقق: المسارات × المقاسات × السمات

| السطح | المقاسات | السمات | الأداة |
|---|---|---|---|
| /auth | 1440 · 390 | داكن (+فاتح سابقًا) | Playwright لقطات + 0 أخطاء كونسول |
| /student/dashboard (الهيكل كاملًا) | 1440 · 390 | فاتح · داكن | Playwright + manual eval |
| درج التنقّل (الهيكل الجوّال) | 390 | فاتح | Playwright (فتح عبر «المزيد»، إغلاق Esc) |
| ⌘K بلوحة النتائج | 1440 | فاتح | Playwright (استعلام «هندسة» → 4 صفوف حقيقية، «4 خيارات» SR) |
| تمرير أفقي | 390 | — | scrollW 380 < clientW 390 |

reduced-motion: لا حركة جديدة أُضيفت في r211–r214 (كلها إزالات زخرفة)؛
الحركات الباقية تحت حزام التصفير العام (motion.css/base.css).

## 6) البوابات (كلها خضراء على الالتزام الأخير)

| بوابة | النتيجة |
|---|---|
| lint | 0 أخطاء / 19 تحذيرًا معروفًا |
| typecheck | ×4 نظيف |
| اختبارات الواجهة | 1971/1971 |
| اختبارات الخلفية | 1783/1783 |
| e2e | 28/28 (بعد تثبيت عقد الشريط الجديد r213) |
| تكافؤ | 190/190 |
| colors / raw-css / icons / motion / CSP | كلها خضراء |
| colleges | 25/25 |
| البناء والحزمة | 635.0 / 650 KB gz · الدخول 71.2/80 |

## 7) أغلفة legacy*

**لا شيء.** لم تُزل أي واجهة عامة: `primitives/PageHeader` و`Card` و`MetricCard`
و`AlertRow` باقية كما هي لصفحات العائلات الأخرى؛ patterns تُضاف بجانبها. عندما
يكتمل الترحيل يحذفها Agent Z مباشرة (لا وسيط legacy).

## 8) ملاحظات تكامل (Agent Z)

1. **سطر استيراد واحد**: `main.tsx` أضاف `import './styles/patterns.css';` بعد
   `layout.css` — عند تعارض استيراد احتفظ به (كل الأصناف ببادئة `pf-`).
2. **mono meta في الصفحات**: `.page-header-meta` يحمل صوت mono في
   `components.css:4927` (::before) و`polish.css:715` — خارج ملكيتي؛ يُتقادى
   وفق عقد r197 (mono للمعرّفات فقط) مع ترحيل الصفحات إلى patterns/PageHeader.
3. **عيب bidi (4A)**: سطر الميتا في ترويسة لوحة الطالب يعرض «… بداية 09/10 …
   01/15» مبعثرًا — `DashboardPage.tsx` (4A) يغلّف الجريانات اللاتينية بـ
   `<bdi dir="ltr">`.
4. **onboarding**: الأنماط في components.css (4E) والمنطق 4A — الالتزام
   التوكني قائم؛ لا فعل من الهيكل.
5. **تغييرات الوكلاء المتوقّفين (r214)**: استدعاءا الوكلاء S-1a/S-1b توقّفا
   قبل التقرير لكنهما تركا تعديلين صحيحين (إسقاط glass من بطاقة الدخول؛
   توثيق عدّاد الجرس + dir="ltr") — فُحصا واعتمدتا مع كل البوابات.
6. **طلبات توكن/مكوّنات**: لا شيء — patterns راضية عن سلّم r197 الحالي.
7. **لقطات التحقق (dev-only)**: `tests/capture/r211-shell-shots.ts` +
   `r212-auth-shots.ts` + `r212-palette-check.ts` — ليست ضمن CI.
