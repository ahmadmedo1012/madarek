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
git clone <repository-url> && cd madarek
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
npm run db:migrate   # prisma migrate dev — يطبق المخطط (21 ترحيلًا)
npm run db:seed      # بذر البيانات التجريبية
```

- البذر idempotent (upserts) وغير مدمّر (r180): بيانات المستخدمين
  المُنشأة فعليًا (امتحانات/إعلانات/مسابقات/فعاليات/فصول/تقدّم)
  تنجو من كل إعادة تشغيل؛ فقط كلمات مرور الحسابات التجريبية
  تُضبط للقيمة الموثقة في كل تشغيلة — انظر رأس `seed.ts`.
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

بعد البذر، استخدم كلمة مرور البذرة التطويرية الموثّقة في رأس
`backend/prisma/seed.ts` (بذرة محلية فقط — لا تُستخدم إنتاجًا أبدًا؛
أسرار الإنتاج مستقلّة لكل حساب ومُدارة عبر `db:rotate-password`):

| البريد | الدور |
|---|---|
| `student@demo.madarek.ly` | طالب (أحمد الزروق) — جامعة مدارك التجريبية |
| `teacher@demo.madarek.ly` | أستاذ (د. سالم البوسيفي) — جامعة مدارك التجريبية |
| `admin@demo.madarek.ly` | المسجل العام — جامعة مدارك التجريبية |
| `quality@demo.madarek.ly` | مكتب ضمان الجودة — جامعة مدارك التجريبية |
| `student2@demo.madarek.ly` | طالبة (ليلى المهدي) — مؤسسة الأندلس |
| `teacher2@demo.madarek.ly` | أستاذ (خالد الترابلسي) — مؤسسة الأندلس |
| `admin2@demo.madarek.ly` | المسجل العام — مؤسسة الأندلس |
| `owner@demo.madarek.ly` | مالك المنصة (بلا عضوية — نطاق المنصة) |

> مؤسستان للعرض (r178/r180): الرقم الجامعي `UZ-2024-00001` ورمز
> المقرر `SE301` موجودان في المؤسستين عمدًا — سجّل الدخول بالطالبين
> وراقب العزل.

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
node scripts/verify-parity-export.mjs # بوابة التصميم 190/190
```

نتائج فعلية موثقة لهذه الأوامر: [11-testing.md](11-testing.md).
عند التعثر: [14-troubleshooting.md](14-troubleshooting.md).
