# Lists — `DataList` on FlashList v2 (R334 · Phase B4)

**Owner:** agent 2-d (`apps/mobile/src/components/ui/data.tsx`, `data.test.tsx`, this doc).
**Status:** primitive landed + tested (jest 25/25, `tsc --noEmit` 0) — **no screen consumes it yet**; the migration map below is the work order.

---

## 1. Why

The static audit (route inventory, R334 1-b/1-c) flagged **32 screens** that render server-driven rows as `ScrollView`/`Refreshable` + `RowList` + `.map()` — every row mounts eagerly, nothing recycles, and each screen hand-rolls its loading/empty/error tri-state. `DataList` is the ONE generic list: FlashList v2 behind a screen-shaped API, with the existing `states.tsx` states as defaults so migrated screens keep their exact look.

## 2. The API (`src/components/ui/data.tsx`)

### `DataList<T>` — the list IS the scroller

```tsx
<DataList
  data={list.items}                    // readonly T[] | null | undefined
  renderItem={CourseRow}               // ({ item, index, target }) => ReactElement | null
  keyExtractor={(c) => c.id}
  // first-load tri-state (defaults = states.tsx, slot-overridable)
  isLoading={list.isLoading}           // + nothing cached → SkeletonList(rows=6)
  isError={list.isError}               // + nothing cached → ErrorState + onRetry
  errorMessage={list.errorMessage}
  onRetry={() => list.refetch()}
  emptyTitle="لا توجد مقرّرات بعد"       // generic Arabic default: «لا توجد بيانات بعد»
  emptyMessage="ستظهر المقرّرات المسجّلة هنا."
  // pull-to-refresh (TanStack shape)
  refetch={list.refetch}               // absent → no RefreshControl at all
  isRefetching={list.isRefetching}
  // pagination (accumulate; footer owned by DataList)
  onEndReached={list.onEndReached}     // gated at hasNextPage=false
  isFetchingNextPage={list.isFetchingNextPage}   // → «جارٍ تحميل المزيد…» footer
  loadMoreError={list.loadMoreError}   // string → compact retry footer (rows stay)
  onRetryLoadMore={list.retryLoadMore}
  // sticky section headers (FlashList v2: headers are ordinary data items)
  stickyHeaderIndices={sectionStarts}  // indices into `data`
  stickyHeaderOffset={topBarHeight}
  // layout
  contentPadding={{ horizontal: 16, top: 12, bottom: 24 }}  // sp-ladder keys
  rtl                                   // DEFAULT TRUE — Heron is Arabic-first
/>
```

Notes:
- `target` in `renderItem` is FlashList v2's `RenderTarget` — `"Cell" | "StickyHeader" | "Measurement"`; restyle pinned headers on `target === "StickyHeader"`.
- `extraData` when a row depends on more than `item` (FlashList is a `PureComponent`).
- Mount inside a bounded-height parent (`flex: 1`); do **not** nest inside `<Screen scroll>`.
- `makeRow` (below) makes rows memo-stable; `extraData` covers the rest.

### `makeRow` — memoized row factory

```tsx
const CourseRow = makeRow<Course>(({ item }) => (
  <LedgerRow accessibilityLabel={`مقرّر ${item.name}`} onPress={…}>
    …
  </LedgerRow>
));
```

Call at **module scope**; keep handlers `useCallback`-stable (a fresh arrow per render defeats the memo — the classic silent regression).

### `usePagedList` — the pagination adapter (useInfiniteQuery → DataList)

```tsx
const list = usePagedList<Course>({
  queryKey: ["courses", "enrolled", scope],
  fetchPage: (page) => getPage("/student/courses", { page, limit: 20 }),
  limit: 20,          // hasNext fallback when an endpoint returns no meta
  staleTime: 30_000,
});
```

