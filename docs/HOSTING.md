# HOSTING — ماذا يعمل أين، وحدود كل طبقة، وكيف تُراقَب (R352 K6)

> الوثيقة الموجهة للمالك: كل ما يعمل في المنصة أين، وكل حدّ مجاني،
> وما الذي يراقب نفسه تلقائيًا وما الذي يحتاج نظرك الأسبوعي، ومسارات
> الترقية والتراجع. **الوثيقة شقيقة لـ `docs/RELEASE.md`** (كيف تُشحن
> الإصدارات) و`docs/MAIL.md` (البريد) — لا تكرار هنا، إحالة فقط.

## 1. الخريطة — ماذا يعمل أين

| الطبقة | المزوّد | الخطة | ملاحظات |
|---|---|---|---|
| الويب (SPA) | Vercel — مشروع `madarek` | Hobby (مجانية) | `frontend/dist` عبر CDN — دائمًا متاح، لا sleeps |
| الـ API (Express) | Vercel Function واحد (`api/index.mjs`) | نفس المشروع | `regions: fra1`، `maxDuration 60s`، ذاكرة 1 GB |
| قاعدة البيانات | Neon — `ep-icy-mode…eu-central-1/neondb` (قاعدة المالك الأصلية) | Free | عبر الرابط المُجمِّع (pooler) — القياس بعد fra1: dbLatency وسيطًا **2 ms** |
| البريد | Resend (`onboarding@resend.dev`) | Free | **يُسلِّم لعنوان المالك فقط** حتى توثيق نطاق — التفاصيل في `docs/MAIL.md` |
| ملفات التحميل | Vercel Blob — مخزن `tadmora-private-files` | متصل بالمشروع | `STORAGE_DRIVER=vercel-blob`؛ ترحيل صفوف `BinaryObject` القديمة يركب كل بناء (`backend/scripts/storage-to-blob.mjs`) |
| مرآة الإعداد البعيد | GitHub Pages (`gh-pages`) | — | `config/app.json` (apiOrigins) — مرآة ثانية دائمة التاح |
| الاستعداد الاحتياطي | Render — `madarek.onrender.com` (مُعلَّقة) | Free (موقوفة) | **مسار التراجع فقط** — راجع §6 |

## 2. الحدود الحرة — الجدول الصادق

| المزوّد | الحد الشهري المجاني | ما الذي يُقاس آليًا |
|---|---|---|
| Vercel Hobby | 1,000,000 استدعاء دوالّ · 4 ساعات Active-CPU · 360 GB-hrs ذاكرة · 100 GB نقل سريع · **100 نشر/يوم** · مدة الدالة القصوى 300 s | **النشر/اليوم + طزاجة buildId** — `vercel-usage-watch.yml` كل إثنين 06:00 UTC، issue عند 60 % من حد النشر أو تقادم buildId؛ الجدول الأسبوعي في `frontend/public/ops/vercel-usage.json` (تقرؤه بطاقة «الاستضافة والاستخدام» في إعدادات المسجل). ما لا يكشفه الـ API (استدعاءات/Active-CPU/النقل/Blob) — لوحة Vercel أسبوعيًا |
| Neon Free | 0.5 GB تخزين · 190 ساعة حوسبة/شهر (المجمّع) · autosuspend بعد خمول (يقظة ~ثوانٍ) | قياس `dbLatencyMs` على `/api/v1/health` (عمومي) + مسح `r352-db-diagnostics.yml` عند الحاجة |
| Resend Free | 3,000 رسالة/شهر (100/يوم) | `GET /api/v1/mail/*` للإدارة؛ الـ webhook يكتب حالات التسليم |
| GitHub Actions | 2,000 دقيقة/شهر (مجاني عام) | عدّاد الجري في صفحة Actions |
| Vercel Blob | 1 GB مجاني ثم usage-based | لوحة Vercel → Storage |

**تحذير غير التجاري (Hobby):** الخطة للاستخدام الشخصي غير التجاري —
ملائمة لمرحلة التطوير والعرض على الجامعات؛ يلزم إعادة القرار قبل أي
تشغيل تجاري فعلي. المساران جاهزان: **Vercel Pro** (~20$/مقعد شهريًا)
أو **Render Starter** (~7$/شهر). الرقم المرجعي للقرار: نفقات المرحلة
اليوم = **0$** (كل ما فوق مجاني).

## 3. أجهزة المراقبة الذاتية (تعمل بلا تدخل)

