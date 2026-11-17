# R362 · B1 — The Compact-Spine Navigation Brief

Branch `agent/r362-shell-nav` · base `integration/r362-final-unification` @ `e98d6a0b`.
Owner: Agent 2 (Shell & Navigation) — this brief resolves the open
blocker the integrator assigned in `R362-COORDINATION.md`:

> Compact-spine navigation design brief: explore the ≤8-destination
> mobile drawer spine WITHIN the grouped collapsed-families contract
> (never a 26-item «المزيد» junk drawer; never deleting the coverage
> guards).

The brief answers the question with the repo's own instruments —
`scripts/qa/nav-audit.ts` (the r358 cross-menu census), the r319
iPhone-13 measurement rig, and the existing guard suites — and
converts the verdict into executable pins.

---

## 1 · The measured present (recalculated inventory)

`npx tsx scripts/qa/nav-audit.ts` on the baseline, cross-checked by
the unit census pins:

| Role | Destinations | Always-visible | Overflow (toggled) | Groups (collapsed) | Default drawer rows | Max clicks |
|---|---|---|---|---|---|---|
| STUDENT | **34** | 15 | 19 | 7 (4 collapsed) | 19 | 2 |
| TEACHER | **23** | 10 | 13 | 4 (2 collapsed) | 12 | 2 |
| ADMIN | **15** | 6 | 9 | 2 (1 collapsed) | 7 | 2 |
| QUALITY | **13** | 4 | 9 | 2 (1 collapsed) | 5 | 2 |
| OWNER | **16** | 5 | 11 | 3 (2 collapsed) | 7 | 2 |

Live drawer geometry (STUDENT, 390×844 iPhone-13, the same hermetic
mock harness `r319-shell-states.e2e.ts` drives): 19 default rows →
`.sidebar-nav` **scrollHeight 1105px vs 334px clientHeight = 3.31
scroller screens ≈ 1.31 × the 844px drawer viewport**. The account
cluster is pinned outside the scroll (4-A2 P1-2). The r319 B1b spec
proves every family reachable in the scroller — «المصفوفة
التعليمية» never clipped.

A truth repair rides this brief: the r183-B7 contract comment in
`nav.ts` claimed «default scrollHeight ≤2 screens at 390px» — a
claim that no longer holds under its own formula
(`scrollHeight ÷ clientHeight`) since the pinned-footer rework
shrank the scroller's clientHeight (546 → 334px). The comment now
quotes the live measurement and the re-cut's still-true wins (37%
shorter list than the 33-item drawer; account cluster out of the
scroll). Zero behaviour change — comment truth only.

## 2 · The three candidate spines

### Candidate A — the flat ≤8 spine (the blocker's literal reading)

Re-cut every role's drawer to ≤8 always-visible destinations.

* **ADMIN (6), QUALITY (4), OWNER (5)** — already ≤8. Nothing to do;
  the candidate is the shipped truth for three of five roles.
* **STUDENT (15 → 8)** — demote seven one-tap destinations into
  toggled families: `calendar`, `catalog`, `matrix`, `research`, `ai`,
  `profile`, `settings` (with `messages`/`alerts` forced in to fit 8).
  Computed geometry: 8 items + 6 family toggles = **14 rows vs the
  current 19 — a 0.87-swipe saving** (≈265px of the 334px scroller).
* **TEACHER (10 → 8)** — fold `intelligence` + `performance` into the
  «البحث والمحاضرة» family: 11 rows vs the current 12. One row saved.

Why rejected for STUDENT/TEACHER — the cost side of the ledger:

1. **Guard deletion is forbidden by the blocker's own text.** The
   r183-B7 spine test pins twelve always-visible cores —
   `calendar`, `results`, `online-exams`, `library`, `ai`, `profile`,
   `messages`, `alerts` among them — each pinned after a measured
   orphan/junk-drawer incident (4-A14 P1-1, A4 P2-3). Cutting to 8
   requires demoting pinned cores, i.e. weakening coverage guards.
2. **The measured trade is a bad trade.** Saving 0.87 swipe costs +1
   tap on every daily surface listed above — `calendar` is the
   r164-c one-calendar deadline view («every deadline surface
   united»); `messages`/`alerts` are the D2 personal-inbox doors;
   `intelligence` is a bottom-bar top-5 destination for teachers (the
   r299 mirror contract measured it among the most-used five).