Returns `items` (flattened rows), `meta/page/totalPages/total`, the full refresh trio (`refetch/isRefetching`), the pagination trio (`onEndReached/isFetchingNextPage/hasNextPage`), `loadMoreError` + `retryLoadMore` (previous rows stay on screen — TanStack v5: a failed next page flips `isError` while cached `items` persist; DataList gates its full-screen `ErrorState` on `isError && rows.length === 0`, so the user sees rows + a compact retry footer, never a blank page), and the raw `query` for invalidation. `placeholderData: (prev) => prev` keeps the list mounted while a filter key changes (house pattern).

### Kept byte-compatible (backward-compat gate)

`StatLine`, `KpiCard`, `ProgressBar`, `Avatar`, `RowList`, `LedgerRow` — same names, same signatures, same pixels. **~90 importing screens untouched**; proof: render-net (113 screens) green + typecheck 0.

## 3. Example — a full Arabic-first screen body

```tsx
const CourseRow = makeRow<EnrolledCourse>(({ item }) => (
  <LedgerRow
    accessibilityLabel={`مقرّر ${item.name}`}
    onPress={() => router.push(`/student/courses/${item.offeringId}`)}
  >
    <T variant="body" weight="bold">{item.name}</T>
    <T variant="sm" color="muted">{item.instructor} · التقدّم {latn(item.progress)}٪</T>
    <ProgressBar ratio={item.progress} accent />
  </LedgerRow>
));

function CoursesBody() {
  const list = usePagedList<EnrolledCourse>({
    queryKey: ["student", "courses", scope],
    fetchPage: (page) => getPage("/student/courses", { page, limit: 20 }),
  });
  return (
    <DataList
      data={list.items}
      renderItem={({ item }) => <CourseRow item={item} />}
      keyExtractor={(c) => c.offeringId}
      isLoading={list.isLoading}
      isError={list.isError}
      errorMessage={list.errorMessage}
      onRetry={() => list.refetch()}
      refetch={list.refetch}
      isRefetching={list.isRefetching}
      onEndReached={list.onEndReached}
      isFetchingNextPage={list.isFetchingNextPage}
      hasNextPage={list.hasNextPage}
      loadMoreError={list.loadMoreError}
      onRetryLoadMore={list.retryLoadMore}
      emptyTitle="لا توجد مقرّرات بعد"
      emptyMessage="ستظهر المقرّرات التي تسجّل فيها هنا."
      contentPadding={{ horizontal: 16, bottom: 24 }}
    />
  );
}
```

## 4. Web support verdict (§web)

**FlashList v2.3.2 mounts on RN-web** (`isNewArch` returns true there; the recycler runs as pure JS), but we ship a **FlatList fallback behind the same API** on `Platform.OS === "web"`:

- sticky-header animation rides `Animated` with `useNativeDriver`, unsupported on RN-web;
- recycling wins are marginal at our row counts (tens, not thousands);
- FlatList on RN-web is the battle-tested path.

Same props, same states, same footers — `renderItem` receives `target: "Cell"` (web has no sticky/Measurement passes). Verified in jest via `Platform.OS` override (rows + footer + RefreshControl wiring render; FlashList never mounts). **Not verified in a real browser** (no emulator/preview channel in this sandbox — honesty label; owner should eyeball one migrated screen on the RN-web export).

**Sticky headers:** native v2.3+ supports them first-class (`stickyHeaderIndices` + `stickyHeaderConfig` — offset, native driver; horizontal lists throw). On web the indices pass through to FlatList, but RN-web's sticky support is weak — treat sticky as native-only and let web scroll headers away (documented limitation).

## 5. Migration map — the 32 flagged screens (priority order)

Static-audit set: screens rendering **query-driven** rows via ScrollView/Refreshable + `.map()` (bounded static/config lists stay on `RowList` — that is not a migration target). Re-derive with:
`rg -l "RowList|LedgerRow" app src/features --glob '*.tsx' | xargs rg -l "\.map\("` then keep the ones whose mapped array comes from `useQuery`. Final cross-check against 1-c's `audit-static.md` happens at merge (it lands on another worktree).

