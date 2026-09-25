# Backend — API, middleware, auth & operations

Express 4.22.3 (TypeScript, ESM) + Prisma 5.22 over Neon PostgreSQL.
All endpoints are mounted under the base path **`/api/v1`** and return a
`{ data: T }` envelope (errors return `{ error: { code, message } }`).
The complete, code-accurate endpoint table (188 endpoints) lives in
[`docs/API-REFERENCE.md`](docs/API-REFERENCE.md) — the tables below are a
condensed overview.

---

## 1. Source layout (`backend/src/`)

| Path | Responsibility |
|------|----------------|
| `index.ts` | Entry point — boots server, connects DB, starts scheduler |
| `app.ts` | Express app factory — middleware + route mounting + SPA fallback |
| `env.ts` | Zod‑validated environment config |
| `db.ts` | Prisma singleton + `withRetry()` for Neon transient errors |
| `logger.ts` | Pino logger |
| `scheduler.ts` | In‑process daily university‑sync ticker |
| `http/validate.ts` | Generic Zod validation middleware factory |
| `http/middleware/*` | `auth`, `requireRole`, `requireCapability`, `rateLimit`, `errorHandler` |
| `http/routes/*` | 25 route modules (incl. `submissions.routes.ts` + `curriculum.routes.ts`) |
| `lib/*` | `jwt`, `password`, `errors`, `pagination`, `pdf`, `permissions`, `governance`, `grading`, `risk`, `dates`, `compression`, `operational-alerts`, `zu-sync/` |
| `modules/auth/*` | `auth.service.ts`, `auth.dto.ts`, `password-policy`, `lockout`, `rotation` |
| `modules/search/*` | Arabic-aware search normalization (`normalize.ts`) backing `/search/global` |
| `modules/theme/*` | `router.ts` — `GET/PUT /me/theme` (handler inline; the separate service module was folded in wave 16) |
| `modules/onboarding/*` | `router.ts` + `service.ts` — `POST /me/onboarding/complete` (idempotent, race-safe) |
| `modules/milestones/*` | `router.ts` + `service.ts` — `POST /me/milestones/:id/fire` (service-token auth only) |

---

## 2. Middleware chain (order in `app.ts`)

1. `app.disable('x-powered-by')`
2. `app.set('trust proxy', 1)` (Render)
3. **Helmet** — CSP **enabled** (D7 allow-list: `default-src 'self'`, plus a sha256 pin for the inline theme-bootstrap script), `crossOriginResourcePolicy: cross-origin`
4. **CORS** — allow-list from `CORS_ORIGINS` env (default: `https://madarek.onrender.com`, `http://localhost:5173`), `credentials: true`
5. **gzip compression** middleware (≥1 KB, text/JSON/JS/SVG; `Vary: Accept-Encoding` on all responses)
6. `express.json({ limit: '1mb' })` + `express.urlencoded({ limit: '1mb' })`
7. `cookieParser()`
8. **Global rate limit** on `/api/v1` — **1000 req / 15 min / IP** (raised from 300 — campus users behind shared NAT)
9. **Auth rate limit** on `/auth/login` + `/auth/register` + `/auth/refresh` + `/auth/change-password` — 10 req / 15 min / IP (skips successes)
10. Route‑level guards: `authMiddleware`, `optionalAuthMiddleware`,
   `requireRole(...)`, `requireCapability(...)`, `validate(schema, source)`
11. **Error handler** (registered last) — maps `AppError`, `ZodError` (→400),
    body‑parser rejects (→400/413/415 with our own message, never the raw parser
    error), Prisma `P2002` (→409), `P2025` (→404), `P2003` (→400); unknown → 500
    (no leak, raises an OperationalAlert). Unknown `/api/*` paths get a JSON 404
    envelope — never Express HTML

---

## 3. Authentication

