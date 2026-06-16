# Backend — API, middleware, auth & operations

Express 4.21 (TypeScript, ESM) + Prisma 5.22 over Neon PostgreSQL.
All endpoints are mounted under the base path **`/api/v1`** and return a
`{ data: T }` envelope (errors return `{ error: { code, message } }`).

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
| `http/routes/*` | 19 route modules (below) |
| `lib/*` | `jwt`, `password`, `errors`, `pagination`, `pdf`, `permissions`, `zu-sync/` |
| `modules/auth/*` | `auth.service.ts`, `auth.dto.ts` |

---

## 2. Middleware chain (order in `app.ts`)

1. `app.disable('x-powered-by')`
2. `app.set('trust proxy', 1)` (Render)
3. **Helmet** (CSP disabled, `crossOriginResourcePolicy: cross-origin`)
4. **CORS** — allowlist `https://madarek.onrender.com`, `http://localhost:5173`, `credentials: true`
5. `express.json({ limit: '1mb' })` + `express.urlencoded({ limit: '1mb' })`
6. `cookieParser()`
7. **Global rate limit** on `/api/v1` — 300 req / 15 min / IP
8. **Auth rate limit** on `/auth/login` + `/auth/register` — 10 req / 15 min / IP (skips successes)
9. Route‑level guards: `authMiddleware`, `optionalAuthMiddleware`,
   `requireRole(...)`, `requireCapability(...)`, `validate(schema, source)`
10. **Error handler** (registered last) — maps `AppError`, `ZodError` (→400),
    Prisma `P2002` (→409), `P2025` (→404); unknown → 500 (no leak)

---

## 3. Authentication

| Aspect | Detail |
|--------|--------|
| Access token | JWT HS256, TTL 15m, payload `{ sub, role, type:'access' }`, `Authorization: Bearer` |
| Refresh token | JWT, TTL 7d, payload `{ sub, ver, type:'refresh' }`, http‑only cookie `mdrk_refresh`, `sameSite:strict`, path `/api/v1/auth` |
| Rotation | `tokenVersion` incremented on each refresh; logout bumps it (revokes all) |
| Passwords | Argon2id — memoryCost ≈19 MiB, timeCost 2, parallelism 1 |
| Lockout | 5 failed logins → 15‑min lock; reset on success |
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
| POST | `/auth/refresh` | cookie | Rotate refresh token |
| POST | `/auth/logout` | Bearer | Revoke refresh tokens |
| GET | `/auth/me` | Bearer | Current user profile |

### Users — `/users`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | ADMIN | List users (paginated, filter by role) |
| GET | `/users/:id` | self/ADMIN | User detail |
| PATCH | `/users/:id` | self/ADMIN | Update profile fields |

### Courses — `/courses`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | Bearer | List (paginated, filter by department) |
| GET | `/courses/:id` | Bearer | Detail with offerings |
| POST | `/courses` | ADMIN | Create |
| PATCH | `/courses/:id` | ADMIN | Update |
| DELETE | `/courses/:id` | ADMIN | Delete |

### Enrollments — `/enrollments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/enrollments/me` | STUDENT | My enrollments |
| POST | `/enrollments` | ADMIN | Enroll student |
| DELETE | `/enrollments/:id` | ADMIN | Remove enrollment |

### Offerings — `/offerings`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id` | access‑checked | Offering detail |
| GET/POST | `/offerings/:id/materials` | access / TEACHER+ADMIN | List / upload materials |
| GET/POST | `/offerings/:id/assignments` | access / TEACHER+ADMIN | List / create assignments |
| GET/POST | `/offerings/:id/grades` | access / TEACHER+ADMIN | List / upsert grades |
| GET/POST | `/offerings/:id/attendance` | access / TEACHER+ADMIN | Sessions / record |

### Me — notifications & messages (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | Paginated + unread count |
| PATCH | `/notifications/:id/read` | Bearer | Mark one read |
| POST | `/notifications/read-all` | Bearer | Mark all read |
| GET/POST | `/messages` | Bearer | DM list / send |

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
| POST | `/research/:id/scan` | Bearer | Plagiarism + AI scan |
| POST | `/research/:id/grade` | RESEARCH_GRADE_* | Grade |
| GET | `/research/queue` | TEACHER/ADMIN | Review queue |
| POST | `/research/:id/publish` | TEACHER/ADMIN | Publish to library |
| GET | `/research/published` `/research/search` | Bearer | Library / full‑text search |
| GET/POST/DELETE | `/research/:id/annotations` … | Bearer / TEACHER+ADMIN | Annotations |
| GET | `/quality/overview` `/courses` `/professors` `/engagement` `/curriculum` | QUALITY_VIEW | Quality analytics |

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
| GET | `/teacher/me/offerings` | TEACHER/ADMIN | My offerings |
| GET | `/teacher/offerings/:id/students` `/analytics` | TEACHER/ADMIN | Students / analytics |
| GET | `/teacher/risks` | TEACHER/ADMIN | At‑risk students |
| POST | `/teacher/offerings/:id/attendance` | TEACHER/ADMIN | Record attendance |
| POST | `/teacher/offerings/:id/curriculum/suggest` | CURRICULUM_EDIT_* | Suggest changes |
| GET/POST | `/admin/teachers/:id/suggestions` `/verify` | TEACHERS_VERIFY | Review / verify teacher |

