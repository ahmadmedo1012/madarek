# Madarek audit: Heron fidelity and project readiness

**Audit date:** 2026-11-18
**Product baseline:** `main` at `347e2508`
**Evidence provenance:** browser runs and evidence scripts were produced on `exec/r368-heron-fidelity`; the executor branch contains three commits changing `scripts/conformance/*`, outside the original audit-only allowance. This review's deliverables are on `plan/r368-heron-fidelity` and change only the three requested documents plus `docs/audit/evidence/`.

## Tool ledger

| Tool / skill | Status | Used for |
|---|---|---|
| Firecrawl MCP | Installed and used | Live Heron homepage and public script discovery. |
| agent-browser | Installed and used | Five-width live runtime inspection and asset/trigger inventory. |
| Playwright | Installed and used | Paired capture validation and responsive stress probe; cached browser build required a temporary `/tmp` symlink. |
| systematic-debugging / root-cause-tracing | Installed and used | Separate capture defects, product symptoms and environment causes. |
| specify / writing-plans | Installed and used | Produce the scope-complete specification and ordered execution plan. |
| impeccable / ponytail / caveman | Installed and used | UI audit leads, minimal-change recommendations, concise conversation. |
| `pixelmatch` + SSIM | Available and used | Re-score the saved visual pairs; score remains provisional because coordinates are misaligned. |
| agent-reach | Available; not used | No ecosystem research was needed for this repository/reference audit. |
| `knip`, `jscpd`, dependency-cruiser | Not available locally | Dead-code, duplication and dependency graph scans were not claimed. |
| Lighthouse, axe, mobile device/emulator | Not run | Current performance, accessibility automation and device results remain unverified. |

## 1. Executive summary

Madarek has a large, Arabic-first product surface and a measured landing-page motion system, but the available evidence does not support a claim of near-complete Heron fidelity. The fresh scorecard reports **E=56.7** (SSIM composition, fails its 90 target), **nominal T=100%** (20/20 screenshot pairs present), and **Q=85** (17/20 local settle samples pass; reference trigger/curve parity is unverified). More importantly, the stored crops do not meet the stated coordinate-alignment requirement: only **3 of 20** local/reference section roots are within ±2 px. The 56.7 score is therefore a useful warning and a reproducible diagnostic, not a valid per-section acceptance result.

The visual review shows clear section differences: intro and footer composition, hero artwork density, CTA/map imagery, and the use-case layout. The section contact sheets are under [`evidence/comparison-sheets/overview.png`](evidence/comparison-sheets/overview.png); individual paired sheets include Madarek on the left, a pixel-difference view in the middle, and Heron on the right. Manual 1–5 ratings and specific observations are in [`evidence/visual-review.csv`](evidence/visual-review.csv).

The user's hypothesis is supported in a narrower form: the old DOM conformance percentage did not measure image composition or motion parity, and the initial stored gate disclosure showed its base thresholds despite R347 section re-keys. A new run now records the effective policy and focused tests pass. The broader claim that previous rounds never measured live scroll behavior is **not** true: R366 has historical scroll traces and the R308/R331 reference census. The gap is that those records were not combined into a valid, current, paired visual/trigger/curve acceptance run.

The present product also has actionable responsive and quality issues. A current stress run reports 0/7 sizes clean: candidate hero-label overlaps at 320 and 1440, a CTA label clipped by 2 px at 640×360, and reachability hits against `div.pl`/other overlays. Some reachability rows are state-sensitive and did not reproduce after waiting for the page to settle; treat those rows as instrumentation/product questions, not confirmed permanent blockers. Horizontal overflow was 0 at all seven tested sizes.

## 2. Tools and evidence used

