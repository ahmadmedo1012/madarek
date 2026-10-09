# 12 — النشر والتشغيل (Render + Neon)

النشر **تلقائي** عند كل دفع إلى `main` (`autoDeploy: true`) — لا يوجد
إجراء نشر يدوي في المستودع. المخطط: `render.yaml`. لا توجد خطوات نشر في
CI (يبني ويفحص فقط).

## المتطلبات

1. حساب Render (خدمة Blueprint) + قاعدة Neon PostgreSQL.
2. سرّا JWT مختلفان (يولدهما Render تلقائيًا إن أنشأت الخدمة من المخطط).
3. سلسلة اتصال Neon **pooler**.

## الخطوات الثلاث (كما في README)

1. اربط المستودع بـRender: **New + → Blueprint** واختر `madarek`.
   `render.yaml` ينشئ خدمة `web` باسم `madarek` (runtime node، خطة
   مجانية، إقليم `virginia` — بجوار أساسي Neon لتقليل زمن الاستعلام).
2. من تبويب **Environment**، ضع `DATABASE_URL` بسلسلة Neon pooler:
   `postgresql://…?sslmode=require&channel_binding=require`.
3. دفع إلى `main` → يبني وينشر تلقائيًا.

## ماذا يفعل البناء فعليًا؟

```text
buildCommand: npm ci --include=dev && npm run build
```

- `--include=dev` إلزامي: Render يضبط `NODE_ENV=production` قبل التثبيت،
  وبلا هذه العلامة ستتخطى أدوات البناء (tsc/vite/prisma CLI).
- `npm run build` (الجذر) = بناء الواجهة → بناء الخلفية → `db:deploy`
  الذي يشغّل **`prisma migrate deploy`** عبر `backend/scripts/migrate-deploy.mjs`
  (اختيار pooler/direct ذكي + إيقاظ Neon + 3 محاولات — التفصيل في
  [07-database](07-database.md)).
- ثم `startCommand: npm run start` → `node backend/dist/index.js`.

> سبب «بلا DB» لبناء CI: الخطوة الأخيرة أعلاه تتطلب قاعدة حية، لذا يبني
> CI كل workspace منفصلًا ولا يلمس الترحيلات (`.github/workflows/ci.yml`).

## المتغيرات في `render.yaml`

| المتغير | القيمة/السلوك |
|---|---|
| `NODE_ENV` | `production` (يفعّل خدمة SPA من Express وكوكي Secure) |
| `TZ` | `UTC` مثبت — لا تغيّره (حواف أيام الحضور، انظر [03](03-architecture.md)) |
| `DATABASE_URL` | `sync:false` — تضبطه يدويًا |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `generateValue: true` (32 محرفًا = الحد الأدنى في `env.ts` بالضبط؛ لا ترفع الحد دون خطة) |
| `CORS_ORIGINS`, `INTERNAL_SERVICE_TOKEN`, `DIRECT_DATABASE_URL` | `sync:false` اختيارية — سلوكها في [06-configuration](06-configuration.md) |

## فحص الصحة والتحقق بعد النشر

- `healthCheckPath: /api/v1/health` — يفحص `SELECT 1` بمهلة 5 ثوانٍ
  (امتصاص بدء Neon البارد) ويرد `{ ok, dbLatencyMs, env, buildId }`.
- بعد كل نشر: راقب فحص الصحة في Render، ثم تحقق يدويًا من دخول حساب
  تجريبي وصفحة لوحة — `BUILD_ID` ثابت نصي يساعد على التمييز.
- سجلات التشغيل: تبويب **Logs** في Render (pino JSON بمستوى info في
  الإنتاج مع حجب أسرار).

## التراجع عن إصدار معطوب

1. **الأسرع**: Render → تبويب **Events/Manual Deploy → Rollback** إلى
   النشر السابق السليم (لا يلمس قاعدة البيانات).
2. إن كان السبب ترحيلًا: الترحيلات **إضافية بالتصميم**؛ التراجع الكودي
   مع ترحيل رجوعي جديد مكتوب يدويًا فقط إن كان لا مفرّ — بقرار واعٍ
   ومُختبر على بيئة تطوير أولًا.
3. صحّح الكود ودفع — autoDeploy سيغيرن النشر الجديد.

## قيود بيئة النشر (اعرفها قبل أي ميزة جديدة)

- **قرص زائل**: كل ما يُكتب قرصًا وقت التشغيل يضيع بإعادة النشر/الإقلاع.
  آمن اليوم لأن لا رفع ملفات إطلاقًا؛ أي ميزة رفع PDF/وسائط تتطلب قرصًا
  دائمًا (`disk:`) أو تخزين كائنات أولًا (تحذير موثق داخل `render.yaml`).
- خطة مجانية: إيقاف زمني عند الخمول (بداية Neon الباردة يصطف معها
  مهلة 5 ثوانٍ في `/health`).
- `NODE_VERSION` غير مثبتة في render.yaml — CI يعمل على 22 و`engines`
  تقبل `>=20 <25`؛ تثبيت `NODE_VERSION` على Render خيار تحصيني موصى به
  (انظر [16](16-decisions-and-limitations.md)).

## علاقة النشر بالمنظومة

مدارك لا يعتمد على أي خدمة خارجية وقت التشغيل (لا LLM، لا بريد، لا
Redis) — قاعدة البيانات هي الاعتماد الخارجي الوحيد، مما يجعل النشر
قابلًا للتكرار على أي استضافة Node بنفس المعادلة (بناء + ترحيل + إقلاع).
