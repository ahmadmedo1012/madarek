# heron-spec — frozen, machine-checkable specs (R335)

Provenance: measured live from https://heronaiapp.com/ with `scripts/spec/extract-heron.mjs`
(Playwright chromium, per-breakpoint viewports). Extracted <date below per file meta>. The
conformance suite (`scripts/conformance/`) consumes ONLY these committed JSON files — no live
Heron dependency in CI.

Method rules:
- Measured parameters only. No Heron text (reduced to length class none/short/medium/long),
  no assets, no fonts, no images (flag only). Copying Heron's content is forbidden.
- Role paths are structural (`<wrap> > tag[n] > …`) — stable across runs, mapped to our
  `data-spec="…"` hooks by the conformance mapping table.
- Motion is RECORDED, not guessed: gsap to/from/fromTo/set/timeline wrappers + the
  ScrollTrigger.getAll() table + Lenis constructor params, captured at setup time AND while
  programmatically walking the scroller (Heron's window never scrolls; `.main-inner` is the
  Lenis wrapper and ScrollTrigger scroller).
- Tolerances applied by the conformance suite: geometry ±2px or ±2% viewport; type ±0.5px
  after the documented Arabic scale factor; durations ±10%; easings by cubic-bezier sample
  distance <0.05; triggers ±5% viewport. Arabic adaptations (letter-spacing 0, line-height
  for ascenders, RTL mirroring) live in `scripts/conformance/exceptions.json` with a reason
  each, capped at 5% of assertions.
- Extracted 2026-11-04 (R335 A-Spec-1..4).

Files:
- `<section>.<bp>.json` — element tree (p/path, tag, tc/textClass, vr viewport-rect, sr
  section-rect, fs/lh/fw/ls/ff type, color/bg/border/radius/pad/margin/gap, opacity,
  transform (decomposed), interactive flag, transition/anim computed, hovers[] with
  before/after computed styles).
- `_page.<bp>.json` — scrollHeight, maxScroll, vh, marks in columnar form
  (keys[] + rows=[y, topVh[], hVh[]]; pin detection = constant topVh across
  scroll steps), Lenis params, wrap diagnostics.
- `_motion.<bp>.json` — triggers[] (start/end/pin/scrub/toggleActions/anticipatePin,
  animation duration), tweens[] (method, target role path, kept vars, timestamp).
