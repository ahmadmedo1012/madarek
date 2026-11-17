# R362 — Agent 2 Delivery Record · Application Shell, Sidebar, Header & Navigation

Branch `agent/r362-shell-nav` · base `integration/r362-final-unification`
@ `e98d6a0b`. Executed from an authenticated fresh clone (the brief's
`/home/rh2011/Projects/madarek-r362-shell` worktree does not exist on
this host — the same environment note Agents 4 recorded in
`AGENT4-DELIVERY.md` and the integrator in `INTEGRATION-RECORD.md` §4).
An earlier sandbox reference build (a standalone Next.js shell
demonstrating the five role menus, drawer, palette and coverage audit)
served as the exploration sandbox for the review below; the shipped
work is the real-repo work on this branch.

## 0 · Final SHA

| | |
|---|---|
| Branch head | see the commit that carries this record (HEAD of `agent/r362-shell-nav`) |
| Base | `e98d6a0b` (integration baseline) |
| Commits | `ae065c94` nav.ts truth repair · `c6f40cb3` the B1 spine belt · the B1 brief · this record |
| Push target | `origin/agent/r362-shell-nav` only |

## 1 · The review (mandate §1 — what the existing implementation actually is)

The shipped shell is mature and heavily pinned, not a blank slate:

- `lib/nav.ts` + `lib/routes.ts` — the five role menus with the
  grouped collapsed-families contract (r183-B7), frequency-aware
  hierarchy, bilingual labels, the 9-item group ceiling, and the
  4-A14/5-B5 orphan-repair history. Census: **34 · 23 · 15 · 13 · 16**
  (recalculated, matches the mandate's inventory exactly).
- `Sidebar.tsx` — expanded/collapsed icon rail (Ctrl+B, overlay-inert),
  portaled hover-intent + keyboard tooltips, the mobile drawer
  (overlay registration, Esc-as-topmost-layer, focus trap with
  restore, ref-counted scroll lock, ghost-drawer band fix, 44px
  touch floor), accordion groups with active-group auto-expansion,
  the pinned account cluster.
- `Topbar.tsx` / `AppShell.tsx` — title + quiet group-context kicker
  (derived from nav.ts — single source), ⌘K GlobalSearch, notifications
  dropdown, theme toggle, account + institution menus, scope chips.
- `BottomNav.tsx` — 4 role-tuned destinations + «المزيد» → the same
  drawer; the r299 glyph-mirror contract (one glyph per destination
  per screen).
- Guard suites — `nav-coverage` · `nav-routes-consistency` ·
  `nav-active-vocabulary` · `r305-nav-maps` · `Sidebar-Topbar` ·
  `BottomNav-owner` · `Topbar-alertsPath` unit pins;
  `r319-shell-states` / `r319-shell-chrome` / `r319-ios-contracts` /
  `mobile-bottom-nav` e2e contracts; `scripts/qa/nav-audit.ts` the
  cross-menu audit.

The mandate's §3–§7 feature list (expanded/collapsed states, drawer
behavior, tooltips, auto-expansion, breadcrumbs-equivalent kicker,
search, notifications, theme, account, five role structures) is
therefore **shipped and pinned** — this round's job was re-measuring
it, closing the one assigned blocker, and guarding the gaps found,
not churning a green system for cosmetics.

## 2 · The work

### B1 resolved — the compact-spine brief (`B1-COMPACT-SPINE.md`)

The integrator's open blocker: *explore the ≤8-destination mobile
drawer spine within the grouped collapsed-families contract*. The
brief measures the present (audit + the r319 iPhone-13 rig: STUDENT
19 default rows / 1105px scrollHeight / 334px clientHeight = 3.31
scroller screens), evaluates three candidates (flat ≤8 · the shipped
grouped-families · the «المزيد» mega-family trap), and rules:

- **≤8 adopted where it already holds** — ADMIN 6 · QUALITY 4 ·
  OWNER 5 always-visible.
- **≤8 rejected for STUDENT (15) and TEACHER (10) on the measured
  ledger** — the cut demotes routes the r183-B7 tests pin as
  high-frequency cores (calendar · results · online-exams · library
  · messages · alerts) to save ≈0.87 swipe; weakening those guards is
  what the blocker itself forbids.
- **The junk-drawer failure mode is guarded structurally**, not by
  row-counts — see the belt below.

### The truth repair (`nav.ts`, `ae065c94`)

The r183-B7 `NavGroup.collapsed` contract comment promised «default
scrollHeight ≤2 screens at 390px»; under its own formula that stopped
holding when the pinned-footer rework shrank the scroller
(546 → 334px clientHeight). The comment now quotes the live
measurement and the re-cut's still-true wins. Comment-only change.

### The guard belt (`nav-coverage.test.ts`, `c6f40cb3`)

The gap the brief found: only STUDENT had pins. The other four roles
could silently regrow (the drift class 4-A14 P1-1 fixed for routes).
19 → 30 tests, additive only:

