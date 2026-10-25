# R319 extended gate — 2026-10-25T21:09:23.975Z

Base `http://localhost:4228` · Routes landing · Viewports 390 · Themes light,dark · Mode full · Max elements 400 · Only state-contrast

E8 state-contrast (CDP-forced hover/active/focus/focus-visible/focus-within) · E9 paired lint · E10 leaks · E11 shell geometry (@390 touch, authed) · E12 material presence (authed). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.

| route | viewport | theme | check | result | number | worst sample / failing selectors |
|---|---|---|---|---|---|---|
| landing | 390 | light | state-contrast | PASS | 0 fails · shell:0/96 | — |
| landing | 390 | dark | state-contrast | PASS | 0 fails · shell:0/96 | — |

## Ratchet (baseline)

- baseline: `scripts/r319/gate-baseline.json` — compared against gate-baseline.json written 2026-10-25T15:27:45.450Z
- no regressions vs baseline (ratchet holds)

**0 FAIL · 0 WARN · 0 cell error(s) · 0 regression(s) → exit 0** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
