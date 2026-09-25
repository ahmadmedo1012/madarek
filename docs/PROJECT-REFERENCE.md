# Madarek Platform — Project Reference

> منصة جامعة الزاوية للتعليم الذكي (ZU Smart Learning Platform)
> Ministry of Higher Education and Scientific Research, Libya

## Quick Facts

| Aspect | Value |
|--------|-------|
| **Production** | https://madarek.onrender.com |
| **Repo** | https://github.com/ahmadmedo1012/madarek |
| **Branch** | `main` |
| **Stack** | React 18 + Vite + Express + Prisma + PostgreSQL (Neon) |
| **Auth** | JWT (15min access + 7d refresh, http-only cookie) + Argon2id |
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
│   │   ├── stores/          # Zustand (auth, theme, ui, onboarding)
│   │   ├── lib/             # api, queryClient, nav, overlayStack, scrollLock, format,
│   │   │                    # gamification, courseMeta, chartTheme, toast, illustrations
│   │   └── styles/          # 15 CSS files (10 eager + 5 page-scoped)
├── backend/             # Express API (TypeScript ESM)
│   ├── src/
│   │   ├── http/routes/        # 25 route modules
│   │   ├── http/middleware/    # auth, requireRole, requireCapability, rateLimit, errorHandler
│   │   ├── lib/                # jwt, password, errors, governance, grading, permissions,
│   │   │                       # pagination, pdf, compression, operational-alerts, zu-sync/
│   │   ├── modules/            # auth service, search, theme, onboarding, milestones
│   │   └── ...                 # index.ts, app.ts, env.ts, db.ts, logger.ts, scheduler.ts
│   ├── prisma/
│   │   ├── schema.prisma       # 75 models, 30 enums
│   │   └── seed.ts
├── specs/                # Feature specifications (001, 002, 003, 004, 011, 012)
├── design-system/        # UI-UX design spec
├── scripts/              # Validation & maintenance scripts
├── docs/                 # Documentation (this file)
└── render.yaml           # Render Blueprint
```

## Tech Stack (Detailed)

### Frontend
- React 18.3.1, TypeScript 5.7.2, Vite 5.4.11
- React Router DOM 6.30.6, TanStack Query 5.62.7, Zustand 5.0.2
- Axios 1.20.0 (with single-flight 401 refresh interceptor)
- Chart.js 4.4.7 + react-chartjs-2 5.2.0
- react-hook-form 7.54.2 + Zod 3.23.8
- lucide-react 0.469 (icons — Lucide-only discipline)
- pdfjs-dist 4.10 (PDF viewer, lazy-loaded chunk)
- Testing: Vitest (855 unit/contract/gallery tests), Playwright + axe-core (audit harness)
- TypeScript strict posture: `strict` + `noUncheckedIndexedAccess` + `noFallthroughCasesInSwitch` + `noImplicitOverride` + `noUnusedLocals` + `noUnusedParameters` + `verbatimModuleSyntax` — all ON in both workspaces (src + tests; the 5 flag additions landed wave 17, CI-enforced)

The UI is Arabic-first RTL with no i18n runtime — there is **no** i18next/react-i18next dependency (the locale layer from spec 011 US7 was never implemented).

### Backend
- Express 4.22.3, TypeScript 5.7.2 (ESM)
- Prisma 5.22.0 + @prisma/client 5.22.0
- Zod 3.23.8 (validation)
- jsonwebtoken 9.0.2 (JWT, HS256 pinned)
- argon2 0.41.1 (password hashing)
- pino 9.5.0 (logging, secret redaction)
- helmet 8.0.0 (CSP enabled — D7 allow-list), cors 2.8.5, cookie-parser 1.4.7
- express-rate-limit 7.4.1
- pdf-parse 1.1 (text extraction)
- Testing: Vitest (970 DB-free tests; `NODE_ENV=test`, no DB calls)

### Database
- Neon (serverless PostgreSQL)
- Connection: Pooler URL with `sslmode=require`
- 75 models / 30 enums across ~27 domain groups

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Neon pooler connection |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥32 chars |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥32 chars |
| `NODE_ENV` | ❌ | `development` | `production` enables static serving + secure cookies |
| `PORT` | ❌ | `4000` | Listen port |
| `CORS_ORIGINS` | ❌ | madarek.onrender.com + localhost:5173 | Comma-separated allow-list; wildcards unsupported (credentials are on) |
| `INTERNAL_SERVICE_TOKEN` | ❌ | — | ≥16 chars; gates `POST /api/v1/me/milestones/:id/fire` (fail-closed when unset) |
| `DIRECT_DATABASE_URL` | ❌ | derived | Neon direct URL for `prisma migrate deploy`; derived from `DATABASE_URL` when unset |

## Authentication Flow

1. Login → returns `{ user, accessToken }` + http-only `mdrk_refresh` cookie
2. Access token: JWT HS256, 15min, `Authorization: Bearer`
3. Refresh token: JWT, 7d, http-only cookie `mdrk_refresh`, path `/api/v1/auth`
4. Refresh = **sliding session**: tokens re-issue at the same `tokenVersion`; a normal refresh never revokes other devices. `tokenVersion` is bumped only on explicit revocation events — logout, password change, role change, deactivation (atomic conditional writes)
5. 401 `TOKEN_EXPIRED` → frontend silently calls `/auth/refresh` (single-flight) → retries once; failure clears the auth store + query cache
6. Passwords: Argon2id (~19 MiB, timeCost 2) + common-password blocklist (8–72 chars)
7. Lockout: 5 failed logins → 15-min lock (racing failures counted exactly once)
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
| `npm run typecheck` | Aggregate typecheck: backend + frontend, src **and** tests (the same 4 commands CI runs) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed production data |
| `npm test` | Run all tests (frontend 855, then backend 970) |
| `npm run check:motion-tokens` / `check:icons` / `check:i18n` | Design gates (motion-token + Lucide-icon discipline; i18n is a documented loud-skip) |
| `npm run validate:colleges` | College identity profiles (WCAG contrast, assets, lucide validity) — **runs in CI** (typecheck job) and manually |

### Backend
| Script | Description |
|--------|-------------|
| `npm run dev` | `tsx watch src/index.ts` |
| `npm run build` | `tsc -p tsconfig.json` |
| `npm run typecheck` / `typecheck:tests` | `tsc --noEmit` / tests via `tsconfig.test.json` |
| `npm run prisma:generate` | `prisma generate` (also runs on every `postinstall`) |
| `npm run prisma:deploy` | Deploy migrations (migrate-deploy.mjs) |
| `npm run prisma:seed` | Seed (via tsx) |
| `npm run test:watch` | Vitest watch mode |

### Frontend
| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` |
| `npm run typecheck` / `typecheck:tests` | `tsc -b --noEmit` / tests via `tsconfig.test.json` |
| `npm test` | Vitest |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:audit` | Playwright audit tests (the audit project — the only Playwright project that exists) |
| `npm run test:audit:drift` | Surface drift detector |
| `npm run audit:baseline` | Promote a new surface baseline |
| `npm run build:report` | Bundle report build (POSIX-shell-only env syntax) |

## Seeding

Run once with production DATABASE_URL:
```bash
DATABASE_URL='...' JWT_ACCESS_SECRET='...' JWT_REFRESH_SECRET='...' npm run db:seed
```

Demo accounts (password `Madarek2026!` — re-seeding resets it):
- `student@zu.edu.ly` → STUDENT (أحمد الزروق)
- `teacher@zu.edu.ly` → TEACHER (د. سالم البوسيفي)
- `admin@zu.edu.ly` → ADMIN (إدارة الجامعة)
- `quality@zu.edu.ly` → QUALITY (مكتب ضمان الجودة)
- `owner@zu.edu.ly` → OWNER (مالك المنصة)

## Deployment (Render)

1. Push to GitHub. Render reads `render.yaml`.
2. Set `DATABASE_URL` in Render env.
3. Build: `npm ci --include=dev && npm run build` (lockfile-exact — the deployed artifact matches what CI tested)
4. Start: `npm run start`
5. Health check: `/api/v1/health`

`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are auto-generated by Render (32-char — exactly `env.ts`'s `min(32)`). `TZ` is pinned to `UTC` (the backend's timezone model computes date-only day-keys on the UTC calendar and renders display labels in Africa/Tripoli — see `backend/src/lib/dates.ts`). The optional vars `CORS_ORIGINS`, `INTERNAL_SERVICE_TOKEN`, `DIRECT_DATABASE_URL` are declared in `render.yaml` with `sync: false` (defaults/fail-closed behavior in `backend/src/env.ts`).