| Aspect | Detail |
|--------|--------|
| Access token | JWT HS256, TTL 15m, payload `{ sub, role, type:'access' }`, `Authorization: Bearer` |
| Refresh token | JWT, TTL 7d, payload `{ sub, ver, type:'refresh' }`, http‑only cookie `mdrk_refresh`, `sameSite:strict`, path `/api/v1/auth` |
| Rotation | **Sliding session** — a normal refresh re‑issues tokens at the SAME `tokenVersion` (multi‑device survives). `tokenVersion` is bumped only on explicit revocation events (logout, password change, role change, deactivation), each an atomic conditional write |
| Passwords | Argon2id — memoryCost ≈19 MiB, timeCost 2, parallelism 1 + common‑password blocklist (8–72 chars) |
| Lockout | 5 failed logins → 15‑min lock (atomic increment + read‑back); reset on success |
| Login id | Email (`@`) **or** university registration number |
| Secrets | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥32 chars, Zod‑validated) |

---

## 4. Permissions model

- **Roles:** `STUDENT`, `TEACHER`, `ADMIN`, `QUALITY`, `OWNER`.
- **Capabilities:** fine‑grained enum (e.g. `RESEARCH_GRADE_OWN/ANY`,
  `EXAMS_AUTHOR/MODERATE`, `CURRICULUM_EDIT_OWN/ANY`, `USERS_MANAGE`,
  `ROLES_ASSIGN`, `TEACHERS_VERIFY`, `QUALITY_VIEW`, `ANNOUNCE_*`,
  `COMPETITIONS_RUN`, `EVENTS_RUN`).
- **Resolution:** `getEffectiveCapabilities()` = role defaults + per‑user grants
  − revokes (stored in `UserPermission`). `OWNER` holds all capabilities.
- Guards: `requireRole(...)` (role membership) and `requireCapability(...)`
  (any‑of capability check).

---

## 5. API reference

> Auth column: **Bearer** = any logged‑in user; a role/capability name = guarded.

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | DB connectivity + latency + env |

### Auth — `/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | rate‑limited | Create account |
| POST | `/auth/login` | rate‑limited | Login (email or university id) |
| POST | `/auth/change-password` | Bearer + rate‑limited | Change own password (verifies current; other devices revoked) |
| POST | `/auth/refresh` | cookie | Sliding refresh (no tokenVersion bump) |
| POST | `/auth/logout` | Bearer **or** cookie | Revoke refresh tokens |
| GET | `/auth/me` | Bearer | Current user profile |

### Users — `/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | ADMIN/OWNER | List users (paginated `{data,meta}`, role filter, q) |
| GET | `/users/:id` | self/ADMIN | User detail (allow‑list select — no security metadata leak) |
| PATCH | `/users/:id` | self/ADMIN | Update profile fields / isActive (last‑owner guard, audited) |

### Governance — `/admin/users/*`, `/admin/teachers/*`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/users` | USERS_MANAGE | Paginated governance user list |
| GET/POST | `/admin/users/:id/permissions` | ROLES_ASSIGN | Inspect / grant‑revoke capability overrides |
| POST | `/admin/users/:id/role` | ROLES_ASSIGN | Change role (self 403, promote‑to‑OWNER 403, last‑owner 409, TEACHER provisioning) |
| POST | `/admin/users/:id/scope` | ROLES_ASSIGN | Set faculty governance scope (self 403, scoped‑actor 403) |
| GET | `/admin/teachers/:id/suggestions` | TEACHERS_VERIFY | Review suggestions |
| POST | `/admin/teachers/:id/verify` | TEACHERS_VERIFY | Verify teacher |
| POST | `/admin/teachers/:id/position` | ROLES_ASSIGN | Assign leadership position |

### Courses — `/courses`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | Bearer | List (paginated, filter by department) |
| GET | `/courses/:id` | Bearer | Detail with offerings |
| POST | `/courses` | ADMIN/OWNER | Create |
| PATCH | `/courses/:id` | ADMIN/OWNER | Update |
| DELETE | `/courses/:id` | ADMIN/OWNER | Delete — 200 `{ok:true}`; 409 while offerings/concepts exist |

