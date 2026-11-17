# R366 · Agent 1 — RESUME (living log)

Environment: sandbox /home/z, 2 CPU, 4 GB RAM, ~6.7 GB disk. Clone at /home/z/madarek
(full clone of ahmadmedo1012/madarek, branch agent/r366-heron-graphics from 7a097457).
Credentials: GITHUB_PAT saved to ~/.madarek-env (chmod 600) + git credential store
(/home/z/.git-credentials-madarek, chmod 600). Nothing committed, nothing printed.

## Tools & skills inventory (the §6 20–30-minute pass)

Found and usable here:
- git 2.47.3, node 24.22.3, npm 11.19.1, python 3.12.16, jq, rg, curl. bun exists but repo
  is npm-only (AGENTS.md:34) — npm it is.
- Network: github.com 200, heronaiapp.com 200, registry.npmjs.org 200 → live reference
  re-measurement (L1.1) is possible.
- Playwright: global install at /home/z/.npm-global (playwright 1.57) + Chromium 1200 +
  headless-shell in ~/.cache/ms-playwright — the conformance runner resolves it (its
  fallback path matches this box). Root `npm ci` running for vite/vitest/tsc.
- Existing repo instruments I will reuse (verified present): scripts/conformance/run.mjs,
  probe-r344.mjs (visual-twin predictor), mapping generators (gen-map-binding.mjs,
  build-{footer,intro,problem}-mapping.py, gen-chrome-mapping.py), overlap.mjs (+--stress),
  copy-budget.mjs, contrast-gate.mjs, check-{colors,raw-css,icons,motion-tokens}.sh,
  stylelint-gate, check-bundle-size.mjs, tests/e2e guest-landing + r308-landing-instruments.

Not found / not applicable (recorded per §6):
- ponytail, caveman, gstack, ruflo, claude-mem, find-skills: Claude-Code skill packs — no
  such runtime in this environment. Functional equivalents used instead: this repo's own
  instruments + subagents (Explore/general-purpose) for swarm research, filesystem records
  (CHECKLIST/RESUME/DELIVERY) for memory across interruptions.
- gh CLI: absent (AGENTS.md:208 confirms) — GitHub API via curl + token.
- WebKit: presence to be probed; if absent → RESIDUAL per AGENTS.md:203, never faked.
- Lighthouse: not a dep; will run via npx (no lockfile churn) — recorded in L5.

## Log

- [setup] env check: 2 CPU / 4 GB / 6.7 GB free. Tools verified. Network verified.
- [setup] clone (full, ~498 KB×? → on-disk OK), branch agent/r366-heron-graphics @ 7a097457.
- [setup] records skeleton written (CHECKLIST.md from §5, this RESUME, evidence/).
- [setup] root `npm ci` started (background, /tmp/npm-ci.log).
- [research] 3 Explore agents mapped: (A) conformance system — pair schema, modes,
  coverage math, per-section counts, traps (ratchet monotonic, partition guard, hero
  floor 11/cap 80 razor-thin, results files not mine to commit); (B) landing+public pages
  — section map, file inventory (landing 8,703 L; illustrations 2,871 L; landing CSS
  14,392 L), public page inventory, copy centralisation verdict, media inventory (r342
  webp set: several 100–325 KB files — over the ≤60 KB image budget, real L2 work);
  (C) gates manual — copy-budget before-numbers (my gated scope ≈ 2,264 words across 11
  files, every page at ceiling), bundle 774.0/92/110 with ~0.4 KB slack, stylelint axes
  (no growth), overlap allowlist law, graphics placement law (raw SVG only in
  illustrations/landing dirs), identity law.
- [L1] next: boot vite :5310, validate runner with scoped hero run, full baseline, then
  the measured-seat lift (hero first).
