# T3-C — the intro media INK-REVEAL SCRUB (r368 · Task 3 · wave 3)

**Agent:** T3-C (seat: `home-intro-wrap` — the intro media cell's mid-state ink).
**Worktree:** `/home/z/wt/r368-t3` (branch `wip/r368-t3`). **Files owned and
touched:**

- `frontend/src/styles/landing/statement.css` (the ink overlay seat + the
  scrub; also the four pre-existing duplicate-selector merges the scoped
  stylelint gate demanded)
- `frontend/src/components/landing/sections/Statement.tsx` (ONE overlay `<img>`
  node inside `.st-media-inner` — the census nest `media > mediain > mediainner
  > img` stays intact; the overlay rides the same convention as the dark plate
  twin: no `data-spec`, off the pairable census)
- `frontend/public/media/illustrations/r368/statement/intro-ink.svg` (NEW — the
  authored ink overlay asset; `intro-plate.svg` untouched, kept)

Read and verified untouched: the composer (`pages/LandingPage.tsx` — the
`--wr-p` writer), `useSheetScroll.ts`, `statement-ai1.css` (the media twins'
theme seam), `platform.css`/`journey.css` (the repo's own view() scrub
pattern), `pairs.mjs`/`fidelity.mjs` (the named-state law), the frozen
spec `home-intro-wrap.{1440,390}.json`, and the motion inventory
(`heron-motion-inventory-live.json`). No instrument, no tokens, no other
seats touched.

---

## 0 · The root cause, in one sentence

The reference's media cell carries a real INK-MASK SCROLL REVEAL — its own
seat is an overlay SVG (`mask` + `feComponentTransfer` over a second
`<image>`, per the frozen 390 spec census: `media > div > [div > img ·
div > svg]`) — and at the mid states a dark-foliage band (measured tones
57–130) appears across the media's bottom while our authored plate stays
light there.

## 1 · The measured evidence (offline — PIL+numpy over the committed crops)

All numbers below are **offline** measurements from
`docs/audit/evidence/primary/reference/home-intro-wrap.{1440,390}.{entry,mid30,mid60}.png`
with the exact crop↔section geometry from `docs/audit/evidence/capture.json`
(reference side: 1440 entry `top=2`, mid30 `top=−214`, mid60 `top=−431`,
crops at storageScale 4 over section x 7..1427; 390 entry `top=2`, mid30
`top=−250`, mid60 `top=−504`, full scale over x 8..382; the media cell = the
left half at 1440 (x 7..720, full 723 height), the top square at 390
(374×374)).

### 1.1 · The reference's media 8×8 block maps (mean luminance)

```
1440 entry (the plate's tuning map):          1440 mid30 (the ink state):
y1 [243 243 232 233 192 212 244 243]           y1  — cut —
y2 [244 190 139 107  97 107 231 245]           y2  — cut —
y3 [244 166 128  64  76 110 234 245]           y3 [243 176 143  91  96 133 242 243]
y4 [244 167 128  82 151 227 245 245]          y4 [244 167 128  82 152 228 245 245]
y5 [244 171 131  83 175 243 245 245]          y5 [244 167 131  83 175 243 245 245]
y6 [241 226 212 162 206 245 245 245]          y6 [193 200 163  88 158 184 243 245]
y7 [237 240 239 235 228 245 245 245]          y7 [124 174 196 207 141 107 118 151]
y8 [239 240 233 219 211 213 231 238]          y8 [172 182 179 148 191 204 214 210]
```

- Rows y1–y5 are **byte-identical** between entry and mid30 (per-row |diff| ≈
  1) — the change is confined to **media y 62–96%** (row y6 down, the last
  ~2 rows of y8 unchanged). The dark tones 57–130 arrive with the ink band;
  mid30 ≈ mid60 (the band is already complete at mid30 — per-row |diff|
  mid30↔mid60 ≤ 5 except two rows at the very bottom edge).
- The 390 **entry** map's y6–y8 rows are the SAME ink state as the 1440
  mid30 rows (`[189 205 159 86 158 184 …] / [119 172 195 209 142 107 114 150]
  / [169 180 178 147 190 204 201 136]` — block-matched to ±5): **the phone
  band stands revealed at entry**, exactly like the sheet's own word-ink
  phone law ("the record's own 390 freeze caught the words already scrubbed
  to full ink").
- The 390 **mid30** slice (media y 250..374 visible): rows 250..311 read
  **clean paper (239–244)** — the ink RETREATS, leaving only the band below
  ≈83% of the media — while the 83–92% band reads DARKER than at entry
  (`[64 31 88 135 118 137 96 149]` vs entry's `[119 172 195 209 142 107 114
  150]`): the mobile ink both clears above and compacts darker below.

### 1.2 · The reference's own implementation (the frozen spec census)

`home-intro-wrap.390.json` records the media cell as
`div > div > div > [div > img[1] · div[2] > svg[1]]` where the svg carries
`defs > mask[1]` and `filter[2] > feComponentTransfer` and an `image[3]` —
a masked, filtered second image over the base photo. That is the reference's
ink-mask reveal machinery; our overlay mirrors its ROLE (the second layer
over the plate), authored as our own SVG.

## 2 · The seat verification the task prescribed — the `--wr-p` finding

The task said: *"the section already carries the --wr-p scrub var (0→1
across the section's scroll travel … verify by reading the seat wiring in
Statement.tsx / LandingPage.tsx)."* Verified — and the premise fails its own
test:

- The composer's driver (`LandingPage.tsx`, `useSheetScroll(statementTitleRef…)`)
  writes `--wr-p` from the **title center**'s viewport position:
  `t = clamp((vh·0.9 − center)/(vh·0.5), 0, 1)` — the reference's own
  «center bottom+=10% → center top+=40%» anchors, mapped through the
  measured ink-ease.
- Our title center sits **~233px under the section top** at 1440 (stmt pad
  6.4rem = 53px + the 8-line 5.4rem titlebox's half = 180px), so `t` clamps
  to 1 at scroll ≈ **767**, while the instrument's entry seat lands at
  scroll 894 (the recorded `liveEntry`) — **`--wr-p` is already saturated at
  1 before the entry state**, and stays 1 through entry/mid30/mid60/exit.
  Empirical confirmation: the local 1440 entry crop's statement words read
  full ink (p5 ≈ 92–166 vs the ghost 180) — the driver had already finished.
- Therefore an opacity/mask ramp ridden on `--wr-p` reads **full ink at the
  entry crop** — inverting the measured entry state (the reference's entry
  crop is the light plate). The mid-state reveal physically cannot ride it
  at ≥768; a single saturated number cannot distinguish entry from mid30.

**The honest alternative** (same scrub discipline, zero JS — the repo's own
CSS scrub grammar, `platform.css` T-11b2 / `journey.css` T-11b2): a
scroll-driven **`view()` timeline** on the overlay. The overlay's **exit
range** maps 1:1 onto the instrument's named-state axis: `exit 0%` = the
element's top at the viewport top = the **entry** state; `exit 30%`/`exit
60%` = the section top 0.3/0.6 × its height above the viewport = **mid30 /
mid60** (at 1440 the media cell IS the section box, so exit-progress =
217/723 = 0.2999 at the recorded mid30 scroll — exact). `--wr-p` remains
exactly what it is: the word-ink's driver.

## 3 · What was built

### 3.1 · The ink overlay asset — `intro-ink.svg` (authored, measured parameters only)

- viewBox `0 0 713 723` (the plate's own canvas; the overlay `<img>` rides
  the `.st-media-img` geometry — absolute inset-0, cover — so the fractional
  seats align at every bp).
- The **mass layer**: a 24×12 stipple field (tone `#4f4e48`, the ink tone
  ≈80 of the measured 57–130 band) fitted offline to the measured per-block
  ink density over the plate's own rendered tones — block-exact (the final
  fit: every block within ±0.01 of the map below; the composite over the
  plate then lands within ±7 luminance counts of the reference's 1440
  mid30 map, mean |err| **1.4** over the 24 ink blocks):

  ```
  the measured ink density (alpha over the plate, ink tone ~80):
  y6 62–75%    [ .29  .23  .39  .94  .46  .28  0     0   ]
  y7 75–87.5%  [ .72  .40  .26  .19  .61  .83  .76  .55]
  y8 87.5–100% [ .41  .35  .37  .46  .13  .02  .15  .18]
  ```

  The silhouette it draws: a canopy line along y 75–87.5% dense at the left
  edge (x1) and the right bank (x6–x8) with a dip at x3–x4; the understory
  below (y8, moderate left, light right); and the one tall up-reach clump at
  x 50–62.5% rising to y 62% — the grove's single tree clearing the canopy.
