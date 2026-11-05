# R338 QUEUE — Madarek×Heron conformance + repo hygiene (lead-maintained; agents do NOT edit)
Legend: `[ ]` todo · `[~]` running · `[x]` done (result) · `[!]` blocked (reason)
Lander duty (every wave): merge green `r338/*` branches one-by-one (verify.sh --fast + pull --rebase between each), raise ratchet to the measured value, push, report CI of the previous wave's merges. Split rule: a task that overruns its box twice is split in two and re-queued — never dropped, never excuse-done.

## WAVE 1 (launched)
- [~] T-00 A-Verify · recon: CI state of main/aaac8a4c via Actions API, branch map, r337/usecase (e8253686) rebase-clean check, repo layout/package manager, ratchet value, playwright availability. Acc: ≤10-line report. 15m.
- [~] T-01 A-Medic · fix red main at ROOT cause. Known roots: ubuntu-latest rolled to 26.04 (pin ubuntu-24.04 on Playwright jobs), E2E timing-window flakes (widen window per its own comment, keep assertions), bundle 776.2 vs 776 KB (cut real code), stale source-contract pins (re-pin to live contract). Acc: main green. May land on main. 25m.
- [~] T-02 Lander + usecase residual · `verify.sh --fast --sections <usecase keys>` on r337/usecase → pull --rebase → push main → raise ratchet (commit ratchet.json). Then T-02b: fix residual 8.6% (word-split animation leaves; lh/geometry tension — fix in OUR css, never re-pin the spec). Acc: main green, usecase ≥95%, ratchet raised. 45m.
- [~] T-03 intro · Statement.tsx, statement.css, journey.css (+ journey TSX per mapping). 24–31% → ≥90% on 5 bps + dark + webkit. 25m.
- [~] T-04 problem/pains · Live.tsx, pains.css. → ≥90%. 25m.
- [~] T-05 why · Why.tsx, WhyScene.tsx, why.css. → ≥90%. 25m.
- [~] T-06 footer · footer files per mapping (grep footer in frontend/src + mapping json). → ≥90%. 25m.
- [~] T-07 A-Scroll · live-extract Heron scrub/pin curves via Playwright hook on ScrollTrigger (window.gsap/ScrollTrigger): for every scrub/pin trigger sample animated props (getComputedStyle transform/opacity/etc. + progress) at 11 evenly spaced scroll positions; record trigger start/end, pin spacing, snap. Freeze to heron-spec/_curves.*.json (match existing heron-spec naming — explore the dir first). Fix the `scrollRestoration=auto` finding; align Lenis/scroll-behavior/anchor findings per scripts/conformance/scroll.mjs. Acc: scroll cells pass measured (not fail-closed). 25m.

## WAVE 2 (next up)
- [ ] L-2 Lander · merge wave-1 section branches (each: verify --fast --sections theirs, rebase, push, ratchet); watch CI of T-02's merge; fix or escalate reds.
- [ ] T-08 platform/plan · files per mapping. → ≥90% 5bps+dark+webkit. 25m.
- [ ] T-09 map · files per mapping. → ≥90%. 25m.
- [ ] T-10 cta · files per mapping. → ≥90%. 25m.
- [ ] T-11 hero · files per mapping. → ≥90%. 25m.
- [ ] T-20 AGENTS.md (+CLAUDE.md pointer) · repo map, commands, gates, ownership rules, "how to add a section/page/mobile screen", CSS layer + token conventions, never-do list. Acc: merged, accurate, ≤300 lines. 25m.
- [ ] T-22 dead-code baselines · bunx knip + jscpd + dependency-cruiser (or madge): configs + ratcheted CI gate on current counts; remove safely removable dead deps/exports/duplicates now. Acc: gate merged, counts pinned, no behavior change. 25m.
- [ ] T-30 CSS foundation · `@layer reset, tokens, base, layout, components, pages, utilities;` + styles/{tokens,base,layout,components,pages} folder layout + stylelint gate (no NEW !important/raw colours/durations/z-index) + rename away from rNNN-*/wave-*/patch-*. NO files owned by section agents. Acc: stylelint green, vitest green, computed-style snapshot of key pages identical. 45m.

## WAVE 3
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
