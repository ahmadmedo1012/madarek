# Madarek Platform — Project Reference

> منصة جامعة الزاوية للتعليم الذكي (ZU Smart Learning Platform)
> Ministry of Higher Education and Scientific Research, Libya

## Quick Facts

| Aspect | Value |
|--------|-------|
| **Production** | https://madarek.onrender.com |
| **Repo** | https://github.com/ahmadmedo1012/madarek |
| **Branch** | `012-design-graphics-uplift` (active feature) |
| **Stack** | React 18 + Vite + Express + Prisma + PostgreSQL (Neon) |
| **Auth** | JWT (15min access + 7d refresh w/ rotation) + Argon2id |
| **Roles** | STUDENT, TEACHER, ADMIN, QUALITY, OWNER |
| **Deploy** | Render Blueprint (render.yaml), free tier, single-service |
| **License** | Internal — University of Zawia |

## Architecture

```
Browser ──► Express server (Node ≥20, ESM)
               /api/v1/*   → routes → Prisma → Neon PostgreSQL
               /*          → serves frontend/dist (SPA)
```

Single-service deployment. No separate API host. In dev, Vite on `:5173` proxies `/api` → Express on `:4000`.

## Repository Layout

```
madarek/
├── frontend/            # React SPA (Vite + React Router + TanStack Query + Zustand)
│   ├── src/
│   │   ├── pages/           # Route pages by role
│   │   ├── components/      # Layout, primitives, overlays, PDF, motion, owner
│   │   ├── hooks/           # Data + utility hooks
│   │   ├── stores/          # Zustand (auth, theme, ui)
│   │   ├── lib/             # API client, nav, chartTheme, illustrations
│   │   └── styles/          # 12 CSS files (tokens → components → pages)
├── backend/             # Express API (TypeScript ESM)
│   ├── src/
│   │   ├── http/routes/        # 23 route modules
│   │   ├── http/middleware/    # auth, requireRole, requireCapability, rateLimit, errorHandler
│   │   ├── lib/                # jwt, password, errors, permissions, pagination, pdf
│   │   ├── modules/            # auth service, theme, onboarding, milestones
│   │   └── ...                 # index.ts, app.ts, env.ts, db.ts, logger.ts, scheduler.ts
│   ├── prisma/
│   │   ├── schema.prisma       # 60+ models, full data model
│   │   └── seed.ts
├── specs/                # Feature specifications (001-012)
├── design-system/        # UI-UX design spec
├── scripts/              # Validation & maintenance scripts
├── docs/                 # Documentation (this file)
└── render.yaml           # Render Blueprint
```

## Tech Stack (Detailed)

### Frontend
- React 18.3.1, TypeScript 5.7, Vite 5.4
- React Router DOM 6.28, TanStack Query 5.62, Zustand 5.0
- Axios 1.7 (with 401 refresh interceptor)
- Chart.js 4.4 + react-chartjs-2 5.2
- react-hook-form 7.54 + Zod 3.23
- lucide-react 0.469 (icons)
- pdfjs-dist 4.10 (PDF viewer, lazy-loaded)
- i18next 23 + react-i18next 14 (i18n)
- Testing: Vitest, Playwright, axe-core

### Backend
- Express 4.21, TypeScript 5.7 (ESM)
- Prisma 5.22 + @prisma/client 5.22
- Zod 3.23 (validation)
- jsonwebtoken 9.0 (JWT)
- argon2 0.41 (password hashing)
- pino 9.5 (logging)
- helmet 8.0, cors 2.8, cookie-parser 1.7
- express-rate-limit 7.4
- pdf-parse 1.1 (text extraction)
- Testing: Vitest

### Database
- Neon (serverless PostgreSQL)
- Connection: Pooler URL with `sslmode=require`
- 60+ models across ~27 domain groups

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Neon pooler connection |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥32 chars |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥32 chars |
| `NODE_ENV` | ❌ | `development` | `production` enables static serving |
| `PORT` | ❌ | `4000` | Listen port |
| `INTERNAL_SERVICE_TOKEN` | ❌ | — | ≥16 chars (012 feature) |

## Authentication Flow

