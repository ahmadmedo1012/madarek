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

| 1fcaef41 | 🟡 branch green except bundle | A-usecase: colors/r306/strata/bundle-diet fixes on r337/usecase. REMAINING BLOCKER: bundle +375B gz over the 776 ceiling (spec content on a 30B margin; 40 build experiments found the floor). MERGE NEEDS: either a landing-family diet outside the branch's ownership or an owner decision on the ceiling. Conformance 82.9-91.4% (restore drift to reconcile — the mapping binding for row-title needs the label-form re-check). |

## Resume queue (next session, in order)
1. Bundle +375B: the floor is measured. Options: (a) diet HeroInspect/JourneyScene/LearningPlanDrawing (700-line SVG modules, no agent owns them yet), (b) owner decision. Do NOT merge r337/usecase to main until resolved (rule: never push red).
2. Reconcile the conformance restore: rerun `node scripts/conformance/run.mjs --sections home-usecase-wrap` on the branch dev server; if <90%, the fo-mono row-title edit broke a binding — restore e8253686's exact markup and re-apply only the colors fix.
3. Spawn intro/problem/why agents (worktrees wt-intro/wt-problem/wt-why exist at aaac8a4c) with the SAME brief as A-usecase + the bundle lesson: each section must land bundle-NEUTRAL (diet its own fat first — the ceiling has 30B slack).
4. Track B/C/E agents per OWNERSHIP.md.
