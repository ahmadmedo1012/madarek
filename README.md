# مدارك AI — Madarek AI

A production-grade Arabic-RTL educational platform for the **University of Zawia**, transformed from a single-file HTML prototype (`madarak-v5 (3).html`) into a full-stack monorepo deployed as a **single Render web service**.

- **Production**: <https://madarek.onrender.com>
- **Backend**: Node.js 20 + Express + TypeScript + Prisma + PostgreSQL (Neon)
- **Frontend**: Vite + React 18 + TypeScript + TanStack Query + Zustand
- **Auth**: JWT access tokens + rotating refresh cookie, Argon2id passwords
- **Deploy**: One Render Web Service that serves **both** the API and the React build

The original visual identity (dark theme, IBM Plex Sans Arabic + Space Mono, RTL, exact color tokens) is preserved verbatim.

> **Demo accounts** (after seeding): all use password `1234`
> - `student@zu.edu.ly` → STUDENT
> - `teacher@zu.edu.ly` → TEACHER
> - `admin@zu.edu.ly` → ADMIN

---

## Architecture at a glance

```
┌────────────────────────── one Render Web Service ──────────────────────────┐
│                                                                            │
│   GET /api/v1/*       ───►  Express routes (auth, courses, materials, …)   │
│   GET /assets/*       ───►  hashed static files (immutable, 1y cache)      │
│   GET /favicon.svg    ───►  static                                         │
│   GET /anything-else  ───►  index.html  (React Router takes over)          │
│                              │                                             │
│                              └──► fetches /api/v1/* same-origin            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                       ┌────────────────────────────┐
                       │  Neon PostgreSQL (pooler)  │
                       └────────────────────────────┘
```

`backend/src/app.ts` mounts the API under `/api/v1`, then `express.static(frontend/dist)` for hashed assets, then a `*` SPA fallback that returns `index.html` for any non-API path. The frontend is built ahead of time during `npm run build` and the resulting `frontend/dist` directory ships inside the same service.

---

## Repository layout

```
madarek/
├── backend/                Node + Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/     committed; applied via `prisma migrate deploy`
│   │   └── seed.ts         demo data
│   └── src/
│       ├── env.ts          Zod-validated env (DATABASE_URL, JWT, …)
│       ├── app.ts          Express factory + static + SPA fallback
│       ├── http/           middleware + REST routes
│       └── modules/        business logic
├── frontend/               Vite + React + TS app
│   └── src/                styles, hooks, components, pages
├── render.yaml             one-service blueprint
├── package.json            root scripts (build, start)
├── .env.example
└── README.md
```

---

## Local development

### 1. Prerequisites

- Node.js **20.x or 22.x** (see `.nvmrc`)
- npm **10+**
- A PostgreSQL database (Neon free tier works perfectly)

### 2. Install

```bash
git clone https://github.com/ahmadmedo1012/madarek.git
cd madarek
nvm use            # picks up .nvmrc → Node 20+
npm install        # installs both workspaces; postinstall runs `prisma generate`
```

### 3. Configure environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and paste your Neon connection string into `DATABASE_URL`. Generate two distinct JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

A complete dev `.env` looks like:

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
JWT_ACCESS_SECRET="<64-byte-hex-1>"
JWT_REFRESH_SECRET="<64-byte-hex-2>"
CORS_ORIGINS=http://localhost:5173
COOKIE_SECURE=false
```

### 4. Apply migrations and seed

```bash
npm run db:migrate     # creates tables on Neon (interactive name; use "init")
npm run db:seed        # populates faculties, demo users, courses, library, …
```

### 5. Run dev servers

```bash
npm run dev            # backend :4000 + frontend :5173 in parallel
```

Vite proxies `/api` to the backend, so the frontend at <http://localhost:5173> works without CORS configuration.

---

## Available scripts (run from the repo root)

| Script | What it does |
|---|---|
| `npm run dev` | Backend + frontend in parallel |
| `npm run dev:backend` | API only |
| `npm run dev:frontend` | Web only |
| `npm run build` | **Production**: frontend → `frontend/dist`, backend → `backend/dist`, then `prisma migrate deploy` |
| `npm run build:frontend` | Vite build only |
| `npm run build:backend` | tsc only |
| `npm run start` | Boots `node backend/dist/index.js` (serves API + statics) |
| `npm run typecheck` | TS check across both workspaces |
| `npm run lint` | ESLint across both workspaces |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` (CI-safe) |
| `npm run db:seed` | Loads demo data |
| `npm run db:studio` | Opens Prisma Studio |
| `npm run format` | Prettier on the whole tree |

