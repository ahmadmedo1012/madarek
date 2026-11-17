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

- [L1][HERO REBUILD LANDED] the measured plate furniture: 169 seats (chain 6 + 163 furniture) built from the frozen spec by scripts/conformance/gen-hero-furniture.mjs (new); HeroPlate.tsx (generated) + hero-plate.css (generated geometry+visuals, curated chain) + the section slide-under (hero-mechanics.css: the section seats under the in-flow masthead at the sheet-frame inset — the R347 D2×D4×spec reconciliation: net flow unchanged, the band returns inside the fold, sectionVh passes). Scoped matrix (5 bps): hero pass 57.7%→95.5% cell/@1440 and 94.8→95.5% aggregate; coverage 11.7%→64% (target ≥60 ✓); heuristic share 79.7%→22.6% (target ≤30 ✓); no-counterpart FAILs 171→0 (49+73 documented content excuses: the strip glyph/overflow mass + login internals + the R332 img). Known residuals: ~110 fails at 768/390 (path+ordinal cross-bp mispairs of corner/ruler seats — Δ≤17px over tol) + the band's pre-existing heuristic junk (interactive/color on the a[2] internals) + the h1 h-check (the Arabic lh floor: 126 vs 93 — structural, documented). The furniture renders at the reference's own at-rest register (86 seats at opacity .64, 14 at 0 — the frozen census AND the live re-measure agree; explains the R347 D4 'calm artwork' reading).
- [L1][gates] check-colors/raw-css/icons/motion-tokens PASS (hero-plate.css carries 8 inline color-gate allows; 1-line cross-boundary edit: check-motion-tokens.sh wholesale list + hero-plate.css — REQUESTS file to Agent 3 written); stylelint 41 ≤ baseline 45; typecheck 0; landing-funnel 23/23 green.

- [L5][L6][FINAL] the overlap sweep clean (the plate-dark trio re-nested like the spec tree — the flat layout had broken the opacity-0 inheritance and painted the tag text at rest); panel 60/60; the FULL CI-parity conformance (--gate --scroll --interact) = PASS 93.8%, scroll 30/30; frontend unit 3155/3155; all design gates green; DELIVERY written; branch pushed.
