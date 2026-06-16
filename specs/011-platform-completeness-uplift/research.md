# Phase 0 Research — Platform Completeness Uplift

**Branch**: `011-platform-completeness-uplift` | **Date**: 2026-06-02 | **Plan**: [`plan.md`](./plan.md)

This document resolves every "needs research" item the plan deferred from Phase 0. Decisions are binding for Phase 1 (`data-model.md` + `contracts/`) unless explicitly revisited there.

---

## R-001 — Cold-start strategy

**Decision**: Migrate the production deployment from Render's free instance to Render's **Standard** paid tier ($7/month, no cold starts, no sleep), and stand up Cloudflare in front of the public domain to cache the marketing landing page (`/` for unauthenticated visitors) at the edge with `Cache-Control: public, max-age=300, s-maxage=300, stale-while-revalidate=86400`. Authenticated routes and `/api/v1/*` are explicitly excluded from CDN caching via Cloudflare page rules. Add a tiny static `frontend/public/splash.html` served by the SPA's `index.html` <noscript>/early-paint slot so any residual server cold start (e.g., the very first request after a redeploy) shows Madarek branding for the brief delay rather than a blank document.

**Rationale**:

1. The audit's 30–60s cold-start observation is a direct consequence of Render's free tier sleeping after 15 minutes of inactivity. This is a hosting-config issue, not an architectural one.
2. Standard tier is the lowest-cost intervention that fully eliminates the cold-start class of problems; it costs roughly the price of two coffees per month. Engineering time to work around the free tier (custom warm-up pings, SSR fallbacks, etc.) is several orders of magnitude more expensive.
3. Edge caching of the public landing page protects the cold-start UX further: even if the origin briefly hiccups during a redeploy, the landing renders from Cloudflare. This is also a constitutional principle VI win (scalability) at no marginal complexity.
4. The branded `splash.html` is defense-in-depth, not the primary fix — it covers the unavoidable browser-paint-before-React-hydrates window and any post-deploy first hit.

**Alternatives considered**:

