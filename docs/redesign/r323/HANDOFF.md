# R323 HANDOFF — «BEAUTY + BRAND + LAUNCH»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after every step. Commit prefix `feat|fix|perf|chore|docs(r323): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> Never run root `npm run build` (it seeds the DB) — use `npm run build -w frontend`.

## Status board (W = wave, WP = work package)

| WP | Package | Scope (short) | Status | Evidence |
|----|---------|---------------|--------|----------|
| 0 | Programme start | clone, install, baseline typecheck | **done** | typecheck exit 0 @ `301dfdf` |
| A1 | Brand system | audit → new mark+wordmark → `<Logo>` single source → every surface → favicon/OG/manifest → `/__brand` → lint rule | **done (core + integration)** | `brand/AUDIT.md` · `brand/BRAND.md` · `brand/VARIANTS.md` · `evidence/brand-1440-*.png` |
| A2 | Loader orchestrator | one full-screen layer, splash = new mark stroke-draw, sheet-loader contract, z-index tokens, overlap test | **done (core + App wiring)** | `frontend/src/lib/loaderOrchestrator.ts` · qa-sweep probes |
| A3 | Landing fixes | phone header, consent bar, ticker masks, map details, platform §06, roles ledger §07, CTA, footer strip | **done** | `BOARD.md` evidence table |
| A4 | Scroll & motion engine | perf §7-5..7, gate:perf, gate:clean | **done (§7-5 skirt + both gates)** | `scripts/r323/perf-gate.mjs` · `audits/evidence/r323/perf-gate.json` — jank 22→0.6–1.1 % (≤2 target), CLS 0.007, LCP 0.7 s, bundle main 88 KB gz, 0 route breaches · clean ratchet 65/183 recorded non-increasing |
| A5 | App after login | component system, `/__design`, per-role sweep | pending | — |
| A6 | Whole-site red team | fresh reviewers, all viewports | pending | — |
| B1.1 | AI model + streaming | provider chain, SSE streaming, quotas, honest local mode | **done (code + tests)** | `B1-AI.md` · 56 backend + 30 frontend tests |
| B1.2 | RAG + citations | pg_trgm/tsvector index, source links | **done (code + tests)** | `AiKnowledgeChunk` + migration (pg_trgm GIN) · `modules/ai/knowledge.ts` · `/ai/knowledge/reindex` · 16 tests |
| B1.4-5 | AI everywhere + eval | player/teacher tools, `scripts/ai-eval/` | pending | — |
| B2.1 | Storage + upload wizard | S3 presigned, range streaming, teacher wizard | **done (code + tests)** | presign lib + uploads routes + VideoUploadField · 26 new tests |
| B3.1 | Bulk import | CSV/XLSX dry-run, temp passwords PDF, invite codes | **done** | `lib/bulk-import.ts` + `/users/bulk-import/preview|commit` + BulkImportModal · 14 tests · **invite codes**: InviteCode/InviteUse migration + `/invites` CRUD + public validate + register-transactional consume (evaluate→claim→use→enroll atomic) + teacher InvitesCard + register-page seat [10] with the live scope hint · 5 pure tests |
| B2.2 | Player excellence | speed, PiP, resume, checkpoints, transcript | pending | — |
| B2.3 | Transcripts | SRT/VTT upload, STT API, queue | pending | — |
| B2.4 | Live sessions | Jitsi embed default, attendance, recordings | pending | — |
| B3.2 | Mail + reset | Resend/Brevo, RTL templates, registrar fallback link | **done (code + tests)** | `lib/mail.ts` + forgot-password wiring + `POST /users/:id/reset-link` · 11 tests |
| B3.3-6 | Notifications, messages, onboarding, feedback | **done (core)** | B3.3: the five academic fires (material ×2, assignment, live-scheduled, announcement-scope) — payloads pure-tested, fire tx/degraded · B3.4: the r155a DM stack pre-existing (inbox/compose/read-all/deep-links) · B3.5: tour + /help pre-existing · B3.6: the full loop — PilotFeedback model, POST/GET/PATCH /feedback, the floating widget + consoleTape + the /owner/feedback inbox |
| B4 | 13 academic flows E2E | | pending | — |
| B5 | Ops | /status, errors, backups, analytics, settings | **done (core)** | `GET /api/v1/status` (public, limiter-exempt) · backups = documented Neon procedure (PILOT.md) |
| B6 | Scale & speed | keep-warm, load test, PWA | **done (core)** | `scripts/load/k6.js` (100 VU, p95<800ms bar) · `docs/load-test.md` · keep-warm documented · **PWA**: manifest+icons (A1) + sw.js (hash-asset cache-first, network-first navigations → offline.html «لا يوجد اتصال», API never cached, skipWaiting + the «تحديثت المنصّة» toast) — PROD-only registration |
| B7 | Pilot kit | PILOT.md, guides, dress rehearsal | **done (core)** | `docs/PILOT.md` (AR+EN, 10 steps, env table, rollback) + the B4 seed pack (8 courses, 30 @demo.madarek.ly students, DELETE /users/demo-cohort sweep) · user guides + dress rehearsal pending |

