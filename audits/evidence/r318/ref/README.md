# R318 ref evidence — C3-H (numbers-only extraction from المرجع)

Captured 2026-10-25 with Playwright chromium (headless, UA real-ish, `--disable-blink-features=AutomationControlled`),
progress-anchored to the map band. Method: load → wait loader exit (~10s) + fonts + 1.5s → cookie root hidden →
lazy-preload sweep → `gsap.globalTimeline.pause()` (+ lenis left stopped after its idle class appears; wrapper
`.main-inner` is the scroller, window.scrollY stays 0) → set `wrapper.scrollTop = start + range*p` → 2×rAF settle →
viewport JPEG (q75-82) + computed-style DOM/SVG inventory per state. Scroll read-back verified on re-runs (probe4).

## Files
- `map-1440-p###.jpg` + `inv-map-1440-p###.json` — 27 band states (0–100%, plus fine steps). p### = band progress ‰.
- `map-390-p###.jpg` + `inv-map-390-p###.json` — 9 mobile states (390×844).
- `map-768-p###.jpg` + `inv-map-768-p*.json` — 5 tablet states + 2 post-release (768×1024, retry run: probe5, read-back verified). `inv-map-768-scrub-truth.json` (probe6) holds the raster inner-opacity timeline + intro-hidden proof + sheet metrics; `meta-768.json`, `meta-768-states.json`, `triggers-768.json` (48 STs).
- `map-1440-post{1,2,3}.jpg` + `inv-map-1440-post*.json` — after sticky release (sheet final-state verification).
- `platform-1440-{top,s01,mid,s02}.jpg` + `inv-platform-1440-*.json` — s01/s02 are the clean [01]/[02] states (y7765/9362, read-back verified). `mid` (y8563) came from the earlier probe2 run without scroll read-back — treat as illustrative only.
- `footer-1440-bottom.jpg`, `footer-390-bottom.jpg` + `inv-footer-*.json` — footer at scrollMax.
- `intro-band-1440-top.jpg`, `problem-band-1440-top.jpg` + inventories — statement band + problems band.
- `triggers-1440.json`, `triggers-390.json` — ScrollTrigger census (36/20 triggers, windows + pin=null).
- `map-computed-1440.json` — computed-style sweep of card/sheet/svg classes (STATIC css truth; the run's dynamic opacities in it are from a lenis-drifted moment — use probe1 state tables for dynamics).
- `map-svg-detail-1440.json` — shape-by-shape svg plan layers (line layer + violations overlay).
- `map-img-layers-1440.json`, `markers-1440.json`, `images-1440.json` (all img src paths + natural sizes), `footer-img-1440.json`.
- `footer-wordmark-1440.json` — empty ON PURPOSE: the giant wordmark is not DOM text (no element >40px, no svg text) — it lives inside the strip PNG (see manifest numbers).
- Sheets: `map-states-1440.jpg` (3×3), `map-states-390.jpg`, `map-states-768.jpg`, `platform-1440.jpg`, `footer-1440.jpg`, `statement-1440.jpg` (statement band + sun-disc detail) — all ≤150KB, q70.
- Probes: `probe-r318.mjs` (sweep), `probe2-r318.mjs`, `probe4-r318.mjs` (verified-scroll fixes), `probe5-r318.mjs` (tablet states), `probe6-r318.mjs` (tablet scrub truth), `build-sheets.mjs`, `build-sheets2.mjs`, `build-manifests.py`.
- Manifests for the C3 fixers live in `docs/redesign/r318/heron-{map,platform,footer}.json`.

## Negative findings (BLOCKED-with-reason style, all honest)
- No ScrollTrigger pin exists — pinning is CSS sticky; band derived from section geometry (matches r313 numbers exactly).
- No `[nn/05]` index markers anywhere (desktop or mobile); cues are `[Scroll to continue]` ×4 + `[Click on violation]`.
- No svg text labels on the plan (numerals are paths); no schedule table in the map band.
- Violation hover cards are hover-only: opacity 0 in all 27 scrub states.
- The right sheet slide-in is transition-smoothed at band end (mid-flight widths vary run-to-run); final 464px is deterministic.
- The "giant footer wordmark" is raster art (PNG 3428×754), stroke-only — numbers in heron-footer.json.
- Live page grew vs r313 (scrollMax 13257 vs 11468): growth is after home-map; map band unchanged.

## Tablet (768×1024, retry run) — key deltas
- FULL-PLAN approach: sticky inner 753.3×1009.3 at (7.4,7.4) = 98.09% viewport width; plan raster 753.3×972.5 fitted to content width (like mobile, NOT a centred desktop plan).
- The INTRO CARD IS HIDDEN at tablet: stylesheet `opacity: 0` on `.home-map-intro` (no inline style — gsap never tweens it at this width); its rise/clip geometry still animates but pixel-check shows 0 ink px in the card zone. The `[Scroll to continue]` cues live inside the hidden card → invisible. Tablet shows the plan ALONE.
- Closing sheet: stacked BELOW the sticky in normal flow (static grid 753.3×353.3, type collapses to 14.73px) — neither the desktop 464px right sheet nor the 390 599px block.
- Band-start statement state (blank plan + slogan pair) is common to 1440 AND 768 (all raster inner opacities 0 at p0, both viewports); OCR at 768 read the slogan line at y494–528.
- Red squares 27.4px (0.85× desktop 32.1); hovercards 216.4px hover-only; no [nn/05] markers; no dead band after sticky release (sheet top meets sticky bottom).

Site referred to as المرجع (Heron). No tokens/credentials/personal data in this evidence.
