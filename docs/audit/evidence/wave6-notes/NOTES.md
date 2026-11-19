# Wave 6 notes — r368 Task 6-a (wave 1) session log

Worktree `/home/z/wt/r368-t6`, branch `wip/r368-t6` (base `76de5a8c`).
Instrument: `scripts/conformance/pages-{student,teacher}.mjs --url http://localhost:5306/`
(own vite `5306 --strictPort`, hermetic e2e fixture transport; hermetic stub API on :4000
for manual browsing). All numbers below are MY OWN runs from this tree.

## N1 · Student family — /training + /achievements lifted off the floor

**Baseline (committed `dc046b26`, see `baselines/pages-student-light+dark-2026W1.json`):**
`/training` 96.7 @1440 / **80.0 @390** (light + dark); `/achievements` same. Axes:
pattern 80 (page-family numeral absent) + hover 0 @390 (no header CTA at small widths).

**Root cause (both routes):** the r333 batch-A sweep (`ca5a5ad0`) deleted the
training/achievements/gamification ANATOMY rules from the shared `training.css`
(level band, badge grid/tiles, leaderboard rows, tier orb, XP track, achievement
rows, reward banner, `.cp-*` row helpers) as "0-live-match" — but the sweep probed
routes whose `/training/me*` queries had NO fixtures, so those nodes rendered
nothing on the measured pages while the markup kept consuming the classes. Every
data-state surface since shipped unstyled (VLM evidence:
`screenshots/training-full-before-1440.png` — level band = stacked bare text, no
orb, no bar; `screenshots/achievements-full-before-1440.png` — badges = plain
list). The header-CTA/pattern-numeral axes failed because the only CTA lived in
the (unstyled) level band and the numeral was never drawn.

**Fix (smallest change, verbatim restoration):**
- NEW sheet `frontend/src/styles/student/training-anatomy.css` — the pre-r333
  rules restored verbatim (`ca5a5ad0^`, tokens only, same `@layer pages`, same
  order except one adjacent swap for stylelint no-descending-specificity). Not
  restored: selectors r333 kept in `training.css` (`.leaderboard-rank`, the
  `.badge-tile-rarity` earned/locked variants, `.cert-row`) — duplicate-selector
  ratchet. Reduced-motion off-switches restored with them.
  `training.css` itself is a SHARED sheet (competitions/colleges import it) and
  outside this task's ownership — hence a new task-owned family sheet.
- `pages/student/TrainingPages.tsx`: the «عرض الإنجازات» ghost CTA moved from
  the level band into the `PageHeader` actions seat (primary, sm) so it survives
  every state + width; `index="01"` numeral added to both page headers
  (the family contract — CatalogPage idiom). `AchievementsPage` gains the
  reciprocal «تصفّح المسارات» header CTA.
- `pages/student/{MorePages,ProfilePage}.tsx`: import the restoration sheet (they
  consume `.tier-orb`/`.xp-*`/`.leaderboard-*`/`.achievement-*`).

**After (own stack, 1440/390, light + dark identical):**

| route | before | after |
|---|---|---|
| `/training` | 96.7 / **80.0** | **99.5 / 100** |
| `/achievements` | 96.7 / **80.0** | **100 / 100** |

Full family re-measured light + dark (all 32 harness routes):
worst W1-owned cell 97.5 (`/student/university` @390 dark); every other W1 cell
≥ 98.0. Snapshots: `baselines/pages-student-after-{light,dark}-2026W1.json`.
`/vision` 96.7/80 is a T5-owned file — recorded in the handoff (§N4), not fixed.

**Gates:** focused vitest (7 files, 84 tests) green; root `npm run typecheck`
green; `lint:css` zero NEW errors (my sheet clean); `stylelint-gate.sh` ratchet
green (errors 20 held, warnings 87 tracked).

## N2 · Residuals (student family)

- `/student/payment` 98.1 — typeRungs axis only (single-rung page); ≥ floor,
  left as-is (no token-legal change available without new type tokens).
- `/student/social` 98.4 @1440 — typeRungs; same class.
- `/student/university` darkInk 88–89 in dark (97.5–97.7 overall, ≥ floor).
- VLM noted the level-band ProgressBar reads faint at 1440 — measured score
  99.5 with spacing/pattern 100; the bar uses the shared `ProgressBar`
  primitive (`polish.css` vocabulary). No change (shared primitive, not mine).
- Cross-family: `pages/competitions` + community consume `.leaderboard-list`/
  `.cp-*` and stay unstyled until their owner imports the restoration sheet
  (T5/wave-2 handoff item, not fixed here).

## N4 · Wave-2 handoff (files NOT touched this wave)

See `inventory.md` §3–§5 for the full route lists. Current measured state of the
shared seats wave 2 will inherit: AlertsPage (student harness) 99.5/99.4 ·
`/community` 99.0/99.5 · `/settings` 98.0/97.9 · AiAssistantPage 99.3 ·
LibraryPage 99.2/99.0. `/vision` 96.7/80.0 (pattern 80 + hover 0 @390 — same two
axes /training had) is T5-owned. Wave-2 families to measure + pass:
admin (16 routes), owner (15), quality (10), exams (3 seats).
