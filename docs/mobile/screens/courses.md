# Courses screens — «مقرراتي» · تفاصيل المقرّر · دليل المقرّرات (R334 3-d)

Round-2 recompose of the three courses screens on the R334 foundations
(DataList/FlashList v2, sheets, motion, theming, resilience). Owner: task
3-d, branch `r334/r2-courses`. Files owned:
`app/student/(tabs)/courses.tsx`, `app/student/catalog.tsx`,
`app/student/courses/[offeringId].tsx`,
`src/features/student/coursesLogic.ts` (+ its colocated net), this doc.

Verification labels (this sandbox has NO emulator — KVM absent):
`tsc --noEmit` **0** · `jest --no-cache --runInBand` render-net **113/113**
+ poisoned-net + coursesLogic = **697/697 green** · `expo lint` **0 errors**
(2 pre-existing warnings in `src/brand/plan/*`, untouched) ·
**device-UNVERIFIED** — captures are Round 3 (lead/EAS preview).

---

## 1. The three screens, one visual language

| | `/(tabs)/courses` | `/courses/[offeringId]` | `/catalog` |
|---|---|---|---|
| Scroller | `DataList` (FlashList v2) | `DataList` × 3 tabs | `DataList` + `usePagedList` |
| Card | `PressableScale` + hairline border, `CourseWell`, `RingProgress` | same + expo-image lecture posters | same (`CourseWell`; no imagery in the catalog payload) |
| Entrance | stagger ≤ 8 cards (base 60 + step 60 = ≤420ms) | same per tab | same |
| Segments | list/grid toggle | «المحاضرات / المواد / الإعلانات» | — (search + department filter instead) |
| Sheet | `FilterSheet` (فصل/قسم/تقدّم) | `ActionSheet` (share/report) | `FilterSheet` (قسم) + `AppSheet` course card |
| Pagination | client filters over one feed | — | infinite scroll (`onEndReached` + load-more footer) |

All chrome is semantic-palette only — `grep rgba(` over the owned files
returns **nothing** (dark mode rides the palette; the API-tinted
`CourseWell` uses `#RRGGBB` + hex-alpha suffixes on the DATA color, never a
literal black/white). Every touch target sits on the **44pt floor**
(`touchFloor`); segment/tab/filter controls use `minHeight: 44` so a 200%
font can wrap a label without clipping or losing the floor.

## 2. Decisions (the WHY)

- **Courses list** — the ScrollView+map anti-pattern is retired; the
  FilterSheet runs a draft→apply reducer (`courseFiltersReducer`), facets
  derive from loaded rows, and the filter-empty state offers «إزالة
  التصفية». The empty state is the **library room** with an honest door to
  the catalog («دليل المقرّرات») — enrollment is admin-mediated, never a
  fake "add course" CTA. A stable `rows` memo keeps facet/filter memos
  honest while the feed loads.
- **Course detail** — sticky identity header (well + ring + schedule
  chips), one accent (the segmented tabs), DataList per tab so a 40-lecture
  curriculum stays virtualized. Announcements are **OFFERING-scoped** via
  `scopeId` (`isOfferingAnnouncement`) — the feed is the student's whole
  feed, filtered client-side (honest for older payloads missing `scopeId`).
  `Share` failures humanize via `humanizeError` + toast.
- **Lecture state chips are watch-state, not live/upcoming** — the Lecture
  model carries no `scheduledAt`/live flag, so «مباشر/قادمة» cannot be
  derived honestly. The chip reads the student's watch state:
  **مكتملة (mint) · تابِع N% (copper) · لم تُشاهَد (grey)** — semantic
  feedback tones, one accent, `Badge` component.
- **Catalog** — `usePagedList` on the paginated `/courses` endpoint replaces
  the manual «السابق/التالي» pager (infinite scroll + the honest
  «جارٍ تحميل المزيد…» footer + compact retry footer on a failed next
  page). Search keeps the 250ms debounce; `placeholderData` keeps rows
  mounted while the term key changes. The department FilterSheet takes its
  facets from `/faculties` (loaded on the sheet's FIRST open — not on every
  catalog visit) and applies **server-side** `departmentId`.
- **Catalog rows are reference cards, not links** — a catalog course has no
  offering to open, so the press opens a **mount-on-demand `AppSheet`
  course card** (name/code/department/credits/description + the honest
  «تواصل مع شؤون الطلاب» line) instead of pretending a destination exists.
- **Offline state without NetInfo** — `useNetworkStatus` crashes under the
  jest render-net (NetInfo has no native runtime there and no setup mock
  exists; `src/test/setup.ts` is outside this task's ownership — verified
  empirically). The catalog's offline branch is therefore keyed on the
  transport's own failure: `ApiError.code === "NETWORK"` → `OfflineState`
  with retry; anything else → `ErrorState` + `humanizeError`. Honest and
  testable today; swapping in the NetInfo hook is a lead follow-up once
  setup.ts owns a NetInfo mock.
- **Icon fix (latent crash)** — `lucide-react-native` 1.64 dropped
  `more-horizontal` (renamed `ellipsis`); the committed detail screen's
  import would fail Metro AND jest. Swapped to `icons/ellipsis` (same
  three-dots glyph).

