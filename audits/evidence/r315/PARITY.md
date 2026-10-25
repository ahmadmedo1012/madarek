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

---

# R315 — PARITY (VISUAL TRUTH) · cycle 3 — the fleet round (CLOSED)

**Score: 58.5 → 60.5 (ratchet held, +2.0).** Seven-agent parallel fleet on
disjoint domains (worktrees r315/w1–w7), merged in tier order, full gates green.

## The ladder (docH, live reference vs Madarek — after this cycle)

| Viewport | cycle-2 | cycle-3 | bands >3% |
|---|---|---|---|
| 360×800 | +5.5% | **+0.85%** | none — every band ≤3% (why 876→744 exact) |
| 390×844 | +0.8% | **+0.42%** | none |
| 412×915 | −2.3% (st −7.9%) | **−0.29%** | none (statement 911/911 exact, hero 898 exact) |
| 600×1024 | −16.2% | **+0.27%** | none (all content bands exact or ≤1.7%) |
| 768×1024 | +0.6% | **+0.62%** | none |
| 844×390 landscape | −1.0% (hero +11.2%, map −5.9%) | **+0.05%** | none (hero 374/374 EXACT, map 2320/2317) |
| 1024×768 | +8.0% | **+0.33%** | none (statement 514/514, problem 528/528, platform 505/505 exact) |
| 1280×800 | +2.4% (ft +12.7%) | **+0.54%** | none (footer 633/632) |
| 1440×900 | −0.04% | **+0.02%** | none |
| 1920×1080 | −3.2% (ft −24.9%) | **−0.25%** | none (footer 949/948, statement 963/963, cta 931/931 exact) |

**Every one of the 11 viewports now carries every band within ±3%; the
worst docH drift on the whole ladder is +0.85%.**

## Tickets closed (fleet)

- **W1 phone ≤479**: the rem law seated one tier down (statement 84.25 ·
  problem 87.65 · platform 52.1 · why 81.2 · roles 95.55 · cta 50.4 ·
  footer 124.9rem on the 2.5446vw root); 360/390/412 all bands ≤3%.
- **W2 mid-band 480–767**: the law VERIFIED with two fresh live loads
  (480/600/720, max spread 0.08rem); the --sp ladder re-seated rem-pure;
  600 docH −16.2%→+0.27%; 480/540/720/768 all pass; 390 byte-identical.
- **W3 desktop ≥992**: the base sheet measure released (max-inline-size
  1160px froze the composition @1920 while the root grew +33%);
  desktop law seated (statement 86.7 · problem 89.15 · platform 85.2 ·
  why 81.65 · cta 83.75 · footer 85.3rem; hero/roles 100svh−1.6rem;
  map = exactly 7×viewport-height); 1024 +8.0%→+0.33% — cycle-2's top
  queue ticket CLOSED with the wraps killed, not ledgered.
- **W4 landscape 844×390**: hero 374/374 EXACT (window-only seat at
  100svh−16, the strip re-seats below the fold — content preserved);
  map 48svh→57svh rung = 2320/2317.
- **W5 copy**: 33 strings refined (terminology table: مصفوفة الإتقان ·
  الأدوار والشرائح · بيئة العرض · تصحيح تلقائي للموضوعي · ملاحظات
  معلَّمة); honest-copy invariant enforced («تصحح الواجبات» not
  «المقالات», «بالبريد الإلكتروني ورقم قيدك» — the register flow's real
  fields); display tashkeel stripped; personal-data scan clean.
- **W6 inner pages**: the K-I sheet grammar goes site-wide
  (GuestSheetChrome frame+marks+grain+mono labels on /colleges ×3 via
  body portal (transformed-ancestor trap measured), /campus,
  /capabilities, the 404 film; fail-grace branches keep the frame);
  campus probes fixed (≤420 back-link clipping, phone video facade
  recomposition, dark .vc-kind contrast 4.35→4.79:1); deep probe 40/40
  (768+390 × light+dark).
- **W7 VLM re-verdict**: all 27 stale DIFFERENT verdicts re-judged on
  fresh masked captures (29 DIFFERENT · 2 SKIPPED alignment-limited ·
  1 MATCH); quota-deferred s08-50/100 honestly closed into the fraction.
  Disclosure: the interrupted first attempt re-captured the masked
  reference once (2nd Heron live load) — drift re-proved 0
  (meanAbsDiff s00-0 = 0, docH 12338 = cycle-1); a hard heron-guard now
  blocks reference loads in the harness copy.
- **Foreman**: drafted-art footer SVGs extracted to
  components/landing/FooterArt.tsx — check-icons (the one gate failing
  at the clean cycle-2 base) now green; DOM byte-identical (footer
  712/711 @1440, 1239/1239 exact @390 re-measured).

## Score components (cycle-3 close)

- vlm 43.1 (30%) — re-verdicted honest pass; the worst surviving frame
  s03-25 (score 8) = the map mid-state's text-layout vs floor-plan.
- pixel 43.1 (20%) — 87 FRESH pairs (3 viewports × 29 frames vs the live
  reference captures); worstRegionAvg 72% = the artwork-style deltas
  (map/platform canvas) — geometry no longer a driver.
