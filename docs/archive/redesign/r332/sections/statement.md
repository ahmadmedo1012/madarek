# W2 · Statement (`#statement` / `.st-section` / `home-intro-wrap`) — the rem-ladder fix (R332)

Owner: W2 · files: `styles/landing/statement.css` (full authority) + the `.st-` tiers in
`styles/landing/strata.css` (targeted edits only) · harness: `scripts/twin/` ·
defect: run-001 §Supervisor-3 (statement 390 FAIL — band 1408px vs 847px, heading
47.6px vs 23.8px, the headline filling the viewport for ~3 screens; 1440 FAIL —
763.2px vs 722.5px, 43.92px vs 33.33px).

## Heron fact

`docs/redesign/r331/heron-program.json` + run-001 captures
(`/home/z/evidence-r332/twin/run-001/{1440,390}/statement/`):

- **The intro title is rem-pure on the fluid root** — 33.33px @1440 = **4rem**
  (the h3 rung; Heron sizes the scrub title a rung under its section H2s) and
  23.8168px @390 = **2.4rem** on the 2.54453vw phone root. One rung per band,
  no px pins: the same ladder the `html` rate already rides (tokens.css:
  0.5787vw ≥992 · 1.19904vw ≤991 · 2.54453vw ≤767). Measured h2 @390:
  23.8168px / lh 26.1985 (1.1) / w600 / ls −0.02em; ~5–6 Latin lines.
- **Band height**: `home-intro-wrap` = `clamp(60.4rem, 100dvh − 1.6rem, 86.7rem)`
  (heron-program.json:126) → **722.5px @1440** (the 86.7rem cap on the 0.5787vw
  root) and **847.2px @390** (content over the 828px dvh floor). Anatomy @390:
  art **374.1×374.1** (full inner width, ~8px side inset) + a **flush** text
  stack (level-3 gutters `[0, 0]` — art → title → partner rows with no dead
  air), title starting ~24px under the art.
- Intro content pad @1440: 6.4rem 15rem 3.2rem; **no section padding** — the
  cells ARE the band.

## Madarek now (probe-before, `/home/z/evidence-r332/w2/baseline-{1440,390}.json`)

The cascade of record for the title was **`r330-home.css`'s
`.st-body-col .st-title { font-size: clamp(var(--fs-h2), 3.05vw, var(--fs-h1)) }`**
— a (0,2,0) seat imported AFTER `landing/statement.css` and `landing/strata.css`
(LandingPage.tsx import order: statement 72 · shared 80 · strata 82 · r330 88),
so R322's documented `--fs-st` seat never computed. `--fs-h2 = 4.8rem` rides the
root too — at 390 that is exactly 47.63px (the measured 2× defect):

| vp | band h | heading fs | lines | note |
|---|---|---|---|---|
| 1440×900 | **763.2** (floor 722.5 pinned under it) | **43.92** = 3.05vw mid-term | 8 | body col drove the band 40.7px over the floor |
| 390×844 | **1408** (floor 836.07 buried) | **47.6336** = 4.8rem × 9.9237 root | **13** | 12+ line wrap → +561px of type |