| Tool / skill | Availability | Use and result |
|---|---|---|
| Firecrawl MCP | Installed | Live scrape of Heron homepage, `config.js` and `main.js`; homepage returned HTTP 200, Webflow metadata, and public bundle URL. A bundle scrape is not treated as verified runtime behavior. |
| `agent-browser` | Installed; system Chrome 157.0.8103.78 | Live runtime inspection at 390, 768, 1024, 1440 and 1920 widths; paired captures came from the evidence run recorded with Chromium 156.0.8078.4. |
| Playwright | Installed, 1.60.0 in the evidence run | Captures, stress probe and score-only revalidation. Current local Playwright expected a missing build; a temporary `/tmp` symlink to cached Chromium 156 allowed score-only validation and stress run. |
| `systematic-debugging`, `root-cause-tracing` | Installed | Used to separate visual symptoms, capture/gate failures and environment issues from source-level causes. |
| `specify`, `writing-plans` | Installed | Used for the accompanying spec and ordered execution plan. |
| Impeccable | Installed | `impeccable detect frontend/src` returned 22 flags; flags are investigation leads, not confirmed defects. |
| Ponytail | Installed | Applied to keep future work scoped to measured deltas and existing ownership. |
| Caveman | Installed | Applied only to ordinary conversation, not these documents. |
| `pixelmatch` + in-process SSIM | Available in frontend dependencies / evidence script | Re-ran `fidelity.mjs --score-only --validate`; it reproduced E=56.7, nominal T=100%, Q=85 and 20/20 saved pairs. |
| `knip`, `jscpd`, dependency-cruiser | Not available locally | No dead-code, duplication or dependency-graph scan result is claimed. |
| Lighthouse / axe / mobile E2E | Not run in this audit | No current Lighthouse, axe, Expo test, or device result is claimed. |
| Firecrawl agent-reach research | Available but not needed | The task was grounded in a named live site and repository records; no external discussion roundup was needed. |

### Evidence files

- Current scorecard and manifest: [`evidence/scorecard.json`](evidence/scorecard.json), [`evidence/manifest.json`](evidence/manifest.json).
- Capture rows and measured motion samples: [`evidence/capture.json`](evidence/capture.json).
- Current seven-size stress run: [`evidence/stress.json`](evidence/stress.json).
- Live Heron runtime inventory at five widths: [`evidence/heron-motion-inventory-live.json`](evidence/heron-motion-inventory-live.json).
- Live Heron DOM/media inventory and CSV: [`evidence/heron-assets-live.json`](evidence/heron-assets-live.json), [`evidence/heron-asset-inventory.csv`](evidence/heron-asset-inventory.csv).
- Before/after Madarek asset examples from Git history: [`evidence/asset-diet-summary.json`](evidence/asset-diet-summary.json), [`evidence/asset-diet/`](evidence/asset-diet/).
- Two 10×5 conformance run artifacts are in `scripts/conformance/results/`; the latest `results.json` now includes effective per-section gate policy.

## 3. Project surface and health

| Area | Current evidence | Readout |
|---|---:|---|
| Frontend | React 18.3.1, Vite 5.4.21; 430 `frontend/src` files; 79 current page files | Extensive web product. The R362 inventory has 141 route registrations / 125 renderable product routes, but its 76-page count is historical and is now stale. |
| Mobile | Expo 58, React Native 0.88.1; 125 files under `apps/mobile/app` | Material route surface with separate navigation, styling and build. No live device comparison was run. |
| Backend/data | Express 4.22.3, Prisma 5.22.0; 101 schema models, 48 migrations | No production database connection or data query was used. |
| API | 37 route files and 302 HTTP method registrations in the current source count | A registration count, not 302 unique product endpoints. Contract details live in `docs/API-REFERENCE.md` and `backend/src/http/routes/`. |
| Landing CSS | 27 files in `frontend/src/styles/landing/`; 668,169 source bytes in the audited set | Large cascade surface; consolidate only after before/after computed-style proof. |
| Image assets | Local verifier: 56 raster files / 2,471 KB | Graphics gate passes its current budget, pairing, naming and dimension checks. Its budget pass does not establish fidelity. |
| JavaScript bundle | Current `node scripts/check-bundle-size.mjs`: 762.5 KB gzip total; entry 66.2 KB; PDF 95.7 KB | Passes the current checker ceiling of 774 KB. The provided project guide also states 770 KB hard; keep the stricter 770 KB requirement until the owning lead reconciles the tool/document mismatch. |

### Database, API, authentication and roles

