# REQUESTS — Agent 2 (shell/motion/logo) → Agent 4 (Web Product)

> R366 cross-boundary requests, each with the exact evidence and the
> precise change asked for. None of these were edited unilaterally.

## R1 · App-page scroll performance at 4×-throttled CPU (page-content side)

**What**: authenticated pages carry a per-frame style+layout cost during
scroll inside `.content` (the shell's one scroller — my lane, verified
clean: every shell scroll listener is rAF-batched and render-free since
the ScrollProgress fix in this branch).

**Evidence** (production build, `vite preview`, 4× CPU throttle, 28-wheel scroll, serial):
- `audits/evidence/r366/scroll-trace.json`:
  - `/student/dashboard@1440` — LoAF 14–32 (worst 66–96 ms), dropped frames 7–24
  - `/student/courses@1440` — LoAF 10–24 (worst 61–107 ms), dropped frames 3–16
  - `/student/library@1440` — LoAF 15–26 (worst 67–87 ms), dropped frames 3–16
  - the same pages @390 are 3–10× cleaner (LoAF 0–5) — the desktop-width layouts pay the cost
- LoAF phase attribution (CDP probe): all long frames are **style+layout dominant** — no script cost. Sticky table headers (`.table-wrap.sticky thead th`, components.css) and card grids re-layout as `.content` scrolls.

**The exact asks**:
1. `.table-wrap.sticky thead th` (components.css is yours per §4) — give the sticky header `contain: paint` (or move the sticky to `contain: layout paint` wrappers) so the per-scroll-frame relayout doesn't re-flow the table body.
2. Dashboard (student) at ≥1024: the chart canvases + card grid re-layout on every scroll frame under throttle; `content-visibility: auto` on below-fold cards (the landing's `strata.css §7-5` precedent) is the cheapest cut.
3. Course/library grids at 1440: same treatment for the below-fold rows.

**Done when**: the trace ratchet pins in `frontend/tests/e2e/r366-scroll-trace.e2e.ts` (app-page rows) tighten toward `loaf: 0 / worstFrame ≤ 50`; the run command is documented in that file's header (serial, preview build, `npm run test:r366`).

## R2 · Loader/skeleton timing contract (FYI)

`PageSkeleton` + the inner Suspense boundary are yours; my L5 audit
(loader coherence, `docs/redesign/r366/agent2-shell/LOADERS.md`) found
the current behavior consistent — no change requested. The only observed
gap is recorded there: the ≤150 ms skeleton-delay rule is not asserted
anywhere yet; when you land a delay guard for route loading states, the
shell's `PageTransition` will compose with it unchanged (the fade targets
`.content-inner > *`, so a delayed skeleton mount composes, not stacks).
