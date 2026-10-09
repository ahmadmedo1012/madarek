# AGENTS.md — دليل وكلاء الذكاء الاصطناعي العاملين على مدارك

هذا الملف عقد العمل لوكلاء الذكاء الاصطناعي (وكذلك المرجع السريع للمطورين).
يجعل التعديل الآمن على مدارك قابلًا للتنفيذ دون تخمين: كل معلومة لها مصدر
حقيقة واحد، وكل تغيير له خطوات تحقق إلزامية.

## 1. ما هذا المشروع؟

**مدارك** — منصة التعلم الذكية لجامعة الزاوية (ليبيا): تطبيق واحد يضم
خلفية Express + TypeScript + Prisma وواجهة React 18 + Vite، يُشحَن كخدمة
واحدة على Render مع قاعدة بيانات Neon PostgreSQL. عربية RTL بالكامل.
نظام التصميم موثق بالكامل في `DESIGN.md` ومقيّد ببوابات تحقق آلية.

## 2. مصادر الحقيقة (لا تُخمّن — اقرأ المصدر)

| المعلومة | المصدر الوحيد الموثوق |
|---|---|
| المسارات والـendpoints | `backend/src/app.ts` + `backend/src/http/routes/*.ts` — الجدول الكامل المولّد: `docs/API-REFERENCE.md` |
| النماذج والعلاقات | `backend/prisma/schema.prisma` — الشرح: `docs/DATABASE-REFERENCE.md` |
| متغيرات البيئة وسلوكها | `backend/src/env.ts` — الجدول: `docs/06-configuration.md` |
| حالة الميزات المنفَّذة | الشيفرة نفسها + `docs/02-features.md` |
| نظام التصميم والسمات | `frontend/src/styles/tokens.css` (يفوز عند التعارض) + `DESIGN.md` |
| حالة الميزات الكبرى (specs) | `docs/SPECS-REFERENCE.md` (وليس ملفات `specs/*/spec.md`) |
| أوامر التشغيل والاختبار | `package.json` (الجذر) + `backend/package.json` + `frontend/package.json` |
| النشر | `render.yaml` + `.github/workflows/ci.yml` — الشرح: `docs/12-deployment.md` |

> قاعدة عامة: عند أي تعارض بين وثيقة والشيفرة، **الشيفرة تفوز** — صحّح
> الوثيقة في نفس التغيير.

## 3. خريطة الوحدات

| الوحدة | الملفات المفتاحية | وثيقة التفصيل |
|---|---|---|
| الخلفية — المصادقة والحاكمية | `backend/src/modules/auth/`، `http/routes/auth.routes.ts`، `owner.routes.ts`، `lib/permissions.ts`، `lib/governance.ts` | `docs/modules/platform.md` |
| الخلفية — قطاع الطالب والتعلم | `http/routes/learning.routes.ts` (أكبر ملف)، `student-dashboard.routes.ts`، `training.routes.ts` | `docs/modules/student.md` |
| الخلفية — قطاع الأستاذ | `http/routes/teacher*.routes.ts`، `curriculum.routes.ts`، `submissions.routes.ts`، `offerings.routes.ts` | `docs/modules/teacher.md` |
| الخلفية — الإدارة والمزامنة | `http/routes/users.routes.ts`، `courses.routes.ts`، `catalog.routes.ts`، `admin-extras.routes.ts`، `sync.routes.ts` | `docs/modules/admin.md` |
| الخلفية — قطاع الجودة | 6 مسارات `/quality/*` داخل `learning.routes.ts` | `docs/modules/quality.md` |
| الواجهة — الهيكل والمخازن | `frontend/src/App.tsx`، `components/layout/AppShell.tsx`، `stores/`، `lib/api.ts`، `hooks/useResources.ts` | `docs/03-architecture.md` |
| الواجهة — نظام التصميم | `frontend/src/styles/tokens.css`، `motion.css`، `fonts.css` | `docs/modules/platform.md` + `DESIGN.md` |
| قاعدة البيانات | `backend/prisma/schema.prisma`، `migrations/`، `seed.ts`، `scripts/migrate-deploy.mjs` | `docs/07-database.md` |

