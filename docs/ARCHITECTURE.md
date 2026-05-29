# Architecture — Madarek (منصة الزاوية للتعليم الذكي)

The official Arabic‑RTL smart‑learning platform of **University of Zawia (UoZ)**, under the
**Ministry of Higher Education and Scientific Research, Libya**.

- **Production:** <https://madarek.onrender.com>
- **Repository:** monorepo with two npm workspaces — `frontend` and `backend`.

---

## 1. System overview

Madarek is a **single‑service deployment**: one Express server simultaneously
serves the JSON API at `/api/v1/*` and the compiled React SPA at every other
path.

```
                ┌──────────────────────────────────────────────┐
   Browser ───► │  Express server (Node ≥20, ESM)               │
   (React SPA)  │                                                │
                │   /api/v1/*  ──► routes ──► Prisma ──► Neon PG │
                │   /*         ──► serves frontend/dist (SPA)    │
                └──────────────────────────────────────────────┘
```

There is no separate API host. In development the two run independently
(Vite on `:5173` proxying `/api` → Express on `:4000`); in production the Vite
build is emitted to `frontend/dist` and served by Express.

---

## 2. Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.3, Vite 5.4, TypeScript 5.7, React Router 6, TanStack Query 5, Zustand 5, axios, react‑hook‑form + Zod, Chart.js 4 + react‑chartjs‑2, pdfjs‑dist 4, lucide‑react |
| Backend | Express 4.21, TypeScript 5.7 (ESM), Prisma 5.22, Zod, Helmet, CORS, express‑rate‑limit, cookie‑parser, pino, pdf‑parse |
| Database | Neon serverless **PostgreSQL** |
| Auth | JWT (15‑min access + 7‑day refresh with rotation), Argon2id password hashing |
| Hosting | Render (Blueprint via `render.yaml`) |

No CSS framework — the UI is built on a fully custom CSS design‑token system
(see [FRONTEND.md](./FRONTEND.md)).

---

## 3. Repository structure

```
madarek/
├── backend/
│   ├── src/                 # Express app, routes, middleware, modules, lib
│   ├── prisma/              # schema.prisma, migrations, seed.ts
│   ├── storage/papers/      # uploaded research PDFs (served, auth‑guarded)
│   └── scripts/             # migrate-deploy.mjs
├── frontend/
│   ├── src/
│   │   ├── pages/           # route pages grouped by role
│   │   ├── components/      # layout, primitives, pdf, owner, shared
│   │   ├── hooks/           # data + utility hooks
│   │   ├── stores/          # Zustand stores (auth, theme, ui)
│   │   ├── lib/             # api, queryClient, nav, chartTheme, numbers, vision
│   │   └── styles/          # 19 CSS files (token + component + page layers)
│   └── index.html
├── docs/                    # this documentation set
├── design-system/           # ui-ux-pro-max generated design spec (MASTER.md)
└── render.yaml              # Render Blueprint
```

---

## 4. Request lifecycle

1. Browser loads the SPA (`index.html` + hashed assets, 1‑year immutable cache).
2. React Router resolves the route; `ProtectedRoute` guards role access.
3. Data hooks (TanStack Query) call axios → `/api/v1/*` with a `Bearer` access
   token attached by a request interceptor.
4. Express runs the middleware chain (Helmet → CORS → parsers → rate‑limit →
   auth/role/capability guards → Zod validation) then the route handler.
5. The handler uses Prisma (`withRetry()` for Neon transient errors) and returns
   a `{ data: T }` envelope.
6. On `401 TOKEN_EXPIRED` the axios response interceptor silently calls
   `POST /auth/refresh` (http‑only cookie) and retries the original request once.

---

## 5. Authentication & authorization (summary)

- **Access token** — JWT HS256, 15 min, sent as `Authorization: Bearer`.
- **Refresh token** — JWT, 7 days, http‑only cookie `mdrk_refresh`, scoped to
  `/api/v1/auth`. Rotated on every refresh via a per‑user `tokenVersion`; logout
  bumps the version to revoke all refresh tokens.
- **Passwords** — Argon2id (~19 MiB, timeCost 2). Account lockout after 5 failed
  logins for 15 minutes.
- **Roles** — `STUDENT`, `TEACHER`, `ADMIN`, `QUALITY`, `OWNER`.
- **Capabilities** — fine‑grained permissions layered on roles; effective set =
  role defaults + per‑user grants − revokes. See [BACKEND.md](./BACKEND.md).

---

## 6. Deployment (Render)

1. Push to GitHub; Render reads `render.yaml` and provisions the web service.
   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are generated automatically.
2. Set `DATABASE_URL` to the Neon pooler connection string in the service's
   **Environment** tab.
3. **Build:** `npm install && npm run build` →
   builds the Vite frontend → compiles the Express backend → applies pending
   Prisma migrations (`prisma migrate deploy`).
4. **Start:** `npm run start` → `node backend/dist/index.js`.

Seeding is **not** part of the build; run `npm run db:seed` once with the
production `DATABASE_URL` (see the root `README.md`).

---

## 7. Related documents

- [BACKEND.md](./BACKEND.md) — API reference, middleware, auth, env, scripts
- [DATA-MODEL.md](./DATA-MODEL.md) — Prisma models, relations, enums
- [FRONTEND.md](./FRONTEND.md) — routing, pages, state, CSS, theming, components
- [FEATURES.md](./FEATURES.md) — all features with backing models and pages
