# W7-H1C — hero: pointer-events REAL BUG + edge gutters + wrappers/annotations binding

Worktree `/home/z/wt/h1c`, branch `wip/h1c` (at merged main). Dev port **5311**: `cd /home/z/wt/h1c/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5311 --strictPort &` (kill when done).

**Read first:** `docs/redesign/r341/tasks/H1.md` (the full law: BIND-FIRST + math). H1-a (grid, 92) + H1-b (chrome, 89) DONE. State @1440: passRate 97.6/93.9 l+d, coverage 53.5%, **off-book 46.5%**, heur 16.7%. Remaining excused: **87-element wrapper/annotation family** (.hro-art/.bp-stage/.hro-content frame) + ~401 plumbing skips. CI: origin main's conformance gate FAILS panel axes for home-hero-wrap — this work clears it.

## Do in this order
### 1. L2-a REAL BUG (small, first)
`.hro-art`/`.bp-svg` decorative layers intercept CTA pointer events ≤768px (elementFromPoint-measured; links unhittable on tablet/phone). Add `pointer-events: none` to the intercepting decorative seats, PRESERVING the r305 inspect-cursor gates (`components/landing/cursor/HeroInspect.tsx`).
- Owns `styles/landing/hero.css` + `hero-mechanics.css`.
- Queen-authorized exception: same classes in `styles/landing/journey.css` + `strata.css` — minimal pointer-events lines there if they intercept too (note in commit).
- Proof: /tmp playwright elementFromPoint on the primary CTA @768+390 before→after (CTA must be the hit target).

### 2. Hero edge clipping (judge)
"H1 clipped at right viewport edge ~0px" @1440 · "index strip [01]–[05] ~8px from edge" · "mobile [01][02] cut off at right edge" @390 → ≥20px (target 32px) gutters. Probe bboxes vs viewport before/after.

### 3. H1-c wrappers/annotations (main dish)
Bind EXISTING hero DOM (HTML + SVG internals) to Heron's excused wrapper/annotation elements via `explicit[]` in `scripts/conformance/mapping/home-hero-wrap.json` (no tag constraint; any our-selector → any heron-path). Build counterparts ONLY where genuinely missing — geometry/colour from `scripts/spec/_page.{1440,390}.json`, transformed to OUR ink/paper/orange language (never paste Heron source/text/images). Retire the excusal family as nodes become real. Target: **off-book 46.5% → ≤20%** (final ≤5% is next wave's H1-d un-skip pass — don't force it).
Judge also measured "9–11px illegible Arabic annotations over hero grid" — annotation text ends ≥11px AA.

## Owns (exclusive)
`scripts/conformance/mapping/home-hero-wrap.json` · `frontend/src/components/landing/hero/**` · `frontend/src/styles/landing/hero*.css` (+ the minimal journey/strata exception).

## Method
Baseline: `node scripts/conformance/run.mjs --url http://localhost:5311 --sections home-hero-wrap --bps 1440,390` (+`--dark`). Commit after each part; re-run section check per binding batch. Excusal families: mapping file + `scripts/conformance/results/chromium-*-sections-home-hero-wrap*.json` → unmatchedReport. Finish: `bash scripts/verify.sh --fast > /tmp/h1c-verify.log 2>&1; echo $?` (NEVER piped).

## Laws
passRate ≥90 kept · coverage ≥40% kept · dark + 390 kept · tests are law (r305 cursor + r312 hero pins — reconcile code, never tests) · tokens only · NO !important · measured parameters only · commit ≤5 min; push after first commit `git push -u origin wip/h1c` and after each commit. Do NOT merge to main. Bundle ≤770 — keep additions lean (CSS vars for repeated values).

## Report ≤10 lines
elementFromPoint before→after @768+390 · gutter px before→after · passRate/coverage/off-book/heur before→after @1440 l+d · files · commits · verify result.
