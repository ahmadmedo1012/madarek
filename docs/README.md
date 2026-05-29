# Madarek — Documentation

Comprehensive, accurate technical documentation for **منصة الزاوية للتعليم الذكي**
(Madarek), the official Arabic‑RTL smart‑learning platform of the University of
Zawia.

> Generated from a deep read of the live codebase (backend, frontend, Prisma schema).
> For the product vision/requirements, see the root `Madarek_PRD_v2.md`.

## Contents

| Document | Covers |
|----------|--------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System overview, stack, repo layout, request lifecycle, auth summary, deployment |
| [BACKEND.md](./BACKEND.md) | Full API reference, middleware chain, auth, permissions, env vars, scripts |
| [DATA-MODEL.md](./DATA-MODEL.md) | All Prisma models by domain, key relations, enums |
| [FRONTEND.md](./FRONTEND.md) | Routing, state, data layer, CSS architecture, theming, components, page inventory |
| [FEATURES.md](./FEATURES.md) | All 27 features with backing models, pages, and a roles matrix |
| [ux-rules-applied.md](./ux-rules-applied.md) | UX rules adopted from the ui‑ux‑pro‑max toolkit |

## At a glance

- **Stack:** React 18 + Vite (frontend) · Express + Prisma 5 (backend) · Neon PostgreSQL
- **Auth:** JWT 15‑min access + 7‑day rotating refresh cookie · Argon2id
- **Deployment:** single Express service (API + SPA) on Render
- **Roles:** STUDENT · TEACHER · ADMIN · QUALITY · OWNER
- **Production:** <https://madarek.onrender.com>
