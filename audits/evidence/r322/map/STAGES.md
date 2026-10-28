# R322 C3 — the map transplant stage table (WP-3b evidence)

Shots: `state-<nn>-<slug>-<bp>.jpg` (18 files, q70, 748KB total). Scroll values are
`.main` scrollY after the pin-fraction hop (`scripts/r322/_wp3b-states.mjs`).

## The 6 narrative states (as landed)

| # | state | pin p | scroll @1440 / @768 / @390 | data-stage | what the frame shows |
|---|---|---|---|---|---|
| 01 | statement | 0.02 | 2665 / 3248 / 3123 | 0 | card1 «الرحلة مرسومة على مسطح واحد» ON over SETTLED paper — the plan base (frame + envelope) visible from frame one (V2 DEAD) |
| 02 | plan | 0.16 | 3357 / 3823 / 3588 | 0 | card1 fading out (t≈1.29s of the sequence) — the transient pure-paper beat; card2 arrives next |
| 03 | card | 0.45 | 4790 / 5014 / 4552 | 2 | the INTRODUCTION card active + finding 1 — compact, content-sized, bottom-left free margin (V3 DEAD) |
| 04 | findings | 0.66 | 5827 / 5845 / 5186 | 3 | plan layer 1 ON (the drawing begins), findings rotate one-at-a-time |
| 05 | room | 0.90 | 7013 / 6819 / 5960 | 4 | all 6 layers ON — the finished plan; orange = the bounded room wash only |
| 06 | closing | 1.00 | 7507 / 7225 / 6283 | 5 | sticky released; the closing column reveals (reserved geometry — no layout animation); `[05/05]` counters complete |

## The machine (conductor-driven, zero GSAP)

- ONE sticky frame `.jt-pin` inside the `.jt` track (5841px @1440 — lands `.chapters` ≈6191px ≈ Heron 6300 within the ladder band).
- Entrance window p −0.167→0: the whole stack descends (translateY write, ≤991: none — Heron's empty @390 tween).
- Sequence window p −0.082→0.952 → t = 5.52·p2o(u): card1 in/out (0–1.5s) · card2 in/out (1.5–3s) · layer1 + room paths (2.5–3s) · layers 2–6 (3.02–5.52s, ≈0.5s each).
- Per-tick writes: **direct `style.opacity`/transform on ≤12 roots** — the 756-element inherited `--jt-p` walk is DEAD (perf-baseline §7-1 mandate); findings/counters/wash/closing are discrete `data-*` flips (≤700ms transitions).
- Reduced motion: the complete static sheet (all layers on, findings stacked, closing open) — r306 RM belt green.

## Gates (foreman-verified on this tree)

- lint 0 errors / tsc 0 (root, all four) / vitest **2738/2738** / raw-css PASS
- duplicate-selector 65 = baseline · hover-guard 177 ≤ 182
- **svg-collisions landing 390/768/1440 × light/dark: 0 FAIL** (V9 DEAD)
- r321 sweep landing: text-in-viewport **green** (after the `.fo-hero-work` marquee clipContainers entry) · duplicate-text = the product prf-* farm only (V6, C4) · **docH-ladder green — main was failing 360 (+3.01%) / 390 (+1.75%), this tree is in band at all 5 + 6 pins**
- r319 gate landing rows 6/6 green; paired-state lint: the 4 C2-stale hero entries cleaned (6 pre-existing XOR violations in auth/training CSS unmasked — filed, not C3)

## Deviations from Heron (with reasons)

1. **Closing column geometry reserved from state 0** (opacity/clip reveal at the end) instead of Heron's 1427→963 width animation — the measured 0.187 pin-end CLS dies; layout animation of a paint-heavy plan is the V11 mechanism. Noted as a polish candidate only if a clip-path flip can be proven CLS-free.
2. **Display weights w600** (Heron w700) — the owner brief caps display at 400–600.
3. **card2 = «لكل فصل غرفته وبابها»** (not the suggested «أربعة فصول تتحرك أمامك») — that phrase already heads the chapters band; reusing it would duplicate a headline (V2's own defect class + the duplicate-text gate).
4. **The `.expanded` flip is monotonic** (no direction-sensitive sticky-flip) — simpler, and reverse-scroll never shows a half-flipped frame.

## Remainder (foreman / C4)

- wy-section RM growth (+1112px @1440 RM — PRE-EXISTING on main, verified on main's own build) breaks the r320 RM ratchet @≥1024 → C4 wy-transplant ticket.
- Product prf-* card farm duplicates (V6) → C4 product transplant.
- 6 XOR paired-state violations in auth/training CSS (pre-existing, unmasked by the stale cleanup) → §B/clean wave.
- r320 gate owner-dashboard cleanliness rows (mock-transport gaps) → gate-baseline hygiene ticket.
- The 3 hover cards (Heron's desktop-only hover furniture, 23.51rem) — NOT transplanted this cycle (IX2-unreachable in the capture); candidate for the C4 polish pass.
