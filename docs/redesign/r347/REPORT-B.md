# R347 REPORT-B — Lane B exit table (honest; branch wip/r347-b)

| criterion | state | evidence |
|---|---|---|
| D6 fixed (map: caption/plan/annos/intro/ink/camera) | **✓ at cause** | DEFECTS-B.md rows D6a-D6f; every fix deletes its cause (the drift, the overlay seats, the ghost crossfade, the lerped camera) — no layer of CSS on top |
| D7 fixed (problems + why) | **✓ at cause** | the pm overlaps were drift phantoms (died with D6a); the why captions' page-wide leak died with the live-gate fix (D7b) — wy-cap fixed-over-text 44 → 0 |
| detector = 0 findings in the map/problem/why sections | **✓ 0** | `/` @1440/768/390 × light/dark: fixed-over-text 0 · text-on-text 0 in Lane B's sections (28 residuals on `/`, all attributed to Lane C's product section) · big-fixed 0 (the sticky window allowlisted with its written reason) · clipped 0 · hoverflow 0 |
| plan drawing consistent line weight | **✓** | [data-xl] opacity 1 from frame one; the ghost crossfade + the art-register tint reveals deleted; the room washes carry the story |
| VLM ≥ 8 each section, both themes | **desktop map: 8/10 light · 8/10 dark ✓** — mobile map, why, pm, hero: **PENDING-VLM** (the credential note in DEFECTS-B: the box wipe took the user-level VLM token mid-lane; the after-shots are captured and wait for the next session's judge) | transcripts quoted in DEFECTS-B |
| counts held | **✓ with re-keys** | unit 3038/3038 (the r312 pins re-keyed with written reasons — the drift, the ghost formula, the camera table, the crop values, the plaque belt); e2e 38/38 across r309/r308/r312/r325; backend untouched |
| bundle ≤ 770 KB gz | **✓ 759.8** | check-bundle-size PASS |
| size gate / stylelint ratchet | **✓** | `!important` 52 held (zero added); verify --fast PASS |
| conformance ratchet | **✓ PASS at 92.1%** (the floor held; no give-back, no re-keys needed — the seat changes measured within tolerance) | scripts/conformance/results.json |
| CI | expected green (verify --fast + the suites above; the detector step in verify FULL stays red until Lane C clears the product section — that is the gate working, not a Lane B defect) | — |

## What changed (files)
`frontend/src/components/landing/journey/JourneyScene.tsx` (the drift, the layer crossfade, the art register deleted; the plaques + counter chip re-seated into the statement band; the intro card in flow below the window; the SNAP camera) · `frontend/src/styles/landing/journey.css` (the map column's flex grammar: band/window/card in flow; the window flexes to the leftover space at ≤991; the annos' collision-free grid; the idx chip's band seat; constant ink; the halo retired) · `frontend/src/components/landing/LearningPlanDrawing.tsx` (the M2 labels +10 units below their names; the [05] station chip/label/leader re-seated clear of the mastery label pair) · `frontend/src/styles/landing/why.css` + `scripts/conformance/gen-why-wrap.mjs` (the caption stage rule gated on live — in BOTH the sheet and its generator) · `scripts/qa/overlap.mjs` (the one sanctioned adjustment: svg text clipped to its element box — phantom/out-of-crop rects no longer count) · `scripts/qa/overlap-allow.json` (the sticky window's entry, written reason) · tests re-keyed: `tests/unit/r312-mobile-camera.test.tsx`, `tests/e2e/r312-mobile-camera.e2e.ts`, `tests/e2e/r325-map-clip.e2e.ts` · new: `docs/redesign/r347/DEFECTS-B.md`, this report.

## Residuals / handoff
- **Lane C (D8)** owns every remaining `/` finding (28): the product section's shrunk plates (`pr-label` × `لتجربتها حيّة الآن`, `pr-title` × `pr-title`, `lp-numeral`, `reveal-up` pairs). After C lands, the detector's `/` sweep goes fully green and Lane Z arms the CI step (the deferred block sits commented in ci.yml).
- **PENDING-VLM** (next session, first 20 minutes): re-judge `audits/evidence/r347/B/{D6-after-390×844-light-y2600,y4500,y5100; D6-after-390×844-dark-y4500; D7wy-after-1440×900-light-y10000; D7pm-after-1440×900-light-y1620; hero-after-1440×900-light-y0}.webp` vs the Heron refs (`heronref-win0-y0.webp` the drawing band, `heron-ref-home-390.png` mobile, the hero shot) — ≥8 closes the table; anything lower gets fixed at cause.
- The box wipe ate the pre-wipe evidence binaries; the earned judgments + transcripts are quoted in DEFECTS-B and the code state is gate-verified identical.
