# AGENT 2 · R366 — RESUME

## Environment & instruments (first ~35 min, time-boxed)

- Cloned `ahmadmedo1012/madarek` @ `7a097457` (matches the brief's verified state), branched `agent/r366-shell-motion-logo` off `origin/main`.
- Credentials saved to `~/.madarek-env` (chmod 600, never committed/printed).
- `npm ci` in the workspace (lockfile-respected; playwright 1.60.0 from the lock).
- **Playwright browsers**: the cache shipped `chromium-1200` but playwright 1.60.0 wants `chromium-1223`; installed it (`npx playwright install chromium`) — headless shell + full chromium now present. Everything that hardcodes `chromium-1200` still works (that build is also present).
- **Sandbox constraint discovered**: background daemons are reaped when a tool call ends — every long command (dev server + suite) must run inside ONE self-contained invocation (start server → run → teardown). Recorded here because it shaped every verification run below.
- Baselines executed and green at start: unit **3155/3155** (238.8 s), scroll-feel **30/30**, nav-audit green (0 icon drift, 0 duplicate glyphs).

## Agent skills from the brief (§6) — availability audit

- **Not available in this runtime**: `ponytail`, `caveman`, `gstack`, `ruflo`, `claude-mem`, `find-skills` — the runtime here is a different agent harness (Z.ai Code CLI); its skill registry does not carry those repos. Searched, not installable offline. Used instead: Playwright (bundled), `rg`, `jq`, `node`/`tsx`, existing repo instruments (below). No `web-search` skill in this harness either — GitHub skill installs are therefore SKIPPED — reason: not offered by the runtime — needs the owner to run this brief inside the Claude/agent environment those skills target.
- **Available and used**: Playwright + Chromium (visual/DOM probes), the repo's own gates (`scripts/qa/overlap.mjs`, `scripts/qa/nav-audit.ts`, `scripts/conformance/scroll.mjs`, `scripts/r323/*`, `scripts/r318/*`), `rg`/`jq`/`node`. `sharp`/`svgo`/`pixelmatch`/`apca-w3`/`culori`/`lighthouse` are not in the lockfile — new devDependencies were avoided (lockfile churn + the §3 lockfile rule); raster work rides Playwright screenshots (the repo's own r320/r323 precedent).

## What I reused vs built

- Reused: `scripts/r323/brand-assets.mjs` (master→asset regeneration), `scripts/qa/overlap.mjs --stress --seed`, `scripts/conformance/scroll.mjs feel|assert`, `useScrollRestoration`, `sheetLenis`, `loaderOrchestrator`.
- Built (all inside my ownership map): `scripts/r318/logo-audit.mjs`, `scripts/r318/scroll-trace.mjs`, `frontend/tests/e2e/r366-scroll-parity.e2e.ts`, `frontend/tests/e2e/r366-navigation-resilience.e2e.ts`, `docs/LOGO-SPEC.md`, `docs/SCROLL-ARCHITECTURE.md`, `docs/redesign/r366/agent2-shell/SHELL-MATRIX.md`, `docs/redesign/r366/agent2-shell/MOBILE-BOOT-SPEC.md`, `frontend/public/brand/email-logo.png` (+ the build step that emits it).

## L6+1 re-verification — instruments notes

- Long server-bound runs use a self-contained invocation with a BOUNDED inner `timeout` + explicit pkill of vite/chromium children (a bare run left browser children holding the call open past the tool's ceiling — the tests themselves had finished; the logs prove it).
- The conformance full matrix (10+ min on the dev server) runs against a production `vite preview` on :5344 — the same instrument the R364 baseline used.
- The trace ratchet pins are recalibrated to the spec's ≥1.4× law (see the spec header's L6+1 block for the two-run evidence and the old→new table).
- `npm install --no-save` (for the missing root eslint stack) re-resolved the tree WITHOUT the lockfile and bumped Playwright off its pin — `npm ci` restored the exact tree; rule learned: in this repo, always `npm ci`, never `install --no-package-lock`.
