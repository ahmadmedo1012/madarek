# R349 · LANE P — PROFILES RESEARCH (P0)

> يوثّق هذا الملف مصدر كل حقل في تصميم P1. القاعدة: **لا نخترع شيئًا** —
> كل حقل إمّا مذكور حرفيًا في متطلبات المالك (R349 master prompt §LANE P)،
> أو مُشفَّر في بحث E1 السابق (قاموس مرادفات الاستيراد `fields.ts` + تعليقات
> المخطط)، أو معرفة عامة موثّقة عن ليبيا. المجهول يُعلَّم مجهولًا.

## 1. المصادر (بالترتيب)

| # | المصدر | الموثوقية | ما قدمه |
|---|---|---|---|
| S1 | R349 master prompt §LANE P (كلام المالك) | ملزم | قائمة الحقول المستهدفة حرفيًا: quadruple name، الرقم الوطني، رقم القيد، الشهادة الثانوية ونسبتها، الشعبة، صباحي/مسائي/موازي، تحويل/إيقاف/تأجيل، ولي الأمر، phoneVisibility matrix، nationalId masked + hashed lookup |
| S2 | E1 المُنزَّل على main: `backend/src/lib/profiles/fields.ts` (قاموس §9.4) | عالية — من بحث الجلسة السابقة مع مدخلات مالك | المرادفات الفعلية من جداول مدارس/جامعات ليبية: «الاسم/اسم الطالب/الاسم الكامل/اسم التلميذ»، «الرقم الدراسي/رقم القيد/الرقم الجامعي»، «رقم ولي الأمر»، «القسم/التخصص»، «الصف»، «الفصل»، «السنة الدراسية» |
| S3 | `backend/src/lib/phones.ts` (E1) + اختباراته العشرون | عالية | خطة الترقيم الليبية: 218+، محمول 09X/9X، أرضي 02X/2X، أرقام هندية-عربية مقبولة |
| S4 | معرفة عامة موثّقة عن ليبيا | متوسطة — تُعلَّم حيث تُستخدم | الرقم الوطني الليبي 12 خانة تبدأ بسنة الميلاد (م. «الرقم الوطني» في بطاقة الهوية)؛ نظام الثانوية: شعبتا علمي/أدبي أساسًا مع فروع |

**محاولات التحقق الشبكي على هذا الصندوق (كلها فشلت — تُسجَّل بصدق):**
DuckDuckGo HTML بلا استجابة، Bing نتائج غير ذات صلة، Google خلف JS،
`admission.ly` (القبول الموحد) SPA بلا SSR، `uot.edu.ly` صفحة فارغة 5.6 KB.
لا يوجد Firecrawl/MCP على هذا الصندوق. **النتيجة:** التحقق الحي من نماذج
التسجيل الرسمية متعذّر هنا؛ S1+S2 يبقيان المصدر الملزم، والمجاهيل أدناه
تُطرح على المالك ولا تُخترع.

## 2. خريطة الحقول المستهدفة ← القرار

| الحقل (كما ورد في S1) | موجود في E1؟ | قرار P1 | المصدر |
|---|---|---|---|
| الاسم الرباعي (quadruple name) | `nameAr` نص واحد حر | **يبقى**؛ يُضاف `fatherName`/`grandfatherName`/`motherName` مفاتيح منظمة قابلة للبحث والاستيراد، و`nameAr` يبقى النص الكامل كما في الوثائق | S1 |
| الرقم الوطني | لا | `nationalId` (خام، وصول مضبوط) + `nationalIdHash` (SHA-256 للأرقام المطبَّعة، مفهرس للمطابقة/الاستيراد) — العرض مقنّع افتراضيًا لكل الأدوار عدا OWNER/ADMIN | S1 |
| رقم القيد | `universityId` ✓ | لا تغيير (متفرّد لكل مؤسسة) | S1=S2 |
| الشهادة الثانوية ونسبتها | لا | `secondarySchool` (اسم المدرسة) + `secondarySchoolPercent` Decimal(5,2) + `secondarySchoolBranch` (نص حر: علمي/أدبي/… — لا enum مغلق: الفروع تختلف بين الشهابات ولا نحصرها) + `admissionYear` | S1 |
| الشعبة | = الفرع أعلاه | ضمن `secondarySchoolBranch` | S1 |
| صباحي/مسائي/موازي | لا | enum `StudyType { MORNING, EVENING, PARALLEL }` — مفردات مغلقة لأنها وضع دراسة لا اسم حر | S1 |
| تحويل/إيقاف/تأجيل | `transferStatus` نص حر (منتقل/مستجد/منسحب) | يبقى لحالة الالتحاق؛ يُضاف enum `EnrollmentStatus { ACTIVE, SUSPENDED, DEFERRED, GRADUATED, WITHDRAWN }` للوضع الدراسي الجاري (nullable — القيمة الغائبة تعني ACTIVE في الخدمة، توافقًا مع قانون «additive nullable first») | S1 |
| ولي الأمر | `guardianName`/`guardianRelationship`/`guardianPhone(+Normalized)` ✓ | لا تغيير في الأعمدة؛ يُضاف `guardianPhoneVisibility` | S1+S2 |
| مكان الميلاد | `city`/`address` موجودان | يُضاف `birthPlace` (بلدية/مدينة الميلاد — غير مدينة السكن) | S1 |
| هاتف الطالب + الظهور | `studentPhone(+Normalized)` ✓ | يُضاف `studentPhoneVisibility` enum `PhoneVisibility { INSTITUTION_STAFF, PRIVATE }` (افتراضي INSTITUTION_STAFF: طاقم مؤسستي يراه؛ PRIVATE: مقنّع + طلب تواصل) | S1 |
| الرقم الوظيفي (مدرّس) | `employeeId` ✓ | لا تغيير | S1 |
| تفضيلات تواصل المدرّس | لا | enum `PreferredContact { PHONE, WHATSAPP, EMAIL, OFFICE_HOURS }` على TeacherProfile + `personalPhoneVisibility` | S1 |

