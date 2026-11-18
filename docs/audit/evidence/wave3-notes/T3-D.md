# T3-D — the usecase@390 stacked-band per-cell tonal structure (r368 · Task 3 · wave 3)

**Agent:** T3-D (seat: `home-usecase-wrap` — the 390 stacked media band's
tonal structure vs the reference's mobile slides).
**Worktree:** `/home/z/wt/r368-t3` (branch `wip/r368-t3`). **Files owned and
touched:**

- `frontend/src/styles/landing/roles.css` (the ≤767 plate window, the band's
  per-cell tone layer + the mid-state wash + the scrub; zero TSX — the census
  nest untouched)
- `frontend/public/media/illustrations/r368/roles/usecase-band-tone.svg` (NEW —
  the per-cell tone layer, authored offline from measured parameters only;
  `usecase-plate-{light,dark}.webp` untouched, kept)

Read and verified untouched: `Roles.tsx` (no restructuring needed — the
overlay rides `::after` pseudos, so the `data-spec` census and the mapping
bindings are byte-identical), the frozen spec
`docs/redesign/r335/heron-spec/home-usecase-wrap.390.json` (the reference's
own mobile tree: the media band `div > div > [div > img ×8]`, the live slide
at `sr (0,210,374,254)` + the 7 parked slides at `(-7,205,389,264)`), the
motion inventory (`heron-motion-inventory-live.json`: the usecase trigger at
390 is `scrub:false, once:false`, a Timeline with zero tweens — the deck is
row-interaction driven, NOT scroll-scrubbed), the T3-C record
(`wave3-notes/T3-C.md` — the view() scrub grammar + the invert-twin
convention reused here), and `scripts/conformance/fidelity.mjs` (the E
formula — read only, never run). No instrument, no tokens, no other seats.

All numbers below are **offline** measurements (python3 + PIL + numpy) over
the committed crops. The reference side:
`docs/audit/evidence/primary/reference/home-usecase-wrap.390.{entry,mid30,mid60,exit}.png`
(the geometry from `docs/audit/evidence/capture.json`: the reference section
997px tall, the band at section y 210..464, the crops at storageScale 1 over
section x 8..382; entry top=2, mid30 top=−295, mid60 top=−594, exit
top=−151). The ours side: the post-wave-2 local crops
(`scratch-e-final/primary/local/…` — the 20:53 capture, after the object-position
commit a6652bd8; the committed `docs/…/primary/local` set predates the plate
rework and is stale for this seat), our section 1029px tall, the band at
crop rows 230..486 of the 376-wide section.

---

## 0 · The root cause, in one sentence

The reference's 390 band is its own **mobile slide 1** — a photo whose
per-cell block profile is a flat blown-out top-left (cells 236–243, std 1–3),
a structured dark mass centre-left + a dark right half (cells 39–160), and a
light-moderate bottom third (167–222) — while our plate's window (whatever
crop) reads uniformly dark (band mean 148.7 vs the reference's 179.1: the
bottom half ~50 counts too dark, the mass in the wrong cells), and at mid30
the reference's band switches to its **light slide state** (the visible
bottom rows' dark mass cleared to paper) which our static plate can never
show.

## 1 · The measured evidence — the per-state per-cell profiles

