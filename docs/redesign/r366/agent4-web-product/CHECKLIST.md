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

- [x] L3.1 AI assistant: single scroller, composer never covers messages, streaming w/o layout jump, long answers/tables/lists/code horizontal scroll inside blocks, citations, 50+ messages perf (content-visibility/virtualise), keyboard-open phones, retry/copy, empty state, RTL/LTR mix, 320→1440. — PROOF: ac3cc77 (6/6 incl. 60-row content-visibility pin, 390×320 keyboard-open, unbroken-latin wrap) + 0f0950a hardening (two load-machine races fixed at the root: deterministic open pin + settle loop yields to the reader — 6/6 × 3 consecutive runs).
- [x] L3.2 Search palette: Ctrl/⌘+K, debounce/abort, typed groups 1-line rows, recent searches, no-result suggestions, keyboard nav, phone full-screen sheet, role-filtered results. — PROOF: commit 005e8a0 — global-search.e2e.ts 5/5: the ≥2-char gate (single char asks nothing; the settled term asks exactly once with the student's category filter), no-result pills refill the query, the recents rail leads the next round with zero duplicate rows, and ≤640px the palette IS the screen (0,0,390,844, radius 0, dvh-honest) with a visible 44px exit closing it. Overlap --popovers clean; cls-axe on the built preview ≤0.05 + axe 0.
- [x] L3.3 Notifications centre + bell popover never overlap top bar; messages list+thread+composer correct at 320. — PROOF: notifications half commit 9c1bb5b (panel container contract + anchoredPosition bar-clamp, e2e 6/6 serial); messages half commit 7fcd0b0 — messages.e2e.ts 6/6 (list→thread room replaces list on phone, back restores scroll, 390×320 keyboard-open last-bubble+composer, 60-msg content-visibility, unbroken-latin wrap, live send through the stateful transport, compose-modal inline errors + 44px touch floors via the new hasTouch fixture option).
- [x] L3.4 File/PDF viewer: toolbar wraps at 320, zoom + page nav on phone, annotations rail. — PROOF: commit 3d8c1f8 — document-viewer.e2e.ts (346 lines) verified 2026-11-18: full suite green in the 14/14 run with online-exams (toolbar wrap, zoom, phone page nav, annotations rail contracts).
- [x] L3.5 Exams flow: timer bar, question nav, autosave state, no overlap on small screens (taker + author). — PROOF: commit 499c2e1 — online-exams.e2e.ts verified 2026-11-18 (14/14 combined run): autosave chip quiet + card-stable, no horizontal overflow at 320 AND at 200% text scale; the sticky-bar callback-ref TS truth repaired in 7e916c0.
- [x] L3.6 Calendar/schedule: 360 px week grid usable, sticky rhythm. — PROOF: commit 7fcd0b0 — calendar.e2e.ts 6/6: 360 no-overflow + ≥36px cells; the month/week switcher (pill register, aria-pressed) + one-line chips (ellipsis + title, ≤30px) at 320; dow row moves with the grid (not sticky); today paint square + filled numeral in both themes. Week mode: stacked strip <768 (per-cell weekday labels), 7-column ≥768. Seeded overlap matrix 320–1440 × light/dark = 0 defects; CLS 0.0119, axe 0.
- [x] L3.7 Tables: sticky header, horizontal-scroll cue, numeric alignment, row actions menu at 320. — PROOF: commit 8a4d938 — the stress sweeps on the table routes (teacher grades/attendance, admin students/teachers/invites/faculties/courses, owner users/notifications/dashboard, student results/library) × {360,390,1440} × light/dark with 100+ cloned rows + hostile strings: 0 defects. Root fix: .btn flex-shrink: 0 (a squeezed «حذف» clipped its glyph at 360 — measured 56px client vs 59px content).
- [x] L3.8 Forms: 2-col→1-col, inline errors, disabled/loading. — PROOF: commit 8a4d938 — the fontscale-2 matrices on the form-heavy routes (teacher exams/labs/attendance, student dashboard/courses/online-exams, admin students/courses/invites) × {360,390,768} × light/dark: 0 defects (was 20 text-on-text — the fixed 56px topbar spilled its rem-scaled title over the page's first row; the band now grows with its content, the title is one line always). Inline errors + 44px floors already pinned by messages.e2e (compose modal) and the exams/pdf suites.
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
