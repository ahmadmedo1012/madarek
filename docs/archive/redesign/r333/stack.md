# R333 Stack — proven local recipe (backend + DB + auth)

Verified end-to-end this task: migrate → seed → boot → login → role-gated API. Port **4000**. API prefix **`/api/v1`** (no bare `/api/...` routes — anything else 404s).

## §1 Recipe (exact commands, from repo root `/home/z/madarek`)

```bash
# 0) Env: backend needs DATABASE_URL + JWT_ACCESS_SECRET + JWT_REFRESH_SECRET (see backend/src/env.ts).
#    local-db writes backend/.env.local once (gitignored); copy it to backend/.env so BOTH
#    prisma CLI and tsx (dotenv/config reads backend/.env) pick it up. cp is a no-op if present.
node scripts/r319/local-db.mjs start                 # embedded PG16 :5433, db madarek_dev, --auth=trust (no password); idempotent
cp -n backend/.env.local backend/.env

# 1) GOTCHA (fatal): the sandbox shell exports DATABASE_URL=file:…/custom.db globally.
#    It OVERRIDES backend/.env for every command. Always re-export before migrate/seed/dev:
export DATABASE_URL="postgresql://postgres@localhost:5433/madarek_dev"

# 2) Migrate + seed (idempotent; seed is zero-writes on an established DB except @test.ly accounts):
npm run db:deploy          # → "migrations applied" (wraps prisma migrate deploy via backend/scripts/migrate-deploy.mjs)
npm run db:seed            # → "بذرة r183: القاعدة مؤسَّسة (N مستخدمًا) … 10 حسابًا على نطاق test.ly"
#    Fresh demo data reset instead: npm run db:seed:force  (MADAREK_SEED_FORCE=1)

# 3) Boot + prove (dev-once starts backend+vite, waits ready, runs CMD, kills all — one bash call):
bash scripts/r333/dev-once.sh -- bash -c 'curl -s localhost:4000/api/v1/health; echo'   # → {"ok":true,"dbLatencyMs":…}
bash scripts/r333/dev-once.sh -- bash -c 'curl -s -X POST localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"student@test.ly\",\"password\":\"***\"}"'

# 4) Authorized call (token = .data.accessToken from login; 256-char JWT):
bash scripts/r333/dev-once.sh -- bash -c 'T=$(curl -s -X POST localhost:4000/api/v1/auth/login -H "Content-Type: application/json" -d "{\"email\":\"owner@test.ly\",\"password\":\"***\"}" | node -pe "JSON.parse(require(\"fs\").readFileSync(0)).data.accessToken") && curl -s localhost:4000/api/v1/owner/stats -H "Authorization: Bearer $T"'
```

Login proof (captured 2025-xx, r333): `POST /api/v1/auth/login` → `{"data":{"user":{"email":"student@test.ly","role":"STUDENT",…},"accessToken":"…"}}`; `GET /api/v1/owner/stats` with owner token → `{"data":{"totalUsers":42,"students":32,"teachers":5,…,"totalEnrollments":217}}`; student token on `/owner/stats` → **HTTP 403**.

## §2 Route table (proven)

| # | Route | Auth | Proven response (trimmed) |
|---|-------|------|---------------------------|
| 1 | `GET /api/v1/health` | public | `{"ok":true,"dbLatencyMs":3,"env":"development","buildId":"local-dev"}` |
| 2 | `POST /api/v1/auth/login` | public (rate-limited) | `{"data":{"user":{…,"role":"STUDENT"},"accessToken":"<JWT>"}}`; refresh token set as HttpOnly cookie, not in body |
| 3 | `GET /api/v1/me/dashboard` — STUDENT (any authed user; personal-data endpoints deliberately NOT role-gated) | Bearer | `{"data":{"profile":{"year":3,"gpa":3.4,"totalXp":2340,…},"kpi":{"courseCount":6,"attendancePct":100,…}}}` |
| 4 | `GET /api/v1/teacher/dashboard` — TEACHER (also ADMIN/OWNER) | Bearer | `{"data":{"kpi":{"studentCount":31,"attendancePct":84,"needsReview":1},"trend":[…]}}` |
| 5 | `GET /api/v1/owner/stats` — OWNER only | Bearer | `{"data":{"totalUsers":42,"students":32,"teachers":5,"admins":3,"quality":1,"owners":1,"totalCourses":9,"totalOfferings":9,"totalEnrollments":217}}` |
| 6 | `GET /api/v1/owner/stats` with STUDENT token | Bearer | **403** (requireRole works; negative test) |

Seeded logins (password `***` = `12345678` for ALL — see `backend/src/modules/auth/test-accounts.data.ts`, `TEST_PASSWORD`): `student@test.ly` (STUDENT), `student2@test.ly` (STUDENT), `teacher@test.ly` / `teacher2@test.ly` (TEACHER), `registrar@test.ly` / `admin2@test.ly` (ADMIN), `quality@test.ly` (QUALITY), `owner@test.ly` (OWNER, no institution membership). Seed source: `backend/prisma/seed.ts`; boot-time re-ensure with `MADAREK_TEST_ACCOUNTS=1`.

## §3 Gotchas

1. **Global `DATABASE_URL=file:…/custom.db` in the sandbox shell overrides backend/.env** for prisma CLI *and* `tsx` (dotenv/config never overrides real env vars). Always `export DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev` in the same call. Symptom if forgotten: `Unsupported DATABASE_URL protocol "file:"` from migrate-deploy.mjs, or boot-time `DATABASE_URL is not a valid PostgreSQL connection URL`.
2. **Datasource is PostgreSQL, not SQLite** (`backend/prisma/schema.prisma`: `provider = "postgresql"`), served by the embedded cluster on **:5433** via `scripts/r319/local-db.mjs start` (raw pg_ctl, no Docker; binaries from the `embedded-postgres` devDependency). Data dir `.local/pgdata` persists; the daemon may or may not survive between sandbox bash calls — `local-db.mjs start` is idempotent, so always run it first.
3. **Sandbox reaps background processes between bash calls** → never split boot/seed/curl across calls; use `bash scripts/r333/dev-once.sh -- CMD` (starts PG+backend+vite, waits for vite HTTP + backend log `listening`, runs CMD, kills by pid + `fuser -k 5173/4000`).
4. **`.env.local` vs `.env`**: `dev:full` wires `DOTENV_CONFIG_PATH=.env.local`, but plain `npm run dev -w backend` only loads `backend/.env`. Copy `.env.local` → `.env` (both gitignored) so the bare dev path works.
5. **`npm run db:seed` is a no-op on an established DB** (zero-writes rule r183, only re-ensures the 10 `@test.ly` accounts). To rebuild demo institutions (madarek-demo / alandalus-demo): `npm run db:seed:force`. `npm run db:deploy` = `prisma migrate deploy` (30 migrations, no-op when current).
6. **Port 4000 is a hardcoded default** in `env.ts` (`PORT` env to change); dev-once's cleanup assumes 4000. JWT secrets must be ≥32 chars and differ, else boot warns/fails (`env.ts` zod).
7. **Login rate limiter is strict** (`authRateLimiter`): a loop hammering `/auth/login` will get 429 — reuse one token for multiple GETs instead of re-logging-in.
8. Route prefix is `/api/v1`; `app.use('/api', …)` only registers a catch-all 404 — `localhost:4000/api/health` and `/api/auth/login` do NOT exist.