---

## Production deployment to Render (single service)

The whole app deploys to **one** Render Web Service. The provided `render.yaml` blueprint sets it up automatically.

### Render service settings

| Setting | Value |
|---|---|
| **Type** | Web Service |
| **Runtime** | Node |
| **Root Directory** | *(empty — repo root)* |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Health Check Path** | `/api/v1/health` |

The build command installs all workspace dependencies, builds the React frontend into `frontend/dist`, compiles the backend to `backend/dist`, then runs `prisma migrate deploy` against your Neon database. The start command runs the compiled Express server, which serves both the API and the static frontend bundle.

### Environment variables (set in the Render dashboard)

| Key | Value | Source |
|---|---|---|
| `NODE_ENV` | `production` | render.yaml |
| `DATABASE_URL` | Neon pooler URL with `?sslmode=require&channel_binding=require` | manual |
| `JWT_ACCESS_SECRET` | auto-generated 64-byte hex | render.yaml `generateValue: true` |
| `JWT_REFRESH_SECRET` | auto-generated 64-byte hex | render.yaml `generateValue: true` |
| `CORS_ORIGINS` | `https://madarek.onrender.com,http://localhost:5173` | render.yaml |
| `COOKIE_SECURE` | `true` | render.yaml |
| `SERVE_STATIC` | `true` | render.yaml |

### One-click deploy via Blueprint

```bash
git remote add origin git@github.com:<you>/madarek.git
git push -u origin main
```

1. Sign in to <https://render.com>.
2. **New + → Blueprint → Connect a repository → pick `madarek`**.
3. Render reads `render.yaml`, creates the **`madarek`** web service, and asks you to fill in `DATABASE_URL`. Paste your Neon connection string.
4. First deploy runs `npm install && npm run build` (which applies migrations to Neon) and then `npm run start`. The health check at `/api/v1/health` must return 200; Render won't promote a deploy that fails it.

### Seeding production (once)

`npm run db:seed` is **not** wired into the build because seeds are idempotent for reference data but overwriting them on every deploy is undesirable. Run it manually once:

```bash
DATABASE_URL="<your-neon-url>" \
JWT_ACCESS_SECRET="x" JWT_REFRESH_SECRET="x" \
npm run db:seed
```

---

## Architecture details

### Backend

- **Express 4** + TypeScript, ESM (`"type": "module"`)
- Layered: `routes → modules/service → prisma`
- **Helmet** security headers, **CORS** allow-list, **compression**, **morgan→pino** logs
- **Zod** validation at every request boundary
- **express-rate-limit** global + tighter `/auth/*`
- **Argon2id** password hashing
- **JWT** access (15 min) + refresh (7 d, http-only `Secure` `SameSite=Strict` cookie). Refresh rotation via `tokenVersion` so logout invalidates all sessions
- Centralized `errorHandler` maps `AppError`/`ZodError`/`PrismaError` → JSON
- Graceful shutdown on `SIGTERM`/`SIGINT`
- Serves the frontend's hashed assets with `Cache-Control: public,max-age=31536000,immutable` and serves `index.html` with `Cache-Control: no-cache`

### Frontend

- **Vite 5** + React 18 + TypeScript + React Router 6
- **TanStack Query 5** for server state, **Zustand** (with persist) for auth
- **react-hook-form + Zod** at every form boundary
- **Chart.js + react-chartjs-2** for dashboard charts
- **Axios** with a 401-refresh interceptor that re-issues the access token *once* per request
- All CSS preserved **verbatim** from the prototype (`tokens.css`, `base.css`, `components.css`, `auth.css`)
- Role-gated routes via `<ProtectedRoute allow={['STUDENT']}/>`
- API base URL is `/api/v1` (relative, same-origin) — no env var needed in production

