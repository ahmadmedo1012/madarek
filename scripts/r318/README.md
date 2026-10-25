# scripts/r318 — the defect gate (R318 §B)

**gate:r318 is run by the foreman before every push. A red gate blocks merges.**

## Pre-push checklist (foreman)

1. **Build** (the gate builds nothing itself):
   ```sh
   cd frontend && npx vite build
   ```
2. **Serve** the built preview (from `frontend/`):
   ```sh
   npx vite preview --port 4180 --strictPort &
   ```
3. **Run the gate** (from the repo root):
   ```sh
   npm run gate:r318 -- --skip=ocr,perf   # cycle-1 shape (OCR owned by C3, perf by C2)
   # full mode (later cycles):
   npm run gate:r318
   ```
4. **Read the evidence**: `audits/evidence/r318/defect-gate.md` (+ `.json` twin,
   OCR shots under `audits/evidence/r318/ocr/`, JPEG q70, each <150KB).
5. **A red gate means**: fix the defect on your branch, re-run, paste the green
   table into the cycle report. Never push past a red gate; never delete a
   check to go green; never widen a threshold without a written reason in the
   cycle report.

## What it checks (per viewport × theme)

| check | what it enforces | failure shape |
|---|---|---|
| `word-integrity` | every `.wr`: `aria-label` == joined words (whitespace-normalized); every `.wr-w` has `aria-hidden="true"`; direction-aware inter-word visual gap ≥ 0.15em (RTL pair A,B → `A.left − B.right`) | glued words, missing aria, un-hidden word spans |
| `contrast` | every visible text node vs its effective backdrop (first opaque ancestor bg; translucent/`color-mix` layers composite over it), sampled at map-band scrub states `--jt-p` 0/0.5/1 with `.jt-intro[data-on=on]`; WCAG 4.5:1 <24px, 3:1 ≥24px. Unrevealed scrub words must be masked — visible low-contrast words fail | invisible-on-ink text (§A2/§A9 shapes) |
| `collisions` | text-bearing leaf rects must not intersect >2px²; no text rect may cross the viewport's left/right edge (tolerance 0). Decorative aria-hidden markers (`+`) excluded. Allowlist: `collision-allowlist.json` (written reasons required; edge crossings never allowlistable) | overlapping labels, clipped edge text (§A10 shape) |
| `placeholders` | `body.innerText` must not match `/--%\|undefined\|NaN\|lorem\|TODO\|\[object/i` | unfinished copy leaking to production |
| `overflow` | `documentElement`/`body` `scrollWidth` must not exceed `clientWidth` | horizontal leaks at any band (protects docH parity ≈12,340 @1440) |
| `ocr` | footer wordmark screenshot (1440 & 390, both themes) must read «مدارك» via tesseract `ara+eng` (TESSDATA_PREFIX, Arabic presentation forms normalized). **BLOCKED-with-reason when skipped**: `--skip=ocr` — §A6 wordmark rebuild owned by C3 (later cycle) | unreadable drafted wordmark |
| `perf` | CPU 4× throttle; rAF-delta sampling during a CDP wheel scroll of the full page; PerformanceObserver longtasks + layout-shift. Thresholds: ≥98% frames ≤20ms · 0 longtasks >50ms · CLS ≤0.05. **BLOCKED-with-reason when skipped**: `--skip=perf` — deep harness owned by C2 (cycle 2) — the scaffold must exist and run | jank, long tasks, layout shift |

## CLI

```
node scripts/r318/defect-gate.mjs
  [--viewports 360,390,768,1024,1440]   # widths; heights default 800/844/1024/768/900
  [--theme light,dark]                  # seeds localStorage madarek-theme (v2 shape) AND <html data-theme> init — see "How the theme flag actually works"
  [--skip ocr,perf]                     # skipped checks are reported BLOCKED-with-reason, never silently green
  [--perf]                              # explicit perf opt-in (on by default)
  [--base-url http://localhost:4180]
  [--out audits/evidence/r318/defect-gate.md]
```

Exit code **0** only when every non-skipped check passes; **1** on any FAIL;
**2** on harness errors. The `--skip` list is echoed into the evidence so a
"green" run with skips is never mistaken for a full pass.

## Files

- `defect-gate.mjs` — the gate (Node ESM, plain `playwright-core`, no new deps).
- `gate-lib.mjs` — the PURE math (WCAG contrast, RTL gap geometry, alpha
  compositing, Arabic OCR normalization), shared with the Vitest suite at
  `frontend/src/__tests__/r318/` so gate and tests can never drift.
- `collision-allowlist.json` — collision exceptions, written reasons required.
- Evidence: `audits/evidence/r318/defect-gate.md` + `.json` + `ocr/*.jpg`.

## How the theme flag actually works (measured)

The app stores its theme in `localStorage['madarek-theme']` as the
zustand-persist v2 shape `{"state":{"mode":"light|dark|system","modeUpdatedAt":0},"version":2}`;
on mount `useThemeSync()` (LandingPage) mirrors the resolved mode onto
`<html data-theme>`, which is what `tokens.css` keys on
(`[data-theme="light"]` / `[data-theme="dark"]` blocks — verified present).

The gate therefore seeds BOTH (belt & braces, both verified):

1. `localStorage['madarek-theme']` via `addInitScript` with the exact v2
   shape above — this is the one that wins long-term (the store re-applies
   it on every mount);
2. `document.documentElement.dataset.theme` via a second `addInitScript` —
   correct from the first frame even before React hydrates.

Verification that theming took: the dark cells measure different contrast
(worst seat 1.43:1 dark vs 1.15:1 light in the cycle-1 baseline) — if the
theme flag were ignored, both themes would report identical numbers.
