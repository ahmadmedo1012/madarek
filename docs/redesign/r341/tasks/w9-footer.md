# W9-FOOTER — the footer section: passRate 84→≥90 @390 + coverage 19→≥40 (binding + geometry)

Worktree `/home/z/wt/sec-footer`, branch `wip/sec-footer`, dev port **5328**: `cd /home/z/wt/sec-footer/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5328 --strictPort &`.

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + math (same discipline, this section). Mapping: `scripts/conformance/mapping/home-footer.json`.

## Current state (queen-measured 2026-11-07, scoped light run @1440+390)
- passRate 90% @1440 · **84% @390 (BELOW floor!)**
- coverage 19% (floor 40) · off-book 81% (cap 70) · skip 298 · excused 680×12
- heur 37.2% ✓ (under 50 but high)
- d=54 h=37 @390 — dead-void/hClip counts to chase
- NOTE: L2-c fixed the footer collisions (panel 63/0) and L2-e added the account-pair affordance — keep both

## Mission (small committed steps — one binding batch at a time)
1. **passRate first** — work the failing checks: read the failure list in `scripts/conformance/results/chromium-*-sections-home-footer*.json`; group by family; fix our seats toward the measured spec (`scripts/spec/_page.{1440,390}.json` — measured parameters only, OUR ink/paper/orange language, never Heron assets/copy). Re-run per family: `node scripts/conformance/run.mjs --url http://localhost:5328 --sections home-footer --bps 1440,390` (+`--dark`). Keep every currently-green cell green.
2. **Coverage second (19→≥40)** — BIND-FIRST: bind our EXISTING DOM to the spec's elements via `explicit[]`; un-skip field groups where counterparts carry the fields (skip 298 is the lever); retire excusal families as they become real.
3. Keep panel.mjs deadVoid/hClip at 0 (scroll-probe); keep every r3xx pin (tests are law).

## Owns (exclusive)
`frontend/src/styles/landing/footer.css` · `components/landing/sections/Footer.tsx` · `scripts/conformance/mapping/footer.json`. CAUTION: r305 pins read this markup (`.fo-in` landmark) + the frozen footer spec pins container h 74 @390.

## Laws
§0: nothing gets worse · tests are law · tokens only · NO !important · measured parameters only · commit ≤5 min AND `git push -u origin wip/sec-footer` after every commit (the branch IS the report; final messages often don't arrive). Incremental verification — never batched. Final: `bash scripts/verify.sh --fast > /tmp/sec-footer-verify.log 2>&1; echo $?` (NEVER piped).

## Report ≤10 lines
passRate @1440+390 l+d before→after · coverage/off-book before→after · d/h counts · commits · verify exit.
