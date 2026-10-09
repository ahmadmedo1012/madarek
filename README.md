# منصة جامعة الزاوية للتعليم الذكي

**Zawia University Smart Learning Platform** — the official Arabic-RTL educational platform of **University of Zawia** (UoZ), under the **Ministry of Higher Education and Scientific Research, Libya** — and the **design source-of-truth for the Smart family** (Smart-Menu · Smart-Link · SmartBot · Smart-Order).

> 🌐 **English-primary** · condensed العربية section below.

## العربية — باختصار

**مدارك** هي منصة التعلّم الذكي لجامعة الزاوية: فصول مقلوبة، مصفوفة إتقان، مكتبة بحثية، رقابة جودة، وإدارة أكاديمية كاملة — منصة واحدة تخدم الطلاب والأساتذة والإدارة ومكتب الجودة.

- **الإنتاج:** <https://madarek.onrender.com> · **النشر:** Render (3 خطوات، انظر أدناه) · **حسابات تجريبية:** أدناه (كلمة المرور `Madarek2026!`)
- **مرجع التصميم:** مدارك هي المرجع الأم لنظام تصميم العائلة — لغة التصميم الكاملة في [`DESIGN.md`](DESIGN.md) (العربية الأصلية في المنتج، والإنجليزية لغة التوثيق).
- **لقطات الشاشة:** الواجهة التعريفية، صفحة الدخول بالنسقين، ولوحة تحكم المالك — في قسم [Screenshots · لقطات الشاشة](#screenshots--لقطات-الشاشة) أدناه.

---

## What this repo is

Madarek is two things at once:

1. **A bilingual academy platform** — a complete LMS for a public university: flipped classrooms, a per-concept mastery matrix, a research-papers workflow with PDF annotations, cross-document library search, a read-only quality-oversight sector, and DB-driven admin reporting.
2. **The family's design reference** — every Smart product clones its design canon from here: the copper-on-cream / gold-on-night product theme, the IBM Plex Sans Arabic type ladder, the motion canon, elevation, component recipes, and RTL rules.

**The design canon lives in [`DESIGN.md`](DESIGN.md)** — values extracted from code, not specs. The export contract that bridges this reference to the products lives in [`docs/PARITY-EXPORT.md`](docs/PARITY-EXPORT.md).

### Verify it yourself · تحقّق بنفسك

```bash
npm test                              # frontend + backend unit suites (no DB needed)
node scripts/verify-parity-export.mjs # design-parity gate — 163/163 token checks
```

| Gate | Command |
|---|---|
| Design parity export | `node scripts/verify-parity-export.mjs` — 4 gates: token parity 163/163 · undefined-var audit · 43 retired values absent · brace balance |
| Motion tokens | `npm run check:motion-tokens` |
| Icon discipline | `npm run check:icons` |
| Full unit suites | `npm test` |

## Screenshots · لقطات الشاشة

The two design worlds as they ship — captured at 1440×900 from the live app (العالمَان كما يُشحَنان فعليًا — لقطات 1440×900 من التطبيق الحيّ):

| | |
|---|---|
| **Orbit Ink landing** · الواجهة التعريفية | ![Landing hero — hero headline over the live OrbitScene canvas](docs/screenshots/landing-hero.png) |
| **Colleges constellation** · كوكبة الكليات (25 كلية) | ![Landing colleges section — the 25-college constellation ring](docs/screenshots/landing-colleges.png) |
| **Sign-in · light** · الدخول — النسق الفاتح (كريمي/نحاسي) | ![Sign-in page, copper-on-cream light theme](docs/screenshots/auth-light.png) |
| **Sign-in · dark** · الدخول — النسق الداكن (ليلي/ذهبي) | ![Sign-in page, gold-on-night dark theme](docs/screenshots/auth-dark.png) |
| **Owner dashboard · light** · لوحة المالك — الفاتح | ![Owner dashboard with KPI cards, doughnut chart and activity feed, light theme](docs/screenshots/owner-dashboard-light.png) |
| **Owner dashboard · dark** · لوحة المالك — الداكن | ![Owner dashboard with KPI cards, doughnut chart and activity feed, dark theme](docs/screenshots/owner-dashboard-dark.png) |

*Full captions, sizes and capture notes: [`docs/screenshots/README.md`](docs/screenshots/README.md). Captions and file list in both languages · التعليقات الكاملة والقائمة بالعربية والإنجليزية.*

## Demo accounts

After seeding, all use password `Madarek2026!` (re-seeding resets it):

- `student@zu.edu.ly` → STUDENT (أحمد الزروق)
- `teacher@zu.edu.ly` → TEACHER (د. سالم البوسيفي)
- `admin@zu.edu.ly` → ADMIN (إدارة الجامعة)
- `quality@zu.edu.ly` → QUALITY (مكتب ضمان الجودة)
- `owner@zu.edu.ly` → OWNER (مالك المنصة)

## What's inside

- **Flipped classroom** — recorded lectures with embedded checkpoint questions, watch tracking, auto-attendance
- **Educational matrix** — per-concept mastery tracing, gap detection, recommendation engine
- **Research papers workflow** — submission (PDFs served from `backend/storage/papers/`) → simulated plagiarism + AI scan → teacher review with inline annotations → publish to library
- **Cross-document library search** — full-text search across published papers
- **Quality oversight (4th sector)** — read-only institutional health: per-course quality, professor performance, engagement, curriculum tree
- **Admin** — faculties, courses, reports with real DB-driven KPIs
- **Smart attendance** — auto-marks PRESENT when a recorded lecture is fully watched
- **PDF viewer** — page nav, zoom, search, highlight, fullscreen, RTL chrome, mobile-responsive
- **Live notifications** — bell badge with real unread count, refetches every 60s
- **Social feed** — student/teacher posts with hashtags + reactions
- **University info** — the colleges gallery profiles 25 colleges across the Zawiya, Ajlulat and Zwara campuses; the university's own listing counts 26 faculties (served as the official `collegeCount` fact). Vision/mission, rankings, contacts included

## Deploy on Render (3 steps)

1. **Push the repo to GitHub.**
2. In Render, click **New + → Blueprint** and pick this repository. `render.yaml` creates the web service; `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated automatically.
3. In the service's **Environment** tab, set **`DATABASE_URL`** to your Neon pooler connection string (`?sslmode=require&channel_binding=require`).

The build runs `npm ci --include=dev && npm run build` (dev deps are needed for the TypeScript/vite build steps): Vite frontend → `frontend/dist`, Express backend → `backend/dist`, then `prisma migrate deploy`. `npm run start` boots one Express server that serves the API at `/api/v1/*` and the SPA at every other path. PDF documents are served from `backend/storage/papers/` via `/api/v1/files/papers/:filename` (auth-required, path-traversal protected).

### Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✓ | Neon PostgreSQL pooler string (`sslmode=require&channel_binding=require`) |
| `JWT_ACCESS_SECRET` | ✓ | 64 bytes of random hex — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | ✓ | a *different* 64-byte random hex |
| `CORS_ORIGINS` | optional | extra allowed origins, comma-separated, no wildcards (production URL always allowed) |
| `INTERNAL_SERVICE_TOKEN` | optional | shared secret for service-to-service routes (SHA-256 + timingSafeEqual; fails closed when unset) |

## Local development

```bash
git clone https://github.com/ahmadmedo1012/madarek.git && cd madarek
cp .env.example backend/.env       # fill in DATABASE_URL + JWT secrets
npm install
npm run db:migrate                  # apply schema to your Neon DB
npm run db:seed                     # load demo data

# Two terminals:
npm run dev                         # backend on :4000
npm run dev:web                     # frontend on :5173 (proxies /api → :4000)
```

> **Note:** typechecks (`npm run typecheck`) and unit tests (`npm test`) run **without any database** — you only need a live `DATABASE_URL` for migrations, seeding and running the server. Full API reference: [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md).

## Structure

```
madarek/
├── backend/          Express + TypeScript API · Prisma schema (75 models) · storage/papers/
├── frontend/         React 18 + Vite · src/styles/ token cascade · tests/ (vitest)
├── docs/             engineering references (API, DATABASE, SECRETS, PARITY-EXPORT) + archive/
├── specs/            design process archaeology (001–012) — intent, not shipped values
├── scripts/          verify-parity-export.mjs · check-motion-tokens · check-icons · …
├── design-system/    superseded SpeckKit draft (kept for archaeology — see its banner)
├── audits/           design audit reports
├── tools/            dev tooling
└── render.yaml       Render blueprint
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run dev:web` | backend :4000 / frontend :5173 (proxies `/api`) |
| `npm run build` | build frontend + backend, apply pending migrations (`prisma migrate deploy`) |
| `npm start` | run the built single-service server (API + SPA) |
| `npm test` | frontend + backend unit suites (no DB needed) |
| `npm run typecheck` | aggregate typecheck — backend + frontend, src + tests |
| `npm run db:migrate` / `db:seed` | apply Prisma schema / load demo data |
| `node scripts/verify-parity-export.mjs` | design-parity gate (163/163) |
| `npm run check:motion-tokens` / `check:icons` | motion-token + Lucide-only discipline gates |
| `npm run validate:colleges` | college identity validation |

## Tech notes

**Backend** (`backend/src/`): Express + TypeScript, Prisma 5, JWT (15 min access + 7 d refresh cookie; `tokenVersion` bump revokes sessions), Argon2id, Helmet (CSP allow-list), CORS allow-list, gzip, `express-rate-limit` (1000 req/15 min global, 10/15 min auth), Zod validation, `pino` logs (secret redaction), SPA fallback, `pdf-parse` text extraction.

**Frontend** (`frontend/src/`): Vite + React 18 + TypeScript, React Router 6, TanStack Query 5, Zustand, react-hook-form + Zod, axios 401-refresh interceptor, Chart.js, `pdfjs-dist` (lazy chunk).

**Database** (`backend/prisma/`): 75 models, 30 enums; migrations committed and applied via `prisma migrate deploy` during the Render build.

## License

Internal — University of Zawia.

---

## 🛰️ Part of the Madarek Ecosystem — جزء من منظومة مدارك

> One design system across all projects · the Madarek identity: night/gold `#070B16`/`#E9B44C` dark — cream/copper `#FBFAF9`/`#B57438` light — IBM Plex Sans Arabic

| Project | Role | GitHub | Live |
|---|---|---|---|
| 🎓 **Madarek / مدارك** | Smart-learning platform for University of Zawia — the design-system reference | [github.com/ahmadmedo1012/madarek](https://github.com/ahmadmedo1012/madarek) | [madarek.onrender.com](https://madarek.onrender.com) |
| 🔗 **Smart-Link / سمارت لينك** | Digital umbrella for Libyan businesses | [github.com/ahmadmedo1012/Smart-Link](https://github.com/ahmadmedo1012/Smart-Link) | [smart-link.ly](https://smart-link.ly) |
| 🍽️ **Smart Menu / سمارت منيو** | Digital menu & WhatsApp ordering for restaurants | [github.com/ahmadmedo1012/Smart-Menu](https://github.com/ahmadmedo1012/Smart-Menu) | [menu.smart-link.ly](https://menu.smart-link.ly) |
| 🤖 **SmartBot / سمارت بوت** | Messenger bot & automation for Facebook pages | [github.com/ahmadmedo1012/SmartBot](https://github.com/ahmadmedo1012/SmartBot) | [bot.smart-link.ly](https://bot.smart-link.ly) |
| 🛍️ **Smart Order / سمارت أوردر** | Digital storefront, orders & delivery for businesses | [github.com/ahmadmedo1012/Smart-Order](https://github.com/ahmadmedo1012/Smart-Order) | [order.smart-link.ly](https://order.smart-link.ly) |

---

*Project codename in development: مدارك (Madarek).*
