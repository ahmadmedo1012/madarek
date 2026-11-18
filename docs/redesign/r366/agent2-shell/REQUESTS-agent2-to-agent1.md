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

**Why it matters**: the owner's §7 matrix demands scroll checks under low-end CPU throttling (4×); the app shell side is clean since the ScrollProgress fix (see REQUESTS-agent2-to-agent4.md for the app pages), but the landing — the first page the owner sees — drops a third of its frames under throttle.

**The exact asks** (pick per the r316/r321 precedents already in the repo):
1. Audit the scrub bands' per-frame invalidation (`frontend/src/styles/landing/*.css` — the sticky/transform tracks): prefer compositor-only properties on scroll-scrub (transform/opacity), and `contain: layout paint` (or `content-visibility` — already used in `strata.css §7-5`) around the bands that still invalidate layout per frame.
2. The r318 gate's perf leg was shipped `--skip=ocr,perf` in cycle-1 with "perf owned by C2" — land the deep perf pass your gate always intended on the landing.

**Done when**: `node scripts/r318/defect-gate.mjs --skip=ocr` perf leg green at 360–1440, and the trace ratchet pins in `frontend/tests/e2e/r366-scroll-trace.e2e.ts` (landing@390/1440) tighten toward `loaf: 0 / worstFrame ≤ 50`.

## R2 · Landing overlap findings across the §7 matrix (stress sweep)

**What**: the R366 stress sweep (`scripts/qa/overlap.mjs --stress`,
production preview, light+dark — first time the matrix beyond the
r356 width set ran: 320×600, 640×360 landscape, 844×390, 717×512
foldable, 2560×1440) found landing-surface overlaps. None exist on any
app/shell surface (the five role seeds are all ZERO — see
`docs/redesign/r366/agent2-shell/SHELL-MATRIX.md`).

**Evidence** (full JSON re-runnable with the commands in SHELL-MATRIX.md;
findings summarised there under §public):
- **640×360 landscape phone** (both themes): the technical plates' mono
  registration labels overlap EACH OTHER —
  `MADAREK · CONCEPT FIELD` × `TRIANGULATION NET · 1 : 200` (frac 0.43),
  `MADAREK · ROUTE SURVEY` × `GATED ROUTE · RISE 188 U` (frac 0.43) —
  the labels' absolute seats collide on the 360px-tall band
  (`frontend/src/components/illustrations/technical/TechnicalPlate.tsx`
  + `illustrations/interactive/ConceptField.tsx` / `RouteSurvey.tsx`).
- **1280×800 / 1920×1080 / 2560×1440**: hero title `من المحاضرة إلى
  الإتقان` × the `[01]` index brackets (frac 1.0), `المكتبة والبحوث` ×
  the journey annotation `[04] المكتبة` (frac 0.38 — the r356-fixed
  shape returns at widths the old crawl never covered), `GATED ROUTE`
  label × lecture copy @1024.
- **1440×900 / 1920×1080**: `div.technical-sheet.technical-sheet--plan`
  flagged big-fixed (frac 0.078–0.108) — an intentional plate, likely
  allowlist material per the `overlap-allow.json` convention (written
  reason required), not a defect per se.

**The exact asks**:
1. The landscape-phone band (640×360) needs the mono label pair seated
   on separate rungs (the plates are absolutely positioned — one
   label's bottom clears the other's top by ≥ 4px).
2. The wide band (>1280) hero index brackets and the journey annotation
   seats need the same clip-aware treatment the r356 fix gave 1024×768.
3. Consider an `overlap-allow.json` entry with a written reason for the
   intentional `technical-sheet--plan` plate if it is design, or fix its
   `position` (fixed → absolute in-flow) if not.

## R3 · Conformance coverage honesty note (FYI, no file change requested)

The R366 brief's §1 read of `scripts/conformance/results.json` is yours to
carry (Agent 1 owns the conformance runner): the gate floor is 91.6 % with
overall coverage 45.8 % — the per-section coverage numbers are recorded
verbatim in my RESUME.md only as context; no edit requested.
