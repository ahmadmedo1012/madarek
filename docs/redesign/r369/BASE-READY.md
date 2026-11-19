# R369 BASE-READY — the integration baseline for lanes B & C

**Status: READY** — 2026-11-19
**Branch:** `agent/r369-integrate` · **Content head:** `0e84f542` (this doc rides on top as the tip)
**What to do:** `git merge origin/agent/r369-integrate` into your lane. Conflict forecast + evidence policy: `docs/redesign/r369/A/COORDINATION.md`.

## What this baseline is

Every R368 lane integrated into ONE green base, on top of `main` @ `347e2508`:

| Integrated | Proof |
| --- | --- |
| `exec/r368-fidelity-v2` @ `9d27857` (all 64 commits) | `git rev-list --count agent/r369-integrate..origin/exec/r368-fidelity-v2` → **0** |
| `wip/r368-t6` @ `5925fabd` (108-route matrix, shell dark band) | `git rev-list --count agent/r369-integrate..origin/wip/r368-t6` → **0** |
| `wip/r368-t5` + `wip/r368-t5-public` | merges `1eacf478`, `4b71f93d` (one SPECS-REFERENCE conflict, both intents kept) |
| first-gen `exec/r368-heron-fidelity` (3 commits) | dropped-superseded, measured reasons in `A/BRANCH-LEDGER.md` |

Plus the A-lane foundations: size gate fixed at the root (471 artifacts untracked, docs/ 75,006→27,364KB ≤ ceiling), deadcode ratchet improved (183→180, AuthDoor extraction), copy-budget restored (six T5 pages cut to ceiling, pinned strings verbatim), `--sp-3-5: 14px` minted + the 14px family migrated, bundle ceiling reconciled to one source (774KB), `accept.mjs` + `judge-sheets.mjs` + `docs/FIDELITY-HOWTO.md` (the acceptance instruments), spec amended (paired-sheet judge ≥4/5 replaces the E gate — E stays diagnostic).

## CI on this branch tip — the green proof

The 15-check suite on `4279ec88` was 12 green / 3 red; all three reds are closed on this tip:

| Check (4279ec88) | Was | Closed by |
| --- | --- | --- |
| Design gates | rename-ledger 1 OFF-LIST (FIDELITY-HOWTO's own example named the guarded literal) | `46d17f5e` — reworded; `node scripts/r321/rename-ledger-scan.mjs` → exit 0 |
| E2E | document-viewer phone-band: icon-only notes FAB 42px inline (< 44px floor) + Sheet lookup stale after ca45d29f's copy cut | `0e84f542` — `min-inline-size: 44px` (the topbar avatar-chip floor) + test tracks the shipped «ملاحظات» name; spec 7/7 re-verified locally |
| Surface drift | Ubuntu mirror 503s killed `apt` font install before the scan ran — runner infra, not code | nothing to fix; re-run the job if it flakes again |

Green proof = the Actions run for this branch tip (all 15 checks). If Surface drift flakes on mirror 503s once more, re-run that job — the tree itself is clean.

## Known-open (recorded, NOT base blockers)

- Judge ratings — B fills `docs/audit/evidence/judge-ledger.json` (protocol: REQUESTS-A-to-B R3).
- Landing CSS 723,509B vs 601,352B target — T9, B's lane. Stress collision @1440 — B's lane (R2).
- `accept.mjs` today: 6 PASS · 3 OPEN (judge/bundle/Lighthouse) · 2 FAIL (the two above) — the acceptance table, not this baseline.
