# منصة جامعة الزاوية للتعليم الذكي

**Zawia University Smart Learning Platform** — the official Arabic-RTL educational platform of **University of Zawia** (UoZ), under **the Ministry of Higher Education and Scientific Research, Libya**.

Single-service deployment: one Express server runs the API and serves the React build.

- **Production**: <https://madarek.onrender.com>
- Stack: React + Vite, Express + Prisma, Neon PostgreSQL
- Auth: JWT access + http-only refresh cookie, Argon2id passwords

## Demo accounts

After seeding, all use password `1234`:

- `student@zu.edu.ly` → STUDENT (أحمد الزروق)
- `teacher@zu.edu.ly` → TEACHER (د. سالم البوسيفي)
- `admin@zu.edu.ly` → ADMIN (إدارة الجامعة)
- `quality@zu.edu.ly` → QUALITY (مكتب ضمان الجودة)

## What's inside

This is a complete LMS for a public university:

- **Flipped classroom** — recorded lectures with embedded checkpoint questions, watch tracking, auto-attendance
- **Educational matrix** — per-concept mastery tracing, gap detection, recommendation engine
- **Research papers workflow** — upload → automatic plagiarism+AI scan → teacher review with inline annotations → publish to library
- **Cross-document library search** — full-text search across published papers (title + abstract + extracted body)
- **Quality oversight (4th sector)** — read-only institutional health: per-course quality, professor performance, engagement, curriculum tree
- **Admin** — faculties, courses, reports with real DB-driven KPIs
- **Smart attendance** — auto-marks PRESENT when a recorded lecture is fully watched
- **PDF viewer** — page nav, zoom, search, highlight, fullscreen, RTL chrome, mobile-responsive
- **Live notifications** — bell badge with real unread count, refetches every 60s
- **Social feed** — student/teacher posts persist with hashtags + reactions
- **University info** — official UoZ data: 29 colleges across 9 cities, vision/mission, rankings, contacts

## Deploy on Render (3 steps)

1. **Push the repo to GitHub.**
2. In Render, click **New + → Blueprint** and pick this repository. Render reads `render.yaml` and creates the web service. `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are generated automatically.
3. In the service's **Environment** tab, set **`DATABASE_URL`** to your Neon pooler connection string (`?sslmode=require&channel_binding=require`).

The build command runs `npm install && npm run build`. The build script:

1. Builds the Vite frontend → `frontend/dist`
2. Compiles the Express backend → `backend/dist`
3. Applies any pending Prisma migrations to Neon (`prisma migrate deploy`)

The start command (`npm run start`) boots `node backend/dist/index.js`, which serves the API at `/api/v1/*` and the SPA at every other path. PDF documents are served from `backend/storage/papers/` via `/api/v1/files/papers/:filename` (auth-required, path-traversal protected).

## Seed production data (once)

The seed isn't part of the build. Run once from any machine:

```bash
git clone https://github.com/ahmadmedo1012/madarek.git && cd madarek
npm install
DATABASE_URL='<your-neon-url>' \
  JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") \
  JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))") \
  npm run db:seed
```

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

## Tech notes

**Backend** (`backend/src/`): Express + TypeScript, Prisma 5, JWT (15 min access + 7 d refresh, rotation via `tokenVersion`), Argon2id, Helmet, CORS allow-list, `express-rate-limit`, Zod request validation, `pino` logs. SPA fallback returns `index.html` for any non-`/api/*` path. PDF text extraction via `pdf-parse`.

**Frontend** (`frontend/src/`): Vite + React 18 + TypeScript, React Router 6, TanStack Query 5, Zustand, react-hook-form + Zod, axios with 401-refresh interceptor, Chart.js, `pdfjs-dist` (lazy-loaded chunk for the document viewer).

**Database** (`backend/prisma/`): 31 models (users, courses, enrollments, materials, grades, attendance, library, MOOCs, jobs, posts, achievements, virtual labs, AR experiences, AI conversations, research papers + annotations, audit log). Migrations are committed and applied via `prisma migrate deploy` during the Render build.

## License

Internal — University of Zawia.

---

*Project codename in development: مدارك (Madarek).*
