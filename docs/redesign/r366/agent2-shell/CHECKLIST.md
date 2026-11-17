# AGENT 2 · R366 — Shell, Navigation, Motion, Scroll, Loaders & Logo — CHECKLIST

Branch `agent/r366-shell-motion-logo` · baselined from `origin/main` @ `7a097457`.
A box is ticked ONLY with proof on the same line (command + real output,
CI URL, metric before→after, or artifact path). Written/pushed ≠ done.

## L1 — The logo (ONE mark, everywhere)

- [ ] `docs/LOGO-SPEC.md` — construction grid, optical size ramps, min sizes, clear space, colour variants, dark-mode rules, wordmark vs symbol per surface
- [ ] `frontend/public/brand/email-logo.png` — absolute-URL-ready PNG for e-mail (regenerated from the master via the brand build)
- [ ] All master-derived assets regenerated + verified: favicon.svg + 16/32/48 PNG/ICO, apple-touch 180, PWA 192/512 + maskable, manifest, theme-color light/dark, OG/Twitter 1200×630, mobile icon/adaptive/splash/notification PNGs, in-app header logo
- [ ] `scripts/r318/logo-audit.mjs` — fails on drift (hash/geometry) — one-logo audit table (surface → asset → size → verdict) with zero inconsistencies

## L2 — Smooth scroll, done right (all inputs, all sizes)

- [ ] `docs/SCROLL-ARCHITECTURE.md` — container map (document vs sheet), Lenis seat + touch parity, overscroll-behavior, scroll-padding, scrollbar-gutter, anchors, restoration per route, nested scrollers, body scroll-lock incl. iOS
- [ ] Traces at 4×-throttled CPU @ 390 + 1440 — long-animation-frames, dropped frames, INP on landing + three app pages; no frame > 50 ms during scroll; INP p75 ≤ 200 ms
- [ ] Scroll-feel suite stays 30/30
- [ ] Keyboard & a11y: Space/PageUp/Down/Home/End, focus-into-view with sticky bars, skip-to-content, reduced-motion → no inertia, route-change announcements

## L3 — Page-to-page navigation & transitions

- [ ] Transition primitive set audit: enter/exit fade interruptible, no double-render flash, no layout jump, focus correctness after navigation, reduced-motion ≤ 100 ms instant fade, low-end CPU fallback, duration/easing from motion tokens
- [ ] Prefetch / route-split sanity: visited-route perceived navigation ≤ 100 ms measured; skeleton delay ≥ 150 ms (no flash) + min display; error-boundary states consistent
- [ ] Playwright e2e: rapid navigation, back/forward mid-transition, deep links, reduced motion — no console errors

## L4 — Shell & bars on every screen size

- [ ] Breakpoint behaviours documented + verified 320→2560, landscape phone, tablet rail, foldable
- [ ] `node scripts/qa/overlap.mjs --stress` → ZERO findings, all five roles (`--seed student|teacher|admin|quality|owner`), incl. open popover/dialog states + 200 % zoom
- [ ] `scripts/qa/nav-audit.ts` green — per-role spine contract unchanged, one glyph per destination, labels unchanged, mobile bottom-nav parity
- [ ] Focus ring visible never clipped; hover gated to hover-capable devices

## L5 — Loading & navigation screens

- [ ] Web preloader/BrandLoader, route loading, server-wake, offline — one coherent system audited: timing, no flash, no layout shift, honest minimum perceived wait, reduced-motion
- [ ] Lighthouse a11y ≥ 95 on shell pages (mobile `/`)
- [ ] `docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md` — timings/assets/backgrounds/handoff for Agent 5

## L6 — Closing

- [ ] All gates green (baseline shifts listed only): scroll-feel 30/30, stress zero, unit suite green, affected e2e green
- [ ] Contact sheets (≤ 40) for the §7 matrix
- [ ] `DELIVERY.md` written · branch pushed

## Record hygiene

- [ ] RESUME.md — what I used, what I could not find (first 30 min)
- [ ] No empty headings; SKIPPED — reason — needs decision