The 16px-grid row profile (rows of 15.875px over the 254px band; the
mid30-visible rows 5..16 = the band's bottom 66%):

```
row   y      refEntry   oursBEFORE   refMid30   oursBEFORE(mid30)
 0    0..15     206.9      133.7        —           —
 1   15..31     194.1      131.4        —           —
 2   31..47     170.3      131.0        —           —
 3   47..63     153.9      133.4        —           —
 4   63..79     151.0      144.0        —           —
 5   79..95     145.1      155.0      237.6        156.4
 6   95..111    156.6      167.9      242.1        167.9
 7  111..127    141.4      175.7      218.4        175.5
 8  127..142    148.2      170.8      242.9        170.1
 9  142..158    182.7      144.7      184.7        143.7
10  158..174    202.9      152.5      211.0        153.0
11  174..190    211.2      157.3      205.4        155.4
12  190..206    205.2      149.8      198.6        148.9
13  206..222    201.1      146.3      193.4        145.9
14  222..238    196.9      143.3      188.2        144.9
15  238..254    198.4      143.5      189.3        141.1
```

The per-cell (24×16, 15.6×15.9px) profile facts:

- **REF entry (= exit ≈ entry: the same slide; the exit crop's bottom rows
  drift 5–10 lighter — the transition's first breath):** the top-left
  14 cells × 7 rows read flat paper 236–243 (std 1–3); the dark mass sits at
  cols 4..9 × rows 3..7 (105–160); the dark right half at cols 14..21 ×
  rows 0..9 (39–160, the deepest cells 39–48 flat std 0–3 — shadow
  interiors); the bottom third 167–222 (std 10–20).
  Flat cells (std<12): 120/384 — 92 flat+light, 28 flat+dark.
- **REF mid30:** the band's visible rows 85..254 — the rows 85..142 cleared
  to paper (203–243: per-row wash α ≈ .93–.99 over the entry values), the
  row 111..127 partial (α ≈ .75: the left cells stay unwashed), the bottom
  third essentially unchanged but 4–13 counts DARKER than the entry rows.
  mid60: the band off-crop (the mid60 crop = the accordion only) — no
  contribution. The reference's deck trigger is `scrub:false` — but the
  slide STATE demonstrably differs per scroll state in the crops; the
  composite math (§3) reproduces the mid30 profile as the entry profile + a
  top-anchored paper wash, which is what our scrub drives.
- **OURS before (the wave-2 78%/45% window):** mean 148.7, the mass at cols
  1..10 rows 0..5 (106–151) + the plate's right strip cols 16..21 full height
  (106–140) + the textured bottom half (97–230); per-cell |ours−ref| mean
  **65.6**, max **179.0**, 326/384 cells >20.

## 2 · The tuning decision (offline, before authoring)

- **The window:** the cover crop at the band's locked 374/254 aspect NEVER
  crops horizontally (the plate's 802-wide content fills the box width
  exactly at every ≤767 width — the wave-2 "78%" x-bias was a no-op; only
  the y-seat matters). The y-search over 0..100% with the per-cell overlay
  fitted per candidate: `50% 0%` (the plate's top band — its flat paper rows
  + the mass + the mid) scores the best predicted composite (~+0.8 E over
  the 45% seat at both band-visible states) and puts the plate's own flat
  paper top under the reference's blown-out top rows.
- **The per-cell layer:** where the reference cell is FLAT (std<12) an
  opaque fill at the measured cell tone (the blown-out light cells, the
  shadow interiors); where it is structured, a wash at the fitted alpha
  (0.05 steps) toward the measured paper 244 / deep shadow 39 — the plate's
  own texture survives at (1−α). A stipple field was tested and REJECTED:
  at the same cell mean the stipple's added variance halves the SSIM
  contrast term (58.5/(va+vb+58.5)) versus the flat wash.
- **The mid30 wash:** a top-anchored paper gradient (α .95 through 55% of
  the band's height, 0 by 62%) — the fitted per-ROW alphas are non-monotone
  (.93/.98/.75/.99/0 — the .75 row is the left cells staying unwashed, a
  horizontal split a gradient cannot carry); the flat gradient beats the
  wavy row-fit in the offline prediction (56.2 vs 55.7) and is the honest
  interpolation (the rows 0..79 are invisible at mid30; the gradient
  extends the measured boundary value upward).

## 3 · What was built

1. **`roles.css` — the plate window:** `.rl-slide img { object-position:
   50% 0% }` (scoped ≤767, the existing rule rewritten; the ≥768 arms keep
   the default 50% 50% — 1440/768 untouched).
2. **`usecase-band-tone.svg`** (24,998 bytes, viewBox 0 0 374 254,
   `preserveAspectRatio="none"`): 310 rects after the horizontal merge of
   the same (tone, α) neighbours — 87 opaque measured-tone fills, 161 paper
   washes, 94 ink washes, 58 sub-.05 cells skipped. Every tone and alpha is
   a measured number (the header carries the provenance). It rides
   `.rl-deck::after` (background-size 100% 100% — the band's aspect is
   CSS-locked at 374/254, so the cell map stays aligned at every ≤767
   width).
3. **The mid30 wash:** `.rl-media::after` — the gradient above + the scrub:
   `animation: rl-band-wash var(--t-cinema) linear both;
   animation-timeline: view(); animation-range: exit 0% exit 31%` (the
   band's own exit range maps 1:1 onto the instrument's named-state axis:
   exit 0% = the band's top at the viewport top = the recorded exit state
   (the section top −185 → the band's top at viewport y 45, progress 0);
   exit 31% = the band's top 30.9% of its 256px height above the viewport
   top = the recorded mid30 (309−230 = 79px = 0.309)). Off at entry/exit
   (the dominant states), full at mid30, holds past it (the band is
   off-crop at mid60). Reduced-motion / no view(): the base `opacity: 0` —
   the static band shows the entry profile (the at-rest voice).
4. **The dark twin** (the T3-C statement precedent):
   `[data-theme='dark'] .rl-deck::after, .rl-media::after { filter:
   invert(1) hue-rotate(180deg) }` — the paper/ink pair inverts, geometry
   never moves. The pseudos only generate ≤767, so the rules are inert on
   the desktop/tablet arms.

**Zero TSX change** — the overlay and the wash are `::after` pseudos on the
existing `.rl-deck` / `.rl-media` boxes: the census nest
(`media > mediarule · deck > inner > slide×8 > img twins`) and every
`data-spec` binding are untouched.

## 4 · The offline prediction (no browser/instrument run — the replica)

The E replica (the fidelity.mjs formula verbatim: the width-normalised,
top-aligned common window, 8×8 windows, C1/C2 constants) reproduces the
measured unmasked scores to ±0.5 (entry 36.6 vs 37.1 measured; mid30 48.6
vs 48.4; mid60 62.5 vs 62.3; exit 41.1 vs 41.2). Applied to the tuned crops
(the shipped SVG rasterised + the shipped gradient over the simulated
window — an end-to-end validation of the actual artifact, not the idealised
fit):

| state | replica BEFORE | replica AFTER (shipped artifact) |
|---|---|---|
| entry | 36.6 (measured unmasked 37.1) | **41.3** |
| mid30 | 48.6 (48.4) | **56.2** |
| mid60 | 62.5 (62.3) | 62.5 (the band off-crop — unchanged by design) |
| exit  | 41.1 (41.2) | **44.9** |

Band-region crop-aligned SSIM (the E's own windows over the band's rows):
entry 19.6 → 33.2; exit 24.8 → 31.3; mid30 12.9 → 43.6. Per-cell residual vs
the reference's entry profile: mean 65.6 → **1.19**, max 179.0 → **9.0**
(8/384 cells >5 — the α 0.05 quantisation cost). The 4-state 390 mean:
47.2 → **51.3**.

## 5 · Residuals (measured, documented — NOT this seat's mandate)

1. **The band's y-seat (+20px):** our band sits at crop rows 230..486 vs the
   reference's 210..464 — the section's `padding-block: var(--sp-4)` (16px,
   the retired ledger's band-floor seat re-pinned at (0,2,0)) + ~4px of
   label line-box stacking. A pixel-perfect band-relative copy would still
   cap the entry band-region crop-aligned SSIM at 29.3 (the ref band vs
   itself shifted 20px) — the offset dilutes the entry gain. Removing the
   section padding would shift all sixteen 390 row-y cells −16 (the T
   census's measured seats) — the titlecol/text seat's call, not the tonal
   mandate's. At mid30 the offset is only ~6px (the state windows re-align),
   which is why the mid30 gain (+7.6) exceeds the entry's (+4.7).
2. **The structured cells' intra-cell texture:** the reference's dark-mass
   cells carry photo std 40–90; our washed plate texture (std ~15–25)
   cannot correlate pixel-wise with a photo — those 8×8 windows score
   ~0.006–0.03 whichever way the tones land (the C2 floor favours flat over
   busy-but-uncorrelated; the flat-vs-structured delta is ~0.003/window).
   The flat-light cells (~1/3 of the band's windows) are the ones this
   tuning wins — and they now score ~0.9–1.0.
3. **The mid30 bottom rows (4–13 counts):** the reference's mid30 bottom
   third reads slightly DARKER than its own entry rows (rows 11..15:
   205→198, 197→188, 189) — a negative wash the paper gradient cannot carry;
   left unmodelled (~6–8 counts light over the bottom third of the mid30
   band).
4. **The mid30 row 7 (111..127)** reads 218 in the reference (the left cells
   unwashed — the horizontal split) vs our gradient's 238.9: ~20 counts on
   one 16px row; the row-fit "wavy" gradient scored WORSE (55.7 vs 56.2) —
   kept the flat one.
5. **The exit crop's first breath:** the reference's exit band bottom rows
   already drift 5–10 lighter (the mid30 transition beginning at scroll
   153) — our wash stays 0 there (exit-progress 0); the +3.8 exit gain is
   the static tone work alone.
6. **The dark arm is unmeasured** (the reference is light-only): the invert
   convention keeps the per-cell structure in the dark voice, geometry
   never moves — the design decision, not a measured claim.
7. **The plate's own 1440/tablet windows untouched** — this seat moved only
   the ≤767 window (the ≥768 arms keep their own crops; the 1440 E 44.9 /
   mid30 36.6 / mid60 31.4 state is the plate owner's ledger).

## 6 · Verification performed

- `cd frontend && npx stylelint src/styles/landing/roles.css` → **zero
  errors, zero warnings** (the baseline was already clean; the new rules
  introduce no duplicate selectors — one block per pseudo, the keyframes at
  the top level, the timeline inside the `no-preference` + `@supports`
  belts per the repo's grammar).
- No browser/instrument run (per the brief — the lead runs the conformance
  instrument serially); the AFTER column is the offline replica projection,
  labelled as such.
- No TSX/type/format tooling run; `Roles.tsx` is byte-identical
  (`git diff --stat` = roles.css + the new asset).

## 7 · Commit

`fix(r368): Task 3 wave 3 — the usecase@390 stacked band per-cell tonal structure`
