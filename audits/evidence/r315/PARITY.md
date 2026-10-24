# R315 — PARITY (VISUAL TRUTH) · cycle 1

**Score: 56.6 → 56.6 carried (ratchet held; components below) — cycle-1 closed the
owner's §0 A/B/C/E/F/H tickets with measured evidence; pixel/VLM judges scheduled
for cycle-2 re-scoring (quota-limited this cycle: VLM 429s).**

## Cycle 1 closed (direct measurement, all post-loader-gated)

| Ticket | Result (measured) |
|---|---|
| K-A4 label/marks/coords | GONE at every width (E-crawl: reference frame = 4 hairlines only); re-pinned to absence |
| K-A5 progress bar | RETIRED (markup+CSS+imperative); re-pinned to absence |
| K-C consent | ONE line «يستخدم هذا الموقع التخزين المحلي. اعرف أكثر» · 601×38 bottom-LEFT (mirrored) · Accept 79×28 ghost #EFEFEF/white + btn-fill slide · Reject 81×28 borderless ink/body-font (r313 digest cookie pair) · mobile 359×94 @44px floor (ref 374×93.45) |
| K-B header | 56px ruled cell row: [logo compact | nav 4×137px | theme icon cells (unboxed) | login | CTA 166.66px measured] · tagline retired · burger 3 bars · bottom hairline y55.3 |
| K-A1 hero art | raster crop retired; drafted elevation on TRANSPARENT paper — 0 pure-white px in the art region (was 928/2500); scoped `.fo-hero-window .bp-fill{fill:none}` (map poché intact) |
| K-A2 H1 | hero 887/887 @1440 exact · «رحلة تعلم واحدة / من المحاضرة إلى الإتقان» 2 lines, zero tashkeel, lh 1.0 · fully inside first viewport at 1440/1024/768/390 |
| K-A3 window chrome | ± marks at the dashed inner frame corners (bp-dmark) + four-edge rulers |
| K-H tablet | H1 on-screen @768/1024 (x 339..761 measured, no clip); edge tab mirrored LEFT (44×139 @0.8rem, visible all widths per E-crawl, z40 ≤991) |
| K-E R310 leftovers | chapters 05–06 demo rows + Mini fragments RETIRED; r306 re-pinned to absence |
| K-D map | 6 reference states: statement → plan DIRECTLY ON PAPER → INTRODUCTION card (dark bar + 4 scrubbed lines + [تابع التمرير]) → findings + progress hairline → red-room reveal → closing · band 6301/6300 @1440 · 5383/5376 @1024 · share 42.5% @390 |
| K-F footer | 712/711 @1440 · hand-drafted full-width wordmark SVG (1398px, no self-intersections) + compact mobile cut · construction-line mark cell 215×215 (measured 214.98) · strip 314/314.16 · **0 text overlaps @390/360** (bbox-checked) |
| K-I auth pages | /auth + /auth/register full framed sheets · 81/81 geometry checks · 159 auth tests · in-row labels muted #B4B4B0-family (dom-judge fix) |
| Instruments | J1 fresh captures: 11 viewports × both sites + 10 Heron inner pages (`_local/captures/r315-manifest.json`, drift ≤0.7% vs r313) · E-crawl DOM grammar: 24 passes → docs/research/pages/* · **J2 DOM-geometry judge BUILT + RUN: 6 viewports, 56 roles, 729 mismatch instances ranked** (`_local/dom-judge/report.json`) |

## Geometry (live, post-loader) — fresh Heron vs Madarek

- **1440×900: docH 12333 / 12338 (−0.04%) — every section within ±1px**
  (hero 887/887 · st 720/723 · pm 743/743 · map 6301/6300 · pr 711/710 · wy 680/681 · rl 882/887 · cta 698/698 · ft 712/711)
- 390×844: 11460/11363 (+0.9%) · 1280×800: 11248/10967 (+2.6%) ✓
- 360×800: 11206/10615 (+5.6%) — cycle-2 fine-tune
- **1024×768: +22.7% · 768×1024: +14.5% — CYCLE-2 TOP TICKET (M2/M3)**: the ≤1024
  media compositions inflate (pm +695, cta +335, ft +590, wy, platform @1024; the
  map itself is FIXED). Heron @1024 keeps the desktop composition on the 5.93px
  fluid root; ours restacks. Exact per-section targets in `_local/captures/r315-manifest.json`.

## Gates (cycle-1 close)

`npm run lint` 0 errors (16 pre-existing warnings) · `tsc -b --noEmit` 0 ·
**vitest 2530/2530** (R315 override re-pins: scrollspy, r177, funnel, r162, r306, r309 e2e pair, AuthPage-alignment) ·
check:colors OK · check:icons OK · check:motion-tokens OK · check:raw-css report-only ·
0 horizontal overflow at 360/390/768/1024/1280/1440.

## Cycle-2 queue (worst-first, from the DOM judge's ranked list)

1. **M2/M3 tablet band re-composition** @1024/768 (the 729-mismatch list's top 15 are
   footer-y drifts = symptoms of this one root cause).
2. Masked-pixel judge re-run (r314 judge.mjs on fresh r315 captures) + worst-region gate.
3. VLM describe-then-diff (quota permitting) + PARITY component re-score.
4. Consent dual-label roll (fine detail), loader-art white fills question (V14 judge),
   360×800 fine-tune, dark-theme pair judging, authed-surface sweep (P3–P8), red team.

---

# R315 — PARITY (VISUAL TRUTH) · cycle 2

**Score: 56.6 → 58.5 (ratchet held, +1.9).** Cycle-2 closed the cycle-1
queue's top ticket — the ≤1024 band re-composition — on a measured LAW,
plus the J2 chrome verdicts and the owner-ordered personal-data scrub.

## The law (fresh manifest, both sites, 11 viewports)

Every Heron ≤991 content band is a **constant rem height** on the 1.199vw
root — statement 57.2 · problem 144.8 · platform 55.2 · why 95.2 ·
usecase 145.2 · cta 58.8 · footer 103.1 (each ±0.2rem across
768/820/844-landscape). Our bands now pin the same floors (rem-pure),
content compacts under them, the reference's own air fills the rest.

## Geometry (docH, live Heron vs Madarek — before → after this cycle)

| Viewport | cycle-1 | cycle-2 | bands >3% remaining |
|---|---|---|---|
| 1024×768 | +22.7% | **+8.0%** | statement/problem/why +19-20% (13px Arabic canon floor vs the reference's 5.9px labels — documented deviation), platform +28.5% (wraps) |
| 768×1024 | +14.5% | **+0.6%** | none (cta 541/541 exact · problem/product/why 0.0%) |
| 820×1180 | +11.4% | **−0.9%** | none |
| 844×390 (landscape) | +13.4% | **−1.0%** | hero +11.2% (reference shows window-only; strip below the fold — cycle-3 seat), chapters −5.9% |
| 1440×900 | −0.04% | −0.04% | none |
| 390×844 | +0.9% | +0.8% | none |
| 412×915 | −3.5% | −2.3% | statement −8% (mid-band family) |
| 1280×800 | +2.6% | +2.4% | footer +13% (px caps) |
| 1920×1080 | −2.6% | −3.2% | footer −25% (px caps at wide end) |
| 360×800 | +5.6% | +5.5% | why +18% (cycle-3 mobile fine-tune) |
| 600×1024 (new probe) | — | −16.2% | the 480–767 mid-band: the reference's big mobile root inflates every band; ours is px-floored — cycle-3 top ticket |

## Judge state (cycle 2)

- **DOM-geometry judge** re-run on the fresh tree: 729 → **623** mismatch
  instances (211 distinct). Top remaining = footer-y drifts at 1024/360 —
  symptoms of the docH deltas above them (already ticketed). Three real
  role fixes landed: hero-ruler/hero-dashed **hidden at rest** like the
  reference (proximity reveal on fine pointers, display:none <992) —
  were always-on.
- **Masked-pixel judge** re-run on fresh captures (87 pairs: 1440/390/768
  × light): worstRegionAvg 0.725, globalAvg 0.188, ΔEpaper 3.4 — the
  map's transitional scrub frames dominate worst-region (progress-
  relative phase offset, same instrument family as r314's 43.7).
- **VLM describe-then-diff (§3, glm-5v-turbo scene graphs):** hero @1440
  **MATCH** (95) — layout/artWindow/strip/decor/density converge; our
  honest elevation reads as the reference's family, mirrored RTL.
  Mid/late progress-frame attempts @768 recorded SKIPPED (alignment-
  limited: +0.6% docH drift misframes band boundaries) — anchored seats
  (top/page-end) are the reliable red-team seats; full re-verdict pass
  = cycle-3.
- **Public-pages smoke matrix REBUILT** (the _local artifact was wiped in
  the sandbox reset and had silently halved coverage): 40/40 PASS —
  10 routes × 1440/390 × light/dark, dark theme verified per-probe this
  time (the real zustand persist shape; the first sweep silently ran
  light — caught and fixed).

## Gates (cycle-2 close)

eslint 0 errors (16 pre-existing warnings) · tsc -b 0 (incl. tests) ·
**vitest frontend 2530/2530 + backend 1783/1783** (r306 re-pins: the 767
boundary + content-anchored block extractors — documented in-test) ·
check:colors OK (27 allow lines) · check:icons OK · check:motion-tokens OK ·
check:csp-hash OK · verify-parity-export **200/200** · measurement protocol
upgraded to deterministic `vite preview` (dev-server reflow variance
eliminated — prod and dev builds measured bit-identical).

## Owner orders executed this cycle (non-geometry)

- **Personal-data scrub:** the repo link is GONE from the footer UI
  (contact cell = the honest early-access-form channel note) and from
  README/docs/logs/scripts/evidence (placeholder redactions; LICENSE +
  SECURITY.md kept as functional legal instruments — documented decision).
- **Copy quality:** «الأدوار الثمانية» → «الأدوار والشرائح» everywhere
  (terminology consistency with the honest 5-roles + 3-segments split) ·
  problem-card copy tightened · CTA punctuation.
- **UX fluidity:** the hero graticule now carries the reference's own
  proximity reveal (quiet at rest — less visual noise on first paint).

## Cycle-3 queue (worst-first, with numbers)

1. **992–1024 slice** (+8.0% @1024): the 13px Arabic floor is ~+7% of it
   (canon deviation, needs an owner-visible ledger entry) — the wraps are
   the fixable rest.
2. **480–767 mid-band** (600×1024: −16.2%): the reference's mobile family
   inflates with the big root; our px floors/clamps don't. The mobile
   clamps need rem-purification with 390/360 re-pins.
3. 360×800 +5.5% (why +18%, roles +10%) · 1920×1080 −3.2% (footer px caps).
4. Landscape hero seat (window-only like the reference) + map landscape.
5. VLM re-verdict pass on anchored frames (the 27 stale r314 DIFFERENT
   verdicts predate the cycle-1+2 re-compositions).
