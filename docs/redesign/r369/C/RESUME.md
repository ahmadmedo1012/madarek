# C · RESUME — final-session gate record (R369)

Branch `agent/r369-product` · tip at C5.1 close · every line: command + real output.

## C5.1 — all gates on the final tree

| gate | command | output |
|---|---|---|
| typecheck | `cd frontend && npx tsc --noEmit` | exit 0 — no errors |
| unit suite | `TZ=UTC npx vitest run tests/unit` | **Test Files 238 passed (238) · Tests 2978 passed (2978)** |
| copy-budget (web) | `node scripts/gates/copy-budget.mjs` | **CLEAN** — arabic words 9,658; authed class 6,669; enforced ceilings sum 8,509 |
| copy-budget-mobile | `node scripts/gates/copy-budget-mobile.mjs` | **CLEAN** — 8,335 counted words = enforced ceilings sum |
| stylelint ratchet | `bash scripts/gates/stylelint-gate.sh` | **ratchet green (baseline held)** — 5 errors, all in landing/* (B's lane); my files 0 |
| mobile jest | `cd apps/mobile && CI=1 npx jest --ci` | **Tests: 1271 passed, 1271 total** (18.4s) |
| expo-doctor | `npx expo-doctor` | **20/20 checks passed. No issues detected!** |
| worklet law | `node scripts/qa/worklet-audit.mjs` | **LAWFUL — 243 files scanned, 0 violations** |
| size gate (per-push, CI's rule-3 basis) | `SIZE_GATE_BASE=<prev tip> bash scripts/gates/size-gate.sh` | **rule 3 ok** — 54KB (final push) / 165KB (previous) ≤ 5MB; rule 1 ok; rule 2 ok (docs 27.6MB ≤ 30MB) |
| bundle | the merged C2.3 record (6f48bcf8) | entry 66.2KB unchanged, total 762.8KB — **PASS** |

Red-from-root fixes this session (the stale-test twins inherited from 018024e0/0d827161 + the
merge's breadcrumb collisions + the 5 source-pin updates to the hoisted-constant spelling +
the 23 public-diet stale expectations) — all fixed at the source of the truth (the tests now
assert the CURRENT strings; none weakened).

## The §5-pre.5 completeness audit — 5 random ticked boxes re-verified

1. **C4.1** — re-ran `node scripts/gates/copy-budget.mjs`: CLEAN; authed-class words 6,669
   (the tick's number reproduces).
2. **C3.6** — re-ran `node scripts/gates/copy-budget-mobile.mjs`: CLEAN, 8,335 words.
3. **C4.2** — re-measured the non-landing CSS bytes: 1,375,659B (the tick's number
   reproduces); stylelint-gate ratchet green re-run.
4. **C1.4/C4.2 combined** — the student-family matrix re-run post-diet evidence
   (96 cells, max Δ0.000000, worst 97.8) — the diff-proof JSON regenerates the claim.
5. **C3.5** — re-ran `CI=1 npx jest --ci` + `expo-doctor` on the final merged tree:
   1271/1271 · 20/20 (this session, not the carried f16e55fe numbers).

## Known-not-green (recorded, each with its exact reason)

- **C2.3 PERF 72–84 < 90** on the 4 public routes (a11y/BP/SEO 100/≥96/100 MET): the CSR
  SPA's boot render-delay — the structural diagnosis + the landed levers
  (modulepreload family, cold-load standing page, zoom roots) documented; the 90+ bar needs
  build-time prerender/SSR — an owner architecture decision (the C2.3 tick records it).
- **C2.2 −7.9% < −25% public words**: the honest floor — legal fact sentences, countAr
  plural forms, action labels; the structural analysis in COPY-DIET-PUBLIC.md.
- **C3.4 jank ≤5% + cold start ≤2.5s on the CI x86_64 emulator**: no per-screen framestats
  harness exists; cold start AFTER 2.777s (BEFORE 3.306s, same protocol); recorded limitation.
- **stylelint 5 errors in landing/*** — B's exclusive files; REQUESTS-C-to-B.md filed.
- **The vs-main docs/ delta 5.7MB > 5MB** — materializes only at the owner's integration
  PR where A+B+C evidence sums (per-push gates green; my lane paid 1.07MB compaction).
- **AFTER extended ui-screens run 44574441331 + build-android 44576412696** — in flight at
  close (the core AFTER set reviewed CLEAN; the extended set follows the same tree).
