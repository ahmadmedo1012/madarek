# R323 HANDOFF — «BEAUTY + BRAND + LAUNCH»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after every step. Commit prefix `feat|fix|perf|chore|docs(r323): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> Never run root `npm run build` (it seeds the DB) — use `npm run build -w frontend`.

## Status board (W = wave, WP = work package)

| WP | Package | Scope (short) | Status | Evidence |
|----|---------|---------------|--------|----------|
| 0 | Programme start | clone, install, baseline typecheck | **done** | typecheck exit 0 @ `301dfdf` |
| A1 | Brand system | audit → new mark+wordmark → `<Logo>` single source → every surface → favicon/OG/manifest → `/__brand` → lint rule | **in progress** | `docs/redesign/r323/brand/AUDIT.md` |
| A2 | Loader orchestrator | one full-screen layer, splash = new mark stroke-draw, sheet-loader contract, z-index tokens, overlap test | **in progress** | `frontend/src/lib/loaderOrchestrator.ts` |
| A3 | Landing fixes | phone header, consent bar, ticker masks, map details, platform §06, roles ledger §07, CTA, footer strip | pending | — |
| A4 | Scroll & motion engine | gsap.ticker→Lenis, perf §7-5..7, gates | pending | — |
| A5 | App after login | component system, `/__design`, per-role sweep | pending | — |
| A6 | Whole-site red team | fresh reviewers, all viewports | pending | — |
| B1.1 | AI model + streaming | provider chain, SSE streaming, quotas, honest local mode | **in progress** | backend `lib/ai.ts` |
| B1.2 | RAG + citations | pg_trgm/tsvector index, source links | pending | — |
| B1.4-5 | AI everywhere + eval | player/teacher tools, `scripts/ai-eval/` | pending | — |
| B2.1 | Storage + upload wizard | S3 presigned, range streaming, teacher wizard | pending | — |
| B2.2 | Player excellence | speed, PiP, resume, checkpoints, transcript | pending | — |
| B2.3 | Transcripts | SRT/VTT upload, STT API, queue | pending | — |
| B2.4 | Live sessions | Jitsi embed default, attendance, recordings | pending | — |
| B3.1 | Bulk import | CSV/XLSX dry-run, temp passwords PDF, invite codes | pending | — |
| B3.2 | Mail + reset | Resend/Brevo, RTL templates, registrar fallback link | pending | — |
| B3.3-6 | Notifications, messages, onboarding, feedback | | pending | — |
| B4 | 13 academic flows E2E | | pending | — |
| B5 | Ops | /status, errors, backups, analytics, settings | pending | — |
| B6 | Scale & speed | keep-warm, load test, PWA | pending | — |
| B7 | Pilot kit | PILOT.md, guides, dress rehearsal | pending | — |

## Verified baseline (start of R323, at `301dfdf`)

- Repo cloned clean; `npm install` OK (552 packages, Node 24.22).
- `npm run typecheck` → exit 0.
- R322 state as described in the owner brief (C1–C3 delivered, logo chaos + landing
  defects open — see brief §"What is STILL wrong").

## Exact next 3 actions

1. Land W1a: brand core (`frontend/src/brand/` + assets + AUDIT.md), loader orchestrator
   core (`lib/loaderOrchestrator.ts` + overlay components + tokens), AI provider chain
   (`backend/src/lib/ai.ts` + SSE route) — three parallel work packages.
2. Integration pass: swap every logo call-site to `<Logo>`, wire orchestrator into
   App/landing, A3 landing fixes (header/consent/ticker/map/platform/roles/CTA/footer).
3. Verify: `npm run typecheck && npm test && npm run lint && npm run build -w frontend`,
   screenshots at 1440/390 light+dark, reviewer reports into `BOARD.md`, push.

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
