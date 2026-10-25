# R318 C2-P — smoothness CAUSES, isolated with numbers

- Build: commit `55afbae6`, `npx vite build` (dist rebuilt before every pass in this file).
- Harness: `scripts/r316/perf.mjs` (playwright-core, chromium-1223, CDP CPU throttle,
  Fast-3G for cold). Loader bypassed via `madarek-intro-skip=1` for interaction scenarios;
  cold runs are the shipped first-visit experience (loader ON).
- Evidence: `audits/evidence/r316/perf.json` (78 runs), `perf.md` (same data as tables),
  `noise-recheck.md` (3-run repeat of the @1440×1× cell: 14–24% >33ms spread ⇒ single-run
  cells carry ±3–4pt noise; deltas below are called against that band).
- Every "cause" below was tested with a disable-and-remeasure init-script CSS override
  (`--variant`), plus instrumented counters (gBCR wrap, setAttribute wrap, CSS-var wrap,
  `d`-attribute MutationObserver). No app code was touched.

## 0. The honest baseline (medians across runs)

| cell | %frames>33ms (active window) | p95 / max rAF (ms) | longtasks >50ms (total) | CLS | LCP (loader-skipped run) |
|---|---|---|---|---|---|
| 1440×900 · CPU 4× · wheel scroll | **71.1%** (~91/128f) | 100 / 200 | 63 / **5,067ms** | 0.007 | 0.26–1.84s (hero-lead / mark.svg) |
| 390×844 · CPU 4× · wheel scroll | **96.6%** (~121/125f) | 83.3 / 200 | 69 / **5,048ms** | 0.000 | 0.16–0.50s (mark.svg) |
| 1440×900 · CPU 1× · wheel scroll | 19.8% | 49.9 / 150 | 4 / 315ms | 0.007 | 0.26s |
| 390×844 · CPU 1× · wheel scroll | 2.8% | 16.8 / 66.7 | 2 / 154ms | 0.000 | 0.16s |
| touch scroll @4× (1440 / 390) | 60.4% / 94.8% | 100 / 383 | 165 / 12,824ms · 175 / 12,773ms | 0.007 / 0 | — |
| cold, loader ON, Fast-3G, 4× (1440) | 19.5% (whole load) | 50 / 450 | 20 / 2,123ms | 0.008 | **4.05s `div.fo-grain`** (grain webp) |
| cold, loader ON, Fast-3G, 1× (1440) | 3.7% | 16.8 / 116.7 | 1 / 99ms | 0.008 | 2.99s `h1.reveal-up.reveal-d-1.fo-hero-title` |
| cold, loader ON, Fast-3G, 1× (390) | 0.4% | 16.8 / 83.3 | 1 / 69ms | **0.037** | 2.80s `div.fo-grain` |

- Round-brief ballpark (87/243 and 86/224 frames >33ms; CLS 0.272@1440; LCP 11.5s
  loader-on) was **not reproduced** on the local preview: my wheel profile records fewer
  frames (the active window is 12 gestures × 80ms, not the whole tail), local preview
  serves assets without production RTT, and standard CLS excludes the input-adjacent
  shifts the brief counted. My numbers above are what this harness measures; deltas are
  the decision material.
- Loader timing (cold, Fast-3G): mounts 2.6–4.3s after DCL, exits 8.4–9.8s → **a ~5.5–5.9s
  gate on every fresh visit**. docH@1440 = **12,340px** in every cold run (protected band
  intact; 11,411px @390).

## 1. Ranked causes (each with its isolation delta)

### C1 — Scroll-frame main-thread work: the ONE rAF conductor + per-frame geometry/attr/var writes — the whole jank budget

- At 4×, the active scroll window (~2.2s @1440 / ~2.4s @390) carries longtasks totalling
  **5,067ms @1440 / 5,048ms @390** — the main thread is blocked for essentially the
  entire interaction; 63–69 longtasks >50ms per run; %frames>33ms 71.1% / 96.6%.
  At 1× the same scenarios are 19.8% / 2.8% — this is a **CPU cost, not a paint cost**.
- LoAF attribution (worst scripts inside long frames >100ms): `index-BP9ANi_U.js ::
  FrameRequestCallback` **1,732ms @1440 / 2,530ms @390** (the shared sheet clock +
  header/cursor callbacks), `react-*.js :: MessagePort.onmessage` 316/154ms,
  `LandingPage-*.js :: DOMWindow.onscroll` 90ms.
- Instrumented census per scroll run (`--grbc`, wrapper armed only during the run):
  - gBCR reads **4,585 @1440×4 (560/s)** / **3,619 @390×4 (466/s)**; at 1×: 6,772 @1440.
  - CSS-var `setProperty('--*')` writes **809 @1440 / 709 @390** per run.
  - SVG `setAttribute(d|points|transform|viewBox)` **168 @1440 / 307 @390**.
  - `d`-attribute MutationObserver: **0 mutations on `/` in every run** (see C4).
