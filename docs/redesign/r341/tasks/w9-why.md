# W9-WHY — the why/gallery section: passRate 88→≥90 @390 + coverage 24.4→≥40 (binding)

Worktree `/home/z/wt/l2d`, branch `wip/l2d`, dev port **5312** (server may already be running — check `curl -s localhost:5312` first; kill + reboot if stale).

**Read first:** `docs/redesign/r341/tasks/H1.md` — the BIND-FIRST LAW + math (the same discipline, applied to the why section instead of the hero). The mapping file: `scripts/conformance/mapping/home-why-wrap.json`.

## Current state (queen-measured 2026-11-07 20:50, @390)
- passRate **88%** (floor 90) — 134 failures; top kinds: **opacity:24 · x-mirror:23 · color:20 · y:13 · w:13 · h:12**
- coverage **24.4%** (floor 40) · off-book 75.6% (cap 70) · **skip 1734** (plumbing skips — the big lever) · excused 146×12
- @1440: passRate 90%, cov 26%, no dead voids at rest, no out-of-bounds thumbs, radius discipline 0px uniform ✓ (L1-a's geometry work HELD — do not regress it)
- panel.mjs axes: d=11, h=20 @390 — chase those to 0 where real

## Mission (small committed steps — one binding batch at a time)
1. **passRate first (88→≥90 @390):** work the opacity/x-mirror/color fails — read the failure list in `scripts/conformance/results/chromium-*-sections-home-why-wrap.bp-390.json`; group by family; fix our wy-* seats toward the measured spec values (`scripts/spec/_page.390.json` + `_page.1440.json` — measured parameters only, OUR ink/paper/orange language, never Heron assets/copy). Re-run after each family: `node scripts/conformance/run.mjs --url http://localhost:5312 --sections home-why-wrap --bps 390` then `--bps 1440` (keep ≥90!) then `--dark`.
2. **Coverage second (24.4→≥40):** BIND-FIRST — bind our EXISTING wy-* DOM (cards, panels, media, annotations, numerals) to the spec's elements via `explicit[]` in the mapping; un-skip field groups where our counterparts now carry the fields (skip 1734 is the lever — every un-skip moves measured↔off-book). Retire excusal families as they become real.
3. **Keep:** deadVoid/hClip 0 (probe scrolls), the L1-a carousel chrome, r320/r321 pins, conformance ≥90 @1440.
4. Hover channels on gallery cards ≥2 (the judge's zero-delta finding — if L1-a's hover already carries 2 channels, prove it with a computed-style probe and note it).

## Owns (exclusive)
`frontend/src/styles/landing/why.css` · `frontend/src/components/landing/sections/*Why*` (incl. WhyScene.tsx) · `scripts/conformance/mapping/home-why-wrap.json`.

## Laws
§0: nothing gets worse · tests are law · tokens only · NO !important · measured parameters only · commit ≤5 min on wip/l2d AND `git push -u origin wip/l2d` after every commit (the branch IS the report — final messages often don't arrive; never leave work uncommitted). Verify incrementally — do NOT batch all verification to the end. Final: `bash scripts/verify.sh --fast > /tmp/l2d-verify.log 2>&1; echo $?` (NEVER piped).

## Report ≤10 lines
passRate @390+@1440 l+d before→after · coverage/off-book before→after · d/h counts · hover proof · commits · verify exit.
