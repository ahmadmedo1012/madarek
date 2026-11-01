# R319 extended gate — 2026-11-01T13:00:08.759Z

Base `http://127.0.0.1:4257` · Routes landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard · Viewports 390,768,1440 · Themes light,dark · Mode full · Max elements 400 · Only state-contrast,leaks,shell,material,paired

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
| landing | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 1 fails · shell:1/84 | [shell] focus-visible «a.btn.ghost.lg» 1:1 < 4.5:1 |
| landing | 768 | light | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 768 | light | leaks/numerals | NA | — | public route |
| landing | 768 | light | leaks/bidi | NA | — | public route |
| landing | 768 | light | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | light | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 768 | light | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 768 | light | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 768 | light | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 768 | light | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 2 fails · shell:2/90 | [shell] focus-visible «a.btn.ghost.lg» 1:1 < 4.5:1 |
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
| landing | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/126 | [shell] hover «a.btn.ghost.lg» 1:1 < 4.5:1 |
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
| landing | 390 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 1 fails · shell:1/84 | [shell] focus-visible «a.btn.ghost.lg» 1.09:1 < 4.5:1 |
| landing | 768 | dark | leaks/hard | NA | — | public route — the authenticated leak scan is scoped to role dashboards |
| landing | 768 | dark | leaks/numerals | NA | — | public route |
| landing | 768 | dark | leaks/bidi | NA | — | public route |
| landing | 768 | dark | material/frame | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | material/grain | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | material/mono-index | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | material/indicator | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | material/avatar-square | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | material/chrome-radius | NA | — | public route — material presence is an authenticated-surface contract |
| landing | 768 | dark | shell/bar-opaque | NA | — | public route — no app shell |
| landing | 768 | dark | shell/bar-bleed | NA | — | public route — no app shell |
| landing | 768 | dark | shell/padding-reserve | NA | — | public route — no app shell |
| landing | 768 | dark | shell/drawer-clip | NA | — | public route — no app shell |
| landing | 768 | dark | shell/scrim-palette | NA | — | public route — no app shell |
| landing | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 2 fails · shell:2/90 | [shell] focus-visible «a.btn.ghost.lg» 1.09:1 < 4.5:1 |
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
| landing | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 4 fails · shell:4/126 | [shell] hover «a.btn.ghost.lg» 1.09:1 < 4.5:1 |
| student-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 119 lines | — |
| student-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | light | material/mono-index | PASS | 34 mono | 34 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | light | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (16 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | light | shell/bar-bleed | PASS | 14 behind · α 1 | 14 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | light | shell/drawer-clip | PASS | 1105≤515 · last label inside | — |
| student-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| student-dashboard | 390 | light | state-contrast | PASS | 0 fails · shell:0/96 · drawer-open:0/42 | — |
| student-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 126 lines | — |
| student-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 768 | light | material/mono-index | PASS | 38 mono | 38 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 768 | light | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 768 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (19 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/102 · drawer-open:5/48 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| student-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 127 lines | — |
| student-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | light | material/mono-index | PASS | 38 mono | 38 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | light | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (51 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/120 · 1 gradient-flagged | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| student-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 119 lines | — |
| student-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | dark | material/mono-index | PASS | 34 mono | 34 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | dark | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (16 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | dark | shell/bar-bleed | PASS | 14 behind · α 1 | 14 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | dark | shell/drawer-clip | PASS | 1105≤515 · last label inside | — |
| student-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| student-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/96 · drawer-open:0/42 | — |
| student-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 126 lines | — |
| student-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 768 | dark | material/mono-index | PASS | 38 mono | 38 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 768 | dark | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 768 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (19 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/102 · drawer-open:5/48 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| student-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 127 lines | — |
| student-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | dark | material/mono-index | PASS | 38 mono | 38 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | dark | material/indicator | PASS | 13 indicators | r319s-ruler \| dash-resume-progress \| ind-ruler |
| student-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (51 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| student-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/120 · 1 gradient-flagged | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| teacher-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 14 lines | — |
| teacher-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| teacher-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| teacher-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| teacher-dashboard | 390 | light | shell/drawer-clip | PASS | 1265≤515 · last label inside | — |
| teacher-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| teacher-dashboard | 390 | light | state-contrast | PASS | 0 fails · shell:0/60 · drawer-open:0/36 | — |
| teacher-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 768 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/66 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| teacher-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| teacher-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (34 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/84 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| teacher-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 14 lines | — |
| teacher-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| teacher-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| teacher-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| teacher-dashboard | 390 | dark | shell/drawer-clip | PASS | 1265≤515 · last label inside | — |
| teacher-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| teacher-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/60 · drawer-open:0/36 | — |
| teacher-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 768 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/66 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| teacher-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| teacher-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (34 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| teacher-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/84 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| admin-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| admin-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| admin-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| admin-dashboard | 390 | light | shell/drawer-clip | PASS | 747≤515 · last label inside | — |
| admin-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| admin-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| admin-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 768 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| admin-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| admin-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (25 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/78 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| admin-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| admin-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| admin-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| admin-dashboard | 390 | dark | shell/drawer-clip | PASS | 747≤515 · last label inside | — |
| admin-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| admin-dashboard | 390 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| admin-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 768 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| admin-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| admin-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (25 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| admin-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/78 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| quality-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| quality-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| quality-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| quality-dashboard | 390 | light | shell/drawer-clip | PASS | 701≤515 · last label inside | — |
| quality-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| quality-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| quality-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 19 lines | — |
| quality-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 768 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| quality-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| quality-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (23 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/78 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| quality-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| quality-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| quality-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| quality-dashboard | 390 | dark | shell/drawer-clip | PASS | 701≤515 · last label inside | — |
| quality-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| quality-dashboard | 390 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| quality-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 19 lines | — |
| quality-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 768 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| quality-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| quality-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (23 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| quality-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/78 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| owner-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 14 lines | — |
| owner-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 390 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| owner-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| owner-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| owner-dashboard | 390 | light | shell/drawer-clip | PASS | 891≤515 · last label inside | — |
| owner-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| owner-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| owner-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 768 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:0/66 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| owner-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| owner-dashboard | 1440 | light | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (27 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/84 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| owner-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 14 lines | — |
| owner-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 390 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (12 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| owner-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| owner-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| owner-dashboard | 390 | dark | shell/drawer-clip | PASS | 891≤515 · last label inside | — |
| owner-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| owner-dashboard | 390 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/60 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| owner-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 768 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (13 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:0/66 · drawer-open:5/42 | [drawer-open] rest «a.nav-item.on» 1:1 < 4.5:1 |
| owner-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| owner-dashboard | 1440 | dark | material/chrome-radius | FAIL → B2 (radius-0 chrome — C2+, WARN while >50) | 1 rounded (27 swept) | 1 rounded chrome sigs (e.g. button.fb-fab) |
| owner-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) **↗REGRESSION** | 5 fails · shell:5/84 | [shell] rest «a.nav-item.on» 1.08:1 < 4.5:1 |
| — | — | — | paired | FAIL → B1 (paired-state lint — c1-A) **↗REGRESSION** | exit 1 | Fix by the paired pattern: base routes background: var(--_bg); color: var(--_fg); ⏎ every state rule sets --_bg AND --_f |

## Ratchet (baseline)

- baseline: `scripts/r319/gate-baseline.json` — compared against gate-baseline.json written 2026-10-25T15:27:45.450Z
- ↗ REGRESSION landing|390|dark|state-contrast: FAIL (metric 1 > baseline 0) — worse number
- ↗ REGRESSION landing|768|dark|state-contrast: FAIL (metric 2 > baseline 0) — worse number
- ↗ REGRESSION landing|1440|dark|state-contrast: FAIL (metric 4 > baseline 0) — worse number
- ↗ REGRESSION student-dashboard|1440|light|state-contrast: FAIL (metric 5 > baseline 4) — worse number
- ↗ REGRESSION student-dashboard|768|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION student-dashboard|1440|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION teacher-dashboard|768|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION teacher-dashboard|1440|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION admin-dashboard|1440|light|state-contrast: FAIL (metric 5 > baseline 4) — worse number
- ↗ REGRESSION admin-dashboard|390|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION admin-dashboard|768|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION admin-dashboard|1440|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION quality-dashboard|1440|light|state-contrast: FAIL (metric 5 > baseline 4) — worse number
- ↗ REGRESSION quality-dashboard|390|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION quality-dashboard|768|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION quality-dashboard|1440|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION owner-dashboard|390|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION owner-dashboard|768|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION owner-dashboard|1440|dark|state-contrast: FAIL (metric 5 > baseline 0) — worse number
- ↗ REGRESSION |—|—|paired: FAIL (metric 1 > baseline 0) — worse number

**87 FAIL · 0 WARN · 0 cell error(s) · 20 regression(s) → exit 1** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
