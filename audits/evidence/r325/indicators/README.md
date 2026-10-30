# R325 P2.5 — INDICATORS — visual evidence (student dashboard showpiece)

The indicator language (`frontend/src/components/patterns/indicators.tsx` +
`frontend/src/styles/r325-indicators.css`) applied to the student dashboard —
the owner's «no themes, patterns or indicators» verdict, answered.

## What the frames show

| File | App | Viewport | Theme |
|---|---|---|---|
| `before-1440-paper.png` | main @ :5173 | 1440×900 · full page | Paper (light) |
| `before-1440-ink.png` | main @ :5173 | 1440×900 · full page | Ink (dark) |
| `before-768-paper.png` / `before-768-ink.png` | main @ :5173 | 768×900 | Paper / Ink |
| `before-390-paper.png` / `before-390-ink.png` | main @ :5173 | 390×844 | Paper / Ink |
| `after-1440-paper.png` | worktree @ :5213 | 1440×900 | Paper |
| `after-1440-ink.png` | worktree @ :5213 | 1440×900 | Ink |
| `after-768-paper.png` / `after-768-ink.png` | worktree @ :5213 | 768×900 | Paper / Ink |
| `after-390-paper.png` / `after-390-ink.png` | worktree @ :5213 | 390×844 | Paper / Ink |

## Capture protocol

- Account: `student@test.ly` / `12345678` (the seeded demo student), real API
  `:4000` (the seeded stack) — every number on screen is real data; nothing
  is mocked.
- BEFORE = the `main` checkout's dev server (the pre-P2.5 dashboard:
  ProgressBar + ProgressRing in the hero, WeekStrip in [02], no mastery
  cells, no grade distribution, no AI entry).
- AFTER = this branch's dev server. **Port note:** 5212 was already
  occupied by a concurrent agent's server, so this evidence ran on
  **:5213** (same worktree, same proxy to the shared API).
- Themes: `localStorage['madarek-theme'] =
  {"state":{"mode":"light"|"dark","modeUpdatedAt":1},"version":0}` then
  reload — the zustand-persist key the app's ThemeToggle writes.
- DOM verification at capture time: `.ind-ruler` ×1, `.ind-segments` ×1,
  `.ind-mastery` ×3 (the three seeded gap rows), `.ind-grades` ×1,
  `.ind-streak` ×1, `.ind-sched` ×1, `.dash-ai-row` ×1;
  `scrollWidth − clientWidth = 0` at 1440 and 390 (no overflow).

## Honest states visible in the AFTER frames

- **StreakTicks** renders its empty register on purpose: the API carries no
  daily study log, so the momentum band shows seven empty day ticks with
  today outlined and the honest note — no fabricated streak.
- **AttendanceTicks** is built + unit-tested but deliberately NOT mounted on
  the dashboard: no student-facing per-session attendance hook exists yet
  (only the aggregate `attendancePct` in the KPI line). Awaiting a hook.
- GradeBars renders only when at least one graded datum exists
  (`/me/results`); the seeded student has graded works, so the distribution
  shows with the student's own band in the orange.