## 4. الأوامر الصحيحة (من ملفات المشروع الفعلية)

```bash
npm install                  # تثبيت (workspaces: backend + frontend)
npm run lint                 # ESLint على frontend/src + backend/src (0 أخطاء إلزامية؛ 18 تحذير exhaustive-deps مسموح موثق)
npm run typecheck            # tsc للشيفرة والاختبارات في الجهتين — لا يحتاج قاعدة بيانات
npm test                     # vitest للجهتين — لا يحتاج قاعدة بيانات (1015 واجهة + 1021 خلفية)
npm run dev                  # خلفية على :4000 (tsx watch)
npm run dev:web              # واجهة على :5173 مع proxy ‏/api → :4000
npm run build -w frontend    # بناء الواجهة فقط (لا يحتاج DB)
npm run build -w backend     # بناء الخلفية فقط (prisma generate + tsc)
npm run db:migrate           # prisma migrate dev محليًا — يحتاج DATABASE_URL حية
npm run db:seed              # بذر البيانات التجريبية — يحتاج DATABASE_URL حية
node scripts/verify-parity-export.mjs   # بوابة التكافؤ 163/163 (بلا اعتماديات)
bash scripts/check-icons.sh             # انضباط الأيقونات (Lucide فقط)
bash scripts/check-motion-tokens.sh     # منع قيم الحركة الخام
bash scripts/check-csp-hash.sh          # مطابقة بصمات CSP بعد أي تعديل على frontend/index.html
npm run validate:colleges               # هوية 25 كلية (تباين AA، أصول، أيقونات)
```

ملاحظات إلزامية:

- `npm run build` (الجذر) يشغّل `db:deploy` في النهاية — **لا تشغّله بدون
  `DATABASE_URL` حية**؛ استخدم بناء كل workspace منفصلًا في CI/محليًا بلا DB.
- الاختبارات تحقن `NODE_ENV=test` تلقائيًا فتتجنب طلب أسرار حقيقية.
- مدير الحزم الرسمي **npm** (لا pnpm في هذا المستودع).

## 5. قيود معمارية لا تُتجاوز

1. **خدمة واحدة**: الخلفية تخدم SPA المبني من `frontend/dist` في الإنتاج
   (`env.serveStatic`). لا تُدخل خلفية منفصلة أو CDN للواجهة دون قرار صريح.
2. **اختبارات بلا DB**: كل وحدة خلفية تحتفظ بدوال قرار نقية تُختبر مباشرة؛
   استخدم `vi.mock('../../src/db.js')` عند الضرورة. لا تُدخل قاعدة بيانات
   اختبارية ضمن `npm test`.
3. **سياسة اللغة D17-3**: أكواد الأخطاء إنجليزية UPPER_SNAKE، والرسائل
   الموجهة للمستخدم عربية. النصوص الواجهية عربية صريحة (لا i18n بعد —
   انظر `docs/16-decisions-and-limitations.md`).
4. **نظام التصميم**: لا قيم حركة/ألوان خام خارج `tokens.css`/`motion.css`
   (بوابات CI ترفض). الأيقونات Lucide فقط عبر `Icon.tsx`. عند تعديل
   `frontend/index.html` الداخلي — حدّث بصمة CSP في `backend/src/app.ts`.
5. **الحاكمية**: تعديلات الأدوار/الحالة تمر عبر حرّاس `lib/governance.ts`
   (قفل آخر مالك نشط بـ`SELECT … FOR UPDATE` + صف `AuditLog` بنفس المعاملة).
6. **لا رفع ملفات**: لا multipart endpoint اليوم؛ قرص Render زائل — أي
   ميزة رفع تتطلب قرصًا دائمًا أو تخزين كائنات أولًا (انظر `render.yaml`).
7. **لا إعادة هيكلة تجميلية**: لا تغيير أسماء واجهات/دوال/مسارات/نماذج
   دون مبرر وظيفي — أسماء المسارات والحقول جزء من عقد الواجهات.

## 6. قواعد قاعدة البيانات والأسرار

- لا تنفّذ ترحيلات على أي قاعدة بيانات إنتاجية؛ `db:migrate` للمحلي فقط،
  والإنتاج يطبق الترحيلات في خطوة بناء Render عبر `scripts/migrate-deploy.mjs`.
