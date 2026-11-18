# DELIVERY — Agent 1 · Heron Experience & Graphics (R366)

Branch: `agent/r366-heron-graphics` (from `origin/main` @ `7a097457`) · last SHA:
see `git log -1` on the branch (all work pushed).
Records: `docs/redesign/r366/agent1-heron/` (CHECKLIST with per-box proofs,
RESUME log, evidence/). All numbers below were measured by me on this tree
with the repo's own instruments — nothing copied.

## What landed (grouped)

### L1 — the hero measured-seat rebuild (the biggest lift)
The hero was the least-measured, most-visible section (11.7 % coverage,
79.7 % heuristic). It now carries the reference's own plate anatomy:
- **`scripts/conformance/gen-hero-furniture.mjs`** (new generator): reads
  the frozen spec, classifies the plate zone geometrically, verifies each
  seat's anchoring at the runner's own tolerance across breakpoints, and
  emits the seat table, the CSS (geometry + the measured
  bg/color/opacity/type/transition census), the component, the bindings
  and the prune lists.
- **`HeroPlate.tsx` + `hero-plate.css`**: the wrapper chain (the measured
  887/833/700 svh-calc seats) + 163 furniture seats — frame edges, four
  corner brackets, the center hairlines, the ember crosshair + label, the
  130×35 dark tag, two map pins with two-line Arabic labels, the ruler
  overlays — at the reference's own AT-REST register (86 seats at opacity
  .64, 14 at 0: the "calm artwork" reading is literal, and it reconciles
  R347 D4 with the frozen census — the loud D4 chrome stays dead).
- **The section slide-under** (`hero-mechanics.css`): the hero seats under
  the in-flow masthead (net flow unchanged — the page below does not move),
  so the census root matches the frozen wrap. This killed the structural
  56-63px y-offset that failed every hero y-check since R347 D2, returned
  the closing band inside the fold (the D4 geometry, now the measured one),
  and made `sectionVh` pass.
- **Mapping**: 169 explicit bindings; 353 superseded excuses pruned; 76
  documented content excuses added (the strip glyph/overflow mass, the
  login internals, the R332 img; `noHeuristic` where the junk glue fed).

**Numbers (before → after, measured):**

| metric | before | after |
|---|---|---|
| hero coverage | 11.7 % | **64 %** (target ≥ 60) |
| hero heuristic share | 79.7 % (cap 80 — razor-thin) | **22.6 %** (target ≤ 30) |
| hero no-counterpart FAILs | 171 @1440 / 314 total | **0** |
| hero cell pass @1440 | 57.7 % | **95.5 %** |
| OVERALL pass rate (gate+scroll+interact) | 93.5 % | **93.8 % — gate PASS** (floor 91.6) |
| scroll-feel | 30/30 | **30/30** |
| OVERALL coverage | 45.8 % | **52.1 %** |
| edge390 | 0 | **0** (3 introduced mid-round by the strip's RTL overflow box — found and fixed) |

### L2 — the graphics pipeline
- **`docs/GRAPHICS-PIPELINE.md`**: how the reference builds (measured), how
  ours build, the decision matrix — (a) procedural SVG+CSS (the default),
  (b) rasters ≤ 60 KB webp with the ffmpeg recipe + the AVIF escape
  (libaom-av1 crf46 cpu-used 8 = 0.6 s/file, −72 %; ship as `<picture>`
  twins), (c) WebGL REJECTED for the public site (the entry has ~0.4 KB
  slack; three.js = 150-600 KB gz; the reference ships zero WebGL) — plus
  the 10 construction rules (projection, light, materials, weights, grid,
  RTL, safe areas, a11y, performance) and the verification gate.
- **The r342 asset diet**: 38 webp recompressed to ≤ 60 KB each
  (statement-courtyard 228→57 KB, problems 98–166→57–61, roles 72–175→59–61,
  journey 64–109→46–61, why 81→59, skyline@2x 118→59), 2 dead retina twins
  deleted (−649 KB) — `illustrations/r342` 5.2 MB → 2.4 MB.
- **`scripts/graphics/verify-graphics.mjs`** (new gate): PASS — 56 assets,
  2,471 KB total, budgets + pairing + dims + no-dead-retina enforced.
- **`scripts/graphics/capture-public.mjs`** (new tool): the capture matrix.

### L3 — the public surface
- **`PUBLIC-SURFACE-SPEC.md`**: the reference has NO secondary pages
  (measured: /about, /contact → 404), so the spec is the home census's own
  language as law (type ladder, hairlines, mono indices, gutters, motion
  seats).
- **The audit** (evidence/l3-public-pages.md, DOM metrics on the production
  build): radius violations **0** on every public page, mono indices 5-11
  per page, h1 ≤ 4 words (4/5), tap targets ≥ 44px except inline prose
  links (recorded). No drift found to fix beyond the copy diet.

### L4 — the copy diet
- **2,261 → 1,671 Arabic words (−26.1 %)** across my 10 gated pages, every
  `max` ratcheted DOWN in the same commit; legal substance 100 % preserved
  (the R355 ledger), 172/172 pinned tests green, a latent duplicate-import
  defect fixed in CapabilityPages.

### L5 — the mobile proof
- 17 captures (320/360/390/412/600 + landscape ×2 + 200 % zoom + reduced
  motion + 8 public pages) → 4 contact sheets (evidence/l5-mobile/).
- Found + fixed: the mobile work strip's RTL overflow box (−1..375 instead
  of the measured 8..382 wrap box) — edge390 3 → 0.