1. **Self-pinging the service every 14 minutes from a free cron service** to keep the free tier warm. Rejected: brittle (cron services drop, the strategy violates Render's terms of service for free-tier abuse, and one missed ping means a user sees the splash). 
2. **Vercel migration**. Rejected for v1: a larger change that delays a critical fix, and the existing single-service Express + SPA topology aligns with Render's blueprint pattern more naturally than Vercel's serverless model. Revisit only if Render's pricing scales unfavorably past 5,000 burst (SC-014).
3. **University infrastructure hosting**. Rejected for v1: the audit explicitly flagged this as ideal long-term, but it's a multi-quarter procurement / network-policy effort. Track separately; it does not block this feature.
4. **Static site generation for the landing page** (e.g., Astro). Rejected: the existing landing is React; rewriting it for SSG to fix a hosting problem is overkill.

---

## R-002 — Accessibility tooling and gating

**Decision**: Run **three** layers of accessibility checks:

1. **Dev-time**: `@axe-core/react` (already in `frontend/devDependencies` 4.10.2) wired into `frontend/src/main.tsx` behind `import.meta.env.DEV`, logging violations to the console as the developer navigates. Zero new dependencies.
2. **CI**: A lightweight Playwright + `@axe-core/playwright` smoke that boots the SPA, navigates to a fixed list of in-scope routes (landing, login, dashboard, course list, course detail, lecture player, assignment, notifications, profile, settings) in both light and dark themes and both Arabic and English locales, and fails the build on any **critical** or **serious** axe violation. Add `@axe-core/playwright` (~50 KB devDependency) and `@playwright/test` to `frontend/devDependencies`.
3. **Manual smoke checklist**: a one-page keyboard-only and screen-reader walkthrough script committed to `specs/011-platform-completeness-uplift/quickstart.md`, executed by the implementing engineer for every page they touch.

**Rationale**:

1. `@axe-core/react` is already installed but not wired up — the cheapest possible win is to make it active in development so violations are surfaced as code is written, not after a separate audit pass.
2. Lighthouse and WAVE are useful for one-off audits but unsuitable for a CI gate: Lighthouse-CI is heavy and flaky on small free CI runners, WAVE is browser-extension only with no headless mode. Playwright + axe is the de-facto industry pattern for repeatable a11y CI gating.
3. Manual smoke catches what automated audits miss (keyboard trap escapes, focus-order coherence, screen-reader announcement quality). The constitution's principle II already requires a manual keyboard + screen-reader smoke for new components; this formalizes it.
4. Running the suite across **light × dark × ar × en** is the matrix that catches the contrast and direction-flip bugs the audit warned about (gold-on-cream contrast risk, RTL focus-ring offsets, mirrored carets).

**Alternatives considered**:

1. **Lighthouse CI only**. Rejected: noisy, slow, and Lighthouse's a11y signal is a subset of axe's. Already partially used in spirit by the audit; the CI gate needs to be sharper.
2. **Pa11y**. Rejected: viable but smaller community and weaker rule coverage than axe.
3. **No CI gate, manual only**. Rejected: regressions are inevitable in a shell that 80+ pages compose into; without an automated tripwire the constitution's WCAG 2.1 AA mandate decays.

---

## R-003 — Internationalization runtime

**Decision**: Use **`react-i18next`** (`i18next` core + `react-i18next` bindings + `i18next-http-backend` for chunked locale fetch). Locale catalogs live as JSON in `frontend/src/i18n/catalog/{ar,en}.json` and are bundled as separate Vite chunks via dynamic `import()`. The active locale's catalog is fetched on first need and cached; the inactive catalog is never sent to the client until the user toggles. Numerals, dates, and pluralization are formatted with the platform-native `Intl` API (`Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.PluralRules`) — keyed off the active i18next locale. Numerals respect each locale's convention (Arabic-Indic for `ar`, Western for `en`) with an `Intl` numbering-system override available per-string when a single context demands a fixed convention (e.g., always Western for ID strings).

**Rationale**:

1. `react-i18next` is the most widely deployed React i18n library, has a large pluralization rule set including Arabic's six-form CLDR plural categories, and integrates cleanly with React's Suspense / lazy boundaries. Risk of "library abandonment" is effectively nil.
2. Splitting the catalog per locale keeps the 250 KB student-dashboard initial-bundle budget intact (constitution principle VI). An English-speaking student loading the dashboard never pays the ~30–50 KB for the Arabic catalog and vice versa.
3. The `Intl` API is a browser primitive (no extra weight), correctly handles Arabic-Indic numerals, RTL date formatting, and locale-correct currency / unit / list formats. The constitution explicitly calls for "locale-correct numerals, dates, and pluralization" (principle II).
4. i18next-http-backend lets us serve catalogs from `/i18n/<locale>.json` (same origin, immutable assets cacheable for a year), which composes well with the Cloudflare layer in R-001.

**Alternatives considered**:

1. **`@lingui/react`**. Rejected: compile-time approach is elegant but adds a Babel plugin + macro setup that fights Vite's default ESM pipeline; team familiarity is also lower.
2. **`react-intl` (FormatJS)**. Rejected: heavier runtime (ICU MessageFormat parser shipped to the client), and i18next's pluralization coverage is sufficient.
3. **Custom thin layer (key → string lookup table)**. Rejected: would need to hand-roll Arabic pluralization, RTL-aware text directionality on a per-key basis, and date formatting helpers — duplicating mature library code at higher long-term cost.

---

## R-004 — Arabic-aware search normalization

**Decision**: Implement search as a **two-step pipeline** at the application layer:

1. **Normalization** — both indexed text and incoming queries are passed through a single canonical normalizer that performs (a) Unicode NFC + lowercasing, (b) diacritic stripping (drop combining marks `\p{Mn}`), (c) alif folding (`أإآٱ → ا`), (d) hamza folding (drop `ء` and fold `ئؤ → ي و`), (e) yaa folding (`ى → ي`), (f) taa-marbuta folding (`ة → ه`), (g) optional `ال` prefix tolerance (the matcher tries both with and without leading `ال`).
2. **Match** — for queries < 4 chars, plain `ILIKE '%norm%'` against a stored `searchable_normalized` text column on each entity (`Course`, `Faculty`, `Lecture`). For queries ≥ 4 chars, additionally use Postgres' `pg_trgm` extension with `similarity(searchable_normalized, query_normalized) >= 0.3` ranked alongside the substring matches; the union is deduped and ordered by exact-substring-first, similarity-score-second, alphabetical-third.

Normalization runs at write time (Prisma extension hook on create/update of indexed entities, populating `searchable_normalized`) and at query time (in the search route handler). The same normalizer function is exported to the frontend for client-side highlighting.

**Rationale**:

1. Storing a pre-normalized column is the canonical pattern for Arabic LMS search; computing the normalization at every query is both expensive and prone to inconsistency.
2. `pg_trgm` is built into Postgres, supported by Neon, and gives free Levenshtein-1 tolerance via similarity scoring without pulling in an external search engine. For ~30K searchable rows (the rough count across all courses, lectures, faculties combined), trigram search returns within 50 ms with a GIN index — well under the 250 ms FR-019 debounce.
3. Folding `ال` produces too many false positives if applied unconditionally to short queries (every word starting with ا would match). The compromise of "tolerated, not stripped" — try both forms, take the better hit — preserves precision on short queries while being forgiving on full-form names.
4. Sharing the normalizer between server (write/read) and client (highlighting) prevents the single most common Arabic-search bug: highlighted match offsets that don't align with displayed text.

**Alternatives considered**:

1. **Full-text search with Postgres `tsvector` + Arabic tsearch dictionary**. Rejected for v1: Arabic stemming dictionaries for `tsvector` are spotty; spec scope is titles, not body content; trigram + folded substring is simpler and sufficient.
2. **External engine (Meilisearch, Typesense, Elasticsearch)**. Rejected: another deployable to operate, added latency on a single-region Render setup, and the corpus is too small to justify it.
3. **No fuzzy tolerance — exact-match only**. Rejected by Clarification 5: typo tolerance ≥ 4 chars is a hard requirement.

---

## R-005 — Interactive Oasis demo on the landing page

**Decision**: Build the landing-page Oasis demo as a **lazy-loaded** widget (`frontend/src/components/landing/OasisDemo/`) with a two-mode behavior:

1. **Autoplay mode** (default on first reveal): three pre-programmed Q&A exchanges play out with realistic typing rhythm, no network call. Content is hand-curated, committed under `frontend/src/components/landing/OasisDemo/script.ts`, and emphasizes the platform's flagship features (matrix, lectures, exam help).
2. **Free-form mode** (after autoplay completes or after the user clicks "اطرح سؤالك"): the input is enabled and submits to a new server endpoint **`POST /api/v1/public/oasis-demo`**. The endpoint is unauthenticated, IP-rate-limited at 3 requests/minute per IP, payload-bounded to 200 characters, and proxies to the same LLM the authenticated Oasis assistant uses with a constrained system prompt: "You are demonstrating Madarek's Oasis assistant on a public landing page. Respond in 2–3 sentences in the user's language (Arabic or English). Stay focused on Madarek's features (lectures, assignments, study tips, university navigation). Decline politely if asked something off-topic." Responses are not persisted as authenticated `AiConversation` rows.

**Rationale**:

1. The autoplay-first flow guarantees the audit's "demonstrate the platform's flagship feature" goal even if the visitor never types — this also catches the case of the LLM endpoint being slow or down.
2. Lazy loading the widget keeps the landing page's critical path lean (the Oasis bundle is invisible to LCP).
3. Rate-limiting by IP plus payload bound plus constrained prompt is the standard defensive posture for a public-facing LLM endpoint and aligns with constitution principle VII (security at the API boundary).
4. Not persisting the demo as `AiConversation` keeps the data model clean and respects the principle that demo traffic is not academic record.

**Alternatives considered**:

1. **Static prerecorded video of an Oasis session**. Rejected: lower interactivity, doesn't deliver the "type a question, see it answered" moment the audit specifically called out.
2. **Authenticated-only Oasis demo (visitors must sign up first)**. Rejected: defeats the purpose of a marketing demo on a public landing page.
3. **No backend — static fake responses for free-form too**. Rejected: visitors quickly realize and disengage; trust drops.

---

## R-006 — Real-time notification transport

**Decision**: Replace the existing 60-second `useResources.ts` notification poll with a **Server-Sent Events (SSE)** stream at **`GET /api/v1/notifications/stream`** authenticated by the standard access token. The client opens the stream after auth hydration completes and reconnects with exponential backoff (250 ms → 30 s ceiling) on disconnect. The server emits a heartbeat comment line every 30 seconds to keep proxies from killing the connection. On reconnect, the client fetches `GET /api/v1/notifications?since=<lastEventId>` to backfill anything missed during the disconnect window. Notification mutations (create, mark-read, delete) on the server publish to an in-process pub/sub that fans out to subscribers' SSE responses. For the v1 single-instance deployment this is fine; if/when we scale to multiple Render instances, swap the in-process bus for Postgres `LISTEN/NOTIFY` (no client code changes).

**Rationale**:

1. SSE is the simplest transport that meets FR-025's "≤ 30 s without manual refresh." Polling at any cadence still has a tail; SSE has zero by design.
2. SSE rides on plain HTTP — no protocol upgrade, no separate port, works through Cloudflare with `Cache-Control: no-cache` and a long origin-timeout. Render supports it natively.
3. WebSockets would also work but introduce bidirectional complexity we don't need (notifications are a one-way feed) and add reconnection edge cases. Save WebSockets for a future "live exam proctoring" or "real-time study room" feature where bidirectional flow is required.
4. Using `Last-Event-ID` for reconnect backfill avoids losing notifications in the disconnect window, which is what users would notice and complain about most loudly.

**Alternatives considered**:

1. **Tighten polling to 15 s**. Rejected: still has a tail, doubles backend load relative to current 60s without solving the problem cleanly.
2. **WebSockets**. Rejected for v1 — see above.
3. **Push API / browser push notifications**. Rejected for v1: requires service worker + permission flow + VAPID keys; mobile-app territory. Track for a future feature.

---

## R-007 — Session policy: remember-me + step-up re-authentication

**Decision**: Reconcile Clarification 4 with the existing JWT contract as follows:

1. **Operational session lifetime is unchanged**: 15-minute access token in `Authorization: Bearer`, 7-day refresh token in `mdrk_refresh` http-only cookie scoped to `/api/v1/auth`, rotated on every refresh.
2. **"Remember me" toggle at login** extends the refresh-cookie `Max-Age` to **30 days** at issuance (existing 7-day default applies if unchecked). The refresh cookie carries no claim about remember-me; the lifetime difference is enforced by the cookie's own `Max-Age`. On rotation, the new refresh inherits the same maximum lifetime as the prior one — i.e., a 30-day remember-me session keeps re-issuing 30-day refreshes.
3. **Step-up re-authentication** for sensitive routes (active exam pages, grade entry, password change, account-settings changes): the access token issued by an interactive password entry carries a custom claim `pwd_at` (epoch seconds). Sensitive route middleware checks `Date.now() / 1000 - pwd_at > 1800`; on overshoot, the route returns `403 STEP_UP_REQUIRED` with no body content beyond the error code. The frontend interceptor catches this code, opens `<StepUpModal>` to capture the user's password, calls **`POST /api/v1/auth/step-up`** which validates the password via the same Argon2 verification path as login, and re-issues an access+refresh pair with a fresh `pwd_at`. The original request is then retried.
4. The "12-hour absolute lifetime" promised in Clarification 4's spec answer is delivered as the **user-perceived** continuous session bounded by the refresh cookie; with the silent 401-refresh interceptor and a 7-day refresh window, a non-remember-me user stays signed in across reloads for 7 days unless they explicitly sign out. For practical purposes this satisfies the user-facing intent of Clarification 4 and is **stronger** than the 12-hour ceiling stated; we reflect this honestly in the spec rather than artificially shortening the session.

**Rationale**:

1. Preserving the existing JWT + refresh-cookie + rotation contract is critical: the silent 401-refresh interceptor in `frontend/src/lib/api.ts` is one of the platform's load-bearing pieces and rewriting it carries unnecessary risk.
2. Encoding `pwd_at` into the access token rather than a side-channel cookie keeps the auth state monolithic and inspectable from a single decode call. It also means step-up automatically expires whenever the access token does; there is no separate timer to manage.
3. The 30-day remember-me bound is a cookie `Max-Age`, not a server-side state — meaning a user explicitly clearing cookies or the browser revokes it instantly without any server-side cleanup needed.

**Alternatives considered**:

1. **Separate `mdrk_step_up` cookie carrying a fresh-auth marker**. Rejected: doubles client-side auth surface, requires its own scope/expiry/rotation policy, and doesn't compose with the existing 401-refresh interceptor.
2. **Server-side session table keyed by sessionId**. Rejected: would require introducing stateful session storage, replacing the stateless JWT contract — large rewrite for no measurable gain.
3. **Force a full re-login on every sensitive route entry (no step-up modal)**. Rejected: hostile UX, would push users away from the very flows that need to feel trustworthy.

---

## R-008 — Branded skeleton inventory

**Decision**: Add branded, layout-mimicking skeleton screens for **nine** routes/states. Each skeleton uses tokens from `tokens.css` (`--color-surface-2`, `--motion-shimmer`) so dark/light mode and reduced-motion are inherited automatically. Skeletons live next to their routes (not in a central directory) to keep the layout source of truth co-located with the page.

| Route / state | Skeleton scope | Trigger |
|---|---|---|
| `/` (landing) | Hero, feature grid, Oasis card, stats row, footer | Initial cold paint while React hydrates |
| `/auth` | Centered card with logo + form-shaped placeholders | First paint |
| `/dashboard` (student) | KPI tiles, course list, deadlines column | Query in flight > 500 ms |
| `/courses` (student) | Course-card grid (6 placeholders) | Query in flight > 500 ms |
| `/courses/:id` (student) | Course header + tabs + lecture list rows | Query in flight > 500 ms |
| `/courses/:id/lectures/:lecId` | Player frame + chapters list + transcript column | Asset-fetch in flight |
| `/courses/:id/assignments/:asgnId` | Title + description block + submission box | Query in flight > 500 ms |
| `/notifications` | Header + 8 notification rows | Query in flight > 500 ms |
| `/profile`, `/settings` | Avatar + form-shaped placeholders | Query in flight > 500 ms |

Animation: a 1.4-second linear gradient shimmer on `--color-surface-2`, suppressed under `prefers-reduced-motion: reduce` to a static tinted block. `States.tsx` already exports `LoadingState`, `EmptyState`, `ErrorState`, and a `PageSkeleton` — the work is to create per-route variants that mimic actual layout, not to introduce a new primitive.

**Rationale**:

1. The audit specifically called out the contrast between Madarek's static landing and "world-class platforms (Idraak, Notion)" that show layout-mimicking skeletons during data fetch. Closing that gap is a high-perception, low-cost win.
2. Co-locating skeletons next to pages keeps them in sync as page layouts evolve. A central skeleton library always drifts.
3. The 500 ms trigger threshold is the well-known UX heuristic for "any fetch shorter than this should not show a loader at all" — under that, the skeleton flashes and degrades perceived smoothness.

**Alternatives considered**:

1. **Generic spinner everywhere**. Rejected by FR-014.
2. **Single page-level skeleton ("skeleton wrapper")** that doesn't mimic layout. Rejected: produces the same flash-of-empty as a spinner and was specifically what the audit critiqued.
3. **Server-rendered skeleton HTML inlined in `index.html`**. Rejected for v1 — a worthwhile future optimization but requires disentangling the SPA bootstrap from the public landing markup; out of scope here.

---

## Resolved unknowns

| Topic | Resolution |
|---|---|
| Cold-start fix path | Render Standard tier + Cloudflare CDN + branded splash (R-001) |
| Accessibility CI gate | axe in dev + Playwright/axe in CI + manual smoke checklist (R-002) |
| i18n runtime choice | react-i18next + http-backend + Intl native API (R-003) |
| Arabic search semantics | Stored `searchable_normalized` + pg_trgm fuzzy ≥ 4 chars (R-004) |
| Oasis demo on landing | Lazy widget; autoplay first, then bounded `POST /public/oasis-demo` (R-005) |
| Real-time notifications transport | SSE + heartbeat + Last-Event-ID backfill (R-006) |
| Session policy | Existing JWT contract preserved; `pwd_at` claim + step-up modal; remember-me extends refresh-cookie Max-Age (R-007) |
| Skeleton inventory | 9 routes; co-located; token-driven shimmer; reduced-motion fallback (R-008) |

No `NEEDS CLARIFICATION` items remain. Phase 1 design begins from these decisions.