**P0 — heaviest lists, hottest screens (migrate first, one PR each):**

| # | Screen | Domain | Notes |
|---|--------|--------|-------|
| 1 | `src/features/messages/MessagesUI.tsx` (`student/messages`, `teacher/messages`) | messages | conversations list is the longest unbounded list in the app; thread view stays a ScrollView |
| 2 | `app/student/(tabs)/courses.tsx` | courses | tab-hot; progress rows already `LedgerRow` |
| 3 | `app/admin/(tabs)/students.tsx` | students | 6 queries, search+filter → `usePagedList` key |
| 4 | `app/owner/(tabs)/users.tsx` | students | role-filtered; paginated endpoint |
| 5 | `app/admin/(tabs)/teachers.tsx` | students | same shape as #3 |
| 6 | `app/student/catalog.tsx` | courses | paginated catalog |
| 7 | `app/owner/alerts.tsx` | alerts | alert feed, unbounded |
| 8 | `app/quality/alerts.tsx` | alerts | same feed, quality scope |
| 9 | `app/admin/alerts.tsx` | alerts | same feed, admin scope |
| 10 | `src/features/notifications/NotificationsScreen.tsx` (student/teacher/owner alerts tabs) | alerts | push permission card stays above the list |
| 11 | `app/student/calendar.tsx` | events | day-sectioned → the sticky-header exemplar |
| 12 | `app/student/schedule.tsx` | events | week sections, same pattern |
| 13 | `app/student/lectures/[lectureId].tsx` | lectures | lecture/lesson list inside a course |

**P1 — clear wins, calmer traffic:**

| # | Screen | Domain |
|---|--------|--------|
| 14 | `app/student/library.tsx` | courses/materials |
| 15 | `app/student/online-exams.tsx` | exams |
| 16 | `app/student/webinars.tsx` | lectures |
| 17 | `app/student/assignments.tsx` | coursework |
| 18 | `app/student/materials.tsx` | materials |
| 19 | `app/student/labs.tsx` | labs |
| 20 | `app/student/results.tsx` | exams |
| 21 | `app/student/jobs.tsx` | jobs |
| 22 | `app/student/mooc.tsx` | courses |
| 23 | `app/student/live.tsx` | sessions |
| 24 | `app/admin/courses.tsx` | courses |
| 25 | `app/quality/(tabs)/courses.tsx` | courses |
| 26 | `app/quality/professors.tsx` | students |
| 27 | `app/admin/invites.tsx` | students |
| 28 | `app/admin/(tabs)/faculties.tsx` | structure |
| 29 | `app/owner/institutions.tsx` | structure |
| 30 | `app/owner/activity.tsx` | events (audit log) |
| 31 | `app/teacher/exams.tsx` | exams |
| 32 | `app/teacher/grades.tsx` | grading |

**P2 — evaluate last (bounded pages or already fine):** `teacher/attendance.tsx`, `teacher/(tabs)/students.tsx` (renders via features), dashboards/profiles/achievements/community/help/vision/training/colleges/competitions — mostly static config rows on `RowList`; leave them.

**Migration recipe (per screen):** keep the screen's header/filters; swap the `Refreshable`+`RowList`+`.map` body for `DataList` + a module-scope `makeRow` row; keep the exact Arabic empty/error copy by passing `emptyTitle/emptyMessage`; add `usePagedList` only where the endpoint paginates (`getPage`), else feed the existing `useQuery` array. Render-net must stay green; new list screens get a colocated test like `data.test.tsx`.

## 6. Verification labels (honesty)

- ✅ `tsc --noEmit` 0 · ✅ `data.test.tsx` 25/25 (jest-expo, iOS platform → real FlashList v2 renders; web fallback exercised via `Platform.OS` override) · ✅ render-net 113/113.
- ❌ not verified: real scroll physics/recycling on device (no emulator — `/dev/kvm` absent), browser rendering of the web fallback, sticky-header pinning at pixel level. Owner runs EAS preview builds for device truth.
