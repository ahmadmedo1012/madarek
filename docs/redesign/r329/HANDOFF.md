# R329 — «طبقة واحدة، مرجع واحد» — ONE CASCADE · HERON FIDELITY · GREEN MAIN

قائد الجولة يحدّث هذه اللوحة بعد كل push (وعلى الأقل كل ساعة). كل ادعاء بصري = لقطة مفتوحة بعين الوكيل.

## الحالة الآن (تحديث القائد №1)

- main @ `7b0db109` — CI **✅** وDeploy smoke **✅** (run 41321320210). الجذر أُصلح: parity + الـ 6 مواصفات e2e الحمراء (انظر §3 من السجل الأحمر).
- المتبقي على G1: اجتثاث `gate:clean` (صفر الأساس + إزالة override R326) · بوابة r321 (69 فشلًا) · مسح bypass في workflows (§3.5) · `scripts/pre-push.mjs` (§3.8) — A-CI يعمل عليها الآن.
- **main لا يستقبل أي تغيير بصري قبل اكتمال G1 وظهور خط الأساس (M1).**
- CSS: **51,329 سطراً** في `frontend/src/styles/` (landing 8,787 · components 5,808 · student 4,106 · polish 3,419 · teacher-quality 2,654 · owner 1,688 …) → هدف الجولة **≤ 33k** (−35%).
- `heron-fidelity`: لم يُبنَ بعد (M1). الخط الأساس يُنشر خلال أول ساعتين — الرقم يُطبع كما هو، بلا تجميل (تقدير المالك الحالي: 20–30%).
- أهداف الجولة: الرئيسية ≥ 70% · كل صفحة داخلية ≥ 60% · لجنة 3 مستقلة ≥ 9 بأسباب · تمرير ≥ 55fps تحت CPU×4 · صفر إطارات pin فارغة.

## لوحة المراحل والوكلاء

| المرحلة | الوكيل | worktree | الحالة |
|---|---|---|---|
| S0 تجهيز + هذه اللوحة | القائد | `/home/z/madarek` | ✅ |
| G أخضر main (سجل الأحمر → إصلاح الجذر → pre-push) | **A-CI** | `/home/z/madarek` | 🔄 CI أخضر @ 7b0db109 · متبقٍ: clean/r321/bypass/pre-push |
| M مقياس heron-fidelity + الخط الأساس | **A-QA** | `/home/z/w-qa` | 🔄 الاستخراج الحي جارٍ (about-us + contact-us على 4 عروض حتى الآن) |
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
| `6311d03e` (فتح الجولة، docs) | ❌ | نفس الأحمرين الموروثَين (run 41318657172) |
| `567143b8` · `c9cd658d` | ⏭️ | دفعات متلاحقة — superseded قبل انطلاق run (concurrency) |
| `7b0db109` | ✅ | **CI ✅ + Deploy smoke ✅** — parity + e2e أُصلحا من الجذر (run 41321320210) |
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

- S0 (القائد): GitHub Actions API (curl) · git.
- G1 (A-CI): GitHub Actions API (runs/jobs/logs) · Playwright e2e · البوابات المحلية (node/bash scripts) — السجل الكامل في `docs/redesign/r329/ci-red-ledger.md`.

## الإجراءات الثلاثة التالية

1. **G1 إكمال** (A-CI): `gate:clean` صفرًا (إزالة override R326) → بوابة r321 (69 فشلًا: إصلاح أو إحالة موثقة) → مسح `continue-on-error` (§3.5) → `scripts/pre-push.mjs` بقياس زمن فعلي ≤ 6 دقائق (§3.8) → تحديث §5/§6 من السجل → آخر push أخضر.
2. **M1 إكمال** (A-QA): استخراج بقية صفحات Heron الحية → سكربت `scripts/fidelity/run.mjs` بخمسة محاور + `README.md` موثق → `docs/redesign/r329/baseline.md` بالأرقام الصادقة (الرئيسية + login/about/help/app × 4 عروض × ثيمين).
3. بعد اكتمال G1: إطلاق **C (A-CSS)** و**H (A-Home)** و**T (A-Scroll)** بالتوازي فورًا (بملكية ملفات صارمة)، مع تسليم H مبنيًا على `heron-live` من M1.
