# W9-PROBLEM — the problem section: passRate 85→≥90 @390 + coverage 14.7→≥40 (binding + geometry)

Worktree `/home/z/wt/sec-problem`, branch `wip/sec-problem`, dev port **5327**: `cd /home/z/wt/sec-problem/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5327 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + math (same discipline, this section). Mapping: `scripts/conformance/mapping/home-problem-wrap.json`.

## Current state (queen-measured 2026-11-07, scoped light run @1440+390)
- passRate 96% @1440 · **85% @390 (BELOW floor!)**
- coverage 14.7% (floor 40) · off-book 85.3% (cap 70) · skip 16 · excused 636×12
- heur 2.7% ✓

## Mission (small committed steps — one binding batch at a time)
1. **passRate first** — work the failing checks: read the failure list in `scripts/conformance/results/chromium-*-sections-home-problem-wrap*.json`; group by family; fix our seats toward the measured spec (`scripts/spec/_page.{1440,390}.json` — measured parameters only, OUR ink/paper/orange language, never Heron assets/copy). Re-run per family: `node scripts/conformance/run.mjs --url http://localhost:5327 --sections home-problem-wrap --bps 1440,390` (+`--dark`). Keep every currently-green cell green.
2. **Coverage second (14.7→≥40)** — BIND-FIRST: bind our EXISTING DOM to the spec's elements via `explicit[]`; un-skip field groups where counterparts carry the fields (skip 16 is the lever); retire excusal families as they become real.
3. Keep panel.mjs deadVoid/hClip at 0 (scroll-probe); keep every r3xx pin (tests are law).

## Owns (exclusive)
`frontend/src/styles/landing/problem.css` (or pains.css — check which seats the section) · the problem section components · `scripts/conformance/mapping/home-problem-wrap.json`.

## Laws
§0: nothing gets worse · tests are law · tokens only · NO !important · measured parameters only · commit ≤5 min AND `git push -u origin wip/sec-problem` after every commit (the branch IS the report; final messages often don't arrive). Incremental verification — never batched. Final: `bash scripts/verify.sh --fast > /tmp/sec-problem-verify.log 2>&1; echo $?` (NEVER piped).

## Report ≤10 lines
passRate @1440+390 l+d before→after · coverage/off-book before→after · d/h counts · commits · verify exit.