- `backend/prisma/schema.prisma` is the model authority; this audit counted 101 models and did not connect to Neon or inspect production rows.
- `App.tsx` has the historical R362 inventory of 141 route declarations (12 redirect-only, 4 dev/catch-all carve-outs, 125 renderable product routes, plus guest `/`). Current physical page files have grown to 79. Re-run the route inventory before assigning page batches.
- User roles from the schema are `STUDENT`, `TEACHER`, `ADMIN`, `QUALITY`, `OWNER`. Staff seats are `REGISTRAR_GENERAL`, `COLLEGE_REGISTRAR`, `EXAMS_CONTROLLER`, `QUALITY_OFFICER`. The route inventory documents guest and role surfaces. This visual program must not change their capability rules.
- Static source review found explicit JWT verification algorithm allow-listing in `backend/src/lib/jwt.ts`, password policy/auth lockout and rate-limit modules, and a generic forgot-password response. This is a focused code read, not a penetration test or proof of deployed configuration.
- `backend/src/env.ts` is the environment authority. No `.env`, secret file, production deployment setting, or database was read or modified.

### Build, tests, typecheck and lint

| Check | Current observed result | Notes |
|---|---|---|
| `node --test scripts/conformance/gates.test.mjs` | **10/10 pass** | Focused fixtures cover base floor, re-keyed floor, heuristic cap, reviewed escape and impossible PASS-on-failure. |
| Two stored `run.mjs --gate` executions | **94.4% pass, gate PASS, no gate failures** | Executor artifacts record 10 sections × 5 breakpoints, Node 22.22.1, Chromium 156 and Playwright 1.60. Effective policy is now emitted. This is the DOM/style gate, not visual E. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/r368-pw-browsers node scripts/conformance/fidelity.mjs --score-only --validate --out docs/audit/evidence` | **20/20 files; E=56.7; nominal T=100%; Q=85; E gate FAIL** | Reproduced from stored screenshots. The root alignment and crop issues below invalidate T as a verified match rate and make E provisional. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/r368-pw-browsers node scripts/conformance/stress.mjs --url http://localhost:5301/ --out docs/audit/evidence/stress.json` | **0/7 fully clean** | 0 horizontal overflow; one clipped text instance and three candidate text-overlap pairs at 320/1440, plus reachability rows that need settled-state recheck. Exact output is stored. |
| `TZ=UTC npm test` | **3,154 passed / 1 failed of 3,155** | Reproduced `useScrollRestoration` “throwing sessionStorage” failure: expected `scrollTop=0`, received 800 (`frontend/tests/unit/useScrollRestoration.test.tsx:169`). Root cause remains open. |
| `npm run lint:css -w frontend` | **39 errors / 84 warnings** | Direct run on this host; Stylelint identifies duplicate selectors/properties and descending specificity. An executor progress note recorded 24/37 for landing sheets under its run; recheck under one pinned tool version before setting a baseline. |
| Executor-recorded `bash scripts/verify.sh --fast` | Typecheck/build/bundle/CSS ratchet/copy budget passed; Vitest had 5 host-timezone failures, three focused files later passed 50/50 with `TZ=UTC`; release-publish test 1/10 failed; size-gate rule 2 was already over its 30,720 KB target | This is the executor's recorded run, not independently repeated here. Its bundle measurement was 758.7 KB, versus this review's direct checker at 762.5 KB. Preserve both outputs and resolve the environment/tool variance. |
| Backend suite | **2,658 passed; 19 skipped** | Measured earlier in this audit thread; no database-backed integration run. |
| Frontend lint/build/design gates/graphics check | Lint 0 errors/19 warnings; frontend build pass; design token/icon/color/raw CSS/motion/CSP pass; graphics verifier pass | These were measured before the executor's environment normalization. The direct current CSS lint output above is the stronger current debt measure. |

## 4. Fidelity scorecard and validity check

The instrument's saved E values are the 100× mean SSIM over 8×8 windows outside preregistered text masks. The table includes E for both widths. `T=2/2` below means both files exist and were scored; it does **not** prove the same state was compared.

