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
| P1 | Heron extraction completed (platform/why/roles/CTA/footer/menu + inner pages) + section ledger | **done** | `docs/redesign/r324/heron/*.json` + `section-ledger.md` (commit `6a6a9edd`) |
| P3 | one type system (DESIGN.md §R324) + inner-page fixes + census gate | **done** | type-gate standing · census 0 violations (commits `50963260`/`5bf8f663`) |
| P4 | themes Paper/Ink token-driven + pattern language + indicators | **done (map pair)** | X12 map Ink ground (commit `56c58b1d`) · app-wide indicator sweep = remaining P4 tail |
| P2 | landing rebuild per section + overlay sheets + reviewers | **in progress** | X5 roles ledger `15a4d016` · X3 platform drawn+seated `25e5d150` (710px @1440 = Heron exact) · why/CTA/footer/menu heads remain |
| P5 | app after login: gallery, shell, every route × role × bp × theme | **pending** | — |
| P6 | scroll & motion finished (X2 first) + screencast comparison | **pending** | — |
| P7 | B1.4/B1.5 + flows 1–13 E2E + dress rehearsal + B5/B6 remainders | **pending** | — |
| P8 | whole-site red team + final report | **pending** | — |

## P0 defect ledger (each = one commit)

| # | Defect | Root cause found | Fix | Status |
|---|--------|------------------|-----|--------|
| X1 | update toast on every page at ~2 s | `sw.js` `clients.claim()` on FIRST install posts `CONTENTS_UPDATED`; `main.tsx` toasts on the first message | client shows the toast only when a controller existed at load; copy «تتوفّر نسخة أحدث — حدّث الصفحة» + a reload action; toast stack lifts above the consent seat | **fixed** |
| X2 | scrollHeight 8,446 → 12,922 | the A4 skirt's single `auto 900px` guess short-changed the doc ~3.5k px | measured per-section per-band CONTENT-BOX sizes (measure-intrinsic.mjs); desktop = fluid calc(vw) fit anchored @1024/1440; gate:height pins ±0.5 % | **fixed** (drift 0.209/0.017/0/0/0.017 %) |
| X8 | phone header tiny «القائمة» + 1-px burger | `.fo-burger` was the 18.8rem-wide cell with visible label + hairline | 44×44 icon-only seat; «القائمة» moved inside the overlay (.fo-mb-head) | **fixed** |
| X10 | debug/jargon on inner pages | SHEET/ERR[/coordinates/MDRK- carriers across auth, legal, campus, capabilities, errors, platform, loader, footer, both PageHeaders + AppShell | all retired; standing innerText gate (r324-text-gate.test.tsx) sweeps 20 surfaces | **fixed** |
| X13 | hero ticker cut mid-word @1440 | 16-px fade too narrow for ~150-px Arabic words | 64 px fade @≥992 / 40 px below | **fixed** |
| X15 | help page publishes test creds | the FAQ copy hard-codes `@test.ly`/`12345678` in production | `VITE_PILOT_HELP_ACCOUNTS` flag (dev/preview or explicit prod pilot build); prod ships credential-free honest answers + unit pin | **fixed** |

### The P2 wave (X-ledger, live)

| # | Defect | Root cause found | Fix | Status |
|---|--------|------------------|-----|--------|
| X3 | platform §05 word-by-word rail | TWO layers: the R323 showcase shipped with ZERO CSS (no .pr-frame family anywhere) AND .pr-stage had no ≥992 grid seat (the .pr-grid rule points at a retired class) → auto-placement = one 115px column | the frame family drawn (hairline/mono/one accent cell); stage seats 4/-1 row 1; section rows [1fr·auto]; note+CTA at the row-2 9/-1 seat (the reference's inspector-note); ≤479 note-unhide; bidi-safe end-edge push (auto margin on the RTL title, never the dir=ltr note) | **fixed** `25e5d150` |
| X5 | roles §07 giant list | the 8-row ledger rendered as stacked full-width cards | the 2-col hairline ledger (index · name · line · tag) | **fixed** `15a4d016` |
| X12 | dark theme not Heron-grade | the map plan's hardcoded paper tones ignored the theme pairs | Ink ground + paper strokes token pairs (the map) | **fixed (map)** `56c58b1d` — the app-wide pair sweep stays the P4 tail |
| X9 | inner pages ignore the type ladder | one-off display sizes + weights off the rungs | DESIGN.md §R324 ladder + census gate 0 violations | **fixed** `50963260`/`5bf8f663` |
| X2 | scrollHeight unstable | single-guess intrinsic placeholders | measured per-band rungs; **re-measured post-X3** (1024+1440 anchors; rl's pre-X5 guess corrected 1090→822) | **fixed** (drift ≤0.009 %) |
| X7 | statement §02 clipped paragraph | (next up) | — | **open** |
| X4 | why §06 blurry screenshot + chips | (queued) | — | **open** |
| X6 | map intro empty grid + boxes on walls | (queued) | — | **open** |
| X11 | logo optical size ≤32px | (queued) | — | **open** |
| X14 | landing docH ±2 % of Heron | roles ledger landed −268px vs its stale placeholder; platform holds 710 | re-measure all bands after the X4/X7 wave, then the ledger re-verdict | **open** |
| X16 | authenticated app unreviewed | (P5) | — | **open** |

### r324 gate hygiene note

The 8 unguarded `:hover` rules in landing.css ride `@media (hover: hover)`
now; the clean ratchet **lowers** 183 → 178 (never raises). The r307 CTA
contract re-pinned to `href="#cta"` on the row-2 note line (the r307 test
updated with the same no-auth guard).

## Exact next 3 actions

1. X7: the statement §02 clipped paragraph — the before sheet is cut
   (`statement-1440-before.png`); find the clip, fix, sheet after.
2. X4: the why §06 blurry screenshot + chips — the extraction
   (`heron/why-*.json`) is the composition law; the four-verb stage
   rides real surfaces only.
3. X6: the map intro empty grid + boxes-on-walls, then X11 (logo
   optical size) and the X14 docH re-verdict (the ledger ±2 %).

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
