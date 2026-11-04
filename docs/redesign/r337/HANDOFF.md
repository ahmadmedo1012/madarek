# R337 — Full Conformance + A Clean Repo · HANDOFF / LEDGER

Two tracks, one goal: ship conformed sections (weakest first) while a second
track makes the repo fast to work in. The honest conformance instrument from
R336 (39.6% baseline, ratchet gate in CI) drives Track A.

## Wave log (append-only; ≤10 lines per wave)

| sha | verdict | what |
|---|---|---|
| 10baee4c | 🔄 CI in flight | red-main fix: conform-gate ubuntu-24.04 pin (26.04 has no playwright 1.60 chromium) + r305 scroll window 4000→8000ms (path measured 4.3s in green CI; pin ±60px untouched) |

## State @ round start (main = 5327cb3f, verified)
- Conformance honest baseline 39.6% (ratchet.json; CI gate live). Weakest: usecase 10–13%, intro 24–31%, problem/footer/why 35–45%.
- CSS 43,428 lines / 109 !important (target ≤33,000 / 0).
- EXPO token: candidate 3 (Admin role) works — in /home/z/.madarek-env, never committed.
- Chrome spec files don't exist yet (matrix cells read `missing`) — extract this round.