## Scheduler

In-process `setInterval`-based ticker:
- Runs `runSync()` 5s after boot, then every 24h (overlap-guarded)
- Runs the LoginEvent retention sweep on the same cadence — prunes login telemetry older than 180 days in bounded 5,000-row batches (the analytics window is 30 days)
- Records results in `SyncRun`; never throws (errors captured/logged)

## Copy Style (UI Arabic — binding rulings)

Campaign 3 fixed the Arabic copy register (wave 17). When writing UI copy:

- **Glossary:** مقرّر (courses — never مادة-as-course; the teacher files page is «الملفات التعليمية») · كلّيّة · اختبار (never امتحان) · طلاب (no shadda) · جارٍ · طالب · مسابقة · الفصل الدراسي. Shadda register is per-word: مقرّر/كلّيّة carry the shadda, طلاب does not.
- **Numerals:** Latin digits everywhere (never ٠-٩); `%` never ٪; numbers format via `formatNum` / `toLocaleString('ar-LY')` — Latin digits, dot grouping, comma decimal («1.234.567,5»).
- **Counted nouns:** always `countAr` / `arUnit` from `lib/format.ts` — never hand-written «3 دقائق»-style plurals.
- **Errors:** API messages render through `apiErrorMessage`/`apiErrorDetail` (Arabic-first guard — Latin leaks fall back to a generic Arabic refusal).

