# R329 — «طبقة واحدة، مرجع واحد» — ONE CASCADE · HERON FIDELITY · GREEN MAIN

قائد الجولة يحدّث هذه اللوحة بعد كل push (وعلى الأقل كل ساعة). كل ادعاء بصري = لقطة مفتوحة بعين الوكيل.

## الحالة الآن (S0 — فتح الجولة)

- main @ `1fce615` — CI **❌** في وظيفتين (انظر سجل CI). بقية الوظائف السبع ✅.
- CSS: **51,329 سطراً** في `frontend/src/styles/` (landing 8,787 · components 5,808 · student 4,106 · polish 3,419 · teacher-quality 2,654 · owner 1,688 …) → هدف الجولة **≤ 33k** (−35%).
- `heron-fidelity`: لم يُبنَ بعد (M1). الخط الأساس يُنشر خلال أول ساعتين — الرقم يُطبع كما هو، بلا تجميل (تقدير المالك الحالي: 20–30%).
- أهداف الجولة: الرئيسية ≥ 70% · كل صفحة داخلية ≥ 60% · لجنة 3 مستقلة ≥ 9 بأسباب · تمرير ≥ 55fps تحت CPU×4 · صفر إطارات pin فارغة.

## لوحة المراحل والوكلاء

| المرحلة | الوكيل | worktree | الحالة |
|---|---|---|---|
| S0 تجهيز + هذه اللوحة | القائد | `/home/z/madarek` | ✅ |
| G أخضر main (سجل الأحمر → إصلاح الجذر → pre-push) | **A-CI** | `/home/z/madarek` | 🔄 |
| M مقياس heron-fidelity + الخط الأساس | **A-QA** | `/home/z/w-qa` | 🔄 |
| C توحيد CSS (خريطة التراكم → اجتثاث الميت → @layer) | A-CSS | يُنشأ بعد G/M | ⏳ |
| H الرئيسية = Heron (قسمًا قسمًا من الاستخراج الحي) | A-Home | يُنشأ بعد G/M | ⏳ |
| T عقد التمرير (Lenis واحد · motion.md · pin الفارغ) | A-Scroll | يُنشأ بعد G/M | ⏳ |
| P1 عامة · P2 طالب · P3 معلم · P4 مسجل/مالك | A-Public / A-Student / A-Teacher / A-Admin | لاحقًا | ⏳ |
| X الجوال (نفس التوكنز بعد C) | A-Mobile | لاحقًا | ⏳ |
| Q الإنهاء (REPORT.md + تنظيف) | القائد | — | ⏳ |

## سجل CI (sha · الحالة · الوظائف)

| sha | CI | ملاحظات |
|---|---|---|
| `1fce615` (رأس الجولة، run 41315560287) | ❌ | design-gates خطوة `verify-parity-export.mjs` · e2e خطوة `test:e2e` — البقية ✅ |
| (يُحدَّث بعد كل push) | | |

## حقائق البيئة (موروثة من R328 ومُتحقَّق منها في S0)

- التبعيات مثبتة في `/home/z/madarek` (root 483M + backend + frontend) — **لا تشغّل `npm ci`** إلا لضرورة قصوى.
- Playwright chromium + webkit مثبتة في `~/.cache/ms-playwright`.
- بقاء العمليات الخلفية: `bash -c 'setsid nohup CMD </dev/null >log 2>&1 &'` (الصندوق يحصد اليتامى).
- المنافذ: **3000 محجوز لمشروع آخر في الصندوق — ممنوع**. اترك 5173 لـ e2e webServer. استخدم 5175+ للمعاينة.
- API محلي عند الحاجة: `node scripts/r319/local-db.mjs start` (PG مدمج :5433) ثم `DOTENV_CONFIG_PATH=backend/.env.local PORT=4000 npm run dev -w backend`. حسابات اختبار: `*@test.ly` / `12345678`.
- **ممنوع** root `npm run build` (يسلسل db:deploy ويحتاج DB حية).
- فرض الداكن (فخ R327 Z10): `localStorage['madarek-theme'] = JSON.stringify({state:{mode:'dark',modeUpdatedAt:Date.now()},version:2})` + `mdrk-theme-profile` قبل الرسم. الموافقة على الكوكيز عبر `madarek.consent` قبل اللقطات المقيَّمة. الإزاحات عبر `window.__mdrkLenis.scrollTo(y,{immediate:true})`.
- الصندوق: 2 CPU · ~5GB قرص حر — الوظائف الثقيلة تسلسليًا لا بالتوازي.

## قواعد الدفع (غير قابلة للتفاوض)

1. commit + push إلى main بعد كل خطوة صغيرة؛ رسالة تنتهي بـ `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
2. قبل كل push: `git fetch origin && git rebase origin/main` (وكلاء متوازيون على نفس main).
3. بعد كل push: تحقق من CI فعليًا عبر API وسجّل السطر في سجل CI أعلاه. main أحمر = توقف كل شيء حتى يُصلَح.
4. لا رقعة فوق رقعة: كل تعديل CSS = تعديل القاعدة المالكة أو حذفها. لا `!important`. لا ID selectors.
5. لا تُكتب التوكنات في أي ملف مُلتزَم.

## المهارات/الأدوات المستخدمة (تُحدَّث مع كل تقرير وكيل)

- S0 (القائد): GitHub Actions API (curl) · git · Playwright متوفر.

## الإجراءات الثلاثة التالية

1. **G1** (A-CI في `/home/z/madarek`): بناء `docs/redesign/r329/ci-red-ledger.md` من آخر 50 run → إصلاح جذر parity (`verify-parity-export.mjs`) وe2e (toast) و`gate:clean` (صفر الأساس + إزالة override R326) وبوابة r321 (69 فشلًا) وإزالة كل `continue-on-error` → `scripts/pre-push.mjs` + `.githooks/pre-push`. أول أمر: `curl -s -H "Authorization: Bearer $GITHUB_TOKEN" ".../actions/runs?per_page=50"`.
2. **M1** (A-QA في `/home/z/w-qa`): `npm install` ثم استخراج حي من https://heronaiapp.com (1440/1024/768/390) إلى `docs/redesign/r329/heron-live/` → سكربت `scripts/fidelity/` بخمسة محاور → `docs/redesign/r329/baseline.md` خلال أول ساعتين.
3. بعد تسليم G1 + M1: إطلاق **C (A-CSS)** و**H (A-Home)** و**T (A-Scroll)** بالتوازي، بملكية ملفات صارمة.