- **Lighthouse (before/after, the baseline measured on a clean worktree of
  7a097457)**: CLS **0** everywhere ✓; a11y 99-100 ✓; bp 96 ✓; seo 100 on
  / (92 on /features+/app); perf 66-86 — **the LCP 4.3-5.0 s and the
  lighthouse tab-crash are PRE-EXISTING** (identical on the baseline: the
  CSR lazy-route landing paints the fold only after ~165 KB gz of JS on
  throttled 4G). The ≥ 90 target needs the architectural levers:
  prerender/eager-route (owner + Agent 4's App.tsx) and the canvas-cursor
  gating (Agent 2) — recorded in evidence/l5-lighthouse.md + REQUESTS.

## Gates (all green on the final tree)

`copy-budget` CLEAN · `copy-budget-mobile` CLEAN · `check-colors --strict`
OK (8 inline allows in hero-plate.css — the measured literals law) ·
`check-raw-css --strict` PASS · `check-icons` OK · `check-motion-tokens`
OK · `identity-guard` CLEAN · stylelint **41 ≤ baseline 45** ·
`check-bundle-size` PASS (**759.9/774 total, entry 66.0/92, pdf 95.7/110**)
· `size-gate` GREEN · `overlap.mjs` (CI parity sweep) **0 defects** ·
`panel.mjs` **60/60** · conformance `--gate --scroll --interact`
**PASS 93.8 %** · `npm run lint` 0 errors · frontend unit tests
**3155/3155**.

## Cross-boundary edits (all ≤ 5 lines, no behaviour change)

1. `scripts/check-motion-tokens.sh` — **1 line**: the WHOLESALE landing
   sheet list gains `hero-plate.css` (the R332 landing-sheet contract; the
   raw motion values are measured conformance seats). REQUESTS-agent1-to-
   agent3.md asks Agent 3 to ratify.
2. `frontend/src/styles/landing/hero-mechanics.css`, `hero.css` — mine.

## Baseline shifts

None. Every ratchet/ceiling/baseline either held or improved: the
conformance ratchet untouched (the gate PASSES above the floor), the
copy ceilings only moved DOWN, the stylelint axes improved (41 < 45), the
bundle total 759.9 < 774 with the entry untouched. The conformance
results.json + dated provenance files were restored (never committed) —
the integrator regenerates; my runs are preserved under evidence/.

## REQUESTS files written

- `docs/redesign/r366/REQUESTS-agent1-to-agent3.md` — ratify the 1-line
  motion-gate wholesale entry (R1); the seat-literal token note (R2).
- `docs/redesign/r366/REQUESTS-agent1-to-agent5.md` — the r342 diet's
  mobile impact + the spot-check ask (R1); the hero furniture note (R2).
- (in evidence/l5-lighthouse.md, recorded for the owner + Agent 4/Agent 2):
  the prerender/eager-route and cursor-gating levers for perf ≥ 90.

## Left open (with the exact reason)

1. **footer / intro / map / platform coverage < 60 %** (40.9 / 37.6 / 31.8 /
   40.4) and **overall coverage 52.1 % < 65 %** — each section needs its own
   measured-seat build+iterate pass; the generator method is proven on the
   hero (the weakest section) and generalises (geometry classification,
   per-seat anchoring, the artifact emission). This is hours of focused
   mechanical work per section, not a blocker — needs the next session.
2. **Perf ≥ 90 / LCP ≤ 2.5 s on mobile Lighthouse** — architectural (the
   CSR lazy-route landing; the levers are owned by the owner/Agent 4/Agent
   2 — see L5). CLS (mine to hold) is 0 everywhere.
3. **seo 92 on /features + /app** — the meta/canonical details live in
   Agent 4's page files (REQUESTS-worthy, recorded here).
4. **WebKit conformance** — RESIDUAL (not installable this round; the
   AGENTS.md law: report, never fake).
5. **The hero's 768/390 cross-bp mispairs** (~110 checks, Δ ≤ 17px over
   tolerance) — the path+ordinal cross-bp matching is unreliable where the
   reference's tree changes element counts; the fix (box-proximity
   matching at 768/390 in the generator) is designed but not landed.
