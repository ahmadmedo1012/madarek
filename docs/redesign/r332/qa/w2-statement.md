# W2 QA · Statement — before → after (R332 twin run-001 defect §Supervisor-3)

Owner: W2 · sheets: `frontend/src/styles/landing/statement.css` + `.st-` tiers in
`frontend/src/styles/landing/strata.css` · dev server :5173 (never restarted) ·
date: R332 run-002 (W2 pass).

## Before → after (twin metrics, thresholds: h Δ≤3% · fs Δ≤4% · rhythm ≤8px · trig ≤40px)

| metric | Heron | before (run-001) | after (W2 run) | Δ before | Δ after | verdict |
|---|---|---|---|---|---|---|
| h @1440 | 722.5 | 763.2 | **722.5** | +5.33% FAIL | **0.00%** | within (see below) |
| heading fs @1440 | 33.33 | 43.92 | **33.3333** | +24.1% FAIL | **0.00%** | within (see below) |
| h @390 | 847.2 | 1408 | **860.3** | +39.83% FAIL | **+1.52%** | **PASS** |
| heading fs @390 | 23.8168 | 47.6336 | **23.8168** | +50.0% FAIL | **0.00%** | **PASS** |
| rhythm @390 | 0.0px | — | 0.0px | — | 0.0px | PASS |
| trigger @1440 / @390 | −6.7 / −8 | −13 / −14 | −13 / −14 | 6.3 / 6px | 6.3 / 6px | PASS |

Twin rerun verdicts (`report.py`): **390 = PASS** (all four metrics inside
thresholds). **1440 = PARTIAL whose every measured metric is inside threshold**
(hΔ 0.0 · fsΔ 0.0 · trigΔ 6.3): the only `missingMetric` is `rhythmGapPx`, null
on **both** sides (`rhythmLayered: true` for Heron too) — the 6+6 side-by-side
band has no vertical stack to gutter at desktop, the harness's documented n/a
case (run-001 §Harness gaps; identical shape to run-001's hero PARTIAL at
0.03/0.0/—/6.7, which run-001 lists under "what already passes"). Flipping it
would require restructuring the band to a vertical stack — explicitly out of
scope ("do NOT restructure") and it would unmatch Heron's own composition.

Probe line count: 13 lines @390 → **7 lines** (brief target 5–6; Arabic string
in a 342px cell vs Heron's 374px — see deviations); 8 → **6** @1440.

## Rules changed (all owning rules, no !important, no IDs, no tests touched)

1. `statement.css` — `.st-title`: `font-size: var(--fs-st)` removed from the
   (0,1,0) block; new **`.st-grid .st-body-col .st-title`** (0,3,0) seat:
   `4rem` base + `@media (max-width: 991px)` `2.4rem` — rem-pure on the same
   fluid root breakpoints Heron uses (0.5787/1.19904/2.54453vw), outranking
   `r330-home.css`'s later-imported (0,2,0) display-rung clamp that owned the
   old 43.92/47.63px cascade.
2. `statement.css` — `.st-partner .fo-ticker`: `margin-block-start: 0`
   (hero.css's base 40px `--sp-8` separator margin was landing inside the
   partner strip; band-local re-seat).
3. `strata.css` ≤767 — `.st-body-col` opening pad `--space-4xl` → `--space-3xl`
   (Heron's ~24px text-to-art opening; inline/bottom rungs kept).
4. `strata.css` ≤479 — DELETED the R315-era `.st-section` flex column block and
   both dead `padding-block: 4.03rem 3.22rem` rules (single-child band; pads
   already ruled to 0 by r330-home.css's later import); kept the 84.25rem floor,
   the 400–479 86.9rem step, `.fo-ticker-track` pad.

## Evidence

- Probes (consent-seeded, `__mdrkLenis` immediate seeks):
  `/home/z/evidence-r332/w2/baseline-{1440,390}.json` + `.png` (before) ·
  `after2-{1440,390}.json` + `.png` (after) · script `w2_probe.py`.
- Twin: `/home/z/evidence-r332/twin/w2-1440/` and `…/w2-390/`
  (`report.md`, `report.json`, 51+51 frames per vp, ranges, strips/heat).
- Contract doc: `docs/redesign/r332/sections/statement.md`.

## ≥3 substantive differences vs Heron — fixed

1. **Display type off the rem ladder (the headline defect)** — title rode
   r330-home.css's `--fs-h2/--fs-h1` display clamp (43.92px @1440 / 47.63px
   @390 = Heron's H2 rung) instead of the statement's own 4rem/2.4rem rungs →
   13-line phone wrap and +561px of type height. Re-bound to pure rem on the
   root's own breakpoints: 33.3333px / 23.8168px — Heron-exact (Δ0.00% both).
2. **Phone band +560.8px over Heron's 847px** (1408 vs 847, the headline
   filling ~3 screens) — type fix (−497.8), the crawl's foreign 40px margin
   (−40), and the cell's 4xl→3xl opening pad (−9.9) → **860.3 (+1.52%, PASS)**.
   The pains/journey trigger cascade above (run-001: +554.7) moves with it.
3. **Desktop band 40.7px over the 722.5px floor** — the oversized title made
   the body column (763.2) drive the band past Heron's exact 86.7rem cap; with
   the correct rung the 690px art cell governs and the floor pins **722.5
   exactly (Δ0.00%)**.
4. **Dead tier code ruling nothing (honesty pass)** — the ≤479 flex column +
   duplicate padding rules (stylelint duplicate-selector errors) retired; the
   final cascade now equals the authored intent: no section padding (cells ARE
   the band, Heron's home-intro anatomy) + the Heron rem floors.

## Gates

- `npx -y stylelint@16 src/styles/landing/statement.css src/styles/landing/strata.css`
  → statement 0 issues; strata 11 errors / 1 warning vs baseline 13 / 1
  (two duplicate-selector errors FIXED, none added).
- `npx tsc -b --noEmit` → clean.
- `npx vitest run tests/unit/r306-landing-sheet.test.ts tests/unit/landing-funnel.test.tsx`
  → 32/32 green.

## Honest deviations (documented, inside tolerance)

- 390 title = **7 lines** vs Heron's ~5–6 (Arabic manifesto, 342px cell — the
  24px side gutter is chrome.css's shared seat, not W2's; height still +1.52%).
- Heading letter-spacing 0 vs Heron's measured −0.02em (Latin-caps tracking;
  the project's Arabic display law pins ls 0 — `--type-display-letter-spacing`).
- Band 860.3 vs 847.2 @390: remainder is the partner desc/label anatomy Heron
  renders tighter; inside ±3%.
- 1440 verdict slot reads PARTIAL on the harness's n/a-rhythm metric (both
  sides layered); all measured metrics 0.0/0.0/6.3.
