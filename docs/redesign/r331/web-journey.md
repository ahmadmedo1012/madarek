# R331 · A-Web-Journey — the ≤991 blank-pin defect, root-caused and repaired

Task ID 6 (leader-direct). The brief's Part A named one hard defect: «≤991px pinned journey
blank». Owner captures (m-025/m-050, «إطارات شبه فارغة») had already survived the R330
mobile pin-timing fix — the clock was repaired, the paint was not. This pass reproduced the
defect in a controlled harness, ran the forensic ladder to the actual root cause, shipped a
one-rule repair, and proved it at both mobile viewports in headless AND headed Chromium.

| | |
|---|---|
| Defect | through the ENTIRE pinned track at ≤991 the plan painted empty paper (plaques + intro card rendered, drawing never did) |
| Root cause | Chromium sticky-subtree paint-chunk merge/drop: the plan svg inside the 2nd-level sticky window (`.jt-map-in`) loses its raster when the in-flow sibling after it (`.jt-intro`) paints without its own compositing layer |
| Fix | `frontend/src/styles/landing.css` ≤991 block: `.jt-intro, .jt-window .bp-svg { transform: translateZ(0); }` — the standard sticky-raster remedy (per-element composited layers follow the sticky offset) |
| Proof | 5/5 tablet beats + 5/5 phone beats paint the correct camera-cropped plan (before ladders: 0/5 + 0/5); 10/10 journey e2e specs green; 6/6 contract-test files green (70 tests); stylelint delta = 0 |
| Evidence | `/home/z/evidence-journey/` (out of git): before/ ladders, after/ ladders, matrix/clone/move probes; committed thumbs `docs/redesign/r331/thumbs/journey/` |

---

## 1 · The forensic ladder (what was ruled out, in order)

Every step below is a live-DOM probe at the blank position (768×1024 @y=5224 — stage 3,
camera crop `[446,194,560,355]`; 390×844 @y=4825 — the same failure), each settled 700–900 ms
after the scroll. Harness: `python3` + Playwright against the vite dev server (:5173).

| # | Probe | Result | Verdict |
|---|---|---|---|
| 1 | Sticky mechanics (`mapIn` rect across a 9-step scroll ladder) | pins at top=57px, releases at track end — identical at both viewports | sticky NOT the defect |
| 2 | Layer groups' computed state (`[data-xl]` ×7) | `opacity: 1`, `display: inline`, children present, `getBBox` non-empty | content/state NOT the defect |
| 3 | Path computed paint (`pl-wall` rect) | `fill: rgb(40,40,40)`, `stroke-dasharray: none`, `dashoffset: 0` | pigment NOT the defect |
| 4 | Ancestor chain audit (15 nodes, full) | no transform / filter / will-change / c-v on any ancestor except the two containments | no hidden killer style |
| 5 | `svg.style.background='red'` + injected 560×355 blue `<rect>` INSIDE the svg | **neither paints** | element-level paint cull |
| 6 | `elementFromPoint` at the svg centre | returns `rect.pl-zone` inside the svg | hit-test alive, paint dead |
| 7 | Containment matrix (`.chapters` c-v off / contain off / `.jt-map-col` contain off / all off) | blank in every combination | R323 c-v skirt EXONERATED |
| 8 | Binary search: hide every sibling/section, minimal chain only | **paints** (mad 3.5 → 15.8) | a SIBLING gates the paint |
| 9 | Sibling bisect (close / cards / idx / intro / other sections) | **`.jt-intro` alone flips it** (hide → paints) | the intro card is the gate |
| 10 | `cloneNode` → body / move live node → body | paints instantly (default-fill geometry — pigment rules don't match outside `.jt`) | escapes the subtree → paints |
| 11 | Desktop pin shape replayed at 768 via CSS-only (`.jt` track + `.jt-pin` sticky) | still blank | pin nesting NOT the trigger |
| 12 | Desktop 1440×900 mid-track | paints perfectly | defect is ≤991-scoped, as briefed |
| 13 | **Headed Chromium (Xvfb :99)**, 5 tablet beats | **blank — the defect is real rendering, not a screenshot artifact** | engine-level, user-visible |

## 2 · The fix, and why it is the root-cause remedy

The gate turned out to be the intro card's paint participation inside the sticky window:
with `.jt-intro` painting as a plain in-flow sibling AFTER the svg, Chromium's raster
partition for the sticky subtree drops the svg's raster task (the q-series showed the
raster re-appear DISPLACED when only invalidation timing changed — the stale-raster
signature). Giving the window's heavy children their own composited layers separates the
raster tasks; each layer then follows the sticky offset correctly. Promoting the svg alone
was insufficient at 768 (headed-verified); the **pair** paints at both viewports in both
engines.

Fix (one rule, `landing.css` ≤991 block, commented in place):

```css
.jt-intro,
.jt-window .bp-svg {
  transform: translateZ(0);
}
```

- ≥992 untouched — the desktop pin has always painted (probe 12).
- The promotion is static (no animation, no transition) — the motion-token gate is
  unaffected; `prefers-reduced-motion` inherits the same layers (the RM static sheet at
  ≤991 paints through the identical fix).
- No layout/geometry change: `translateZ(0)` is paint-only; the r312/r325 contracts
  (geometry, clip, camera) are untouched and re-verified green.

## 3 · Eye-proof (before → after, same harness, same beats)

| Beat | 768×1024 BEFORE | 768×1024 AFTER | 390×844 BEFORE | 390×844 AFTER |
|---|---|---|---|---|
| early (pin engaged) | blank paper | plan + plaque card | blank paper | plan + plaque card |
| mid | blank paper | exam/checkpoint crop, chips [01]–[04], wash [02] | blank paper | lecture crop, wash [01] |
| late | blank paper | library/exam crop, wash [05], [05/05] | blank paper | mastery crop, assistant finding |

Committed thumbs (`docs/redesign/r331/thumbs/journey/`):
`before-768-mid-blank.png` · `before-390-mid-blank.png` · `after-768-mid-plan.png` ·
`after-768-late-mastery.png` · `after-390-lecture-crop.png`

The three substantive deltas the eye sees at every beat: (1) the plan's ink EXISTS
(walls/desks/labels — before: bare paper), (2) the camera crop is visible (the narrated
room zoom, before: nothing to zoom), (3) the finding-room wash reads (the bounded orange
room, before: only the intro card's text).

## 4 · Verification ledger (local, pre-push)

| Check | Result |
|---|---|
| AFTER ladder, tablet 768 (5 beats) | 5/5 paint (ink_px 20.6k–26.5k vs before 0) |
| AFTER ladder, phone 390 (5 beats) | 5/5 paint (ink_px 3.9k–11.2k vs before 0) |
| journey e2e (r312-mobile-camera + r325-map-clip, 10 specs) | 10/10 green (1.0m) |
| contract unit files ×6 (r312/r306/r313/funnel/r170d/scrollspy-grain) | 70/70 green |
| stylelint landing.css | 65 problems BEFORE = 65 AFTER (30e/35w — zero delta from this change) |
| ≥992 regression | none — desktop untouched (probe 12; e2e 1440 specs green) |

## 5 · Notes for the QA panel

- The defect reproduced in **headed** Chromium — this was never a test artifact; the
  owner's phone frames and this harness agree.
- The c-v skirt (R323 §7-5) was EXONERATED by probe 7 — the perf skirt stays as-is; no
  perf regression is expected from two promoted layers inside one sticky window (they
  replace the dropped-raster repainting churn).
- If a future browser fixes the chunk-merge bug, the promotion is inert (paint-only hint)
  and can be dropped in the next CSS-budget pass.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
