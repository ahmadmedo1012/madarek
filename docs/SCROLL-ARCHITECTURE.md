# SCROLL-ARCHITECTURE — Madarek's scroll contract, documented and measured

> R366 Agent 2 · L2. Which container scrolls where, why, and what the
> proofs say. Every claim carries either a file pointer or a measured
> number with its harness.

## 1 · The two regimes (the container map)

| regime | scroller | who sets it | where it scrolls |
|---|---|---|---|
| **guest / public** (`/`, `/auth`, legal, help, about, colleges…) | the **window** (`document.documentElement`) | the platform's own layout | `lib/App.tsx` → `GuestLenisMount` gates by `isGuestWindowSurface(pathname, user)` |
| **authenticated app** (the shell) | **`.content`** (one element, `tabindex=0`, `role=region`) | `.has-shell` bounds html to `100dvh`; the body NEVER scrolls | `AppShell.tsx` (`main > .content`) |

The document never scrolls in the app regime — `useScrollRestoration`
restores `.content`, `history.scrollRestoration = 'manual'`
(`App.tsx` → `ScrollResetOnPush`), and every shell scroll listener
(`useScrollRestoration`, `useHideOnScroll`, `ScrollProgress`, the
topbar `scrolled` shadow) targets `.content` with a passive listener.

## 2 · The guest engine (Lenis 1.1.5, Heron parity)

`lib/motion/sheetLenis.ts` — ONE engine on the window, driven by the
shared conductor clock (`lib/motion/sheetConductor.ts`), zero awake
frames while idle:

- **params** (pinned by `tests/unit/r313-lenis.test.ts` + the scroll-feel
  suite + `r366-scroll-parity.e2e.ts`): `lerp 0.1`, `smoothWheel true`,
  `syncTouch true` (touch is synced, never smoothed — the 1.1.5 contract),
  `wheelMultiplier 1`, `touchMultiplier 1`, `infinite false`. Pointer
  class does NOT fork the engine — touch parity is explicit
  (`r366-scroll-parity.e2e.ts` asserts the same params at 390 and 1440).
- **reduced-motion: NEVER inits** — native scroll under RM (asserted).
- **scrollbar**: hidden while the engine is live
  (`html[data-lenis-on] { scrollbar-width: none }`, base.css); the
  reservation interplay is §4.
- **stale-clock discipline**: every (re)attach stamps the Lenis clock
  first (no snap across idle gaps); hidden tabs detach on
  `visibilitychange`.
- **scroll-lock pause**: the ref-counted body lock
  (`lib/scrollLock.ts` — `mdrk-scroll-locked` on html AND body) pauses the
  engine via a class observer (Lenis writes `window.scrollTo`
  programmatically — no overflow rule can stop it).
- **route exits**: `destroyGuestLenis()` on any non-guest surface.

## 3 · Nested scrollers (never chain the page)

Law: **a nested scroller absorbs its gesture at its end and never
scrolls the outer container.** Mechanism + proof:

| scroller | rule | proof |
|---|---|---|
| `.content` (app) | `overscroll-behavior-y: contain` (layout.css) + body `overscroll-behavior-y: none` (base.css — no pull-to-refresh chain) | `r366-scroll-parity.e2e.ts` §ONE-scroller: document frozen while content scrolls |
| `.sidebar-nav` | `overscroll-behavior: contain` (layout.css) | §no-chaining: wheel at the rail's end never moves `.content` |
| `.notif-panel-list` | `overflow-y: auto`, max-block-size 420px (notifications.css) | §no-chaining: wheel at the list's end never moves `.content` |
| dialogs / sheets / tables / chat lists | `overscroll-behavior: contain` per surface (ai.css, student.css, lecture-player.css, components.css ×2, landing sheets) | pinned by the same family of rules; the popover/dropdown primitives own their inner scrollers |

iOS Safari scroll-lock correctness: the lock is a CLASS on html+body
(`overflow:hidden` on both — the propagating pair), never an inline
style clobbered per-writer, so two overlays can never drop each other's
lock (`scrollLock.ts` contract, unit-pinned by `scrollLock.test.ts`).

## 4 · Bars, gutters, offsets

- **`scrollbar-gutter: stable`** on html (polish.css) — anti-CLShift on
  public/window-scrolled surfaces; **scoped OFF under the shell**
  (`html:has(.has-shell) { scrollbar-gutter: auto }`) because the shell
  has no document scrollbar — the reservation was a measured 10px phantom
  (drawer 10px short of the edge, `100vw` caps over-permitting).
