# 05 — الإعداد والتشغيل المحلي

هذه الخطوات مستخرجة من ملفات المشروع الفعلية (`package.json` الجذر،
`.env.example`، `backend/scripts/migrate-deploy.mjs`). لا خطوة تخمينية فيها.

## المتطلبات السابقة

| المتطلب | الإصدار/القيمة | ملاحظات |
|---|---|---|
| Node.js | `>=20 <25` (حقل engines؛ CI يستخدم 22) | تحقق: `node --version` |
| npm | يأتي مع Node | مدير الحزم الرسمي — لا pnpm في هذا المستودع |
| قاعدة PostgreSQL | Neon مجاني يكفي (أو `tools/boot-pg.sh` محليًا) | ستضع `DATABASE_URL` لها |
| git | أي إصدار حديث | — |

## الخطوات

### 1) الاستنساخ والتثبيت

```bash
git clone https://github.com/ahmadmedo1012/madarek.git && cd madarek
npm install        # workspaces: يثبت backend + frontend معًا، وينفّذ prisma generate
```

> إن كان `NODE_ENV=production` لديك فسيرصد `scripts/warn-node-env.mjs`
> ذلك ويحذرك (devDependencies اللازمة للبناء ستُتخطى).

### 2) ملف البيئة

```bash
cp .env.example backend/.env
```

ثم املأ ثلاثة متغيرات إلزامية في `backend/.env`:

```ini
DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require&channel_binding=require"
JWT_ACCESS_SECRET="<64 بايت عشوائية hex>"
JWT_REFRESH_SECRET="<64 بايت عشوائية hex مختلفة>"
```

توليد الأسرار (على جهازك، لا تشارك الناتج):

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

جدول المتغيرات الكامل وسلوك كل متغير: [06-configuration.md](06-configuration.md).

### 3) قاعدة البيانات: ترحيل ثم بذر

```bash
npm run db:migrate   # prisma migrate dev — يطبق المخطط (16 ترحيلًا)
npm run db:seed      # بذر البيانات التجريبية
```

- البذر idempotent (upserts) لكنه **يمسح ويُعيد** الإعلانات والمسابقات
  والأحداث، ويعيد تعيين كلمات مرور الحسابات التجريبية — لا تشغّله على
  بيئة تريد الحفاظ على بياناتها.
- بديل بلا Neon: `tools/boot-pg.sh` يشغّل PostgreSQL مدمجًا على `:5433`
  (يتطلب `cd tools && npm install` مرة واحدة). استخدم بعدئذ
  `postgresql://madarek@127.0.0.1:5433/madarek` في `DATABASE_URL`.

### 4) التشغيل (نافذتان)

```bash
npm run dev        # الخلفية على http://localhost:4000 (tsx watch)
npm run dev:web    # الواجهة على http://localhost:5173 مع proxy ‏/api → :4000
```

افتح `http://localhost:5173`. الواجهة تستدعي `/api/v1` نسبيًا فيتولى
Vite تحويله إلى `:4000` — لا حاجة لأي إعداد CORS محليًا.

### 5) الحسابات التجريبية

بعد البذر، كلمة المرور للجميع `Madarek2026!` (حساب تجريبي معلن في
`seed.ts` — لا تستخدمه إنتاجًا أبدًا):

| البريد | الدور |
|---|---|
| `student@zu.edu.ly` | طالب (أحمد الزروق) |
| `teacher@zu.edu.ly` | أستاذ (د. سالم البوسيفي) |
| `admin@zu.edu.ly` | إدارة الجامعة |
| `quality@zu.edu.ly` | مكتب ضمان الجودة |
| `owner@zu.edu.ly` | مالك المنصة |

## البناء والإنتاج محليًا (اختياري)

```bash
npm run build -w frontend    # vite build → frontend/dist
npm run build -w backend     # prisma generate + tsc → backend/dist
npm start                    # يشغل backend/dist/index.js — يخدم API + SPA معًا على :4000
```

> لا تستخدم `npm run build` (الجذر) بلا `DATABASE_URL` حية: الخطوة
> الأخيرة فيه `db:deploy` تطبق الترحيلات. في CI يبني كل workspace
> منفصلًا لهذا السبب بالضبط (انظر `.github/workflows/ci.yml`).

## التحقق من أن كل شيء سليم

```bash
npm run typecheck                     # tsc للجهتين (لا DB)
npm test                              # 1015 واجهة + 1021 خلفية (لا DB)
node scripts/verify-parity-export.mjs # بوابة التصميم 163/163
```

نتائج فعلية موثقة لهذه الأوامر: [11-testing.md](11-testing.md).
عند التعثر: [14-troubleshooting.md](14-troubleshooting.md).
