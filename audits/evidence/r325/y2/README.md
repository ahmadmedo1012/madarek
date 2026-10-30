# r325 · Y2 — the §05 platform band rebuild (evidence)

Defect ledger row Y2 — «platform §05 clutter: 330-px strip, 380-px void,
tooltip over art, 9-px mono». Band: `#product.pr-section` (heading
«لا وعود — هذه الواجهة نفسها»), rebuilt on the r324 Heron extraction
(`docs/redesign/r324/heron/full-<bp>.json`, section `home-platform`).

## Sheets (webp, full-section captures)

| file | bp | theme |
|---|---|---|
| `before/platform-before-1440-{paper,ink}.webp` | 1440×900 | light/dark |
| `before/platform-before-768-{paper,ink}.webp` | 768×1024 | light/dark |
| `before/platform-before-390-{paper,ink}.webp` | 390×844 | light/dark |
| `after/platform-after-1440-{paper,ink}.webp` | 1440×900 | light/dark |
| `after/platform-after-768-{paper,ink}.webp` | 768×1024 | light/dark |
| `after/platform-after-390-{paper,ink}.webp` | 390×844 | light/dark |

Reproduce (vite from the worktree on :5202, backend :4000 proxying):

```bash
cd frontend && npx vite --port 5202
node audits/evidence/r325/y2/y2-sheet.mjs before   # with the fix stashed
node audits/evidence/r325/y2/y2-sheet.mjs after    # working tree
node audits/evidence/r325/y2/y2-probe2.mjs after probe2-after.json
```

## Defect → measure (probe JSONs in this directory)

`probe-before.json` (v1 selectors, HEAD state) and `probe2-before.json` /
`probe2-after.json` (v2, rebuilt DOM).

| # | defect (before, measured) | after |
|---|---|---|
| 1 | heading column a 342.5px strip at the far right, dead space beside it; its step list lived inside the centre cell | `.pr-head` = the extracted content-left seat: cols 1–3 + gutter-eat = 346.7px **full-height** cell; the step list fills its tail (`458px` of 645 @1440) — no strip |
| 2 | ~380px blank zone under the centre list (`blankUnderList: 371` @1440, `119` @768) | the list moved into the heading column; the frame is ONE flex figure (bar · screen · track · check) — max internal gap anywhere in the band: **12px** (≤767: 8px); `gaps` in probe2-after |
| 3 | tooltip «قاعة المحاضرة التفاعلية — نقطة فحص تُصحَّح فورًا» painted OVER the plan miniature (`pinOverArt.overlapsPlan: true`, inset 37/120) | the plan miniature + pin retire (PlatformCanvas/PlatformPlanArt deleted); the line is the frame's **caption below the art** (`capTop == artBottom`, `overlapsArt: false` at every bp) |
| 4 | filler chrome «[05] · MADAREK · UI GRAMMAR» on every frame head (fs 8.33px @1440) | `.pr-frame-head` retired — `filler: {frameHeadEl: false, uiGrammarLabel: false}`; the [05] section label + title/lede carry the read |
| 5 | phone label list at 9.92px mono (`monoSizes: {9.92px: 10}` @390; 9.21 @768; 8.33 @1440) | `.pr-section .fo-mono { font-size: max(var(--fs-mono-xs), 11px) }` — census `monoMin: 11` at every bp |

## Seat widths vs the extraction (@1440)

Extracted `home-platform` (full-1440.json): content-left **361** ·
img-wrap **601** · content-right **464** on a 1427 container =
25.3 / 42.1 / 32.5 %.  Rebuilt (probe2-after, content 1373.7): head
346.7 = 25.2 % · stage 577.8 = 42.1 % · side 445.6 = 32.4 %. RTL-mirrored
(the heading column sits at the reading-start edge = right).

Band height vs the X14 floors: 710 @1440 (= Heron's 710), 508 @768
(55.2rem floor), 605 @390 (content). `contain-intrinsic-size` rungs
re-measured (360→639 · 600→912 · 768→508 · 49.3vw ≥992).

## Verification

- `npm run typecheck -w frontend` + `typecheck:tests` — pass
- vitest (landing/platform-covered suites: r306 sheet, landing-funnel,
  landing-scrollspy-grain, r307 media, r168b truthfulness, r183 funnel,
  r324 text-gate, r312 guest-reveal) — 94/94 pass
- VLM review of the sheets: before = all five defects confirmed visible;
  after = no overlay, no light islands in Ink, orange as the single signal

## Honest gaps

- The 1440 after-sheet's centre screen keeps generous drafted-paper air
  around the concept chain by design (grid-paper background; largest air
  run ≈110px vs content ≈175px — under the 1.5× rule).
- The 768–1024 tablet band stays the strips-only composition (head/side
  fold) per the r315 measured-tier law — unchanged by Y2.
- `.prf` (ProductFrame) capture rules elsewhere in landing.css still
  exist for other sections; only the §05 band was rebuilt.
