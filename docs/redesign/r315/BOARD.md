# R315 — ALL SCREENS, EVERY DETAIL · live board

**Owner order:** Madarek must be indistinguishable from https://heronaiapp.com/ on
desktop, tablet and phone, on **every page**. Cycle after cycle without stopping.

**Baseline:** R314 cycle-2 close — **PARITY 56.6 / 100** (commit `f1c44f73`).
**Environment note (R315 cycle 1):** sandbox was reset; repo re-cloned at
`f1c44f73`; `_local/` captures from R314 are gone (gitignored by design) — the
committed r313 evidence (`audits/evidence/r313/reference/**`) survives, Heron is
live-reachable (200 @ ~0.5 s), fresh Heron captures are being re-taken with the
r314 harness.

## Cycle 1 — tickets (worst-first, owner §0 letters)

| ID | Owner § | Ticket | Agent | Status |
|---|---|---|---|---|
| K-A4 | A.4 | **DONE @1440/390/768/1024** — the mono label + page-frame plus marks + coords are GONE (E-crawl: the reference's frame is 4 hairlines only); `sheet-coord-*` re-pinned to absence in r309 e2e | foreman | done |
| K-A5 | A.5 | **DONE** — `.fo-progress` retired (markup + CSS + imperative --p); scrollspy pin re-pinned to assert absence (R315 override) | foreman | done |
| K-C | C | **DONE measured** — one line «يستخدم هذا الموقع التخزين المحلي. اعرف أكثر» · banner 601×38 bottom-LEFT (mirrored) · Accept 79×28 #EFEFEF ground · Reject 81×28 outlined · mobile 359×94 w/ 44px floor (Heron 374×93.45) | foreman | done |
| K-B | B | **DONE desktop + mobile bar** — 56px ruled cell row [logo\|nav 4×137\|theme\|login\|CTA 167×56] (CTA 166.66 measured ✓), tagline retired (r177 re-pin 2→1), theme cluster unboxed, burger = 3 bars; mobile bar 376×50 [logo\|MENU 187] ✓. Mobile ticker = hero closing band (E-crawl: the reference's marquee is the hero's closing band, not a header row — B1 to seat it) | foreman | done |
| K-A1 | A.1 | **DONE (B1 + foreman)** — the raster crop is retired; the drafted ElevationDrawing rides the window at HERO_SEAT (≈67% width), `.fo-hero-window .bp-fill { fill:none }` — **0 pure-white px** in the art region (was 928/2500); art region = pure paper + ink (Heron telemetry ✓) | B1+foreman | done |
| K-A2 | A.2 | **DONE** — hero 887px exact @1440 (100svh−header), H1 «رحلة تعلم واحدة / من المحاضرة إلى الإتقان» 2 lines, zero tashkeel, lh 1.0, 47% cell; fully inside first viewport at 1440/1024/768/390 (measured) | B1 | done |
| K-A3 | A.3 | **DONE** — bp-dmark ± quartet at the dashed inner frame's corners (15–20px inside) + the four-edge rulers; page-frame marks moved to the window where the reference carries them | B1 | done |
| K-H | H | **DONE** — tablet band = 100svh−14 hero, H1 measured fully on-screen @768/1024 (x 339..761 / 451..1017, no clip), edge tab mirrored to the LEFT edge (away from the RTL H1) + z40 ≤991 | B1+foreman | done |
| K-E | E | Remove R310 leftovers from landing: Mini `demo` blocks «المجتمع والتدريب»/«الجودة والحاكمية», chapters 05/06 rows, ~280px gap (move honest ledger mentions to /capabilities) | B4 | pending |
| K-D | D | Map: plan sits directly on paper (no white inset box/caption box); add INTRODUCTION card (dark title bar + 4 scrubbed lines + `[تابع التمرير]`); add full-screen single-statement state; mobile plan not cropped | B4 | pending |
| K-F | F | Footer: full-width single-contour outline wordmark (no self-intersections at «ك»/«د»), 711px cell grid exact, mark cell without floating red diamond; mobile footer no text collisions | B9 | pending |
| K-INTRO | open | Intro/statement: Heron carries a large line-art illustration — biggest open compositional gap per v2 judge (scores 45–59) | B2 | pending |
| K-I | I | Inner pages chrome: /auth (+register) get the full treatment — 7px frame, ± marks, grain, hairline cells, mono indices, transparent inputs with the 1px #B3B3AF→#ED4C1F→#FA3600 ladder | P1 | done (R315 c1: sheet frame + ruled cells live, tests green, screenshots `_local/p1-preview/`) |
| K-J | J | **In progress** — fresh captures DONE (J1: 11 viewports both sites + 10 Heron inner pages, `_local/captures/r315-manifest.json`, drift ≤0.7% vs r313); Heron DOM grammar extracted (E-crawl: 24 passes → docs/research/pages/*.md). NEXT: roles.json + dom-judge.mjs + masked-pixel re-run + score recompute | J1+E-crawl done; J2 next | in_progress |
| K-WHY | G | Why section 980→698 band; page-height table rebuilt for every viewport after landing edits | B6 | pending |

## Judge state

- DOM-geometry judge: **new in R315** (`scripts/r315/roles.json` + `dom-judge.mjs`) — objective, language-free.
- Masked-pixel judge: `scripts/r314/judge.mjs` (worst-region ranking) — reused.
- VLM: r314 v2-text-masked pairwise retired per owner; describe-then-diff scene-graph
  (`vlm-scene.mjs`) to be built on the same greeking masker (`scripts/r314/vlm-mask.mjs`).
- Score ratchet: `audits/evidence/r315/PARITY.md` — **may never go down**.

## Cycle log

- **cycle-1 CLOSED (3 pushes: 73dd2382 · 03a5ebbf · final)**: K-A1..A5, K-B, K-C, K-D,
  K-E, K-F, K-H, K-I all closed with measured evidence (PARITY.md); DOM judge built+run
  (729 mismatches ranked, tablet band = top root cause); gates 2530/2530 green.
- **cycle-1 push 1 (landed)**: K-A4/A5/C/B + hero A1/A2/A3/H (B1 + foreman) + auth K-I (P1).
  Gates: eslint 0 errors · tsc 0 · **vitest 2531/2531** · check:colors/icons/motion-tokens/raw-css OK.
  Measured @1440×900: hero 887/887 ✓ · docH 12470 vs 12338 (+1.1%) · consent 601×38 mirrored ✓ ·
  CTA cell 166.66 ✓ · H1 2-line clean inside viewport ✓ · 0 white px in hero art ✓ · no overflowX at any band ✓.
  Known open (cycle-1 push 2): K-E R310 ledger rows + K-D map states (B4), K-F footer wordmark (B9),
  1024×768 docH +23% / landscape +19% / 768 +5.7% (M-agents), instruments J2/J3 + PARITY recompute.

## Cycle 2 — the rem law + the tablet/landscape re-composition (CLOSED)

**The measured law:** every Heron ≤991 content band = a CONSTANT rem height
(fresh manifest, 3 widths ±0.2rem): statement 57.2 · problem 144.8 ·
platform 55.2 · why 95.2 · usecase 145.2 · cta 58.8 · footer 103.1.

| Ticket | Result (measured, docH vs live reference) |
|---|---|
| M2 ≤1024 boundary | max-1024→991 + min-1025→992 ×2: the desktop composition holds at 992–1024 like the reference — 1024×768 **+22.7%→+8.0%** (rest = the 13px Arabic canon floor, documented) |
| M3 tablet band 768–991 | V13 grammar extended, seated at file END (batch-1 cascade lesson); rem floors pin the law — 768 **+14.5%→+0.6%** (cta 541/541 · problem/product/why 0.0% exact) · 820 **+11.4%→−0.9%** · 844×390 **+13.4%→−1.0%** (usecase 1469/1469 · footer 1043/1043 exact) |
| Phone boundary | 760→**767** (the reference's live tier — census 991/767/479; the 761–767 sliver was orphaned) |
| J2 chrome verdicts | hero rulers + dashed frame: hidden at rest like the reference (proximity reveal, display:none <992) — were always-on |
| Owner data | repo link RETIRED from the footer UI + all docs/logs/evidence (LICENSE/SECURITY kept — functional legal instruments, documented) |
| Copy | «الأدوار الثمانية»→«الأدوار والشرائح» (honest 5+3 split) + problem/cta polish |
| Instruments | band-structure-probe.mjs + shot-at.mjs + pages-smoke.mjs (score.mjs array shape) · deterministic vite-preview measurement · pixelmatch-6 interop fix |
| Judges | DOM 729→623 instances · pixel 87 fresh pairs · VLM hero@1440 MATCH (scene-graph convergence) · smoke 40/40 (dark verified per-probe) |
| **PARITY** | **56.6 → 58.5 (ratchet held)** — vlm 43.5 · pixel 42.9 · coverage 100 (the wiped _local smoke artifact honestly rebuilt) |
| Gates | eslint 0 · tsc 0 · 2530+1783 green · check:* OK · parity-export 200/200 |

## Cycle 3 queue (worst-first)

1. 992–1024 slice +8.0% (wraps + the canon-floor ledger entry)
2. 480–767 mid-band −16.2% @600×1024 (mobile-family rem purification + 390/360 re-pins)
3. 360×800 +5.5% (why +18%) · 1920×1080 −3.2% (footer px caps) · 1280 footer +13%
4. Landscape hero window-seat + map landscape (chapters −5.9%)
5. VLM re-verdict pass on anchored frames (27 stale r314 DIFFERENT verdicts predate the re-compositions)
6. Authed-surface sweep (P3–P8) + dark pair judging @768