### Database (~30 models)

`User` + `StudentProfile`/`TeacherProfile`, `Faculty`, `Department`, `Course`, `CourseOffering`, `Enrollment`, `ScheduleSlot`, `Material`, `Assignment`, `Submission`, `Grade`, `AttendanceSession` + `AttendanceRecord`, `Notification`, `Message`, `Post` + `PostComment` + `PostReaction`, `StudyRoom` + `StudyRoomMember`, `Book` + `Loan`, `Achievement` + `UserAchievement`, `Skill` + `UserSkill`, `Certificate`, `MoocCourse` + `MoocEnrollment`, `Job` + `JobApplication`, `VirtualLab` + `LabSession`, `ArExperience`, `AiConversation` + `AiMessage`, `AuditLog`.

See `backend/prisma/schema.prisma` for the full schema.

### API surface (versioned at `/api/v1`)

| Path | Methods | Notes |
|---|---|---|
| `/health` | GET | DB latency probe |
| `/auth/{register,login,refresh,logout,me}` | POST/GET | refresh in HTTP-only cookie |
| `/users`, `/users/:id` | GET/PATCH | admin list, self/admin read & update |
| `/courses`, `/courses/:id` | GET/POST/PATCH/DELETE | admin write, all read |
| `/enrollments/me`, `/enrollments` | GET/POST/DELETE | "my courses", admin enroll |
| `/offerings/:id/{materials,assignments,grades,attendance}` | nested CRUD | role-aware |
| `/notifications`, `/messages` | GET/POST/PATCH | per-user |
| `/library/books`, `/library/loans` | GET/POST | borrow/return |
| `/mooc`, `/mooc/:id/enroll` | GET/POST | external courses |
| `/jobs`, `/jobs/:id/apply` | GET/POST | job board |
| `/posts`, `/posts/:id/react` | GET/POST | community feed |
| `/me/{achievements,skills,certificates}`, `/leaderboard` | GET | gamification |
| `/labs`, `/ar-experiences`, `/faculties` | GET | catalog |
| `/admin/stats` | GET | admin only |
| `/ai/chat`, `/ai/conversations`, `…/messages` | POST/GET | AI assistant (rate-limited) |

---

## Security checklist

- ✅ Argon2id password hashing
- ✅ JWT secrets ≥ 64 random bytes, generated by Render and stored only in env
- ✅ Refresh token rotation on every refresh + revocation by bumping `tokenVersion`
- ✅ HTTP-only `Secure` `SameSite=Strict` refresh cookie scoped to `/api/v1/auth`
- ✅ Account lockout after 5 failed logins / 15 min
- ✅ Helmet headers + CORS allow-list
- ✅ Rate limiting (global 300/15 min, auth 10/15 min, AI 20/min/user)
- ✅ Zod validation on every request
- ✅ React escapes by default — no `dangerouslySetInnerHTML`
- ✅ Prisma parameterized queries (no string SQL)
- ✅ No secrets in repo — `.env.example` only; real values from Render dashboard

---

## Troubleshooting

**Build fails with `cannot find module '@prisma/client'`**
Make sure `npm install` ran the `postinstall` hook in the `backend` workspace, which generates the Prisma client. If something's off, run `npm run db:generate` manually.

**`P1001` connection error**
Neon project is paused. Open the Neon dashboard once to wake it up, or upgrade the plan.

**`401 Unauthorized` after refreshing the page**
Open DevTools → Network. If `/api/v1/auth/refresh` returns 401, the refresh cookie was either evicted or has the wrong `Domain`/`SameSite`. In dev set `COOKIE_SECURE=false`. In prod the cookie is `Secure SameSite=Strict` scoped to `/api/v1/auth` — same-origin requests work without further setup.

**Assets 404 on Render**
Confirm the build command ran `npm run build` (not just `npm install`). The frontend bundle must exist at `frontend/dist/` before the start command boots; the server logs a warning if the directory is missing.

**Slow first request after idle period**
Render's free plan spins down after 15 min of inactivity. The first request triggers a cold start (~30 s). Upgrade to a paid plan to keep it warm.

---

## License

Internal — University of Zawia.
