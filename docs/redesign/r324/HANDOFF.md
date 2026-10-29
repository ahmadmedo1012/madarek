# R324 HANDOFF — «FINISH THE BEAUTY»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after EVERY step. Commit prefix `feat|fix|perf|chore|docs(r324): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> Never run root `npm run build` (it seeds the DB) — use `npm run build -w frontend`.
> Local database is NOT optional this round: PostgreSQL 16 up + `db:deploy` + `db:seed`
> (twice, idempotency) before any authenticated claim.

## The programme

Owner brief: R324 finishes the LOOK — every page, public and after login, at the
Heron standard. Kill list X1–X16 must end at zero with before/after sheets.
Rule: **no surface is touched before its Heron counterpart is captured; no surface
is accepted before a Heron|Madarek overlay sheet exists at the same scroll anchors.**

## Status board

| Phase | Scope (short) | Status | Evidence |
|-------|---------------|--------|----------|
| s0 | clone @ `5070dda5` + install + typecheck | **done** | typecheck exit 0 @ `5070dda5` · baseline `npm test` running |
| P0 | X1 toast · X2 scrollHeight · X8 phone header · X10 debug sweep + innerText gate · X13 ticker mask · X15 help creds flag | **in progress** | rows below |
| P7.0 | deploy safety: local PG16, db:deploy+seed ×2, junk-migration fix, prod smoke | pending | — |
| P1 | Heron extraction completed (platform/why/roles/CTA/footer/menu + inner pages) + section ledger | pending | — |
| P3 | one type system (DESIGN.md §R324) + inner-page fixes + census gate | pending | — |
| P4 | themes Paper/Ink token-driven + pattern language + indicators | pending | — |
| P2 | landing rebuild per section + overlay sheets + reviewers | pending | — |
| P5 | app after login: gallery, shell, every route × role × bp × theme | pending | — |
| P6 | scroll & motion finished (X2 first) + screencast comparison | pending | — |
| P7 | B1.4/B1.5 + flows 1–13 E2E + dress rehearsal + B5/B6 remainders | pending | — |
| P8 | whole-site red team + final report | pending | — |

## P0 defect ledger (each = one commit)

| # | Defect | Root cause found | Fix | Status |
|---|--------|------------------|-----|--------|
| X1 | update toast on every page at ~2 s | `sw.js` `clients.claim()` on FIRST install posts `CONTENTS_UPDATED`; `main.tsx` toasts on the first message | client shows the toast only when a controller existed at load (`!!navigator.serviceWorker.controller` captured before register); copy «تتوفّر نسخة أحدث — حدّث الصفحة»; one max | done |
| X2 | scrollHeight 8,446 → 12,922 | the A4 skirt uses `contain-intrinsic-size: auto 900px` for every section | measured per-breakpoint sizes + stability gate | in progress |
| X8 | phone header tiny «القائمة» + 1-px burger | `.fo-burger` is still the 18.8rem-wide cell (187px) with a visible label + `border-inline-start` hairline | `[logo | 44×44 button]`; label only inside the overlay | pending |
| X10 | debug/jargon on inner pages | `MDRK-AUTH · SHEET 01/01`, `LEGAL/HELP SHEET · [L-01]`, `ERR [404]`, `[0,0] · ROUTE NOT MAPPED`, `SHEET 05 · SCALE 1:100`, `[SHEET · FIELD 06]`, `MADAREK · CAMPUS/LEDGER SHEET · [C-nn]` | sweep all + innerText gate banning `SHEET`, `ERR [`, `ROUTE NOT MAPPED`, `[0,` | pending |
| X13 | hero ticker cut mid-word @1440 | 16-px fade too narrow for ~150-px Arabic words | wider fade, verify at 1440 | pending |
| X15 | help page publishes test creds | the FAQ copy hard-codes `@test.ly`/`12345678` in production | `VITE_PILOT_HELP_ACCOUNTS` flag, default off in prod | pending |

## Exact next 3 actions

1. P0 rows X8/X10/X13/X15 as separate commits + the innerText gate.
2. P7.0: embedded PG up → `db:deploy` + `db:seed` ×2 → junk migration
   `20261029125221_workspace_agent_exit_code_printf_n…` deleted + corrective
   trigram-index migration → prod smoke commands recorded.
3. P1: Heron extraction (platform/why/roles/CTA/footer/menu) →
   `docs/redesign/r324/heron/*.json` + plain-words companions + section ledger.

## Commands

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund
npm run typecheck && npm run lint && npm test
npm run build -w frontend
npm run db:local   # embedded postgres (scripts/r319/local-db.mjs)
npm run dev:full   # full stack on the local DB
```