| Section | E 1440 | E 390 | Mean E | Saved pair count | Human visual notes |
|---|---:|---:|---:|---:|---|
| Chrome | 46.5 | 47.8 | 47.2 | 2/2 | Current crop also contains hero content, so this is not header-only E. |
| Footer | 48.1 | 55.8 | 52.0 | 2/2 | Different light/dark panel density and print-grid structure. |
| Home CTA | 68.0 | 56.3 | 62.2 | 2/2 | Different central illustration and framing. |
| Home hero | 49.4 | 51.2 | 50.3 | 2/2 | Technical plate is more annotated and orange-heavy. |
| Home intro | 49.1 | 32.9 | 41.0 | 2/2 | Largest mobile mismatch; art/layout/state differ. |
| Home map | 73.8 | 62.7 | 68.3 | 2/2 | Higher pixels, but captures are not yet a trustworthy like-for-like state. |
| Home platform | 71.2 | 43.1 | 57.2 | 2/2 | Mobile art/card layout differs substantially. |
| Home problem | 79.9 | 57.0 | 68.5 | 2/2 | Closest overall structure; mobile text and crop still differ. |
| Home use case | 67.2 | 39.7 | 53.5 | 2/2 | Image-led reference vs text/list-heavy local layout. |
| Home why | 84.8 | 50.2 | 67.5 | 2/2 | Highest desktop score; mobile composition remains far apart. |
| **Overall** |  |  | **56.7** | **20/20** | E target is ≥90, per-section target ≥88; none of the section means reaches 88. |

### Why the current T/E result is not acceptance evidence

The manifest says “section root top at viewport top,” yet `capture.json` records these offsets after capture. With the intended ±2 px pairing tolerance, only **home hero at 1440, home hero at 390 and footer at 390** meet alignment; CTA has a local top offset of 670 px at 1440 and 311 px at 390, and reference footer at 1440 is still 183 px from the target. Several other reference roots differ by 8–21 px. Thus the instrument's T=100 is file coverage, not matched-state coverage. The crop is also a full viewport, not a section-bounded element crop; “chrome” includes most of the hero, and short sections include downstream page content.

Fix the capture/validation contract before changing UI against E. Require both roots to land within ±2 px (or record a reviewed different geometry), reject an unlanded pair, crop the actual section ROI, and derive T only from valid pairs. Do not claim the E threshold is impossible because art/copy differ: the four historical asset comparisons show original Madarek art can be resized/recompressed while retaining its composition. The low score establishes a large current visual gap; it does not establish that the target is unreachable.

## 5. Live Heron motion and transition comparison

The current live runtime was read in a fresh browser session at each width. Details for every active `ScrollTrigger` are stored in `heron-motion-inventory-live.json`. Public script metadata and the frozen R308/R331 measurements are kept distinct.

| Viewport | Active triggers | `scrub` triggers | Pinned | `once` triggers | `gsap.globalTimeline.getChildren(true)` |
|---|---:|---:|---:|---:|---:|
| 390×844 | 26 | 1 | 0 | 15 | 29 |
| 768×900 | 39 | 1 | 0 | 28 | 101 |
| 1024×900 | 41 | 1 | 0 | 30 | 217 |
| 1440×900 | 41 | 1 | 0 | 30 | 217 |
| 1920×1080 | 41 | 1 | 0 | 30 | 217 |

Live globals report Lenis 1.1.5, GSAP 3.12.5, SplitText 3.13.0 and Barba 2.10.3. At rest the document scroll height equals the viewport and `window.scrollY` remains zero; a mouse wheel drives a translated/staged page. The frozen measurements specify Lenis `lerp:0.1`, `smoothWheel:true`, `syncTouch:true`, `smoothTouch:false`, `wheelMultiplier:1`, `touchMultiplier:1`, `infinite:false`, driven from `gsap.ticker`. The live Lenis instance is not exposed as a window global, so the options remain frozen-spec evidence rather than a direct runtime object read.

The runtime has 45 `<img>` elements after wheel-traversing the page; 42 had decoded natural dimensions, 144 inline SVGs at desktop (135 at 390, 138 at 768), and zero canvas elements were observed. The loaded scripts include GSAP/ScrollTrigger, SplitText/TextPlugin, Barba/prefetch, Swiper and Lenis. The current cursor is DOM-based in the live markup; a canvas cursor was not observed. Exact Barba `leave`/`enter` timing and fine-pointer/touch cursor state were not independently extracted; use the frozen observations and mark these values unverified until a transition trace proves them.