### Enrollments — `/enrollments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/enrollments/me` | STUDENT | My enrollments |
| POST | `/enrollments` | ADMIN/OWNER | Enroll student (audited; clean 404/400/409) |
| DELETE | `/enrollments/:id` | ADMIN/OWNER | Remove enrollment (audited) |

### Offerings — `/offerings`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id` | access‑checked | Offering detail |
| GET/POST | `/offerings/:id/materials` | access / TEACHER+ADMIN+OWNER | List / upload materials |
| GET/POST | `/offerings/:id/assignments` | access / TEACHER+ADMIN+OWNER | List / create assignments |
| GET/POST | `/offerings/:id/grades` | access / TEACHER+ADMIN+OWNER | List / upsert grades (score ≤ maxScore enforced) |
| GET/POST | `/offerings/:id/attendance` | access / TEACHER+ADMIN+OWNER | Sessions / record |
| POST | `/offerings/:offeringId/assignments/:assignmentId/submit` | STUDENT | Submit assignment (`{textAnswer?, fileUrl?}`) |
| POST | `/submissions/:id/grade` | TEACHER+ADMIN+OWNER | Grade submission (`{grade, feedback?}`) |

### Me — notifications & messages (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | Paginated + unread count |
| PATCH | `/notifications/:id/read` | Bearer | Mark one read |
| POST | `/notifications/read-all` | Bearer | Mark all read |
| GET | `/messages` | Bearer | DM list + `meta.unread` |
| POST | `/messages` | Bearer (30/min) | Send DM (recipient + notification atomic) |
| PATCH | `/messages/:id/read` | Bearer | Mark one incoming DM read |
| POST | `/messages/read-all` | Bearer | Bulk mark read (optional `{fromUserId}`) |

### Learning (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id/full` | Bearer | Full offering (lectures, schedule…) |
| GET | `/offerings/:id/lectures` | Bearer | Lectures |
| GET | `/lectures/:id` | Bearer | Lecture detail |
| POST | `/lectures/:id/watch` | Bearer | Watch progress (auto‑attendance) |
| POST | `/lectures/:lid/checkpoints/:cid/answer` | Bearer | Answer checkpoint |
| GET | `/me/profile` `/me/resume` `/me/matrix` `/me/gaps` | Bearer | Learning profile / resume / mastery matrix / gaps |
| GET/POST | `/me/research` | Bearer | My papers / create |
| POST | `/research/:id/scan` | Bearer (10/min) | Plagiarism + AI scan |
| POST | `/research/:id/grade` | RESEARCH_GRADE_* | Grade |
| GET | `/research/queue` | TEACHER/ADMIN/OWNER | Review queue (PII-stripped) |
| POST | `/research/:id/publish` | TEACHER/ADMIN/OWNER | Publish to library |
| GET | `/research/published` `/research/search` | Bearer | Library / full‑text search |
| GET/POST | `/research/:id/annotations` | Bearer / TEACHER+ADMIN+OWNER | Annotations |
| DELETE | `/research/annotations/:id` | Bearer (author) / ADMIN+OWNER | Delete annotation |
| GET | `/quality/alerts` `/overview` `/courses` `/professors` `/engagement` `/curriculum` | QUALITY_VIEW | Quality analytics |

### Training (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/training/catalog` | Bearer | Published tracks |
| GET | `/training/tracks/:slug` | Bearer | Track + lessons |
| POST | `/training/tracks/:slug/enroll` | Bearer | Enroll |
| POST | `/training/lessons/:lessonId/complete` | Bearer | Complete + award points |
| GET | `/training/me` `/me/badges` `/me/certificates` `/leaderboard` | Bearer | Progress / badges / certs / top 20 |

