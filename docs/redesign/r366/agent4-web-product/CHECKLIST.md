# Agent 4 · Web Product — R366 Checklist

Branch `agent/r366-web-product` · base `main` @ `7a097457` · records `docs/redesign/r366/agent4-web-product/`
A box is ticked ONLY with inline proof (command + real output / metric before→after / artifact path).
Status legend: `[ ]` open · `[x]` done (proof on line) · `[~]` in progress · `SKIPPED — reason — needs X`.

## L1 — Ledger v2 (open-every-tab pass, hostile data)

- [ ] L1.1 Extend `scripts/qa/overlap.mjs` where blind: popover/dialog/sheet open pass, keyboard-open height (320), 200 % zoom + 130 % text scale combined with stress, focus-ring clipping probe, `prefers-reduced-motion` + `prefers-contrast: more` contexts, parallel route workers (opt-in `--workers`). — PROOF: diff + clean re-run of an untouched route (identical verdict).
- [ ] L1.2 Baseline stress run recorded BEFORE fixes (per role, top matrix) with defect counts. — PROOF: `/tmp/r366/baseline-*.json` + numbers in RESUME.
- [ ] L1.3 `docs/QA/page-ledger-v2.md` built: every route × role × widths {360,390,768,1024,1440} (+320 + landscape for top 20) × light/dark, loads w/o console errors, no horizontal scroll, no overlap/clipping, states correct. — PROOF: ledger file + runner commands + exit codes.
- [ ] L1.4 Rubric review contact sheets (≤ 40): every key page scored 1–5 (alignment, rhythm, hierarchy, density, consistency, contrast, states, RTL); every page ≤ 3 FIXED at root and re-captured; before/after table published. — PROOF: score table + sheets path.

## L2 — Copy diet round 2

- [ ] L2.1 Densest-20 authed pages cut (target ≥ 20 % fewer words, no action-critical loss). — PROOF: copy-budget gate before→after per file.
- [ ] L2.2 ALL owned authed pages under the 20 % aggregate cut; ceilings ratcheted in same commits. — PROOF: gate CLEAN + authed max-sum before 8885 → after ≤ 7108 (my files).
- [ ] L2.3 Before/after string table for review (Arabic-correct, Libyan terms). — PROOF: `docs/QA/copy-review/r366-pack.md`.
- [ ] L2.4 Unit/E2E copy assertions updated where they pin shortened strings (no test weakening — same intent, shorter truth). — PROOF: test run green.

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

- [ ] L4.1 Long lists/tables/chat jank: virtualise or `content-visibility: auto`. — PROOF: stress 100+ rows scroll timing (long-frame count before→after on 4× throttle).
- [ ] L4.2 Skeletons match final layout (no CLS); CLS ≤ 0.05 on top 10 app pages. — PROOF: PerformanceObserver CLS numbers per page.
- [ ] L4.3 Optimistic UI for quick actions where present; images lazy with dimensions. — PROOF: audit list + spot metrics.

## L5 — Real-app proof

- [ ] L5.1 Top-20 pages against hostile fixtures per role. — PROOF: overlap stress full run + ledger rows.
- [ ] L5.2 Lighthouse mobile on 5 app pages (a11y ≥ 95, perf ≥ 80, 4G throttle) — recorded. — PROOF: numbers in RESUME (or SKIPPED with exact blocker).
- [ ] L5.3 axe: zero serious/critical on every page type. — PROOF: axe run output.

## L6 — Closing

- [ ] L6.1 Gates green (or baseline shifts listed): copy-budget, contrast, css-*, stylelint, size, raw-css, icons, motion-tokens. — PROOF: command outputs.
- [ ] L6.2 Typecheck + full frontend unit suite green. — PROOF: command outputs.
- [ ] L6.3 Ledger v2 complete, zero open findings. — PROOF: file + exit codes.
- [ ] L6.4 DELIVERY.md written; branch pushed. — PROOF: `git log origin/agent/r366-web-product`.
