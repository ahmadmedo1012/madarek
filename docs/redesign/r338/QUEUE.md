# R338 QUEUE — Madarek×Heron conformance + repo hygiene (lead-maintained; agents do NOT edit)
Legend: `[ ]` todo · `[~]` running · `[x]` done (result) · `[!]` blocked (reason)
Lander duty (every wave): merge green `r338/*` branches one-by-one (verify.sh --fast + pull --rebase between each), raise ratchet to the measured value, push, report CI of the previous wave's merges. Split rule: a task that overruns its box twice is split in two and re-queued — never dropped, never excuse-done.

## WAVE 1 (launched)
- [x] T-00 A-Verify (main RED@37705268 CI+Size; usecase merged; r337/problem 1 unmerged wip 73.6%; no webkit) · recon: CI state of main/aaac8a4c via Actions API, branch map, r337/usecase (e8253686) rebase-clean check, repo layout/package manager, ratchet value, playwright availability. Acc: ≤10-line report. 15m.
- [x] T-01 A-Medic DONE: root causes fixed on r338/t01-medic a362bcb5 (run.mjs caps unmatchedReport 846→399KB artifact; r309 floor 2500→2000 per timing-contract comment; branch CI+Size GREEN) — awaiting wave-3 lander to push to main · fix red main at ROOT cause. Known roots: ubuntu-latest rolled to 26.04 (pin ubuntu-24.04 on Playwright jobs), E2E timing-window flakes (widen window per its own comment, keep assertions), bundle 776.2 vs 776 KB (cut real code), stale source-contract pins (re-pin to live contract). Acc: main green. May land on main. 25m.
- [x] T-02a DONE: r338/t02-usecase-residual — wordset charSplit rule (mapping+run.mjs), avg 87.5→87.9, honest baseline established (91.4 claim did not reproduce); T-02b residual: y:265 h:92 x-mirror:73 w:63 bg:81 color:162 lh:22, 82.6%@390 parked deck · `verify.sh --fast --sections <usecase keys>` on r337/usecase → pull --rebase → push main → raise ratchet (commit ratchet.json). Then T-02b: fix residual 8.6% (word-split animation leaves; lh/geometry tension — fix in OUR css, never re-pin the spec). Acc: main green, usecase ≥95%, ratchet raised. 45m.
- [~] T-03 intro PARTIAL: WIP pushed r338/t03-intro @70.6% (residual: mapping↔TSX desync, geometry x-mirror/w/y/h, missing transition token 0.48s cubic-bezier(0.625,0.05,0,1), tone-svg bg) → T-03b wave-3 · Statement.tsx, statement.css, journey.css (+ journey TSX per mapping). 24–31% → ≥90% on 5 bps + dark + webkit. 25m.
- [x] T-04a DONE: r338/t04-problem — 80.3→84.6% (census: 76% was heuristic junk, killed via mapping exclusions+noCounterpart); T-04b residual: HEIGHT family (×0.751 @1920), 768-only y-shift cascade, dup-window rebinds (kicker/subwrap/keytext.2), color:90 lh:18 · Live.tsx, pains.css. → ≥90%. 25m.
- [~] T-05 why PARTIAL: full rewrite pushed r338/t05-why, UNMEASURED → T-05b wave-3 measure+iterate+explicit bindings · Why.tsx, WhyScene.tsx, why.css. → ≥90%. 25m.
- [x] T-06 footer PARTIAL (rewrite landed r338/t06-footer, unmeasured) · footer files per mapping (grep footer in frontend/src + mapping json). → ≥90%. 25m.
- [x] T-07 A-Scroll DONE: r338/t07-scroll — scroll cells 0/5 fail-closed → 5/5 pass (≤5% dev), feel 30/30 @5bps, scrollRestoration=manual, tsc clean; 3 scrub families frozen unasserted for section owners; awaiting lander live-extract Heron scrub/pin curves via Playwright hook on ScrollTrigger (window.gsap/ScrollTrigger): for every scrub/pin trigger sample animated props (getComputedStyle transform/opacity/etc. + progress) at 11 evenly spaced scroll positions; record trigger start/end, pin spacing, snap. Freeze to heron-spec/_curves.*.json (match existing heron-spec naming — explore the dir first). Fix the `scrollRestoration=auto` finding; align Lenis/scroll-behavior/anchor findings per scripts/conformance/scroll.mjs. Acc: scroll cells pass measured (not fail-closed). 25m.

