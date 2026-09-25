# Secrets & Environment Reference

**DO NOT** commit this file content. This is a personal reference for local/CI use.

---

## Required Environment Variables (backend)

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Neon Dashboard → Connection Details → Pooled connection | Prisma runtime PostgreSQL connection (uses Neon pooler) |
| `JWT_ACCESS_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` | Sign access tokens (≥32 chars, 15-min TTL) |
| `JWT_REFRESH_SECRET` | Generate: same command (use DIFFERENT value) | Sign refresh tokens (≥32 chars, 7-day TTL) |

## Optional Environment Variables

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` enables static serving + secure cookies + `info` log level |
| `PORT` | Listen port (default: 4000) |
| `CORS_ORIGINS` | Comma-separated CORS origin allow-list (e.g. `"https://madarek.onrender.com,https://staging.example.com"`). Trailing slashes are stripped, empty entries dropped; unset/empty → default list (`https://madarek.onrender.com`, `http://localhost:5173`). Wildcards are deliberately unsupported because credentials are enabled |
| `INTERNAL_SERVICE_TOKEN` | Service-to-service auth for `POST /api/v1/me/milestones/:id/fire` (≥16 chars; **fail-closed when unset** — every call is rejected). Comparison is constant-time: both sides are SHA-256-hashed to fixed-length digests, then compared with `crypto.timingSafeEqual`, so attackers cannot probe the token length via response timing. A user JWT never authenticates this endpoint |
| `DIRECT_DATABASE_URL` | Neon **direct** (non-pooled) connection. When set, `prisma migrate deploy` uses it directly. When unset, the migrate script derives it from `DATABASE_URL` by stripping the `-pooler` hostname suffix + `pgbouncer`/`connection_limit` query params. |

> The three optional vars above (`CORS_ORIGINS`, `INTERNAL_SERVICE_TOKEN`, `DIRECT_DATABASE_URL`) are declared in `render.yaml` with `sync: false` — visible in IaC, never required by Render. `TZ` is also pinned to `UTC` there (not a secret — see the timezone-model note in `BACKEND.md` / `docs/PROJECT-REFERENCE.md`).

## Neon Connection Strategy (Render deployment)

Madarek uses two distinct connection URLs:

1. **Runtime** (`DATABASE_URL`) — Neon **pooler** URL (e.g. `ep-<name>-pooler.<region>.aws.neon.tech`).
   Used by the Prisma Client for live API traffic. PgBouncer pooling reuses
   connections, which matters on Render's free tier.

2. **Migration** (`DIRECT_DATABASE_URL`, optional) — Neon **direct** URL (e.g. `ep-<name>.<region>.aws.neon.tech`).
   Used by `prisma migrate deploy` during the Render build step.
   Prisma Migrate doesn't work well through PgBouncer (it needs a direct
   connection for DDL operations).

The migration script (`backend/scripts/migrate-deploy.mjs`) handles the
fallback automatically:

- If `DIRECT_DATABASE_URL` is set → use it as-is.
- Otherwise → derive a direct URL from `DATABASE_URL` by:
  * Stripping the `-pooler` suffix from the hostname.
  * Removing `pgbouncer`, `connection_limit`, and `pool_timeout` query params.
  * Preserving `sslmode`, `channel_binding`, and everything else.

The script never mutates `process.env` in the parent process — the
override is applied only to the `prisma migrate deploy` child process.

## Demo Accounts

All use password `Madarek2026!` (after seeding — re-seeding resets the password so it always matches the docs):

| Email | Role | Arabic Name |
|-------|------|-------------|
| `student@zu.edu.ly` | STUDENT | أحمد الزروق |
| `teacher@zu.edu.ly` | TEACHER | د. سالم البوسيفي |
| `admin@zu.edu.ly` | ADMIN | إدارة الجامعة |
| `quality@zu.edu.ly` | QUALITY | مكتب ضمان الجودة |
| `owner@zu.edu.ly` | OWNER | مالك المنصة |

## Production URLs

- **App:** https://madarek.onrender.com
- **Health:** https://madarek.onrender.com/api/v1/health
- **GitHub:** https://github.com/ahmadmedo1012/madarek

## Database Connection (Neon)

```
DATABASE_URL=postgresql://<neon-db-user>:<password>@<your-neon-endpoint>-pooler.<region>.aws.neon.tech/<your-db-name>?sslmode=require&channel_binding=require
```

Format: Pooler connection string with `?sslmode=require&channel_binding=require`.
Real endpoints, usernames, and database names are intentionally NOT recorded
here — take them from your Neon dashboard (Connection Details).

## Deploy to Render

1. Push to GitHub
2. Render reads `render.yaml` → creates web service
3. `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` auto-generate via `generateValue: true`
4. Set `DATABASE_URL` manually in Render's Environment tab (pooled Neon URL)
5. (Optional) Set `DIRECT_DATABASE_URL` if your Neon pooler URL doesn't follow the standard `-pooler` suffix convention
6. Build sequence: `npm ci --include=dev && npm run build` (lockfile-exact; `npm ci` keeps the deployed artifact identical to what the committed `package-lock.json` was CI-tested against)
   - `npm run build` runs: `frontend build` → `backend build` → `db:deploy` (migrate-deploy.mjs)
7. Start: `npm run start` (`node backend/dist/index.js`)
8. Seed (one-time, from local): `DATABASE_URL='...' JWT_ACCESS_SECRET='...' JWT_REFRESH_SECRET='...' npm run db:seed`
