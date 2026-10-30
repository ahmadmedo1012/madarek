# R325 HANDOFF — «THE APP, THE LAST DEFECTS, THE FEEL»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after EVERY step. Commit prefix `feat|fix|perf|chore|docs(r325): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> Never run root `npm run build` (it seeds the DB) — use `npm run build -w frontend`.
> Local database is NOT optional: PostgreSQL 16 (`npm run db:local`) + `db:deploy` +
> `db:seed` before any authenticated claim.
> **Scope guard:** the owner builds a separate Expo app on another branch — never touch
> `expo/`, `mobile/`, `apps/*` or other-branch files; HTTP API is additive-only (§P6).

## The programme

Owner brief: R325 finishes the WHOLE PRODUCT to Heron grade. Landing is ~85 % there —
cap landing work at the named defects Y1–Y6 (one wave, then close). ≥ 60 % of agent
time goes to P2 (the authenticated app X16), untouched after three rounds. P1 and P2
run in parallel from the first minute.

## Status board

| Phase | Scope (short) | Status | Evidence |
|-------|---------------|--------|----------|
| s0 | clone @ `284cbe27` + install + r324 handoff read | **done** | this commit |
| P1 | landing tail ONE wave: Y1 map intro clip · Y2 platform §05 · Y3 why §06 · Y6 consent bottom-stack · Y4 landing/legal headings · Y5-landing Ink sheets | **pending** | — |
| P2.1 | app grammar DESIGN.md §R325 (grid, sidebar, tables, forms, states, charts, icons) | **pending** | — |
| P2.2 | component gallery + `/__design` every component × state × 3 bps × 2 themes | **pending** | — |
| P2.3 | app shell: sidebar, top bar, bottom nav, drawer, transitions | **pending** | — |
| P2.4 | every route × role × 390/768/1440 × Paper/Ink on real seeded stack (10 accounts) | **pending** | — |
| P2.5 | indicators/patterns: ruler gauges, mastery cells, streaks, hatch/dots/cross | **pending** | — |
| P2.6 | app Ink parity (Y5) — no light-paper islands | **pending** | — |
| P3 | scroll & motion finished: screencast Heron vs Madarek + app scroll rules | **pending** | — |
| P4(a) | flows 1–13 Playwright specs, FLOWS.md shows last-run results | **pending** | — |
| P4(b) | AI everywhere + ai-eval (≥60 Arabic cases) + grounded answers w/ citations | **pending** | — |
| P4(c) | dress rehearsal: registrar+teacher+20 students, user guides | **pending** | — |
| P4(d,e,f) | B2 upload→S3→transcript documented · B3 bulk import proven · B5/B6 status UI, backup drill, k6 numbers | **pending** | — |
| P5 | small screens 320→1920 + landscape + PWA + iOS WebKit sheets | **pending** | — |
| P6(1–3) | openapi.json + mobile-auth.md + contract test (additive-only) | **pending** | — |
| P6(4,5) | SSE/upload curl docs + DeviceToken + `/me/devices` + notify() hook | **pending** | — |
| P7 | whole-site red team (fresh reviewers, live site) | **pending** | — |

## Defect ledger (Y-series, R325; each ends at zero with before/after sheets)

| # | Defect | Status |
|---|--------|--------|
| Y1 | map intro on phone clipped headline + empty plan frames at 1440 @0 | open |
| Y2 | platform §05 clutter: 330-px strip, 380-px void, tooltip over art, 9-px mono | open |
| Y3 | why §06 tooltip over screenshot + 150-px void + floating paragraph | open |
| Y4 | inner-page headings off-ladder (legal H2 ≈56/700, help H1 3 lines ≈52) — census must extend to EVERY heading on EVERY route | open |
| Y5 | Ink parity unproven beyond map (landing strips + every app page) | open |
| Y6 | consent bar may overlap sticky CTAs/toasts/FAB — bottom-stack manager + overlap probe | open |

R324 X-ledger: X1–X15 fixed and protected; X16 (authenticated app) dies in P2.

## Environment (verified commands)

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund
npm run db:local                                     # embedded PG16 :5433
DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev npm run db:deploy
DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev npm run db:seed
npm run dev:full                                     # full stack on the local DB
```

Test accounts: `*@test.ly` / `12345678` — student, student2, teacher, head, dean,
vicedean, registrar («المسجل العام» in every human string), faculty, quality, owner.

## Exact next 3 actions

1. P1 wave: Y1/Y2/Y3/Y6 fixes + Y4 landing/legal census extension + landing Ink sheets — one wave, then landing is closed.
2. P2.1–P2.3: app grammar §R325 + gallery states + shell polish, in parallel with P1.
3. P4(a) flow-spec scaffold + P6(1–3) OpenAPI/mobile-auth/contract test.

## Work order

- **W1:** P1 · P2.1–P2.3 · P4(a) scaffold · P6(1–3)
- **W2:** P2.4 student+teacher · P3 screencast evidence · P4(b) AI
- **W3:** P2.4 positions/registrar/quality/owner · P2.5–2.6 · P5
- **W4:** P4(c–f) · P6(4–5)
- **W5:** P7 red team + final reviews + report