- أي تعديل مخطط: عدّل `schema.prisma` ثم `npm run db:migrate` محليًا،
  وأرفق ملف الترحيل المولّد (لا تعدّل ترحيلات مطبقة).
- **لا تضع أسرارًا حقيقية أبدًا** في الشيفرة أو الوثائق أو الاختبارات.
  `.env` مُتجاهل عمدًا؛ القالب `.env.example` بقيم بديلة فقط.
- بذور `seed.ts` تعيد تعيين كلمات مرور الحسابات التجريبية الخمسة وتدمج
  (wipe) جداول الإعلانات/المسابقات/الأحداث — لا تشغّلها إلا على بيئة تطوير.
- البحث النصي العربي يعتمد تطبيعًا موحدًا في `backend/src/modules/search/normalize.ts`
  مع مرآة في الواجهة — أي تعديل يُطبق على الجهتين معًا.

## 7. إجراء إلزامي قبل التعديل وبعده

قبل التعديل:

1. `git status` — تأكد أن الشجرة نظيفة أو اعرف ما تتعامل معه.
2. اقرأ صف الوحدة من القسم 3 (الوثيقة المخصصة + الملفات المفتاحية).
3. حدد أصغر نطاق يحقق الهدف دون تغيير سلوك خارج النطاق.

بعد التعديل (الحد الأدنى للتحقق):

```bash
npm run lint && npm run typecheck && npm test
node scripts/verify-parity-export.mjs && bash scripts/check-csp-hash.sh
```

- تعديلات الواجهة: أضف `npm run build -w frontend` + تحقق بصري بالنمطين
  الفاتح والداكن واتجاه RTL.
- تعديلات مخطط/استعلامات: تحقق يدوي على بيئة تطوير بقاعدة حية.
- عدّلت `DESIGN.md`؟ وثّق القيمة كما تشحنها من `tokens.css` (tokens تفوز).

## 8. معيار اعتبار المهمة مكتملة

- الفحوص أعلاه كلها خضراء فعلًا (لا تفترض النجاح).
- لا أسرار في الفرق النهائي (`git diff` مُراجَع).
- الوثائق المتأثرة حُدّثت في نفس التغيير (بما فيها `CHANGELOG.md` للجولات
  الوظيفية وفق `CONTRIBUTING.md`).
- الوصف الذاتي للتغيير يذكر ما اختُبر وما لم يُختبر بصدق.

## 9. أسلوب الالتزامات والتوثيق

- الالتزام: `type(rNNN): موضوع` — النوع `feat|fix|chore|docs`، والرقم rNNN
  يسلسل مع الجولات السابقة (انظر `git log`). النسخ الواجهية عربية أولًا.
- لغة التوثيق: العربي لغة التوثيق الأساسية (`docs/01-…` حتى `16-…` و
  `modules/`)، والمراجع التقنية المولّدة إنجليزية (`docs/*-REFERENCE.md`) —
  حافظ على هذا التقسيم ولا تكرر محتوى مرجع بين اللغتين؛ اربط.
- المصطلحات التقنية ومسارات الملفات تبقى بأسمائها الأصلية (لا تُترجم).

## 10. ملفات تُقرأ قبل العمل على كل وحدة

| قبل التعديل على… | اقرأ |
|---|---|
| أي مسار خلفية | `BACKEND.md` + `docs/08-api-reference.md` (اتفاقية الأظرف والأخطاء) |
| `learning.routes.ts` أو مصفوفة الإتقان | `docs/modules/student.md` |
| مصادقة/جلسات/أدوار | `docs/modules/platform.md` + `docs/10-security.md` |
| سمة/نمط/حركة | `DESIGN.md` + `docs/modules/platform.md` (قسم نظام التصميم) |
| ترحيل/نموذج Prisma | `docs/07-database.md` + `docs/DATABASE-REFERENCE.md` |
| نشر/بيئة/أسرار | `docs/12-deployment.md` + `docs/06-configuration.md` + `docs/SECRETS-REFERENCE.md` |
| مواصفات ميزة قائمة | `docs/SPECS-REFERENCE.md` ثم `specs/README.md` |
