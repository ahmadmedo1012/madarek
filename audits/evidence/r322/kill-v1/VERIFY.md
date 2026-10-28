# kill-v1 (Task 1-a) — verification record

Worktree `/home/z/madarek-wt/kill-v1` · branch `r322/kill-v1` · Vite dev :5174 ·
agent-browser session `kill1` · date 2026-10-28. Evidence: `before-*` shots are the
pre-change state (8f061a2-era chrome), `after-*` shots are the committed state
(re-shot fresh this run).

## V1 — killed-string sweep (document.body.innerText)

| string | 1440 | 390 |
|---|---|---|
| `R313]` | absent | absent |
| `[0,` | absent | absent |
| `UNITS` | absent | absent |
| `· LIVE` | absent | absent |
| `live ·` | absent | absent |
| `MDRK ·` | absent | absent |
| `checkpoints` | absent | absent |

Still present by design (other packages' scope): hero `[LIVE]` disclosure tag
(C2 hero transplant), `SHEET 05 · SCALE 1:100` + `VIEW-A · 1280×800` + `real-ui`
platform-frame labels (V6, C4), `[CTA · RESOLVE]` / `[09] · REGISTRY` inner-sheet
labels (KEEP family).

## Document height (scrollHeight, fresh load)

- 1440×900: **12523** (target 12355 ±1.5% = 12170–12540 ✓; R321 baseline 12530 — net −7)
- 390×844: **11319** (target 11441 ±1.5% = 11269–11612 ✓; R321 baseline 11357 — net −38)

## V7 — edge-rail geometry @1440 (problem section in view)

- `.et-tab` button (transparent ≥44px touch floor): [7, 51]px
- `.et-rail` visible paper rail: **[7, 24.3]px**, vertical band y∈[369, 531]
- nearest text columns: problem lede/head `l=33` · hero discover `l=31` ·
  footer mark cell `l=29` · footer text leaf `l=54` → **no intersection**
  (5–9px clearance at rest; ≥0.7px at the +4px hover nudge; the 4px nudge is
  transient and the a11y §12 ≥44px target wins over the 18px pointer-shadow of
  the transparent floor — same grammar as the ≤991 gutter marker).
- `.et-label` + `.et-mark` rects sit fully inside the rail box (labelInsideRail=true).
- Whole-document sweep of text leaves with `left < 30px`: only the rail's own
  label, the fixed bottom consent bar (different vertical band), and
  overflow-clipped off-screen role-card indices — no body text under the rail.

## Gates (worktree root)

- `npm run lint` → **0 errors**, 15 warnings (all pre-existing; none in changed files)
- `npm run typecheck` → clean
- `npx vitest run` (frontend) → **229 files / 2735 tests green**
  (2733 baseline + 2 new A8-prod pins; no test re-pinned — nothing pinned the
  removed strings; funnel pins untouched and green)
- `bash scripts/check-raw-css.sh` → PASS
- `agent-browser --session kill1 errors` → empty

## A8-prod — dev/prod gating

- Logic: `useState(SHOW_TEST_ACCOUNTS && demoOpenByDefault())` with
  `demoOpenByDefault = () => import.meta.env.DEV || VITE_SHOW_TEST_ACCOUNTS === '1'`.
- Live dev :5174/auth: panel open, 10 jobs (`.auth-demo-fill` count = 10).
- Production behaviour pinned by unit tests (`vi.stubEnv('DEV', false)` →
  collapsed chip; +`VITE_SHOW_TEST_ACCOUNTS=1` → open panel).

## Screenshots

1440: after-hero / after-problem / after-map / after-cta (+ after-footer from the
previous pass) · 390: after-hero / after-map / after-cta / after-auth ·
`before-*` twins from the pre-change state.

VLM spot reviews (glm-5v): CTA/problem/hero/map/phone — no clipped text, no
killed strings, no overlap defects; the rail's own label was misread once as
"overlapped" (it is the rail's content — containment proven numerically above).
