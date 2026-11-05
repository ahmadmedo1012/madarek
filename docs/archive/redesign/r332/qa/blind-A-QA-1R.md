# Blind A/QA-1R — twin round R332 (re-run, hardened settle) — vp 1440

Reviewer: A-QA-1R (independent, blind; key never opened — `blind-key.json` not read).
Material: `/home/z/evidence-r332/twin/run-003/blind/1440/` — 9 pairs, randomized order, text/brand blurred by design.

## Method
1. Deterministic pre-pass on all 18 frames: luminance percentiles (p1/p5/p95), row-band luminance + Sobel edge-energy profiles, hairline-dip detection, left/right ink balance. Purpose: **bias control** — estimate per-frame reveal opacity α ≈ 1 − p1/255 to separate capture-state wash-out from real structure.
2. Exposure-normalized derivatives (robust percentile stretch) so mid-fade ghosts could be compared geometrically without treating opacity as identity evidence.
3. VLM pairwise composites (labeled A/B, pixel rulers) + two targeted probes (hero, statement) on hairline/annotation discipline. Brand/word reads (see leak caveat) were **excluded** from all calls.

## Capture-state pre-pass (bias control)
| frame | p1 | α est. | state |
|---|---|---|---|
| hero-A/B, statement-A/B, pains-A, journey-A, platform-A, why-B, roles-B, cta-A, footer-B | 22–97 | settled | usable |
| pains-B, journey-B, platform-B, why-A, roles-A, cta-B | 161–184 | α ≈ 0.28–0.37 | **mid-fade wash-out** |
| footer-A | 135 | α ≈ 0.47 | partial wash |

Despite "hardened settle timings", one side of 6/9 pairs (plus footer-A partially) was still captured mid-reveal — scroll-triggered staggered reveals outlasted the settle wait. Per protocol, wash-side micro-structure was **discarded as state artifact**, not used for or against either site. Notably, every VLM "structurally different" verdict landed on a pair with a washed side; all fully-settled pairs (hero, statement, footer) read as the same model. That is the signature of capture-state artifact, not site identity.

## Verdict table
| # | section | call | conf. (indistinguishable modulo noted artifacts) | cue |
|---|---|---|---|---|
| 1 | hero | same structure/rhythm — cannot tell | 80 | Identical macro banding both sides: thin header strip (~y60) / framed elevation drawing ≈70% of band / split text+CTA closing band. A runs 7 full-width hairlines vs B 4; annotation kits differ (below) but kit style is not attributable blind. |
| 2 | statement | same structure — mirrored — cannot tell | 70 | Same two-column split (illustration one side, text panel the other, full-height divider, closing band ~y716–765). Mirror = RTL/LTR content difference (global note). |
| 3 | pains | same structure — cannot tell (B mid-fade) | 60 | Both recover to the same model: split header over a 4-equal-column grid with bracketed [0n] index chips + centered isometric illustrations + bottom rule. B ghosted at α≈0.29; B-only deltas unreliable. |
| 4 | journey | same motion model — cannot tell (capture phase) | 55 | Both are drafting-canvas viewers: central plan drawing rows ~170–800 with corner registration marks and a caption zone. A shows an internal header hairline + more whitespace, B a full-bleed tick frame at ~40% larger internal scale — consistent with two scroll phases of the same pinned viewer; sticky-state, discarded. |
| 5 | platform | cannot tell (B mid-fade) | 45 | A settled: 3-zone editorial grid, left index rail "[02]", stacked drawing+dashboard cards, hairlines ~y430/~y730. B ghost (α≈0.34) suggests one dominant framed panel + peripheral text — incompatible read exists only through the wash; not attributable. |
| 6 | why | cannot tell (A mid-fade + sticky overlay) | 45 | B settled: pinned scrollytelling composition (label left, technical illustration with annotation chips, scroll-continue marker). A captured at α≈0.30 with a floating card overlapping ghosted content = sticky/modal capture-state, discarded. |
| 7 | roles | cannot tell (A mid-fade) | 45 | B settled: illustration-left ~62% / accordion-right with hairline rhythm + "+" markers. A at α≈0.28 shows only the text layer ghost — its illustration layer is plausibly still at ~0 opacity (stagger order), so "no illustration on A" is not structural evidence. |
| 8 | cta | same rhythm — cannot tell (B mid-fade) | 50 | A settled: centered stacked CTA (headline/subline/pill ~y275) over large centered illustration, closing band ~y700. B ghost (α≈0.30) shows the same closing-band rhythm below an empty mid-zone — illustration layer unrevealed, not absence. |
| 9 | footer | same structure/rhythm — cannot tell | 75 | Same macro footer model on both: top band / ruled multi-column link grid with small-caps headers / secondary contact-subscribe row / oversized closing logotype band / bottom legal rule. Mid-band shift (A thumbnail strip vs B top emblem) is consistent with a scroll-offset inside a tall footer. |

