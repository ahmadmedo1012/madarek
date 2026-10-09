# 10 — الأمان: ما المنفَّذ وكيف

كل بند هنا مستخرج من الشيفرة (مواضعه مبينة)، ومطابقة `SECURITY.md`
العمومي. للإبلاغ الأمني: **قنوات خاصة فقط** — انظر
[`../SECURITY.md`](../SECURITY.md) (لا مشكلات أمنية في Issues العلنية).

## المصادقة

| الضابط | التفصيل | الموضع |
|---|---|---|
| تخزين كلمات المرور | argon2id (ذاكرة ~19MiB، زمن 2) ≈100ms | `backend/src/lib/password.ts` |
| مساواة زمنية | مسارا «مستخدم غير موجود» و«محسوب مقفل» يحرقان تحقق dummy — ثبّته اختبار توقيت | `modules/auth/auth.service.ts` |
| قفل الحساب | 5 إخفاقات → 15 دقيقة؛ عدّاد ذري SQL بإعادة فحص حية | `modules/auth/lockout.ts` |
| توكنات | JWT HS256 مثبت الخوارزمية على التوقيع والتحقق؛ access 15د (الدور داخل الحمولة)؛ refresh 7د (`{sub, ver}`) | `backend/src/lib/jwt.ts` |
| كوكي الـrefresh | `mdrk_refresh`: httpOnly، `sameSite=strict`، Secure إنتاجيًا، `path=/api/v1/auth` | `auth.routes.ts` |
| إبطال الجلسات | `tokenVersion` bump ذري (conditional updateMany) عند: خروج، تغيير كلمة، تغيير دور، تعطيل — العدّ 0 يعني كاتبًا أحدث سبقه | `modules/auth/rotation.ts` |
| سياسة كلمة المرور | 8–72 محرفًا + قائمة كلمات شائعة محظورة (~90)؛ بلا تعقيد صفّي؛ لا trim | `modules/auth/password-policy.ts` |
| الدخول | بريد أو رقم جامعي (تمييز بـ`@`)؛ تسجيل ذاتي للطالب/الأستاذ فقط (حارس خدمة + Zod) | `auth.routes.ts`، `auth.dto.ts` |
| تخزين الواجهة | access في sessionStorage (مقايضة D4 معلنة) والـrefresh كوكي httpOnly؛ `queryClient.clear()` عند كل حدود الجلسة | `stores/auth.store.ts` |

## التفويض والحاكمية

- أدوار خمسة + **17 قدرة** (Capability) تُدمج: افتراضيات الدور ∪
  `RolePermission` (كاش 30 ثانية مُتعاون) + منح/سحب `UserPermission`
  (`lib/permissions.ts`).
- حراس القراءة التوأم للمقررات: `assertOfferingAccess`/`offeringVisibilityFilter`
  — الأستاذ شعبه، الطالب تسجيله النشط، الجودة قراءة، الإدارة/المالك تجاوز.
- **حرس آخر مالك نشط**: قفل صفوف المالكين `SELECT … FOR UPDATE` قبل
  فحص العدّ — على كل أسطح تعديل الأدوار/الحالة (`lib/governance.ts`).
- **نطاق الكليات**: `User.scopeFacultyId` يقيد ADMIN/QUALITY بكلياتهم
  (`buildScopedUserWhere`).
- تغيير دور/حالة = bump للـ`tokenVersion` + صف `AuditLog` بنفس المعاملة.

## رؤوس الأمان وCSP

- `helmet` بسياسة CSP كاملة (`useDefaults:false`) في `backend/src/app.ts`:
  `default-src 'self'`، سكربتات ذاتية + **بصمتا sha256** لسكربتَي
  `frontend/index.html` الداخليين (bootstrap السمة وJSON-LD)، `object-src 'none'`،
  `base-uri 'self'`، `CORP: cross-origin` (مقصود لتضمين الأصول) + بقية
  افتراضات helmet (HSTS…).
- **بوابة انزياح**: `bash scripts/check-csp-hash.sh` تعيد حساب البصمتين
  وترفض أي تعديل غير مختوم — أصبحت الآن ضمن `design-gates` في CI.
- `x-powered-by` معطلة، `trust proxy 1` (خلف Render).

## CORS (سلوك دقيق — اقرأ قبل ضبطه)

- قائمة سماح: `CORS_ORIGINS` مفصولة بفواصل؛ قصّ الشرائح الختامية؛
  **بلا أحرف بديلة**؛ الاعتمادات مفعلة؛ أصل غير مسموح → `cb(null,false)`
  (لا رؤوس، لا 500).
