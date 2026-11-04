# R334 Round 2 — Phase D: Teacher screens (task 3-i, branch `r334/r2-teacher`)

**Owner:** A-Teacher. Scope: `apps/mobile/app/teacher/**` (except `_layout.tsx` = shell, `ai.tsx` = assistant) + `src/features/teacher/components.tsx` + `src/features/teacher/wire.ts` (+ test) + this doc.
**Verification labels (honesty):** `tsc --noEmit` **0 errors** · `wire.test.ts` **11/11** · `render-net.test.tsx` **113/113 GREEN** (after the Round-2 audit fix below) · `npm run lint` **0 errors** (5 pre-existing warnings outside this module) · **device/emulator: UNVERIFIED** (no KVM in sandbox — EAS preview is the owner's channel).

## What changed

### Top-4 (deep)

| Screen | Changes |
|---|---|
| `(tabs)/dashboard.tsx` | Stats **hierarchy**: one hero card (CountUp «طلابي» + THE accent RingProgress للحضور) over quiet StatLines — the 2×2 KpiCard grid is gone (one-accent rule). Quick-actions row (تصحيح/حضور/بث/بحوث) on `PressableScale` (72pt targets). Today's classes as a horizontal **strip** (phase-badged, ongoing = strong rule, done = 55% opacity). Grading queue header carries «N بانتظار التصحيح» (`arCount`). Wire extras via `parseTrend/parseFeed/parsePendingGroups` — the `as unknown as Wire*` double casts are dead. `rgba(0,0,0,0.08)` trend track → `p.border`. `humanizeError` on both error seats. |
| `grades.tsx` | **FAST grading flow**: inline `Segmented` rubric (نوع التقييم), compact scale row (الدرجة العظمى/الوزن with stored-scale adoption preserved), and ONE swipeable grading card — score + inline feedback `Field`, «حفظ والتالي» saves per-student with `haptics.notify('success')`, **optimistic merge** into the `["teacher","offering",id,"grades",scope]` cache + invalidation reconcile, then **auto-advance**. Swipe-next between students via RN `PanResponder` (RTL: leftward drag = التالي, ±48px, horizontal-dominant); **why not gesture-handler**: a static RNGH import crashes the jest render net (RNGH v3 `installUIRuntimeBindings` native task — documented in foundations/sheets.md §lazy-native-graph); AppSheet's lazy-require trick is owned by `ui/sheet.tsx`, so the panel uses PanResponder + explicit السابق/التالي buttons (44pt). Read table on `DataList` + `makeRow` (big rosters recycle; rows show stored score for the picked kind + band). All errors via `humanizeError`; grades payload via `parseGradeRows` (typed, structural). |
| `live.tsx` | `ConfirmDialog` → **`ConfirmSheet`** for destructive END/CANCEL (loading holds). **Haptics** on every transition (`notify('success')` on create/START/END/CANCEL, `notify('error')` on failures). «جلسة جديدة» migrated to **`AppSheet`** (snap lg, scrollable, sticky footer) with `SheetTextInput` fields — keyboard-aware. Session rows show honest **«طلاب المقرّر N»** counts (the live API has no attendee feed — enrolled count only, labeled as such). Idle clarity: «لا يوجد بث مباشر الآن…» line + 30s auto-refresh note. `humanizeError` everywhere. |
| `(tabs)/students.tsx` + `students/[offeringId].tsx` + `OfferingRoster` | Roster = **searchable `DataList`** (SearchBar on name/universityId) + **`FilterSheet`** (risk: الكل/مستقر/متابعة [WATCH+AT_RISK]/حرج) + **per-student `AppSheet`** (snap lg, scrollable: attendance/avg/متابعة/risk-score StatLines, signals, suggestion, quick grade with haptics). Count line «N من أصل M». Both screens: kit triad (`SkeletonList`/`ErrorState`/`EmptyState`) replaces the ad-hoc muted-text/Card error grammar; `flex: 1` list slot (DataList is the scroller — never inside `Screen scroll`). |

### Light-touch (mechanical, no redesign — TODOs honest)

`attendance`, `assignments`, `exams`, `exams/[templateId]`, `labs`, `materials`, `curriculum`, `messages*`, `alerts*`, `research-review`, `(tabs)/intelligence`, `(tabs)/profile`, `(tabs)/schedule`:

- **humanizeError adopted** at every `ErrorState`/toast/error-state seat — raw `(e as Error).message` eliminated from the teacher module (matches audit-static §6 P0).
- **rgba(0,0,0,\*) literals → palette seats**: attendance cell borders + summary tracks (`p.border`), templateId answer well (`p.surfaceHover`), dashboard trend track (`p.border`).
- **Raw-enum fallbacks killed (Round-2 audit)**: every `LABEL[x] ?? x` / `MAP[x] ?? x` escape hatch that could leak a wire enum to the UI now falls back to an honest Arabic seat — materials type «ملف», assignment kind «تكليف», exam kind «تقييم», question type «سؤال», difficulty «غير محدَّد», transcript «غير معروف», analytics key «مؤشّر», rank «غير محدَّدة», and `StatusBadge`'s unmapped-status branch «غير محدَّدة» (16 call sites across 8 files).
- Two Arabic copy typos fixed in `components.tsx`: «أعد تعرين» → «أعد تعيين», «مؤشّق المخاطرة» → «مؤشّر المخاطرة».
- Empty/error states already existed on these screens (R1/R2-shell work) — verified by grep, not redesigned.

**TODO (next round, honestly out of timebox):**
- `curriculum.tsx` (627 ln authoring monolith) + `exams.tsx` filter sheet (audit lists it for FilterSheet migration) + `assignments.tsx` grading queue → still `RowList.map`, still `SelectField` sheets; candidates for DataList/AppSheet in Round 3.
- `materials.tsx` upload flow: no AppSheet/progress polish this round.
- `(tabs)/intelligence.tsx` analytics: still hand-mapped wire reads.
- `attendance.tsx` roster: still ScrollView+map (bounded by roster size, but >20 rows would benefit from DataList).
- Grades swipe is PanResponder, not RNGH gesture-handler (rationale above); if the shell hoists `GestureHandlerRootView` + RNGH jestSetup, upgrade the panel to `FlingGestureHandler`.

## Round-2 audit fix — the render net was actually RED (not OOM)

The R2-Teacher session's log claimed render-net was "OOM-killed by the sandbox" — re-running it
showed that was wrong: **`teacher/live` failed with RNGH v3's `installUIRuntimeBindings`**.
R334's AppSheet loads bottom-sheet → RNGH on the FIRST sheet render (foundations/sheets.md
§lazy-native-graph), and the teacher commits were the FIRST consumers — `teacher/live` was the
first route in net order to mount an AppSheet signed-out, so the import-time native task killed
the suite. The net had never been green with these commits.