| الجهاز | الإيقاع | ماذا يفعل |
|---|---|---|
| `tick-watch.yml` | كل 30 دقيقة (best-effort) | يفحص `/health` + سجل tick؛ إذا تقادم الـ fast slot أكثر من 30 دقيقة **يفرض tickًا** (الشفاء الذاتي)؛ لا يفتح issue إلا إذا فشل التدبير نفسه |
| `vercel-usage-watch.yml` | إثنين 06:00 UTC | جدول النشر/اليوم + طزاجة buildId + issue عند 60 % |
| `r352-r3-freshness.yml` | يوميًا 04:10 UTC | يوكد أن إصدار `android-latest` لا يتخلف عن المصدر (سلف + لا فجوة commits مسّت التطبيق) — issue قابل للإغلاق التلقائي |
| `r352-db-diagnostics.yml` | يدوي (dispatch) | يطبع سجل الترحيلات + الاستعلامات البطيئة + أحجام الجداول من **داخل بناء Vercel** (القناة الآلية الوحيدة التي ترى DATABASE_URL) |
| `r352-k1-diagnostics.yml` | يدوي (dispatch) | الحالة الحية + سجلات Vercel + (إن أذن الرمز) فك متغيرات البيئة — القيود موثقة داخلها |
| Vercel cron | يوميًا 03:00 UTC | `vercel.json` — tick اليومي |
| `tick.yml` | كل 5 دقائق (best-effort) | شبكة أمان؛ الجدولة تتضور على المستودعات الهادئة — موثق |

## 4. §Uptime probe — المراقب الخارجي (خطوة المالك الوحيدة)

المنصة على Vercel **لا تحتاج keep-warm** (لا توجد نسخة دائمة تُدفأ).
الـ ping الخارجي اليوم = **مراقبة صرفة**. لتشغيله:

1. أنشئ حسابًا في UptimeRobot (أو cron-job.org) — الخطة المجانية تكفي.
2. أضف HTTP(s) monitor على: `https://madarek-nine.vercel.app/api/v1/health`
   - الإيقاع: 5 دقائق (المجاني يسمح 50 مرة/شهر… للخطط المدفوعة أكثر).
3. بريد التنبيه: بريد المالك (نفسه المستهدف في Resend — انظر `docs/MAIL.md`).

الاستجابة السليمة: HTTP 200 مع `{"ok":true,...}`. أي 5xx متكرر = انظر
§5.

## 5. تشخيص سريع (عند التنبيه)

```bash
# الحالة الحية (عمومي، لا يحتاج تسجيل دخول)
curl -s https://madarek-nine.vercel.app/api/v1/health
curl -s https://madarek-nine.vercel.app/api/v1/status   # storageDriver + buildId + tick ledger

# سجل الترحيلات والاستعلامات البطيئة (dispatch من GitHub → Actions → R352 K1 db diagnostics → Run)

# آخر 30 جريًا (health of the pipelines)
# https://github.com/ahmadmedo1012/madarek/actions
```

`dbLatencyMs` الكبير في أول استدعاء بعد خمول = يقظة Neon الطبيعية
(~1.5 s مرة واحدة) — **ليس عطلًا**؛ القيمة الدافئة `2 ms`.

## 6. الترقية والتراجع

- **الترقية إلى Pro:** Vercel dashboard → Billing — لا تغيير كود؛
  الحدود ترفع فورًا.
- **التراجع إلى Render (نافذة 14 يومًا من القطع):** عكس ترتيب
  `apiOrigins` في `config/app.json` (المرآتان: `frontend/public/config/`
  ثم force-push إلى `gh-pages`) — التطبيقات تنتقل في الإطلاقة التالية
  بلا إعادة بناء (هذا هو تصميم X3). راجع `docs/RELEASE.md` §القطع.
- **تراجع التخزين (Blob → postgres):** dispatch `r352-k5-blob-flip.yml`
  بـ `flip_back=true` — الصفوف القديمة لم تُحذف أصلًا، فالتراجع كامل
  بنيويًا.
- **نسخ احتياطي للقاعدة:** `npm run db:backup` (محليًا) — الاحتياطيات
  قبل إصلاح r352 محفوظة في GitHub Release `evidence-r352`.

## 7. قرارات موثقة (إحالات)

- قرار الاستضافة X (لماذا Vercel وليس Render): `docs/redesign/r351/HOSTING-SPIKE.md` + `docs/redesign/r351/RESUME.md`.
- قرار البريد (Resend + onboarding@resend.dev): `docs/MAIL.md`.
- قرار التخزين (Blob + سكربت الترحيل لكل بناء): `docs/redesign/r352/RESUME.md` §K5.
- قرار الـ tick (أربعة محفزات لا خادم دائم): `docs/RELEASE.md` §Liveness.