- The **line-work layer** (our own drafting hand, the plate's language):
  frond-hatch patterns (`inkFrondA/B/C` — short angled strokes in the
  measured dark tones 63/80/95/111), a ground hairline meeting the plate's
  plinth, and three single fronds escaping the canopy line upward. The
  field was gain-fitted AROUND the fixed line-work so the composite's block
  means stay exact.
- The ink's alpha above y 62% is **exactly 0** (verified) — the plate's
  entry state (the currently-passing crop) is untouched.
- Provenance header in-file; the dark theme rides the CSS invert twin (below),
  no raw colors outside the SVG's own fills / the sheet.

### 3.2 · The overlay node — `Statement.tsx`

One `<img className="st-media-img st-media-ink">` as the last child of
`.st-media-inner` (paints above the plate twins; `alt=""` + `aria-hidden`;
no `data-spec` — own plumbing, off the pairable census, the dark plate
twin's own convention). The census nest `media > mediain > mediainner > img`
is intact.

### 3.3 · The scrub — `statement.css`

```css
.st-media-ink { pointer-events: none; }
[data-theme="dark"] .st-media-ink { filter: invert(1) hue-rotate(180deg); }

@keyframes st-ink-reveal  { from { opacity: 0; }            to { opacity: 1; } }
@keyframes st-ink-retreat { from { clip-path: inset(0 0 0 0); } to { clip-path: inset(83% 0 0 0); } }

@media (min-width: 768px) and (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .st-media-ink { animation: st-ink-reveal var(--t-cinema) linear both;
                    animation-timeline: view(); animation-range: exit 0% exit 30%; } } }
@media (max-width: 767px) and (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .st-media-ink { animation: st-ink-retreat var(--t-cinema) linear both;
                    animation-timeline: view(); animation-range: exit 0% exit 75%; } } }
```

- **≥768** (the desktop/tablet arm): entry (exit 0%) = ink hidden; **mid30
  (exit 30%) = the full band** — the measured per-state coverage — mid60
  (exit 60%) unchanged; the end state fully shown. The ramp completes exactly
  at the instrument's mid30 (0.2999/0.3).
- **≤767** (the phone arm, mirroring the sheet's own word-ink phone law):
  the ink stands FULL at rest/entry (the measured 390 entry = the 1440 mid30
  map) and the canopy's top edge **retreats** through the exit range —
  leaving only the band below ~83% at OUR mid30 (our 934px phone section's
  mid30 = 0.3×934 = 280px = 75% of the 374px media → `exit 75%`; the
  reference's measured boundary ≈83%).
- **Reduced motion / no `view()` support**: the animations live inside the
  `no-preference` + `@supports` belts — the static sheet shows the ink's
  END state (full band), the repo's own RM contract (static end-state under
  reduced motion; the platform/journey seats' identical grammar).
- **The dark twin**: `[data-theme="dark"] .st-media-ink { invert(1)
  hue-rotate(180deg) }` — the paper/ink pair inverts (the dark foliage
  becomes light foliage on the dark paper), geometry never moves — the
  plate's own `is-dark` law.

### 3.4 · The stylelint gate

The scoped run started with **4 pre-existing errors** (duplicate selectors
`.st-media`/`.st-stmt`/`.st-ticker`/`.st-pill-t` — the wave-3 mirror-flip
commit's fallout: split grid-area blocks + the tail `.st-pill-t` transition
block). Merged (grid-area folded into the cells' own blocks; the r338
T-03b roll-token transition folded into `.st-pill-t` proper, comment kept).
`npx stylelint src/styles/landing/statement.css` → **zero errors, zero
warnings**.

## 4 · The per-state scorecard expectation (offline simulation of the shipped build)

| state | 1440 (exit-progress) | 390 (exit-progress) |
|---|---|---|
| entry (0%) | plate only — the ink alpha 0 above 62%, the entry crop unchanged | plate + FULL ink band (the measured 390 entry map; ink-region mean \|err\| ≈ 6 incl. the plate's own core residual) |
| mid30 (0.30 / 0.75) | plate + full band — block-exact vs the reference mid30 (mean \|err\| 1.4, max 7 — the max sits on the plate's own paper-tone residual at y6 x7/x8) | the ink clipped below 83% — the measured boundary; the band's intensity residuals documented below |
| mid60 (0.60 / >1) | identical to mid30 (the measured stall) | the media is off-crop (invisible in the reference's own mid60 crop — no media contribution) |
| end | fully shown | the media is off-crop |

## 5 · Residuals (measured, documented — NOT this seat's mandate)

1. **The plate's own entry residuals** (the plate owner's seat, untouched):
   the plate's core column reads darker than the reference's entry core at
   the same blocks (plate y2 `[105 75 92 92]` vs ref `[139 107 97 107]`) and
   the shoulder/fade region lighter/darker in spots (plate y6-x4 216 vs ref
   162) — these pre-date the ink and ride through every state.
2. **The reference's mid-state core lightening** (out of the ink-band
   mandate): at 1440 mid30 the reference's core blocks lighten 10–26 counts
   (y3: 64→91, 76→96, 128→143) — the overlay image's light content bleeding
   over the core; at 390 mid30 the core region (media y 66–83%) reads clean
   paper 244 (the core fully clears on mobile). Our plate's core stays dark
   there. Implementing a lightening wash over the core would fight the
   plate's own geometry — left to the plate/core owner, numbers recorded.
3. **The 390 mid30 ink compaction**: the reference's mobile ink intensifies
   (the 83–92% band reads 31–100 vs our entry-intensity ~119–174) while the
   boundary matches (clean above 83%). A single overlay + a clip animation
   reproduces the boundary, not the double-dark compaction — ~30–90 counts
   over ~5% of the 390 mid30 crop.
4. **The crop-top sliver**: the first ~8px of the reference's mid crops read
   lighter than the same section rows at entry (its fixed chrome's edge) —
   negligible at the 25% storage scale.
5. **The 390 core-vs-reference top-left corner** (plate y1 `[218 214]` vs
   our 238) — the plate's business.

## 6 · Commit

`fix(r368): Task 3 wave 3 — the intro ink-reveal scrub rides --wr-p (the measured mid-state foliage)`

(Title as prescribed by the task brief; the body documents the measured
deviation: the scrub rides the seat's view() timeline because the
prescribed `--wr-p` saturates pre-entry — the wiring verification is the
record's §2.)