Confident Heron IDs: **0 of 9**.

## Substantive non-content differences (≤3 per section, side-labeled)
- **hero** — (A) illustration full-bleed to frame edges + balloon-callout markers with drop-lines; (B) illustration floats with ~240px margins + corner "+" crop marks and tick rulers; (B) overlay card + clipped button bar (sticky/late-composited — state artifact, discarded).
- **statement** — (B) pagination bar with arrows in the text panel; (A) absent; (BOTH) mirrored column emphasis (RTL/LTR, global note); (A) closing band ghosted-left vs (B) label-left/box-right (settled both — minor alignment diff).
- **pains** — (A) far-left "+" tick rail + dotted scale strip ~y815; (B) full-viewport border frame + top rule (B washed — cannot confirm either as settled-state).
- **journey** — (A) internal header hairline ~y55 + padded whitespace; (B) dotted tick frame with four corner "+" marks, caption pinned to bottom edge.
- **platform** — (A) left index rail with bracketed number + display heading; (B) persistent top nav band + right-edge list rows (both reads through unequal settle states).
- **why** — (A) floating annotation window overlapping content (sticky-state); (B) dense internal hairlines absent — B runs almost rule-free below the header rule.
- **roles** — (B) dominant left illustration with circular motifs + accordion hairlines every ~55px; (A) dot-grid icon texture in header band (A washed).
- **cta** — (A) large centered illustration ≈40% of band height; (B) no illustration visible (washed — not attributable); (BOTH) hairline rows offset (~y55/700 vs ~y70/660).
- **footer** — (A) link grid enclosed in outer border box + 5-thumbnail strip; (B) open hairline separators + dotted perimeter rule with corner "+" around the logotype band.

## Global notes (non-attributable)
- **Two coherent annotation kits, not one missing system.** Side-A-style frames favor balloon callouts, bracketed index chips and left tick rails; side-B-style frames favor corner "+" marks, dotted tick frames, pagination bars and chips. Each side is internally consistent across sections; both are drafting-discipline systems of equal density. Blind, kit style cannot be attributed to reference vs twin — no ID value.
- **Parity checks passed:** persistent bottom-right sticky widget present on both sides in ≥15/18 frames; full-width top rule ~y8–60 on virtually all frames; comparable hairline counts per pair; drawing-vs-text balance comparable wherever both sides settled.
- **RTL mirroring** (Arabic RTL vs English LTR) explains column-emphasis flips in statement/cta/roles — global content note only.
- **Capture harness:** 7/18 frames mid-reveal (α 0.28–0.47) despite hardened timings — the harness needs per-section reveal waits (or forced-finish of staggered animations) before capture; until then, motion-model claims rest on settled pairs only.
- **Anonymization leak caveat:** on a few frames the blur left large display text semi-legible to the vision model (a hero overlay sentence and a giant closing wordmark were reported). These reads were **excluded**; all calls above are structure-only. Recommend stronger blur for future runs; key remained sealed.

## Final judgment
**INDISTINGUISHABLE** — 0/9 confident structural Heron identifications; macro skeletons, band proportions, whitespace rhythm, hairline discipline and motion model match modulo RTL mirroring and capture-state wash-outs.
