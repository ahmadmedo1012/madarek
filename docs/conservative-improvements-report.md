# Conservative Improvements Report — from stable facae9fc

## نقطة البداية

- **البداية كانت من:** `facae9fc077c67c18d94c05b544ce5d60f4c851f` حصرًا (فرع `feat/improve-from-stable-facae9fc`).
- **كل التغييرات اللاحقة** لهذا الـcommit (5 commits: إعادة بناء v3 + الدمجات، حتى `f52c9ec`) **لم تُستخدم كأساس للتطوير** — محفوظة فقط في فرع الحماية `backup/current-state-before-restore-facae9fc` (على GitHub أيضًا) ولم تُنقل منها أي واجهة أو تصميم أو حركة أو مكونات.
- لم يلزم أي تعديل تقني لإحياء النسخة السليمة — عملت كما هي (تفاصيل التحقق في `docs/stable-baseline-facae9fc.md`).

## التحسينات المنفَّذة (تدريجية، كل واحدة في commit مستقل)

| # | Commit | المشكلة الفعلية (مقاسة، لا مُخمَّنة) | الإصلاح |
|---|---|---|---|
| 1 | `5dd86d9` | مخالفات axe `region` على صفحة التسجيل (`.auth-top` و`.auth-bottom` divs عارية) — إصلاح landmarks نفسه طُبّق سابقًا على AuthPage وسُهيت RegisterPage (موثّق في تعليق الكود نفسه) | `<header>` / `<footer>` بدل divs — نفس نمط AuthPage حرفيًا |
| 2 | `1486482` | مخالفة axe `link-name` ×30 (serious): الـsidebar المطوي هو الوضع الافتراضي للزيارة الأولى، والتسميات `display:none` والـTooltip يوفر `aria-describedby` فقط (وصف، لا اسم) | `aria-label={item.label}` على NavLink في الحالة المطوية فقط |
| 3 | `7379180` | مخالفة axe `role-img-alt` (serious): react-chartjs-2 يفرض `role="img"` على كل canvas بلا اسم — يصيب كل رسوم المنصة | ChartFrame يستنسخ `aria-label` إلى عنصر الرسم نفسه (مكان واحد يصلح الجميع) |
| 4 | `69a03dc` | انحراف عن المواصفة المقصودة: تعليق CSS يقول "≈44px rows (spec §4.3)" بينما الفعلي 38.8px (لمسات أصغر من المواصفة على الهاتف) | `padding-block: 4px → 7px` → صف 44.8px — تحقق VLM قبل/بعد: KEEP بلا انحدار |

**المبدأ المتبع:** كل تحسين بدأ بمشكلة مُقاسة (axe / حساب CSS / فحص متصفح)، وأقل عدد ممكن من الملفات (ملف واحد لكل إصلاح)، واختبار بصري قبل/بعد، وبوابة اختبارات كاملة بعد كل دفعة.

## ما تم فحصه ووجد سليمًا فلم يُلمس (منع التخريب)

- **Focus states:** اختبار Tab فعلي عبر 43 عنصرًا (landing + auth + dashboard) — كلها بحلقات focus مرئية، وskip-link أول عنصر قابل للتركيز. لا إصلاح مطلوب.
- **prefers-reduced-motion:** 61 قاعدة + بوابة توكين عامة تصفّر كل مدد الحركة. لا إصلاح مطلوب.
- **RTL:** `dir="rtl"` و`lang="ar"` مؤكدان على كل الصفحات؛ لا مشاكل محاذاة مكتشفة.
- **Responsive:** 15/15 فحصًا (1440/390/320px) بلا overflow أفقي — العناصر خارج الشاشة المكتشفة كلها مقصودة (marquee، sidebar مخفي، skip-link).
- **حالات الخطأ:** صفحة 404 ممتازة (عنوان عربي + تنقل)، وخطأ انقطاع الـAPI في تسجيل الدخول يعرض رسالة عربية واضحة مع إتاحة إعادة المحاولة.
- **حالة تعطل مؤقتة (consoleErr=14 على colleges موبايل في جولة واحدة):** تكرار الاختبار مرتين = صفر أخطاء — ضجيج بدء تشغيل قاعدة بيانات باردة، لا علاقة له بالتغييرات (لا تغيير يمس صفحة الكليات).

## الملفات المتغيرة (4 ملفات فقط في 4 commits)

- `frontend/src/pages/RegisterPage.tsx` (landmarks)
- `frontend/src/components/layout/Sidebar.tsx` (أسماء الـrail المطوي)
- `frontend/src/components/charts/ChartFrame.tsx` (تسمية الـcanvas)
- `frontend/src/styles/landing.css` (لمسات فوتر 44px)

## نتائج الاختبارات (بعد كل التحسينات)

| البوابة | النتيجة |
|---|---|
| typecheck (backend + frontend + tests) | ✅ PASS |
| frontend tests | ✅ 84 ملفًا / 982 اختبارًا ناجحًا |
| backend tests | ✅ 38 ملفًا / 1021 اختبارًا ناجحًا |
| `npm run build -w frontend` | ✅ PASS (5.93s) |
| `npm run build -w backend` | ✅ PASS (exit 0) |
| `check-motion-tokens` / `check-icons` | ✅ OK |
| axe-core (عام: 8 تركيبات صفحة×مقاس) | ✅ **0 مخالفات** (كانت 1) |
| axe-core (طالب مسجلًا: 10 تركيبات) | ✅ **0 مخالفات** (كانت 2 — إحداها ×30 عقدة) |
| فحص بصري Playwright (15 صفحة×مقاس) | ✅ 15/15، صفر أخطاء console ثابتة، صفر فشل شبكة |

## الصفحات والمقاسات المفحوصة بصريًا

- **عام:** `/` و`/auth` و`/auth/register` و`/colleges` و`/community` على 1440 / 390 / 320px + تمرير كامل للرئيسية (ارتفاع 9980px).
- **طالب مسجَّل:** `/student/dashboard` و`/courses` و`/library` و`/ai` و`/matrix` على 390px (login حقيقي عبر النموذج).
- **حالات خاصة:** 404 (رابط غير موجود)، انقطاع الـAPI أثناء تسجيل الدخول، Tab-focus على 3 صفحات.

## المشاكل المتبقية

لا مشاكل حرجة. ملاحظتان ثانويتان مسجلتان بلا إصلاح (تحسينات محتملة مستقبلًا إن طلبها المالك):
1. بطاقات كليات بلا أقسام فرعية تظهر بعنوان فقط — هذا **نقص بيانات حقيقية** في المصدر، وليس خطأ عرض (ولا يُخترع محتوى).
2. ملاحظات VLM الأسلوبية (إيقاع مسافات، نمط زر التالي في الـonboarding) — آراء تصميمية لا عيوبًا مقاسة؛ تُركت حفاظًا على هوية النسخة السليمة.

## طريقة الرجوع إلى الـbaseline عند أي تدهور

```bash
git checkout feat/improve-from-stable-facae9fc
git log --oneline              # حدد آخر commit جيد
git revert <commit>            # عكس أي تحسين منفردًا (كل إصلاح مستقل وقابل للعكس)
# أو الرجوع الكامل للـbaseline:
git checkout -b retry-from-baseline facae9fc077c67c18d94c05b544ce5d60f4c851f
```

فروع الأمان على GitHub (لم يُستخدم force push ولم يُحذف شيء):
- `backup/current-state-before-restore-facae9fc` — الحالة السابقة كاملة (`f52c9ec`)
- `feat/improve-from-stable-facae9fc` — خط التطوير من `facae9fc`
