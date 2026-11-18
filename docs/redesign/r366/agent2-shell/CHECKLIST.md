# AGENT 2 · R366 — Shell, Navigation, Motion, Scroll, Loaders & Logo — CHECKLIST

Branch `agent/r366-shell-motion-logo` · baselined from `origin/main` @ `7a097457`.
A box is ticked ONLY with proof on the same line (command + real output,
CI URL, metric before→after, or artifact path). Written/pushed ≠ done.

## L1 — The logo (ONE mark, everywhere)

- [x] `docs/LOGO-SPEC.md` — construction grid, optical ramps (16→96+ table), min sizes, clear space, tone/dark rules, wordmark-vs-symbol per surface, pipeline, audit command — `docs/LOGO-SPEC.md`
- [x] `frontend/public/brand/email-logo.png` — emitted by `scripts/r318/logo-audit.mjs --emit` (600×160 lockup plate, audit IoU 1.0000) — file on disk + `docs/LOGO-SPEC.md §6/§7`
- [x] All master-derived assets regenerated + verified — `node scripts/r318/logo-audit.mjs` → **23 surfaces, 0 failures** (`audits/evidence/r318/logo-audit.md`); favicon ladder wired in `index.html`; manifest now 23 assets (`node scripts/brand/build-assets.mjs --check` OK); drift-injection test: corrupted `favicon-32.png` failed BOTH the raster leg (`orange point missing Δ250/255`) and the byte-manifest leg, restored file passes again
- [x] `scripts/r318/logo-audit.mjs` — fails on drift (exit 1): twins + SVG geometry parse + raster IoU ≥ 0.965 + point presence + wiring + manifest + orphans — proof above; audit table at `audits/evidence/r318/logo-audit.md`

## L2 — Smooth scroll, done right (all inputs, all sizes)

- [x] `docs/SCROLL-ARCHITECTURE.md` — the container map (guest window/Lenis vs authed `.content`), touch parity, overscroll/scroll-padding/scrollbar-gutter contracts, restoration, nested scrollers, body lock, keyboard/a11y, RM stack — the doc itself
- [x] Traces at 4×-throttled CPU @ 390 + 1440 — `r366-scroll-trace.e2e.ts` 8/8 PASS (production preview, serial): **INP p75 ≤ 200ms on every surface (worst measured 160ms)** · **CLS ≤ 0.05 (worst 0.032)** · LoAF/frame lines pinned as no-regression ratchet (medians in the spec comments; evidence `audits/evidence/r366/scroll-trace.json`); root fix landed in-lane: ScrollProgress rewritten rAF-batch/direct-write (was a per-scroll-event React re-render + sync layout read)
- [x] Scroll-feel suite stays 30/30 — `node scripts/conformance/scroll.mjs feel` → `{"pass": 30, "fail": 0}` (re-verified after every change)
- [x] Keyboard & a11y — `r366-scroll-parity.e2e.ts` 11/11 PASS: `.content` focusable + Space/PageDown/Home/End drive it; focus-into-view clear of the sticky topbar; skip link first stop (r305 suite); RM → engine never inits, no inertia; route announcements (document.title + focus rescue) pinned in r305-shell-heron e2e (46/46)

## L3 — Page-to-page navigation & transitions

