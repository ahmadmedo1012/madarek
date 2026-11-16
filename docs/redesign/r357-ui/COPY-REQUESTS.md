# R357-UI → main agent: requests & decisions (no copy changed here)

The UI lane never edits Arabic copy, routes, permissions or logic. These are
the items that need the main agent's decision instead.

## 1. DECISION — the "≤7 visible sidebar items" target vs a pinned test
The brief sets the nav target at ≤7 visible items per role. The measured
result (`audits/evidence/r357/nav-audit.md`): ADMIN 7, QUALITY 5, OWNER 7 —
met. TEACHER 12, STUDENT 19 — **not met, and not reachable by regrouping**,
because `frontend/tests/unit/nav-coverage.test.ts` pins the opposite:

- "the always-visible spine carries the high-frequency study surfaces" requires
  12 named student routes to stay visible without a toggle (dashboard, schedule,
  calendar, courses, catalog, results, online-exams, library, ai, profile,
  messages, alerts);
- the student nav has 7 groups, so even with every group collapsed the default
  view is 7 toggle rows and zero destinations;
- the 34-destination census is pinned, so nothing can be dropped.

Hitting ≤7 for student/teacher therefore means deleting the spine contract
and rewriting those pins — an IA + test decision. The UI lane did not weaken a
pinned test to make a number look good. Everything else in the target was done:
one glyph per destination across all three menus (drift 23 → 0), duplicate
reachability measured, low-frequency families collapsed for all five roles.

## 2. Copy — none requested
No nav label was changed. The bar's short labels vs the sidebar's full names
remain the documented 5-B5 convention (shortening is fine, renaming is not);
the audit reports them separately so they are not mistaken for drift.

## 3. Mobile evidence — credentials the UI lane does not own
`.github/workflows/ui-screens.yml` (manual dispatch) walks the **student**
shell on the CI emulator using the seeded `student@test.ly` account that
`smoke-alive.yaml` already uses, and uploads screenshots. Walking the other
four roles needs seeded teacher / registrar / quality / owner demo accounts
(the accounts lane owns `shared/testAccounts.ts` + the seed). Once those exist,
adding a flow per role is a copy of `apps/mobile/.maestro/screens-student.yaml`
plus one workflow input.
