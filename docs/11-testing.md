# 11 — الاختبارات وفحوص الجودة

> كل الأرقام في هذه الوثيقة من تشغيل فعلي على الشجرة الحالية
> (2026-10-10، Node 24، npm ci نظيف). لا رقم موروث من وثيقة أخرى.

## النتائج الفعلية الموثقة

| الفحص | الأمر | النتيجة الفعلية |
|---|---|---|
| Lint | `npm run lint` | **0 أخطاء**، 18 تحذيرًا (exhaustive-deps — مسموحة موثقة في `eslint.config.mjs`) |
| Typecheck | `npm run typecheck` | **نجاح** — src + tests للجهتين (tsconfig.test.json) |
| اختبارات الواجهة | `npm --prefix frontend run test` | **88 ملفًا، 1015 اختبارًا، كلها ناجحة** (~80 ثانية) |
| اختبارات الخلفية | `npm --prefix backend run test` | **38 ملفًا، 1021 اختبارًا، كلها ناجحة** (~11 ثانية) |
| بوابة التكافؤ | `node scripts/verify-parity-export.mjs` | **PASS — 163 فحص token** + تدقيق متغيرات غير معرفة + قيم مستبعدة + توازن أقواس |
| الأيقونات | `bash scripts/check-icons.sh` | OK — Lucide فقط |
| رموز الحركة | `bash scripts/check-motion-tokens.sh` | OK — لا قيم خام |
| بصمات CSP | `bash scripts/check-csp-hash.sh` | OK — بعد تحديث بصمة bootstrap (انظر [14](14-troubleshooting.md)) |
| هوية الكليات | `npm run validate:colleges` | OK — 25 بروفايل (تباين AA، أصول، أيقونات) |
| بناء الخلفية | `npm --prefix backend run build` | نجاح (prisma generate + tsc) |
| بناء الواجهة | `npm --prefix frontend run build` | نجاح — vite (~5 ثوانٍ، chunks ثابتة) |

> ملاحظة صدق: أثناء اختبارات الخلفية ترى سجلات pino حمراء («Unhandled
> error», «telemetry table missing»…) — هذه **أخطاء مُصنَّعة عمدًا داخل
> الاختبارات** لتمرير معالجات الأخطاء؛ سلوك متوقع وغير مقلق.

## الفلسفة: وحدات نقية بلا قاعدة بيانات

كل وحدة خلفية تُصدّر دوال قرار نقية (حراس، مخططات، آلات حالات، تطبيع
عربي، توقيت) تُختبر مباشرة؛ وعندما تجذب الشجرة `db.ts` يُستبدل بـ
`vi.mock('../../src/db.js')`. النتيجة: `npm test` يعمل بلا `DATABASE_URL`
في أي بيئة — ولهذا بناء CI «DB-free» ممكن.

ما تغطيه الاختبارات (نماذج): حرس ملفات PDF، توقيت الدخول والأقفال، دوران
الجلسات D3، معالجات أخطاء Prisma/body، الضغط المخصص، التواريخ والمناطق،
الحاكمية، التقييم D12، نموذج المخاطرة، دمج القدرات، منطق قطاعات كامل
(تعلم/امتحانات/تدريب/منشورات/مالك…)، ترتيب المسارات العامة قبل بوابات
المصادقة (اختبارات انحدار بجبل الراوترات فعليًا).

ما **لا** تغطيه (حدود معلنة):
- لا اختبارات تكامل بقاعدة حية: منطق المعاملات والأقفال (`FOR UPDATE`)
  وبوابة DB للملفات غير مثبتة باند-تو-اند.
- لا E2E فعلي: Playwright موجود كجرد أسطح opt-in فقط
  (`tests/audit/surface-inventory.spec.ts` بـ`AUDIT_BASELINE=1`)؛ خط
  `tests/e2e/` الموصول لم يشحن أبدًا (موثق داخل `playwright.config.ts`).
- بوابة surface-drift في CI **شفافة بصدق**: الأساس `surface-baseline.json`
  فارغ (0 لقطة) → تتجاوز بنوتice حتى تُلتقط (مهمة specs/012 T142).

## بنية الاختبارات

| المكان | المحتوى |
|---|---|
| `backend/tests/modules/` | 37 حزمة + حزمة colocated واحدة في `src/modules/search/__tests__/` (glob ثانٍ عمدًا — تعليق الملف يشرح) |
| `frontend/tests/unit/` | 82 ملفًا: مسارات App، تغطية nav والعناوين، جلسة/تهيئة، صفحات، a11y، لقطات tokens |
| `frontend/tests/motion|gallery/` | 6 ملفات حركة/معرض |
| `frontend/tests/audit/` | جرد أسطح Playwright + كاشف انزياح (وحدة نقية مُختبرة) |
| `frontend/tests/setup.ts` | localStorage/Map، matchMedia، IntersectionObserver قبل كل ملف |

## كتابة اختبار جديد (الأعراف)

1. **خلفية**: صدّر قرارًا نقيًا من الوحدة؛ الاختبار في `tests/modules/`
   باسم `<topic>-<behavior>.test.ts`؛ حاكِ `db.ts` فقط عند الضرورة.
2. **واجهة**: `tests/unit/` بـjsdom؛ استخدم `MemoryRouter` و`QueryClient`
   نظيفًا؛ لا اعتماد على شبكة (mock `lib/api.ts`).
3. شغّل `npm test` ثم أضف الفحص إلى قائمة البوابات إن كان بوابة جديدة
   (بوابات CI: icons/motion/csp-hash/parity/colleges — كلها سكربتات
   `scripts/`).
4. لا تخترع أرقامًا في الوثائق — أعد التشغيل والصق الناتج الحقيقي.

## إعادة إنتاج الأرقام أعلاه

```bash
npm ci                                # تثبيت نظيف مطابق للقفل
npm run lint && npm run typecheck
npm test                              # يطبع 88/1015 ثم 38/1021
node scripts/verify-parity-export.mjs
bash scripts/check-icons.sh && bash scripts/check-motion-tokens.sh
bash scripts/check-csp-hash.sh
npm run validate:colleges
```
