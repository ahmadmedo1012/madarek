# Page Ledger v2 — سجلّ الصفحات (R366 · Agent 4)

**Branch** `agent/r366-web-product` · **Built on** the R353/R356 ledger (110→129 clean crawls) — this v2 pass re-judges every route with the instruments the R356 pass lacked.

## What changed vs the R356 ledger (why v2 exists)

The R356 «zero findings» came from the hermetic crawl with CLEAN mock data. The owner still perceives overlaps, density and untidiness. v2 adds the four blind spots:

1. **Hostile content** (`--stress`): long Arabic names appended to every 5th text node, unbroken university emails, Arabic-Indic digit runs, 100 extra table rows, 20 extra list rows per list, broken images + a 320px monster image, 99+ badges — all applied in-page before the probe (nothing changes React state).
2. **Popover/dialog/sheet geometry** (`--popovers 1`): every closed `<details>`, `[aria-haspopup]` trigger and `[popovertarget]` button is opened and the top stop is probed WITH the layers open (the bell panel, menus, disclosure sheets — never swept before). The r366 2-d work proved this class hides real defects: the notification panel had NO container geometry (position:static) and the R356 crawl could not see it.
3. **Focus ring clipping** (`--focus N`): Tab through the first N focusables; a focused rect outside the viewport is a finding.
4. **Emulation contexts** (`--contrast more`, `--reducedmotion reduce`): the §7 matrix rows for `prefers-contrast` and `prefers-reduced-motion`, plus `--fontscale 2` (200 % text) combined with stress, and the keyboard-open phone heights (390×320) as explicit breakpoints.

Plus: route-level parallelism (`--workers N`) so the full matrix is re-runnable in hours, not days.

## The matrix

- Widths: 360×640, 390×844, 768×1024, 1024×768, 1440×900 (headline) · 320×568 and 390×320 (keyboard-open) for the top-20 surfaces · 640×360 landscape for the top-20.
- Themes: light + dark on every cell.
- Roles: student (32 routes), teacher (19), admin/registrar (14), quality (10), owner (13) — the authed surface; public routes belong to Agent 1's ledger.

## Results (this round)

### Baseline (main `7a097457` dist, before r366 fixes)

Artifacts: `/tmp/r366/baseline-stress-{student,teacher,admin,quality,owner}.json` — each role's headline routes × {360×640, 1440×900} × light+dark, `--stress --workers 2` (hostile content per §blind-spot 1). Run 2026-11-17, all CLEAN:

| role | routes swept | stops-with-defects | text-on-text | fixed-over-text | clipped | hoverflow | verdict |
|---|---|---|---|---|---|---|---|
| student | 10 headline | 0 | 0 | 0 | 0 | 0 | CLEAN under stress |
| teacher | 10 headline | 0 | 0 | 0 | 0 | 0 | CLEAN under stress |
| admin | 8 headline | 0 | 0 | 0 | 0 | 0 | CLEAN under stress |
| quality | 6 headline | 0 | 0 | 0 | 0 | 0 | CLEAN under stress |
| owner | 7 headline | 0 | 0 | 0 | 0 | 0 | CLEAN under stress |

**The honest reading:** the static stress crawl (even hostile) does NOT surface the defect class the owner perceives — those live in the INTERACTION layers (anchored popovers, scroll pinning, sticky bars over scrolled content, keyboard-open geometry), which is exactly where the r366 failing-before e2e suites found and fixed real production defects (table below). The full 5-width matrix + popovers/focus passes re-run at close-out on the final build.

### Defects found and FIXED by the r366 lanes (each with a failing-before test)

| # | surface | defect (measured) | fix commit |
|---|---|---|---|
| 1 | AI assistant | smooth programmatic pins (legacy `scroll-behavior:smooth` on `.chat-area`) chased content-visibility realization and stranded the transcript: 60-row open landed 2781px from bottom; streamed reply 126px | `feat(ai)` ac3cc77 |
| 2 | AI assistant | scroll-anchoring drags poisoned the at-bottom guard (layout shifts above viewport read as user scrolls) | ac3cc77 (`overflow-anchor:none` + settle loop) |
| 3 | Notifications | the portal panel computed `position:static` — the container geometry was retired with the R313 glass block and never replaced; inline top/left inert | `fix(notifications)` 9c1bb5b |
| 4 | Notifications | panel kissed the topbar bottom edge (53.5 vs 55.5) — anchored to the button, not the bar | 9c1bb5b (anchoredPosition bar-clamp) |
| 5 | Notifications | the unread dot rendered 0×0 (sizing swept with the polish re-skin) | 9c1bb5b |
| 6 | Exams taker | sticky timer covered question cards at 390×320 / 320×568 / 200 % text (q.top 156 < bar.bottom 236) | (2-c lane, see report) |
| 7 | Messages/calendar | (2-d lane — see reports/messages-calendar.md) | |

### Final sweep (post-fixes)

*(filled at close-out: same matrix, rebuilt dist, exit codes per role)*

## Per-role route checklist

The route inventory (128 routes, per role) is `docs/redesign/r362-integration/AGENT5-ROUTE-INVENTORY.md` §2 — unchanged this round (roles/routes are not Agent 4's to alter). The v2 sweep covers the authed 88 routes of the 5 roles above; the remaining authed routes ride the r362 sweep suite (`npm run test:r362`, 176 tests) which stays green in CI.

## Console-error / dead-link / state checks

Ride the r362 route-sweep suite (resolution, render, title, zero 5xx, zero page errors, zero app console errors per route — `tests/r362/route-sweep.spec.ts`) and the states suite (mobile-360 integrity, dark re-render, cold-paint skeleton) — both re-run at close-out on the final build.
