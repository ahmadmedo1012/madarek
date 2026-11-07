# W7-L2D — gallery/why geometry: voids, clipping, radius, hover channels

Worktree `/home/z/wt/l2d`, branch `wip/l2d` (at merged main). Dev port **5312**: `cd /home/z/wt/l2d/frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5312 --strictPort &` (kill when done).

## Mission — kill the blind judge's measured gallery defects (panel-1-judge-1.md)
1. **450–600px dead columns/voids in the gallery section** (~25% scroll, desktop 1440).
2. **Thumbnails overlapping panel borders** + one clipped at x≈0–590.
3. **Mixed sharp vs rounded gallery card corners** — one radius token.
4. **Card hover zero computed delta** — ≥2 measured channels (flat-paper language: hairline color shift + ink tint + slight translate; no shadows).

CI context: origin main's conformance gate FAILS panel axes (deadVoid etc.) for `home-why-wrap` — your work clears the landing side.

## Owns (exclusive)
`frontend/src/styles/landing/why.css` · `frontend/src/components/landing/sections/*Why*` (incl. WhyScene.tsx). Nothing else.

## Method
1. Baseline: `node scripts/conformance/run.mjs --url http://localhost:5312 --sections home-why-wrap --bps 1440,768,390` (+ `--dark`); `node scripts/conformance/panel.mjs --url http://localhost:5312 --bps 1440,768,390` (read script header for CLI). Write a /tmp playwright probe: empty vertical runs (≥0.6 viewport), thumbnail bboxes vs panel/viewport bounds, card radius values, hover deltas.
2. Fix in OUR language: tokens only, NO !important, logical properties, Arabic copy untouched. Use the existing L1-a carousel chrome (arrows/dots/snap). Overflow guards on panels; edge fade preserved.
3. Re-probe until acceptance; `bash scripts/verify.sh --fast > /tmp/l2d-verify.log 2>&1; echo $?` (NEVER piped).

## Laws
Nothing gets worse; tests are law (r320/r321 pins intact); measured parameters only (spec: `scripts/spec/_page.*.json`); commit ≤5 min; push after first commit `git push -u origin wip/l2d` and after each commit. Do NOT merge to main.

## Acceptance
deadVoid/hClip 0 @1440+768+390 l+d · conformance home-why-wrap ≥90 all cells · no thumbnail bbox crossing bounds · single radius token · hover ≥2 channels · verify --fast exit 0.

## Report ≤10 lines
Before→after numbers per item · files · commits · verify result.
