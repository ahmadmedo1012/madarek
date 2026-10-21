# r304-final — fresh acceptance evidence (R304 FINAL RECOVERY close-out)

Captured 2026-10-21, local Vite dev server (`--port 3030`) serving the
`redesign/r304-integration` tree at `ad19a95` + the parity close-out fix
(working tree == commit candidate). Same tree lineage as `origin/main`
`1b76651` (PR #38) — this is the merged nine-workstream product, not a
prototype.

## Renderer proof (applies to every frame)

- `data-world-state="active"` on the world host at load — the typed
  ribbon↔runtime contract (`src/lib/landing-story/ribbon-bridge.ts`)
  resolved the explicit `knowledgeRibbon` import and mounted MERIDIAN.
  A broken artwork import would report `unavailable`; there is no
  fallback knot in the tree (`grep TorusGeometry src/components/landing
  src/lib/landing-story` → 0 hits).
- One `<canvas>` (WebGL), DPR-aware; camera, ribbon pose and chapter
  ledger share the conductor's damped clock.

## Frames

| file | viewport | scroll | theme | chapter / note |
|---|---|---|---|---|
| d-y0.png | 1536×1000 | 0 | light | hero — ribbon docked left, headline clear |
| d-y1000.png | 1536×1000 | 1000 | light | statement — art left / ledger right |
| d-y1500.png | 1536×1000 | 1500 | light | statement→chapters transition — no blank band |
| d-y1932.png | 1536×1000 | 1932 | light | chapters head |
| d-y3048.png | 1536×1000 | 3048 | light | chapters body — demo 03/04 readable |
| d-y4700.png | 1536×1000 | 4700 | light | chapters→live transition — no wash-out |
| d-y5164.png | 1536×1000 | 5164 | light | live — موثّقة ledger high contrast |
| d-y6165.png | 1536×1000 | 6165 | light | roles |
| d-y7089.png | 1536×1000 | 7089 | light | colleges — chips grid + panel |
| d-y8138.png | 1536×1000 | 8138 | light | vision |
| d-y9089.png | 1536×1000 | 9089 | light | cta — ribbon quiet right gutter |
| d-y9878.png | 1536×1000 | 9878 | light | footer |
| dark-y0.png | 1536×1000 | 0 | dark | hero night retune |
| dark-y5164.png | 1536×1000 | 5164 | dark | live — paper ledger card on night |
| dark-y7089.png | 1536×1000 | 7089 | dark | colleges |
| dark-y9878.png | 1536×1000 | 9878 | dark | footer |
| m390-hero.png | 390×844 | 0 | light | mobile hero — independent composition |
| m390-y715.png | 390×844 | 715 | light | statement mobile |
| m390-y2600.png | 390×844 | 2600 | light | chapters body — matrix demo |
| m390-y5779.png | 390×844 | 5779 | light | live mobile — dark card |
| m390-y7659.png | 390×844 | 7659 | light | colleges mobile |
| m390-y9706.png | 390×844 | 9706 | light | cta mobile |
| m390-y10400.png | 390×844 | 10400 | light | footer mobile |
| m360-hero.png | 360×844 | 0 | light | tightest device — no overflow (350≤360) |
| s1-fast-matrix.png | 1536×1000 | 2700 | dark | fast-jump to mastery-matrix — settled, fully readable |
| s2-reverse-exams.png | 1536×1000 | 4000 | dark | reverse scroll (bottom→mid) — community/training readable |
| s3-reload-exams.png | 1536×1000 | 0 | light | reload restores safely to top, world `active` |
| s4-jump-matrix.png | 1536×1000 | 2700 | dark | 0.2s mid-flight cold jump — text/demo stay legible (no wash-out) |

## Overflow measurements (failure-class D guard)

- 390×844: scrollWidth 380 ≤ 390
- 360×844: scrollWidth 350 ≤ 360

## Dark-cascade proof

After the parity close-out, dark theme computes
`--gold-soft = #3A3017` and `--c-yellow-bg = #3A3017` (verified via
`getComputedStyle` on `document.documentElement` with the real toggle
button, not a forced attribute). The pre-fix state shipped light gold
`#FCF1CD` on dark surfaces — the orphaned dark declarations sat outside
any selector block and were dropped by the browser.

## Internal surfaces

Covered by the DB-less surface-inventory sweep (96 routes × 3 viewports
× 2 themes, mock transport, production build) + the committed drift
gate — see the r304-final close-out report. Production Render is
serving `buildId 1b7665125a72` (= origin/main `1b76651`) per
`/api/v1/health`; demo login is disabled in that environment, so
logged-in browsing evidence comes from the sweep, not live prod.