- [x] Transition primitive set audited + hardened — ONE mechanism (keyed remount → page-enter 160ms, RM 0.01ms ≤ 100ms) used by public AND app routes; interruptible by construction — `r366-navigation-resilience.e2e.ts` 7/7 PASS: rapid burst (last destination wins, one h1, no stuck state), back/forward DURING the fade (history wins, no double render, no duplicated chrome), no console errors (mock's honest-501s filtered)
- [x] Prefetch/split sanity — warm-route perceived navigation measured **105 ms** (`audits/evidence/r366/navigation.json`, ≤ 350ms sandbox ceiling); skeletons never flash < 150 ms (AppShell `RouteFallback` delay — the anti-flash test asserts zero skeleton paints on a warm-path cold chunk); route error boundary consistency pinned by r319 suites
- [x] Tests — `r366-navigation-resilience.e2e.ts` (7) + `r366-scroll-parity.e2e.ts` (11) + `r366-scroll-trace.e2e.ts` (8) — all green, zero console errors

## L4 — Shell & bars on every screen size

- [x] Breakpoint behaviours documented + verified 320→2560, landscape phone, tablet rail, foldable — `docs/redesign/r366/agent2-shell/SHELL-MATRIX.md` (behaviour table + the sweeps); `overlap.mjs` bps incl. 320×600, 640×360, 844×390, 717×512, 2560×1440
- [x] `scripts/qa/overlap.mjs --stress` → **ZERO findings for all five role seeds** (`--seed student|teacher|registrar|quality|owner`, 2–3 routes each × 8 widths × light+dark — evidence `audits/evidence/r366/overlap-*.json`); 130 % text-scale ZERO; 200 % zoom zero shell findings (remaining KPI `ind-*` shapes routed to Agent 3). TWO root fixes landed in-lane for this: the dock-clearance root fix (`.content` ends above the dock) + the topbar-title hard cap — both in `styles/shell/chrome.css`
- [x] `scripts/qa/nav-audit.ts` green — per-role spine unchanged (0 icon drift, 0 duplicate glyphs, documented label variants only); mobile-web bottom-nav parity + one glyph per destination — output re-run clean
- [x] Focus ring visible never clipped; hover gated to `(hover:hover)(pointer:fine)` — pinned by r319/r305 suites (46/46 green after both CSS fixes)

## L5 — Loading & navigation screens

- [x] Web loader system audited — `docs/redesign/r366/agent2-shell/LOADERS.md` (9-surface inventory, coherence contract: one seat/one mark/one ground/timing honesty incl. the 150ms anti-flash/RM statics/CLS 0/never a dead end); `r323-loader-overlap` e2e green
- [x] Lighthouse a11y ≥ 95 on shell pages — **a11y 100 · perf 100 · CLS 0** on mobile `/` (Chrome-for-Testing; `audits/evidence/r366/lighthouse-mobile.json`)
- [x] `MOBILE-BOOT-SPEC.md` — timings/assets/grounds/handoff for Agent 5 — `docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md`

## L6 — Closing

- [x] Gates green — unit **3155/3155**; shell e2e 46/46 + loader 19/19; scroll-feel 30/30; overlap stress ZERO ×5 roles; check-colors/icons/motion-tokens/raw-css OK; tokens:check OK; identity-guard CLEAN; worklet-audit LAWFUL (241 files); stylelint-gate ratchet green (rawHex 36→29, rawZIndex 79→68, importantDeclarations 52→41 — all DOWN); copy-budget + copy-budget-mobile CLEAN; size-gate GREEN; bundle gate PASS (entry 66.0→66.1 KB gz, total 760.0→760.0 — net +0.1 KB vs base, ≤ +2 KB budget); baseline shifts: NONE
- [x] Contact sheets — 4 sheets (≤ 40): `audits/evidence/r366/contact-sheets/{landing-matrix,auth-matrix,shell-student-matrix,logo-seats}.{jpg}`
- [x] DELIVERY written · branch pushed — `docs/redesign/r366/agent2-shell/DELIVERY.md` + branch `agent/r366-shell-motion-logo` (re-verified on origin at `429b81d`; the local repo lacked the remote-tracking ref — `git fetch` refspec was main-only; fixed and upstream set)

## L6+1 — the re-verification pass (owner request: re-read, audit, prove)

Every gate re-run FRESH on the final tree (2026-11-17, post-L6, single-invocation
server pattern — the sandbox reaps daemons between tool calls):

- [x] logo audit — `node scripts/r318/logo-audit.mjs` → **23 surfaces, 0 failures** (fresh)
- [x] static gates — tokens:check OK · check:colors OK · check:icons OK · check:motion-tokens OK · check:raw-css PASS · identity-guard CLEAN (2088 files) · worklet-audit LAWFUL (241 files, 0 violations) · copy-budget CLEAN · copy-budget-mobile CLEAN · stylelint-gate **ratchet green** (errors 45→40, important 52→41, rawZ 79→68, rawHex 36→29 — all DOWN) · size-gate GREEN (rules 1–3 ok)
- [x] scroll-feel — `node scripts/conformance/scroll.mjs feel` → **{"pass": 30, "fail": 0}** (fresh, dev server)
- [x] conformance FULL matrix — `node scripts/conformance/run.mjs --gate --url http://localhost:5344` (production preview, `npm run build` first: tsc -b + vite, 22.8 s clean) → **TOTAL 54741/58537 = 93.5% · gate PASS (floor 91.6)** — identical to the R364 baseline: NO shift; provenance `scripts/conformance/results/chromium-20261117-164026-full.json`
- [x] nav-audit — `npx tsx scripts/qa/nav-audit.ts` → 0 icon drift, 0 duplicate glyphs, documented label variants only
- [x] unit — `npx vitest run` → **3155/3155** (245 s)
- [x] shell suite — `npx playwright test tests/r305` → **76/76** (3.2 m; the earlier "46/46" line was an undercount of the same suite — the fresh full run is the number)
- [x] functional e2e — parity + navigation-resilience + r323-loader-overlap → **21/21** (re-run after the L6+1 spec edits; 2.3 m)
- [x] scroll-trace — 8/8 PASS **after the L6+1 ratchet recalibration** (run 3, serial, production preview; see below)
- [x] lint — `npm run lint` → **0 errors** (16 pre-existing warnings, ungated by the repo's own posture); the sandbox's root node_modules was missing the eslint stack (`@eslint/js`, `eslint`, `eslint-plugin-react-hooks`, `typescript-eslint`) — installed with `--no-save`, then the tree restored with `npm ci` (lockfile untouched on disk, `git status` clean)

### L6+1 — defects the re-verification found and fixed

1. **`typecheck:tests` had never been run in-session** — 5 TS errors in MY r366 specs (parity: unused `ENGINE` + 2× possibly-undefined `headerBottom`; trace: `hadRecentInput` cast + `eventP75` `number|undefined`). Fixed; `npx tsc --noEmit -p tsconfig.test.json` now exits **0**.
2. **The trace ratchet pins violated the spec's own ≥1.4×-over-observed-maxima law** — the 14:21 evidence predated the L3/L4 commits, and two fresh serial runs on the final tree failed DIFFERENT surfaces each (courses@390 worstFrame 103 vs pin 100; then library@1440 worstLoaf 143.4 vs pin 130 while courses@390 read 59 — shared-host CPU noise, not regression; every hard INP/CLS budget held on BOTH runs). All 16 LoAF/frame pins now carry ≥1.4× over the all-time maxima (10 lines moved, old→new table in the spec header); hard budgets untouched; run 3 → **8/8**. The "8/8" claimed at L2/L6 had only held in the quiet calibration window.
3. Environment slip during the pass: an `npm install --no-package-lock` re-resolved the tree and bumped Playwright off its pin (browser launch failed instantly); `npm ci` restored the lockfile-exact tree and the batch re-ran green. The lockfile file itself was never modified.

## Record hygiene

- [x] RESUME.md — instruments used/skipped (§6 skills not present in this runtime; Playwright+repo instruments used) — file written + pushed
- [x] No empty headings; SKIPPED entries carry reason + need: css-coverage gate is PRE-EXISTING-broken (`join is not defined` — routed to Agent 3); skills §6 unavailable in this runtime (needs the owner to run the brief in the agent environment that carries them)