### Teacher (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teacher/me/offerings` | TEACHER/OWNER | My offerings |
| GET | `/teacher/offerings/:id/students` `/analytics` | TEACHER/ADMIN/OWNER | Students / analytics |
| GET | `/teacher/risks` | TEACHER/ADMIN/OWNER | At‑risk students |
| POST | `/teacher/offerings/:id/attendance` | TEACHER/ADMIN/OWNER | Record attendance |
| POST | `/teacher/offerings/:id/curriculum/suggest` | CURRICULUM_EDIT_* | Suggest changes |
| GET | `/teacher/dashboard` `/teacher/me/materials` `/teacher/me/assignments` | TEACHER/ADMIN/OWNER | Teacher dashboard aggregate |

### Teacher profile & live (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PATCH | `/me/teacher-profile` | TEACHER/OWNER | Get / update profile |
| GET/POST | `/live/sessions` | Bearer / TEACHER+ADMIN+OWNER | List / create live session |
| POST | `/live/sessions/:id/lifecycle` | TEACHER+ADMIN+OWNER | Start / end / cancel (invalid transitions 409) |

### Exams (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/question-bank` `/question-bank/categories` | Bearer | Questions / categories |
| POST | `/question-bank` | EXAMS_AUTHOR | Create question |
| POST | `/question-bank/:id/moderate` | EXAMS_MODERATE | Approve/reject |
| POST/GET | `/exams/templates` | EXAMS_AUTHOR / Bearer | Create / list |
| GET | `/exams/templates/:id` | Bearer | Detail |
| POST | `/exams/templates/:id/moderate` `/publish` | EXAMS_MODERATE / EXAMS_AUTHOR | Moderate / publish |
| GET | `/exams/me` | STUDENT | My attempts |
| POST | `/exams/templates/:id/start` | STUDENT | Start attempt — **resumes** a live IN_PROGRESS attempt (`resumed:true` + saved answers) |
| POST | `/exams/attempts/:id/answer` `/submit` | STUDENT | Answer / submit (`passed` null while manual grading pending) |
| POST | `/exams/attempts/:attemptId/grade` | TEACHER+ADMIN+OWNER | Manual grading → finalizes GRADED |
| GET | `/exams/moderation-queue` | EXAMS_MODERATE | Pending items |

### Social & community (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/announcements/feed` `/announcements` | Bearer / ANNOUNCE_* | Feed (expiry-filtered) / create |
| GET/POST | `/competitions` `/competitions/:id` … `/enter` `/close` `/entries/:entryId/score` `/judge` | Bearer / COMPETITIONS_RUN | Competitions (score locked once JUDGED → 409) |
| GET/POST | `/events` … `/rsvp` | Bearer / EVENTS_RUN | Events (capacity row-locked) |
| GET/POST | `/posts` … `/react` | Bearer | Social feed (no comment endpoint) |

### Catalog (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/library/books` | Bearer | Book catalog (paginated) |
| POST | `/library/loans` | Bearer | Borrow (`{bookId}`; no‑copy 409) |
| POST | `/library/loans/:id/return` | Bearer | Return (already-closed 409) |
| GET | `/mooc` `/jobs` `/labs` `/ar-experiences` `/faculties` `/leaderboard` | Bearer | MOOCs / jobs / labs / AR‑VR / faculties / leaderboard |
| POST | `/mooc/:id/enroll` `/jobs/:id/apply` | Bearer | Enroll / apply |
| GET | `/me/achievements` `/me/skills` `/me/certificates` `/me/loans` | Bearer | Gamification + loans |
| GET | `/admin/stats` `/admin/faculties` `/admin/reports` `/admin/courses` | ADMIN/OWNER | Admin data |
| GET | `/admin/students` `/admin/digital` | ADMIN/OWNER | Admin extras (students: 400 on malformed page/limit/facultyId) |

