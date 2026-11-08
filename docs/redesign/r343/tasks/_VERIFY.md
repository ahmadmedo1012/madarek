# R343 wave-end verification protocol (orchestrator/reviewer — NOT for authoring agents)
Run on the merged tree (`/home/z/wt/r342-integration`, branch `wip/r342-integration`), browsers idle (≤3 chromium box-wide):

1. Boot: `cd frontend && (nohup npx vite --port 5173 --strictPort > /tmp/vite-base.log 2>&1 &)`; wait for 200.
2. Chunks: `source /home/z/.madarek-env && node scripts/conformance/run.mjs --url http://localhost:5173/ --sections footer --bps <bp> --out /tmp/merges/f-<bp>.json` for bp in 390 768 1024 1440 1920, then the same for `home-intro-wrap` → `i-<bp>.json` (sequential, ~15-60 s each; record cov/meas/skip/exc per bp).
3. Aggregate check (same formula as run.mjs): coverage = Σmeas / (Σmeas + Σskip + Σexc×12) per section over the 5 bps. Floor: ≥ 40.0 both sections. Baseline before wave: footer 36.7 / intro 37.0 (full-matrix numbers; 390/1440 partials: footer 45.8/31.5, intro 35.2/36.5).
4. Quality: `passRate ≥ 91.8` equivalent per-section (no binding may add failing rows — if a new binding fails at any bp, fix its CSS or drop the binding (coverage unchanged — dropping only re-excuses); NEVER touch the gate/tolerances).
5. Junk audit: `git diff b9fac97a..HEAD -- frontend/src/components/landing` — no empty divs without semantics, no duplicate hidden copies, no 0×0 boxes; every new data-spec appears exactly once per render.
6. `npm run typecheck -w frontend && npx eslint frontend/src --max-warnings 0 2>&1 | tail -3` clean; `TZ=UTC npx vitest run --silent` no new failures (run only when matrix idle, memory ≥ 800 MB free).
7. Record numbers in `docs/redesign/r343/WAVE-REPORT.md` (≤40 lines): per-bp cov table, total bound elements added, dropped bindings, residuals.
