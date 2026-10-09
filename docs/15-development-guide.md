# 15 — دليل التطوير: إضافة ميزة وفق أعراف مدارك

## قواعد الشيفرة المعمول بها

- **TypeScript صارم**: `strict` + `noUncheckedIndexedAccess` +
  `verbatimModuleSyntax` (كلا الجهتين). لا `any` جديد بلا مبرر.
- **ESLint**: أخطاء = بوابة فاشلة؛ التحذيرات الـ18 (exhaustive-deps)
  مسموحة موثقة — لا تضف تحذيرات جديدة.
- **ESM** في الخلفية (`"type": "module"`)، ومسارات الاستيراد بامتداد
  `.js` وفق العرف القائم.
- **اللغة**: نصوص الواجهة والرسائل عربية؛ أكواد الأخطاء UPPER_SNAKE
  إنجليزية (D17-3). المصطلحات التقنية لا تُترجم.
- **الاختبار**: كل قرار جديد (حارس، مخطط، آلة حالات) = دالة نقيّة مُصدَّرة
  + اختبار. لا اختبار DB ولا شبكة.
- **الالتزام**: `type(rNNN): موضوع` — عربي أولًا، يشرح «لماذا» لا «ماذا»
  فقط (انظر `git log` أمثلة حية).

## إضافة endpoint خلفي (خطوات فعلية)

1. **الموضع**: اختر ملف القطاع في `backend/src/http/routes/`
   (student/teacher/admin/quality/owner) — لا تفتح ملفًا جديدًا إلا
   لقطاع جديد فعليًا. راجع [modules/](modules/) لتعرف الملف الصحيح.
2. **المخطط**: DTO بالـZod في أعلى الملف أو `modules/<x>/*.dto.ts`
   بنمط `.strict()`؛ ثم `router.post('/x', validate(schema), handler)`.
3. **الحماية**: `requireRole(...)` أو `requireCapability('...')` — والقدرة
   الجديدة تُضاف إلى `DEFAULT_ROLE_CAPABILITIES` في `lib/permissions.ts`
   + صف بذرة `RolePermission`.
4. **المعاملات**: أي تعديل حاكمي/متعدد الصفوف داخل `$transaction`؛
   حرس TOCTOU بنمط `SELECT … FOR UPDATE` (راجع `enrollments.routes.ts`
   نموذجًا)؛ واكتب `AuditLog` بنفس المعاملة إن كان إداريًا.
5. **الاستجابة**: `{ data, meta? }` عبر `lib/pagination.ts` للقوائم؛
   أخطاء عبر `AppError` (رسالة عربية) — لا `throw new Error` خام.
6. **الاختبار**: صدّر قرار الحارس/التحقق كدالة نقيّة + `tests/modules/…`.
7. **توثيق**: أضف الصف إلى `docs/API-REFERENCE.md` (الجدول المولّد) و
   حدّث رقم العدّ إن تغير (الاصطلاح المرجعي: «193 = 188 تسجيلًا في ملفات
   المسارات + 4 في راوترات الوحدات + /health»).

## إضافة صفحة واجهة (خطوات فعلية)

1. **الملف**: `frontend/src/pages/<القطاع>/YourPage.tsx` — استورد
   `States.tsx` للفراغ/الخطأ/التحميل، و`Card`/`MetricCard` للبنية.
2. **البيانات**: هوك TanStack Query جديد — إن كان للطالب/الأستاذ
   فالموضع `hooks/useResources.ts` (نمط المفاتيح `['me','x']`)؛ المالك
   في `useOwner.ts`؛ اجعل الـpayload منخفض الحجم واستخدم
   `keepPreviousData` للصفحات.
3. **المسار**: سطر في `App.tsx` داخل مجموعة الدور الصحيحة
   (`ProtectedRoute allow={['ROLE']}`) — كل الصفحات `React.lazy`.
4. **التنقل**: مدخل في `lib/nav.ts` بمجموعة الدور + عنوان في
   `NAV_TITLES` (بوابة `route-titles-coverage` و`nav-coverage` ترفض
   النسيان) + عنصر BottomNav للجوال إن كان أساسيًا.
5. **النمط**: أصناف CSS في ورقة القطاع، لا قيم ألوان/حركة خام —
   استخدم رموز `tokens.css` (البوابات ترفض الخام)؛ أيقونات عبر `Icon.tsx`.
6. **التحقق**: `npm run typecheck && npm test` + تجربة بالنمطين
   الفاتح/الداكن وجوال 390px (قائمة PR template).

## إضافة ترحيل قاعدة بيانات

```bash
# بعد تعديل backend/prisma/schema.prisma
npm run db:migrate      # يولد backend/prisma/migrations/<stamp>_<name>/
npm test                # تأكد أن الوحدات النقية لم تنكسر
```

- أرفق مجلد الترحيل كاملًا؛ لا تعدّل ترحيلًا مطبقًا.
- ترحيل بيانات ثقيل: SQL دفعات (نمذج `progress_truth_backfill`).
- حدّث `docs/DATABASE-REFERENCE.md` (أعداد النماذج/الأعمدة).

## إضافة رمز تصميم جديد

1. أضف المتغير في `frontend/src/styles/tokens.css` بنسختي `[data-theme]`
   مع تعليق تباين WCAG إن كان لونًا.
2. انعكس في زوج التصدير (`unified-parity.css` +
   `shared-design-system.css`) — بوابة `verify-parity-export` (163 فحصًا)
   تفرض التطابق وتطبع الفروق.
3. حدّث `DESIGN.md` بقيمة الشحن الفعلية (tokens هي المصدر).

## تحديث `frontend/index.html`

أي لمسة على السكربتات الداخلية تستوجب إعادة توليد بصمة sha256 في
`backend/src/app.ts` — وإلا رفضت البوابة `check-csp-hash` (والإنتاج
سينكسر السمة الداكنة بصمت). الوصفة المعلقة أعلى الثابت في `app.ts`.

## قبل فتح PR (قائمة `.github/PULL_REQUEST_TEMPLATE.md` مختصرة)

- [ ] `npm run lint && npm run typecheck && npm test` أخضر فعليًا.
- [ ] `node scripts/verify-parity-export.mjs` + `check-csp-hash.sh`.
- [ ] نمطان فاتح/داكن + RTL + لوحة مفاتيح + لقطات إن كانت واجهة.
- [ ] `CHANGELOG.md` محدث للجولات الوظيفية؛ الوثائق المتأثرة (docs/01–16
      أو *-REFERENCE) محدثة بنفس الـPR.
- [ ] لا أسرار في الفرق؛ `git diff` مُراجَع.

## ما لا تفعله (قيود AGENTS.md 5 تلخيصًا)

لا هندسة معاكسة تجميلية، لا تغيير مسارات/نماذج عامة بلا مبرر، لا
اعتمادية جديدة لوجود بديل قائم، لا i18n عشوائي قبل قرار US7، ولا
إعادة كتابة وثائق تاريخية (specs/audits/archive) — وثّق الجديد في
المراجع الحية بدل ذلك.
