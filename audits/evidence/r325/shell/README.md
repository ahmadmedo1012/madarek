# R325 P2.3 — the APP SHELL on §R325 (verdict table)

Branch `r325/shell` · worktree `/home/z/wt/shell` · evidence session 2026-10-31.
Dev server `npx vite --port 5209` (this worktree), backend live `:4000`.
Logins: `student@test.ly` / `teacher@test.ly` (`12345678`).

## Screenshots

| shot | what it proves |
|---|---|
| `student-dash-{1440,768,390}-{paper,ink}.png` | the student dashboard on the migrated shell — default rail state (72px, the shipped `sidebarCollapsed: true` default), both themes, every band |
| `teacher-dash-{1440,768,390}-{paper,ink}.png` | same, teacher (FAC identity) |
| `student-dash-expanded-1440-{paper,ink}.png` | the **264px expanded rail** (Ctrl+B) — the §R325.a expanded pin, both themes |
| `teacher-dash-expanded-1440-{paper,ink}.png` | same, teacher |
| `student-subroute-active-1440-paper.png` / `teacher-subroute-active-1440-paper.png` | a sub-route navigation: the active row's ink fill + orange tick end-state |
| `student-rail-collapsed-1440-paper.png` / `teacher-rail-collapsed-1440-paper.png` | the 72px rail after collapse |
| `student-drawer-open-390-paper.png` | the phone drawer over the backdrop (z 530 / 529) |

`probe-geometry.json` — the measured pins (Playwright computed-style probe, both roles,
both themes). This is the load-bearing evidence: every §R325 pin below was READ OFF the
live DOM, not eyeballed.

## Verdict

| # | §R325 pin | verdict | evidence |
|---|---|---|---|
| 1 | sidebar **264px expanded / 72px rail** | **PASS** — `--sidebar-w`/`--sidebar-w-collapsed` now alias `--app-sidebar-w`/`--app-sidebar-rail` (tokens.css, one migration, 256/64 literals retired); grid measured `264px 1176px` expanded, `72px 1368px` rail | probe-geometry.json; `*-dash-expanded-*` vs `*-dash-1440-*` |
| 2 | top bar **56px** + hairline bottom border | **PASS** — `--topbar-h` aliases `--app-topbar-h`; measured 56px both themes; the 1px `--rule` seam measured always-on; the phone band's raw 60px re-joined the token | probe; `*-dash-*` |
| 3 | active nav = orange tick + ink fill-wipe (200ms, RM instant) | **PASS** — `.nav-item.on::before` re-keyed to `--app-signal` (measured rgb(250,54,0), 2px, inset-inline-start 0, entrance 120ms `--app-t-hover`); the new `.nav-fill` child sweeps `scaleX 0→1` at `--t-fast` 200ms; label/icon flip to `--app-bg` in lockstep (measured paper label on ink fill in light, ink label on paper fill in Ink) | probe; `*-subroute-active-*`; `*-dash-expanded-*` |
| 4 | role identity — pattern chip + mono code in the sidebar footer | **PASS** — `.sidebar-role-id[data-role]` consumes all seven `--app-role-pat-*` seats; codes STU (student, dots) / FAC (teacher, hatch) measured live at `--fs-mono-md` 11.67px Geist Mono, `dir="ltr"`; hidden on the collapsed rail; aria-hidden (the role is announced by the adjacent role label) | probe; `*-dash-expanded-*` |
| 5 | nav group headers mono 11px | **PASS** — `.nav-section-label` re-keyed to `--fs-mono-md` (11.67px @1440, Geist Mono) | probe |
| 6 | top bar targets ≥44px (search · notifications · theme · profile) | **PASS** — bell min 44×44, user trigger min-block 44, search input 44px, NEW `.topbar-theme` toggle min 44×44 (radius 0 chrome recipe); the «اسأل AI» pill (32px) is NOT in the mission's enumerated four — left, documented below | probe |
| 7 | bottom nav: opaque `--app-bg`, orange 2px top rule, ≥44px, safe-area | **PASS** — container re-keyed to `--app-bg` ground + `--app-line` seam (already alpha-1 since R319); the **orange 2px top rule is the ACTIVE CELL's marker** re-keyed to `--app-signal` (a permanent orange container rule would spend the one signal on chrome AND swallow the active cell's own marker — §R325's restrained-signal law keeps it on the state); cells floor 52px; `env(safe-area-inset-bottom)` already in the container padding; activation pop retimed 400ms → `--app-t-page` | probe + VLM pass on `student-dash-390-ink.png` («distinct small orange top bar», dock opaque) |
| 8 | page transitions ≤350ms, RM instant | **PASS** — the shell's route entrance (PageTransition keyed remount → `page-enter`) now rides `--app-t-page` (measured 0.32s); as-found it rode `--motion-duration-short` 200ms (the 400ms the §R325.a delta note records was the bottom-nav pop — retimed); RM: polish r162 `animation: none` kill + r325-app.css `--app-t-page→0ms` collapse = instant; **the guest 200ms fade is untouched** (shell-scoped override) | probe (`route_entrance_animation_duration: 0.32s`) |
| 9 | route progress + breadcrumbs | **PASS (verified, no change)** — ScrollProgress mounts in AppShell (polish §, 3px accent strip, RTL-origin, z-popover) and was already live; breadcrumbs are page-owned via `PageHeader breadcrumbs` (CourseDetailPage, AdminSyncPage, AdminExtraPages, …) — they render inside the shell's content track on sub-routes; no shell work owed | code check |
| 10 | Ink variants — every shell surface reads the token pairs | **PASS** — sidebar ground = `color-mix(--surface 96%, --bg)`, topbar = `var(--surface)`, dock = `--app-bg`, dropdowns/panels = §2 pairs via components.css/notifications.css; zero app-local hex in the new layer (contract-pinned); the active fill/label inversion measured resolving correctly in BOTH themes | probe (ink block); `*-ink` shots |