### Teacher profile & live (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/PATCH | `/me/teacher-profile` | TEACHER/ADMIN | Get / update profile |
| GET/POST | `/live/sessions` | Bearer / TEACHER | List / create live session |
| POST | `/live/sessions/:id/lifecycle` | TEACHER | Start / end |

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
| POST | `/exams/templates/:id/start` | STUDENT | Start attempt |
| POST | `/exams/attempts/:id/answer` `/submit` | STUDENT | Answer / submit |
| GET | `/exams/moderation-queue` | EXAMS_MODERATE | Pending items |

### Social & community (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/announcements/feed` `/announcements` | Bearer / ANNOUNCE_* | Feed / create |
| GET/POST | `/competitions` … `/enter` `/close` | Bearer / COMPETITIONS_RUN | Competitions |
| GET/POST | `/events` … `/rsvp` | Bearer / EVENTS_RUN | Events |
| GET/POST | `/posts` … `/react` | Bearer | Social feed |

### Catalog (`/api/v1`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/library/books` `/library/loans` … `/return` `/me/loans` | Bearer | Library + loans |
| GET/POST | `/mooc` … `/enroll` | Bearer | MOOCs |
| GET/POST | `/jobs` … `/apply` | Bearer | Jobs |
| GET | `/labs` `/ar-experiences` `/faculties` | Bearer | Labs / AR‑VR / faculties |
| GET | `/me/achievements` `/me/skills` `/me/certificates` `/leaderboard` | Bearer | Gamification |
| GET | `/admin/stats` `/admin/faculties` `/admin/reports` `/admin/courses` | ADMIN | Admin data |

### Search / Sync / AI / Files
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/global?q=` | Bearer | Cross‑entity autocomplete |
| GET/POST | `/admin/sync` `/admin/sync/trigger` | USERS_MANAGE/QUALITY_VIEW | Sync status / trigger |
| GET | `/university/facts` | Bearer | Institutional facts |
| POST/GET | `/ai/chat` `/ai/conversations` `/ai/conversations/:id/messages` | Bearer (rate‑limited) | AI chat + history |
| GET | `/files/papers/:filename` | Bearer | Serve PDF (path‑traversal protected, `.pdf` only) |

### Owner — master control (`/api/v1/owner`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/owner/stats` `/realtime` `/ai-metrics` `/alerts` `/login-analytics` `/governance` | OWNER | Platform metrics |
| GET/POST/PATCH | `/owner/users` … `/role` `/status` | OWNER | User management |
| GET | `/owner/activity` | OWNER | Activity log |
| GET/PUT | `/owner/settings` … `/:key` | OWNER | Platform settings |
| GET/PUT | `/owner/feature-flags` … `/:slug` | OWNER | Feature flags |
| POST | `/owner/alerts/:id/resolve` | OWNER | Resolve alert |

---

## 6. Environment variables (`src/env.ts`)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ | — | Neon pooler connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | ≥32 chars |
| `JWT_REFRESH_SECRET` | ✅ | — | ≥32 chars |
| `NODE_ENV` | ❌ | `development` | `production` enables static serving + secure cookies |
| `PORT` | ❌ | `4000` | listen port |

---

## 7. Scripts

**Root:** `build` (frontend + backend + `db:deploy`), `start`, `dev`, `dev:web`,
`db:migrate`, `db:deploy`, `db:seed`.
**Backend:** `dev` (tsx watch), `build` (tsc → `dist/`), `start`, `typecheck`,
`prisma:generate|migrate|deploy|seed`, `postinstall` (prisma generate).

---

## 8. Auxiliary systems

- **Scheduler** (`scheduler.ts`): runs `runSync()` 5 s after boot, then every 24 h;
  results recorded in `SyncRun`.
- **University sync** (`lib/zu-sync/`): pulls institutional facts from a static
  source into `UniversityFact`.
- **PDF** (`lib/pdf.ts`): `extractPaperText()` via `pdf-parse` for library
  full‑text search; best‑effort, never throws.
