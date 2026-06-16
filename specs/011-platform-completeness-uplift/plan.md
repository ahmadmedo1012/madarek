# Implementation Plan: Platform Completeness Uplift

**Branch**: `011-platform-completeness-uplift` | **Date**: 2026-06-02 | **Spec**: [`spec.md`](./spec.md)

**Input**: Feature specification from `/specs/011-platform-completeness-uplift/spec.md`

## Summary

Spec 011 closes the verifiable gaps surfaced in `madarek_audit_report00.md` (an external, unauthenticated crawl of `madarek.onrender.com`) and lifts the platform shell to the level the audit expected to find. The audit's central "no inner application" finding was an artifact of crawling guests through `ProtectedRoute`; the inner app already exists (~80 routed pages, JWT auth with refresh-cookie rotation, 60+ Prisma models, notification + global-search components, light/dark/system theme store). What remains is real and bounded.

The work splits into eight stories. Two are launch-blocking: a cold-start fix that retires the third-party Render splash for a branded skeleton (P1, US2), and a verification + wire-up pass that confirms each promised flow reaches real data without surfacing placeholder admin pages to students (P1, US1). Four are credibility-grade improvements that compose on top of existing primitives: a sticky desktop nav + breadcrumbs + Arabic-normalized global search (P2, US3); a unified notifications surface that converts the existing 60-second polling to an event-driven update with mark-all-read and a preferences UI (P2, US4); a WCAG 2.1 AA pass with a skip-link, axe-clean focus indicators, and contrast verification across both themes (P2, US5); and contrast / palette verification of the existing dark mode (P2, US6). Two are polish that ship after: an English i18n translation layer over a fresh keyed string registry (P3, US7); and motion choreography on the landing page including an interactive Oasis demo (P3, US8).

The implementation strategy is gap-fill, not green-field. Existing primitives — `tokens.css`, `[data-theme]`, `useReveal`, `CountUp`, `NotificationDropdown`, `GlobalSearch`, `ProtectedRoute`, `axios` 401-refresh interceptor, `Notification` Prisma model — are reused; net-new code is concentrated in (a) an i18n layer, (b) a notifications preference / SSE channel, (c) Arabic search normalization, (d) cold-start CDN fronting + skeleton inventory, (e) a step-up re-authentication gate for sensitive routes, and (f) the interactive Oasis demo widget.

## Technical Context

**Language/Version**: TypeScript 5.7 (frontend + backend, ESM); Node ≥20.

**Primary Dependencies**:
- Frontend: React 18.3, Vite 5.4, React Router 6, TanStack Query 5, Zustand 5, axios 1.7, react-hook-form + Zod 3.23, lucide-react, chart.js 4 + react-chartjs-2, pdfjs-dist 4. New for this feature: an i18n runtime (decision deferred to Phase 0 R-003).
- Backend: Express 4.21, Prisma 5.22, Argon2 0.41, jsonwebtoken 9, Helmet 8, CORS, express-rate-limit, cookie-parser, pino, Zod 3.23. New for this feature: SSE / WebSocket transport for notifications (decision deferred to Phase 0 R-006), Arabic text normalizer (deferred to R-004).

**Storage**: PostgreSQL on Neon (serverless, pooled) via Prisma. Schema additions in this feature are limited to `NotificationPreference` (per-user, per-category in-app on/off + email-digest disabled-stub) and an additive `User.locale` enum (`AR | EN`); see `data-model.md`.

**Testing**: Vitest 2.1 + React Testing Library + jsdom on the frontend (already present); axe via `@axe-core/react` 4.10 (already in devDependencies, not yet wired into a CI gate). Backend has no formal test framework today — this feature does not introduce one as a prerequisite, but new server-side surfaces (notification preferences, Arabic search normalization, step-up auth gate) will ship with at least integration-shape happy-path coverage in line with the constitution's testing-discipline requirement.

**Target Platform**: Modern evergreen browsers (Chrome / Edge / Safari / Firefox last two majors) on desktop (1024px+) and mobile (≥360px). Single-service deployment to Render: one Express server serves `/api/v1/*` and the compiled Vite SPA at every other path.

