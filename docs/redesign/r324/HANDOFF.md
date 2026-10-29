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
| P0 | X1 toast · X2 scrollHeight · X8 phone header · X10 debug sweep + innerText gate · X13 ticker mask · X15 help creds flag | **done** | commits X1/X8/X13/X15/X10/X2 · gate:height PASS (drift ≤0.209 % @5 bps) · text-gate 21/21 |
| P7.0 | deploy safety: local PG16, db:deploy+seed ×2, junk-migration fix, prod smoke | **done** | pilot seed «30 طالبًا + 21 محاضرة» live · trgm index restored · prod smoke 200s |
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
| X1 | update toast on every page at ~2 s | `sw.js` `clients.claim()` on FIRST install posts `CONTENTS_UPDATED`; `main.tsx` toasts on the first message | client shows the toast only when a controller existed at load; copy «تتوفّر نسخة أحدث — حدّث الصفحة» + a reload action; toast stack lifts above the consent seat | **fixed** |
| X2 | scrollHeight 8,446 → 12,922 | the A4 skirt's single `auto 900px` guess short-changed the doc ~3.5k px | measured per-section per-band CONTENT-BOX sizes (measure-intrinsic.mjs); desktop = fluid calc(vw) fit anchored @1024/1440; gate:height pins ±0.5 % | **fixed** (drift 0.209/0.017/0/0/0.017 %) |
| X8 | phone header tiny «القائمة» + 1-px burger | `.fo-burger` was the 18.8rem-wide cell with visible label + hairline | 44×44 icon-only seat; «القائمة» moved inside the overlay (.fo-mb-head) | **fixed** |
| X10 | debug/jargon on inner pages | SHEET/ERR[/coordinates/MDRK- carriers across auth, legal, campus, capabilities, errors, platform, loader, footer, both PageHeaders + AppShell | all retired; standing innerText gate (r324-text-gate.test.tsx) sweeps 20 surfaces | **fixed** |
| X13 | hero ticker cut mid-word @1440 | 16-px fade too narrow for ~150-px Arabic words | 64 px fade @≥992 / 40 px below | **fixed** |
| X15 | help page publishes test creds | the FAQ copy hard-codes `@test.ly`/`12345678` in production | `VITE_PILOT_HELP_ACCOUNTS` flag (dev/preview or explicit prod pilot build); prod ships credential-free honest answers + unit pin | **fixed** |

## Exact next 3 actions

1. P1: Heron extraction (platform/why/roles/CTA/footer/menu) →
   `docs/redesign/r324/heron/*.json` + plain-words companions + the
   section ledger (docH per section at 5 viewports vs ours).
2. P3: the one type system — DESIGN.md §R324 ladder + the inner-page
   fixes (/404 /500 /403, legal, help, about, contact, auth) + census gate.
3. P4: theme tokens (Paper/Ink pairs) + the pattern language classes.

## P7.0 evidence (commands + results, 2026-10-29)

```bash
node scripts/r319/local-db.mjs start        # embedded PG16 :5433
DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev npm run db:deploy
DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev npm run db:seed
# fresh cluster → «30 طالبًا + 21 محاضرة جديدة» (42 users, 9 courses,
# 25 lectures, 217 enrollments, 8 assignments); re-run = established skip.
cd backend && npx tsx scripts/db-verify-probe-r324.ts
# IDX_COUNT=4 …content_trgm_idx ✓ TRGM=1 USER_COUNT=42

curl -s https://madarek.onrender.com/api/v1/health
# {"ok":true,"dbLatencyMs":62,...}
curl -s -X POST https://madarek.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@test.ly","password":"12345678"}'   # 200 + token
curl -s -X POST .../api/v1/ai/chat -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"message":"ما هي سياسة الحضور؟"}'
# RAG-chain reply (honest no-context answer on the empty prod corpus)
```

## Commands

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund
npm run typecheck && npm run lint && npm test
npm run build -w frontend
npm run db:local   # embedded postgres (scripts/r319/local-db.mjs)
npm run dev:full   # full stack on the local DB
```
