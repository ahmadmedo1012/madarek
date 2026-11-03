# R332 — REPORT (working draft, updated as lanes close)

**Round:** HERON TWIN — make the Madarek home page a structural/rhythm/motion twin of
https://heronaiapp.com/, judged by `scripts/twin/` (the automated Twin harness), then push the
grammar outward and consolidate CSS. This file reports what is TRUE at each commit; gaps stay
listed until closed.

## The judge — Twin harness (`scripts/twin/`, Python Playwright + live reference)

One session, two pages (live heronaiapp.com + local :5173). Heron driven on its real scroller
`.main-inner`; Madarek via `window.__mdrkLenis` immediate seeks. 51 frames per section per side
(every 2% of the section's own progress). Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px ·
trigger-start Δ≤40px. Verdict rule: FAIL beyond 2×, PARTIAL between, PASS within.

## Results

### @1440×900 (run-003 — post-all-waves, 51/51 frames × 9 sections × 2 sides)
| section | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | verdict |
|---|---|---|---|---|---|
| hero | 0.03 | 0.0 | n/a¹ | 6.7 | PARTIAL¹ |
| statement | 0.00 | 0.0 | n/a¹ | 6.3 | PARTIAL¹ |
| pains | 0.01 | 0.0 | n/a¹ | 6.3 | PARTIAL¹ |
| journey | 0.65 | 0.0 | n/a¹ | 6.4 | PARTIAL¹ |
| platform | 0.04 | 0.0 | n/a¹ | 35.1 | PARTIAL¹ |
| why | 0.31 | 0.0 | 0.0 | 35.5 | **PASS** |
| roles | 0.01 | 0.0 | n/a¹ | 37.6 | PARTIAL¹ |
| cta | 0.21 | 0.0 | 0.0 | 37.7 | **PASS** |
| footer | 0.10 | 0.0 | 0.0 | 39.3 | **PASS** |

¹ rhythm n/a = the harness's documented gap: single-child/layered bands have no comparable
vertical gutter on either side (same shape as run-001's hero PARTIAL). **Every measurable metric
is in threshold for all nine sections.**

### @390×844 (w390a/w390b/w390b5 runs)
| section | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | verdict |
|---|---|---|---|---|---|
| hero | 0.23 | 0.05 | n/a¹ | 7.9 | PARTIAL¹ |
| statement | 1.52 | 0.0 | 0.0 | 6 | **PASS** |
| pains | 0.03 | 0.05 | n/a¹ | 7.0 | PARTIAL¹ |
| journey | 0.47 | 0.0 | n/a¹ | 7.3 | PARTIAL¹ |
| platform | 2.48 | 0.0 | n/a¹ | 29.9 | PARTIAL¹ |
| why | 1.52 | 0.05 | 0.0 | 38.2 | **PASS** |
| roles | 0.03 | 0.05 | **12.0** | **50.6** | PARTIAL |
| cta | 0.02 | 0.0 | **12.0** | **50.9** | PARTIAL |
| footer | 2.08 | 0.0 | 0.0 | **50.9** | PARTIAL |

**Honest mobile gap (roles/cta/footer @390):** rhythm Δ12 (+4 over) and triggers ~50 (+10 over).
Diagnosis chain: the +44px cumulative drift above why (statement +13 / journey +22.6 / platform
+14 — each within its OWN ±3% but compounding) plus a 12px gutter the walker attributes to
`.rl-more`/`.fo-hero-meta` margins that later belts re-seat. Heights and type are in threshold;
six edits landed (triggers 103→50.9); the remaining 4-10px need one more belt pass (≤479 §LAW
re-seats) — tracked below.

### The five supervisor defects — status
1. **Hero inner box** — CLOSED (W1): `.bp-stage` inner frame defeated via specificity reset;
   drawing full-bleed 1440×519.6 ink (flat-white 0.88→0.00); caption overlaps 0 at 5 viewports.
2. **Pains 390 overprint** — CLOSED (W3): root cause implicit-vs-explicit grid tracks; one
   declaration; overlaps 10/9/9/1 → 0 at 320/360/390/430; real scroll-snap carousel.
3. **Statement 390 giant headline** — CLOSED (W2): rem-ladder owner seat; 1440 0.00%/0.00%,
   390 PASS (860.3px, 23.82px exact).
4. **Journey pin anatomy** — CLOSED for type/height (W4+W4c+W390a: title 4rem rung both tiers,
   fsΔ 0.0; height 0.45-0.65%; 473dvh track intact); panel-overprint fix landed in the W4
   partials (panel in own grid cell); room labels ride the mono register.
5. **Post-pin type/voids/CTA** — CLOSED @1440 (why/cta/footer PASS); @390 roles/cta/footer carry
   the residual rhythm/trigger gap above.

## Tooling actually used
Actions API CI checks (every push) · Python Playwright twin harness (6+ full runs, 51×9×2 frames
each @1440) · PIL (thumbnails, diff means) · live DOM probes (getComputedStyle chains) ·
stylelint@16 JSON census · Vite --force dep re-optimization · odiff (scout smoke) · purgecss 8
smoke (scout) · npm registry + GitHub API currency scans · environment-reset recovery ×2.

## Gates
- CI on main: green through `ccfeab7b` (every row API-checked; two E2E runner-load flakes
  re-run green and named — distinct tests, same timeout signature, local greens ×2 each).
- tsc 0 · vitest 242 files / 3079 tests · stylelint no NEW issues (54 pre-existing errors are the
  split's documented shared.css debt) · motion/color/raw-css/size gates 0.
- `impeccable detect`/contrast/horizontal-scroll/CLS probes: CLS 0.0041 ✅, h-scroll 0 ✅
  (W1/W3/W10b probes), reduced-motion instant ✅, theme-refresh ✅.

## Remaining gaps (honest, tracked)
1. **@390 roles/cta/footer rhythm +12 / trigger +50** — one more ≤479 belt pass (donor chain
   documented above).
2. **1024 / 768 / 1920 / 360 + WebKit matrix** — not yet swept by the twin (1440 + 390 done);
   blind sheets generated at 1440 only.
3. **Blind 3-reviewer panel** — **PASSED on the third run (all three INDISTINGUISHABLE, 0/9
   confident Heron IDs each)**. Run 1 invalidated (mid-reveal wash-outs, both reviewers concurred);
   run 2 DISTINGUISHABLE on two grounds — heron's fixed cookie-banner/awwwards overlay present 9/9
   vs madarek 0/9 (unblinds every pair) + reveal-settle budget exceeded 6/9. Fixes: both sides'
   consent/badge chrome masked in the harness; reveal observers primed before capture
   (`capture.py`/`blind.py` policies). Run 3 (final): A-QA-1F/2F/3F → 0 confident IDs; QA-3F
   global note: "one design system on both sides — same canvas 244–245, same 1px hairline y=62,
   orange as sole accent >96% on both". Residual: 7/18 frames still wash (both sides, symmetric —
   discarded as state artifacts by all three reviewers); flagged harness follow-up: state-
   controlled recapture for roles/platform.
4. **W11 authenticated web grammar** — pending lane.
5. **W12 CSS consolidation** — ≤33k / !important=0 / no rNNN names: landing family done
   (per-section sheets, pixel-identical); the 12-step plan (css-baseline.md) executes next.
   NOTE: the two "orphan" sheets (unified-parity.css, shared-design-system.css) are LOAD-BEARING
   parity-export artifacts (verify-parity-export.mjs) — they must NOT be deleted (corrects
   css-baseline.md's step 1).
6. **≥55fps@4× CPU** — unreachable on this host (37.5fps @1× control, 0 long tasks; CLS
   0.0041). Engine-side cost is not the constraint (W9 attribution table).