| Dimension | Heron | Madarek | Decision/evidence gap |
|---|---|---|---|
| Smooth scroll | Lenis 1.1.5, `lerp .1`; wheel smooth, touch synced but not smoothed | Lenis 1.1.5 via `sheetLenis.ts` and shared conductor; native scroll when reduced motion is requested | Shared version/config is a good baseline but is not a curve comparison. Capture input→position traces for wheel and touch. |
| Scroll choreography | 26–41 active triggers by width; 1 scrub trigger observed at each width; zero pins in these states | Conductor, CSS custom properties, reveals and section transforms | Compare every active reference trigger to its local counterpart; the existing Q=85 is only 17/20 local settle checks, while trigger family is unverified. |
| Text motion | SplitText 3.13/TextPlugin 3.13 loaded; live scrub on intro title spans 407–987 px at 390, 98–718 px at 1440 | CSS and DOM reveals; no GSAP dependency in frontend package | Need per-trigger property/timing traces before library changes. |
| Route transition | Barba 2.10.3 and prefetch scripts loaded; frozen observations describe line/mask transition | React Router + `PageTransition` and CSS | Preserve route contract; compare a guest navigation trace. Exact current Barba timeline is unverified. |
| Cursor | Live `.cursor` DOM layer; no canvas in the measured viewport states | `CursorManager.tsx`, rAF conductor, native cursor remains visible | Measure fine-pointer states and ensure touch has no pointer-only control. |
| Preloader | Frozen record: progress/line drawing and a center-out clip exit around 5–6 s; live capture/evidence scripts use its skip control | `frontend/src/components/landing/chrome/Preloader.tsx` and `loaderOrchestrator.ts` | Current stress probe reports a preloader overlay in reachability results despite a settled browser recheck finding no `.pl`; stabilize the wait/state detector. |
| Performance | No current paired Heron rAF/INP trace in this audit | R366 report: INP p75 ≤160 ms, CLS ≤0.032; landing has historical long-animation frames/dropped-frame overruns under 4× CPU | R366 numbers are historical; recapture both sides with the same protocol. |

## 6. Asset inventory and R366 asset diet

Live Heron inventory after wheel-traversing to the footer found 45 image elements (42 loaded; 3 had no decoded dimensions), 14 loaded SVG resource URLs, 5 AVIF and 3 WebP resource URLs, and 144 inline SVG elements at 1440. Image formats across all 45 DOM elements were 18 PNG, 17 JPG, 5 AVIF, 3 WebP and 2 SVG. Performance APIs exposed transfer sizes for 41 image elements; cross-origin transfer size is not available for all assets. The CSV records natural/rendered dimensions, `object-fit`, element and parent z-index/opacity/filter/blend/transform, and byte sizes when exposed. Alpha-channel and scroll parallax values remain unverified; no image binaries from Heron were added to the repository.

The live DOM shows pre-rendered raster artwork plus SVG/DOM furniture and no canvas. That supports the frozen finding that this visual style does not need a WebGL/Three.js scene. The current asset inventory is not an exhaustive media-file manifest: three DOM images did not decode at the sample state, CSS background sources need a separate resource crawl, and alpha/parallax were not read.

R366 reports 38 WebP assets recompressed to ≤60 KiB and two unused retina twins removed (−649 KB). Four Git-history comparisons show:

| Madarek-owned asset | Before (bytes; native size) | Current (bytes; native size) | Byte reduction |
|---|---:|---:|---:|
| statement courtyard light | 228,598; 1200×1200 | 56,988; 780×780 | 75.1% |
| problem mastery light | 153,646; 1200×1200 | 58,240; 780×780 | 62.1% |
| journey route dark | 99,342; 1600×813 | 61,034; 1600×814 | 38.6% |
| why cycle light | 81,118; 1600×813 | 58,944; 1600×814 | 27.3% |

In the aligned before/after sheets, composition and line details remain visually close at the displayed size; the 1200→780 downscales still need a 2×/high-DPR view before ruling out softness on phones. This sample does not prove all 38 assets are unaffected. Keep the budget and request a per-asset re-render only when a matched display-size comparison shows quality loss.

## 7. Visual and responsive defect list

Evidence matrix: ten mapped targets × two primary widths (390 and 1440) in `primary/`; there are one reference and one local image per pair, plus generated comparison sheets. These are section-entry viewport captures, not the requested 6–10 scroll positions per section. The local/reference root offsets show that most are not yet exact coordinate matches.

