# R343 — CLOSE, MERGE, CLEAN (working plan)
Start 2026-11-08. Orchestrator + sub-agents. Phase A on `wip/r342-integration` (PR #45); after Phase B, short `wip/r343-*` → `main`.

## Ground truth (re-verified 2026-11-08)
- `main` = 620a31ec · PR #45 head b8755850, open, mergeable, base 620a31ec.
- Only red: coverage floors `footer` 36.7% · `home-intro-wrap` 37.0% vs floor 40 (run.mjs:151).
- Lift budget: footer +543 measured checks ≈ 45 elements (222 unmapped spec paths); intro +762 ≈ 64 elements.
- Ratchet rate 91.8 · bundle 758.9 KB gz (ceiling 770) · CSS on PR 47,405 lines (target ≤33,000, `!important`→0).
- Origin branches: 22 non-main (11 r342-* in PR; 9 legacy 0-patch; `wip/l2d` 2 patches; `wip/sec-map` 1).
- Box: 2 CPU/4 GB · PW 1.60 chromium_headless_shell-1223 ✓ · npm ci done in /home/z/wt/r342-integration.

## Method (all phases)
Sub-agent = one task file in `docs/redesign/r343/tasks/`, own worktree `/home/z/wt/<ID>`, branch `wip/r343-<ID>`, vite port 52xx, commit ≤5 min + push. Merges by orchestrator; every merged batch reviewed by an agent that did not write it. Evidence: numbers from commands run on the final tree, never worker claims; `verify.sh` never piped.

## Waves
- **W1 (running):** A-F1..A-F4 (footer subtrees) · A-I1, A-I2 (intro subtrees) · C1 imagery inventory (analysis) · D1 css dead tooling (build+subset crawl).
- **W2:** merge W1 → reviewer; census-driven follow-ups A-F5+/A-I3+; repo-weight prune (results/*.json keep-latest); chunked full matrix; `verify.sh --fast`.
- **W3:** if floor <40 after two waves → FLOOR-PROOF.md + the one authorised fallback; else Phase B merge commit → CI → Render smoke; from then all work on `wip/r343-*`.
- **W4+:** Phase C imagery (delete/replace; 29 university SVG cards, Playwright product plates, r342 illustration reuse, OG art, mobile copy) → Phase D css demolition (baseline → dead.mjs full crawl → batched deletes, regression ≤0.1%) → Phase E blind panel (capture fix, Heron calibrate ≥80/84, 3 judges, ≥72/84) → Phase F mobile (doctor/tsc/jest/lint, art, one production OTA) → Phase G single `main` + REPORT/HANDOFF.

## Numbers that end each phase
A: no `coverage:*` fail, rate ≥91.8, verify fast+full exit 0, unit 3040/1998, E2E 157+76, bundle ≤770, CI green. B: merge commit on main, CI green, live smoke. C: 0 dangling refs, sheet ≥8/10, CLS 0, LCP <2.5s. D: ≤33,000 lines, 0 `!important`, diff ≤0.1%, rate ≥91.8. E: ≥72/84 avg, no criterion <5, dark self-test green. F: doctor/tsc/jest/lint clean, OTA ID recorded. G: `ls-remote --heads` = 1 line, archive tags, REPORT+HANDOFF.
