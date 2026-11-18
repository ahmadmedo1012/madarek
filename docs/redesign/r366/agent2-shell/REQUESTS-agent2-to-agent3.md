# REQUESTS — Agent 2 (shell/motion/logo) → Agent 3 (Design System & Typography)

> R366 cross-boundary requests, each with the exact evidence and the
> precise change asked for. None of these were edited unilaterally.

## R0 · `scripts/gates/css-coverage.mjs` is broken at HEAD (pre-existing)

`cd frontend && npx tsx ../scripts/gates/css-coverage.mjs` crashes:
`ReferenceError: join is not defined` at line 55 — the `node:path`
`join` import is missing. Reproduced on the base commit `7a097457`
(identical crash — not introduced by this branch). Your gate, your fix:
one import line.

## R1 · KPI indicator collision at 200 % text scale (the `ind-*` family)

**What**: the KPI indicator family (`bdi.ind-mono` numerals +
`span.ind-microlabel` labels — `frontend/src/components/patterns/`)
collides with itself at 200 % text scale.

**Evidence** (production build, `scripts/qa/overlap.mjs --stress
--fontscale 2`, the §7 browser-zoom line — first time this sweep ran in
the repo): `/tmp/r366/overlap-zoom200.json` (committed copy:
`audits/evidence/r366/overlap-zoom200.json`):
- `bdi.ind-mono` «75» × `bdi.ind-mono` «100» @1024×768, frac 0.21
- `bdi.ind-mono` «0» × `span.ind-microlabel` «محاضرات» @1440×900, frac 0.36

**The exact asks**:
1. The indicator tile's numeral + microlabel need independent boxes that
   never share line space at any scale (the microlabel sits under the
   numeral inside a fixed tile height; at 2× the tile grows, the label
   rides over the neighbouring numeral).
2. Sweep the `ind-*` family at `--fontscale 1.3` and `2` — the 130 %
   sweep is clean, the 200 % sweep still finds the two shapes above.

**Done when**: `node scripts/qa/overlap.mjs --url <preview> --seed
student --routes /student/dashboard --bps 1024x768,1440x900 --themes
light --stress --fontscale 2` reports zero findings.

## R2 · Token request (L5, the mobile boot spec)

The MOBILE-BOOT-SPEC (docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md)
names the splash ground colours by token value. If you re-key
`--bg`/`--surface` for the dark theme, the spec's pinned hexes
(`#F6F6EE` / `#282828`) are the brand constants, not var() reads — no
action needed unless a token re-key changes the FIRST-PAINT background
away from those two values.