| Section / viewport | Defect or difference | Severity | Evidence / confidence |
|---|---|---|---|
| Intro, 390×844 | Reference render-led opening vs local text/courtyard two-column arrangement; E 32.9 nominal | High | Sheet + scorecard; strong composition divergence, though coordinate mismatch remains. |
| Footer, 1440×900 | Local dense dark panels vs reference light print-grid footer | High | Sheet + E 48.1 nominal. |
| Hero, 1440×900 and 390×844 | Local plate has more labels/markers/strong accents; reference is a quieter large elevation | High | Sheet + E ≈50 nominal. |
| CTA / map / platform | Image and geometry composition differs; local illustration/card structures do not align to the reference scene | High | Individual section sheets; E 43.1–73.8 nominal. |
| Hero, 320×640 | Stress tool found overlapping Arabic title lines once; settled manual probe showed a separate set of intersecting work-item number/text boxes after the page had been scrolled. Reproduction is inconsistent. | Medium, needs confirmation | `stress.json` + a settled browser probe. Keep as a defect lead, not closed. |
| Hero, 1440×900 | Stress tool found two 100% text-box intersections: `01`/`محور`, `02`/`قياس` | Medium | `stress.json`; inspect with settled screenshot before changing. |
| CTA, 640×360 | Button label `أنشئ حسابك الجامعي` measures 251 px in a 249 px clipped box (2 px over) | Medium | `stress.json`; direct probe not repeated after the overlay settles. |
| Hero marker / header actions, sizes 320–1440 | Stress tool reports hit-testing through `div.pl`, hero sub-cell or work item | Unknown | `stress.json`; 7.5 s settled browser review found no `.pl` and the burger/marker hit themselves at 320. This is a stress-harness timing/state defect until reproduced in the settled UI. |
| All seven stress sizes | Horizontal document overflow 0 px | Pass for measured build | `stress.json`; not a substitute for the remaining twelve-size/light-dark/zoom matrix. |

The complete 12-size matrix (320, 360, 390, 412, 600, 768, 820, 1024, 1280, 1440, 1920, 2560), foldable, 200% zoom, light/dark, reduced motion, touch, and CPU 4× has not been measured. Only seven local sizes were included in the current stress artifact; paired Heron/local shots exist only at 390 and 1440.

## 8. Root causes (ranked, eight categories)

| # / severity | Root cause | Affected files/surfaces | Risk to fidelity and simplicity | Recommendation |
|---|---|---|---|---|
| 1 — Critical | **Capture state is not enforced.** 20/20 screenshots are treated as matched even when root offsets exceed ±2 px; CTA local offset is 670 px/311 px and footer reference offset is 183 px. Full viewport crops include outside-section content. | `scripts/conformance/fidelity.mjs`, `capture.json`, `manifest.json` | E and T can reward or punish unrelated content; UI work can optimize a false score. | Reject unlanded pairs, crop section ROIs, recompute T from valid coordinates, and add failing fixtures. |
| 2 — Critical | **Motion parity is incomplete.** Q=85 measures local settle samples only; reference trigger/tween curves and route transitions are not in the denominator. | `scripts/conformance/fidelity.mjs`, frozen `_motion.*.json`, `sheetLenis.ts`, `sheetConductor.ts` | “85 motion score” sounds more complete than its evidence; timing work may be guessed. | Extract live trigger tables at all widths, pair trigger IDs, and record tween progress/curve samples before implementation. |
| 3 — High | **Visual intent differs by structure and imagery.** The biggest current gaps are intro, hero, footer and use case; the local art and section layout diverge. | landing sections + their CSS; `visual-review.csv` | Per-section tweaks will not converge if the target is a different composition. | Rebuild section structure first, using original Madarek art; review each viewport pair. |
| 4 — High | **Metric/gate disclosure previously showed stale thresholds.** R347 section re-keys were applied while the artifact printed base 40/50 values. The code now emits effective policy and has 10 regression tests. | `scripts/conformance/{run.mjs,gates.mjs,gates.test.mjs}`, `results.json` | Earlier “PASS” history can be misread as visual proof; current DOM gate is still separate from E/Q. | Keep effective policy visible, call it DOM/style conformance only, and retain strict floors. |
| 5 — High | **CSS cascade debt and changing lint result.** Direct lint is 39/84, executor notes 24/37 for landing sheets under its run; duplicate selectors straddle media boundaries. | 27 landing sheets, `stylelint` scripts/gate | Cleanup without computed-style proof can move responsive rules; version variance weakens trend claims. | Pin the lint version and only consolidate after `style-snapshot.mjs` before/after reports. |
| 6 — Medium | **Asset budgets are not quality tests.** Current examples retain composition at display size, but two sample rasters lost 35% of each native dimension; high-DPR softness is untested. | `public/media/illustrations/r342/**`, `scripts/graphics/verify-graphics.mjs` | A byte gate can hide a resolution/line-detail tradeoff. | Add rendered-size and 2× inspection to each asset's acceptance, preserve approved budget. |
| 7 — High | **Local verification varies by runtime and tooling.** Node 26 is outside `>=20 <25`; Playwright expected another browser build; suite outcome and bundle size differ between recorded runs. | runtime, `node_modules`, Playwright cache, verify and bundle scripts | A green result cannot be reproduced consistently. | Pin supported Node/Playwright/browser; keep browser cache setup documented and record TZ. |
| 8 — Medium | **Product scope exceeds the evidence matrix.** 125 web product routes and 125 mobile app routes serve five user roles, while paired visual proof covers only landing entry states. | `frontend/src/pages/**`, `apps/mobile/app/**`, route inventory | Landing polish can ship while app/mobile still have inconsistent design quality. | Build route/role batches after the public reference language is approved; no business-logic changes. |

