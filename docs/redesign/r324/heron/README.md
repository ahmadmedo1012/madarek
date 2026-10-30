# R324 P1 — Heron extraction, completed

> Source of record: `full-<bp>.json` (142 KB each) from
> `scripts/r324/heron-extract.mjs` — geometry, computed styles, media
> inventory (filename tails only), ScrollTrigger params, per-section
> scroll states with evidence JPEGs. **No Heron text/logo/image/font
> content was copied** — text is recorded as {role, charCount,
> lineCount} metadata; media as last-path-segment patterns.

## Breakpoints captured

1440×900 · 1024×768 · 768×1024 · 390×844 — one polite visit each,
loader settle polled 6 s, consent measured + Escape once (never
clicked). Site facts re-verified: Webflow + GSAP/ScrollTrigger + Lenis
on a CUSTOM WRAPPER `div.main-inner.lenis` (the window never scrolls;
body is viewport-locked). Root font-size 8.33 px @1440 (0.58 vw),
9.92 px @390.

## The shared grammar (plain words)

- **One 12-column hairline grid everywhere.** Columns are 103.6 px at
  1440 (the `container.grid` walks every section); hairlines (#B3B3AF,
  1 px) open and close each band as full-width `line line-horizital`
  rows. Our `.fo-*`/`pr-*`/`cu-*` families already ride the same
  ladder — the gap is per-section composition, not the grid itself.
- **Every section is a grid AREA MAP, not a stacked flow**: the
  section is one 12-col grid; its children span column ranges
  (`home-usecase-img` spans 7 cols = 714 px; its title-wrap takes the
  other 5 = 713 px with asymmetric padding 26/128/50/128).
- **Ink is one colour** (rgb(40,40,40)) at three alphas (1 body
  titles, 0.72 body copy, 0.55 muted); hairline grey #B3B3AF; paper
  bands declared per-element (`bg-global`), never on the section.

## Per-section grammar (what the rebuild must match)

- **home-platform (710 px @1440, 85.2 rem)** — full-width 12-col grid;
  ONE content cell + a 601 px (5-col) media wrap; content carries a
  ~403-char title block over ~41 rendered lines in a TALL single cell
  (the product step list lives INSIDE the content cell, not beside
  it). ScrollTrigger: content-inner `active` class swaps per step —
  the list is an index that swaps one wide frame, never a flowing
  paragraph.
- **home-why (681 px)** — `why-head.grid` 252 px (the section title
  band) + `why-main-wrap` 429 px with 100/100 block padding; the
  three benefit cards (`card-1..3 bg-global`) + the sticky left/right
  image columns swap `active` states by scroll; pagination dots ride
  the card corner.
- **home-usecase (887 px)** — 7-col image rail + 5-col text; the FAQ
  list (`faq-cms`, each item an icon + title + sub) is the roles
  ledger: rows on the shared grid, title 18 lines ≈ 308 px block with
  generous 128 px inline padding; hairlines top+bot close the band.
- **cta (698 px)** — three stacked grid rows: head 80 px (label run) →
  main 230 px (the ONE statement + the primary button cell) → deco
  388 px (three image cells on the grid, center/right placement);
  bottom hairline closes the page body.
- **footer (711 px)** — main 355 px (the menu/info cells: 3 info
  items + the wordmark cell) → img-wrap 314 px (the ink-render strip:
  5 equal cells) → copyright row 42 px (grid; policy links right).
  The newsletter form exists in Heron's markup but Madarek drops it
  (no wired endpoint — the R324 rule).

## Menu overlay (measured @1440/390)

Fixed full-viewport paper panel; links are full-width rows; the
trigger is the header's menu button. `menu-<bp>.jpg` evidence in
`audits/evidence/r324/heron/`.

## Section ledger (docY + h per bp)

`section-ledger.json` / `.md` — the ordered section map with our
counterpart and the measured gap:

| Heron | ours | Δh @1440 |
|---|---|---|
| home-map 6300 | .chapters 6191 | −1.7 % |
| home-platform 710 | .pr-section 710 | 0.0 % |
| home-why 681 | .wy-section 680 | −0.1 % |
| cta 698 | .fo-cta 698 | 0.0 % |
| home-intro 723 | .st-section 824 | **+14.0 %** |
| home-problem 743 | .pm-section 601 | **−19.1 %** |
| home-usecase 887 | .rl-section 1155 | **+30.2 %** |

docH: Heron 12,338 @1440 / 9,926 @1024 / 12,535 @768 / 11,363 @390 —
ours 12,922 / 11,761 / 11,874 / 11,950 → Δ +4.7 / +18.5 / −5.3 /
+5.2 % (target ±2 % → X14 lands in P2 by trimming statement/problem/
roles surplus and the 1024 band's composition).
