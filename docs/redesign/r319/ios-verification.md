# R319 iOS verification — real WebKit in CI, Chromium iPhone truth locally

Task `c2-G3` (§C6 of the R319 brief + §H-3 exit criterion "WebKit-iPhone
run included"). This is the strategy doc for how iOS-class verification
is delivered: **the dev sandbox cannot launch Playwright WebKit** (host
missing `libgtk-4.so.1`, `libgraphene-1.0.so.0`, gstreamer libs; no
root to install them — the WebKit 2287 build IS downloaded under
`~/.cache/ms-playwright/webkit-2287` but cannot start), **GitHub CI
can**. The decision (foreman, cycle 2 dispatch): deliver the WebKit run
INTO CI and the maximum iOS-truth available locally (Chromium
iPhone-13 emulation). Do not re-litigate.

## The three layers

| Layer | Where | Engine | What it catches |
|-------|-------|--------|-----------------|
| `chromium-iphone` project | local (and CI via `test:e2e` collection) | Chromium 148 + iPhone 13 descriptor (390×844 screen / 390×664 viewport, touch, isMobile) + CDP `(hover:none)/(pointer:coarse)` media emulation | The full contract suite: tap sticky-hover ghost (B1), contrast math, shell geometry, drawer reachability, stylesheet contracts (dvh, safe-area, tap-highlight, overscroll), input zoom guard, bar no-jump |
| `webkit-iphone` project | GitHub CI job `ios-webkit` only | **Real WebKit** (Playwright WebKit 2287, Safari-class), same device descriptor, native touch media | Everything above on Safari's engine + the things ONLY real WebKit shows: Safari's own `dvh`/collapsing-toolbar resize behavior, its sticky-hover quirks, its font hinting/rasterization, `-webkit-` prefix behaviors |
| Static contracts (both engines) | in-suite | engine-agnostic CSSOM + computed reads | Contracts that are engine-independent by construction: `100dvh` (no bare `vh`) on the drawer, `env(safe-area-inset-bottom)` in the bar's rules, doc-level `-webkit-tap-highlight-color`, `overscroll-behavior: contain`, inputs ≥16px |

### The contracts (what the suite asserts — 8 tests, light + dark)

The spec is `frontend/tests/e2e/r319-ios-contracts.ios.e2e.ts` (matched
only by `/\.ios\.e2e\.ts$/`); helpers live in
`frontend/tests/ios/ios-contracts.ts` (engine-agnostic — mock transport
via `page.route`, state via `addInitScript`, no CDP on the shared path;
the ONE engine branch is the Chromium-only CDP media emulation).

**B1 — the drawer (the owner's first screenshot, re-shot):**

1. every `.nav-item` label ≥ **4.5:1** against its effective ground at
   rest (in-page WCAG luminance, computed values), light + dark;
2. the owner's exact row «مقرّراتي الدراسية»: transparent ground at
   rest, ≥4.5:1;
3. a REAL programmatic `:hover` under `(hover: none)` paints **no wash**
   (the sticky-hover ghost mechanism);
4. a **TAP** (touch events, not click) on the row: still no wash, label
   still ≥4.5:1 — the B1 defect (≈1.1:1 before C1-A) stays dead;
5. evidence frames `drawer-{light,dark}.png` (plain PNG, fullPage false,
   never pinned — cross-engine font hinting makes pixel pins lie).

**B2 — the dashboard shell (the owner's second screenshot, re-shot):**

6. bottom dock computed background **alpha === 1** (opaque theme paper —
   page text never reads through) and the content column reserves
   `padding-bottom ≥ bar height + 8`;
7. the drawer list is fully reachable: `.sidebar-nav` is a real scroller
   (`overflow-y: auto`), `scrollHeight ≥ clientHeight`, the LAST group
   label sits fully inside after `scrollIntoView` (the
   «المصفوفة التعليمية» clip is dead), `overscroll-behavior: contain`;
8. safe-area: `env()` resolves to 0 in emulation, so the contract reads
   the RULE — a `.bottom-nav` rule must carry
   `env(safe-area-inset-bottom)` (searched on the rule's specified
   `cssText`: CSSOM item iteration empties var()/env()-pending
   shorthand longhands on Chromium, the specified text keeps them
   verbatim on every engine);
9. fixed bars don't jump: the bottom bar's bbox `y` is identical across
   a full drawer open + close round-trip;
10. evidence frame `dashboard-390.png` (light).

**iOS static contracts (engine-agnostic stylesheet + computed reads):**

- (a) `100dvh` on the drawer (a dvh height rule exists) and **no bare
  `vh` unit on any `.sidebar` rule** (unit-token scan of each rule's
  specified cssText);
- (b) Safari zoom-on-focus guard: every `input`/`select`/`textarea` on
  the student dashboard computes **≥16px** (iOS never zooms on focus);
- (c) `-webkit-tap-highlight-color` is set (the doc-level `html` rule
  from base.css counts — no grey tap flash);
- (d) `overscroll-behavior: contain` on the drawer scroller (computed);
- (e) position:fixed bars don't jump across the drawer round-trip
  (behavioral, in B2 above).

### What each layer catches / misses

- **Chromium misses** (why the CI WebKit job is non-negotiable): real
  Safari `dvh` toolbar-collapse math (Chromium emulates the viewport,
  not the toolbar behavior), Safari's sticky-`:hover` timing after tap,
  Safari text rendering/hinting at 3× DPR, `-webkit-` prefixed
  behaviors, iOS input zoom heuristics on real focus.
- **WebKit-in-CI misses**: real-device GPU/touch latency, physical
  safe-area insets (runner has none — hence the RULE-based contract),
  real iPhone Safari UI chrome. Those stay with the owner's device +
  the §H-5 re-shoot on production.
- **Both engines share** every contract the suite asserts — which is
  why the suite is written engine-agnostic first and the Chromium layer
  is the local truth, not a proxy guess.

## How to run

Local (the sandbox recipe — Chromium iPhone truth, WebKit skips green):

```bash
cd frontend
npx vite --port 4225 --strictPort &          # your own dev server
MADAREK_IOS_SKIP_UNSUPPORTED=1 \
MADAREK_E2E_BASE_URL=http://localhost:4225 \
  npx playwright test --project=chromium-iphone
# → 8 passed (~29s). Verified 8/8 on 2026-03 cycle-2, r319/g3.
```

Without `MADAREK_E2E_BASE_URL` Playwright's `webServer` boots the Vite
dev server itself (`npm run dev`, :5173) — that is exactly what CI does.

WebKit locally on a host that CAN launch it (not this sandbox):

```bash
npx playwright test --project=webkit-iphone   # no skip env, real run
```

On hosts that cannot (this sandbox — missing libgtk/libgraphene):

```bash
MADAREK_IOS_SKIP_UNSUPPORTED=1 npx playwright test --project=webkit-iphone
# → 8 skipped, reason: "WebKit unavailable on this host"
# Also automatic: a WebKit LAUNCH FAILURE converts to the same skip
# (verified live: missing-libraries error → skip, suite exits green).
```

The `e2e` project (desktop chromium) also matches `*.ios.e2e.ts` by its
broader `/\.e2e\.ts$/` testMatch — the spec self-skips there with
`iOS contracts run only on webkit-iphone / chromium-iphone` (verified:
8 skipped with that reason), so `npm run test:e2e` never duplicates the
suite on the desktop project while still collecting `chromium-iphone`.

## CI — the `ios-webkit` job (`.github/workflows/ci.yml`)

- `runs-on: ubuntu-latest`, `timeout-minutes: 12`, gated
  `if: github.event_name == 'push'` (the WebKit download is the heaviest
  browser install in the pipeline; PRs ride the lighter lanes and still
  get the shared contracts via `chromium-iphone` inside the `e2e` job's
  `npm run test:e2e`).
- Steps follow the existing `e2e` job's conventions exactly: checkout →
  setup-node 22 (npm cache) → `npm ci` →
  `npx playwright install webkit --with-deps` (working-directory:
  frontend) → `npx playwright test --project=webkit-iphone`
  (working-directory: frontend) → failure-only artifact upload
  (`playwright-ios-webkit-failures`, `frontend/test-results/`,
  7-day retention) — same policy as the e2e job.
- `MADAREK_E2E_BASE_URL` stays UNSET (like the e2e job) so Playwright's
  `webServer` boots the Vite dev server; every `/api/` call rides the
  fixture transport (hermetic — no backend, no DB, no network).

## Evidence (the owner's two screenshots, re-shot — BEFORE note)

Post-C1 state (B1 fix live, B2 dashboard rebuild NOT yet merged — this
cycle's G2 lane), captured on `chromium-iphone` at 390, committed under
`audits/evidence/r319/ios/`:

- `drawer-light.png` / `drawer-dark.png` (92KB / 88KB, 1170×1992 @3×):
  the drawer open at rest — hairline rows, mono `[01]` gutter indexes,
  ink scrim, opaque paper. This is the AFTER of the owner's ghost-row
  screenshot (the pale-row defect itself was C1's BEFORE; the Cycle-1
  board already carries the 1.06:1 → 13.57:1 numbers).
- `dashboard-390.png` (140KB): the student dashboard at 390 — opaque
  bottom dock, square cells, square avatar. The B2 sheet-chrome rebuild
  (frame/grain/mono index/indicators) lands with G2 this cycle; this
  frame is the honest post-C1 baseline for it.

Runtime (unpinned) copies land in
`frontend/tests/e2e/__screenshots__/r319-ios/` — gitignored, for local
inspection and CI failure artifacts only.