- **sticky-bar offsets** — anchors land clear of the bars:
  `:target { scroll-margin-block-start: calc(var(--topbar-h) + var(--sp-4)) }`
  (base.css); the landing's own header uses `56px + var(--sp-4)`
  (landing/shared.css); the exam questions carry a responsive ramp
  (patterns.css `.oex-q`). Asserted end-to-end by the anchor tests in
  `r366-scroll-parity.e2e.ts` (engine live AND reduced-motion native).
- **scroll-behavior**: `auto` everywhere on html/body (the engine owns
  the guest animation; the RM belt re-asserts `auto !important`).

## 5 · Restoration, per route

| route change | behaviour | mechanism |
|---|---|---|
| PUSH / REPLACE | guest: window → 0 · app: `.content` → 0 | `ScrollResetOnPush` (`engine.scrollTo(0, immediate)` while live — the in-flight glide is NOT resynced by 1.1.5's onNativeScroll); `useScrollRestoration`'s else-branch |
| POP (back/forward) | the entry's saved offset returns | `useScrollRestoration` on `.content`: sessionStorage `madarek.scroll:<location.key>`, bounded re-apply watcher (60 settled frames + 10 s wall cap) that holds the offset through late content growth; user intent wins |
| full page load | the loader owns the seat (0) | `history.scrollRestoration = 'manual'` (R338 T-07) |

Measured: seat 600 → persisted 600 → restored 597 (±3 px relayout
drift) — asserted ≤ ±12 px in `r366-scroll-parity.e2e.ts` §restoration
(PUSH→top, POP→restore, FORWARD→top).

## 6 · Keyboard & announcements

- `.content` is the ONLY scroll container → `tabindex=0` +
  `aria-label="المحتوى الرئيسي"` (axe scrollable-region-focusable);
  Space/PageDown/PageUp/Home/End all drive it (asserted).
- The topbar title is `tabindex=-1`; orphaned focus after an SPA route
  change lands there (no focus ring on a -1 target, document.title +
  focus give SR users the page-change signal) — AppShell's focus rescue.
- Skip-to-content is the first Tab stop; Enter jumps to `#main`.
- Route-change announcements: `document.title` mirrors the resolved
  per-route title on every navigation (AppShell effect).

## 7 · Reduced motion (the whole stack)

RM ⇒ engine never inits (native scroll), ScrollProgress never arms,
reveal/sketch animations replaced by statics, and the global `0.01 ms`
belt backstops everything. No inertia, no smooth, no glide — asserted in
`r366-scroll-parity.e2e.ts` §reduced-motion and the RM belt suites.

## 8 · Measured (the trace harness)

`frontend/tests/e2e/r366-scroll-trace.e2e.ts` — production build
(`vite preview`), CDP **4× CPU throttle**, 28-wheel scroll dwell,
serial workers (`npm run test:r366`); evidence:
`audits/evidence/r366/scroll-trace.json`.

The brief's hard lines hold on every surface:
- **interaction p75 (INP) ≤ 200 ms** — measured worst p75: 160 ms (landing@1440)
- **CLS during scroll ≤ 0.05** — measured worst: 0.032 (landing@390)

The frame lines (no frame > 50 ms, zero LoAF) are **not yet met on the
page-content side** and are pinned as a no-regression ratchet while the
root work is routed to the page owners (REQUESTS-agent2-to-agent1.md /
REQUESTS-agent2-to-agent4.md):

| surface | LoAF (worst ms) | dropped frames > 50 ms |
|---|---|---|
| landing@390 | 46–67 (113–264) | 72–90 (worst 116–394) |
| landing@1440 | 95–114 (155–250) | 87–104 (worst 225–649) |
| dashboard@390 | 2–5 (56–102) | 6–11 |
| dashboard@1440 | 14–32 (66–96) | 7–24 |
| courses@390 / 1440 | 0–2 / 10–24 | 1–5 / 3–16 |
| library@390 / 1440 | 0–3 / 15–26 | 1–5 / 3–16 |

The shell's own scroll chrome is render-free since the ScrollProgress
fix (rAF-batched, one coalesced layout read per frame, direct style
write, zero React renders during scroll — before it, the app pages'
scroll windows carried 10–13 additional dropped frames). The residual
per-frame cost is page-content style/layout — every LoAF's phase
attribution is style+layout dominant with no script attribution.

Environment honesty: the same numbers on the DEV server are ~10× worse
(dev-mode React) and under parallel workers ±40 % noisier (CPU
contention) — the harness pins both facts in its header and the
ratchet carries ≥1.4× headroom over the cross-run maxima.

## 9 · Scroll feel (the Heron parity gate)

`node scripts/conformance/scroll.mjs feel` — **30/30 PASS** (verified
after every change in this branch: the ScrollProgress rewrite, the
favicon ladder, the loader audits).