**Fix (consumer-side, no shared-file edits):** `useSheetMounted(open)` in `components.tsx` —
mounts a sheet only after its first `open` (latch keeps it mounted so the dismiss animation
plays). Signed-out render nets never open a sheet → the native graph never loads under jest.
On device the sheet engine loads at first open (one-time cost, same as before). Applied to all
four teacher sheet mounts: live create `AppSheet`, live `ConfirmSheet`, roster `FilterSheet`,
roster student `AppSheet`. render-net **113/113** after the fix.

## New shared logic (colocated tests)

- `src/features/teacher/wire.ts` — `parseGradeRows`, `parseTrend`, `parseFeed`, `parsePendingGroups` (structural reads, malformed rows dropped, no invented keys) + `nextIndex`/`isDirtyDraft` (grading navigation). `wire.test.ts` **11/11**.
- `components.tsx` — `OfferingRoster` (search/filter/DataList/AppSheet), `QuickField` on `SheetTextInput`, `RISK_FILTERS`/`matchesRiskFilter`, `useSheetMounted` (net-safe sheet mount latch).

## Adoption counts (in owned files)

| Library | Before (this module) | After | Where |
|---|---|---|---|
| reanimated (via `@/motion`) | 0 | **3 primitives** | CountUp + RingProgress (dashboard), PressableScale (dashboard quick actions + today strip) |
| FlashList (via `DataList`) | 0 | **2 screens** | grades read table, OfferingRoster (both student screens) |
| bottom-sheet (via AppSheet) | 0 | **4 sheets** | roster student sheet, roster FilterSheet, live create AppSheet, live ConfirmSheet |
| haptics (`src/haptics.ts`) | 0 | **~10 seats** | grades save/advance, live transitions, roster open/filter, quick-grade success/error |
| expo-image | 0 | **0** | rosters are initials-avatars (`Avatar`), no photo URLs on any teacher wire — nothing honest to adopt |
| humanizeError | 0 | **every error seat** (~45 call sites across 16 files) | module-wide |