- Top gBCR readers: `li.reveal-up.reveal-d-*.rl-card` 474 reads each per run
  (reveal belt, C3), the useSheetScroll consumers ~160–170 reads each
  (`div.jt`, `div.wy`, `section#statement`, `div.jt-stations`, `div.jt-window.jt-cam`…).

### C2 — JourneyScene ≤991 branch: 2 extra reads per frame + an UNCONDITIONAL viewBox rewrite per frame (phone band is the worst cell: 96.6% >33ms)

Exact code (quoted for the fix):

`frontend/src/lib/motion/useSheetScroll.ts:62–67` (one read per frame per consumer):
```ts
    const run = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const traversalRaw = (vh - rect.top) / (vh + rect.height);
      const pinRaw =
        rect.height > vh ? -rect.top / (rect.height - vh) : traversalRaw;
```

`frontend/src/components/landing/journey/JourneyScene.tsx:367–374` (the ≤991 branch —
TWO more reads per frame on top of the hook's own):
```ts
      const stations =
        stationsRef.current ??
        (stationsRef.current = track.querySelector<HTMLElement>('.jt-stations'));
      const camEl =
        camElRef.current ?? (camElRef.current = track.querySelector<HTMLElement>('.jt-cam'));
      if (stations && camEl) {
        const sRect = stations.getBoundingClientRect();
        const cRect = camEl.getBoundingClientRect();
```

`frontend/src/components/landing/journey/JourneyScene.tsx:281` (the per-frame rewrite —
NOT idempotent; compare the guarded sibling write at :282–284):
```ts
  svg.setAttribute('viewBox', `${r[0]} ${r[1]} ${r[2]} ${r[3]}`);
  if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid slice') {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  }
```
- Measured: svg attr writes **168 @1440 → 307–417 @390**; the viewBox rewrite re-invalidates
  the full `LearningPlanDrawing` (1200×760 viewBox) inside `.jt-cam` every scroll frame;
  390 active-window %frames>33ms 96.6% vs 1440's 71.0%.
- `useSheetScroll.ts:97` registers `scroll` PASSIVE (verified) — the listener itself is
  fine; the cost is inside the frame it schedules.

### C3 — Reveal belt re-reads the whole unsettled registry per settle event

`frontend/src/hooks/useReveal.ts:83–92`:
```ts
const reconcileAll = () => {
  if (registry.size === 0) return;
  const due: RevealEntry[] = [];
  for (const entry of registry) {
    if (!entry.settled && entry.el.getBoundingClientRect().top < window.innerHeight) {
      due.push(entry);
    }
  }
  for (const entry of due) entry.reveal();
};
```
- ~35 `.reveal-up` elements on `/`; the census shows the rl-cards at **474 gBCR reads
  per card per scroll run** — the belt reconciles on every `scrollend` (and on `scroll`
  frames where `scrollend` is missing) even while the IO already answered.
- Batched read-then-write (no thrash inside one settle), but it is 30–45% of the ~4.6k
  reads per scroll run at 4×.

### C4 — First-visit gate: loader hold + cold JS payload + the auth idle-warm

- Cold Fast-3G: loader mounts 2.6–4.3s, exits 8.4–9.8s (**5.5–5.9s hold**, replays every
  fresh visit; C3-H observed the same on production).
- Cold-load JS actually fetched on `/`: **22 chunks — 738.0KB raw / 215.1KB gz**. The
  minimal render set is 9 chunks / **620.8KB raw / 180.4KB gz**; the extra **117.2KB raw
  / 34.7KB gz** is the auth family, warmed on idle:
  `frontend/src/pages/LandingPage.tsx:420–424`:
  ```ts
    const warm = () => {
      void import('./AuthPage').catch(() => undefined);
      void import('./RegisterPage').catch(() => undefined);
    };
    const idleId = ric ? ric(warm, { timeout: 4000 }) : window.setTimeout(warm, 2500);
  ```
- LCP element on cold load is **`div.fo-grain`** (the full-viewport grain layer, webp
  tile) at 2.8–4.0s — a decorative layer is the page's Largest Contentful Paint.

### C5 — Cold CLS at the phone band

- @390 cold: **0.033–0.037**, sources: `div.fo-hero-strip` (0.033),
  `section#statement.st-section` (0.033), `#node`/`div.sl-meta` (0.017) — late media +
  fonts reflow the hero strip and the statement band.
- @1440 cold: 0.007–0.008, source: `div.hydration-splash` (0.007) + hairline moves of
  `a.btn.accent.lg` / `nav.fo-nav` (input-adjacent, excluded from standard CLS).
- Interaction-window CLS (scroll/touch/menu/theme/route/typing): **0** at both viewports
  — nothing shifts under input; the brief's 0.177→0.272 attribution does not reproduce
  on the local preview (its elements would be the same seats: hero strip, statement,
  splash).

## 2. Hypotheses tested and CLEARED (the disable-and-remeasure deltas)

### H(a) `.fo-grain` — NOT a scroll-jank cause at 4×; IS the cold LCP element

`frontend/src/styles/landing.css:73–85` — full-viewport FIXED layer over the whole page:
```css
.fo-grain {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    url('/media/textures/grain-tile-light.webp'),
    url('/media/textures/micro-grid.svg');
  background-size: 256px, 24px;
  background-repeat: repeat, repeat;
  mix-blend-mode: multiply;
```
- `display:none` variant (grain-off): 71.0% → **75.3%** @1440×4, 96.6% → **96.8%** @390×4
  (both inside the ±3–4pt noise band; longtasks 5,040 → 4,859ms @1440). The blend layer
  costs the compositor, but at 4× the main thread is the bottleneck, not the blend.
- It IS the cold-load LCP (2.8–4.0s) — fix for LCP, not for jank.

### H(b) InkSketch mask `d` per scroll tick under the turbulence filter — NOT on `/` (zero)

- `InkSketch` mounts ONLY via the campus pages: `frontend/src/pages/campus/CampusPages.tsx:89–93`
  (`<MediaFrame … overlay={<InkSketch />} />`). Grep: zero `.inkm` on `/`.
- Measured: `d`-attribute MutationObserver = **0 mutations in every `/` run**;
  filter-off variant (`.inkm-sketch{filter:none}`) Δ = 71.0% → 71.5% @1440×4 (no-op,
  as expected — nothing to disable).
- The turbulence chain (feTurbulence .045/.055 + feDisplacementMap **scale 100** + blur
  1.8, mask rewritten per scroll tick) IS a live cost on `/campus` — separate workstream
  for the campus route (pre-rasterise or reduce scale/octaves there).

### H(c) Heavy ink SVGs — NOT a scroll-jank cause at 4×

- Census on `/`: **3,120–3,130 DOM nodes, 35 `<svg>`, 10 `<pattern>`, 107 `<path>`,
  0 `<filter>`, 0 will-change, 0 content-visibility, 0 contain** — the whole 12,340px
  page is one unfenced paint/layout domain (that explains the 1× p95 gap: 49.9ms @1440
  vs 16.8ms @390 — paint area, and why svg-off changes nothing).
- All SVGs `visibility:hidden` variant (svg-off): 71.0% → **73.8%** @1440×4; 96.6% →
  **93.5%** @390×4 — inside/at the edge of noise. No ancestor transform churn found per
  frame beyond the `.jt` CSS-var-derived scrub (idempotent dataset writes at :397–423
  are already guarded).

### H(e) What motion libraries actually load on `/` — NONE

- `grep` over `dist/assets/*.js`: **zero hits for `ScrollTrigger`, `gsap`, `GSAP`,
  `framer-motion`**. The only `lenis` hits are the in-house module name
  (`sheetLenis.ts` naming: 18 in the entry chunk, 1 in LandingPage) — no real lenis,
  no GSAP. Matches C3-H's finding: no ScrollTrigger pin on the reference/production;
  the pin is CSS sticky. Motion = one custom rAF conductor + CSS transitions + IO.

### H(f) Bundle truth (gzip -c | wc -c over dist)

- dist total: **144 JS chunks, 2,288.9KB raw / 703.3KB gz** — the r315 gate's
  **702.8KB gz claim CONFIRMED** (Δ 0.5KB = gzip impl detail).
- Entry chunk `index-BP9ANi_U.js` **274.2KB raw / 78.8KB gz** — 98.5% of the 80KB gz
  entry ceiling (no headroom; route-split must come from inside it).
- `/` route minimal render set (9 chunks): **620.8KB raw / 180.4KB gz**;
  observed cold-load fetch (22 chunks, incl. the idle auth warm): **738.0KB raw /
  215.1KB gz**.
- Split candidates, laziness VERIFIED: `charts-BcFORcBi.js` **191.74KB raw / 64.9KB gz**
  and `pdf-ksa_hnld.js` **334.08KB raw / 95.7KB gz** are NEVER fetched on `/` (absent
  from the recorded per-run `jsFetchedUrls`) — already lazy route chunks, correctly
  split. The remaining split candidates on `/` are the auth-family warm (34.7KB gz) and
  the entry chunk's shared deps.

## 3. Single highest-leverage fix

Make every scroll-frame write idempotent and cut the per-frame geometry to one batched
read: guard the `viewBox` rewrite (`JourneyScene.tsx:281` — string-compare like its
:282 sibling), reuse the hook's rect instead of re-reading `stations`/`camEl`
(`JourneyScene.tsx:373–374`), and let the reveal belt trust IO rects instead of
re-reading the registry (`useReveal.ts:87`). That work is 100% of the 4× jank budget
(5.0s of longtasks in a 5.6s window; 560 reads/s, ~4.6 var writes/frame) and it is
pure-main-thread, so it converts directly: 71.0%/96.6% frames>33ms at 4× is JS, not paint.
