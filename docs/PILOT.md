# PILOT — تشغيل أول فصل دراسي حقيقي على مدارك

> English summary below. This is the 10-step checklist from «أنشئ الكلية»
> to «أول محاضرة», the env-var table, and the rollback steps. Everything
> here is verifiable in the repo — no invented numbers.

## الخطوات العشر (من الصفر إلى أول محاضرة)

1. **أنشئ الكلية** — سجّل دخولك كمالك المنصة (`OWNER`)، افتح لوحة المؤسسات،
   وأنشئ المؤسسة (الاسم + المدينة). المؤسسة هي سقف كل شيء: الكليات والأقسام
   والمستخدمون والأرقام الجامعية كلها داخلها.
2. **أنشئ الكليات والأقسام** — من لوحة المسجل العام: كلية (مثال: كلية
   الهندسة) ثم أقسامها (قسم الحاسبات…). الرقم الجامعي فريد داخل المؤسسة.
3. **أنشئ المقررات** — لكل مقرر: الكود، الاسم، الكلية/القسم، الوصف (الوصف
   يُفهرس تلقائيًا لمساعد الذكاء بعد خطوة 8).
4. **أنشئ العروض الدراسية (Offerings)** — اربط المقرر بأستاذ وفصل دراسي.
5. **استورد الطلاب** — لوحة المسجل العام ← الطلاب ← «استيراد طلاب من ملف»:
   حمّل القالب، عبّئه (Excel ← حفظ باسم CSV UTF-8)، شاهد العرض المسبق
   سطرًا سطرًا، ثم أنشئ الحسابات. **نزّل ورقة كلمات المرور المؤقتة واطبعها**
   — تُعرض مرة واحدة.
   - بديل بلا بريد: افتح صف الطالب وأصدر «رابط إعادة تعيين لمرة واحدة»
     (`POST /api/v1/users/:id/reset-link`) وسلّمه للطالب مباشرة.
6. **فعّل البريد (اختياري لكن مستحسن)** — اضبط `MAIL_PROVIDER=resend`
   (أو `brevo`) + `MAIL_API_KEY` + `MAIL_FROM`. بدونها: الروابط اليدوية
   أعلاه هي المسار الوثّيق، وصفحة «نسيت كلمة المرور» تبقى صادقة («سيصلك
   بريد إن كان البريد مسجلًا» + حارف الاختبار لـ @test.ly فقط).
7. **جهّز الأستاذ** — دخول الأستاذ: أنشئ أسبوعًا، ارفع محاضرة
   (رفع مباشر S3 عند ضبط `STORAGE_DRIVER=s3` + مفاتيح S3_*؛ وإلا رابط
   خارجي https) وأضف فصولًا ونقاط فحص.
8. **فهرس مساعد الذكاء** — بصلاحية ADMIN/OWNER:
   `POST /api/v1/ai/knowledge/reindex` — يفهرس أوصاف المقررات ونقاط
   الفحص والنصوص المرفوعة داخليًا (SRT/VTT). بعدها يجيب المساعد من مواد
   المقرر مع استشهادات «المصدر: …» قابلة للنقر.
9. **أول محاضرة** — الطالب يدخل من رابط الدخول (أو الحساب المطبوع)،
   يشاهد المحاضرة، تجيب نقاط الفحص، يجرّب «اسأل المدرك» داخل المشغّل.
10. **راقب الأسبوع الأول** — `/api/v1/status` (حالة المنصة + أوضاع
    التخزين/الذكاء/البريد)، لوحة المالك (تتبع الذكاء)، صندوق «أبلغ عن
    مشكلة» من أي صفحة.

## جدول متغيرات البيئة (الأهم)

| المتغير | القيمة | متى |
|---|---|---|
| `DATABASE_URL` | Neon pooled | دائمًا |
| `DIRECT_DATABASE_URL` | Neon direct | للترحيلات |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | عشوائي 64+ | دائمًا |
| `STORAGE_DRIVER` | `s3` + `S3_*` أو `postgres` | الرفع الدائم |
| `AI_PROVIDER` | `openai` + `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL` (+ `AI_MODELS` اختياري ≤3) | مساعد حقيقي |
| `AI_DAILY_LIMIT_DEFAULT` | 25 (الافتراضي) | حماية التكلفة |
| `MAIL_PROVIDER` / `MAIL_API_KEY` / `MAIL_FROM` | `resend` أو `brevo` | البريد الحقيقي |
| `APP_ORIGIN` | `https://madarek.onrender.com` | روابط البريد |
| `MADAREK_TEST_ACCOUNTS` | أزِلها عند الإطلاق | إطلاق فقط |

## الحسابات التجريبية

10 حسابات `*@test.ly` بكلمة `12345678` (طالب/أستاذ/مسجل/جودة/مالك…).
**عند الإطلاق:** أزِل `MADAREK_TEST_ACCOUNTS` من بيئة Render ثم أعد النشر،
وغيّر كلمات مرور المالك والمسجل من الإعدادات.

## حدود معروفة (صادقة)

- الاستيراد الجماعي: CSV فقط (من Excel: «حفظ باسم» ← CSV UTF-8) — بلا
  قراءة XLSX، بلا أكواد دعوة بعد (مسجّلة كأولوية تالية في HANDOFF).
- الفيديو: بلا نسخ متعددة الجودات (360p/صوت فقط) وبلا معالجة على
  الخادم — الرفع مباشر إلى المتجر والبث بنطاق Range.
- النسخ الاحتياطي: وثّق إجراء Neon (branch + restore) قبل اليوم الأول.

## Rollback

كل إصدار ملتصق بـ `buildId` (من `RENDER_GIT_COMMIT`). «Manual Deploy ←
الCommit السابق» في Render يعيد الواجهة والخلفية معًا. الترحيلات
إضافية (additive) — التراجع عن كود لا يحتاج تراجع قاعدة. للطوارئ:
`STORAGE_DRIVER=postgres` يعمل على أي قاعدة Neon بلا مفاتيح S3.

---

# PILOT — running the first real semester (English)

1. Create the institution (OWNER console) → 2. Faculties + departments →
3. Courses (descriptions feed the AI index) → 4. Offerings with teachers →
5. Bulk-import students (CSV template → dry-run preview → commit →
print the one-time temp-password sheet) → 6. Optionally enable mail
(`MAIL_PROVIDER=resend|brevo`) — without it, use the registrar's manual
one-time reset link → 7. Teacher builds the course (upload via presigned
S3 or an external URL, chapters, checkpoints) → 8. `POST /api/v1/ai/knowledge/reindex`
→ 9. First lecture → 10. Watch `/api/v1/status` + the owner dashboard +
the in-app feedback inbox.

Rollback: every deploy carries a derived `buildId`; Render Manual Deploy
pins the previous commit. Migrations are additive — code rollback never
needs a DB rollback.
