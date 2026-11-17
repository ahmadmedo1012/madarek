# REQUESTS — Agent 2 (shell/motion/logo) → Agent 1 (Heron Experience & Graphics)

> R366 cross-boundary requests, each with the exact evidence and the
> precise change asked for. None of these were edited unilaterally.

## R1 · Landing scroll performance at 4×-throttled CPU (the L2 ideal line)

**What**: `frontend/src/styles/landing/**` (scrub/sticky band CSS) carries a
per-frame style+layout cost during scroll that keeps the landing above the
brief's ideal scroll line.

**Evidence** (production build, `vite preview`, CDP `Emulation.setCPUThrottlingRate 4`, 28-wheel scroll, LoAF = `long-animation-frame` entries, serial workers):
- `audits/evidence/r366/scroll-trace.json` — landing@390: LoAF 46–67 (worst 113–264 ms); landing@1440: LoAF 95–114 (worst 155–250 ms), dropped frames 87–104.
- LoAF phase attribution (probe): every long frame is **style+layout dominant** (`styleAndLayoutStart − startTime ≈ duration`, no script attribution) — the scrub bands re-layout as the window scrolls.
- The r318 defect gate's perf leg (your own gate, `scripts/r318/defect-gate.mjs --skip=ocr`) is RED on the landing at every viewport: 43–65 % frames ≤ 20 ms vs the ≥ 98 % pin, 16–33 longtasks > 50 ms per full-page scroll, CLS 0.0118–0.0561 (`audits/evidence/r318/defect-gate.md`).

**Why it matters**: the owner's §7 matrix demands scroll checks under low-end CPU throttling (4×); the app shell side is clean since the ScrollProgress fix (see R2's twin file for app pages), but the landing — the first page the owner sees — drops a third of its frames under throttle.

**The exact asks** (pick per the r316/r321 precedents already in the repo):
1. Audit the scrub bands' per-frame invalidation (`frontend/src/styles/landing/*.css` — the sticky/transform tracks): prefer compositor-only properties on scroll-scrub (transform/opacity), and `contain: layout paint` (or `content-visibility` — already used in `strata.css §7-5`) around the bands that still invalidate layout per frame.
2. The r318 gate's perf leg was shipped `--skip=ocr,perf` in cycle-1 with "perf owned by C2" — land the deep perf pass your gate always intended on the landing.

**Done when**: `node scripts/r318/defect-gate.mjs --skip=ocr` perf leg green at 360–1440, and the trace ratchet pins in `frontend/tests/e2e/r366-scroll-trace.e2e.ts` (landing@390/1440) tighten toward `loaf: 0 / worstFrame ≤ 50`.

## R2 · Conformance coverage honesty note (FYI, no file change requested)

The R366 brief's §1 read of `scripts/conformance/results.json` is yours to
carry (Agent 1 owns the conformance runner): the gate floor is 91.6 % with
overall coverage 45.8 % — the per-section coverage numbers are recorded
verbatim in my RESUME.md only as context; no edit requested.
