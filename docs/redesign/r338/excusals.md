- T-02a (home-usecase-wrap, 1024+1440 only): Heron's row text tween splits titles/lines into per-WORD divs (mid-tween residue, opacity 0); the depth-6-truncating census surfaces them as sibling sets (≥3 identical fs/fw/color) under shallow roots, sometimes sharing a path with the real un-split line box. Arabic word-split law: our copy renders one box per line inside the bound conforming containers (rowtw/rowtwf/rowlinebox/rowtitle) — the real line boxes at the same roots stay bound and fully measured (typography+geometry), so nothing is weakened; the per-word scaffold boxes are excused via the structural charSplit "wordset" rule (run.mjs, r337-intro 37705268 precedent). 18 boxes excused (9/bp); lh/geometry debt remains for T-02b.
## T-03 home-intro-wrap — residuals (r338 wave-1b, time-boxed)
- **webkit cells (all bps)**: webkit build (2287) absent from ~/.cache/ms-playwright; lead's post-npm-ci install attempt incomplete at dispatch time and chromium-1223 download stalled at 80% mid-session. Measured chromium only — per ENV ADDENDUM webkit = RESIDUAL, never faked.
- **dark theme cells**: the conformance instrument (run.mjs v2) has no dark-mode measurement path (no theme toggle/param exists in scripts/conformance/* or the landing styles) — dark conformance is not expressible by the current tool; n/a, not excused as impossible by design.

## T-14a instrument — dark path + plumbing-skip (r338 wave-6)
- **dark cells (all sections, all bps)**: the frozen Heron spec (docs/redesign/r335/heron-spec/) is LIGHT-ONLY — no dark recordings exist, so dark cells cannot be spec-compared (not a per-section design impossibility; an instrument gap now closed). `run.mjs --dark` measures OUR internal consistency on the same pairs: (1) `html[data-theme="dark"]` actually applied via the site's own ThemeToggle mechanism (`tokens.generated.css` flips the token blocks under `[data-theme="dark"]`); (2) geometry/type/border/radius/opacity/interactive/transition re-asserted vs the frozen light spec — a theme flip must not move a box or retype a line; (3) the color group is NOT compared to the light spec (differs by design) — instead a token-flip census (≥1 paired element per section must change color/bg light→dark) plus a WCAG contrast floor ≥3.0 for every text-bearing/interactive paired element vs its effective (nearest opaque ancestor) background — catches unflipped raw light inks unreadable on dark surfaces. Measured footer+home-usecase-wrap @vite:5314 chromium: DARK TOTAL 8741/10037 = 87.1% (footer ~221-224/343 per bp, usecase ~1557/1674), 290 contrast checks, 0 dark-contrast fails; residual dark debt = geometry drift kinds (y/w/x-mirror/h) under the flip for section agents to fix.
- **plumbing-skip mechanism (T-06c follow-up — 132 heuristic-paired defs/filter/mask paths)**: mappings may now declare `"plumbing": [{"section","heron","skip":["geometry",…],"reason"}]` (spec-path exact/suffix, same grammar as noCounterpart); per-binding `explicit[].skip` keeps working but is now COUNTED (it was silent before). Skipped checks are counted per cell (`skipped`, console `s=`, `summary.totalSkipped`) and listed in `results.skippedReport` with the written reason — never a silent pass, never weakening measured assertions on real boxes. Selftest (footer@1440, defs-suffix rule, skip geometry+color): skipped 7→13, fail 441→439, pass 250→246 — exactly the 6 declared checks left the denominator, reported by path+reason; light regression footer+usecase 5 bps identical (9511/12493 = 76.1%) with zero plumbing rules present.
## T-05 why (r338, respawned wave) — session residuals
- webkit cells: webkit absent from the shared pw cache (ENV ADDENDUM) — RESIDUAL, not measured, never faked.
- why conformance %: no measured cell this session — the shared /tmp/conf.lock was held by sibling agents for the whole measurement window; the 1440 run was launched but returned no number before the time box. Reported as n/a, NOT as a pass.

## T-05b why (r338, measure+iterate session) — session log + residuals
- webkit cells: still absent from the shared pw cache — RESIDUAL (unchanged).
- dark cells: instrument has no dark path (T-14a) — RESIDUAL (unchanged).
- MEASURED for the first time (own vite :5305, chromium, PLAYWRIGHT_BROWSERS_PATH
  fallback per ADDENDUM 3): home-why-wrap = 61.2% → 61.8% (65/65/60/59/58 per bp).
  Explicit data-spec bindings + noCounterpart waivers landed (33 written, 27 kept
  after dropping 6 path-collision casualties) — e/d went 0/0 → 1/12-17 per bp.
- Remaining work-list (NOT excusals, real iteration debt): (a) the extractor's
  depth-6 path truncation COLLIDES deep stage subtrees with shallow head/side
  paths (e.g. `…section[1] > div[1] > div[2] > div[2]` is BOTH the lede and a
  2930px stage box) — the side-rail family cannot bind by path until bound via
  unique suffixes or walk-side ordinals; (b) ~52/bp no-counterpart heron
  elements: mini-capture clusters (0×0 spec imgs), row-3 player scaffolding
  (defs/filter/mask), row-4 map paths + 12 point reveals, caption clusters —
  need real counterparts + bindings or documented waivers; (c) y:505/x-mirror:120
  /w:111 failure mass sits inside those unbound families.
