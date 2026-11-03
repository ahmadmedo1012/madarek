# R332 twin blind review — A-QA-2R (replacement, re-run)

Material: `/home/z/evidence-r332/twin/run-003/blind/1440/` — nine A/B pairs, 1440×900, text/brand blurred by design. Key sealed (never read). One side per pair is `https://heronaiapp.com/`, the other is Madarek's home page, randomized. I had no prior visual knowledge of either site, so identity was established **against the live reference itself**, not against the key:

- **Deterministic:** live `heronaiapp.com` captured at vp 1440×900 (agent-browser, Lenis inner scroller `.main-inner`, trigger-then-settle 6 s), sliced/swept at 250 px steps over the full 12,338 px page; each evidence frame correlated (Pearson) against every live frame on row-luminance, row-edge, column-luminance, column-edge profiles, plus shift-tolerant search. A real match = ≥0.79 row-lum with ≥0.83 column-lum concordance at the same zone; max cross-zone baseline ≈ 0.37.
- **Vision model (z-ai VLM):** three-way structural comparison (live ref + both blind sides) per section, with A/B order flipped on a second pass to cancel position bias. Only structure was asked for; text is blurred.
- **Bias control:** every candidate difference was first tested as capture-state. Ghost test: within-pair low-frequency (36×22) correlation ≈ 0 for all pairs (max +0.19 vs cross-pair p95 +0.29) — the pale frames are **not** wash-outs of their rich partners, so no ID rests on a faded-side artifact. All six decisive IDs are positive matches on the Heron side, not deficiencies of the other side.

## Per-section calls

| section | call | confidence | ONE structural cue |
|---|---|---|---|
| hero | **B is Heron** | 98 | B reproduces the live hero skeleton (r=0.98): framed drawing canvas with corner "+" registration ticks and ruler rails, centered elevation flanked by trees, lower band split headline-left / paragraph+CTA-right. A is a different page state: nav band + building row with plumb-line circles and flag markers. |
| statement | **B is Heron** | 97 | B = live skeleton (r=0.95/0.99): split-panel fold, left drawing over low podium, right headline block, CLIENTS band with two arrow cells, footnote strip. A is a 70/30 flat-line city elevation with hatched ground and a left stat/list block. |
| pains | **A is Heron** | 97 | A = live skeleton (r=0.95/0.90): hairline-ruled 4-column grid, bracketed [01]–[04] index, isometric drawings over headline rows, dashed rule between drawing and text. B is pale with flipped header (heading right) and no index furniture. |
| journey | **B is Heron** | 90 | B = live map zone @~5558 px (row r=0.82, col r=0.92): corner-marked frame, centered floor-plan on warm field, bottom-left annotation block, right-edge "W." tab. A is a horizontal multi-room bar plan with dense furniture and a red room, no corner marks. |
| platform | **A is Heron** | 98 | A = live skeleton (r=0.98/0.99): left index column ("[02]"), central floor-plan + dashboard stack, right text panel, bottom "BUILT TO WORK" band. B shows a top nav bar, left bordered thumbnail card, one ruled grid canvas. |
| why | **B is Heron** | 95 | B = live skeleton (r=0.81/0.96): header split headline/paragraph at ~68% rule, narrow grid drawing panel with corner ticks, two orange annotation cards, right rail, [SCROLL TO CONTINUE]. A is a wide horizontal band with floating browser screenshot, no tick furniture. |
| roles | **B is Heron** | 85 | B = live usecase skeleton (VLM 85/95 both orders; metrics masked by live carousel slide state): 50/50 split — full-bleed left visual panel, right column with heading top-right, dashed accordion rows with "+" markers. A is a text-index two-column list under a nav band, no visual panel. |
| cta | **A is Heron** | 80 | A = live CTA (row-lum r=0.68–0.70 stable; VLM 92/78): cream drafting grid with dashed hairlines and coordinate ticks, centered headline + single orange CTA pill, illustration on hairline-columned field, footer link columns below. B is a right-aligned RTL two-band header+table state. |
| footer | **B is Heron** | 78 | B = live footer skeleton (VLM 90/75 both orders; pixel metrics masked by live wordmark draw-in state): modular hairline grid cells, center technical illustration, huge outlined construction wordmark with dimension ticks and "+" corner nodes. A is RTL right-aligned underlined column headers with a thumbnail strip and solid centered wordmark. |

## Substantive non-content differences (≤3, side-tagged)

- **hero** — (A) top nav band + footer strip inside the frame; (A) annotation layer of plumb-line circles + flag markers over the drawing; (A) two-cell lower band with large pill at left vs B's headline/paragraph-CTA asymmetric split.
- **statement** — (A) 70/30 vertical split with flat-line elevation + dotted datum lines; (A) left stat/list block with hairline rules and orange accent ticks; (A) no CLIENTS band / footnote strip / next-section headline.
- **pains** — (B) header flipped (large heading right, small text left); (B) no bracketed index or dashed drawing/text rule; (B) drawings sit high with wide empty whitespace below.
- **journey** — (A) plan proportions inverted (wide horizontal band vs centered square-ish plan); (A) dense interior furniture/hatching/red room vs walls-only linework; (A) missing corner "+", intro annotation block, edge tab.
- **platform** — (B) full-width top nav bar with even menu cells; (B) single ruled grid canvas with horizontal timeline vs stacked plan+stat-card dashboard; (B) left bordered thumbnail card vs left index column.
- **why** — (A) wide horizontal hero band + second band vs narrow-left drawing panel split at ~68%; (A) floating browser screenshot replaces grid drawing + annotation cards; (A) full-width nav strip header vs headline/paragraph split.
- **roles** — (A) top nav band with segmented cells; (A) drawing-vs-text balance flipped: ~90% text-on-ruled-lines, no image panel; (A) no dashed accordion rows or "+" markers.
- **cta** — (B) two-band rhythm (header → table) vs three-band (CTA text → illustration field → footer columns); (B) right-aligned RTL table with underlined column headers vs centered composition with coordinate tick furniture; (B) orange accent block placed high vs single CTA pill mid-band.
- **footer** — (A) RTL right-aligned column headers with underline rules vs left-aligned equal-width cells on a strict modular grid; (A) thumbnail strip vs outlined construction wordmark with dimension ticks; (A) no "+" registration marks or dashed separator rules.

## Global note (non-structural)

Madarek is Arabic RTL (right-aligned headers, mirrored column order); Heron is English LTR. Artwork subjects differ globally (building rows, city elevations, multi-room plans, ledger tables vs floor plans, dashboards, technical illustrations) — noted, not used per section. Capture-state audit: three Madarek-side frames are partially revealed / low-edge (pains-B, roles-A, cta-B; edge-energy 0.57–0.75 vs partners 2.9–4.1) and journey-B (Heron) has pale plan walls mid-transition — these were treated as state artifacts and **excluded** from the calls; the IDs rest on positive skeleton matches on the live reference. Metric/VLM tension on roles, cta, footer is explained by live-side state (carousel slide, wordmark draw-in), not by evidence-side ambiguity; both VLM order passes agreed on all nine calls. Method note: the sealed key was never opened; identity was derived solely by matching against the reference URL named in the brief.

## Verdict

DISTINGUISHABLE