3. **Row-count is the wrong metric.** The drawer's scroll burden is
   dominated by the pinned footer reservation and the 44px touch
   floor, not by items 9–15; the junk-drawer failure mode the blocker
   fears is structurally prevented by other guards (below), not by
   the visible count.

### Candidate B — the shipped grouped-families spine (status quo, re-measured)

Every low-frequency family behind ONE toggle row; every route keeps
its sidebar home; max interaction depth 2 clicks; the 9-item
per-group ceiling; bottom bar = 4 role-tuned destinations + «المزيد»
→ the same drawer. This is the r183-B7/r299/r211 architecture,
re-measured above. It is already the compact spine for ADMIN,
QUALITY and OWNER; for STUDENT/TEACHER it is the measured optimum
per the ledger in §2A.

### Candidate C — the hybrid («8 + overflow families», the junk-drawer trap)

Keep 8 visible and stuff everything else into one «المزيد» mega
family — 26 items behind one toggle with no group identity. This is
the exact «26-item «المزيد» junk drawer» the blocker forbids.
Rejected without measurement: the grouped-families contract exists
precisely because a collapsed menu is useful only when its
destinations still announce their family.

## 3 · The verdict

**The spine stays role-measured; the ≤8 reading is adopted exactly
where it already holds (ADMIN 6 · QUALITY 4 · OWNER 5) and rejected
for STUDENT (15) and TEACHER (10) on the measured ledger.** The
compact-spine question was never «can we cut to 8» but «what stops
the drawer from regrowing into the 3.2-screen / 26-item failure
mode» — and the answer is guards, not row-counts.

## 4 · The guard conversion (the executable verdict)

The gap this brief found: only STUDENT had pins (census 34 ·
visible ≤16 · the four collapsed families). Nothing stopped the
other four roles from silent regrowth — the exact class of drift
4-A14 P1-1 fixed for routes. `nav-coverage.test.ts` grows (19 → 30
tests, additive — no assertion weakened):

1. **The census pins ×5** — TEACHER 23 · ADMIN 15 · QUALITY 13 ·
   OWNER 16 (STUDENT 34 already pinned). Census drift is now a
   conscious re-pin everywhere.
2. **The spine ceilings ×5** — always-visible ≤16/11/7/5/6 (actual
   15/10/6/4/5, each with the same +1 conscious-slack the student
   pin has always carried). Crossing one forces review with a
   measured reason — the anti-junk-drawer ratchet; the 9-item group
   ceiling remains the intra-group twin.
3. **The collapsed-family drift guards ×4** — the exact shipped
   collapsed sets for the non-student roles. A family silently
   un-collapsing adds its whole item count to the default drawer;
   now it fails a test.

## 5 · What this brief deliberately does NOT change

* `nav.ts` structures — no destination moved, added or removed; the
  only edit is the truth-repaired r183-B7 comment (§1).
* Sidebar/Topbar/BottomNav behavior — the shell features the R362
  mandate lists (expanded/collapsed rail, hover-intent + keyboard
  tooltips, mobile drawer with overlay/outside-click/Esc/focus
  trap/scroll lock/44px rows, active-route auto-expansion, kicker
  title context, ⌘K palette, notifications, theme, account menu) are
  shipped and pinned green by the r319/r305 suites; re-verifying
  them green is this round's job, re-designing them is not.
* The three test files the mandate names — `nav-coverage.test.ts`
  (strengthened above), `r319-shell-states.e2e.ts` and
  `r319-ios-contracts.ios.e2e.ts` (both re-run green on this branch;
  their contracts match the shipped intended behavior, so no
  assertion was touched).

## 6 · Reproduction

```bash
npx tsx scripts/qa/nav-audit.ts          # the §1 table
cd frontend && npx vitest run tests/unit/nav-coverage.test.ts   # 30 pins
npx playwright test tests/e2e/r319-shell-states.e2e.ts           # 6/6
npx playwright test tests/e2e/r319-ios-contracts.ios.e2e.ts \
                    tests/e2e/mobile-bottom-nav.e2e.ts          # 9 passed (16 WebKit-skipped on Linux hosts)
```

The §1 drawer geometry measurement used a throwaway spec on the
r319 rig (kept out of the tree per the evidence law); the numbers it
produced are quoted above and re-derivable from the audit + the
shipped B1b assertions.