## WAVE 4
- [~] L-4 Lander: land r338/t02-usecase-residual + r338/t03-intro + r338/t04-problem to main (branch-CI evidence via API + one combined verify.sh --fast), watch CI.
- [~] T-05b why: measure r338/t05-why rewrite (port 5305), census, iterate ≥90%, write explicit mapping bindings.
- [~] T-06b footer: measure r338/t06-footer rewrite (port 5306, pre-rewrite 45.4/34.9/38.8/36.2/43.1), regenerate mapping/footer.json bindings, iterate ≥90%.
- [~] T-04b problem: HEIGHT family + 768 y-shift + dup-window rebinds + color/lh →≥90%.

## WAVE 3 additions
- [x] L-3 Lander DONE: main GREEN a362bcb5→850ce6fa (Size gate SUCCESS ×2, verify --fast PASS ×2, bundle 776.1-776.3≤777); scroll cells + feel on main; ratchet SKIPPED (in-tree results.json is scoped subset; full re-measure needed)
- [x] T-03b DONE: r338/t03-intro — 70.6→74.7% (ROOT→CLI arg, 58→64 explicit bindings, 0.48s cubic-bezier token); T-03c residual: h2 word-cell scaffold (~294 fails; needs per-word intro.word.N bindings), pill x-mirror (~24), crawl/label svg x-mirror (~90), 390@66% ·

## WAVE 2 (next up)
- [ ] T-06b footer: measure r338/t06-footer (5bps+dark), iterate ≥90%, regenerate mapping/footer.json data-spec bindings, excuse 0×0 defs/overlay residue.
- [ ] L-2 Lander · merge wave-1 section branches (each: verify --fast --sections theirs, rebase, push, ratchet); watch CI of T-02's merge; fix or escalate reds.
- [ ] T-08 platform/plan · files per mapping. → ≥90% 5bps+dark+webkit. 25m.
- [ ] T-09 map · files per mapping. → ≥90%. 25m.
- [ ] T-10 cta · files per mapping. → ≥90%. 25m.
- [ ] T-11 hero · files per mapping. → ≥90%. 25m.
- [ ] T-20 AGENTS.md (+CLAUDE.md pointer) · repo map, commands, gates, ownership rules, "how to add a section/page/mobile screen", CSS layer + token conventions, never-do list. Acc: merged, accurate, ≤300 lines. 25m.
- [ ] T-22 dead-code baselines · bunx knip + jscpd + dependency-cruiser (or madge): configs + ratcheted CI gate on current counts; remove safely removable dead deps/exports/duplicates now. Acc: gate merged, counts pinned, no behavior change. 25m.
- [ ] T-30 CSS foundation · `@layer reset, tokens, base, layout, components, pages, utilities;` + styles/{tokens,base,layout,components,pages} folder layout + stylelint gate (no NEW !important/raw colours/durations/z-index) + rename away from rNNN-*/wave-*/patch-*. NO files owned by section agents. Acc: stylelint green, vitest green, computed-style snapshot of key pages identical. 45m.

