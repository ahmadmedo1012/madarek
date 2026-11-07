# W9-INTRO — the intro section: passRate 97/98 hold + coverage 22.6→≥40 (binding + geometry)

Worktree `/home/z/wt/sec-intro`, branch `wip/sec-intro`, dev port **5325**: `cd /home/z/wt/sec-intro/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5325 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + math (same discipline, this section). Mapping: `scripts/conformance/mapping/home-intro-wrap.json`.

## Current state (queen-measured 2026-11-07, scoped light run @1440+390)
- passRate 98% @1440 · 97% @390 (GREEN, floor 90 — keep it)
- coverage 22.6% (floor 40) · off-book 77.4% (cap 70) · skip 1234 · excused 798×12
- heur 0.6% ✓ (explicit binding proven achievable here — intro was the exemplar)

## Mission (small committed steps — one binding batch at a time)
1. **passRate first** — work the failing checks: read the failure list in `scripts/conformance/results/chromium-*-sections-home-intro-wrap*.json`; group by family; fix our seats toward the measured spec (`scripts/spec/_page.{1440,390}.json` — measured parameters only, OUR ink/paper/orange language, never Heron assets/copy). Re-run per family: `node scripts/conformance/run.mjs --url http://localhost:5325 --sections home-intro-wrap --bps 1440,390` (+`--dark`). Keep every currently-green cell green.
2. **Coverage second (22.6→≥40)** — BIND-FIRST: bind our EXISTING DOM to the spec's elements via `explicit[]`; un-skip field groups where counterparts carry the fields (skip 1234 is the lever); retire excusal families as they become real.
3. Keep panel.mjs deadVoid/hClip at 0 (scroll-probe); keep every r3xx pin (tests are law).

## Owns (exclusive)
`frontend/src/styles/landing/intro.css` · the intro section components (`components/landing/sections/*Intro*`) · `scripts/conformance/mapping/home-intro-wrap.json`.

## Laws
§0: nothing gets worse · tests are law · tokens only · NO !important · measured parameters only · commit ≤5 min AND `git push -u origin wip/sec-intro` after every commit (the branch IS the report; final messages often don't arrive). Incremental verification — never batched. Final: `bash scripts/verify.sh --fast > /tmp/sec-intro-verify.log 2>&1; echo $?` (NEVER piped).

## Report ≤10 lines
passRate @1440+390 l+d before→after · coverage/off-book before→after · d/h counts · commits · verify exit.