## 3. مصفوفة الخصوصية (تُفصَّل وتُختبر خلية-خلية في PRIVACY-MATRIX.md — P2)

الأدوار الموجودة: STUDENT · TEACHER · ADMIN · QUALITY · OWNER (لا يوجد دور
«مسجّل/registrar» مستقل — ADMIN هو دور المؤسسة الإداري؛ SCOPE حسب `scopeFacultyId`).

مبدأ الخلية: `role × field → { HIDDEN, MASKED, VISIBLE, VISIBLE_IF_OWNER_SELF }`.

قواعد القطع (تُختبر كل واحدة):
1. الطالب يرى ملفه كاملًا (هاتفه ورقمه الوطني مقنّعان له أيضًا؟ — **لا**: مالك
   الملف يرى خام البيانات الخاصة به) — الحقول الأكاديمية للقراءة فقط.
2. TEACHER: يرى طلاب مقرراته فقط؛ الهاتف حسب `phoneVisibility`؛ الرقم الوطني
   **ممنوع دائمًا** (HIDDEN).
3. ADMIN/QUALITY (نطاق المؤسسة): الهاتف حسب الظهور (مع تسجيل AuditLog)،
   الرقم الوطني مقنّع، OWNER/ADMIN يرى الخام.
4. أي قراءة staff لهاتف/رقم وطني = صف AuditLog.
5. عابر المؤسسات = 404 (لا تسريب وجود).

## 4. المجاهيل المعلنة (أسئلة المالك — لا تعيق الشحن)

1. **صيغة «منظومة الغويل للمدارس»** — غير قابلة للتحقق (متطلب F/I نفسه):
   نحتاج عينة تصدير مجهولة الهوية لبناء preset دقيق؛ الإطار عام حتى ذلك الحين.
2. **فرضية الاسم الرباعي**: هل يلزم فصل الأسماء الأربعة إلزاميًا في الجامعات،
   أم يكفي `nameAr` الكامل مع الحقول المفصولة اختيارية؟ — الحالي: اختيارية.
3. **الرقم الوطني للمدارس**: هل تدخله المدرسة فعلًا لكل تلميذ أم الجامعات فقط؟
   — العمود اختياري في النموذجين؛ الإلزام قرار مؤسسة (custom fields/الخدمة).
4. **قناع الرقم الوطني**: نعرض «1••••••••89» (أول خانة + آخر خانتين) — يكفي؟
   أم قناع أشد؟ الحالي قابل للتعديل بنقطة واحدة (`maskNationalId`).

## 5. قرار التصميم المستخلص

additive nullable-first migration واحدة على StudentProfile + TeacherProfile:
`fatherName, grandfatherName, motherName, birthPlace, nationalId, nationalIdHash,
studyType, enrollmentStatus, secondarySchool, secondarySchoolBranch,
secondarySchoolPercent, admissionYear, studentPhoneVisibility,
guardianPhoneVisibility` + TeacherProfile: `preferredContact,
personalPhoneVisibility` + 4 enums + `@@index([nationalIdHash])`.
لا حذف، لا rename، لا NOT NULL جديدة.
