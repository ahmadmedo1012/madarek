# W9-HERO — H1-c(a) wrappers/annotations binding + H1-d un-skip finish (off-book 46.5 → ≤5)

Worktree `/home/z/wt/h1c2`, branch `wip/h1c2`, dev port **5311**: `cd /home/z/wt/h1c2/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5311 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + the math + the H1-c/H1-d sub-task definitions. Parts (b) pointer-events + (c) edge gutters are DONE (merged — hero-mechanics.css carries them; keep them).

## State (queen-measured 2026-11-07)
Hero @1440: passRate 98/94 l+d, coverage **53.5%** (floor 40 ✓), off-book **46.5%** (target ≤5), heur 16.7% ✓. Remaining excused: the **87-element layout wrapper/annotation family** (.hro-art/.bp-stage/.bp-content frame + census-truncated wrapper/annotation nodes) + **~462 plumbing skips** (the off-book lever).

## Mission (small committed steps)
1. **H1-c(a) wrappers/annotations:** bind our EXISTING hero DOM (HTML seats + SVG internals — wrappers, annotation labels, frame chrome) to the 87 excused spec elements via `explicit[]` in `scripts/conformance/mapping/home-hero-wrap.json` (no tag constraint). Build counterparts ONLY where genuinely missing — geometry/colour from `scripts/spec/_page.{1440,390}.json`, OUR ink/paper/orange language. Retire the excusal family as nodes become real. Arabic annotation text ≥11px AA (the judge's illegible-annotations finding).
2. **H1-d un-skip finish:** cut the ~462 plumbing skips where our counterparts now carry the fields — every suppressed check counts toward off-book; un-skip as fields become honest. Target: off-book ≤5%, coverage stays ≥40 (it will RISE), passRate ≥90 kept @1440+390 l+d, heur <50.
3. Sanity: `node scripts/conformance/pages.mjs`-style probe on `/` hero region + `bash scripts/verify.sh --fast > /tmp/h1c2-verify.log 2>&1; echo $?` (NEVER piped).

## Owns (exclusive)
`scripts/conformance/mapping/home-hero-wrap.json` · `frontend/src/components/landing/hero/**` · `frontend/src/styles/landing/hero*.css`.

## Laws
§0: nothing gets worse (passRate ≥90, coverage ≥40, dark + 390 kept) · tests are law (r305 cursor pins, r312 hero pins) · tokens only · NO !important · measured parameters only · commit ≤5 min AND `git push -u origin wip/h1c2` after every commit (the branch IS the report; final messages often don't arrive). Incremental verification. Bundle ≤770 (CSS vars for repeated values).

## Report ≤10 lines
off-book/coverage/passRate/heur before→after @1440 l+d (+390) · bindings added · skips cut · commits · verify exit.
