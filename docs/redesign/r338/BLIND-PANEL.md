# R338 — T-90 Blind Panel (honest, measurement only — no fixes)

Round: R338 · Task: T-90 · Branch: `r338/t90-panel` · Base: `origin/main` @ ba88d910
Rubric: `docs/archive/redesign/r333/rubric.md` (12 criteria, 0–10 integers, anchors 3/6/9) — read verbatim before scoring.

## Method note (honest)

- Served the worktree build on `localhost:5390` (vite dev, strictPort). Captured **36 screenshots** (9 landing sections × light/dark × 1440/390) with Playwright (repo node_modules, chromium-1200), each section scrolled into view + 2 settles (~900ms × 2) before capture. Theme flipped via the site's OWN mechanism (`.theme-toggle` segmented control, `html[data-theme]` confirmed applied at 1440).
- **INVALID CELLS — dark@390:** the site's theme toggle is not reachable at 390px (locator timeout on both mobile passes); the `dark-390/*` shots are duplicates of light (byte-identical sizes). Dark is therefore only evidenced at 1440. Reported, not faked.
- **Scoring method: programmatic.** This harness has no human image viewer; scores derive from (a) per-section ComputedStyle + WCAG contrast ratios measured in-page (12 runs), (b) PNG pixel statistics (dimensions, size/uniformity as blankness proxy), (c) CSS rule analysis (291 `:hover`, 93 `:active`, 28 files `:focus-visible`, 53 files `prefers-reduced-motion`, duration/easing histogram), (d) console-error capture (clean, 0 errors at 1440 light+dark). **Protocol deviation:** motion criteria (#6/#7) were NOT judged from frame sequences/video (none captured) — scored conservatively from code evidence only, per rubric §3.2 they may not be moved by stills, so they are capped low.
- In-flight section expectations (why 63.5, footer 69.4, cta 67.1, platform 80, intro 77 branch / 74.8 main) were known and NOT inflated.

## Scores (12 criteria, rubric order)

| # | criterion | score | one-line justification |
|---|-----------|-------|------------------------|
| 1 | composition | **5** | Hero/why/map stage real focal scenes at 1440 (hero 278KB rich, journey 6275px), but `home-why-wrap` renders 16KB/2489px (near-empty) at 1440 and `home-platform-wrap` 3KB/996px (near-blank) at 390 — stacked-without-tension in in-flight sections; between anchors 3 and 6. |
| 2 | typography_craft | **5** | One disciplined Arabic family (IBM Plex Sans Arabic) with role-separated weights (600/700 display vs body) — but it is a single stack doing everything, and several display headings sit at line-height 1.0 (map 46.67/46.67, why 40/40, intro 33.33/33.33) — tight for Arabic display; below anchor 6's "type system". |
| 3 | spacing_rhythm | **5** | Cadence exists on measured sections (map 96px block pad, cta 100/66, hero 82/98) but section-level paddings are uneven (problem/why/platform 0 with hidden inner wrappers) and why@390 keeps only 8px inline edge clearance (< the anchor-6 ≥16px mobile rule). |
| 4 | imagery | **5** | Art direction is authored (inline-SVG line-art, no stock, no filler-grade raster) but in-flight sections read as empty canvas (why 16KB, platform@390 3KB) — media is coherent where present, incomplete where in flight; between 3 and 6. |
| 5 | storytelling | **6** | The 9-section order is a real problem→mechanism→proof→action arc (statement→live→why→product→chapters journey→roles→vision CTA) and the signature journey scene is large (6275px @1440); meets anchor 6's structure, not verifiable as "stranger narrates back" without panel viewing. |
| 6 | motion_quality | **4** | Scored from code only (no sequences — protocol deviation, capped): durations sit in a disciplined 80–400ms band but ≥6 distinct cubic-bezier vocabularies incl. multiple overshoot curves (1.18–1.6) — more than "one easing vocabulary"; choreography order unverifiable from stills. |
| 7 | scroll_feel | **5** | Lenis 1.1.5 smoothing is wired (hero-mechanics.css) + `overscroll-behavior: contain` — anchor-6 prerequisites present — but pin economy is unverified (map pin spans 6275px) and no WebKit evidence exists (host-blocked); between 3 and 6. |
| 8 | micro_interactions | **6** | 291 `:hover` + 93 `:active` rules across styles, 28 files with `:focus-visible`, press/hover timings in the 80–240ms band, 53 files honor `prefers-reduced-motion` — one vocabulary at anchor-6 coverage; "delightful/informative" (9) not evidenced. |
| 9 | density_contrast_legibility | **3** | Measured hard fails: intro heading **1.92:1 in light**; dark body ink 3.42–3.97:1 on problem/platform/usecase and intro paragraph **1.0:1 (invisible)** in dark — exactly rubric anchor 3 ("body contrast below 4.5:1 somewhere prominent; dark mode inverts sloppily"); matches known T-02e dark-ink defect. |
| 10 | consistency | **6** | Token system governs the landing end-to-end (check-colors gate enforces it), one family/weight language, one icon approach (lucide + authored SVG); in-flight sections (why/cta/footer on branches) still diverge from the landed vocabulary on main. |
| 11 | arabic_rtl_craft | **6** | `dir=rtl` on all 9 sections, native Arabic family, hero lh floor 1.35× honored (63/46.67), x-mirror cells tracked by the conformance instrument; but display lh 1.0 headings and residual nonzero letter-spacing (0.04–0.14em) in landing CSS keep it below native-grade. |
| 12 | polish_finish | **5** | Console is clean (0 errors, 1440 light+dark) and reduced-motion is globally honored — but the theme toggle is unreachable at 390 (measured), in-flight sections render near-empty frames, and font-flash/sub-pixel/WebKit pacing are unverified. |

## Honest summary

- **Reads as done** (measured conformance on main + consistent visual mass in shots): usecase (93.9), problem (90.5), platform desktop (80) — these hold focal composition and density at both widths.
- **Reads as in-flight**: why (63.5 — near-empty canvas at 1440, 8px mobile edge), footer (69.4 — tall 1763px mobile stack, dark c8.88 fine but structure mid), cta (67.1 — 35KB/699px thin scene), intro (74.8 — the 1.92:1 heading is the worst single legibility cell), map on main (47.6 vs 82.2 branch — the 6275px journey is the biggest unlanded delta).
- **Systemic (cross-section) blockers**: dark-mode ink contrast (criterion 9 = the only anchor-3 score), single-family type system, motion vocabulary plurality, dark@390 unreachable toggle.
- Raw evidence: `/tmp/t90-shots/{light,dark}-{1440,390}/*.png` (36), `/tmp/t90-evidence.json` (ComputedStyle + contrast + console), `/tmp/vite-t90.log`.