- census 55 (15%) — fresh re-census: pageHeight 7/7 within ±0.9%
  (gate ±5%), rootFontSize 7/7 exact strings, section heights ±3% at 11
  viewports, paper dE 3.4; typography/header/buttons carried r313.
- motion 78 (15%) · behaviour 90 (10%) · coverage 100 (10%) — carried.

## Gates (cycle-3 close)

eslint 0 errors (16 pre-existing warnings) · tsc 0 · **vitest 2530/2530 +
1783/1783** · check:colors OK · check:icons OK (was red at base) ·
check:motion-tokens OK · check:csp-hash OK · verify-parity-export 200/200 ·
pages-smoke 40/40 (light+dark × 768/390) · 0 horizontal overflow at every
ladder viewport.

## Cycle-4 queue (worst-first, from the re-verdicted judge's own words)

1. **s03-25 score 8 (worst pair)**: greeked text layout vs floor-plan
   diagram — the map mid-state composition.
2. **s04 (platform)**: reference multi-panel CAD/floor-plan interface w/
   red-highlighted room vs our dashboard/card-grid — re-compose as the
   tool canvas (improved 45→30 after geometry, still critical).
3. **s06 (map late)**: single large floor plan w/ violation overlay vs
   our 2×4 grid of 8 content cards + orange CTA.
4. **s07 (map end)**: technical-drawing multi-plan interface vs
   dashboard/data-table/form (7 criticals — the densest).
5. **s00 (hero art)**: tonal density — dense stippled/hatched elevation
   vs our sparse thin line-art (XDoG+cross-hatch+stipple pipeline).
6. **s01**: the reference's large architectural illustration (orange
   sun + pixel-art rows) absent from our statement band.
7. **s02-0/50**: "empty off-white top" — alignment-adjacent (same
   family as the 2 deferred 768 SKIPPEDs) — fix the alignment harness
   for progress-anchored frames first.
8. Carried flags: EdgeTab «٢٠٢٦» hardcode (2027 rollover) · «أحرُم» ×2
   in CapabilityPages · NotFoundPage 404 button tashkeel (test-pinned) ·
   W6 token proposal (raise dark --accent-ink) · typography/header/
   buttons census re-census · the true authed-surface sweep (needs the
   full local stack).

---

# R315 — PARITY (VISUAL TRUTH) · cycle 4 — the artwork/composition round (CLOSED)

**Score: 60.5 → 60.5 (ratchet held).** Five-agent fleet; the artwork
re-compositions landed with ZERO geometry drift (the ladder re-verified
after merge: 11/11 viewports, every band ≤3%, worst docH +0.85%).

## Closed (fleet + foreman completions after agent context-deaths)
- **c4/a map journey**: the mid/late states re-composed as ink drawings
  (thick strokes, cross-hatch poché, solid accent room, one-large-plan
  with violation overlays, multi-view technical sheet); the cycle's
  worst frame s03-25 dropped worstRegion 100%→20% in the fresh pixel
  judge; vision verdict: floor-plan dominant, density 7/10.
- **c4/b platform**: the tool-canvas re-composition (hairline panels +
  plan-view canvases + one large solid accent region); vision verdict:
  multi-panel drawing tool, density 8/10.
- **c4/c hero + statement**: ink ladder lifted (bp-ink 1.5→4, bp-ink-2
  2→5.5 + stipple/xhatch) — vision density thin(1-3)→moderate(4-6), the
  full reference tonal mass stays a guided tuning target; the statement
  band's drafted illustration (campus massing + orange sun + row-band)
  landed, vision-verified.
- **c4/d carried flags**: EdgeTab year computed (Arabic-Indic), أحرام,
  404 tashkeel, dark --accent-ink raised #FF6B33 (4.79:1, token-carried,
  override retired), --frames-mode section harness.
- **c4/e CI debt**: the two jobs red on EVERY push since r314 now green —
  e2e 102/102 (chromium-1223 + stale pins re-pinned: r308 loader belt to
  the V14 beats, guest-landing r188 to the R315 H1, r183-B6 title
  contracts) · r305 belt 73→0 failed (12 tashkeel pins swept + the
  motion-ladder same-value pin) · check-raw-css --strict PASS.

## Score note (honest)
The pixel component (~43) is now floored by the artwork-SUBJECT
difference (our own original drawings vs the reference's different
drawings — the standing no-copy rule); the style/composition convergence
lives in the VLM domain, where the changed frames' re-verdict is queued
as cycle-5's first item. vlm 43.1 · pixel 43.1 · census 55 · motion 78 ·
behaviour 90 · coverage 100.

## Gates (cycle-4 close)
eslint 0 · tsc 0 · vitest 2533/2533 + 1783/1783 · **e2e 102/102 · r305
belt 0 failed** · check-raw-css --strict PASS · icons/motion/colors/csp
OK · parity-export 200/200 · full ladder zero drift.

## Cycle-5 queue
1. VLM re-verdict of the 20 changed frames (masked, fresh captures).
2. Hero tonal density to the reference's full mass (pixel-judge-guided).
3. The remaining s02-0/50 "empty top" alignment family + the 768
   deferred pair (section-relative mode now in the harness — run it).
4. typography/header/buttons census re-census · the true authed-surface
   sweep (full local stack).
