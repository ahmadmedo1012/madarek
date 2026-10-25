# D4 evidence — mid-state label + INTRODUCTION card

## (a) active-room label state-safe ink

- Root cause: `LearningPlanDrawing` PLAN_INK_CSS flipped the ACTIVE zone's
  `.pl-name`/`.bp-micro` to `#FFFFFF` the instant `data-stage` flipped, while
  the zone wash crossfades `fill-opacity` 0→1 over `t-fast` — the white label
  rode the salmon mid-wash (#FA3600 @50% over the #F6F6EE sheet ≈ #F89677)
  at ≈2.18:1.
- Fix: active labels + area micros are STATE-SAFE INK `#282828`
  (13.4:1 paper · ≈6.6:1 salmon mid-wash · 3.85:1 settled #FA3600 — ≥3:1,
  the register's own bar). The active door-station keeps its white-on-red
  chip grammar; the chip now SNAPS with the discrete stage flip (no t-fast
  fade = no white-on-salmon window for the `[0n]` mono).
- Proof (computed, live on :4228 @1440):
  - settled stage 2: `labelFill: rgb(40,40,40)`, `labelStroke: none`,
    zone fill `rgb(250,54,0)` @ opacity 1 → `d4-label-settled-1440.jpg`
  - frozen mid-state (zone `fill-opacity:.5`): label still `rgb(40,40,40)`
    over the salmon blend → `d4-label-midstate-1440.jpg` (VLM: clearly
    readable dark ink in BOTH states; no washed-out state).

## (b) INTRODUCTION card ghost line

- Root cause found (verified in the live DOM + computed styles): the R315
  whole-card fade NEVER RAN — `opacity: clamp(..) * clamp(..)` is a bare
  product (invalid outside `calc()`), so the declaration was dropped and
  computed opacity sat at **1 at every `--jt-p`** (probe table: p
  0/0.2754/0.3/0.32/0.34/0.5/0.65/0.7 → opacity "1" on 5466b5c). The card
  POPPED on its `data-on` visibility flips; repairing the fade naively
  (wrapping the product in `calc()`) would put the resolving «في مدارك»
  line (window .30–.38) over a translucent ground with the plan's west
  wall + hatch strip strokes showing through at y≈735 — exactly the
  registered ghost.
- Fix: a SPLIT fade that is ghost-proof by construction:
  - the GROUND ramps `.28→.30` (in) and `.67→.68` (out) via
    `color-mix(var(--text) calc(clamp×clamp×100%), transparent)` — both
    windows are TEXTLESS (lines scrub from .30, the cue resolves .62+);
  - the CONTENT (title + lines block) fades `.28→.30` in (same ramp as
    the ground — the title never exceeds the ground) and `.62→.68` out
    OVER THE SOLID GROUND.
  - At every instant content-opacity ≤ ground-opacity (probe table:
    p=.29 → bg α .5 / title .5 · p=.30 → solid / 1 · p=.66 → solid / .33 ·
    p=.675 → bg α .5 / title .083) — no text can ever render over a
    see-through sheet.
- "ONE text node per line": verified in the live DOM — each `.jt-intro-line`
  is exactly ONE `ScrubReveal` wrapper (aria-label) + its word masks
  (R318 §A1 architecture, pinned by wordreveal.test.tsx); NO duplicate
  text layer exists in the current tree (outerHTML dumped at p=.42).
  The stale "layer" was the dead fade formula, removed above.
- Screenshots: `d4b-card-before-p030.png` (old build: card already fully
  opaque at p≈.30 — the dead fade) · `d4b-card-after-p030.png` (ground
  α .955 ramping, line 1 still masked — textless) ·
  `d4b-card-after-p043.png` (settled mid-dwell, all lines over the solid
  ground).
