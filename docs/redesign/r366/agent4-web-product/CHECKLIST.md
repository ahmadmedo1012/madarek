# Agent 4 · Web Product — R366 Checklist

Branch `agent/r366-web-product` · base `main` @ `7a097457` · records `docs/redesign/r366/agent4-web-product/`
A box is ticked ONLY with inline proof (command + real output / metric before→after / artifact path).
Status legend: `[ ]` open · `[x]` done (proof on line) · `[~]` in progress · `SKIPPED — reason — needs X`.

## L1 — Ledger v2 (open-every-tab pass, hostile data)

- [x] L1.1 Extend `scripts/qa/overlap.mjs` where blind: `--workers N` + `--popovers 1` (disclosure/haspopup layers probed open) + `--focus N` (focus-ring viewport clipping) + `--contrast/--reducedmotion` contexts. — PROOF: commit 9598d33; defaults byte-identical (clean re-run `/student/dashboard` 390×844 light: `stops-with-defects=0 …`); flags run clean on 3 routes × 2 bps × 2 themes.
- [x] L1.2 Baseline stress run recorded BEFORE fixes (per role, headline matrix). — PROOF: 5 roles × {360×640,1440×900} × light+dark `--stress --workers 2` → all `0 … 0` (artifacts `/tmp/r366/baseline-stress-{student,teacher,admin,quality,owner}.json`; the honest reading — interaction-layer defects — documented in the ledger with the failing-before e2e numbers).
- [~] L1.3 `docs/QA/page-ledger-v2.md` built (methodology + baseline + defect table); the full 5-width + popovers/focus matrix runs at close-out on the final build. — PROOF: file committed 633fd3f; close-out run pending.
- [~] L1.4 Rubric table published (8 axes, before→after lanes); ≤3 pages get root fixes inside their lanes; final Σ at close-out. — PROOF: `docs/redesign/r366/agent4-web-product/RUBRIC.md`.

## L2 — Copy diet round 2

- [x] L2.1 Densest pages cut. — PROOF: gate lines: ExamAuthor/OnlineExams (2-c lane in flight); committed — AiAssistant 244→181, TeacherPages 589→450, TeacherDashboard 150→120, TeacherProfile 152→139, MorePages 410→356.
- [~] L2.2 Aggregate + ceilings: ownable authed 8885 → 8577 so far (ratcheted in-commit, gate CLEAN); the honest ceiling documented — R355 already banked −44 % (16430→9215); the remaining words are action-critical per the truthfulness pins (two trims reverted on pin evidence).
- [x] L2.3 Before/after string table. — PROOF: `docs/QA/copy-review/r366-pack.md` (commit c46fb63).
- [x] L2.4 Copy-asserting tests updated in-intent. — PROOF: 46+71+183 unit + teacher-grading e2e + r325 flow-04 green after pin updates.

## L3 — Service surfaces as products

- [ ] L3.1 AI assistant: single scroller, composer never covers messages, streaming w/o layout jump, long answers/tables/lists/code horizontal scroll inside blocks, citations, 50+ messages perf (content-visibility/virtualise), keyboard-open phones, retry/copy, empty state, RTL/LTR mix, 320→1440. — PROOF: failing-before Playwright test + overlap stress clean on /student/ai + /teacher/ai.
- [ ] L3.2 Search palette: Ctrl/⌘+K, debounce/abort, typed groups 1-line rows, recent searches, no-result suggestions, keyboard nav, phone full-screen sheet, role-filtered results. — PROOF: failing-before test `global-search` extended + stress pass.
- [ ] L3.3 Notifications centre + bell popover never overlap top bar; messages list+thread+composer correct at 320. — PROOF: e2e + overlap stress on /notifications + messages pages.
- [ ] L3.4 File/PDF viewer: toolbar wraps at 320, zoom + page nav on phone, annotations rail. — PROOF: e2e at 320 + overlap.
- [ ] L3.5 Exams flow: timer bar, question nav, autosave state, no overlap on small screens (taker + author). — PROOF: online-exams e2e at 320/390 + stress.
- [ ] L3.6 Calendar/schedule: 360 px week grid usable, sticky rhythm. — PROOF: overlap matrix 320–1440.
- [ ] L3.7 Tables: sticky header, horizontal-scroll cue, numeric alignment, row actions menu at 320. — PROOF: stress (100+ rows) clean on tables pages.
- [ ] L3.8 Forms: 2-col→1-col, inline errors, disabled/loading. — PROOF: stress + fontscale 2 pass on form pages.
- [ ] L3.9 Dashboards: card rhythm, charts at 360, colour-blind-safe palettes. — PROOF: overlap + contrast gates + axe.

## L4 — Smoothness in the app

- [x] L4.1 content-visibility on chat/ai rows (contain-intrinsic-size) — 60-message transcript renders lazily, pinned precisely. — PROOF: e2e `سجلّ من 60 رسالة` (content-visibility + exact landing) passing, commit ac3cc77.
- [x] L4.2 CLS ≤ 0.05 on the top app pages. — PROOF: `scripts/qa/cls-axe.mjs` — 14 pages × 4 roles @390×844, max 0.0433 (commit 1b26388).
- [~] L4.3 Optimistic UI (thumbs rating revert-on-fail already in the AI surface); images lazy with dimensions — riding the lanes' close-out.

## L5 — Real-app proof

- [x] L5.1 Hostile fixtures per role on top pages. — PROOF: the stress baselines (L1.2) + the surface e2e suites with hostile geometry (390×320 keyboard-open, 200 % text, 60-row transcripts, unbroken strings).
- [~] L5.2 Lighthouse mobile on 5 app pages — PENDING (needs a quiet machine; the sandbox is agent-loaded). Fallback recorded: CLS+axe instrument covers the same a11y/perf classes hermetically.
- [x] L5.3 axe: zero serious/critical on every page type measured (14 pages × 4 roles). — PROOF: `cls-axe.mjs` output `axe-serious-critical-pages=0`.

## L6 — Closing

- [x] L6.1 Gates green (run 2026-11-17 on the r366 tree): contrast PASS · colors/raw-css/icons/motion-tokens OK · stylelint ratchet green (baseline file untouched; headroom improved rawZIndex 79→69, rawHex 36→29) · copy-budget + mobile CLEAN. — PROOF: command outputs in RESUME §20:45. Size-gate + full suites at close-out (final build).
- [~] L6.2 Typecheck + full frontend unit suite — targeted suites green all round (AI 99, teacher 254, copy pins 46+71); FULL run at close-out.
- [~] L6.3 Ledger v2 complete with the final matrix run — pending the lanes' landing + rebuild.
- [~] L6.4 DELIVERY.md; branch pushed continuously (a1c7f39 → c46fb63).
