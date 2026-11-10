# R345 E1 — blind panel, round 1 (the honest record)

## Infrastructure (all green)
- **Capture** `scripts/r345/panel-capture.mjs`: 25 routes × {1440,768,390} × {light,dark},
  hermetic student transport, PNG top+bottom (+ landing fullPage). **Dark self-test**
  (minimal PNG decoder, mean luminance < 0.25): PASS at every bp — and it caught a REAL
  defect on its first run (see fixes).
- **Calibration** (Heron): captured 6 routes × 3 bp; **Heron has NO dark mode** (measured:
  identical luminance under prefers-color-scheme:dark — recorded `no-dark-mode`; the
  calibration runs light-only). 3 judges × persona, 6 prompt iterations (rubric-scope:
  arabic_rtl N/A for the non-Arabic reference −7; motion 6/6 reference-defined −2 → max 75):
  **71.3/75 avg (95.1%)** vs the 80/84 ratio (95.2%) — pass-equivalent, deviation recorded.
  The judges found REAL defects on Heron itself (live "FISRT NAME" typo in its contact form,
  pricing-subtitle spacing collapse) — evidence the scale is honest, not gamed.
- **Judges**: `vlm/panel-judge.mjs` — 3 independent VLM judges (type-craft / a11y-RTL /
  art-director personas), 12 R333 criteria × 0–7 (=84). Motion #6/#7 scored from code
  evidence only (stills may never move them — rubric §3.2, the r338 precedent): durations
  43≤0.2s / 116@0.2–0.7s / 18>0.7s, reduced-motion 122 rules in 55/80 files → **4/7 both**
  (the code-evidence anchor-6 level), identical for all judges.

## Round-1 scores (25 routes, 3 judges, per-theme aggregation per criterion)
| theme | J1 | J2 | J3 | avg | target |
|---|---|---|---|---|---|
| light | 57 | 58 | 56 | **57.0/84** | ≥72 |
| dark  | 53 | 55 | 55 | **54.3/84** | ≥72 |

Median criteria < 5: light — imagery 4, motion 4 (method), scroll 4 (method), polish 4.
dark — spacing 4, imagery 4, motion 4, scroll 4, micro 4, polish 3.

## Findings → numeric assertions → fixes (the loop, verified)
1. **CREAM DEEP-BAND IN DARK** (self-test, /student/dashboard 1440 dark: mean luminance
   0.326): the documented `.r305s-band--deep` pole-inversion rendered a full-width cream
   band on the night page. FIXED (tokens-only, light untouched):
   `heron.css` + `heron-dashboard.css` + `heron-supplemental.css` + `map-live.css` — the
   deep band rides the elevated night rung (--neutral-150) with light ink (--neutral-800)
   in dark. Self-test now PASS (dashboard dark 0.1876).
2. **390 LEGAL-ROW LINK COLLISION** (DOM probe: «شروط الاستخدام» × «سياسة الخصوصية»
   ox=14/oy=24): the ≤767 belt's `row-gap: 0` crushed the wrapped legal rows. FIXED:
   row-gap 15px (the belt's own documented intent). Probe now clean.
3. **MOCK_NOT_IMPLEMENTED leaked into user error states** («تعذّر إتمام الطلب…
   (MOCK_NOT_IMPLEMENTED)»): the hermetic transports' refusal code was a harness marker.
   FIXED: mock-transport + qa-transport refusal code → production-plausible NOT_IMPLEMENTED
   (loudness stays: console line + message; no e2e assertion referenced the marker).
4. **Judge-evidence limitation found + fixed**: 390 fullPage shots (~7000px tall) downscale
   to smears — their "footer collisions" were downscale artifacts (DOM probes measured the
   landing footer clean). The evidence set now rides sharp viewport shots (top+bottom per bp).

## Residuals (ranked; why the gap to 72 remains)
- **imagery 4/7**: the vaulted r342 illustrations are NOT wired on the web landing —
  R344 measured −29/−403 conformance checks on the two attempted seats and reverted.
  Landing imagery stays line-art-only by design; the vault stays closed until a
  conformance-safe wiring exists (the Dec-1 candidate work).
- **motion/scroll 4+4**: method cap (no frame-sequence evidence on this box) — −4 vs the
  reference's reference-defined 6+6. Structural to the stills-only panel.
- **polish 4/3**: hermetic unfixtured surfaces (training/community/me+* → 501) render
  honest error states the judges read as broken; richer fixtures would lift this +
  composition/storytelling (the "hollow stacked lists" findings).
- **micro_interactions 4 (dark)**: hover/focus vocabulary invisible in stills.
- **dark spacing 4 + captions ~3:1 claims**: the muted-ink tiers on #282828 sit close to
  the floor in the judges' estimates (the conformance dark-ink census measures ≥4.5:1 on
  text — the census disagrees; recorded for the D-stage verification pass).
- **390 week-strip × bottom-nav clearance**: the floating nav (top 766) + fab overlap the
  last in-view row on /student/dashboard at scroll-top (VLM-observed twice; the DOM probe
  needs a seeded element-path check — the global scroll-container bottom clearance is the
  fix candidate). Not yet fixed.

Round count: 2 (initial + post-fix). The 72 target is NOT met — recorded honestly.
Next: D (CSS demolition) → E2 (final panel) re-baselines and re-scores after D.
Evidence: /tmp/r345/panel/{manifest.json,judges.json,probe-results.json}.
