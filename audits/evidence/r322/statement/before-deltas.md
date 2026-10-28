# R322 WP-2c/2d — BEFORE deltas: statement + pains vs the Heron extraction

Measured on `r322/statement` @ 748624ed (main), Vite :5177, viewport 1440×900 /
768×1024 / 390×844, root 8.333px/9.209px/9.924px (the fluid root is byte-identical
to Heron's — every rem below is directly comparable). Extraction sources:
`docs/redesign/r322/heron/statement.md` + `problem.md` (+ the `*-1440/768/390.json`
trees). BEFORE shots: `before-{statement,pains}-{1440,768,390}.png` (this dir).

## Statement band — current structure vs Heron

| seat | Heron @1440 (extraction) | Madarek before @1440 | Δ |
|---|---|---|---|
| section box | [6.66, 886.7, 1426.7, 722.5] (frame-wide, 86.73rem) | [0, 886.7, 1440, 722.5] (min-block 86.7rem) | height EXACT; width bleeds 13.4px past the frame lines |
| split | **6+6 grid**: art cell 713.3×722.5 LEFT + body col RIGHT | no split — a vertical stack: capabilities ticker 43.4 → .st-spread (5/7 cols: copy 551.7 + 3 persona lines 772.3) → universities ticker 43.4 → .st-art panorama 129.2 | whole anatomy differs |
| art | square ink `<img>` 1766×1766, contain, fills the 6-col cell (713.3 wide, full height) | 1386×132 WIDE panorama strip 129.2px tall, hidden <992 (art absent on phone/tablet) | wrong aspect (10.5:1 vs 1:1), wrong seat |
| title | char-split h2, 4rem w600 lh1, 127ch ≈ 8L, cell pad **6.4/15/3.2/15rem**, ghost→ink COLOR scrub (98→718px, 4.28s) | ScrubReveal word-mask scrub, --fs-st 33.33px ✓, 1 line (30ch), no cell isolation, mask-rise not color | seat/type landed (1-d); everything else off |
| CTA | one btn 16.34×5rem under the title (mt 3.2rem), hairline + twin-label | none in the band | missing |
| partner strip | in the RIGHT column under the body: label row 37.5 + logo track 95 + desc 26.3 = 158.8px, hairlines | universities ticker full-width mid-band, no label row, no desc | wrong seat/anatomy |
| @768 | art 40.9rem square + text cell; partner full-width below (16.3rem); pad 2.4rem | stacked tickers + spread, art hidden | off |
| @390 | art 37.7rem square → text cell 32.45rem → partner 15.2rem = 85.41rem | tickers + stacked text, art hidden (836.1px total) | off |
| review 6.1 | — | "list-based text bars", orphan text, no focal art | confirms |

Extra before-cargo that Heron's band does NOT carry: the capabilities crawl
(`.fo-ticker`, 43.4px — R314 seat) riding the band top, and the 3 persona
`.st-line` rows (duplicated content — the roles band owns the personas).
Both retire with the transplant (the live-capability disclosure survives in the
pains band answers + /capabilities links; §6: "ONE statement, no orphan text").

## Pains band — current structure vs Heron (V8)

| seat | Heron @1440 | Madarek before @1440 | Δ |
|---|---|---|---|
| section | [6.66, 1609.2, 1426.7, 742.6] | [0, 1609.2, 1440, 742.9] | height/seat EXACT (89.15rem floor already landed); width bleeds the frame |
| top rule | 1px hairline at the section's frame-wide top edge | ✓ (border-block-start on the section) | ok |
| head | ONE row: title-wrap (kicker + H2 695px) at the **3.2rem content line**, sub note 39.62rem at the far side, bottoms aligned; pad 3.2/3.2/6.6/3.2rem | `.pm-head` grid: label+H2 boxes stretched [290..1413], lede orphaned at x=33.3 **217px wide** (64ch cap) — "paragraph far left, heading far right, neither on the cards' lines" (V8) | V8 confirmed by measurement |
| columns | **4 open columns 42.82rem** (contiguous, 1px vertical rules between), each: meta row (mono keyword + ghost 2-digit index, justified, pad 1.6/3.2rem, dashed rule under, 0.8rem red dot op:0→hover) → art zone 36.01rem with centered 20×20rem inline SVG → content pad 3.2rem (dashed top rule, item-title 2.8rem 3L, body 1.6rem 88–106ch) | `.pm-cards` 4 boxed cards 333px (gap 16px): border+fill+`::before` hover grid, `[01]` mono num, PainArt 140×100 wide, title d3, body, answer row w/ Check icon + orange | cards-with-icons vs open columns — whole anatomy |
| grid lines | head edges = column content edges (33.3 / 1406.7) | head [33.3..1413] vs cards [33.3..1413] — but INTERNAL edges (lede 33.3 vs H2 290) share nothing | the shared grid is absent |
| @768 | 2×2 (40.9rem cells) | 2×2 (352px cells) ✓ shape, boxed cards | anatomy off |
| @390 | **swiper** (4 slides 31.45×47.98rem, dots 2.02×0.2rem ×4, 1st active) | 1-col stacked cards | off |
| review 5.9 | — | "cards feel like template cards; head floats on its own grid" | confirms |

## docH + gaps (before)

| bp | docH | band | verdict |
|---|---|---|---|
| 1440 | 12413 | 12170–12540 | ✓ (127 headroom) |
| 768 | 12499 | 12388–12766 | ✓ (267 headroom) |
| 390 | 11368 | 11269–11612 | ✓ (244 up / 99 down) |
| 360 | 10782 (worklog 1-d) | 10523–10844 | ✓ (62 up / 59 down) — tight |

Section boxes are contiguous (hero→st→pm→chapters gaps = 0px between boxes);
the reviewer's V4 "statement→pains 275px / pains→chapters 260px voids" live
INSIDE the min-block-size slack (statement content ends ≈1559.6 vs band end
1609.2; pains content ends ≈2159.4 vs band end 2352.1). The transplant fills
both bands with Heron's own content heights, so the voids shrink by
construction.
