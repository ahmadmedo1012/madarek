# 06 — الإعدادات ومتغيرات البيئة

المصدر الوحيد للسلوك: `backend/src/env.ts` (تحليل Zod وفشل مبكر) و
`frontend/vite.config.ts`. القالب: `.env.example`. مرجع الأسرار الإداري:
[`SECRETS-REFERENCE.md`](SECRETS-REFERENCE.md).

## قواعد عامة

- الخلفية تقرأ `backend/.env` محليًا (عبر dotenv) ومتغيرات بيئة Render
  في الإنتاج. الواجهة تقرأ `VITE_*` وقت البناء فقط.
- فشل متغير **إلزامي** = الخلفية لا تنهض (`process.exit(1)` برسالة واضحة).
- في `NODE_ENV=test` تُحقن قيم بديلة محددة تلقائيًا — لهذا تعمل الاختبارات
  بلا أي إعداد.
- **لا تضع قيمًا حقيقية في أي ملف متتبع.** `.env` مُتجاهل عمدًا (مع
  `!.env.example`).

## متغيرات الخلفية

| المتغير | مطلوب؟ | الافتراضي | الغرض والسلوك الفعلي |
|---|---|---|---|
| `DATABASE_URL` | **نعم** (URL صالح) | — | اتصال Prisma. في الإنتاج: سلسلة Neon **pooler** مع `sslmode=require&channel_binding=require` |
| `JWT_ACCESS_SECRET` | **نعم** (≥32 محرفًا) | — | توقيع access token (15 دقيقة). سلسلتا JWT المتطابقتان تُرفعان تحذير إقلاع |
| `JWT_REFRESH_SECRET` | **نعم** (≥32 محرفًا، مختلف عن السابق) | — | توقيع refresh token (7 أيام) وكوكي `mdrk_refresh` |
| `CORS_ORIGINS` | اختياري | `https://madarek.onrender.com` + `http://localhost:5173` | قائمة سماح مفصولة بفواصل. **انتبه:** ضبط القيمة **يستبدل** الافتراضي كليًا (لا يلحقه) — أضف نطاق الإنتاج ضمنها إن ضبطتها. لا أحرف بديلة (`*`) — الاعتمادات مفعلة. الشرائح الختامية تُقص تلقائيًا |
| `INTERNAL_SERVICE_TOKEN` | اختياري (≥16 محرفًا) | — | سر نداء خدمة→خدمة لمسار واحد: `POST /api/v1/me/milestones/:id/fire`. مقارنة SHA-256 + `timingSafeEqual`، **يفشل مغلقًا** عند عدم الضبط (403 دائم) |
| `DIRECT_DATABASE_URL` | اختياري | مشتق تلقائيًا | اتصال **مباشر غير pooler** للترحيلات فقط؛ إن غاب يشتقه `migrate-deploy.mjs` بحذف `-pooler` من اسم المضيف |
| `NODE_ENV` | اختياري | `development` | `production` يفعّل خدمة SPA من Express + كوكي Secure |
| `PORT` | اختياري | `4000` | منفذ الاستماع |
| `TZ` | يثبته `render.yaml` = `UTC` | منطقة الخادم | لا تغيّره في الإنتاج: مفاتيح أيام الحضور تُبنى على UTC والتسميات على Africa/Tripoli حسابيًا |

## متغيرات الواجهة (وقت البناء)

| المتغير | مطلوب؟ | الافتراضي | الغرض |
|---|---|---|---|
| `VITE_API_BASE_URL` | لا | `/api/v1` (نفس الأصل) | بادئة استدعاءات axios. في النشر الموحد (Render) اتركه فارغًا — الخدمة نفسها تخدم API وSPA |

## توليد آمن للأسرار

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

- سلسلتا JWT يجب أن تكونا **مختلفتين** (يُرفع تحذير عند التطابق).
- على Render تُولَّد تلقائيًا (`generateValue: true`) بطول 32 محرفًا —
  وهو الحد الأدنى الذي يقبله `env.ts` بالضبط؛ رفع حد `env.ts` يكسر
  أقمشة قائمة (ملاحظة موثقة داخل `render.yaml`).

## ملفات الإعداد الأخرى (أين وماذا)

| الملف | يضبط |
|---|---|
| `render.yaml` | خدمة النشر: أمر البناء/الإقلاع، فحص الصحة، المتغيرات، `TZ=UTC` |
| `.github/workflows/ci.yml` | 7 وظائف CI: lint، typecheck، build (بلا DB)، اختبارات الجهتين، بوابات تصميم (أيقونات+حركة+**csp-hash**+parity)، surface-drift |
| `eslint.config.mjs` | ESLint مسطح على `frontend/src` + `backend/src` (الاختبارات مستثناة في التبني الأول — مذكور TODO داخل الملف) |
| `frontend/vite.config.ts` | منفذ 5173، proxy `/api`→`4000`، تقسيم chunks ثابت (react/query/charts)، استهداف ES2022 |
| `tsconfig*.json` | strict + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`؛ `tsconfig.test.json` يضيف أشجار الاختبارات (noEmit) |
| `backend/vitest.config.ts` | حقن `NODE_ENV=test` تلقائيًا للاختبارات |
| `frontend/package.json` (سكربت test) | تثبيت `TZ=UTC` وقت الاختبار (ليس في vite/vitest config) |

## أخطاء إعداد شائعة

انظر [14-troubleshooting.md](14-troubleshooting.md) — أشهرها: نسيان
`backend/.env`، سلسلتا JWT متطابقتان، و`DATABASE_URL` بلا
`sslmode=require` مع Neon.
