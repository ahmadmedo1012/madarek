# R349 · PRIVACY MATRIX — role × field (P2)

> هذا الجدول قانون لا وثيقة: كل خلية مُختبرة. محرّك المصفوفة في
> `backend/src/lib/profiles/privacy.ts` (نقي، بلا قاعدة)، واختبارات الخلية-بخلية في
> `backend/src/lib/profiles/__tests__/privacy.test.ts`، واختبارات المسارات
> (النطاق والتدقيق) في `backend/tests/modules/profiles-routes.test.ts`.
> أي تغيير في خلية = commit مستقل بسببه المعلن.

## 0. المسارات والأدوار

| المسار | من يدخله |
|---|---|
| `GET /me/profile` | كل الأدوار (الطالب/المدرّس يحتاج سياق مؤسسة؛ الإداريون بلا ملف — رد صادق) |
| `PATCH /me/profile` | صاحب ملف الطالب (مسار التواصل فقط) |
| `GET /people/:id` | الطاقم فقط: TEACHER (طلاب مقرراته + زملاؤه) · ADMIN/QUALITY (مؤسستهم) · OWNER (بسياق مؤسسة) |
| `PATCH /people/:id` | ADMIN/OWNER فقط (مسار المسجّل) |
| `GET /directory` | الطاقم فقط (TEACHER: قائمته) |
| `POST /people/:id/contact-request` | TEACHER/ADMIN/QUALITY |

**الطالب لا يصل أبدًا إلى ملف آخر** (قاعدة G1): `canViewPeople` تحكم البوابة،
واختبار «STUDENT → 403» يثبتها على المسارين.

## 1. الهواتف — `phoneAccess(role, isSelf, visibility)`

| من يقرأ ↓ / الظهور → | INSTITUTION_STAFF | PRIVATE |
|---|---|---|
| **المالك نفسه** | خام VISIBLE | خام VISIBLE |
| TEACHER | خام VISIBLE | مقنّع MASKED + زر طلب تواصل |
| ADMIN | خام VISIBLE | مقنّع MASKED + زر طلب تواصل |
| QUALITY | خام VISIBLE | مقنّع MASKED + زر طلب تواصل |
| OWNER | خام VISIBLE | مقنّع MASKED + زر طلب تواصل |
| STUDENT (غير المالك) | HIDDEN | HIDDEN |

قناع الهاتف: `•••• آخر ثلاث خانات` (`maskPhoneDisplay`). اختبرت كل خلية.

## 2. الرقم الوطني — `nationalIdAccess(role, isSelf)`

| من يقرأ | الوصول |
|---|---|
| المالك نفسه | خام VISIBLE |
| OWNER | خام VISIBLE (واجب رقابي) |
| ADMIN | خام VISIBLE |
| QUALITY | مقنّع MASKED (`1••••••••78`) |
| TEACHER | **HIDDEN — أبدًا، ولا مقنّعًا** |
| STUDENT (غير المالك) | HIDDEN |

- التخزين: `nationalId` خام + `nationalIdHash` (SHA-256، مفهرس) للمطابقة.
- البحث والتطابق عبر الهاش فقط؛ الخام لا يُختار في مسارات الدليل.
- `nationalIdPresent` (boolean) يُعاد دائمًا للطاقم — يعرفون أن رقمًا موجودًا
  دون معرفة قيمته (لا تسريب وجودي عند MASKED/HIDDEN).

## 3. الكتل الأخرى (GET /people/:id)

