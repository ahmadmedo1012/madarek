# T3-B — the hero geometry surgery (r368 · Task 3 · wave 3)

**Agent:** T3-B (seat: the hero stage). **Worktree:** `/home/z/wt/r368-t3`
(branch `wip/r368-t3`). **Files owned and touched:**
`frontend/src/styles/landing/hero-mechanics.css` only — `HeroPlate.tsx`,
`Hero.tsx` and `hero-plate.css` were read and verified untouched (their
stress-fix seats stand exactly as wave 1 authored them).

**Mission:** revert the wave-1 stage re-anchor's measured net-negative
~2.5 E (hero both-bp 45.3 → 42.8 through the wave-2 mass recovery; the
recorded ledger: `docs/audit/evidence/scorecard.json` = the pre-wave
baseline 45.3, `scratch-e-full/scorecard.json` = wave 1's 41.1,
`scratch-e-final/scorecard.json` = wave 2's 42.8 — numbers measured by
the prior waves' runs, cited from their committed/scratch scorecards,
not re-measured here) while keeping the three stress fixes and wave 2's
ink-mass work (commit `a6652bd8`).

---

## 1 · The re-anchor that was reverted (the exact block)

Wave 1 (`b5143884`) re-seated the hero stage from the pre-wave-1
full-host flow seat into the frozen spec's img frame. Four rule groups
carried it — all four are reverted in this wave; the stage/svg rules are
now rule-for-rule byte-identical to the pre-wave-1 baseline
(`f402e47a`, verified by a comment-stripped unified diff — the only
remaining rule-level deltas vs `f402e47a` are the intended keeps listed
in §2/§3).

### 1a · THE INSET BLOCK (the re-anchor's heart) — REMOVED

Before (wave-1 text, `hero-mechanics.css`):

```css
@media (min-width: 768px) {
  .hro .hro-stage {
    position: absolute; /* the plate's art seat — the same box .hro-plate-art anchors (the nearest positioned ancestor is .hro-plate-host, i.e. hpf-6) */
    inset-inline: 3.12rem; /* the frozen img frame's own insets (hero-plate.css .hro-plate-art, ≥992 base) */
    inset-block-start: 3.24rem;
    inset-block-end: 3.12rem;
    padding-block: 0; /* the frame's insets are the whole mat — the img box has no inner mat */
    overflow: hidden; /* the cover crop: the svg's flanks crop at the frame's own edges (the reference's img object-fit grammar) */
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .hro .hro-stage {
    inset-inline: 2.17rem; /* the tablet img frame's own insets (hero-plate.css) */
    inset-block-start: 2.28rem;
    inset-block-end: 2.17rem;
  }
}
```

After: **deleted.** The stage's base rule reverts with it:

```css
.hro .hro-stage { inline-size: auto; … }   →   .hro .hro-stage { inline-size: 100%; … }
```

(`display: grid · place-items: center · position: relative ·
padding-block: 12px · padding-inline: 0 · min-inline-size: 0` were
unchanged by wave 1 and stand as the pre-wave-1 full-host seat — the
stage rides the whole `.hro-plate-host` box again, transparent paper,
ink edge-to-edge.)

### 1b · the svg's COVER grammar — REMOVED (reverted to the meet grammar)

Before (wave 1):

```css
@media (min-width: 768px) {
  .hro .hro-art .bp-svg {
    block-size: 100%; /* the frame's height drives the scale */
    inline-size: auto; /* from the viewBox aspect — the cover pair with the stage's overflow crop */
    max-inline-size: none;
  }
}
```

After (the pre-wave-1 base, restored byte-identical):

```css
.hro .hro-art .bp-svg {
  inline-size: 100%;
  block-size: auto;
  max-block-size: 100%;
}
```

The drawing again fills the frame's content width at its own 2.77:1
viewBox aspect with the band's height as the only cap (meet, not
cover): the whole drawing visible, ~34px paper flanks + the 12px mat —
the geometry the 45.3 pre-wave baseline measured.