- census pins ×5 (34/23/15/13/16);
- always-visible spine ceilings ×5 (≤16/11/7/5/6 vs actual
  15/10/6/4/5, the student pin's +1 slack convention);
- collapsed-family drift guards ×4 (the exact shipped family sets).

## 3 · Route coverage (mandate §2 — recalculated, all green)

| Role | Permitted | Reachable | Orphans | Duplicates | Dead links |
|---|---|---|---|---|---|
| STUDENT | 34 | 34 | 0 | 0 | 0 |
| TEACHER | 23 | 23 | 0 | 0 | 0 |
| ADMIN | 15 | 15 | 0 | 0 | 0 |
| QUALITY | 13 | 13 | 0 | 0 | 0 |
| OWNER | 16 | 16 | 0 | 0 | 0 |

Instruments: `nav-coverage` (census + orphans + duplicates),
`nav-routes-consistency` (every destination has a real App.tsx route
row; redirects land on declared routes), `r305-nav-maps` (icon
uniqueness per role, bottom-nav ⊆ sidebar, single active state),
`nav-audit.ts` (zero icon drift across sidebar/bottom/tabs; label
variants are the documented bar-shortening only). No route moved,
so nothing needed re-guarding — the belt makes the census conscious
going forward.

## 4 · Design decisions (mandate §3–§7)

1. **Role-measured spine over uniform row-count** (the B1 verdict) —
   the ≤8 reading is true for three roles, rejected-with-measurement
   for two. Rationale and numbers in the brief.
2. **No churn of the green shell** — every §3–§7 feature is shipped
   and pinned; re-verified this round instead of re-designed. The
   deliberate exception history (r183-B7 re-cut, PP-X2 hub removal,
   5-B5 label unification) is preserved — those were measured
   decisions, not accidents.
3. **Kicker over breadcrumbs** — the R305-A4 quiet group-context
   kicker derives from the same nav.ts data (nav and title can never
   drift, truthful by construction: renders only on exact
   destinations). A full breadcrumb trail would add a second
   competing title vocabulary; the repo's design language (Heron)
   already ruled on this surface.
4. **Comment truth over comment beauty** — the one edit inside
   nav.ts's structures repairs a stale measurable claim rather than
   adding new claims.

## 5 · Tests actually executed (with outcomes)

| Suite | Command | Result |
|---|---|---|
| Full frontend unit | `npm run test` (TZ=UTC vitest) | **3124/3124** (baseline 3113 + 11 new pins) |
| Typecheck app | `npm run typecheck -w frontend` | 0 errors |
| Typecheck tests | `npm run typecheck:tests -w frontend` | 0 errors |
| Lint | `npm run lint` | 0 errors, 16 pre-existing warnings (all in untouched `pages/colleges`/`pages/owner` files — Agent 5 territory) |
| nav audit | `npx tsx scripts/qa/nav-audit.ts` | clean: 0 icon drift, 0 duplicate glyphs, documented bar-shortening only |
| Shell states e2e | `npx playwright test tests/e2e/r319-shell-states.e2e.ts` | **6/6** (B1 wash guard + B1b drawer grammar + bottom dock + avatar, light & dark @390) |
| Shell chrome e2e | `npx playwright test tests/e2e/r319-shell-chrome.e2e.ts` | passed |
| iOS contracts + bottom nav | `npx playwright test tests/e2e/r319-ios-contracts.ios.e2e.ts tests/e2e/mobile-bottom-nav.e2e.ts` | **9 passed, 16 skipped** (WebKit unavailable on this Linux host — the spec's own graceful skip; CI's macOS matrix runs the WebKit half) |
| Spine measurement | throwaway spec on the r319 rig (kept out of the tree per the evidence law) | 19 default rows · 1105/334px · 3.31 scroller screens — quoted in the brief §1 |

Visual evidence: per the coordination law («Evidence PNGs never enter
the tree — Actions artifacts only»), the e2e runs above write their
evidence frames under `audits/evidence/r319-shell/` (gitignored) and
CI artifacts own the record. The earlier sandbox reference build's
screenshots live in the sandbox workspace, out of this repo.

## 6 · Coordination requests (for the integrator to route)

None this round — no shared design primitive needed a change. One
observation worth routing to Agent 5 (no edit made, ownership
respected): the 16 pre-existing `react-hooks/exhaustive-deps` lint
warnings live in `pages/colleges/CollegePages.tsx` and
`pages/owner/*.tsx` — pre-dating this branch, unchanged by it.

## 7 · Changed files (complete)

```
frontend/src/lib/nav.ts                    | +15 −2   (comment truth repair)
frontend/tests/unit/nav-coverage.test.ts   | +70      (the B1 spine belt)
docs/redesign/r362-shell-nav/B1-COMPACT-SPINE.md | new (the brief)
docs/redesign/r362-shell-nav/AGENT2-DELIVERY.md | new (this record)
```

Nothing outside the Agent 2 ownership set was touched
(`R362-COORDINATION.md` §File ownership).
