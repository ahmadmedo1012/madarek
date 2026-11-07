# W9-MAP — the map section: passRate 91 hold + coverage 12.5→≥40 + heur 90.9→<50 (binding + geometry)

Worktree `/home/z/wt/sec-map`, branch `wip/sec-map`, dev port **5326**: `cd /home/z/wt/sec-map/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5326 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + math (same discipline, this section). Mapping: `scripts/conformance/mapping/home-map-wrap.json`.

## Current state (queen-measured 2026-11-07, scoped light run @1440+390)
- passRate 91% @1440+390 (borderline — floor 90)
- coverage 12.5% (floor 40) · off-book 87.5% (cap 70) · skip 376 · excused 680×12
- **heur 90.9% (cap 50!)** — junk pairing: the heuristic pairs are dominating; explicit bindings must replace them

## Mission (small committed steps — one binding batch at a time)
1. **passRate first** — work the failing checks: read the failure list in `scripts/conformance/results/chromium-*-sections-home-map-wrap*.json`; group by family; fix our seats toward the measured spec (`scripts/spec/_page.{1440,390}.json` — measured parameters only, OUR ink/paper/orange language, never Heron assets/copy). Re-run per family: `node scripts/conformance/run.mjs --url http://localhost:5326 --sections home-map-wrap --bps 1440,390` (+`--dark`). Keep every currently-green cell green.
2. **Coverage second (12.5→≥40)** — BIND-FIRST: bind our EXISTING DOM to the spec's elements via `explicit[]`; un-skip field groups where counterparts carry the fields (skip 376 is the lever); retire excusal families as they become real.
3. Keep panel.mjs deadVoid/hClip at 0 (scroll-probe); keep every r3xx pin (tests are law).

## Owns (exclusive)
`frontend/src/styles/landing/map.css` · the map section components · `scripts/conformance/mapping/home-map-wrap.json`.

## Laws
§0: nothing gets worse · tests are law · tokens only · NO !important · measured parameters only · commit ≤5 min AND `git push -u origin wip/sec-map` after every commit (the branch IS the report; final messages often don't arrive). Incremental verification — never batched. Final: `bash scripts/verify.sh --fast > /tmp/sec-map-verify.log 2>&1; echo $?` (NEVER piped).

## Report ≤10 lines
passRate @1440+390 l+d before→after · coverage/off-book before→after · d/h counts · commits · verify exit.