**Project Type**: Web application — npm monorepo with `frontend/` and `backend/` workspaces (already established).

**Performance Goals**:
- Landing-page Time-to-Interactive ≤ 5 s on cold visit (≥10 Mbps), ≤ 1.5 s on warm (SC-002).
- Branded paint ≤ 3 s on cold; no third-party splash ever (SC-003).
- API p95 < 400 ms on representative queries (constitution principle VI).
- 60 fps for all motion on mid-range mobile (constitution principle I).
- 2,000 concurrent users sustained, 5,000 burst at exam start (SC-014).
- Notification delivery to a signed-in session ≤ 30 s without manual refresh (FR-025).
- Global search response ≤ 250 ms after debounce on a warm cache (implied by FR-019 + SC-007).

**Constraints**:
- Must layer on existing token system (`tokens.css`, `stitch-tokens.css`, etc.) and existing primitives — no parallel design system.
- Must respect `prefers-reduced-motion`; must respect `prefers-color-scheme` on first visit.
- Must remain RTL-correct with Arabic as the default; English UI is additive.
- Must not break the existing axios 401-refresh contract or the `mdrk_refresh` cookie scope.
- Initial bundle on student-dashboard route must remain ≤ 250 KB gzipped (constitution principle VI).
- Visible localized strings already in JSX must be migrated through the new i18n layer; new strings must enter through it.

**Scale/Scope**: ~48 K registered users (audit), 29 colleges, 60+ Prisma models, ~80 routed frontend pages, 19 layered CSS files. This feature touches ~12–15 routes directly (landing, login, dashboard, course list, course detail, lecture player, assignment, notifications, profile/settings) and the global shell (`AppShell`, `Topbar`, `Sidebar`, `BottomNav`).

## Constitution Check

*Gate evaluation against `.specify/memory/constitution.md` v1.0.0. Must pass before Phase 0 research; re-checked after Phase 1 design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Premium Experience & Design Excellence | ✅ Pass | Plan reuses `tokens.css` and motion primitives; no new hardcoded values. Motion respects `prefers-reduced-motion` (FR-047). Visual polish work in US8 explicitly composes existing primitives. |
| II. Mobile-First, Accessible & Bilingual | ⚠ Pass with explicit work | English UI does not exist today; US7 + R-003 add the i18n layer. Until US7 ships, the platform is Arabic-only — that's the current state, not a regression. WCAG 2.1 AA verification (US5, R-002) is the gate this feature opens, with `@axe-core/react` already installed. |
| III. University-Truth Alignment | ✅ Pass | This feature touches presentation, notifications, search, accessibility, motion — not academic structure. The 29-college list and seeded `is_seed` boundaries already in place are preserved. The Oasis demo on the landing page (FR-046) uses pre-programmed sample exchanges, not synthetic UoZ data. |
| IV. Role-Based Governance & Least Privilege | ✅ Pass | New surfaces (notification preferences, locale, step-up auth) are per-user; no new roles. Server-side authorization is preserved on every new endpoint via existing middleware chain (Helmet → CORS → rate-limit → auth/role/capability guard → Zod validation). The verification pass in US1 explicitly checks for placeholder admin pages leaking to students. |
| V. AI-Assisted, Human-Authoritative | ✅ Pass | Oasis demo on landing is marketing illustration; the production AI assistant is unchanged in this feature. No new AI decision pathways are introduced. |
| VI. Scalability & Integration Readiness | ✅ Pass | New endpoints land under `/api/v1/*` (e.g., `/api/v1/notifications/preferences`, `/api/v1/me/locale`, the SSE stream). API schemas are typed (Zod). The 250 KB initial-bundle budget on the student-dashboard route is held by routing the i18n message catalog through code-splitting (one chunk per locale) and lazy-loading the Oasis demo widget. |
| VII. Security, Privacy & Auditability | ✅ Pass | Step-up re-authentication on sensitive routes (FR-001, R-007) tightens the existing posture, not loosens it. The 30-day "remember me" cookie option uses the same `mdrk_refresh` http-only / scoped contract. New audit log entries: locale change, notification-preference change, step-up auth event. No PII leaves the user's row in any new endpoint response. |