## Honest gaps / notes

- **«Theme toggle» in the top bar** = the new compact `.topbar-theme` button (flips the
  RESOLVED light↔dark, same contract as the user-menu item). The 3-way
  Light/Dark/System segmented control stays in the sidebar footer. Audit 4-A2 P3-19
  flagged theme-control duplication as an IA decision — there are now three theme
  surfaces (footer segmented, topbar icon, user-menu item); consolidation remains the
  recorded follow-up, the P2.3 brief asked for the top-bar seat explicitly.
- **The «اسأل AI» pill** (topbar quick action, 32px) is below the 44px floor and was
  left as-is — it is not one of the mission's four enumerated targets, and its height
  is owned by the `.btn.sm` recipe outside the shell sheets.
- **VLM reliability**: glm-5v-turbo drifted on two passes (one returned an HTML
  hallucination, one misread label text at 390px); the two constrained passes that
  returned prose agree with the DOM probe (orange tick + ink fill + STU chip; light
  fill + dark label in Ink; orange top bar on the dock's active cell). The probe JSON
  is the authoritative record.
- **Default rail state**: the shipped default is the 72px collapsed rail
  (`ui.store.ts` `sidebarCollapsed: true`); the 264px expanded state is the toggle
  state. Both are evidenced.
- **Gate fix outside the shell**: `check:motion-tokens` was RED on the merge base —
  Y6's `.toast-stack` seat easing transitioned `inset-block-end` (a layout property,
  4-A11 P2-10). Converted to the transform-family `translate` (same var, same
  geometry, same 200ms register); `lib/bottomStack.ts`'s consumer grammar docblock
  records the deviation.

## Gates (this session)

- `npm run typecheck -w frontend` ✅ · `typecheck:tests` ✅ · eslint on changed files: 0 errors
- vitest: **full frontend suite 3032/3032 ✅** (240 files; was 3015/3015 at the merge
  base, +17 from the new `r325-shell-css-contract.test.ts`)
  - AppShell suites (skiplink 12 + onboarding-palette 13) ✅
  - r305-shell-css-contract ✅ · r325-app-css-contract ✅ (unmodified pins)
  - r325-shell-css-contract (NEW, 17) ✅
  - shell neighborhood: r305-shell-states 19, r305-topbar-cluster 13, nav-active-vocabulary,
    r168a-shell-grid-a11y 13, nav-coverage 19, r305-nav-maps ✅
- `npm run check:colors` ✅ · `npm run check:motion-tokens` ✅ · `check:raw-css --strict` ✅