6. **The h1 h-check** (126 vs 93) — the Arabic line-height floor makes the
   2-line box taller than the Latin seat; structural, documented (the lh
   check itself passes via the transformed expectation).

## Completeness audit (the anti-shortcut §5.4 pass)

Re-ran the evidence commands for 5 random ticked boxes:
1. L1.3 → `node scripts/conformance/run.mjs --url … --gate --scroll
   --interact` → PASS 93.8 % (evidence/l1-final-gate.json) ✓
2. L2.2 → `node scripts/graphics/verify-graphics.mjs` → PASS 56 assets ✓
3. L4.2 → `node scripts/gates/copy-budget.mjs` → CLEAN ✓
4. L6.1 (overlap) → `node scripts/qa/overlap.mjs … (CI parity)` →
   stops-with-defects=0 ✓
5. L5.1 (edge390) → the scoped 390 run → edge390 fails 0 ✓
All five re-proved on the final tree.

## Session 2 — the verification + continuation (owner-requested)

Re-proved the 5 audit boxes, then continued the L1 work with a CALIBRATED
pairing simulator (faithful to run.mjs within 7 measured checks) and a
strict honest-conversion analyzer (every excused spec element tested
against every free our-element with the real tolerance functions):

| section | before | after | the work |
|---|---|---|---|
| home-map-wrap | 31.8 % | **35.4 %** (+546 meas, 99.8 % pass) | the 4 chapter icons + paths, ds-stamped (JourneyScene mount hook) + 16 bps-scoped bindings |
| footer | 40.9 % | **41.5 %** (+102 meas, 88.8→89.2 % pass) | the form row rebuilt at the census's full-bleed seat (358×40/374×48), the square 40×40/44/48 go button at the MIRRORED inline-end seat, the c1sub panel transparent (the frozen census's own record — the T-06f grey was the 1px rules), 6 form-family bindings, the acct LH 1.35 fix |
| home-platform-wrap | 40.4 % | **41.1 %** | the 9 parked-seat geometry unskips |
| home-intro-wrap | 37.6 % | **38.2 %** | the 3 tween-residue plumbing unskips |
| **OVERALL** | 52.1 % / 93.8 % | **52.7 % / 93.9 % PASS** | scroll 30/30 · panel 60/60 · edge390 0 · all caps held |

Gates re-proven after the changes: conformance 93.9 % PASS · scroll-feel
30/30 · panel 60/60 · overlap (CI parity) 0 defects · size-gate GREEN ·
stylelint 44 ≤ 45 (ratchet DOWN — 2 duplicates merged) · check-colors
--strict OK (the 4 hero-plate allows moved inline) · raw-css/icons/motion
OK · copy-budget CLEAN · identity OK · lint 0 errors · **unit 3155/3155**.

The honest ceilings stand (evidence/l1-session2-table.md): the 60/65
targets need the authored-SVG map artwork rebuild, the content-contract
resolution on footer, and the cursor-interactive decision (REQUESTS R3 to
Agent 3 + a new REQUESTS note for Agent 2's cursor system).
