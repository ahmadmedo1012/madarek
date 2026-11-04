# R334 §9 follow-up — Consensus P0 tickets applied (A-Fix-P0s)

**Branch:** `feat/mobile-r334-pro` · **Scope:** review-panel consensus P0s only
(surgical; no redesigns). Reviewer docs read from the review worktrees
(`r334/rev1` → review-1.md, `r334/rev2` → review-2.md) via `git show`.

**Verification labels (honesty):** `npm run typecheck` = 0 errors ·
`npx jest --no-cache --runInBand src/test/render-net.test.tsx` = 113/113 green ·
`npm run lint` = 0 errors / 15 warnings, **all pre-existing and none in the
touched files**. **No emulator/device in this sandbox** — motion/haptics feel
is code-verified only (reduced-motion gates asserted by construction via
`useStaggerEntrance`/`@/motion`; haptics go through the throttled `@/haptics`
module). No new deps. `app/quality` gap literals left untouched (T24 is P2).

## Tickets applied

| Reviewer | Ticket | File(s) | Fix |
|---|---|---|---|
| R1 #1 | T1 — governance dashboards: zero motion (M=6) | `app/quality/(tabs)/dashboard.tsx`, `app/admin/(tabs)/dashboard.tsx`, `app/owner/(tabs)/dashboard.tsx`, `app/teacher/(tabs)/dashboard.tsx` | Added `useStaggerEntrance({ base: 40, step: 60 })` block entrances (≤7 children, last block ≤400 ms — the motion.md cap), mirroring `student/(tabs)/dashboard.tsx`. Reduced-motion safe (hook gates + reanimated `ReduceMotion.System`). |
| R1 #1 | T1 — haptics on quick-action/menu rows | `app/admin/(tabs)/dashboard.tsx` (5 menu rows), `app/owner/(tabs)/dashboard.tsx` (7 menu rows), `app/teacher/(tabs)/dashboard.tsx` (segmented filter, 4 quick actions, today-slot chips) | `haptics.selection()` on every chip/segment/menu/quick-action press. Quality dashboard has no pressable chips/segments/filters or submits (read-only surface) — nothing to wire; its EmptyState actions already fire through `Button`'s wired impact. |
| R1 #1 / R2 P0-2 | a11y labels on governance surfaces | `app/quality/(tabs)/dashboard.tsx`, `app/owner/(tabs)/dashboard.tsx` | Per-entry Arabic `accessibilityLabel` on papers rows (`الحالة: العدد`); owner alert rows labeled (`تنبيه {severity}: {title} · {منذ}`) via `SEVERITY_LABEL` map. MetricHero/MetricTile already carried Arabic labels (verified). |
| R1 #1 | State grammar — errors ≠ EmptyState | `app/admin/(tabs)/dashboard.tsx` | `stats.isError` now renders `ErrorState` (humanizeError + onRetry) — the «تعذّر تحميل الإحصائيات» EmptyState misuse is gone (R1 T5). |
| R1 #1 / R1 T6 | State grammar — empties ≠ muted text | `app/owner/(tabs)/dashboard.tsx`, `app/quality/(tabs)/dashboard.tsx`, `app/teacher/(tabs)/dashboard.tsx` | Owner alerts empty → `EmptyState room="building"`. Quality attendance/papers empties → `room="lecture-hall"` / `room="library"`. Teacher dashboard: grading queue (restructured so the count-only wire case stays an honest Card, only true-empty gets the room, `room="exam-hall"` + «فتح التكاليف» action), today strip (`room="lecture-hall"` + «الجدول الأسبوعيّ» action), feed (`room="building"`), offerings (`room="library"`). Icon-variant EmptyStates (emptySemester, trend) were already kit states — left surgical. |
| R1 #2 | T2 — untyped `Record<string, unknown>` wire casts | `src/api/quality.ts`, `app/quality/(tabs)/dashboard.tsx` | Typed `QualityOverview` against the backend wire (learning.routes.ts `/quality/overview`: groupBy role/status counts + 3 scalars, index signature keeps future aggregates honest). Deleted all four `as Record<string, unknown>` casts; every rendered value still coerces via `numOf` and every key routes through the Arabic label maps (`ATTENDANCE_KEY_LABEL`, `PAPER_STATUS_LABEL`, HonestLedger's KNOWN_LABELS) — no raw unknowns to UI. Simplified the double-`numOf` lectures tile. |
| R1 #3 / R2 P0-2 | a11y on sparse surfaces | `app/admin/(tabs)/students.tsx`, `app/student/results.tsx`, `app/teacher/(tabs)/intelligence.tsx`, `app/select-institution.tsx` | Admin enrollment rows: `تسجيل في {المقرّر} — التقدُّم N%`. Results breakdown rows: `{نوع التقييم} في {المقرّر}: {الدرجة} من {الحد} — الوزن N%`. Intelligence risk rows enriched: `طالب {الاسم} في {المقرّر} — {مستوى الخطر} — درجة الخطر N%`. Select-institution rows: role in the label (`اختيار {المؤسّسة} — {الدور}`) + `accessibilityState={{ busy, disabled }}`. |
| R1 #4 | T4 — teacher RingProgress missing label | `app/teacher/(tabs)/dashboard.tsx` | Arabic `accessibilityLabel` (`نسبة الحضور N%` / `لا بيانات حضور بعد`) on the attendance ring, matching the student dashboard twin. |

## Explicitly NOT done (lead tickets, out of this pass)

- **R2 P0-1** bidi isolation for mixed Arabic↔Latin strings — reclassified P1 (needs a `BidiText` primitive in shared ui, CONTRACTS-frozen files).
- **R2 P1-4** sparse-state dead-space redesign (vertical centering of EmptyState in leftover viewport) — P1.
- **R2 P1-5** exams «متاح الآن» accent-chip hierarchy — P1.
- R1 T7–T26 beyond the P0 consensus above (schedule strip re-capture, transcript virtualization, settings grouping, etc.).