### Search / Sync / AI / Files
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/global?q=` | Bearer | Cross‑entity autocomplete |
| GET/POST | `/admin/sync` `/admin/sync/trigger` | USERS_MANAGE/QUALITY_VIEW | Sync status / trigger |
| GET | `/university/facts` | Bearer | Institutional facts |
| POST/GET | `/ai/chat` `/ai/conversations` `/ai/conversations/:id/messages` | Bearer (chat rate‑limited 20/min) | AI chat + history (messages capped at newest 200) |
| GET | `/files/papers/:filename` | Bearer | Serve PDF (access-gated, path‑traversal protected, `.pdf` only) |

### Theme / onboarding / milestones (`/api/v1/me/*`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PUT | `/me/theme` | Bearer | Theme preference sync |
| POST | `/me/onboarding/complete` | Bearer | Idempotent, race-safe completion |
| POST | `/me/milestones/:id/fire` | **service token** (`x-internal-service-token`) | Server-to-server milestone fire (fail-closed; user JWTs always 403) |

### Owner — master control (`/api/v1/owner`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/owner/stats` `/realtime` `/ai-metrics` `/alerts` `/login-analytics` `/governance` `/education` `/system` | OWNER | Platform metrics (SQL-aggregated) |
| GET/POST/PATCH | `/owner/users` … `/role` `/status` | OWNER | User management (last‑owner guard 409; self‑deactivation 403) |
| GET | `/owner/activity` | OWNER | Activity log |
| GET/PUT | `/owner/settings` … `/:key` | OWNER | Platform settings (value ≤2000 chars, category ≤40) |
| GET/PUT | `/owner/feature-flags` … `/:slug` | OWNER | Feature flags |
| POST | `/owner/alerts/:id/resolve` | OWNER | Resolve alert (already-resolved 409) |

---

## 6. Environment variables (`src/env.ts`)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Neon pooler connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥32 chars |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥32 chars |
| `NODE_ENV` | ❌ | `development` | `production` enables static serving + secure cookies |
| `PORT` | ❌ | `4000` | listen port |
| `CORS_ORIGINS` | ❌ | madarek.onrender.com + localhost:5173 | Comma-separated CORS allow-list (no wildcards — credentials are on) |
| `INTERNAL_SERVICE_TOKEN` | ❌ | — | Service-to-service auth for `POST /api/v1/me/milestones/:id/fire` (≥16 chars; fail-closed when unset; constant-time compare) |
| `DIRECT_DATABASE_URL` | ❌ | derived | Neon **direct** (non-pooled) URL for `prisma migrate deploy`; when unset, the deploy script derives it from `DATABASE_URL` (strips `-pooler` + pooling params) |

---

## 7. Scripts

**Root:** `build` (frontend + backend + `db:deploy`), `start`, `dev`, `dev:web`,
`test` (both workspaces), `typecheck` (src + tests, both workspaces),
`db:migrate`, `db:deploy`, `db:seed`, `validate:colleges`,
`check:motion-tokens` / `check:icons` / `check:i18n`.
**Backend:** `dev` (tsx watch), `build` (tsc → `dist/`), `start`, `typecheck`,
`prisma:generate|migrate|deploy|seed`, `postinstall` (prisma generate).

---

## 8. Auxiliary systems

- **Scheduler** (`scheduler.ts`): runs `runSync()` 5 s after boot, then every 24 h
  (overlap-guarded); results recorded in `SyncRun`. Also prunes `LoginEvent`
  rows older than 180 days in bounded batches (never rejects, capped per day).
- **Timezone model** (`lib/dates.ts` — 15-h, campaign 3): the server runs with
  `TZ=UTC` (declared in `render.yaml`); every stored instant is UTC. Date-only
  *data* concepts (attendance day-keys, `@@unique(offeringId, date)` buckets)
  use UTC day-keys via `utcDayKey()` — stable regardless of who computes them;
  *display* labels («اليوم»/«غداً», agenda weekdays, month buckets) use
  Africa/Tripoli civil days via `tripoliDayKey()`/`tripoliDayDow()` (Libya is
  UTC+2 with no DST since 2013 — always use the tz name, never a hardcoded
  offset, so a DST return widens nothing silently).
- **University sync** (`lib/zu-sync/`): pulls institutional facts from a static
  source into `UniversityFact`.
- **PDF** (`lib/pdf.ts`): `extractPaperText()` via `pdf-parse` for library
  full‑text search; best‑effort, never throws.
