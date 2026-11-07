# R339 QUEUE — close the feel gap, demolish CSS, rebuild the rest (lead-maintained; agents do NOT edit)
Legend: `[ ]` todo · `[~]` running · `[x]` done (result) · `[!]` blocked (reason)
Rules in force: ≤4 heavy agents; each = own worktree + port 53NN + `run.mjs --url`; commit+push ≤10 min; `verify.sh --fast` before every source push; tests are law; never raise a ceiling/re-pin/weaken; CI is owner-dead (local verify = evidence); avoid branch names matching `r338/t13*` (ruleset). A task that overruns its box twice is split, never dropped.

## P0 — housekeeping (runs first; nothing waits on T-00)
- [x] T-00 DONE · 74→4 remote branches, 72 archive tags pushed + branches deleted, 0 cherry-picks (all superseded; t99c landed as dd0fd5c4), disposition table T-00-TRIAGE.md, worktrees pruned.
- [x] T-01 DONE · baseline verify green (3051 tests, 764.3 KB gz), ceiling restored 777→770 (c8a61806), OWNER-NOTE.md written.
- [x] T-02 DONE · audit: hero 94.8% off-book, overall ≈77% off-book, heur 18%; 5 anti-gaming fixes + 438 dead letters landed; footer honest 92.3→87.9 same code. → spawned T-02b hardening (wave 2).
- [x] T-15 DONE · WebKit LAUNCHES user-space (14 debs, webkit-libs.sh); footer webkit 90.8% ≈ chromium 90.7%; --engine webkit landed. Engine of record stays chromium.
- [~] T-02b instrument hardening (wave 2) · owns run.mjs: coverage% per section beside passRate + coverage floor gate (≥40%); off-book cap (<70% w/ listed review); heuristic-share cap per section; per-section results artifacts (scripts/conformance/results/); all-nodes dark-contrast check (--dark: every text node ≥4.5:1); 390 side-margin assertion; honest chunked full-matrix re-baseline + ratchet re-pin proposal (downward re-pin = instrument honesty correction, documented).

## P1 — close the feel gap (blind panel 66/84 → ≥74)
- [~] T-10 chrome specs (wave 2) · nav/preloader/cursor/consent spec files extracted from Heron, asserted in instrument (row is 0/0 today). Acc: chrome assertions exist + pass. 45m.
- [~] T-11a tween-coverage metric + our tween inventory (wave 2; owns NEW scripts/conformance/tween.mjs) · recorded Heron tweens vs ours: target/property/distance/duration/ease/trigger/stagger; produce per-section missing-tween work-list. T-11b (implement) next wave.
- [~] T-12+T-13 feel-gap CSS fixes (wave 2, one agent) · dark-mode ink: every text node ≥4.5:1 in dark (fix out-of-cell inks problem/platform/log/…) + 390px edge margins 7–8px → Heron measured side margin on all sections. Acc: 0 dark text fails, 390 margins conformed.
- [ ] T-14 pattern library + census · numeral [nn], hairline, eyebrow, CTA pair, card grid, marquee, pinned scene — one shared component/CSS class each; sections import them; census 39→≤5 inconsistencies. PREREQ for P3 + main CSS-shrink lever. 60m.
- [ ] T-16 mini blind panel (after T-10..T-13) · ONE run, target ≥74/84, no criterion <8. 20m.

## P2 — Track C: CSS demolition (2 agents; 45,467 → ≤33,000 lines, !important 109 → 0)
- [ ] T-30 layers + stylelint · `@layer reset, tokens, base, layout, components, pages, utilities;` + styles/{tokens,base,layout,components,pages} + stylelint gate (no new !important/raw colours/durations/z-index) + rename away rNNN-/wave-/patch-. Acc: stylelint green, vitest green, computed-style snapshot identical. 60m.
- [ ] T-31 liveness batch A · PI-00 dead lists + CSS coverage per route (public AND authed) + DOM probes → PostCSS codemod deletion; unit pins restored at original position; full vitest per batch. Acc: lines down, conformance ≥, vitest green. 60m.
- [ ] T-32 liveness batch B · next file group, same rules. 60m.
- [ ] T-33 collapse onto T-14 patterns · each section's CSS gets a line budget; claw back the ~2k lines the rewrites added. 60m.
- [ ] T-34 !important → 0 · layer ordering + fix each specificity cause. 45m.
- [ ] T-35 lightningcss dedupe/merge · owner.css, colleges.css, batch C, PI-Z. 45m.

## P3 — Track D: inner + authed pages (2 agents, after T-14)
- [ ] T-40 auth pages · login/register/forgot · spec → failing assertions → rewrite → delete old CSS. Per-page conformance row ≥90. 60m.
- [ ] T-41 about · same loop. 60m.
- [ ] T-42 help · same loop. 60m.
- [ ] T-43 app/download · same loop. 60m.
- [ ] T-44 legal/404 · same loop. 60m.
- [ ] T-45..49 role shells + top-3 screens · student, teacher, registrar, quality, owner. 60m each.

## P4 — Track E: mobile (2 agents, apps/mobile/** only)
- [ ] T-50 P1 tickets · docs/mobile/review/*.md + FIXES.md: bidi isolation, sparse-state dead space, ~10 motionless screens via src/motion/src/haptics/AppSheet/DataList/FormScreen, predictive-back. Acc: review ≥9. 60m.
- [ ] T-51 Android local build · scripts/build-android-local.sh + docs/mobile/ANDROID-LOCAL.md (prebuild + gradle assembleRelease, own keystore, eas build --local variant); try in sandbox if SDK fetches through allowlist; expo-navigation-bar (LR-001). 60m.
- [ ] T-52 mobile gates + OTA · tsc 0, jest green, lint 0, contract/tokens, export; `eas update` from sandbox (Actions dead), record ids. 45m.

## P5 — hygiene leftovers
- [ ] T-23 repo courtesy · CODEOWNERS, PR template, commitlint+husky+lint-staged, CONTRIBUTING refresh. 30m.
- [ ] T-25 single source of truth · copy/tokens/routes — one canonical file each. 45m.
- [ ] T-24 ponytail audit · non-landing frontend/src, backend, scripts — safe cuts applied; keep knip/jscpd/depcruise ratcheting down. 45m.

## Lander duty (lead, every wave)
Merge green `r339/*` branches one-by-one (verify.sh --fast + pull --rebase between each), raise ratchet only on measured chunked-matrix values, push, log in HANDOFF.md.