**Result**: Pass with no unjustified violations. Two items are explicit work, not violations — i18n is greenfield (US7 adds it), and accessibility verification (US5) is the audit gate the feature opens. Both are tracked as deliverables, not deviations.

**Re-check after Phase 1 design (2026-06-02)**: still passing. Specifically:

1. **Principle I (Premium Experience)** — `data-model.md` introduces no new visual primitives; `research.md` R-008 inventories nine skeletons that all derive from existing tokens; the new Oasis demo (R-005) lazy-loads outside the LCP path. No regression to the 60-fps motion or 250 KB initial-bundle budget.
2. **Principle II (Mobile-First, Accessible, Bilingual)** — i18n delivery path (R-003) splits catalogs per locale, satisfying the bundle budget; CI a11y gate (R-002) is the formal verification step the principle calls for.
3. **Principle III (University-Truth Alignment)** — no new academic-structure surfaces. Search index columns are computed projections of existing fields, not new authoritative data.
4. **Principle IV (Role-Based Governance & Least Privilege)** — every new endpoint (`/api/v1/me/locale`, `/api/v1/notifications/preferences`, `/api/v1/notifications/stream`, `/api/v1/auth/step-up`, `/api/v1/public/oasis-demo`, `/api/v1/search`) lists its auth posture explicitly in `contracts/`. The public Oasis-demo endpoint is the only unauthenticated addition; it is IP-rate-limited at 3/min with a 200-char cap and does not write to any persistent academic record (R-005).
5. **Principle V (AI-Assisted, Human-Authoritative)** — Oasis demo is illustrative; no new AI decision pathway with academic consequence is introduced.
6. **Principle VI (Scalability & Integration Readiness)** — all new endpoints are versioned at `/api/v1/*`; SSE transport (R-006) is the lightest path that meets FR-025; in-process pub/sub is documented as Postgres `LISTEN/NOTIFY`-swappable when the deployment scales horizontally.
7. **Principle VII (Security, Privacy & Auditability)** — the step-up gate (R-007) tightens the existing posture. New `AuditLog` entries: `LOCALE_CHANGED`, `STEP_UP`. The 30-day remember-me uses an existing http-only cookie shape with extended `Max-Age`; no new client-side auth surface.

Two items remain explicitly work, not violations: the i18n layer must actually be built (US7) and the a11y CI gate must actually run (US5). Both are deliverables in `tasks.md`.

## Project Structure

### Documentation (this feature)

