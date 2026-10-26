# R319 extended gate — 2026-10-26T07:30:51.581Z

Base `http://127.0.0.1:4257` · Routes landing,student-dashboard · Viewports 390,1440 · Themes light,dark · Mode quick · Max elements 60 · Only state-contrast,leaks,shell,material,paired

E8 state-contrast (CDP-forced hover/active/focus/focus-visible/focus-within) · E9 paired lint · E10 leaks · E11 shell geometry (@390 touch, authed) · E12 material presence (authed). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.

| route | viewport | theme | check | result | number | worst sample / failing selectors |
|---|---|---|---|---|---|---|
| landing | 390 | light | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 390 | light | leaks/numerals | NA | — | public route |
| landing | 390 | light | leaks/bidi | NA | — | public route |
| landing | 390 | light | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | light | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 390 | light | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 390 | light | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 390 | light | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 390 | light | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 390 | light | state-contrast | PASS | 0 fails · shell:0/96 | — |
| landing | 1440 | light | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 1440 | light | leaks/numerals | NA | — | public route |
| landing | 1440 | light | leaks/bidi | NA | — | public route |
| landing | 1440 | light | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | light | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 1440 | light | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 1440 | light | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 1440 | light | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 1440 | light | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 1440 | light | state-contrast | PASS | 0 fails · shell:0/144 | — |
| landing | 390 | dark | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 390 | dark | leaks/numerals | NA | — | public route |
| landing | 390 | dark | leaks/bidi | NA | — | public route |
| landing | 390 | dark | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 390 | dark | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 390 | dark | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 390 | dark | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 390 | dark | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 390 | dark | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 390 | dark | state-contrast | PASS | 0 fails · shell:0/96 | — |
| landing | 1440 | dark | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 1440 | dark | leaks/numerals | NA | — | public route |
| landing | 1440 | dark | leaks/bidi | NA | — | public route |
| landing | 1440 | dark | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 1440 | dark | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 1440 | dark | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 1440 | dark | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 1440 | dark | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 1440 | dark | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/144 | — |
| student-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 104 lines | — |
| student-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | light | material/mono-index | PASS | 26 mono | 26 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | light | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (14 swept) | — |
| student-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | light | shell/bar-bleed | PASS | 6 behind · α 1 | 6 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · 2 under dock @bottom | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll 2 under dock |
| student-dashboard | 390 | light | shell/drawer-clip | PASS | 1054≤546 · last label inside | — |
| student-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| student-dashboard | 390 | light | state-contrast | PASS | 0 fails · shell:0/72 · drawer-open:0/42 | — |
| student-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 109 lines | — |
| student-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | light | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | light | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (48 swept) | — |
| student-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/96 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| student-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 104 lines | — |
| student-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | dark | material/mono-index | PASS | 26 mono | 26 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | dark | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (14 swept) | — |
| student-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | dark | shell/bar-bleed | PASS | 6 behind · α 1 | 6 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · 2 under dock @bottom | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll 2 under dock |
| student-dashboard | 390 | dark | shell/drawer-clip | PASS | 1054≤546 · last label inside | — |
| student-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| student-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/72 · drawer-open:0/42 | — |
| student-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 109 lines | — |
| student-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | dark | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | dark | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (48 swept) | — |
| student-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/96 | — |
| — | — | — | paired | PASS | exit 0 | ✓ paired-state lint PASS — 418 state rules scanned across 40 sheets; 145 XOR rule(s), all allowlisted with reasons; 0 fr |

## Ratchet (baseline)

- baseline: `scripts/r319/gate-baseline.json` — compared against gate-baseline.json written 2026-10-25T15:27:45.450Z
- no regressions vs baseline (ratchet holds)

**1 FAIL · 0 WARN · 0 cell error(s) · 0 regression(s) → exit 0** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
