# 08 — واجهات API

> الجدول endpoint-ب-endpoint الموثق من الشيفرة:
> [`API-REFERENCE.md`](API-REFERENCE.md) (193 مسارًا). هذه الوثيقة تشرح
> **اتفاقية الاستخدام** وخريطة القطاعات حتى لا تضيع في 193 صفًا.

## الأساسيات

- الجذر: `/api/v1` — نفس أصل الواجهة في الإنتاج (خدمة واحدة)؛ محليًا عبر
  proxy ‏Vite ‏`/api → :4000`.
- المصادقة: `Authorization: Bearer <access JWT>` بعد `/auth/login`؛
  الـrefresh كوكي `mdrk_refresh` (httpOnly) يعمل مسار `/auth/refresh` فقط.
- عدّاد المعدل: عام 1000 طلب/15 دقيقة/IP؛ مصادقة 10/15 دقيقة (النجاح
  لا يحتسب)؛ حزم خاصة (مسح بحث 10/دقيقة، إرسال رسالة 30/دقيقة…).

## اتفاقية الظرف (طلب/استجابة)

```jsonc
// نجاح — بيانات دائمًا داخل "data" (وأحيانًا meta للصفحات)
{ "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 57, "totalPages": 3 } }

// خطأ — كود إنجليزي ثابت + رسالة عربية موجهة للمستخدم
{ "error": { "code": "VALIDATION_ERROR", "message": "تحقّق من البيانات المُدخلة", "details": { ... } } }
```

أكواد شائعة تعرفها مسبقًا:

| الكود | HTTP | متى |
|---|---|---|
| `VALIDATION_ERROR` | 400 | فشل مخطط Zod |
| `UNAUTHORIZED` / `TOKEN_EXPIRED` | 401 | بلا توكن / انتهى (الواجهة تُحدّث تلقائيًا عند الثاني) |
| `FORBIDDEN` | 403 | الدور/القدرة لا تسمح |
| `NOT_FOUND` | 404 | `P2025` أو مسار غير موجود |
| `CONFLICT` | 409 | `P2002` تكرار، سعة ممتلئة، حالة غير صالحة |
| `RATE_LIMITED` | 429 | تجاوز عدّاد |

## خريطة القطاعات (28 راوترًا مُجمّعًا: 25 ملف مسارات + 3 راوترات وحدات)

| القطاع | البادئات الرئيسية | الملف | أبرز المسارات |
|---|---|---|---|
| المصادقة | `/auth/*` | `auth.routes.ts` | `register`، `login` (بريد **أو** رقم جامعي)، `refresh`، `logout`، `change-password`، `me` |
| الطالب | `/me/*` | `student-dashboard.routes.ts`، `learning.routes.ts` (أكبر ملف) | `me/dashboard` (مجمّعة بجولة واحدة)، `me/matrix`، `me/gaps`، `lectures/:id/watch`، `me/research` |
| التعلم المشترك | `/offerings/*`، `/research/*` | `learning.routes.ts`، `offerings.routes.ts`، `curriculum.routes.ts` | `offerings/:id/full`، `research/:id/scan`، `research/:id/grade`، `research/published`، `research/search` |
| التدريب | `/training/*` | `training.routes.ts` | `catalog`، `tracks/:slug/enroll`، `leaderboard`، `me/badges` |
| الإشعارات والرسائل | `/me/notifications*`، `/me/dms*` | `me.routes.ts` | قائمة/قراءة/قراءة الكل (معاملة واحدة رسالة+إشعار) |
| الذكاء | `/ai/*` | `ai.routes.ts` | `ai/chat` (مؤلف محلي `gap-aware-composer`) |
| البحث الشامل | `/search/global` | `search.routes.ts` | تطبيع عربي، ≤5 نتائج/كيان، مقيد بالدور |
| الأستاذ | `/teacher/*` | `teacher.routes.ts` + `teacher-dashboard` + `teacher-profile` | `offerings/:id/analytics`، `risks`، `curriculum/suggest`، `live/sessions` |
| الواجبات | `/offerings/:id/assignments/*`، `/submissions/:id/grade` | `submissions.routes.ts` | تسليم بحالة تأخر + تصحيح |
| الإدارة | `/users*`، `/courses*`، `/admin/*` | `users/courses/permissions/admin-extras/catalog/sync.routes.ts` | إدارة مستخدمين/مقررات/صلاحيات/إحصاءات/مزامنة |
| الكتالوج العام | `/faculties`، `/colleges*`، مكتبة/مووك/وظائف/منشورات… | `catalog.routes.ts`، `colleges.routes.ts` | `/faculties` و`/colleges` **عامة قبل بوابة المصادقة** (قمع التسجيل) — اختبارات تثبّت الترتيب |
| الجودة | `/quality/*` | داخل `learning.routes.ts` | `overview`، `courses`، `professors`، `engagement`، `curriculum`، `alerts` |
| المالك | `/owner/*` | `owner.routes.ts` (17 مسارًا) | `stats`، `users/:id/role`، `activity` (تدقيق)، `settings`، `feature-flags`، `governance` |
| الملفات | `/files/papers/:filename` | `files.routes.ts` | خدمة PDF محمية (5 دفاعات — انظر [10-security](10-security.md)) |
| داخلي | `/me/milestones/:id/fire` | `modules/milestones/router.ts` | ترويسة `x-internal-service-token` — يفشل مغلقًا بلا سر |
| الصحة | `/health` | `app.ts` | `{ ok, dbLatencyMs, env, buildId }` — فحص Render |

## أمثلة فعلية (نمط الاستدعاء)

```bash
# دخول (استبدل البيانات بحساب تجريبي محلي — لا أسرار هنا)
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"student@zu.edu.ly","password":"<كلمة حسابك المحلية>"}'

# استدعاء محمي
curl -s http://localhost:4000/api/v1/me/dashboard \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

الاستجابة دائمًا JSON؛ الصفحات تقبل `page/limit(≤100)/q(≤120)` وترجع
`meta`. الحذف يرد `{ "data": { "ok": true } }` (لا 204).

## اصطلاحات يعتمدها فريق الواجهة

- هوكات TanStack Query بمفاتيح منظمة: `['me','matrix']`، `['owner','users',{page,limit,q,role}]`…
- كل حدود جلسة (دخول/خروج/فشل refresh) تنفذ `queryClient.clear()` لمنع
  تسرب بيانات حساب على جهاز مشترك.
- إعادة المحاولة: 5xx/شبكة فقط — 4xx لا تُعاد أبدًا (`lib/queryClient.ts`).

للتوسع (إضافة مسار جديد وفق الأعراف): [15-development-guide](15-development-guide.md).
