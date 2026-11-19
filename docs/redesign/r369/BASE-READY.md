# R369 BASE-READY — the integration baseline for lanes B & C

**Status: READY** — 2026-11-19
**Branch:** `agent/r369-integrate` · **Content head:** `0e84f542` (above it: the BASE-READY doc and the r366-scroll-trace pin calibration the file's own law prescribes)
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

## CI on this branch — the green proof

**ALL 15 CHECKS GREEN on `c09e8ea8`** — [Actions run 44529026075](https://github.com/ahmadmedo1012/madarek/actions/runs/44529026075) (2026-11-19, after the noise run-off below). The three reds on the first push of this tip (`4279ec88`, 12/15) and the follow-on noise:

| Check | What happened | Closed by |
| --- | --- | --- |
| Design gates | rename-ledger 1 OFF-LIST (FIDELITY-HOWTO's own example named the guarded literal) | `46d17f5e` — reworded; scan exit 0 |
| E2E | document-viewer phone-band: icon-only notes FAB 42px inline (< 44px floor) + Sheet lookup stale after ca45d29f's copy cut | `0e84f542` — `min-inline-size: 44px` + test tracks the shipped «ملاحظات» name; spec 7/7 local, green in CI |
| Surface drift | Ubuntu/azure mirror 503s killed `apt` before the scan ran — runner infra | nothing to fix; green on the next run unaided |
| E2E (reruns 1–2) | r366-scroll-trace perf ratchets missed on **byte-identical runtime** — different surfaces each run (library@390/1440, dashboard@1440), the file's own documented noise signature; online-exams `y`-shift failed only on azure-hosted runners (mechanism open → REQUESTS-A-to-C R2) | ratchet pins recalibrated per the file's own law (max × 1.4, hard INP/CLS budgets untouched); run 3 green with AND without the recalibration |

The rerun history is the noise proof: `dashboard@1440` failed run 2 after passing run 1 on the same tree; run 3 all green. The pin calibration commit rides above `c09e8ea8` so the next azure day doesn't re-block the lane.

## Known-open (recorded, NOT base blockers)

- Judge ratings — B fills `docs/audit/evidence/judge-ledger.json` (protocol: REQUESTS-A-to-B R3).
- Landing CSS 723,509B vs 601,352B target — T9, B's lane. Stress collision @1440 — B's lane (R2).
- `accept.mjs` today: 6 PASS · 3 OPEN (judge/bundle/Lighthouse) · 2 FAIL (the two above) — the acceptance table, not this baseline.
