# W1 · Hero — full-bleed rebuild contract (R332)

Owner: W1 · files: `styles/r331/hero.css`, `components/landing/hero/Hero.tsx`,
`components/landing/cursor/HeroInspect.tsx` (captions only) ·
harness: `scripts/twin/` · defect: run-001 §Supervisor-1 (hero PARTIAL —
composition only).

## 1. Heron fact (source of record)

Frames `/home/z/evidence-r332/twin/run-001/1440/hero/heron-p000…p050.png` +
`docs/redesign/r331/heron-program.json`:

- **Full-bleed art band** — the hero is ONE full-width stage. The blueprint
  paper runs edge-to-edge; at 1440 the artwork's tree **breaks the viewport
  edge**. `imagery.hero`: `home-hero-img-inner` = one img
  (164.87rem wide @1440 ≈ 1374px, aspect 2.12, `contain`, mix-blend multiply)
  inside a 171.27rem wrap ≈ full viewport width; `padding 3.2rem` is the img
  layer's own mat, **not** a white box — the page paper shows through.
- **bgBorderFrame inset from the VIEWPORT** — `spacingAndLayoutTokens.bgBorderFrame`:
  "absolute inset 1.2rem (0.8rem @≤767); 4 edge items ~7px thick; 4 corner
  plus marks 1.2rem". One frame per hero, ~10px in from the hero-wrap edges
  (Heron remBase @1440 = 8.333px → 1.2rem = 10px; the wrap itself sits 6.7px
  in from the viewport) — over/around the full-bleed drawing, never hugging
  the artwork.
