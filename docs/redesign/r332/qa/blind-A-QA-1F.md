# Blind Review — A-QA-1F (final run, R332 twin round)

- **Material:** `/home/z/evidence-r332/twin/run-003/blind/1440/` — 9 pairs, 1440×900, key sealed.
- **Method:** vision-model pass (1 call/pair, structured artifact→structure→delta prompt) cross-checked with deterministic pixel metrics: row/column band profiles (guarded NCC, vertical shift-search ±360px), percentile-stretched edge maps (wash-out invariant), horizontal-mirror NCC (RTL control), hairline/seam census, accent-mass localization, capture-state checks (black-point p1, contrast, sticky-chrome strips).
- **Bias control applied:** wash-out signatures (lifted p1, collapsed std) found on **cta-B, pains-B, roles-B, platform-B(mild), footer-A, journey-A, why-A** — discounted before any identity/structure attribution. No consent chrome, no dark sticky bars, no duplicated nav on either side (prior-run overlay-chrome asymmetry: absent). Vertical anchor offsets of +100…360px between sides detected in 8/9 pairs (row-rhythm NCC peaks at offset) → treated as capture-state, not structure. Text/brand blur honored; language direction treated as global note.

## Verdict table

| # | Section | Call | Conf | One structural cue |
|---|---------|------|------|--------------------|
| 1 | cta | same structure / rhythm — cannot tell | 65 | 3-band skeleton matches (row NCC 0.50 @ −96px); B's "missing central drawing panel" sits entirely inside a wash-out (p1 177 vs 95, std 14 vs 26) → artifact, not identity |
| 2 | footer | same structure / rhythm — cannot tell | 75 | Identical band sequence and column splits incl. 5-panel thumbnail row and ruler-framed logotype band; deltas are A-side wash + B-side extra top strip (sticky-state, discarded) |
| 3 | hero | **A ≠ B — structural mismatch, cannot attribute blind** | 70 | Both sides crisp (no wash to discard): A = full-bleed drawing + nav strip + stemmed callout layer; B = corner-mark frame, centered denser panel, right ticker, no nav. Edge NCC 0.23, col NCC −0.47 (mirror does **not** win) — only pair whose divergence survives artifact discounting |
| 4 | journey | same structure / rhythm — cannot tell | 70 | One dominant drawing on a paper field both sides; mass mirrors L/R (mirror-col NCC 0.30 vs −0.12 unflipped) = RTL global note; A's boxed corner card vs B's rule+blocks is sub-structural |
| 5 | pains | same structure / rhythm — cannot tell | 65 | 4-column rhythm mirrored (mirror-col NCC 0.63, strongest of nine); row rhythm matches at −360px (0.67); B's "empty lower 40%" is wash + anchor offset (p1 182, std 9.6), not absence |
| 6 | platform | same structure / rhythm — cannot tell | 60 | Row rhythm matches at +360px (0.67); both sides carry a large top orange accent mass (A 18.7k px, B 10.1k px, both top-middle); B's skeletal irregularity reads only through its wash |
| 7 | roles | same structure / rhythm — cannot tell | 55 | Shared band rhythm at +180px (0.35, weakest match); B's "row-table, no drawing" reading is untrustworthy under wash (p1 183, std 9.6); A's split-canvas + title block stands crisp |
| 8 | statement | same structure / rhythm — cannot tell | 70 | Shared two-column ruled grid with large orange disc overlapping the drawing — disc mirrored (A mass at x 0.84, B at x 0.31) = RTL; row rhythm 0.68 @ +186px |
| 9 | why | same structure / rhythm — cannot tell | 65 | Best band-rhythm match of the nine (0.71 @ −132px; mirror-col NCC 0.58); A-side "ghost page" + floating UI panel are capture artifacts, discarded |

## Per-section non-content differences (≤3, side named)

- **cta:** (1) B: whole mid band washed/half-revealed; (2) B: fold truncates footer columns mid-render, A's fold completes; (3) A: denser coordinate/annotation furniture (dashed hairlines, coordinate labels).
- **footer:** (1) A: global wash + logotype half-rendered; (2) B: extra segmented strip in top 120px absent on A (sticky-state, discounted); (3) B: top-third edge energy 9.1 vs A 2.4 (consequence of 1+2).
- **hero:** (1) A: nav strip present, B: none (corner registration marks instead); (2) annotation model: A stemmed circular callouts across full width vs B two square markers pinned to drawing; (3) B middle-third density 30.3 vs A 19.4 edge units (B panel darker/denser).
- **journey:** (1) A washed (p1 128 vs 40); (2) mirrored whitespace balance (RTL note); (3) A text in boxed corner card, B text as unboxed blocks under a hairline.
- **pains:** (1) B washed, no darks; (2) A full-height hairline dividers + [0n] index tags unverifiable on B; (3) B fold lands on a lone rule over whitespace (anchor offset).
- **platform:** (1) B wash + floating bottom-left widget (sticky-state, discounted); (2) A labeled left-rail index vs B's looser rows (unconfirmable under B wash); (3) accent mass A ~1.8× B.
- **roles:** (1) B washed throughout; (2) A bottom-center orange highlight (y≈0.83) with no B counterpart; (3) A title-block/metadata row discipline only verifiable on A.
- **statement:** (1) A left column washed; (2) B adds ruled CLIENTS carousel row with arrows (clean chrome delta); (3) A left-edge sliver artifact (reveal-offset remnant).
- **why:** (1) A global wash + orphaned floating UI panel (mid-reveal); (2) B crisp annotated drawing with crosshairs, corner marks, two orange index tags; (3) B bracketed "[SCROLL TO CONTINUE]" index present, A unverifiable.

## Global note

Both sides share one design language across all nine sections: warm paper ground (~240 lum, sat ≈0.03), single-weight hairlines, mono index labels, corner/registration marks, warm-orange accent system, drawing-dominant vs text-reserved band logic, and fold compositions that land on rules rather than mid-element. Left/right mass mirroring in journey/pains/statement/why/footer is the RTL adaptation (global note, discounted). The dominant residual noise is **capture-state, on both sides**: wash-out on 7 of 18 captures and vertical anchor offsets of 100–360px — the reveal fix improved but did not fully eliminate mid-reveal states. **Hero is the single genuine outlier**: with both captures crisp, its composition model still diverges (nav + full-bleed + stemmed callouts vs framed centered panel + ticker), corroborated by the lowest edge/col correlations and no mirror win. No side could be attributed to Heron or Madarek from structure alone under a sealed key — zero confident Heron IDs.

**INDISTINGUISHABLE** — 0 confident Heron IDs across nine (threshold ≤1). Hero's surviving structural mismatch is flagged for unblinded follow-up, not counted as an identity disclosure.
