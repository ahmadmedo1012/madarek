# R339 QUEUE — close the feel gap, demolish CSS, rebuild the rest (lead-maintained; agents do NOT edit)
Legend: `[ ]` todo · `[~]` running · `[x]` done (result) · `[!]` blocked (reason)
Rules in force: ≤4 heavy agents; each = own worktree + port 53NN + `run.mjs --url`; commit+push ≤10 min; `verify.sh --fast` before every source push; tests are law; never raise a ceiling/re-pin/weaken; CI is owner-dead (local verify = evidence); avoid branch names matching `r338/t13*` (ruleset). A task that overruns its box twice is split, never dropped.

## P0 — housekeeping (runs first; nothing waits on T-00)
- [~] T-00 branch triage & cleanup · tag `archive/<branch>` + push for EVERY unmerged origin branch, then delete; merge-tree no-op check; review real source deltas (statement.css +44, roles.css +17, strata.css +4, WhyScene/Why +4/+12, t99b App/Auth/Error, t99br AppShell/Topbar/Footer, t99c ~+1k Footer/why) — cherry-pick only what still improves a number (verify + conformance cell), document the rest; prune worktrees. Acc: 0 stale branches, deltas dispositioned. 60m.
- [~] T-01 A-Medic (standing) · restore bundle ceiling 777→770 (dedicated commit, real size 764); verify.sh --fast green on fresh sandbox baseline; one-page owner note (Actions quota + ruleset + WebKit libs) → docs/redesign/r339/OWNER-NOTE.md. Acc: ceiling commit on main, note linked from HANDOFF. 25m.
- [~] T-02 instrument audit · per-section excusal rate (cap 5%), no-counterpart count, heuristic-vs-explicit mapping ratio from scripts/conformance/mapping/*.json + results.json; flag anything gaming the metric. Acc: audit table in docs/redesign/r339/T-02-AUDIT.md. 25m.
- [~] T-15 WebKit user-space · apt-get download libgtk-4/libGLESv2/libwoff2dec .debs → dpkg -x prefix → LD_LIBRARY_PATH → point Playwright webkit at it; if still blocked, document + move on. Acc: webkit cells passing or documented block. 30m.

## P1 — close the feel gap (blind panel 66/84 → ≥74)
- [ ] T-10 chrome specs · nav/preloader/cursor/consent spec files extracted from Heron, asserted in instrument (row is 0/0 today). Acc: chrome assertions exist + pass. 45m.
- [ ] T-11 motion richness · tween-coverage metric (recorded Heron tweens vs ours: target/property/distance/duration/ease/trigger/stagger, ≥90%) then implement missing tweens per section on house reveal engine / WAAPI / CSS animation-timeline. Bundle ≤770. 60m.
- [ ] T-12 dark-mode ink · all-nodes dark contrast ≥4.5:1 (text) check in matrix; fix every out-of-cell ink (problem/platform/log…). Acc: 0 dark text fails site-wide. 45m.
- [ ] T-13 390px edge margins · 7–8px → Heron measured side margin on all sections; add to assertions. 30m.
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