- **Annotations on the drawing's own layer** — `ruler: inset 3.2rem, dashed
  tick lines`; deco cards item1 (25.6rem wide, bottom 26%, left 14%) / item2
  (bottom 22%, left 50%) as mono micro-copy over the drawing. **No stray
  boxes**: no inner window, no bordered white frame, no dead paper margins.

## 2. Madarek now (probe-before.json, /home/z/evidence-r332/w1/)

@1440×900 (hero height 887 · h1 46.67px — already twin-accurate, run-001):

- `.hro-stage` computes to a **900×558px white bordered box centered at x=270**:
  `border: 1px solid rgb(179,179,175)` · `background: rgb(255,255,255)` ·
  `width: 899.98px` (`min(100%, 108rem)`) · `padding: 16px` → **270px dead
  paper margins each side**; the ink rides at 866×312.5 inside it.
- The `.hro-edge` frame strips + `.bp-plus` marks hug **that 900px box**
  (edges x=271…1169) — the "window inside a window": frame wraps the inner
  window instead of standing inset from the viewport.
- Caption probe (AABB among leaf texts: deco [01]/[03] spans ↔ svg
  `<text>` ↔ HeroInspect station/hint text): the run-001 note
  ("caption labels near the drawing baseline") was eyes-on about the
  captions riding INSIDE the boxed inner window; under an honest
  at-rest leaf-text metric the captions never AABB-collide with other
  visible text (before **and** after — measured both sides, see
  `probe-before-reconstructed.json` / `probe-after.json`). The real
  caption defect was the SEAT: %-anchored to the 900px window box.
  The fix re-anchors them to the full-bleed annotation layer.
- h-scroll @390: 0 ✓ (kept).

## 3. Delta → root cause

The owning rule is **NOT in W1's files**:

- `frontend/src/styles/landing.css:720` — `.bp-stage { position: relative;
  border: 1px solid var(--rule); background: var(--surface); padding:
  var(--sp-4); inline-size: min(100%, 108rem); margin-inline: auto; }` — the
  shared "drawing window" rule. The hero stage element carries
  `class="bp-stage hro-stage"`, so this rule binds the hero too.
- Cascade: `LandingPage.tsx` imports `Hero` (line 28 → `r331/hero.css`)
  **before** `styles/landing.css` (line 62) → landing.css loads last and wins
  every equal-specificity tie; hero.css's `.hro-stage { background:
  transparent; inline-size: 100%; padding: 12px }` loses, and nothing in it
  declared `border`/`margin-inline` at all.
- Secondary: `.hro-edge`/`.bp-plus` are seated on the stage box in Hero.tsx
  (stage-relative frame ≈ the inner window), not viewport-relative like
  Heron's bgBorderFrame.

## 4. Fix (W1-owned edits — applied)

`Hero.tsx` (owned):

- Move the frame — 4 `.hro-edge` strips + 4 `.bp-plus` corner marks — out of
  `.hro-stage` to the **section root** (`.fo-hero.hro`), matching Heron's
  bgBorderFrame seat (viewport-relative, over content + work rows).
- `.bp-stage` hook kept on the stage (r309/r311 e2e + HeroInspect
  `closest('.bp-stage')` depend on it).

`r331/hero.css` (owned):

- `.fo-hero.hro` → `position: relative` (frame containing block).
- `.hro-edge` strips → `inset: 1.2rem` of the section (bottom strip rides
  above the fold line like Heron's); corner `.bp-plus` marks re-seated
  centered on the frame corners. 1px hairline thickness kept — the sheet's
  documented chrome deviation (Heron uses ~7px bars).
- `.hro .hro-stage` (specificity 0,2,0 — beats landing.css's `.bp-stage`
  regardless of import order): `border: 0; background: transparent;
  margin-inline: 0; inline-size: 100%; padding-block: 12px; padding-inline: 0`
  → full-bleed stage, no white box, no dead margins; the tight-viewBox SVG
  (`inline-size: 100%`) now runs edge-to-edge @1440 (1440/2.77 ≈ 520.7px ≤
  the 62svh cap 558 — hero height unchanged).
- `.hro-art` → `padding-inline: 0` (paper + ink edge-to-edge; block seat
  63px/8px kept for the vertical skeleton).
- Ruler layer → `inset: 3.2rem 0` (Heron's ruler inset); `.bp-dmark`
  registration marks hover-gated with the dashed inner frame they belong to
  (they were stray marks at the box corners at rest).
- Deco caption seats stay %-anchored to the (now full-bleed) stage; overlap
  re-probed at 1920/1440/1024/768/390.

## 5. Required edit OUTSIDE W1 ownership (documented, NOT applied)

`frontend/src/styles/landing.css:720` (owner: the agent splitting
landing.css / next wave) — the hero no longer needs the shared window rule's
box; `.bp-stage` is hero-only on this page. Exact edit: from `.bp-stage`
remove the box-making properties the hero re-owns in r331/hero.css —

```css
.bp-stage {
  position: relative;
  padding: var(--sp-4);
  /* DELETE: border: 1px solid var(--rule); background: var(--surface);
     inline-size: min(100%, 108rem); margin-inline: auto; — the hero's
     .hro .hro-stage reset in r331/hero.css now neutralises them, and the
     108rem white window contradicts the R315 A.1 transparent-paper verdict */
}
```

(or gate the whole rule `:not(.hro-stage)` if other seats adopt the class).
Until then the specificity reset above holds the composition.

## 6. Acceptance — MEASURED (after)

Twin after-run `/home/z/evidence-r332/twin/w1-after/` (report.json/md):
hero **height Δ 0.03%** (887 vs 886.7 — unchanged), **heading fs Δ 0.0%**
(46.6667 both), trigger Δ 6.7px (unchanged), rhythm n/a. No regression.

Probe `/home/z/evidence-r332/w1/probe-after.json`:

| vp | stage | svg (ink) | caption overlaps | h-scroll | hero h | h1 fs |
|---|---|---|---|---|---|---|
| 1920×1080 | 1920w, border 0, bg transparent | 1920×645.6 (62svh cap; ink 1786w centred — continuous paper) | **0** | 0 | 1067 | 62.22 |
| 1440×900 | **1440w** (was 900), border 0, bg transparent | **1440×519.6 full-bleed** (was 866×312.5) | **0** | 0 | 887 | 46.67 |
| 1024×768 | 1024w | 1024×369.5 | **0** | 0 | 755 | 33.19 |
| 768×1024 | 768w | 768×277.1 | **0** | 0 | 1010 | 36.86 |
| 390×844 | 390w | 390×140.7 | **0** | **0** | 830 | 31.74 |

Frame geometry @1440 (getBoundingClientRect): strips at inset 10px
(=1.2rem) of the section — t/b span x 10→1430, s/e span y 10→877; corner
plus marks centred on the frame corners (4.2px insets). Pixel-verified on
the after frame (`w1/frames/after-madarek-p050.png`): top strip row y=10
= rgb(179,179,175) across 1403px; ink strokes present in the rightmost
30 columns (before: **0** — dead white); flat-white fraction at x=700
0.88 → **0.00** (the white box is gone; the page paper runs edge-to-edge).

Captions: deco [01]/[03] re-anchored to the full-bleed stage (seats
10% / 44% inline-start of 1440 — Heron's item1/item2 grammar mirrored
for RTL); leaf-text overlap count **0 at all five viewports** (metric:
visible leaf text AABB, area > 0.25px², ancestor-descendant excluded —
`revert-probe.py` reconstructs the before-state CSS for the same
metric: also 0 at rest, confirming run-001's caption note was the
window seat, not a text collision).