## Wave 1 landed (verified on the local full stack)

- **A1**: `frontend/src/brand/` (`<Logo variant|size|tone|animated>`), regenerated
  favicon/icons/OG (no copper/gold, no gradients anywhere), `StarMark.tsx`/`BrandMark.tsx`/
  `FooterArt.tsx`/`wordmark-art.generated.ts` DELETED, every call-site swapped (landing,
  auth, sidebar, splash, legal, campus, capabilities, edge-tab, sheet loader), `/__brand`
  specimen sheet + route, r177/r188/r323 gates green.
- **A2**: orchestrator state machine (seat invariant 0/1), Splash/RouteProgress/
  SlowServerCard mounted in App.tsx, z-index contract tokens, first-visit intro flag,
  serverWake→slow-server wiring, 29 unit tests + overlap e2e.
- **A3**: phone header row fixed; consent = 48-px bottom bar (probe `coversH1:false`);
  ticker soft edge masks + hover pause; map: solid-ink structure (discrete envelope write),
  headline paper plate, intro-card corner mask; platform frame + roles ledger + CTA
  cleanup + footer strip (ghost agent work, foreman-verified).
- **B1.1**: model fallback chain + backoff, SSE streaming (`token`/`done`/`error`),
  AiQuota/AiBudget/AiFeedback migration, Arabic quota card, honest local mode,
  env vars documented (`.env.example`, `render.yaml`, `B1-AI.md`).
- **Verification**: typecheck 0 · **2802/2802 frontend unit tests** · backend AI suites
  56/56 · lint 0 · `npm run build -w frontend` ✓ · full-stack dev:full + Playwright
  evidence sweep (`scripts/r323/qa-sweep.mjs`) → `evidence/`.

## Exact next 3 actions

1. Independent reviewer round on `BOARD.md` evidence (3 reviewers, rubric ≥9/no <8),
   then fix whatever they list.
1. A5: the component system + `/__design` gallery + the state-contrast sweep gate.
2. B2.2 player remainder (speed/resume/checkpoints UI), B2.3 STT queue + B2.4 live sessions.
3. B3.1 invite codes → B3.3–3.6 notifications/messages/onboarding/feedback; then B4 flows E2E + FLOWS.md.

## Commands to reproduce

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund
npm run typecheck          # baseline gate
npm test                   # unit + backend suites
npm run lint               # eslint
npm run build -w frontend  # NEVER root npm run build (seeds DB)
npm run dev:full           # embedded postgres; see scripts/r319/dev-full.mjs
```

## Open defects (from owner brief, each must end at zero)

1. Three+ competing logos (header StarMark vs copper favicon/BrandMark vs footer ink
   square-star + outlined wordmark vs line-drawn loader logo). ← A1
2. Phone header broken (clipped «القائمة», 1-px hamburger at x≈8); consent banner
   ~20 % of 844-px viewport covering hero. ← A3
3. §06 platform cluttered (blurry screenshot, pasted tooltip, real-ui chip, duplicate
   disclosure, ≈330 px void before CTA). ← A3
4. CTA empty plus-grid placeholder + «المشروع/اللغة/القدرات» ledger with Latin «RTL». ← A3
5. Map details: state-1 headline on wall line, clipped «12.3M» label, wall tone jump,
   ticker cut mid-glyph at edges. ← A3
6. Footer ink-render strip: 5 tiny thumbnails in 1400-px row; filler newsletter copy. ← A3
7. Authenticated screens not at landing standard; dark mode of new landing unreviewed. ← A5
8. R322 remainders: jank 22 %→≤2 % @1440, competition-detail dark h1, dedupe, gate:clean,
   bundle caps. ← A4
