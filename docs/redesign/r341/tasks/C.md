# C-tasks — CSS finish (start as D-tasks free their files)

Targets: **total ≤33,000 lines (landing ≤13.5k, non-landing ≤19.5k), live `!important` 52 → 0.**
Proof per batch: chunked conformance ≥ before · vitest green · computed-style snapshot of key pages identical (before/after `getComputedStyle` diff on the seats you touched) · bundle ≤770 · `node scripts/gates/css-counts.mjs` down.
Law: never delete a rule a live page still seats (grep + coverage probe first); stylelint layer gate stays green; `scripts/gates/stylelint-baseline.json` only re-baselined DOWN with a reason.

- **C1a/b/c `polish.css` (2946, 36 !important)** — split by line ranges (a: 1–982, b: 983–1964, c: 1965–end). For each rule: does any live page still seat it? (grep the selector in `frontend/src/**.tsx` after the D-wave deletions; runtime probe if dynamic). No → delete. Yes but duplicated by patterns/layer sheets → delete the duplicate, keep the pattern. `!important` dies with its family or moves to a layer-order fix.
- **C2a/b/c `components.css` (3178)** — same, line-range split (a: 1–1060, b: 1061–2120, c: 2121–end).
- **C3 `base.css`/`layout.css`/`unified-parity.css` (665+1599+1304)** — same discipline; `unified-parity.css` should mostly evaporate once pages ride the pattern library.
- **C4 lightningcss dedupe** — run the dedupe/merge pass across every surviving sheet (installs allowed at repo root only if in package.json; otherwise a scripted pass with postcss already present); identical adjacent rules merged, longhands→shorthands where safe; computed-style snapshot proof.
- **C5 folder moves** — `styles/{base,layout,components,pages}/`; landing sheets → `styles/pages/landing/`; every move = reference sweep (imports, stylelint globs, gate scripts) + full vitest + build. Remove every `rNNN-`/`wave-`/`patch-` filename/class prefix (rename to semantic names; grep-prove zero references).
- **C6 the last `!important`** — each of the remaining live ones: fix the specificity cause (layer order, selector scope) or delete with its dead family. Target 0 (raw grep excludes comments; css-counts is the truth).
- **C7 stylelint ratchet to the new floor** — after C1–C6, re-baseline `stylelint-baseline.json` DOWN to the measured counts with the reason block.