Secondary phone air (probe deltas): the partner strip carried a **40px foreign
margin** on the crawl — hero.css's base `.fo-ticker { margin-block-start:
var(--sp-8) }` (the hero band's separator air) landing inside `.st-partner`
(the strata ≤479 `.fo-ticker` 4.03rem rule was a duplicate of it); plus a
band-scale 4xl opening pad on the stacked `.st-body-col` vs Heron's ~24px
text-to-art gap.

## Delta

| metric | Heron | Madarek before | Δ | pass? |
|---|---|---|---|---|
| h 1440 | 722.5 | 763.2 | +5.33% | FAIL |
| heading fs 1440 | 33.33 | 43.92 | +24.1% | FAIL |
| h 390 | 847 | 1408 | +39.8% | FAIL |
| heading fs 390 | 23.8 | 47.63 | 2× (+50.0%) | FAIL |
| trigger 1440/390 | −6.7/−8 | −13/−14 | 6.3/6px | PASS |

## Fix (W2-owned edits — applied)

1. **`styles/landing/statement.css` — the display type re-bound to the rem
   ladder.** The `font-size: var(--fs-st)` line left the (0,1,0) `.st-title`
   block and the ladder now owns a **(0,3,0) seat that outranks r330-home.css's
   (0,2,0) re-seat regardless of import order** (no `!important`, no IDs):

   ```css
   .st-grid .st-body-col .st-title { font-size: 4rem; }        /* 33.33px @1440 */
   @media (max-width: 991px) {
     .st-grid .st-body-col .st-title { font-size: 2.4rem; }    /* 22.1px @768 · 23.82px @390 */
   }
   ```

   Same breakpoints the root rate steps at (≤991; the ≤767 phone rate does the
   px work at 390 — one rung, exactly Heron's band-independent ladder). The
   `--fs-st` clamp token stayed in tokens.css (not W2's file); its 22.1px floor
   missed 390 by +7%, which is why pure rem wins.
2. **`statement.css` `.st-partner .fo-ticker`** — `margin-block-start: 0`: the
   crawl rides inside the partner strip since R322 (2-c); the base hero.css
   40px separator margin donated dead air here. Band-local (the strip is the
   class's only consumer), deletes the stale duplicate in strata.
3. **`strata.css` ≤767 `.st-body-col`** — opening pad 4xl → 3xl (Heron's ~24px
   text-to-art opening); inline/bottom rungs keep the R322 seat.
4. **`strata.css` ≤479 statement tier** — the R315-era `.st-section` flex
   column + both 4.03/3.22rem pad rules DELETED: the R322 transplant left
   `.st-grid` the band's only child (nothing to distribute) and r330-home.css's
   later `.st-section { padding-block: 0 }` already rules the pads (the cells
   ARE the band). The `.st-section { min-block-size: 84.25rem }` Heron step,
   the 400–479 (86.9rem) step, and the 480–767 / 768–991 / ≥992 floors stay.

`LandingPage.tsx`, `r330-home.css`, `hero.css`, `tokens.css` untouched; no
`!important`, no ID selectors, no patch-on-patch (each edited rule is the
owning rule of its final cascade value).

## Proof

- Before probe: `/home/z/evidence-r332/w2/baseline-{1440,390}.json` + PNGs
  (`w2_probe.py`, consent-seeded `madarek.consent`, `__mdrkLenis` immediate seek).
- After probe: `/home/z/evidence-r332/w2/after2-{1440,390}.json` + PNGs —
  1440: 722.5 / 33.3333px / 6 lines (grid 690 art-driven, floor pins exact);
  390: 860.3 / 23.8168px / 7 lines (art 342 + bodyCol 518.3, partner 129.9).
- Twin rerun: `/home/z/evidence-r332/twin/w2-390/report.md` — **PASS**
  (hΔ 1.52% · fsΔ 0.0% · rhythm 0.0px · trigΔ 6px);
  `/home/z/evidence-r332/twin/w2-1440/report.md` — **PARTIAL with every
  measured metric inside threshold** (hΔ 0.0% · fsΔ 0.0% · trigΔ 6.3px;
  the missing metric is `rhythmGapPx`, null on BOTH sides — the 6+6 side-by-side
  band is a layered composition on Heron's side too, the harness's documented
  n-a-rhythm case; same verdict shape as run-001's hero PARTIAL at 0.03/0.0).
- Gates: stylelint `statement.css` 0 issues, `strata.css` 11 errors vs baseline
  13 (the fix removed 2 duplicate-selector errors, added none); `tsc -b
  --noEmit` clean; `vitest run r306-landing-sheet.test.ts landing-funnel.test.tsx`
  → 32/32 green.
- Honest deviations: 390 title wraps **7 lines vs Heron's ~5–6** (Arabic string,
  342px cell vs their 374px — width is the chrome.css shared gutter seat, not
  W2's); heading keeps ls 0 vs Heron's measured −0.02em (Latin-caps tracking;
  the Arabic display law pins ls 0 — documented deviation, fontSize metric
  unaffected); band 860.3 vs 847.2 (+1.52%, inside ±3%) — the remainder is the
  partner desc + label block anatomy Heron renders tighter.