| الكتلة | المالك | TEACHER | ADMIN | QUALITY | OWNER |
|---|---|---|---|---|---|
| الاسم الرباعي (nameAr/الأب/الجد/الأم) | ✓ | ✓ | ✓ | ✓ | ✓ |
| الميلاد (تاريخ/مكان) | ✓ | ✓ | ✓ | ✓ | ✓ |
| السكن (city/address) | ✓ | ✓ | ✓ | ✓ | ✓ |
| هاتف الطالب | خام | §1 | خام | §1 | §1 |
| هاتف إضافي / طوارئ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ولي الأمر (اسم/صلة) | ✓ | ✓ | ✓ | ✓ | ✓ |
| هاتف ولي الأمر | خام | §1 | خام | §1 | §1 |
| الهوية الوطنية | خام | HIDDEN | خام | مقنّع | خام |
| السجل الأكاديمي (المرحلة/السنة/القبول/الحالة) | ✓ | ✓ | ✓ | ✓ | ✓ |
| البريد الإلكتروني (User.email) | ✓ | ✓ | ✓ | ✓ | ✓ |
| الحقول المخصصة للمؤسسة | ✓ | حسب visibleTo للتعريف | ✓ | ✓ | ✓ |
| **مدرّس: الرقم الوظيفي** | ✓ | ✗ (null) | ✓ | ✗ (null) | ✓ |
| **مدرّس: هاتف المكتب/البريد الرسمي** | ✓ | ✓ (رسمي عام) | ✓ | ✓ | ✓ |

## 4. الكتابة — من يكتب ماذا

| الحقل | PATCH /me/profile (المالك) | PATCH /people/:id (ADMIN/OWNER) |
|---|---|---|
| nameEn, dateOfBirth, gender, city, address | ✓ | ✓ |
| studentPhone + studentPhoneVisibility | ✓ | ✓ |
| additionalPhone, emergencyContact* | ✓ | ✓ |
| nameAr, الأب/الجد/الأم, birthPlace | ✗ (وثائقي) | ✓ |
| nationalId | ✗ | ✓ (زوج خام+هاش) |
| guardian* + guardianPhoneVisibility | ✗ | ✓ |
| الأكاديمي كله (stage/grade/section/studyType/enrollmentStatus/الثانوية/سنة القبول) | ✗ | ✓ |
| employeeId, preferredContact (مدرّس) | ✗ | ✓ |

قاعدة السطرين: **الذات = التواصل والتفضيلات؛ الوثائقي والأكاديمي = الطاقم.**
المخطط الصارم (zod `.strict()`) يرفض أي حقل خارج المسار — اختبار 400 يثبتها.

## 5. التدقيق (AuditLog) — كل لمسة PII مسجّلة

| الحدث | action | metadata |
|---|---|---|
| قراءة staff لملف (/people/:id) | `people.read` | sawStudentPhone / sawGuardianPhone / sawNationalId + nationalIdAccess — **لا قيم** |
| تصدير الدليل | `directory.export` | kind, format, rows, filters — لا قيم |
| تعديل المالك (PATCH /me/profile) | `profile.self-update` | أسماء الحقول فقط |
| تعديل الطاقم (PATCH /people/:id) | `people.update` | أسماء الحقول فقط |
| طلب تواصل | `people.contact-request` | القناة فقط — وهو نفسه مفتاح منع التكرار (24 ساعة/هدف) |

## 6. الحدود (Rate limits)

- `POST /people/:id/contact-request`: 10/ساعة/مستخدم (بوابة داخلية بالعملية)
  + منع تكرار 24 ساعة لكل (طالبُ هدف، مرسل) عبر سجل التدقيق نفسه — بلا نموذج جديد.
- الدليل العام خلف `globalRateLimiter` (1000/15 دقيقة/IP) كما كل /api/v1.

## 7. العزل المؤسسي

- ADMIN/QUALITY: سياق مؤسسة مُتحقق من القاعدة (403 `INSTITUTION_CONTEXT_REQUIRED` بدونه).
- TEACHER (طلاب): عضوية قيد في مقرر يدرّسه المتصل داخل مؤسسته — وإلا 404 (لا تسريب وجود).
- TEACHER (زملاء): أعضاء مؤسسته النشطون.
- ملف مؤسسة أخرى: 404 لكل الأدوار — مُثبت بخط لكل دور.
