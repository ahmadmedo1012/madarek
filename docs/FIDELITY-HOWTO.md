# FIDELITY-HOWTO — the instruments, in one page

R369 agent A · the operator's guide to every fidelity/quality instrument in
this repo. Commands run from the repo root unless noted. Every tool prints
its own provenance; never copy numbers between rounds.

## The acceptance (amended 2026-11-19 — `docs/specs/heron-fidelity.md`)

One command prints the full table and exits non-zero on any unmet criterion:

```bash
node scripts/fidelity/accept.mjs                 # strict (unrated judge rows FAIL)
node scripts/fidelity/accept.mjs --pending-as-open   # development view
```

Current shape: T ≥95% overall / ≥90 per seat · Q = 100 verified · judge ≥4/5
per seat × primary breakpoint · zero overlap/clip · bundle ≤770 KB gz ·
landing CSS ≤601,352 B · landing words ≤1,118. **E is diagnostic only.**

## The judge pipeline (the amended visual bar)

```bash
node scripts/fidelity/judge-sheets.mjs           # rebuild sheets + ledger skeleton
```

- Builds triptych contact sheets `[Heron | ours | overlay]` from the
  committed capture (`docs/audit/evidence/capture.json` + crops under
  `evidence/primary/{reference,local}/` — local-only).
- All sheets → `docs/audit/evidence/.local/judge/` (gitignored);
  the primary set (390/768/1440) → `docs/audit/evidence/judge-sheets/`
  under a hard 1,536 KB budget (progressive quantization; refuses to fit
  below quality floors).
- The judge fills `docs/audit/evidence/judge-ledger.json`
  (`rating` 1–5 + `defects[]` per primary row); `accept.mjs` enforces ≥4.

## The conformance instrument (landing seats)

```bash
cd frontend && npx vite --port 53NN --strictPort &      # YOUR OWN port
node scripts/conformance/run.mjs --url http://localhost:53NN \
     --sections home-why-wrap,footer --bps 1440,390     # all 10 × 5 by default
node scripts/conformance/run.mjs --url ... --gate       # vs ratchet.json (monotonic)
node scripts/conformance/run.mjs --url ... --dark       # html[data-theme=dark] pairs
```

Per-page (role routes, hermetic — NO backend needed):

```bash
node scripts/conformance/pages-student.mjs --url http://localhost:53NN \
     --routes /student/dashboard,/training --bps 1440,768,390 [--dark] [--gate]
# + pages-teacher / pages-owner / pages-quality / pages-registrar / pages-authed
```

## The E/T/Q scorecard (the frozen-reference capture)

`scripts/conformance/fidelity.mjs` (wheel-driven reference protocol,
settled-height census, pair-validity law). Results land in
`docs/audit/evidence/{scorecard,capture,manifest}.json`; law tests:
`node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs`.

## Stress, overlap, motion

```bash
node scripts/conformance/stress.mjs --url http://localhost:53NN \
     [--sizes 320,360,390,412,640x360,844x390,1440]   # → evidence/stress.json
node scripts/qa/overlap.mjs --url http://localhost:53NN --routes / \
     --bps 1440x900,768x1024,390x844 --themes light,dark --out /tmp/overlap.json
node scripts/conformance/loaf.mjs                     # LoAF on the pinned build
node scripts/conformance/swipe.mjs                    # real touchscreen trace
```

## The repo gates (the ONE set CI runs)

```bash
bash scripts/verify.sh --fast      # tsc + vitest + bundle + stylelint/CSS ratchet (~4 min)
bash scripts/verify.sh             # the full set (~8 min) — lead/lander/medic only
bash scripts/gates/size-gate.sh    # file ≤500KB · docs ≤30MB · push adds ≤5MB to docs/
bash scripts/gates/pre-push-guard.sh   # the same gate against the remote tip (git hook:
                                        #   git config core.hooksPath .githooks)
node scripts/gates/copy-budget.mjs [--style enforce]   # per-page Arabic ratchet
node scripts/r321/rename-ledger-scan.mjs               # «الإدارة» terminology law
node scripts/qa/identity-guard.mjs                     # the ONE mark + banned names
bash scripts/deadcode/check.sh [--update]              # knip+jscpd+depcruise ratchet
```

## Evidence policy (LAW — see `.gitignore` R369 block)

Committed evidence = **JSON + ≤1.5 MB of contact sheets per push.** Per-state
captures and round-history media live under gitignored paths
(`docs/audit/evidence/.local/` and the in-place gitignored dirs) — never ride
a push; CI artifacts carry them when needed. The pre-push guard blocks a fat
push locally; the CI size gate blocks it remotely.

## Playwright browsers on the sandbox fleet

`PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers` (chromium-1200 symlink fallback).
WebKit is often absent → record it as a residual, never fake the number.