1. Login → returns `{ user, accessToken }` + http-only `mdrk_refresh` cookie
2. Access token: JWT HS256, 15min, `Authorization: Bearer`
3. Refresh token: JWT, 7d, http-only cookie `mdrk_refresh`, path `/api/v1/auth`
4. Refresh rotation: `tokenVersion` incremented per refresh; logout revokes all
5. 401 `TOKEN_EXPIRED` → frontend silently calls `/auth/refresh` → retries once
6. Passwords: Argon2id (~19 MiB, timeCost 2)
7. Lockout: 5 failed → 15min lock
8. Login by: email OR university registration number

## Authorization (Capabilities)

Two-layer model:
1. `RolePermission` — defaults per role
2. `UserPermission` — per-user overrides (grant/revoke)

Effective = (role defaults) ∪ (grants) ∖ (revokes)

### Default Capabilities Per Role

| Capability | STUDENT | TEACHER | ADMIN | QUALITY | OWNER |
|-----------|:------:|:------:|:----:|:------:|:----:|
| RESEARCH_GRADE_OWN | — | ✅ | — | — | ✅ |
| RESEARCH_GRADE_ANY | — | — | — | — | ✅ |
| RESEARCH_PUBLISH | — | ✅ | ✅ | — | ✅ |
| EXAMS_AUTHOR | — | ✅ | — | — | ✅ |
| EXAMS_MODERATE | — | — | — | ✅ | ✅ |
| EXAMS_TAKE | ✅ | — | — | — | ✅ |
| CURRICULUM_EDIT_OWN | — | ✅ | — | — | ✅ |
| CURRICULUM_EDIT_ANY | — | — | ✅ | — | ✅ |
| USERS_MANAGE | — | — | ✅ | — | ✅ |
| ROLES_ASSIGN | — | — | ✅ | — | ✅ |
| TEACHERS_VERIFY | — | — | ✅ | — | ✅ |
| QUALITY_VIEW | — | — | — | ✅ | ✅ |
| QUALITY_REPORT | — | — | — | ✅ | ✅ |
| ANNOUNCE_PLATFORM | — | — | ✅ | — | ✅ |
| ANNOUNCE_FACULTY | — | ✅ | ✅ | ✅ | ✅ |
| COMPETITIONS_RUN | — | ✅ | ✅ | — | ✅ |
| EVENTS_RUN | — | ✅ | ✅ | — | ✅ |

## Key Scripts

### Root
| Script | Description |
|--------|-------------|
| `npm run build` | Build frontend + backend + deploy migrations |
| `npm start` | Start production (`node backend/dist/index.js`) |
| `npm run dev` | Backend dev (`tsx watch`) |
| `npm run dev:web` | Frontend dev (Vite) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed production data |
| `npm test` | Run all tests |

### Backend
| Script | Description |
|--------|-------------|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | `tsc -p tsconfig.json` |
| `npm run prisma:deploy` | Deploy migrations |
| `npm run prisma:seed` | Seed (via tsx) |

### Frontend
| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm test` | Vitest |
| `npm run test:audit` | Playwright audit tests |
| `npm run test:audit:drift` | Surface drift detector |

## Seeding

Run once with production DATABASE_URL:
```bash
DATABASE_URL='...' JWT_ACCESS_SECRET='...' JWT_REFRESH_SECRET='...' npm run db:seed
```

Demo accounts (password `1234`):
- `student@zu.edu.ly` → STUDENT (أحمد الزروق)
- `teacher@zu.edu.ly` → TEACHER (د. سالم البوسيفي)
- `admin@zu.edu.ly` → ADMIN (إدارة الجامعة)
- `quality@zu.edu.ly` → QUALITY (مكتب ضمان الجودة)

## Deployment (Render)

1. Push to GitHub. Render reads `render.yaml`.
2. Set `DATABASE_URL` in Render env.
3. Build: `npm install --include=dev && npm run build`
4. Start: `npm run start`
5. Health check: `/api/v1/health`

`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are auto-generated by Render.

## Scheduler

In-process `setInterval`-based ticker:
- Runs `runSync()` 5s after boot
- Runs every 24h after that
- Records results in `SyncRun` table
- Never throws (errors captured in DB)

## Middleware Chain

1. `app.disable('x-powered-by')`
2. `app.set('trust proxy', 1)`
3. Helmet (CSP disabled, cross-origin resource policy)
4. CORS (allowlist: render.com + localhost:5173)
5. `express.json({ limit: '1mb' })` + urlencoded
6. `cookieParser()`
7. Global rate limit: 300 req/15min/IP
8. Auth rate limit: 10 req/15min/IP (login/register)
9. Route guards: auth, requireRole, requireCapability, validate
10. Error handler (last)
