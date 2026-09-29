# Stable Baseline — facae9fc

## المرجع

- **الـcommit المرجعي:** `facae9fc077c67c18d94c05b544ce5d60f4c851f`
  (`docs: deploy status — all pushed, manual Render deploy needed`)
- **فرع التطوير:** `feat/improve-from-stable-facae9fc` (يبدأ من هذا الـcommit بالضبط)
- **فرع الحماية:** `backup/current-state-before-restore-facae9fc` (يحفظ الحالة السابقة كاملة عند `f52c9ec` — للحماية فقط، ليس مصدرًا للتطوير)
- التغييرات اللاحقة للـcommit المرجعي (5 commits: إعادة بناء v3 «منظومة المعرفة الحيّة» + الدمجات) **لم تُستخدم كأساس للتطوير**.

## نتائج التحقق (على فرع التطوير، بلا أي تعديل على الكود)

| البوابة | النتيجة |
|---|---|
| `npm install` (تزامن lockfile) | ✅ متطابق — dependencies بين facae9fc والحالة السابقة identical |
| typecheck (backend + frontend + tests) | ✅ PASS |
| lint | ➖ لا يوجد سكربت lint في هذه النسخة من المستودع (لا في root ولا frontend ولا backend). البوابات المكافئة: typecheck + vitest + سكربتات الفحص المخصصة |
| frontend tests (vitest) | ✅ 84 ملفًا / **982 اختبارًا — كلها ناجحة** |
| backend tests (vitest) | ✅ 38 ملفًا / **1021 اختبارًا — كلها ناجحة** |
| `npm run build -w frontend` | ✅ PASS (بناء إنتاج، ~6.2s) |
| `npm run build -w backend` | ✅ PASS (exit 0، dist مولّد) |
| `scripts/check-motion-tokens.sh` | ✅ OK |
| `scripts/check-icons.sh` | ✅ OK |

## التشغيل والفحص البصري (Playwright + Chromium، خوادم محلية)

قاعدة بيانات PostgreSQL 16 محلية على المنفذ 5433 (كما في `.env`) + backend على 4000 + vite dev على 5173.

**الصفحات المفحوصة (dir=rtl و lang=ar مؤكدان في كلها):**

| الصفحة | 1440px | 390px | 320px |
|---|---|---|---|
| `/` (الرئيسية) | ✅ | ✅ | ✅ |
| `/auth` | ✅ | ✅ | ✅ |
| `/auth/register` | ✅ | ✅ | ✅ |
| `/colleges` | ✅ | ✅ | ✅ |
| `/community` | ✅ | ✅ | ✅ |

- **15/15 فحصًا ناجحًا** — لا overflow أفقي في أي مقاس، لا فشل شبكة، لا استجابات 4xx/5xx.
- الصفحة الرئيسية (ارتفاع 9980px): التمرير الكامل عبر كل الأقسام (Hero → الميزات → الرحلة → الأدوار الأربعة → المنظومة الأوسع → CTA الختامي) **بصفر أخطاء console**.
- تحقق بصري VLM للـHero والأقسام الوسطى: **9/10** — محتوى كامل، RTL سليم، لا تداخل ولا فراغات.
- الملاحظة الوحيدة: تحذيرا axe-core في dev على صفحة التسجيل فقط («Some page content is not contained by landmarks») — ملاحظة وصولية، ليست خطأ تشغيليًا، مسجلة كأول بند تحسين.

## الإصلاحات التقنية الضرورية لإحياء النسخة

**لا شيء.** النسخة عملت كما هي بلا أي تعديل على الكود. كل ما احتاجه التشغيل محليًا هو بيئة تشغيل (PostgreSQL محلي + تطبيق الهجرات + seed) — دون أي تغيير في ملفات المستودع.
