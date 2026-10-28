# R319 extended gate — 2026-10-28T21:32:21.525Z

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
| landing | 390 | light | state-contrast | PASS | 0 fails · shell:0/96 | — |
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
| landing | 768 | light | state-contrast | PASS | 0 fails · shell:0/114 | — |
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
| landing | 768 | dark | state-contrast | PASS | 0 fails · shell:0/114 | — |
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
| student-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 101 lines | — |
| student-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | light | material/mono-index | PASS | 26 mono | 26 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | light | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (14 swept) | — |
| student-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | light | shell/bar-bleed | PASS | 4 behind · α 1 | 4 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | light | shell/drawer-clip | PASS | 1100≤546 · last label inside | — |
| student-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| student-dashboard | 390 | light | state-contrast | PASS | 0 fails · shell:0/72 · drawer-open:0/42 | — |
| student-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 105 lines | — |
| student-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 768 | light | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 768 | light | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 768 | light | material/chrome-radius | PASS | 0 rounded (17 swept) | — |
| student-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/78 · drawer-open:0/48 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| student-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 106 lines | — |
| student-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | light | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | light | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (49 swept) | — |
| student-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/96 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| student-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 101 lines | — |
| student-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 390 | dark | material/mono-index | PASS | 26 mono | 26 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 390 | dark | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (14 swept) | — |
| student-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| student-dashboard | 390 | dark | shell/bar-bleed | PASS | 4 behind · α 1 | 4 behind bar, bar opaque — nothing visible through |
| student-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| student-dashboard | 390 | dark | shell/drawer-clip | PASS | 1100≤546 · last label inside | — |
| student-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| student-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/72 · drawer-open:0/42 | — |
| student-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 105 lines | — |
| student-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 768 | dark | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 768 | dark | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| student-dashboard | 768 | dark | material/chrome-radius | PASS | 0 rounded (17 swept) | — |
| student-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 768 | dark | state-contrast | PASS | 0 fails · shell:0/78 · drawer-open:0/48 | — |
| student-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 106 lines | — |
| student-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| student-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| student-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| student-dashboard | 1440 | dark | material/mono-index | PASS | 28 mono | 28 mono labels (e.g. r319s-bar-index) |
| student-dashboard | 1440 | dark | material/indicator | PASS | 14 indicators | r319s-ruler \| dash-resume-progress \| progress |
| student-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| student-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (49 swept) | — |
| student-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| student-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/96 | — |
| teacher-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| teacher-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| teacher-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| teacher-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| teacher-dashboard | 390 | light | shell/drawer-clip | PASS | 1259≤546 · last label inside | — |
| teacher-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| teacher-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/36 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| teacher-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 768 | light | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| teacher-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 10 fails · shell:10/54 · drawer-open:0/42 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| teacher-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| teacher-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (32 swept) | — |
| teacher-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 8 fails · shell:8/72 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| teacher-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| teacher-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| teacher-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| teacher-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| teacher-dashboard | 390 | dark | shell/drawer-clip | PASS | 1259≤546 · last label inside | — |
| teacher-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| teacher-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/36 | — |
| teacher-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| teacher-dashboard | 768 | dark | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| teacher-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 768 | dark | state-contrast | PASS | 0 fails · shell:0/54 · drawer-open:0/42 | — |
| teacher-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| teacher-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| teacher-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| teacher-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| teacher-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| teacher-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| teacher-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| teacher-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (32 swept) | — |
| teacher-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| teacher-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/72 | — |
| admin-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| admin-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| admin-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| admin-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| admin-dashboard | 390 | light | shell/drawer-clip | PASS | 744≤546 · last label inside | — |
| admin-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| admin-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/42 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| admin-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 768 | light | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| admin-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/42 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| admin-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| admin-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (23 swept) | — |
| admin-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/66 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| admin-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| admin-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| admin-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| admin-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| admin-dashboard | 390 | dark | shell/drawer-clip | PASS | 744≤546 · last label inside | — |
| admin-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| admin-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/42 | — |
| admin-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 16 lines | — |
| admin-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| admin-dashboard | 768 | dark | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| admin-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 768 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/42 | — |
| admin-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| admin-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| admin-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| admin-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| admin-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| admin-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| admin-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| admin-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| admin-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (23 swept) | — |
| admin-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| admin-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/66 | — |
| quality-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| quality-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| quality-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| quality-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| quality-dashboard | 390 | light | shell/drawer-clip | PASS | 698≤546 · last label inside | — |
| quality-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| quality-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/42 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| quality-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 768 | light | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| quality-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/42 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| quality-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 17 lines | — |
| quality-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| quality-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (21 swept) | — |
| quality-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 4 fails · shell:4/66 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| quality-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| quality-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| quality-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| quality-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128/page:80) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| quality-dashboard | 390 | dark | shell/drawer-clip | PASS | 698≤546 · last label inside | — |
| quality-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| quality-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/42 | — |
| quality-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 18 lines | — |
| quality-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| quality-dashboard | 768 | dark | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| quality-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 768 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/42 | — |
| quality-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 17 lines | — |
| quality-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| quality-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| quality-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| quality-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| quality-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| quality-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| quality-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| quality-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (21 swept) | — |
| quality-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| quality-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/66 | — |
| owner-dashboard | 390 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 390 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 390 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 390 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 390 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 390 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 390 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 390 | light | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 390 | light | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| owner-dashboard | 390 | light | shell/bar-opaque | PASS | alpha 1 | — |
| owner-dashboard | 390 | light | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| owner-dashboard | 390 | light | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| owner-dashboard | 390 | light | shell/drawer-clip | PASS | 840≤546 · last label inside | — |
| owner-dashboard | 390 | light | shell/scrim-palette | PASS | α 0.58 | — |
| owner-dashboard | 390 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 5 fails · shell:5/48 · drawer-open:0/42 | [shell] rest «button.btn.primary.sm» 3.76:1 < 4.5:1 |
| owner-dashboard | 768 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 768 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 768 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 768 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 768 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 768 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 768 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 768 | light | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 768 | light | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| owner-dashboard | 768 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 10 fails · shell:10/54 · drawer-open:0/42 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| owner-dashboard | 1440 | light | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 1440 | light | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 1440 | light | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 1440 | light | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 1440 | light | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 1440 | light | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 1440 | light | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 1440 | light | material/avatar-square | PASS | 0/2 round | — |
| owner-dashboard | 1440 | light | material/chrome-radius | PASS | 0 rounded (24 swept) | — |
| owner-dashboard | 1440 | light | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | light | state-contrast | FAIL → B1/B2 (paired state tokens + dashboard ink) | 8 fails · shell:8/72 | [shell] rest «a.btn.primary.sm» 3.76:1 < 4.5:1 |
| owner-dashboard | 390 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 390 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 390 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 390 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 390 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 390 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 390 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 390 | dark | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 390 | dark | material/chrome-radius | PASS | 0 rounded (10 swept) | — |
| owner-dashboard | 390 | dark | shell/bar-opaque | PASS | alpha 1 | — |
| owner-dashboard | 390 | dark | shell/bar-bleed | PASS | 0 behind · α 1 | no content behind bar |
| owner-dashboard | 390 | dark | shell/padding-reserve | PASS | pad 128 ≥ 85.9 · bottom-clear | pad 128px (content:80/content-inner:128) vs need 86px (bar 77.9 + safe 0 + 8) · bottom-scroll clear |
| owner-dashboard | 390 | dark | shell/drawer-clip | PASS | 840≤546 · last label inside | — |
| owner-dashboard | 390 | dark | shell/scrim-palette | PASS | α 0.92 | — |
| owner-dashboard | 390 | dark | state-contrast | PASS | 0 fails · shell:0/48 · drawer-open:0/42 | — |
| owner-dashboard | 768 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 768 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 768 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 768 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 768 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 768 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 768 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 768 | dark | material/avatar-square | PASS | 0/1 round | — |
| owner-dashboard | 768 | dark | material/chrome-radius | PASS | 0 rounded (11 swept) | — |
| owner-dashboard | 768 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 768 | dark | state-contrast | PASS | 0 fails · shell:0/54 · drawer-open:0/42 | — |
| owner-dashboard | 1440 | dark | leaks/hard | PASS | 0 leaks · 0 allowlisted · 15 lines | — |
| owner-dashboard | 1440 | dark | leaks/numerals | PASS | 0 nodes | — |
| owner-dashboard | 1440 | dark | leaks/bidi | PASS | 0 nodes | — |
| owner-dashboard | 1440 | dark | material/frame | PASS | present | .sheet-frame fixed inset [7,7,7,7] — need fixed 7px |
| owner-dashboard | 1440 | dark | material/grain | PASS | present | sheet-grain |
| owner-dashboard | 1440 | dark | material/mono-index | PASS | 1 mono | 1 mono labels (e.g. font-mono) |
| owner-dashboard | 1440 | dark | material/indicator | FAIL → B2 (indicators land C2) | 0 indicators | no progress/gauge/chip/meter element |
| owner-dashboard | 1440 | dark | material/avatar-square | PASS | 0/2 round | — |
| owner-dashboard | 1440 | dark | material/chrome-radius | PASS | 0 rounded (24 swept) | — |
| owner-dashboard | 1440 | dark | shell/bar-opaque | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/bar-bleed | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/padding-reserve | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/drawer-clip | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | shell/scrim-palette | NA | — | shell geometry measured @390 touch context only (§E-11) |
| owner-dashboard | 1440 | dark | state-contrast | PASS | 0 fails · shell:0/72 | — |
| — | — | — | paired | FAIL → B1 (paired-state lint — c1-A) **↗REGRESSION** | exit 1 |   landing.css :: .fo-hero-discover:hover ⏎   landing.css :: .fo-hero-discover:hover::before ⏎   landing.css :: html[data |

## Ratchet (baseline)

- baseline: `scripts/r319/gate-baseline.json` — compared against gate-baseline.json written 2026-10-25T15:27:45.450Z
- ↗ REGRESSION |—|—|paired: FAIL (metric 1 > baseline 0) — worse number

**39 FAIL · 0 WARN · 0 cell error(s) · 1 regression(s) → exit 1** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).