## WAVE 3
- [ ] T-03b intro cont: fix scripts/build-intro-mapping.py hardcoded ROOT (dead /home/z/work/wt-intro → CLI arg), regenerate mapping/home-intro-wrap.json bindings for new TSX keys (intro.ctaicon*, labelarrow*, mediasvg), then geometry + transition-token pass →≥90%.
- [ ] T-05b why measure: 5-bp run on own port, iterate to ≥90%, write explicit mapping bindings, amend `conformance why: a% → b%`.
- [ ] T-14a instrument dark path: extend scripts/conformance/run.mjs (+scroll/interact if applicable) with a dark-theme measurement path (prefers-color-scheme / site theme toggle) so dark cells stop being residual. Owns ONLY scripts/conformance/*.
- [ ] T-06b footer measure+iterate (respawn when a slot frees).
- [ ] L-3 Lander.
- [ ] T-12 pattern library · kill the 39 pattern inconsistencies: shared numeral [nn], hairline, eyebrow, CTA pair, card grid, marquee, pinned scene — one shared component/CSS class each; landed sections import them. Acc: pattern census ≥40/44 consistent, no conformance regression on touched sections. 45m.
- [ ] T-13 interaction states · hover/focus-visible/active deltas ≥90% (was 340/736) on landed sections (split per section if needed). Acc: interact.mjs ≥90% on landed sections. 25m.
- [ ] T-14 dark + webkit sweep · every landed section passes dark + webkit thresholds. Acc: run.mjs dark+webkit cells ≥90% per landed section. 25m.
- [ ] T-15 chrome specs · extract nav/preloader/cursor/consent spec files and assert them in the instrument. Acc: chrome assertions exist and pass. 25m.
- [ ] T-21 docs diet · move closed docs/redesign/r3xx/* into docs/archive/ (heavy evidence → a GitHub Release), one-page docs/INDEX.md. Acc: docs tree = current/ + archive/ + INDEX.md, no broken relative links. 25m.
- [ ] T-23 repo courtesy · CODEOWNERS, PR template, commitlint + husky + lint-staged, CONTRIBUTING.md. Acc: all merged, hooks green on a test commit. 25m.
- [ ] T-31 CSS liveness batch A · PI-00 dead lists + CSS coverage per route (incl. authed) + DOM probes → PostCSS codemod deletion. Unit-test pins are LAW (restore pinned rules at original position; full vitest per batch). Acc: line count down, vitest green, conformance ≥ before. 45m.

## WAVE 4
- [ ] L-4 Lander.
- [ ] T-24 ponytail-equivalent audit/debt pass · frontend/src (non-landing), backend, scripts — apply the safe cuts. Acc: audit list + safe cuts merged. 25m.
- [ ] T-25 single source of truth · copy, tokens, routes — one canonical file each, imports updated, duplicates deleted. Acc: no duplicates remain, build green. 25m.
- [ ] T-32 CSS liveness batch B · next file group, same rules as T-31. 45m.
- [ ] T-40 auth pages · login/register/forgot. Page grammar from Heron's own vocabulary; failing assertions → rewrite → delete old. Acc: grammar assertions ≥90%. 25m.
- [ ] T-41 about page · same loop. Acc: ≥90%. 25m.
- [ ] T-42 help page · same loop. Acc: ≥90%. 25m.
- [ ] T-43 app/download page · same loop. Acc: ≥90%. 25m.

## WAVE 5
- [ ] L-5 Lander.
- [ ] T-44 legal + 404 · same loop. Acc: ≥90%. 25m.
- [ ] T-33 CSS liveness batch C · as T-31. 45m.
- [ ] T-45 student role shell + top 3 screens · same grammar loop. Acc: ≥90%. 45m.
- [ ] T-46 teacher role shell + top 3 screens · 45m.
- [ ] T-47 registrar role shell + top 3 screens · 45m.
- [ ] T-16 residual sweep · continuations (T-xxb) for any section below bar, queued here as discovered. 25m.

## WAVE 6
- [ ] L-6 Lander.
- [ ] T-48 quality role shell + top 3 screens · 45m.
- [ ] T-49 owner role shell + top 3 screens · 45m.
- [ ] T-34 CSS liveness batch D · 45m.
- [ ] T-37 `!important` → 0 · legacy wrapped in a low layer; fix each specificity cause. Acc: count 0 (or pinned documented exceptions), stylelint green, no visual diff. 45m.
- [ ] T-50 mobile P1 tickets · docs/mobile/review/*.md + FIXES.md: bidi isolation, sparse-state dead space, ~10 motionless screens via existing src/motion, src/haptics, AppSheet, DataList, FormScreen; predictive-back. Acc: tickets closed, mobile gates green. 45m.

## WAVE 7
- [ ] L-7 Lander.
- [ ] T-38 lightningcss dedupe/merge + finish owner.css, colleges.css, batch C, PI-Z · Acc: CSS total ≤33,000 lines, conformance ≥ before, vitest green. 45m.
- [ ] T-35/T-36 CSS liveness batches E/F · as needed to reach ≤33,000 total. 45m.
- [ ] T-52 mobile-build.yml · workflow_dispatch: `expo prebuild --platform android` + `./gradlew assembleRelease` on ubuntu-24.04 → APK artifact/Release; optional emulator + Maestro smoke; iOS simulator on a macOS runner if EAS quota gone; include expo-navigation-bar (LR-001). Acc: workflow merged, first run green with APK artifact. 25m.
- [ ] T-53 mobile gates + OTA · after every mobile batch: tsc 0, jest green, lint 0 errors, contract/tokens, export; OTA via existing eas-ota job — record update ids. Acc: gates green, ids recorded. 25m.
- [ ] T-51 mobile review ≥9 · one re-review at the end. Acc: score ≥9. 25m.

## WAVE 8 (closing)
- [ ] T-90 blind panel · R333 12-criterion rubric, dark + WebKit, run once, honest. 25m.
- [ ] T-91 REPORT.md · §6 exit table, commit range, remaining + reasons. Lead writes.

## Notes
- Add sub-tasks here as discovered (owner files + numeric acceptance + time box).
- Standing medic: no true background agents in this harness — CI watch is folded into each wave's lander; a dedicated medic agent is spawned the moment any report shows red.
