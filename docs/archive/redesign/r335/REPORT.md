# R336 — Interim Report (session 1 of N)

## Exit-criteria table

| Item | Target | State @ 1a402d74 |
|---|---|---|
| Mobile branch merged, main CI green, OTA on preview | done | ✅ merged (118afa1f); CI re-greened this session (86d6e91f fixed 3 red roots: bundle 776.2→776.0 KB gz — copy dedupe via components/landing/copy.ts, NO ceiling raised; r306 stale .sl-scan pin; r309 drag-test mount flake — same R312-D4 hardening as its sibling). OTA verified from run 41853500404: production iOS group 1995b95a-756c-4dd2-a506-5103e3ab72ed (update 01a1a71b-019f-74f8-b1c6-d51fa598ac17); preview iOS 9dd70372-683c-4009-8f7c-4a58cf6a93a9; preview Android 449c6060-16a1-4bac-b6a4-7c14de54211b. Latest push (1a402d74) CI in flight. |
| Web bundle (entry, gz) | ≤ 776 KB, ceiling unchanged | ✅ 776.0 KB gz total / entry 90.6 ≤ 92 (margin thin ~30 B — next session should cut deeper) |
| CSS lines / !important | ≤ 33,000 / 0 | ❌ 43,428 / 109 — Phase 4 not started |
| Conformance pass-rate 9×5 | ≥ 95% | Instrument fixed this session. **Honest baseline 39.6%** (10,117/25,554) with ratchet gate in CI (monotonic). 8,645 no-counterpart FAILs exposed (were silently unmatched under the 66.6% self-graded number). Weakest: usecase 10–13%, intro 24–31%. |
| Recorded Heron tweens ≥ 90% in tolerance | ≥ 90% | ❌ not started |
| Inner pages ≥ 90% grammar | ≥ 90% | ❌ not started |
| Authed role shells rebuilt | all 5 | ❌ not started |
| Mobile review score | ≥ 9 | ❌ not started (P1 tickets open) |
| Android APK + iOS build | both | ❌ not started (mobile-build.yml workflow; includes expo-navigation-bar LR-001) |
| Final blind panel | once | ❌ not run |

## Session 1 commits (86d6e91f → 1a402d74)
1. `86d6e91f` fix(r336): red main at e1ecedb6 — three root causes, no ceiling raised
2. `d6fa2aef` docs(r336): HANDOFF state table
3. `1a402d74` feat(r336): conformance instrument v2 + CI ratchet gate

## Resume queue (next session)
1. Section conformance weakest-first: usecase, intro, problem, footer, why, platform, map, cta, hero — one owner per section, exclusive files (OWNERSHIP.md), data-spec keys + noCounterpart reasons as you go; raise ratchet per green landing (`--ratchet`).
2. CSS demolition (43,428→≤33,000 / 109→0 !important) on files no section agent owns.
3. Phases 3/5 per original R335 brief.
