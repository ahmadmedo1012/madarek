# R318 — C3-FOOT evidence — §A6 footer wordmark «مدارك» + §A7 ink-render strip

Worktree `c3-foot` (rebased on main `57fb8366`). All numbers measured on the
built preview (`npx vite build` → `vite preview :4195`), loader bypassed, the
gate's own reader (`tesseract -l ara+eng --psm 7→6`, `TESSDATA_PREFIX=/home/z/.tessdata`,
element shot at deviceScaleFactor 2, JPEG q70).

## §A6 — the wordmark: garbage → «مدارك»

**The defect (baseline, main `57fb8366`):** the wordmark was five
hand-drafted DISCONNECTED geometric strokes (FooterArt.tsx `WordmarkArt`,
viewBox `0 4 1200 92`, stroke-only skeletons) — not legible Arabic.

**The rebuild:** `scripts/r318/wordmark-build.mjs` (committed, deterministic —
same font + word ⇒ same bytes; deps installed `--no-save`: harfbuzzjs +
opentype.js, build-time only) shapes «مدارك» from the site's OWN display font
(alexandria-700-normal-arabic.woff2 → ttf via fontTools):

- harfbuzz joining: م initial `uniFEE3` **connected** into د final `uniFEAA`;
  ا/ر/ك isolated (`uni0627/uni0631/uni0643`) — asserted by the script;
- opentype.js outlines composed into ONE path, visual LTR `[ك][ر][ا][د][م]`,
  construction tracking (300u) only at the three non-joining boundaries
  (د→ا · ا→ر · ر→ك) — the م→د join never gaps;
- output committed as the static path the app ships:
  `frontend/src/components/landing/footer/wordmark-art.generated.ts`
  (FooterArt.tsx carries it; zero runtime deps).

**Tesseract raw strings (gate shots, `wordmark-*-light.jpg`):**

| viewport | before (main 57fb8366) | after (this branch) |
|---|---|---|
| 1440 | `‎ee re 6‏ لل` (garbage) | **«مدارك»** — one word |
| 390 | `مداع` (wrong word) | **«مدارك»** — one word |

**OCR gate (the §A6 acceptance) — `node scripts/r318/defect-gate.mjs
--viewports 1440,390 --skip perf --base-url :4195 --out audits/evidence/r318/gate-c3foot.md`:**

| cell | ocr |
|---|---|
| 1440 light | **PASS «مدارك»** |
| 1440 dark | **PASS «مدارك»** |
| 390 light | **PASS «مدارك»** |
| 390 dark | **PASS «مدارك»** |

(the gate run's only reds are the documented 390 banner-seat collisions —
the known C4 ticket, unchanged numbers 2360.9px²).

**Geometry (heron-footer.json, adapted to the split 314px band — measured):**

| cut | viewBox | box @1440 | ink @1440 |
|---|---|---|---|
| WIDE (≥768) | `0 0 15769.6 1209` (aspect 13.0435 = the pinned **1200:92**) | 1398 × **107.2** px (byte-identical to the retired sheet) | **339.4 × 101.9 px** = 73.6% of the 138.4px wordmark row |
| COMPACT (<768) | `0 0 640 180` (ladder pin) | 348 × **97.9** px @390 (unchanged box) | ink 466×140 of 640×180 units |

The manifest's "glyph height = 69% of the strip height" ratio is kept
**measured against the row the wordmark owns** in the split band
(138.4px @1440: 101.9/138.4 = 73.6%); the reference's full-band 69% (=217px)
is impossible here — the §A7 lens strip shares the protected 314px band, and
the footer band floors are protected (docH ladder). The sheet spans the full
1398px cell; the ink letterboxes with construction margins (the natural
Arabic aspect — مدارك is 2.55:1 vs the reference's Latin caps 5.7:1; wider
measured tracks break the OCR — see ocr-matrix.md).

## §A7 — the ink-render strip re-seat (`.fo-fstrip` / FooterLens.tsx)