## 3. Six-states checklist (per screen)

Legend: ✅ wired · ⚠️ partial/notes · ❌ TODO. «Long-text» = very long
course/lecture titles; «large-font» = 200% font scale; states render via
DataList slots (skeleton/empty/error) or screen branches.

### `/(tabs)/courses` — مقرّراتي

| State | Status | Where |
|---|---|---|
| Skeleton | ✅ | `SkeletonList rows=5 rowHeight=104` (list) / `rows=3 rowHeight=140` (grid) |
| Empty | ✅ | library room «لا توجد مقرّرات» + honest door; separate filter-empty with «إزالة التصفية» |
| Error | ✅ | `ErrorState` + `humanizeError` + retry (pull-to-refresh stays) |
| Offline | ⚠️ | rows stay cached while TanStack holds them; cold offline surfaces as the humanized NETWORK error — swap to `OfflineState` with the lead's NetInfo mock (same as catalog) |
| Long text | ✅ | course name wraps 2 lines; teacher/code/schedule single-line ellipsis |
| Large font | ✅ | segments/filter `minHeight:44`; names wrap 2 lines |
| RTL | ✅ | DataList `rtl` default; check ends the row; count chip latin digits (`latn`) |
| Dark | ✅ | palette-only; zero rgba literals |
| Tablet | ✅ | grid view pairs cards (`chunkPairs`); DataList recycles either way |

### `/courses/[offeringId]` — تفاصيل المقرّر

| State | Status | Where |
|---|---|---|
| Skeleton | ✅ | full-screen `SkeletonList` under `StackHeader` |
| Empty | ✅ | per tab: lecture-hall «لا توجد محاضرات» / library «لا توجد ملفات» / building «لا توجد إعلانات» |
| Error | ✅ | screen-level + announcements-tab `ErrorState` + `humanizeError` |
| Offline | ⚠️ | same cached-rows policy as the list (NetInfo follow-up) |
| Long text | ✅ | header name 2 lines; description 3; announcement body 3 |
| Large font | ✅ | tabs `minHeight:44`; header rows stack (flex) |
| RTL | ✅ | RTL DataList; chips wrap `flexWrap` |
| Dark | ✅ | palette-only; posters get `surfaceHover` placeholder |
| Tablet | ✅ | DataList virtualization; expo-image posters `recyclingKey` |

### `/catalog` — دليل المقرّرات

| State | Status | Where |
|---|---|---|
| Skeleton | ✅ | `SkeletonList rows=5 rowHeight=96`; facets sheet shows «جارٍ تحميل الأقسام…» |
| Empty | ✅ | library room «لا توجد مقرّرات»; search/filter-empty with «إزالة التصفية»; no-institution branch «لم تُحدَّد مؤسستك بعد» |
| Error | ✅ | `ErrorState` + `humanizeError` + retry; load-more failure → compact footer, rows stay |
| Offline | ✅ | `ApiError.code === "NETWORK"` (rows empty) → `OfflineState` + retry |
| Long text | ✅ | name + description wrap 2 lines each |
| Large font | ✅ | filter button 44×44; labels `minHeight`-safe |
| RTL | ✅ | RTL DataList; department groups Arabic-collated |
| Dark | ✅ | palette-only; honest-door banner on `accentSoft` |
| Tablet | ✅ | full-width reference cards, virtualized |

## 4. Adoption counts (owned files only)

| Foundation | courses.tsx | [offeringId].tsx | catalog.tsx |
|---|---|---|---|
| reanimated (PressableScale/RingProgress/stagger) | ✔ | ✔ | ✔ (PressableScale/stagger) |
| FlashList v2 via DataList | ✔ | ✔ ×3 | ✔ |
| @gorhom/bottom-sheet (Filter/Action/AppSheet) | ✔ FilterSheet | ✔ ActionSheet | ✔ FilterSheet + AppSheet |
| haptics (`haptics.selection`) | ✔ view toggle + filter taps | ✔ tab switch | ✔ department taps |
| expo-image | — | ✔ lecture posters | — (no imagery in payload) |

## 5. Captures — TODO Round 3 (EAS preview / device; no emulator here)

Per screen, light + dark, phone + one tablet, Arabic locale, 100% + 200%
font: skeleton · empty · error · offline (airplane) · long-title fixture ·
filter sheet open (list + catalog) · course card sheet (catalog) · grid
view (list) · tab switch + poster rows (detail). Add to
`docs/mobile/screens/captures/` when the channel exists.

## 6. Follow-ups for the lead

1. **NetInfo jest mock in `src/test/setup.ts`** → then swap the catalog's
   `isNetworkFailure` branch (and the list/detail offline notes) to
   `useNetworkStatus()`; consider mounting `NetworkBanner` + the
   `useOnlineManagerBridge` at the app root (resilience doc §adoption).
2. `FilterOptionRow` now exists twice (courses list + catalog) — hoist to
   `components/ui/` when a third consumer appears.
3. Catalog card sheet could deep-link a teacher/faculty page once those
   routes exist.
