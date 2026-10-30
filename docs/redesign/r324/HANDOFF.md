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
| X7 | statement §02 clipped paragraph | the R308 translation picked a per-word MASK SLIDE (translateY 115 % behind overflow:hidden) where the reference runs a per-char COLOR scrub — nothing translates, nothing hides; scrub re-inked per-char ghost→ink | **fixed** `65acc394` |
| X4 | why §06 blurry screenshot + chips | 720w derivatives q78 (mushy Arabic UI at 672px seat) + a fake real-UI chip | 720w tier re-encoded q92 lanczos from capture archive; chip retired | **fixed** `29517897` |
| X6 | map intro empty grid + boxes on walls | cascade war: PLAN_INK_CSS fill:var(--bg) (0,5,0) beat the designed accent-ink warm (0,4,0) → paper-on-paper label; wall debris boxes | cascade fixed + debris retired | **fixed** `65baefac` |
| X11 | logo optical size ≤32px | the mark's non-scaling hairline is a CONSTANT 1.5px — 4.7% of height at the 32-grid design size, but 12.5% at the 12px EdgeTab seat (2.7× the designed weight): small seats bloat into a blob | markStrokePx ramp: 1.5@32 → 1.125@16 (exactly the favicon's sanctioned 2.25/32 ratio) → 0.9px floor; BRAND.md §٥ documents it; ramp pinned in the brand test + before/after sheet | **fixed** (this commit) |
| X14 | landing docH ±2 % of Heron | the ledger compared h=900 sweeps against Heron's REAL device pairs (1024×768 · 768×1024 · 390×844) AND read stale contain-intrinsic-size guesses — the phantom +18.5 % was 649dvh × 132px of viewport-height mismatch | anchor parity + post-render reads: the map track 658dvh, the stacked column 466/473dvh, the statement art 59:50, the problem floor 89.1rem, the phone seats compacted; X2 rungs re-measured; verdict: **1440 +1.67 % · 1024 +1.90 % · 768 +0.76 % · 390 +0.63 % — PASS** | **fixed** (this commit) |
| X16 | authenticated app unreviewed | (P5) | — | **open** |

### r324 gate hygiene note

The 8 unguarded `:hover` rules in landing.css ride `@media (hover: hover)`
now; the clean ratchet **lowers** 183 → 178 (never raises). The r307 CTA
contract re-pinned to `href="#cta"` on the row-2 note line (the r307 test
updated with the same no-auth guard).

## Exact next 3 actions

1. The P2 reviewer round: 3 independent reviewers on the finished
   landing sections (BOARD rubric, mean ≥9, no category <8).
2. The P4 tail: the app-wide theme-pair sweep (indicator/state
   colours) beyond the map pair.
3. P5: the authenticated app (gallery, shell, every route × role × bp
   × theme) — X16 dies there.

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
