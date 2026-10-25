# R319 extended gate — 2026-10-25T15:35:09.178Z

Base `http://127.0.0.1:4215` · Routes landing,student-dashboard · Viewports 390,1440 · Themes light,dark · Mode quick · Max elements 60 · Only state-contrast,leaks,shell,material,paired

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
| landing | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 2 fails · shell:2/96 | [shell] hover «a.cb-more» 4.44:1 < 4.5:1 |
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
| landing | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 6 fails · shell:6/144 | [shell] hover «a.fo-text-link» 3.46:1 < 4.5:1 |
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
| student-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 65 lines | — |
| student-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | light | material/frame | FAIL → B2 (sheet chrome lands C2) | absent | no .sheet-frame/.auth-frame on this route |
| student-dashboard | 390 | light | material/grain | FAIL → B2 (sheet chrome lands C2) | absent | no grain layer (no body.mdrk-grain / [class*=grain]) |
| student-dashboard | 390 | light | material/mono-index | PASS | 4 mono | 4 mono labels (e.g. font-mono) |
| student-dashboard | 390 | light | material/indicator | PASS | 16 indicators | dash-resume-progress \| progress \| progress-track |
| student-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 2 rounded (14 swept) | 2 rounded chrome sigs (e.g. button.topbar-search-toggle, button.topbar-notif) |
| student-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | light | shell/bar-bleed | PASS | 4 behind · α 1 | 4 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | light | shell/drawer-clip | PASS | 1054≤546 · last label inside | — |
| student-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| student-dashboard | 390 | light | state-contrast | PASS | 0 fails · shell:0/54 · drawer-open:0/42 | — |
| student-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 68 lines | — |
| student-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | material/frame | FAIL → B2 (sheet chrome lands C2) | absent | no .sheet-frame/.auth-frame on this route |
| student-dashboard | 1440 | light | material/grain | FAIL → B2 (sheet chrome lands C2) | absent | no grain layer (no body.mdrk-grain / [class*=grain]) |
| student-dashboard | 1440 | light | material/mono-index | PASS | 4 mono | 4 mono labels (e.g. font-mono) |
| student-dashboard | 1440 | light | material/indicator | PASS | 16 indicators | dash-resume-progress \| progress \| progress-track |
| student-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (48 swept) | 1 rounded chrome sigs (e.g. button.topbar-notif) |
| student-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/96 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| student-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 65 lines | — |
| student-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | material/frame | FAIL → B2 (sheet chrome lands C2) | absent | no .sheet-frame/.auth-frame on this route |
| student-dashboard | 390 | dark | material/grain | FAIL → B2 (sheet chrome lands C2) | absent | no grain layer (no body.mdrk-grain / [class*=grain]) |
| student-dashboard | 390 | dark | material/mono-index | PASS | 4 mono | 4 mono labels (e.g. font-mono) |
| student-dashboard | 390 | dark | material/indicator | PASS | 16 indicators | dash-resume-progress \| progress \| progress-track |
| student-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 2 rounded (14 swept) | 2 rounded chrome sigs (e.g. button.topbar-search-toggle, button.topbar-notif) |
| student-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | dark | shell/bar-bleed | PASS | 4 behind · α 1 | 4 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | dark | shell/drawer-clip | PASS | 1054≤546 · last label inside | — |
| student-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| student-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/54 · drawer-open:0/42 | — |
| student-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 68 lines | — |
| student-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | material/frame | FAIL → B2 (sheet chrome lands C2) | absent | no .sheet-frame/.auth-frame on this route |
| student-dashboard | 1440 | dark | material/grain | FAIL → B2 (sheet chrome lands C2) | absent | no grain layer (no body.mdrk-grain / [class*=grain]) |
| student-dashboard | 1440 | dark | material/mono-index | PASS | 4 mono | 4 mono labels (e.g. font-mono) |
| student-dashboard | 1440 | dark | material/indicator | PASS | 16 indicators | dash-resume-progress \| progress \| progress-track |
| student-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (48 swept) | 1 rounded chrome sigs (e.g. button.topbar-notif) |
| student-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/96 | — |
| — | — | — | paired | PASS | exit 0 | ✓ paired-state lint PASS — 412 state rules scanned across 37 sheets; 139 XOR rule(s), all allowlisted with reasons; 0 fr |

## Ratchet (baseline)

- baseline: `scripts/r319/gate-baseline.json` — compared against gate-baseline.json written 2026-10-25T15:27:45.450Z
- no regressions vs baseline (ratchet holds)

**15 FAIL · 0 WARN · 0 cell error(s) · 0 regression(s) → exit 0** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
