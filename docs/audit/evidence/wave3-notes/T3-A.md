# T3-A — the why/problem/map MIRROR FLIPS (r368 · Task 3 · wave 3)

**Agent:** T3-A (seats: `home-why-wrap` · `home-problem-wrap` · `home-map-wrap`).
**Worktree:** `/home/z/wt/r368-t3` (branch `wip/r368-t3`). **Files owned and
touched:**

- `frontend/src/styles/landing/why.css`
- `frontend/src/styles/landing/pains.css`
- `frontend/src/styles/landing/journey.css`
- `frontend/src/components/landing/WhyScene.tsx` (the deck chevron pair only)

Read and verified untouched: `Why.tsx`, `Chapters.tsx`, `Live.tsx` (the
problem seat's real mount — the task brief named Chapters.tsx, which is the
MAP seat's mount; the problem flip needed no TSX change at all), and every
other landing sheet. No shared tokens, no instrument scripts touched
(`scripts/conformance/gen-why-wrap.mjs` was read to confirm the generated
cap-vars' coordinate convention — never edited).

**The exemplar studied first:** `git show b5143884 -- frontend/src/styles/landing/statement.css`
(the proven surgery: `grid-template-areas: 'media stmt' → 'stmt media'` — a
CSS-only template swap, DOM order preserved, the Arabic text staying RTL
inside its cells) + `Statement.tsx` (the DOM order untouched around the flip).

---

## 0 · The root cause, in one sentence

The frozen Heron spec records **physical-left vr.x** seats (the statement
fix itself proves the convention: "media x=7 LEFT half"), but the r338-era
build consumed those same x's as **`inset-inline-start` / RTL
reading-start seats** — the sheet's own ≤991 comment "inset-inline-start ≡
spec x — mirror×RTL = identity" is the misreading that baked the mirror
into every seat. The reference's own Arabic text renders **left-anchored**
(it is an LTR-composed page with Arabic content), so the mirror shows at
both the half level (which side carries art vs text) and — where a text
cell is wider than its text — the glyph-anchor level.

## 0.1 · The offline block evidence (BEFORE — computed here, offline, from the committed paired crops)

Per-crop half-mass test (`Σ|lum − 244|` per half; "dominant" = the heavier
half; MIRROR = the two sides disagree):

```
seat                bp    state |  REF L→R dominant |  LOC L→R dominant | verdict
home-why-wrap       1440  entry |  281238 / 573211 → R | 247016 / 128174 → L | MIRROR
home-why-wrap       1440  mid30 |  173807 / 701456 → R | 123549 / 251403 → R | SAME*
home-why-wrap       1440  mid60 |  493045 / 393530 → L | 268486 / 106031 → L | SAME*
home-why-wrap       390   entry | 4381755 / 4820951 → R | 2061310 / 1996496 → L | MIRROR
home-problem-wrap   1440  entry |  361080 / 212669 → L | 124076 / 183110 → R | MIRROR
home-problem-wrap   1440  mid30 |  137646 / 170229 → R |  98998 /  88911 → L | MIRROR
home-problem-wrap   390   entry | 3441408 / 2428821 → L | 857893 / 1685558 → R | MIRROR
home-problem-wrap   390   mid30 | 1045846 /  967963 → L | 573761 /  919562 → R | MIRROR
home-problem-wrap   390   mid60 |  810553 /  684139 → L | 356111 / 582388 → R | MIRROR
home-map-wrap       1440  mid60 |  434135 / 431764 → L | 414604 / 842555 → R | MIRROR
home-map-wrap       1440  exit  |  666037 / 453014 → L | 467077 / 925175 → R | MIRROR
home-map-wrap       390   mid30 | 2857222 / 2213002 → L | 2835693 / 3762712 → R | MIRROR
home-map-wrap       390   mid60 | 3462412 / 2966741 → L | 2911649 / 3399096 → R | MIRROR
home-map-wrap       390   exit  | 4577653 / 3162353 → L | 2525703 / 2812635 → R | MIRROR
```

(\* the why mid states are phase-confounded: the four rows alternate
card sides, and the state windows catch different rows in the two builds;
the decisive why evidence is the ENTRY state — the head band — plus the
spec geometry below.) The problem seat is the cleanest read: **every 390
state and the 1440 entry disagree — the text half sits on the opposite
side** ("problem TXT-mirrored"); the map's mid/exit states (the ones that
show the pinned art column) all disagree ("map IMG-mirrored"); the why's
entry disagrees at both bps ("IMG+TXT mirrored" — the head text AND the
row-1 card side). A per-block (12×8) luminance profile of the head bands
corroborates at the glyph level: the reference's h2 strokes cluster in
crop cols 0–3, ours in cols 8–11.

**AFTER evidence:** no browser/instrument run was permitted here, so the
after is an **analytic projection from the frozen spec + the flipped seat
values** (labelled as such, not a measurement):

```
seat   @1440  reference (spec vr.x)        ours BEFORE (RTL inline-start)  ours AFTER the flip
why    head  title lane x=7 L · side x=969 R   title R · side L           title L · side R  ✓
why    rows  1/3 card x=127 L · 2/4 x=849 R    1/3 R · 2/4 L               1/3 L · 2/4 R    ✓
why    caps  odd x=741..908 R · even 53..220 L  odd mirrored · even mirrored odd R · even L  ✓
why    768   title x=7 L · side x=384 R · rows   title R · side L · rows    title L · side R  ✓
why    390   deck col1 at strip x=8 L · cap 36 L  col1 at strip R · cap 36 R col1 L · cap L   ✓
prb    head  title x=33 L · sub x=1077..1407 R   title R · sub L           title L · sub R    ✓
prb    cols  01→x=33 L · 02→390 · 03→747 · 04→1103 01 R · 02 · 03 · 04 L   01 L → 04 R       ✓
prb    768   h2 x=29 L · sub x=476 R · grid 01 TL   h2 R · sub L · 01 TR    h2 L · sub R · 01 TL ✓
prb    390   swiper pans L→R, slide 01 at x=8 L    slide 01 at R, pans R→L slide 01 at L, pans L→R ✓
map    frame art x=7 L (963) · close x=970 R (464) art R · close L          art L · close R    ✓
map    ledger text x=970 L · vrule x=1379 · ico x=1380 R  text R · ico L    text L · ico R     ✓
map    390   ledger ico x=8 L · text x=79 (cell L)  ico L · text R-anchored  ico L · text R   ✓ (kept)
```

---

## 1 · WHY seat (`why.css` + the WhyScene chevron pair)

### 1a · The head — the grid template-order swap (the statement.css move)

`grid-template-columns: minmax(0,1fr) 55.68rem → 55.68rem minmax(0,1fr)` +
the children's explicit seats follow their tracks: `.wy-side { grid-column: 1 }`
(the 464 track — the physical RIGHT in RTL, the reference's x=969 rail),
`.wy-eyebrow/.wy-h2w { grid-column: 2 }` (the 1fr lane — the physical LEFT,
the reference's x=7/x=33 title lane). DOM order (eyebrow · h2w · side)
untouched. Same swap at the ≤991 belt (the equal 377px halves of the 768
census: title x=7 L · rail x=384 R); the ≤767 stacked head keeps its
single-track stack.

### 1b · The head's audited inset-inline rules (nothing double-mirrors)

- `.wy-eyebrow` padding-inline-start → **end** (the lane's left-edge inset,
  the spec's eyebrow x=33); `.wy-h2w` margin-inline-start → **end** +
  `justify-self: end` (the 375px h2 box hugs the lane's left edge, x=33).
- `.wy-rule-v` inset-inline-start → **end** (the 1×269 rail rule rides the
  rail's LEFT edge at x=969 — adjacent to the title lane — not its right).
- `.wy-lede-t` / `.wy-eyebrow-t` / `.wy-title` gain `text-align: end` — the
  reference's own left-anchored Arabic (bidi untouched; the language law
  holds). `.wy-note` gains `margin-inline-start: auto` (the 140px box at
  the rail's left edge, the reference's x=996).
- The ≤991 belt's eyebrow/h2w/side paddings flip sides the same way
  (2.39rem / 1.41rem → the left-edge insets).

### 1c · The stage — the audited container-direction surgery

`.wy-stage { direction: ltr }` — ONE property returns the whole 2D seat
field to the spec's physical axis: every stage seat was authored as the
spec's physical-left x but consumed as inline-start. Post-flip: rows 1/3
cards at 127..591 L · rows 2/4 at 842..1398 R, the minis/player/route
clusters at their measured x's, the ≤991 odd/even card belts (3.26/41.93rem
= the 768 spec's 30/386 in-section seats), and the ≤767 deck (col 1 at the
strip's LEFT — the reference's own LTR swiper) all land at the reference's
side. **The audit (the law's condition):** the `.wy-stage` subtree was
walked — it carries NO text nodes (product imgs, path-only svgs, aria
attributes on the deck chrome); the pinned captions are portaled OUTSIDE
at body level (their own flip in §1d) and the cycle figure is a sibling.
The audited counter-flips:

1. `.wy-map-svg { transform: scaleX(-1) }` — the row-4 route drawing mirrors
   WITH its 12 station squares (the `.wy-pt` seats flip with the axis; the
   composed cluster keeps its internal alignment and lands in the post-flip
   clear band ≈355..735, clear of row 4's capture face which itself moves
   to the reference's right-hand seat).
2. The ≤767 deck edge-fade pseudos' gradient directions swap (the paper
   now melts over the belt's physical-left start edge).
3. The deck chevron pair in `WhyScene.tsx` (prev points left at the belt's
   left edge — DOM/aria order unchanged).

### 1d · The pinned caption bar — the generated-block OVERRIDE law

The `T05I-CAP` block is generated by `gen-why-wrap.mjs` ("do not hand-edit")
— and reading the generator proved its `mirrorX()` vars are the reference's
physical-left x's (`sr.x + vw − wrap.x − wrap.w` = sr.x + the 6px right
margin) deliberately consumed as inline-start (the mirror). The flip rides
four hand-written consumer rules placed AFTER the block (never inside it):
`.wy-capbar .wy-cap-t/-s { inset-inline-start: auto; inset-inline-end:
var(--wy-ct/cs-odd-x) }` + the even-row twins — in RTL the end edge IS the
physical left, so the generated x's resolve at the reference's own side at
every bp (odd 741..908 @1440 vs the spec's 742..909; the 768 band 412..502
vs the spec's 412..502; the 390 deck 36..134 vs the spec's 36). The ≤599
even-caption word-split clamp (the L1A block, later in the cascade) keeps
winning its band exactly as authored.

## 2 · PROBLEM seat (`pains.css` only — the TXT half)

- **Head:** `grid-template-columns: 83.4rem 1fr → 1fr 83.4rem` +
  `.pm-titleblock { grid-column: 2 }` (the title lane at the physical LEFT —
  the 1440 spec's h2 x=33 w=695) + `.pm-subwrap { grid-column: 1;
  justify-self: start }` (the far-edge RIGHT lane, its box hugging the
  head's right inset — the reference's x=1077..1407). The kicker gains
  `margin-inline-start: auto` (the 56px mono box at the lane's left edge,
  the spec's x=33). The 768 belt swaps its tracks the same way (title
  37.3rem LEFT · sub 1fr RIGHT, the census h2 x=29 · sub x=476).
- **Text anchors:** `text-align: end` on `.pm-title` / `.pm-sub` /
  `.pm-item-title` / `.pm-item-sub` — the reference's own left-anchored
  Arabic (its h2 strokes measure at crop cols 0–3 vs our old cols 8–11);
  direction/bidi untouched.
- **The four columns' ORDER** — the explicit grid-column placement on the
  children (the statement.css-proven move): pain 01 → track 4 (the physical
  LEFTMOST in RTL) · 02 → 3 · 03 → 2 · 04 → 1. The columns' contents (each
  pain's distinct art + text) were cross-matched against the reference's;
  now pain 01's column sits at the reference's x=33. The 768 belt gets its
  own 2×2 placements (01 top-LEFT · 02 top-RIGHT · 03 bottom-LEFT · 04
  bottom-RIGHT — the census's own svg x=120/x=496 pairs).
- **`.pm-colrule`** moves to `inset-inline-end: 0` — with pain 01 now the
  leftmost column, the three rules land on the 01/02, 02/03, 03/04
  boundaries (the reference's own x≈390/747/1104 seats).
- **The ≤767 swiper:** `direction: ltr` on `.pm-cols` (the container — it
  carries no text of its own) + `direction: rtl` on `.pm-col` (every Arabic
  cell keeps the language law) + `grid-column: auto` release for the
  carousel's auto-flow. Slide 01 now sits at the strip's LEFT edge and the
  belt pans left-to-right like the reference's own swiper; the composer's
  JS belt (nearest-to-center rect math — read, not touched) is
  direction-agnostic, so the dot mirror and tap-to-center keep working.
  The slide rules' `inset-inline-start: 0` seat resolves at the physical
  LEFT under the ltr container — the reference's own divider seat.

## 3 · MAP seat (`journey.css` only)

- **The frame** — the IMG half: `.jt-pin` flex → grid,
  `grid-template-areas: 'close rule map'` + `grid-template-columns: auto
  1px minmax(0,1fr)` with the explicit per-child seats folded into the
  component rules (`.jt-map-col { grid-area: map }` — the physical LEFT,
  the reference's x=7 w=963 art stack; `.jt-close { grid-area: close }` —
  the physical RIGHT, x=970 w=464; the seam at the middle track). DOM
  order (map · rule · close) untouched; the ≤991 belt restores its flex
  column (the stacked mobile frame) with one added `display: flex`.
- **The ledger rows' own mirror** (measured: the reference's desktop rows
  read [text cell x=970 L][vrule x=1379][icon cell x=1380 R — svg
  x=1393]): the row's tracks swap to `4em 1px minmax(0,1fr)` with the
  children's explicit grid-area seats (ico 2/1 · vrule 2/2 · textcell
  2/3), the textcell's inset moves to `padding-inline-end: 2em` (the
  reference's x=996 = the column's left edge + 26), and `.jt-cms-text`
  goes `justify-self: end` (the text hugs the cell's LEFT edge). The 768
  belt keeps the flipped order (its own census: texts x=405 · svgs
  x=702); the **≤767 belt restores the phone row's own measured order**
  (icon cell x=8 L · vrule x=64 · text cell — the reference's own
  responsive flip), with the text's left-flush seat kept.
- **The closing column's anchors:** `.jt-close-inner { text-align: end }`
  (every reference column text anchors at the column's LEFT edge — chip
  x=996 · h2 x=996 · copy x=996 · ledger x=996 @1440; x=24 on the 390
  stack), `.jt-close-chip` + `.jt-close-copyw` gain
  `margin-inline-start: auto` (the fixed boxes hug the column's left
  edge). The Arabic stays RTL inside every cell.

## 4 · Verification performed (offline only — per the brief)

- `cd frontend && npx stylelint src/styles/landing/why.css src/styles/landing/pains.css src/styles/landing/journey.css`
  → **0 errors** (23 warnings — the pre-existing `no-descending-specificity`
  class plus a few the new nth-child placements add; no browser/instrument
  run was made here — the lead runs the conformance instrument serially).
- The baseline itself carried 2 pre-existing `no-duplicate-selectors`
  ERRORS in why.css (the bare `.wy-section` T-05k/T-05l rules); both were
  folded into the section shell (values + comments preserved, the @media
  belts untouched at their original seats) to reach the zero-error bar.
- No TSX type/format tooling was run (per the brief); the WhyScene edit is
  a JSX comment + two `d` string literals swapped.

## 5 · Residuals (honestly recorded)

1. **Glyph-level anchors kept RTL where the box is lane-filling** (the
   exemplar's own scope): the why lede/note wrap tails, the problem's
   keyword/index meta rows (the spec records them as 0×0 tween seats —
   unmeasurable), the map's intro-card internals. The h2/display seats
   got the measured left anchor; the body-voice tails are the tonal
   wave's call.
2. **The why scrub-track chrome** (the reference's left-half 910×7 rails +
   4 corner markers at x=15/x=951) is structurally divergent in ours (a
   centre axis + 2 same-x markers) — beyond a mirror flip (a geometry
   re-author); the flip only moves the markers/fade to the measured
   left-edge side.
3. **The ≤767 why minis** carry mixed authoring conventions (row1's
   mini2 is spec-exact; row1's mini1 is ambiguous) — the flip lands
   mini2 exactly and shifts mini1 by ~90px; the instrument's next run
   will show if the 390 deck needs one belt value re-seated.
4. **The route cluster** is our own authored art (r342-05 redraw) kept
   internally coherent by the scaleX(−1) mirror — it does not sit at the
   spec's 896..1249 station band (the reference's own stations there are
   "geometry-skipped tween seats"); re-seating the whole cluster to the
   spec band is an authoring decision for the next wave.
5. The map's `.jt-pin::after` orange furniture spot and the `.jt-idx`
   counter chip keep their old logical seats (unbound furniture; the
   reference carries its counters inside the svg art).