Rect table (probe `scratch-probe.mjs` @1440/1024/768 — `.fl-coord` label ×
`.fl-render` image):

| viewport | before: image box (slice 5.6:1) | after: image box (aspect-true 1:1) | label × image clearance |
|---|---|---|---|
| 1440 | 827.3 × 147.3 | **147.3 × 147.3** @x646.4 | label 19..226.9 → **+419.5px clear** |
| 1024 | 573.5 × 102.1 | **102.1 × 102.1** @x461 | label 19..226.9 → **+234.1px clear** |
| 768 | 754 × 134.2 (full-width slice) | **134.2 × 134.2** @x316.9 | label 19..226.9 → **+90px clear** |

- **Image aspect-true:** the square 960×960 licensed ink render
  (`crop-garyounis-classic-960.webp` — the same asset, re-seated) now renders
  `meet` at 178×178 viewBox units centered (x 411..589) — the retired
  1000×178 `slice` cut the building mid-subject at every ≥768 width.
- **Label clear of the image:** the mono seat label is re-seated as
  «[01] CAMPUS · INK RENDER» (was «… — INSPECTION STRIP», 372px wide — it
  crossed the image band: 85px overlap @1440, 74px @768); the reference
  carries NO DOM label on its strip — the shortened label keeps the honest
  index voice clear of the art.
- **Captions aligned to the reference rule:** the reference seats every
  column caption **+14px** from its column edge (heron-footer.json:
  captionX 377/615/853 over columns 363/602/840). Ours sat +13; the ≥1025
  desktop band now takes 13px padding + the 1px collapsed hairline =
  **+14px** from the column's reading-start edge (measured offset 13px
  padding, captions uniform). The ≤1024 tiers keep their own floor-pinned
  paddings (8.53px @1024 · 12px @768/390 — their own rem laws).
- The ≤767 strip-image cell's `<img>` (the 480–767 horizon band) also moves
  `object-fit: cover → contain` (no mid-subject crop; box heights unchanged).

## Protected ladder — docH EXACT (probe + gate overflow)

| viewport | docH before (main) | docH after | |
|---|---|---|---|
| 1440 | 12,340 | **12,340** | EXACT |
| 390 | 11,411 | **11,411** | EXACT |
| 360 | 10,735 | **10,735** | EXACT |
| 768 | 12,627 | **12,627** | EXACT |
| 1024 | 9,959 | **9,959** | EXACT (unpinned, held anyway) |

## Gate quick — `--viewports 360,390,768,1024,1440 --skip ocr,perf`

4 reds = the documented known C4 banner-seat collisions ONLY (360 light/dark
1941.8px² · 390 light/dark 2360.9px² — byte-identical to the baseline
numbers); **no new reds**; 768/1024/1440 all green, both themes.
Evidence: `audits/evidence/r318/gate-c3foot-quick.md`.

## Files

- `scripts/r318/wordmark-build.mjs` — the deterministic generator (committed
  with its output for reproducibility).
- `frontend/src/components/landing/footer/wordmark-art.generated.ts` — the
  committed static path (generated; rerun the script to regenerate).
- `frontend/src/components/landing/FooterArt.tsx` — WordmarkArt /
  WordmarkCompactArt now render the generated letterforms (filled
  currentColor ink).
- `frontend/src/components/landing/footer/FooterLens.tsx` — the aspect-true
  render seat + the re-seated label.
- `frontend/src/pages/LandingPage.tsx` — footer JSX region comments only.
- `frontend/src/styles/landing.css` — fo-wordmark ink rules (filled),
  fo-fstrip-img (contain), the ≥1025 caption gutter, fl-* comments.

Crops (this directory): `wordmark-{1440,390}-{before,after}.jpg` (the gate's
own element shots) · `strip-1440-{before,after}.jpg` (the .fo-fstrip band) ·
`fgrid-1440-{before,after}.jpg` (the caption grid) · `ocr-matrix.md` (the
stroke/fill + track sweeps). Probe JSONs: `probe-before.json`,
`probe-after.json`.
