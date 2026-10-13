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
| `STORAGE_DRIVER`, `STORAGE_DIR`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | `sync:false` اختيارية — متغيرات تخزين رفعات PDF: بلا ضبط = سائق محلي (زائل على Render، مع تحذير إقلاع واحد)؛ لدوام الملفات اضبط `STORAGE_DRIVER=s3` + الأربعة `S3_*` (الخطوات أدناه) — التفصيل في [06-configuration](06-configuration.md) |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | `sync:false` اختيارية — متغيرات مزوّد المساعد الذكيّ: بلا ضبط = محرّك محلي (بلا استدعاءات خارجية)؛ لنموذج حقيقي اضبط `AI_PROVIDER=openai` + `AI_API_KEY` + `AI_MODEL` (الخطوات أدناه) — التفصيل في [06-configuration](06-configuration.md) |

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

- **قرص زائل والرفعات حقيقية الآن**: رفعات PDF (أوراق البحث + مواد
  المقرر) منفَّذة خلف تجريد التخزين (`backend/src/lib/storage.ts`)، والسائق
  الافتراضي محلي — أي أن الملفات المرفوعة **تضيع بإعادة النشر/الإقلاع**
  (يسجَّل تحذير إقلاع واحد صريح بهذا المعنى). لدوام الملفات: اضبط
  `STORAGE_DRIVER=s3` + متغيرات `S3_*` (الخطوات أدناه) أو وصل قرصًا
  دائمًا (`disk:`) — موثق داخل `render.yaml` أيضًا.
- خطة مجانية: إيقاف زمني عند الخمول (بداية Neon الباردة يصطف معها
  مهلة 5 ثوانٍ في `/health`).
- `NODE_VERSION` غير مثبتة في render.yaml — CI يعمل على 22 و`engines`
  تقبل `>=20 <25`؛ تثبيت `NODE_VERSION` على Render خيار تحصيني موصى به
  (انظر [16](16-decisions-and-limitations.md)).

## تخزين رفعات PDF في الإنتاج (خطوات المالك — مرة واحدة)

قرص Render زائل: مع السائق المحلي الافتراضي تضيع الملفات المرفوعة بإعادة
كل نشر (الخلفية تسجّل تحذير إقلاع واحدًا صريحًا بذلك). دوام الملفات =
تخزين كائنات S3-متوافق. الخطوات الدقيقة (مثال Cloudflare R2 — الأرخص
للخطة المجانية؛ AWS S3 / MinIO بنفس المعادلة):

1. أنشئ حاوية (bucket) — مثل `madarek-files` — وفعّل الوصول للكائنات فقط
   (لا استضافة عامة: كل تقديم يمر عبر الخلفية المصرَّدة).
2. أنشئ رمز وصول API (Access Key ID + Secret) بصلاحيات على تلك الحاوية
   فقط — لا مفاتيح الحساب كاملة.
3. في Render → Environment أضف المتغيرات:
   - `STORAGE_DRIVER=s3`
   - `S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — انسخه
     من لوحة R2 (عنونة path-style)؛ مع MinIO عنوان خدمتك، ومع AWS S3
     إقليمك مثل `https://s3.us-east-1.amazonaws.com`
   - `S3_REGION=auto` (اصطلاح R2؛ `us-east-1` مع AWS)
   - `S3_BUCKET=madarek-files`
   - `S3_ACCESS_KEY_ID=…` و`S3_SECRET_ACCESS_KEY=…` (سريّان — Render
     فقط، لا يوضعان في الشيفرة أو `.env.example` بقيم حقيقية)
4. احفظ → autoDeploy يعيد النشر، وتفحص السجلات: لا تحذير القرص الزائل،
   ولا رسالة «STORAGE_DRIVER=s3 requires: …» (تعني متغيرًا ناقصًا —
   `env.ts` يمنع الإقلاع أصلاً حتى تكتمل).
5. تحقق: ارفع ورقة بحث من حساب طالب تجريبي ثم افتح الملف — إن كان يعمل
   فالبايتات في الحاوية (تحقق من لوحة الحاوية إن أحببت).

البذور/الترحيلات لا علاقة لها بهذا — الكائنات تُدار من لوحة الحاوية
(النسخ الاحتياطي لأدواتها).

## تشغيل المساعد الذكي بنموذج حقيقي (خطوات المالك — اختيارية)

الافتراضي محلي (تأليف واعٍ بالإتقان، بلا تكلفة ولا استدعاءات خارجية).
لتشغيل نموذج لغوي حقيقي (أي خدمة متوافقة مع OpenAI: OpenAI نفسها،
Groq، OpenRouter، DeepSeek، Together، vLLM/Ollama ذاتي الاستضافة):

1. أنشئ مفتاح API لدى المزوّد — يُفضَّل مفتاح بميزانية محدودة (الخدمة
   تحدّد الطلب بـ20 طلبًا/دقيقة/مستخدم و800 توكن إخراج للرد الواحد،
   لكن مسؤولية السقف المالي للمفتاح على المالك).
2. اختر اسم النموذج من لوحة المزوّد (مثل `gpt-4o-mini` أو مكافئه
   الرخيص لدى Groq/DeepSeek — ردود دراسيّة قصيرة لا تحتاج نموذجًا
   ضخمًا).
3. في Render → Environment أضف:
   - `AI_PROVIDER=openai`
   - `AI_API_KEY=…` (سري — Render فقط، لا يوضع في الشيفرة)
   - `AI_MODEL=…`
   - `AI_BASE_URL` فقط لو المزوّد ليس OpenAI نفسها (مثل
     `https://api.groq.com/openai/v1` أو عنوان خادم vLLM/Ollama)
4. احفظ → autoDeploy يعيد النشر. إن ظهرت رسالة
   «AI_PROVIDER=openai requires: …» فمتغير ناقص — `env.ts` يمنع
   الإقلاع حتى يكتمل.
5. تحقق: افتح صفحة «المساعد الذكيّ» — الشارة تعرض اسم النموذج
   (والعنوان يقول «مدعوم بنموذج لغويّ حقيقيّ»)، ثم اسأل سؤالًا وانتظر
   الرد. فشل المزوّد يظهر خطأً صادقًا مع زر إعادة محاولة — عمدًا لا
   fallback قالبيًا صامتًا.

## علاقة النشر بالمنظومة

مدارك لا يعتمد على أي خدمة خارجية وقت التشغيل افتراضيًا (لا بريد، لا
Redis؛ المساعد الذكيّ محلي ما لم يفعّل المالك `AI_PROVIDER=openai`
بمزوّد حقيقي — والتخزين محلي ما لم يفعّل `s3`) — قاعدة البيانات هي
الاعتماد الخارجي الوحيد افتراضيًا، مما يجعل النشر
قابلًا للتكرار على أي استضافة Node بنفس المعادلة (بناء + ترحيل + إقلاع).
