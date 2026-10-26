# scripts/r320 — the composed defect gate (R320 §I Cycle-1 additions)

**`npm run gate:r320` runs R319's gate + the five new rules. It never
modifies, imports or reimplements `scripts/r319/gate.mjs`** — see the
architecture note below.

```
node scripts/r320/gate.mjs [--quick]
  [--routes landing,student-dashboard,…,admin-students,…]
  [--viewports 390,768,1440] [--themes light,dark]
  [--only r319,svg-collisions,rename-scan,cleanliness,duplicate-selector,hover-guard]
  [--base-url http://…] [--port 4257]
  [--out audits/evidence/r320/gate.md]
  [--baseline scripts/r320/gate-baseline.json] [--update-baseline]
```

- **--quick** (verification default): the R319 child in ITS quick mode
  (landing + student-dashboard, 390+1440) + the R320 runtime rules on
  landing, student-dashboard, **admin-dashboard** (the rename ratchet
  rides every quick run), 390+1440, both themes — ~2 min.
- Full mode (default): the R319 child full (the six role dashboards ×
  390/768/1440) + the R320 rules on the same six-route set. The admin
  SUB-pages (`admin-students` … `admin-settings`, 11 routes in
  gate-lib's table) are rename-scan targets via `--routes` — the full
  §B sweep when the foreman wants it.
- Same cell contract, same transport, same table schema as R319
  (`audits/evidence/r319/gate.md` — extended with the new check
  names), same exit contract (0 ratchet / 1 regressions / 2 fatal).

## Architecture decision (why a COMPOSER, not an extension)

`scripts/r319/gate.mjs` is **run as a child process**, untouched:

1. importing it would RUN it (`main()` fires at module top level), and
   refactoring the r319 gate to export its helpers is exactly the
   regression risk the brief forbids ("your work EXTENDS this
   machinery — do not replace or regress it");
2. the child keeps its OWN CLI, its OWN baseline
   (`scripts/r319/gate-baseline.json`) and its OWN evidence
   (`audits/evidence/r319/gate.md`) — its regressions block the
   composed run (exit propagates), but no R319 row is duplicated into
   the R320 baseline (no double bookkeeping);
3. the composed gate passes the child only `--base-url` (the one vite
   both halves share — spawned on **:4257**, never 5173, never r319's
   4215), `--quick` and an explicit `--viewports` when the user gave
   one. Routes are deliberately NOT forwarded: the child owns its
   canonical route set, so widening the R320 set (admin sub-pages for
   the rename sweep) can never mint foreign rows in the R319 baseline;
4. `gate-lib.mjs` holds the r319 recipes the R320 runtime rules need
   (hermetic transport bundle, own-port vite, cell contexts, drawer
   helpers, baseline ratchet) — **copied, not imported**, for reason
   (1); the copies carry the r319 conventions verbatim.

## The five rules (R320 BOARD §I)

| check | what it enforces | failure shape |
|---|---|---|
| `svg-collisions` | every visible SVG `<text>`/`<tspan>` bbox on the landing × text×text (any real intersection >0.5px²) and text×geometry (>4px² against stroked/filled `<line>/<rect>/<circle>/<ellipse>/<path>/<poly*>` inside the map plan SVG — stroke half-width inflated, `defs`/invisible/bounds-only skipped, ground masses >2500px² excluded, `.bp-gridline` underlay + `.pl-l-annot` riding labels + full-containment seats exempt). ≤920px cells get a second pass with the camera twin resolved to the FULL plan viewBox (the real app state `restoreCam()` uses ≥992px), then restored | «المكتبة والبحوث» × «96 M2», «غرفة الإتقان» × furniture hairlines — board §A4 |
| `duplicate-selector` | same selector segment + equivalent @media/@supports context, TWO app-loaded files, different values for the same property (the R319 B1 ghost class — which file wins is import-order luck). Identical values → WARN-tier only. `@layer` is NOT part of the key (cross-layer overrides are allowlist reasons). Conflicts against sheets OUTSIDE the app's import graph (the parity export artifacts) are exempt via the allowlist's `unloadedFiles` section — the lint verifies that claim itself by scanning every `.ts/.tsx` import statement (stale-guard: a declared file that starts being imported FAILS) | `.nav-item:hover` split across layout.css/polish.css |
| `hover-guard` | every `:hover` rule inside `@media (hover: hover)` (nesting at any depth; `(hover:hover) and (pointer:fine)` satisfies; `any-hover` does NOT) | B1: hover wash sticks after a tap on touch |
| `rename-scan` | admin routes' visible text carries NO «الإدارة»/«الادارة» role label outside the keep-list (`docs/redesign/r320/rename-keep.json` — c1-RENAME's ledger; the drawer is opened on ≤920px cells first, where the nav group label lives). Until c1-RENAME merges, every hit is an honest ratchet row that flips to PASS at merge | «لوحة الإدارة» + the nav group label |
| `cleanliness/console` + `cleanliness/network` | per route×viewport×theme: ZERO console errors/warnings (React key/hydration/act/deprecations, resource-load errors) and ZERO failed requests (≥400, requestfailed, failed font/image loads) — `page.on(console/response/requestfailed)` attached BEFORE navigation, read after settle; deduped by (type\|location\|text) / (status\|path) so react-query retries don't move the ratchet | the documented /me/gaps 501; React Router future-flag advisories |

## The ratchet (baseline) — same mechanism as R319

`scripts/r320/gate-baseline.json` (default). Keys are
`route|viewport|theme|check` (+ `|—|—|duplicate-selector`,
`|—|—|hover-guard`, `|—|—|r319-gate` for the non-cell rows):

- first run (file absent) writes it; `--update-baseline` re-seats
  (after widening scope — quick and full runs share the key space);
- later runs exit **1 only on regressions**: a FAIL row whose metric
  is worse than baseline, or a FAIL row the baseline never saw;
- every FAIL row ships with its board ticket in the table.

**The current baseline is the honest BEFORE state** — the ratchet
rows and their tickets:

- `svg-collisions` 9 @390 / 14 @1440 per theme (landing) — §A4, c2-L
  Cycle 2 (name/area baselines ≥14px apart + furniture/window-rule
  crossings);
- `rename-scan` 4 @390 (drawer open) / 3 @1440 per theme
  (admin-dashboard) — §B, c1-RENAME (flips to PASS when the rename
  branch merges);
- `cleanliness/console` 2 (landing) / 3 (student) / 5 (admin) per
  cell — React Router future-flag advisories + the 501 fail-soft
  error echoes; `cleanliness/network` 1 (student: /me/gaps 501) / 3
  (admin: /admin/stats, /admin/faculties, /admin/reports 501) — the
  unfixtured mock endpoints (fixture or fail-soft tickets);
- `duplicate-selector` 65 app×app conflicts — Cycle-6 dedupe (the
  lint's full list runs standalone);
- `hover-guard` 185 unguarded `:hover` rules — the Cycle-2-6 guard
  sweep (B1 residue).

The allowlists (`duplicate-selector-allowlist.json` with `allow` +
`unloadedFiles`, `hover-guard-allowlist.json`, `svg-collision-allowlist.json`)
follow the r318/r319 written-reason conventions: reason ≥12 chars,
stale entries FAIL so the lists cannot rot.

## Pre-push wiring (cheap rules only)

`.githooks/pre-push` runs the two lints in `--ratchet` mode (~2s):
they read the accepted counts from `scripts/r320/gate-baseline.json`
(written ONLY by the composed gate) and block only when a NEW
violation pushes the count past the ratchet — the known-open rows are
baselined tickets, a fresh one is exactly the "FAIL LOUD on fresh
violations" contract. The browser rules (svg-collisions, rename-scan,
cleanliness, the R319 child) stay OUT of the push path — they are the
foreman's pre-merge ratchet.

## Standalone runners (zero-dep node, exit code + table)

```
node scripts/r320/duplicate-selector-lint.mjs [--ratchet|--json|--emit-allowlist]
node scripts/r320/hover-guard-lint.mjs           [--ratchet|--json|--emit-allowlist]
node scripts/r320/svg-collisions.mjs   [--quick] [--routes landing] [--viewports 390,1440] [--base-url …] [--port 4257]
node scripts/r320/rename-scan.mjs      [--routes admin-dashboard,…admin sub-pages…] [--viewports …] [--base-url …]
node scripts/r320/cleanliness.mjs      [--routes …] [--viewports …] [--base-url …]
```

Browser runners spawn their own vite on :4257 (`--base-url` audits an
already-running server) and use the same hermetic mock transport as
the gates.

## Files

- `gate.mjs` — the composer (R319 child + the five rules + ratchet).
- `gate-lib.mjs` — the r319 recipes copied verbatim (transport, vite,
  contexts, CLI, baseline) + the R320 route table (r319's six + the
  11 admin sub-pages for the rename sweep).
- `sweep.mjs` — the runtime-rule cell sweep (one page load per cell,
  the three runtime rules riding the same page where scopes overlap).
- `rules-runtime.mjs` — the in-page collectors (SVG collisions, rename
  scan, cleanliness listeners).
- `css-walk.mjs` — the shared CSS source walker (paren-aware selector
  splitting, full @media/@supports/@layer chains,
  keyframes/font-face skipping, the app's CSS import-graph scan).
- `duplicate-selector-lint.mjs` / `hover-guard-lint.mjs` — the two
  static lints.
- `*-allowlist.json` — written-reason allowlists (stale-guarded).
- `gate-baseline.json` — the committed ratchet baseline.
- Evidence: `audits/evidence/r320/gate.md` + `.json` twin (plus
  per-rule standalone evidence files).

## Known measurement limits (documented, not hidden)

- The SVG sweep measures GLYPH-BOX intersections, not ink: a text box
  crossing an invisible part of a stroked line's inflated box counts
  (the ≥4px² tolerance + containment/annotation/underlay exemptions
  keep the false-positive rate at zero on today's landing — verified:
  every current hit maps to a board §A4 defect).
- `rename-scan` scans VISIBLE text (innerText): a «الإدارة» that
  only exists in attributes/aria-labels/title is invisible to it —
  c1-RENAME's source-level belt owns the non-rendered surface.
- `cleanliness` counts the mock transport's honest 501s as network
  failures (they are real failed requests in the hermetic cell);
  pointing `--base-url` at a seeded full stack is the high-fidelity
  mode.
- The r319 child's own limits (documented in scripts/r319/README.md)
  apply unchanged inside the composed run.
