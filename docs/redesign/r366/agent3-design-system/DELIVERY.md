# DELIVERY — R366 · Agent 3 · Design System

Branch `agent/r366-design-system` · base `7a097457` (origin/main) ·
15 commits · 100 files changed (+2050 / −69). Every box in CHECKLIST.md
is ticked with its executed proof; this is the summary for the
integrator.

## What landed (by lane)

### L0 — early deliverables (pushed inside the 90-minute window)
- `docs/DESIGN-COPY-GUIDE-AR.md` — the Arabic microcopy standard:
  the canonical verb table (buttons ≤ 2 words), the 2-sentence
  empty/error contracts, the destructive-confirm contract, the
  Libyan-education glossary (one term per concept), the number/date/
  time/currency seats, tone, the never-cut floor, and the 10
  machine-checkable rules.
- Additive tokens + `TOKENS-CHANGELOG.md`: `--t-page` 500ms (both
  platforms, reduced-motion-killed), `--touch-target` 44px,
  `--text-on-image-ink` + `--scrim-text` (0.62 #141414 over worst-case
  white = #6D6D6D = **5.15:1** measured), `--surface-sunken` per theme.

### L1 — colour & contrast to a provable standard
- **`scripts/gates/color-audit.mjs`** (NEW): token-level audit of the
  SHIPPED cascade (both files, var()/color-mix/alpha resolved as the
  browser does) across light/dark/prefers-contrast × WCAG 2.2 +
  **APCA W3 0.1.9 Lc** (reported) × CVD simulation (Machado 2009:
  protan/deuteran/tritan) for the chart palette. **768 pairs swept,
  0 findings**, 2 named R313 exemptions (measured, zero drift), 19
  documented reports (decorative hairlines per the Heron canon + rare-
  CVD series distinctness).
- **10 token-level fixes** (all before→after in the commit body):
  accent-ink 4.48→4.74 · text-faint-dark 4.24→4.83 · peach/rose ink
  2.86/2.80→3.30/3.23 (danger follows: error border 2.98→3.44) · sand
  ink 2.33→3.50 · danger-fg 4.42→4.78 · chart-1 deutan 2.91→3.20 ·
  chart-4 deutan 2.76→5.70 (ΔE from series 1: 5.4→23.9) · chart-7
  ΔE 7.1/8.6→20.5/25.2 · **`--input-border`/`-hover` seats** (inputs,
  selects, checkbox/radio boxes leave the 2.1:1 hairline → 4.83:1
  light / 3.92:1 dark, WCAG 1.4.11).
- **`scripts/r323/contrast-gate.mjs` extended**: disabled (2.2:1
  collapse floor, WCAG-exempt but measured), read-only, error and
  selected contexts labelled per finding; APCA Lc per row;
  stateHistogram proof. **PASS — 0 findings over 758–774 samples**;
  histogram: default/hover/active/focus-visible ×180–184, disabled
  14, read-only 8, error 8, selected 8.
- Dark-mode completeness verified: color-scheme, ::selection,
  scrollbar (all token-aware), theme-color metas, surface-step
  elevation, no #000/#FFF seats, input boundaries ≥3:1.

### L2 — typography & fonts (Arabic-first, measured)
- `docs/TYPOGRAPHY.md` — the binding type law with numbers.
- **Family decision**: IBM Plex Sans Arabic KEPT — measured against
  Readex Pro / Cairo / Rubik (arabic woff2 sizes + fontTools line-box
  metrics): the alternatives sit at 118.5–187.4 % line boxes vs
  Plex's 150 % (a full-app reflow), the critical payload is already
  88.5 KB ≤ 120 budget, and the frozen landing conformance + R322
  blind vote ride on it. The variable-font escape hatch documented.
- **The fallback belt (CLS)**: metric-compatible local fallback faces
  (Plex 108.5/41.5, Alexandria 96.8/25.1 overrides), the phantom
  'Tajawal' rung retired, dead Alexandria-500 pair deleted (−26 KB).
  `scripts/gates/cls-probe.mjs` (NEW, Slow 4G + 4× CPU, source
  attribution): **font-attributed CLS 0.0002** (budget 0.02);
  /auth 0.0118; the remaining `/` shift is the Lenis scrollbar flip
  (REQUEST R1 to Agent 2).
- **`scripts/gates/type-stress.mjs`** (NEW): 36 probes (4 widths × 3
  scales × 3 routes) under long-word/bidi stress — **0 overflow**.
  Contact sheet CS-TYPE-1 (6 crops) in the round's shots/.

### L3 — component library & states
- **`frontend/tests/design-lab/`** (NEW Playwright project, 27 tests):
  the /__design matrix × light/dark × 390/1440 — structure (17
  sections), the sans-13/mono-11 type floor, radius-0 discipline, the
  one focus ring, disabled honesty, the 44px touch floor, theme flip,
  and 68 deterministic baselines (1.9 MB). **27/27 PASS** in update
  AND assert modes. The suite **found and fixed 4 real defects**:
  the lab's own chrome below the floors, the `.pill` at 37px on
  coarse pointers (now `min-block-size: var(--touch-target)`), the
  LedgerRow subtitle `<small>` at 11.1px (now floored — ledgers render
  across the app), the readonly-well size.
- Lab additions: read-only digest specimen (the --surface-sunken
  well) + aria-selected chip row (now swept by the contrast gate).
- Hover-guard: own finding fixed (patterns.css twin split, 49→48);
  remaining 48 are other agents' — filed with per-file lists.
- Hygiene counters HELD: `!important` 41→41, raw z-index 68→68, raw
  hex 29→29 (baselines never re-pinned).

### L4 — parity & copy enforcement
- **`scripts/tokens/parity.mjs`** (NEW): web ↔ mobile gate — 24 colour
  seats × 2 themes, 19 spacing rungs, radius, 9 motion rungs + ease;
  PASS; the `--self-test` negative path exits 1. Backed by
  **`scripts/tokens/cascade.mjs`** (the shared cascade parser both
  gates import).
- **`copy-budget.mjs --style [report|enforce]`**: the 10 machine-
  checkable copy rules on the same lexer harvest (attr context, raw
  text, line numbers; template-interpolation false positives
  excluded). Owned findings fixed (lab titles, SplitView empty
  state); **enforce PASS on design-system files**; census = 35
  findings in other agents' files (filed). Budget ceilings untouched
  (budget mode CLEAN).

## Gates — final state (all re-run after the last commit)

| Gate | Result |
|---|---|
| tokens:check / tokens:parity | PASS / PASS |
| color-audit (768 pairs) | 0 FAIL |
| contrast-gate (758 samples, 8 states) | PASS, 0 findings |
| design-lab (27 tests) | 27/27 |
| unit suite | 3155/3155 (255 files) |
| typecheck + build + eslint | clean (0 errors, 16 pre-existing warnings) |
| stylelint-gate / css-counts | ratchet green, counters held |
| check-colors / raw-css / icons / motion-tokens | OK |
| copy-budget + --style enforce | CLEAN / clean |
| type-stress (36 probes) / cls-probe | PASS / font-CLS 0.0002 |

## Cross-boundary edits (all ≤ 6 declarations, listed per the rules)

1. `frontend/src/styles/shared/design.css` (Agent 4's sheet — the
   /__design lab chrome lives there): **6 declarations** floored to
   the 13px sans / 11px mono laws (r323d-title/note/cell-label/
   inline/p/page-title) — the lab must prove the laws it exhibits.
2. `frontend/playwright.config.ts` + `frontend/vitest.config.ts` +
   `frontend/package.json`: additive project/script/exclude lines (no
   existing project/test touched) — required to run the new suite.
3. `frontend/tests/unit/r362-shared-recipes.test.ts` + `assets.test.ts`:
   contract pins updated to the NEW stricter recipes (checkbox
   boundary → --input-border; faces 16→18 with the local-only
   fallback exemption) — pins moved forward, never weakened.

## Baseline shifts (intentional, for the integrator)

- `frontend/tests/audit/surface-baseline.json` drift: the semantic
  seats accentInk (#C72E00→#C12B00), textFaint dark (#A2A29D→#ADADA8),
  peach/rose/sand inks, inputBorder seats and the chart retunes WILL
  trip the surface-inventory drift gate — re-pin per its process
  (every shift is a measured contrast improvement; the audit artifact
  carries the before→after).
- The stylelint baseline may drop (current 40/41/68/29 vs baseline
  45/52/79/36) — re-pin downward per the ratchet's --update process.

## REQUESTS files written

- `REQUESTS-agent3-to-agent1.md` — 42 hover-guard findings (landing)
  + 3 copy-style findings.
- `REQUESTS-agent3-to-agent4.md` — 5 hover-guard + 32 copy-style
  findings.
- `REQUESTS-agent3-to-agent2.md` — R1: the Lenis scrollbar-flip CLS
  (0.0118 on `/`, the fix recipe included) · R2: the --t-page rung ·
  R3: 1 hover-guard finding (shell/chrome.css).

## Leftovers (with the exact reason)

- The 48 hover-guard findings in other agents' files — blocked on
  their lanes (requests filed with recipes); the lint stays red until
  then, by design.
- `/` total CLS 0.0204 (0.0004 over budget) — root-caused to the
  Lenis init scrollbar flip (Agent 2's engine, REQUEST R1); the font
  path itself is 0.0002.
- `scripts/conformance/` untouched (Agent 1's); the new gates are NOT
  yet wired into `.github/workflows/ci.yml` (integrator-owned) —
  suggested wiring: `tokens:parity`, `color-audit`, `copy-budget
  --style enforce`, `type-stress` join the design-gates job; the
  `design-lab` Playwright project joins the e2e job
  (MADAREK_E2E_EXECUTABLE as CI provides).

## Artifacts (local, gitignored)

`audits/evidence/r366/color-audit.json` (768 pairs + APCA Lc rows) ·
`audits/evidence/r323/contrast-gate.json` (state histogram) · contact
sheet committed at `docs/redesign/r366/agent3-design-system/shots/
CS-TYPE-1.png` (1 of the ≤40 budget).
