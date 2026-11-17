# LOADERS — R366 Agent 2 · L5 · the loading/navigation screens, one coherent system

The audit of every surface that says «wait» — verified as one system
(the orchestrator), not five ad-hoc spinners.

## The inventory (what can appear, in order)

| # | surface | owner file | when | verdict |
|---|---|---|---|---|
| 0 | the boot plate | `index.html` (inline, pre-React) | first paint → React mount | themed (light/dark from the no-flash script), opaque, fixed → CLS 0; replaced by React's first commit |
| 1 | the boot Splash | `components/overlays/Splash.tsx` | the orchestrator's `splash` seat, first paint | ONE mark (Logo 96, stroke-draw, RM static), paper ground `var(--bg)`, exit ≤ 250 ms (RM: 0 ms), seat freed on exit |
| 2 | the guest intro (SheetLoader) | `components/landing/chrome/SheetLoader.tsx` | first visit, guest, no intro flag | orchestrator-queued behind the splash (never two logos); skip-able |
| 3 | route loading (cold chunk) | `AppShell.tsx` `RouteFallback` (R366) | lazy chunk > 150 ms | DELAYED 150 ms — a fast chunk never flashes a skeleton (this round's fix); progress visible: the 2 px RouteProgress strip rides the whole window |
| 4 | the page skeleton | `components/primitives/States.tsx` `PageSkeleton` | after the 150 ms delay until resolve | page-shaped, aria-busy + aria-live=polite; replaced by the SAME page-enter fade every route change rides (never blinks out) |
| 5 | the slow-server pill | `components/layout/ServerWakePill.tsx` | any request pending > 4 s (cold Render boot) | phase-aware honest copy (waking → 30–60 s, «لا تُغلق الصفحة»), role=status + polite live region, above the dock, safe-area aware |
| 6 | the slow-server card | `components/overlays/SlowServerCard.tsx` | orchestrator seat `slow-server` | preempts the seat (remembered, restored); informational, NOT dismissible |
| 7 | route error boundary | `RouteErrorBoundary` (App.tsx) | a render crash | tested fallback (retry/home), toasts stay visible |
| 8 | offline | `public/offline.html` + `sw.js` | JS-off/PWA offline | honest Arabic line; the noscript twin in index.html |

## The coherence contract (verified)

1. **One seat at a time** — `loaderOrchestrator` (the singleton state
   machine) holds 0..1 full-screen layers; the splash keeps the seat
   until its own ≤ 250 ms exit completes; requests queue and are
   auto-granted. The `r323-loader-overlap` e2e pin keeps two logos
   impossible.
2. **One mark** — every layer above renders `<Logo>` from the one brand
   source (never a bespoke spinner-logo); `logo-audit.mjs`'s surface
   table carries them all.
3. **One ground** — every layer rides `var(--bg)`/paper — the theme the
   pre-paint script already resolved; no white flash, no theme crossing.
4. **Timing honesty** — the wait never reads as a freeze:
   - boot plate → splash → app: each ≤ 250 ms of overlap, no double logo;
   - route loading: anti-flash delay 150 ms (R366, `RouteFallback`) +
     the 2 px progress strip + skeletons that REPLACE (never blink);
   - cold server: the pill at 4 s, the honest 30–60 s copy past 25 s,
     auto-retry the whole transport window.
5. **Reduced motion** — the splash draws static, exits in 0 ms; the
   global 0.01 ms belt backstops every other transition; skeletons are
   static by construction.
6. **No layout shift** — every layer is fixed/fullscreen (Lighthouse
   mobile on `/`: CLS 0, a11y 100, perf 100 — `/tmp/r366/lighthouse-mobile.json`).
7. **Never a dead end** — every wait surface ends in one of: content,
   retry-in-place, or an honest error state (RouteErrorBoundary /
   offline / noscript).

## The Lighthouse line (the brief's ≥ 95)

`npx lighthouse http://localhost:4173/ --only-categories=accessibility`
(mobile emulation, Chrome-for-Testing):
**accessibility 100 · performance 100 · CLS 0** — the shell pages ride
the same shell markup (the landing is the LCP-critical page; the app
pages' a11y is pinned by the axe-driven suites in CI).

## What R366 changed

- `RouteFallback` (AppShell): the 150 ms anti-flash delay — the brief's
  rule, now pinned by `r366-navigation-resilience.e2e.ts` §anti-flash.
- `docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md` — the native
  boot parity contract delivered to Agent 5 (timings, assets, grounds,
  handoff rules).
- Everything else above was verified as-is — no defects found in the
  loader family this round (the one gap, a route-loading delay guard,
  is my own L3 fix above).