```text
specs/011-platform-completeness-uplift/
├── plan.md                      # This file (/speckit-plan output)
├── spec.md                      # Feature spec (/speckit-specify + /speckit-clarify)
├── research.md                  # Phase 0: R-001..R-008 decisions
├── data-model.md                # Phase 1: schema deltas (NotificationPreference, User.locale)
├── contracts/
│   ├── notifications.md         # GET/PATCH /notifications, /notifications/preferences, SSE stream
│   ├── search.md                # GET /search?q=&types= with Arabic normalization rules
│   ├── locale.md                # PATCH /me/locale; locale resolution + i18n key conventions + catalog format
│   └── session-policy.md        # Remember-me + step-up re-auth contract
├── quickstart.md                # Adoption guide for engineers picking up tasks
└── checklists/
    └── requirements.md          # Spec quality checklist (already written)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── app.ts                   # Express bootstrap (existing); mount new routes here
│   ├── http/                    # middleware chain (existing)
│   ├── modules/
│   │   ├── auth/                # existing JWT auth; ADD step-up gate + remember-me option
│   │   ├── notifications/       # existing CRUD; ADD preferences + SSE stream
│   │   ├── search/              # NEW: Arabic-normalizer + entity-aware query
│   │   └── me/                  # ADD locale endpoint
│   ├── lib/                     # existing helpers
│   └── scheduler.ts             # existing
└── prisma/
    └── schema.prisma            # ADD: NotificationPreference, User.locale enum

frontend/
├── src/
│   ├── App.tsx                  # routing (existing); no structural change
│   ├── components/
│   │   ├── layout/              # AppShell, Topbar, Sidebar, BottomNav, GlobalSearch (existing)
│   │   │                        # ADD: SkipNavLink, Breadcrumbs, LocaleSwitcher, StepUpModal
│   │   ├── primitives/          # existing; ADD branded SkeletonScreen variants per route
│   │   └── landing/
│   │       └── OasisDemo/       # NEW: interactive demo widget (lazy chunk)
│   ├── i18n/                    # NEW
│   │   ├── runtime.ts           # locale provider, useT() hook, formatter helpers
│   │   ├── catalog/
│   │   │   ├── ar.json          # Arabic strings (canonical)
│   │   │   └── en.json          # English strings
│   │   └── keys.ts              # typed key registry
│   ├── lib/
│   │   ├── api.ts               # existing axios; preserve 401-refresh contract
│   │   ├── search.ts            # NEW: query builder + result hook
│   │   └── numbers.ts           # existing; extend for locale-correct numerals
│   ├── stores/
│   │   ├── theme.store.ts       # existing
│   │   ├── auth.store.ts        # existing; ADD `rememberMe`, `lastInteractiveAuthAt`
│   │   └── locale.store.ts      # NEW: persisted locale, prefers-language fallback
│   ├── hooks/
│   │   ├── useResources.ts      # existing 60s notification poll → REPLACE with SSE subscription + invalidation
│   │   ├── useReveal.ts         # existing
│   │   └── useStepUp.ts         # NEW: gate sensitive actions
│   └── styles/
│       ├── tokens.css           # existing; ADD locale-direction guards if needed
│       └── system.css           # existing skeletons; ADD branded variants
└── public/
    └── splash.html              # NEW: branded edge-served splash for Render cold-starts

design-system/                   # existing — reference only, do not redesign

scripts/
└── check-i18n-coverage.sh       # NEW: CI guard ensuring no untranslated literal strings in JSX
```

**Structure Decision**: Existing `frontend/` + `backend/` workspaces are preserved. Net-new directories are `frontend/src/i18n/`, `frontend/src/components/landing/OasisDemo/`, and `backend/src/modules/search/`. Net-new files are concentrated within those directories plus a small handful of additions (`SkipNavLink`, `Breadcrumbs`, `LocaleSwitcher`, `StepUpModal`, `useStepUp`, `locale.store`, `splash.html`, `check-i18n-coverage.sh`). Schema additions are limited to one new model and one new field (see `data-model.md`).

## Complexity Tracking

> The Constitution Check passed with no unjustified violations. The single deliverable that adds material new infrastructure — the i18n layer (US7, R-003) — is required by Constitution Principle II (mobile-first, accessible, bilingual) which the platform does not currently satisfy in English. It is not a deviation; it is the principle landing for the first time.

| Item | Justification |
|------|---------------|
| Notifications transport upgrade (60 s poll → SSE) | FR-025 requires ≤ 30 s end-to-end without manual refresh. Polling at 30 s instead of 60 s would meet FR-025 numerically but doubles backend load and still produces a 30 s tail. SSE is incremental (single endpoint, no new infrastructure) and aligned with constitution principle VI's performance budget. WebSockets considered and rejected for v1: heavier protocol, more nuanced edge-case handling on Render, and no bidirectional need yet. |
| i18n message catalog as code-split chunks | Holds 250 KB student-dashboard initial-bundle budget (constitution VI) by deferring the non-active locale's catalog. Single-bundle inline considered and rejected: would cost ~30–50 KB on the critical path for a feature most users never toggle. |
| Step-up re-authentication on sensitive routes | Required by Clarification 4 + FR-001. Implemented as a short-lived "fresh-auth" claim attached to the access token rather than a separate cookie, to keep the existing 401-refresh contract intact. Considered: a separate `mdrk_step_up` cookie. Rejected: doubles the client-side auth surface area for no security benefit. |
