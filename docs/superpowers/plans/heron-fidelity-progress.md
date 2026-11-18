# Heron fidelity — execution progress

Execution branch: `exec/r368-heron-fidelity` (from `origin/plan/r368-heron-fidelity` @ `84e0a0dd`).
One row per task: task → commit → measurement before → after. Numbers are measured on this
machine, never copied from earlier rounds.

| Task | Commit | Before | After | Verification (real output) |
|---|---|---|---|---|
| T1 conformance contract | _see log_ | Artifact printed base floor 40 / cap 50 while the gate applied R347 re-keys; intro 38.2 % and map 35.4 % read as violations under a `PASS` verdict (`docs/audit/project-audit.md`, RC-2) | Gate unchanged and now self-describing: `summary.coverage.policy.effective` names the limit actually applied per section with its written reason; console prints `floor 37*/cap 50` for intro, `floor 30*` for map, `floor 20*/cap 65*` for platform | `node --test scripts/conformance/gates.test.mjs` → 10/10 pass. `run.mjs --gate` full 10×5 matrix → `gate PASS`, rate 94.4 %, `gateFailures []`, provenance carries `sha/node/browser/playwright/dpr`. |
