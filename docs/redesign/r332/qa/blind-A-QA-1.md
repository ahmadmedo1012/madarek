# R332 blind twin review — A-QA-1

Run: run-003 · viewport 1440×900 · nine image pairs in `/home/z/evidence-r332/twin/run-003/blind/1440/`.
Blind protocol honored: answer key not consulted; live sites not fetched; judgment from the pair images only.

**Method note.** In-context image rendering was unavailable to this reviewer, so each pair was judged through a vision model over the exact pair files, with controls against its known biases: (1) two full comparison passes (raw + per-image contrast-normalized to neutralize a brightness confound), (2) a third pass with swapped attachment order on the unstable pairs (statement, journey, footer, why), and (3) objective pixel metrics as an independent cross-check (row/column ink profiles at two thresholds, long-hairline counts, red-accent density, per-image dynamic range). Verdicts below are mine, based on that evidence. Attribution criterion: the reference was identified where one side carries one coherent, idiosyncratic drawing-sheet system (hairline frames, datum rules, ruler/registration ticks, numbered indices, pinned callouts) that the other side approximates or lacks.

## Verdict table

| section | call | conf | strongest structural cue |
|---|---|---|---|
| hero | **A is Heron** | 80 | A shows the full sheet scaffold — header bar, 6–7 plumb leader lines with circle terminals, red flags, caption strip, footer card band; B is a bare two-rule frame with a single centered drawing and an empty lower ~26%. |
| statement | cannot tell | — | Same 50/50 split system but mirrored (likely RTL adaptation — discounted) plus one carousel/logo sub-band present on only one side; passes contradicted each other on attribution and even on which side carries the band. |
| pains | **A is Heron** | 85 | A: index tags [01]–[04] atop four ruled columns with dashed band rules; B: unannotated centered icon cards, no indices, ~35% dead band below. |
| journey | cannot tell | — | Two different rich skeletons (full-bleed elevation with twin red datum rules + edge tick rulers vs framed page with header rule and right-of-center dimensioned plan); attribution flipped A → CT → B across three passes. |
| platform | **A is Heron** | 88 | A: full-width hairline datums at ~26%/~68%, margin index "[02]", centered drawing axis, airy whitespace; B: dense boxed app-panel grid with a 7%-tall nav band and near-zero gutters. |
| why | **A is Heron** | 92 | A: full-height ruler ticks, "+" registration marks, two red code-tag callouts pinned to a gridded drawing block; B: segmented tab band, 2×2 card grid, floating overlay window, zero annotation system. |
| roles | **A is Heron** | 87 | A: drawing-left split band with 4-row dashed-separator list and "+" indices, topo line-work; B: text-only two-column table with no drawing block at all. |
| cta | **B is Heron** | 87 | B: full-bleed centered elevation, full-width red datum hairline at ~50%, dotted spec table and a 001–010 numbered index; A: nav bar + right-aligned header + ~45% empty canvas + ruled footer table, no drawing, no index. |
| footer | cannot tell | — | Both sides carry real sheet language (A: 5-square thumbnail strip + boxed nav + centered mark; B: 4-column hairline grid, ruler band with edge "+" marks, red hairlines, drawing strip at the fold); attribution unstable across passes. |

## Substantive (non-content) differences per section

- **hero** — [A] 5-band rhythm (header / drawing / caption strip / footer cards / link strip) vs [B] single central mass with empty bottom third; [A] 6–7 plumb leader lines + circle terminals vs [B] two small square markers; [A] red-accent density ~3.3× B.
- **statement** — mirrored 50/50 split (see global note); a labeled carousel/logo sub-band with arrow controls exists on one side only (side attribution unstable between passes); one side's drawing closes on a hatched ground line inside the band, the other's is cropped at the band bottom/fold.
- **pains** — [A] dashed rules + full-height column dividers + per-column indices vs [B] none; [B] lower text sub-band missing, ~35% whitespace below cards with only a footnote rule; [B] header band ~12% vs A ~18%.
- **journey** — [A] twin full-width datum rules + left/right tick rulers, drawing full-bleed and centered vs [B] framed page, header rule, plan pushed right-of-center (x≈40–95%) leaving a ~40% empty left column, dimension ring + corner "+" marks.
- **platform** — [A] full-width hairlines at ~26%/~68% + margin index "[02]" vs [B] none; [B] extra top nav band and right sidebar column; [B] bottom rule at ~78% with empty band vs A's open whitespace.
- **why** — [A] ruler ticks, "+" marks, two pinned callout tags vs [B] none; [B] floating overlay window (~32% width) breaks the column grid; [B] bottom band carries a right-aligned heading where A is empty.
- **roles** — [A] drawing occupies ~55% of the band vs [B] no drawing block (text ~85–100%); [A] dashed row rules + "+" row indices vs [B] dotted two-column list rows; [B] top tab-cell band and ~30% empty bottom absent in A.
- **cta** — [B] drawing fills ~50% of area vs [A] ~0%; [B] 001–010 index + dotted spec table + full-width red datum vs [A] none; [A] extra nav band and a ruled 4-column footer table cropped at the fold; [A] ~45% empty mid-band.
- **footer** — [A] 5 discrete thumbnail squares + boxed nav segment + centered wordmark vs [B] continuous drawing strip with ruler ticks and edge "+" marks; [B] full-width red hairlines delimiting bands (A neutral); [B] empty top ~22% closed by a red hairline vs A's immediate nav band.

## Global content-differences note (excluded from structural judgment)

One side is Arabic RTL, the other English LTR — mirrored split directions and right/left text-block swaps are treated as language adaptation, not structural failure. Artwork subjects (drawing motifs, plan vs elevation choice, photo thumbnails) differ and were discounted, as were all blurred copy differences. Separately flagged as **motion-model evidence**: on pains-B, platform-B, why-B, roles-B and cta-A the capture is uniformly washed out (darkest pixel ≈ 154–184/255, red accents ≈ 0) — the layout is present at low opacity, consistent with an entrance/scroll fade caught mid-transition. That washed side is the *same* side I attribute to the rebuild in 5 of 6 decided sections (independent corroboration, not the basis of the calls); if that side is the rebuild, its entrance-animation timing diverges from the reference at capture time.

## Overall judgment

**DISTINGUISHABLE** — 6 confident reference IDs across nine sections (hero, pains, platform, why, roles → A; cta → B); the non-reference side systematically lacks the reference's coherent drawing-sheet language (datum hairlines, ruler/registration ticks, numbered indices, pinned callouts), substituting conventional nav/card layouts, bare canvases, or unannotated columns.
