# R332 Blind Twin Review — A-QA-3 (1440px run-003)

Reviewer: A-QA-3 (blind, independent). Material: `twin/run-003/blind/1440/` — nine 1440×900 pairs, order randomized, key sealed (not consulted; `sheet.html` untouched).

**Method note:** sub-agent image preview was unavailable, so every pair was judged through two mediated channels: (1) a deterministic pixel-structure pass (row/column band boundaries, whitespace ratio, hairline counts/positions, edge-energy thirds & fifths, edge-map cosine similarity) and (2) a neutral VLM structural readout per pair (prompt asked only for skeleton / band proportions / whitespace / alignment grid / hairlines / annotation placement / drawing-vs-text balance / fold composition; no attribution hints, no content). Confidence below = probability the two sides share one structural model (skeleton + rhythm), since no confident attribution was possible anywhere.

## Verdict table

| Section | Call | Confidence (same model) | Strongest structural cue seen |
|---|---|---|---|
| hero | cannot tell (skeletons differ) | ~15% | A = dense fold (framed nav cells, 2-col band, ~10 h-rules); B = one centered elevation between two rules, empty bands — reads as reveal/scroll-state asymmetry, not a side signature |
| statement | cannot tell — same skeleton, mirrored | ~70% | identical frame: double top rule, 50/50 split w/ center vertical rule, footer band at ~80%; B is the mirror of A (direction artifact) |
| pains | cannot tell (same 4-col skeleton, discipline differs) | ~45% | both: header band + 4 equal columns; A keeps solid column dividers + dashed rules + index numbers, B drops them and compresses mass into the upper half |
| journey | cannot tell — same model, composition shifted | ~55% | both whitespace-heavy with one central plan drawing and a single red/orange accent at mid-height on opposite edges (mirrored); A full-bleed between bracketing rules, B boxed right-of-center |
| platform | cannot tell (skeletons differ) | ~15% | A = floating editorial 3-zone (index label / mockup / paragraph) under a tall empty band; B = boxed 3-panel app grid starting under a framed header strip |
| why | cannot tell (skeletons differ) | ~15% | A = two-column technical grid w/ central vertical rule, ruler ticks, "+", orange callouts; B = hero panel with a sharp floating app screenshot overlapping a blurred band |
| roles | cannot tell (skeletons differ) | ~25% | A = illustration-left + single 4-row dashed-divider list; B = headline-right + mirrored 2×4 solid-divider list grid under a framed header strip |
| cta | cannot tell (skeletons differ) | ~10% | A = right-aligned text-only editorial with framed nav + 3-column footer; B = centered poster frame with central elevation, one full-width rule, mono index 001–010 bottom-right |
| footer | cannot tell (skeletons partially differ) | ~40% | both open columnar footer grids on the same hairline system; A adds nav + 5-thumbnail strip + closing wordmark bar, B adds a blueprint diagram band and empty bottom canvas |

## Substantive (non-content) differences per section

- **hero** — 1) A carries framed nav cells + two-column text band + bottom strip; B none (B). 2) A's drawing fills the fold with marker dots/tick annotations; B's is centered with one right-edge annotation blob (A). 3) Hairline density: ~10 h-rules on A vs 2 on B (A).
- **statement** — 1) B mirrored 50/50 split (illustration left / text right). 2) B shows a clients strip (arrows + logo row) where A shows ruled caption/table rows with red ticks (B). 3) B's illustration bleeds to the edge and sits lower; A's is contained (B).
- **pains** — 1) A keeps vertical column dividers, dashed mid-rules and index numbers; B drops them (A). 2) Vertical rhythm: A's cells reach the fold; B compresses into the upper half with an empty lower half and closing rule (B). 3) Header mirrored: heading left on A / right on B (direction artifact).
- **journey** — 1) A's plan spreads full-bleed between two full-width rules; B's is a contained rectangle pushed right with an empty left field (A / B). 2) B frames the plan with dimension lines, legend and "+" markers; A uses dotted marker columns at the edges (B). 3) B has only a short rule above the plan vs A's bracketing full-width rules (A).
- **platform** — 1) A floats content under a tall empty top band; B starts immediately under a framed header strip (B). 2) B is panel-dense with boxed borders and table-like rows; A is whitespace-dominant with a single red section line (B / A). 3) B shows an OS taskbar artifact at the bottom edge (capture chrome) (B).
- **why** — 1) A is a two-column technical grid with central rule and illustration on a faint grid; B is a hero panel with an overlapping sharp app screenshot (A). 2) A's annotation system (ruler ticks, "+", orange callouts) is absent on B (A). 3) B's footer rule sits at ~75% vs ~83% on A (B).
- **roles** — 1) B has a framed header strip; A none (B). 2) A = illustration-left + one 4-row list; B = headline-right + 2-column 8-row grid, no illustration (A / B). 3) Dividers: dashed + left-aligned on A vs solid + orange icons on B (A / B).
- **cta** — 1) A has framed nav + multi-column footer; B is a single frame with neither (A). 2) A is text-only right-aligned; B is a centered poster built around a drawing (A / B). 3) B runs a full-width orange rule with a numbered 001–010 index bottom-right; A uses small tick+label pairs (B).
- **footer** — 1) A adds nav, a 5-thumbnail strip and a closing wordmark bar; B ends with a blueprint diagram band + empty bottom third (A / B). 2) A uses boxed cells with underlined headings; B uses open columns with mono labels + subscribe/email field (A / B). 3) B places one large image block far right; A distributes five small thumbnails (A / B).

## Global content-differences note (not counted)

One side is Arabic RTL, the other English LTR (copy blurred by design and not read); split compositions are correspondingly mirrored (statement, pains; journey's accent sits on opposite edges), and artwork subjects differ slightly (elevation vs plan variants). All ignored per brief. One **harness-level** oddity, also not attributable to either site: header/nav strips appear on A in hero·cta·footer but on B in platform·why·roles — a symmetric 3/3 split that rules out a per-site sticky-nav signature and points to per-section scroll offsets / reveal-state capture asymmetry (plus one clipped headline and one floating sharp screenshot — transient states).

## Final judgment

**INDISTINGUISHABLE** — 0/9 confident Heron IDs: no side carries a signature (the same hairline-framed headers, red/orange accents, architectural line-art, index ticks and annotation motif appear on both sides in a 3/3-symmetric pattern); the recurring deltas (hero, platform, why, roles, cta) read as scroll/reveal-state capture asymmetry and local discipline drift (pains: index/dashed rules dropped) rather than a reference-vs-rebuild fingerprint — flag pains (dropped column dividers/index numbers) and roles (row count 4 vs 8) to the lead for a keyed follow-up.