## Six-states checklist (top-4)

State coverage by construction (jest render-net mounts every route signed-out; states are the kit's own `states.tsx` components):

| State | dashboard | grades | live | students/roster |
|---|---|---|---|---|
| Skeleton | `SkeletonList rows=6` full-load + `rows=2` today section | offerings/roster `SkeletonList` | sessions `SkeletonList rows=4` | offerings + roster `SkeletonList` |
| Empty | no-semester consolidated card; queue «لا انتظار»; no slots; trend «لا بيانات كافية»; feed «لا متطلبات»; «لم تُسند إليك مقرّرات» | «لا مقرّرات» / «لا يوجد طلاب» | «لا توجد جلسات قادمة» + CTA | «لم تُسند إليك مقرّرات» / «لا يوجد طلاب مسجَّلون» / search «لا نتائج مطابقة» |
| Error | `ErrorState` (humanizeError) ×2 | ×2 (offerings, roster) | ×1 | ×2 (offerings, roster) |
| Offline | queries pause via the shell's onlineManager bridge; cached rows render; failures show the Arabic network copy through humanizeError | same | same | same |
| Long text | `numberOfLines` on every row title/subline; feed body 2-line clamp | student names 1-line + a11y label carries the full readout | session title/topic clamped; slot course 1-line | names 1-line, sublines clamped |
| Large font | `minHeight` (44/48/72) everywhere, no fixed heights, `T` variants scale; Segmented/Buttons keep ≥44pt | same + wrapping Field labels | same | same |
| RTL | default RTL (`ensureRTL`), row `flexDirection: row` mirrors; swipe maps leftward=next (RTL reading order); digits via `latn` | same | same | same |
| Dark | palette seats only (rgba literals killed); RingProgress `p.accent`/`p.border` track theme-aware | `p.border`/`Field` tokens | `p.bg` sheet inputs | tokens throughout |
| Tablet | strip/quick-action rows stretch (`flex`), DataList recycles; no fixed-width screens | same | KPI row 3-up | search+filter full width |

**Device-UNVERIFIED**: pixel output, gesture physics (swipe threshold feel), sheet snap positions, haptics, dark-mode contrast — EAS preview builds are the owner's channel.

## Verification log (this worktree, Round-2 audit commit)

- `npx tsc --noEmit` → exit 0 (needed `NODE_OPTIONS=--max-old-space-size=2048`; sandbox shares 4 GB with sibling worktrees).
- `npx jest --no-cache --runInBand src/features/teacher/wire.test.ts` → **11/11**.
- `npx jest --no-cache --runInBand src/test/render-net.test.tsx` → **113/113** (was 112/113 + RNGH
  crash on `teacher/live` before the `useSheetMounted` gating — see the audit section).
- `npm run lint` → **0 errors**, 5 warnings — all pre-existing outside `app/teacher/**` +
  `features/teacher/**` (the unused `TextInput` import warning in components.tsx was removed).