## 9. Simplification opportunities with measurable bounds

| Opportunity | Measured starting point | Candidate target (after proof) |
|---|---:|---|
| Remove duplicate landing CSS selectors safely | 27 landing stylesheets; direct all-CSS lint 39 errors/84 warnings; executor's landing-only report 24/37 | 0 duplicate-selector errors in landing sheets; retain ≤57 specificity warnings; no style-snapshot changes except approved ones. |
| Reduce landing CSS only after visual freeze | 668,169 source bytes | Target a 10% reduction (≤601,352 bytes) only if paired E and computed styles remain within accepted tolerance; otherwise keep bytes. |
| Strengthen source-to-evidence indexing | 10 targets, 20 primary image pairs | 100% valid coordinate pairs; 10/10 visual-review rows and 10 per-section sheets with scroll state IDs. |
| Preserve current asset diet with quality checks | 38 historical WebP reductions; 2 deleted retina twins; four samples show 27–75% byte reduction | Keep the current budget; require high-DPR review for all 38 before restoring/updating any source. |
| Simplify documents/round history | Hundreds of historical Markdown files | No mass move yet. First identify active source-of-truth set and inbound links; archive only completed duplicate reports after link checks. |
| Cut marketing copy | Executor recorded 10,419 words under current copy budget | Set an agreed reduction target after segmenting legal/help/product text; do not trim legal or instructional substance by a global percentage. |

Do not delete a file merely because `knip`/`jscpd` is unavailable, and do not archive R3xx source documents before auditing inbound references and release ownership.

## 10. Remaining checks and release recommendation

- **Not checked:** Lighthouse on `/`, `/features`, `/app`, `/auth` and three role pages; axe on web and mobile; iOS Safari/WebKit; foldable; 200% zoom; dark/reduced-motion pairs; mobile device screenshots; live API flows; production database; full asset alpha and parallax; Barba transition timings; exact fine-pointer/touch cursor behavior.
- **Tool-run limitations:** new `stress.json` reachability rows include an overlay that disappears in a separately settled browser session. Correct or replace the stress-settle probe before using reachability as a hard failure. New scorecard root alignment is measurable but not enforced; treat nominal E/T/Q as provisional.
- **Current failures:** one frontend scroll-restoration test; direct CSS lint 39 errors/84 warnings; stress 0/7 fully clean; visual E fails; Q settle score fails its overall target and trigger parity is unverified. Bundle is within both checker and 770 KB requirements at this review's direct 762.5 KB reading, but margins and checker mismatch remain.
- **Scope deviation:** earlier executor commits on `exec/r368-heron-fidelity` changed conformance scripts and reports despite the original instruction to change only the three docs and evidence directory. This review did not undo those commits; they should be reviewed separately before anyone merges or implements product work.

**Recommendation:** Continue with measurement corrections and a review of the three significant hero/introduction/footer/map compositions. Do not start broad implementation against the current 56.7 score until capture alignment and motion-reference samples are valid. Keep the original-art rule: recreate the visual structure and motion with Madarek-owned assets, never Heron's logo, copy, fonts, source or raster/SVG files.