- عند عدم الضبط: `https://madarek.onrender.com` + `http://localhost:5173`.
- ⚠️ ضبط `CORS_ORIGINS` **يستبدل** الافتراضي كليًا (لا يلحقه) — إن ضبطته
  فأدخل نطاق الإنتاج صراحة (`.env.example` صُحّح ليعكس ذلك).

## حدود المعدل

| الحزمة | الحد | النطاق |
|---|---|---|
| عام | 1000 طلب/15 دقيقة/IP | كل `/api/v1` (رفع مقصود لأفواج NAT مشتركة بحرم جامعي) |
| مصادقة | 10 طلبات/15 دقيقة/IP، النجاح لا يحتسب | register/login/refresh/change-password |
| حزم مركبة | 20/دقيقة افتراضيًا (بمفتاح مستخدم إن دخل) | بحث AI 20، مسح بحث 10، رسائل 30 |

مخزن الذاكرة كافٍ لخدمة واحدة — تعدد نسخ يتطلب مخزنًا مشتركًا
(انظر [16](16-decisions-and-limitations.md)).

## حماية ملفات البحوث (`GET /files/papers/:filename`)

خمس دفاعات متتالية في `files.routes.ts`:
1. رفض `..` و`/` و`\` في المعامل المفكوك.
2. امتداد `.pdf` فقط (تجاهل حالة الأحرف).
3. **بوابة قاعدة بيانات**: الملف يُخدم فقط إن رجع سجل بحث مكافئ
   (منشور، أو مالكه، أو مراجعه — وإلا 404 حتى لو وُجد قرصًا).
4. `path.basename` + تثبيت الدليل (`startsWith(dir + sep)`) ضد حيلة
   الدليل الشقيق.
5. `statSync.isFile()` ثم `sendFile` بـ`Cache-Control: private`.

**لا رفع ملفات إطلاقًا** (لا multer/multipart في الشيفرة) — «الإرسال»
هو رابط `fileUrl` مُتحقق بنمط. تخزين Render زائل (موثق في `render.yaml`).

## تحقق المدخلات والسجلات

- Zod `.strict()` على كل DTO، `validate(schema, source)` يستبدل المدخل
  بالمحلل؛ الأخطاء 400 برسالة عربية وتفاصيل إنجليزية.
- pino يحجب: `password*`, `*Hash`, `token*`, `authorization`, `cookie`,
  `err.config.url` → `[REDACTED]` (`backend/src/logger.ts`).
- قائمة كلمات المرور الشائعة المحظورة: 105 مدخلًا (`password-policy.ts`).
- 500 يصنع `OperationalAlert` (خنق 5 دقائق/كود) دون تسريب تفاصيل داخلية.

## الصدق التشغيلي — ما لا يجب افتراضه

1. **بذور إنتاج قديمة**: `seed.ts` يوثق أن حسابات إنتاج أنشئت بجيل بذور
   أقدم بكلمة مرور ضعيفة، ولا تُصلح إلا بإعادة بذر تحدّث الأهاش —
   بند تشغيلي عاجل على المالك (لا نعيد ذكر أي قيمة هنا).
2. كلمة demo `Madarek2026!` معلنة للتجارب — تُدار بإعادة البذر، ولا
   تصلح بيئة حقيقية.
3. refresh غير مدوَّر بلا جدول `RefreshToken` (مقايضة D3): كوكي مسروق
   يظل صالحًا حتى 7 أيام ما لم يقع إبطال (خروج/تغيير كلمة/دور/تعطيل).
4. الدور داخل access JWT: مسموح 15 دقيقة كحد أقصى لتخلف الدور بعد
   التخفيض؛ الإبطال النهائي عبر refresh.
5. لا سر-scan آلي ولا Dependabot اليوم (موثق بصدق في `SECURITY.md`)؛
   الاعتماديات مثبتة بالدقة في package-lock.

## قائمة تحقق قبل نشر تغيير أمني

- [ ] `npm run typecheck && npm test` أخضر.
- [ ] عدلت سكربتًا داخليًا في `index.html`؟ → حدّث البصمة + `check-csp-hash`.
- [ ] لمس دورًا/قدرة/حاكمية؟ → اختبار قرار نقي جديد + مراجعة حراس `governance`.
- [ ] `git diff` بلا أسرار (بما فيها سلاسل اتصال).