## Campaign 3 (التعميق الكلي)

The current maintenance phase ran as four waves of parallel, file-disjoint batches: **wave 15** — 11 read-only dimension audits (visual, correctness, data-layer, copy, a11y, config/DX, …) producing the `audits/15-*.md` findings; **wave 16** — correctness & safety sweep (transactional claim-guards, race fixes, pure-logic extractions + test pins, dead-code deletions, a11y platform work); **wave 17** — consistency sweep (Arabic error messages, zod trim platform, glossary/numeral rulings, DELETE 200 convention, 5 strict tsconfig flags, CI/DX truth); **wave 18** — feature completion + this docs-truth pass. Every number in this file is re-measured, not carried forward.

## Middleware Chain

1. `app.disable('x-powered-by')`
2. `app.set('trust proxy', 1)`
3. Helmet — **CSP enabled** (D7 allow-list + sha256 pin for the inline theme bootstrap), cross-origin resource policy
4. CORS — allow-list `https://madarek.onrender.com` + `http://localhost:5173` by default, overridable via `CORS_ORIGINS`; `credentials: true`
5. gzip compression middleware (≥1KB, text/JSON/JS/SVG, `Vary: Accept-Encoding`)
6. `express.json({ limit: '1mb' })` + urlencoded (rejects mapped to 400/413/415)
7. `cookieParser()`
8. Global rate limit: **1000 req / 15 min / IP** on `/api/v1` (raised from 300 — shared campus NAT)
9. Auth rate limit: 10 req / 15 min / IP, failed attempts only (login, register, refresh, change-password)
10. Route guards: auth, optionalAuth, requireRole, requireCapability, validate
11. Error handler (last) — AppError/ZodError/Prisma + body-parser rejects → clean JSON envelope; JSON 404 for unknown `/api/*` paths; OperationalAlert only on true 5xx