### 1c · the stress belt's tablet arm — REMOVED (retired with its cause)

```css
@media (max-height: 420px) and (min-width: 768px) {
  .hro .hro-stage { position: static; inline-size: auto; padding-block: 12px; }
  .hro .hro-art .bp-svg { inline-size: 100%; block-size: auto; max-block-size: none; }
}
```

This arm existed only to UNDO the re-anchor inside the short-viewport
stress belt. With the base stage back in flow at every belt, the
general `@media (max-height: 420px)` belt (§2c) alone carries the fix —
and the stage keeps its base `position: relative`, which is the
principled containing block for `.hi-layer` (HeroInspect's
`applyMapping` computes the layer's `left`/`top` against the STAGE box;
the arm's `static` had forced the layer onto `hpf-6` by a coordinate
coincidence — relative restores the designed anchor). The arm's
`inline-size: auto` was also a grid-item auto-sizing degeneracy
(`.hro-art`'s stretch-justified track saved it); the reverted
`inline-size: 100%` is the explicit flow seat.

---

## 2 · The three stress fixes KEPT (rule-level citation, untouched)

1. **`01/محور` · `02/قياس` text-on-text @1440 (stress (c))** — the
   nesting + its re-anchoring pair, byte-identical to wave 1:
   - `frontend/src/components/landing/hero/HeroPlate.tsx` —
     `hpf-15` nested inside `hpf-14`, `hpf-17` inside `hpf-16` (the
     frozen spec's own `div[4] > div[1] > span[1]` structure).
   - `frontend/src/styles/landing/hero-plate.css` —
     `.hpf-15 { position: absolute; inset-inline-start: 1.2rem; inset-block-start: 0rem; … }`
     and `.hpf-17 { position: absolute; inset-inline-start: 1.2rem; inset-block-start: 0rem; … }`
     (the spans re-anchored to their PARENT boxes at the same rendered
     geometry: 81.24rem − 80.04rem = the 1.2rem start inset, the
     parent's own block seat = 0).
   Both files verified untouched this wave (`git status` clean for
   them). The revert does not touch the plate furniture — the nesting
   cannot re-expose.
2. **`hro-line` text-on-text @1440** — `hero-mechanics.css`:
   `.hro-title .hro-line { inline-size: fit-content; }` (the title's
   mask lines hug their own ink instead of the full 772px cell;
   zero rendered-ink change — the h1 block and the glyphs' seats are
   untouched). KEPT.
3. **`hi-marker` unreachability @640×360 · 844×390** —
   `hero-mechanics.css` `@media (max-height: 420px)` (the [11-b] general
   belt): `.fo-hero.hro`/`.hro-chain` `block-size: auto` +
   `min-block-size: calc(100svh - 1.56rem)`, `.hpf-1…6` and
   `.hro-bandhost` `block-size: auto`, `.hro-plate-host
   { position: static; display: block; }` — the chain FLOWS, the art
   band takes the drawing's real height, the content band rides below,
   the hero grows past the viewport, nothing paints over the marker.
   KEPT (only its redundant tablet arm retired, §1c). Re-checked
   against the reverted geometry by CSS reasoning: with the stage in
   flow (base) inside `.hro-art` inside the static host, the belt's
   auto-height chain sizes the art band from the svg's own box
   (`max-block-size: 100%` resolves to none against the indefinite
   flow height) — the same flow grammar the arm used to force, now the
   base at every belt.

Also kept (not the re-anchor, measured-positive or stress-neutral):
wave 2's ink mass (`a6652bd8`) — `.hro .hro-art .bp-svg .bp-fill
{ fill: var(--hro-mass-fill) }` + the measured left light margin
`.hro .hro-art::after` (the paper wash over the art's first ~15%) +
the stipple/hatch densification — all untouched. The wash anchors to
`.hro-plate-host` (the abspos `inset: 0` box), NOT to the stage, so
its geometry is identical before and after this revert. Wave 1's
`.bp-l-grid { opacity: 0 }` grid retirement is kept (it addressed the
blind panel's "grid-lined/whiter" verdict; it is not the re-anchor).

---

## 3 · Offline block-profile evidence (python3 + PIL + numpy, no server)

Method: the committed crops' 8×8 block mean-luminance grids (the
repo's own measured idiom — block means, darkness = 255 − mean), per
state: **ref** = `docs/audit/evidence/primary/reference/…`, **baseline**
= the committed pre-wave-1 local crops (`docs/audit/evidence/primary/local/…`,
the 45.3 state), **wave1** = `scratch-e-full/primary/local/…` (the
re-anchor, `fill:none`), **wave2** = `scratch-e-final/primary/local/…`
(the current state: re-anchor + mass). The 1440 crop is the hero
section window (356×221 vs the local's 360×221) — rows 0-1 the
masthead/frame, rows 2-5 the img/art band, row 7 the content band.

### 3a · The reference's own geometry (1440 entry, column darkness)

```
ref cols:  19.8  31.3  47.5  51.4  53.8  55.5  24.3  15.5   (8 cols, L→R)
ref rows:  14.6  11.2  43.6  70.9  63.6  35.0  12.8  47.4
```

The reference's mass sits **center-right** (peak col 5; rows 3-4), with
the **light left margin** (cols 0-1 darkness 19.8/31.3 = luminance
235/224 — "light paper", agreeing with wave 2's recorded cols 0-1
201-244 luminance) and a light right tail (cols 6-7 = 24.3/15.5).

### 3b · The re-anchor's measured geometry damage

```
wave2 (re-anchor+mass) cols: 33.6  52.8  42.8  42.6  45.7  40.7  56.9  52.3
baseline (pre-wave-1)  cols: 14.1  19.2  18.5  17.3  21.3  20.0  24.0  19.6
```

The cover crop pressed the drawing's ink into the frame's flanks: the
light left margin is LOST (col 1 darkness 52.8 vs the reference's
31.3) and the right tail goes dark (cols 6-7 56.9/52.3 vs 24.3/15.5);
the row profile sinks the mass (row 5 darkness 91.5 vs the reference's
35.0; at mid60 the re-anchored rows 0-3 read 84-91 where the reference
reads 10.9-11.5). Aggregate (normalized-darkness geometry MAE vs the
reference's 8×8 grid):

| 1440 state | baseline | wave1 (re-anchor) | wave2 (re-anchor+mass) |
|---|---|---|---|
| entry | **9.88e-3** | 11.36e-3 | 12.03e-3 |
| mid30 | **9.04e-3** | 10.53e-3 | 11.57e-3 |
| mid60 | **12.50e-3** | 13.60e-3 | 13.17e-3 |

The pre-wave-1 geometry is the closest of the three local states at
ALL THREE 1440 states; the re-anchor alone (wave1) degraded the
agreement by +1.1…+1.5e-3 before any mass effect. The row-centroid at
entry: baseline dy **−0.04 cells** (dead-on) vs wave2's **+0.25** (the
sunk mass). At 390 entry the profiles are unchanged by the re-anchor
(baseline vs wave1 geometry-MAE 8.82 vs 8.77e-3, cols/rows
near-identical) — the re-anchor was a `min-width: 768px` change and
never touched the phone seat; the revert restores the base
`inline-size: 100%` whose grid-stretch equivalence at ≤767 keeps the
390 rendering identical (`.hro-art`'s auto track + stretch
justification fill the stage either way).

### 3c · The tone seat: the cover crop inflated the ink mass ×1.25

Art-band darkness (rows 2-5 summed, 1440 entry): reference **213.1** ·
baseline (no mass) 90.1 · wave2 (mass at cover scale) **265.8 = 125% of
the reference**. The mass fill's area scales with the drawing's element
box: at cover the element is ~1792×647 (flanks cropped) vs ~1358×490 at
meet — the same `--hro-mass-fill` tone var lands ×1.33 the area at the
re-anchored scale. Scaled back to the meet geometry the mass exposure
predicts ≈ 90.1 + 176×0.749 ≈ **222 ≈ 104% of the reference's art-band
darkness** (vs the current 125%): the revert returns the mass to the
reference's measured exposure while keeping wave 2's measured tone var.

**Verdict:** the stage/mass seats move back toward the reference
geometry — the drawing's full flank-visible meet box, the light left
margin restored (the wash now overlays paper where the crop read dark),
the mass area back at ~1.0× the reference's exposure. The next
instrumented run should re-measure the hero E against the 45.3 baseline
(expect the ~2.5-point re-anchor debit gone; the wave-2 mass credit
kept) — NOT measured here (no server, no instrument run this wave).

---

## 4 · The two pre-existing stylelint errors cleared (in-seat, semantics preserved)

Both errors pre-existed this wave (verified by linting the HEAD copy of
the file: the same two errors at HEAD's line numbers 990/1148) and live
in this seat's owned sheet — cleared without any rendering change:

1. `no-duplicate-selectors: ".hro"` (the R338 T-11c measured-ink var
   block vs the sheet-head motion register) — the T-11c block now
   reads `section.hro` (the element-qualified twin): the section IS the
   only `.hro` in the DOM (Hero.tsx), and the dark arm
   `[data-theme="dark"] .hro` (0,2,0) still outranks it (0,1,1) exactly
   as it outranked the bare `.hro` (0,1,0) before.
2. `no-duplicate-selectors: ".landing.intro-done .hro-stage
   .bp-drawable"` (the [X] tail single-entry transition vs the [9]
   staged-ink-in rule) — the [X] rule is folded into [9] (its value —
   `transition: stroke-dashoffset 0.4s ease` — was always the winning
   cascade value; the older 2-entry list under it is retired with it)
   and the tail comment documents the fold. The RM belt's later
   `transition: none` still wins under reduced motion — byte-identical
   cascade.

`cd frontend && npx stylelint src/styles/landing/hero-plate.css
src/styles/landing/hero-mechanics.css` → **exit 0, zero problems**
(was 2 errors + 1 warning at HEAD for these two files).

## 5 · Residuals

- **Unmeasured this wave:** the hero E after the revert. The offline
  prediction (§3c) says the ~2.5-point re-anchor debit returns to the
  ledger; the instrumented confirmation is the next session's first
  `--sections home-hero-wrap --reuse-reference` run. No instrument
  numbers are claimed here beyond the cited prior-wave scorecards.
- **The stress matrix was not re-run** (no browser/server this wave);
  the [11-b] belt + the reverted flow stage are verified by CSS
  reasoning (§2c) — the 7/7 stress claim stands on wave 1's committed
  run plus this wave's belt-preservation argument. A stress re-run
  (640×360 · 844×390) belongs to the next instrumented pass.
- **The 1440 mid60 geometry-MAE stays high for every state**
  (12.5-13.6e-3): the reference's mid-scroll ink distribution (rows
  0-1 dark, rows 2-4 light) is not carried by our drawing's content at
  ANY geometry tested — a per-state tonal/layout increment, not a
  stage-geometry issue.
- **The `.hro` duplicate pattern remains in OTHER seats' sheets**
  (e.g. `hero.css:804`, `cta.css` carries six) — out of this seat's
  ownership; recorded for the CSS sweep (Task 8-class).
- **The [9] fill-opacity transition**: since r338 the single-entry
  transition (now explicit in [9]) means `fill-opacity` resolves
  without a fade — pre-existing behavior, preserved byte-identically
  (documented in the fold comment), flagged as a candidate for the
  motion polish pass if the ink-in reads abrupt.
