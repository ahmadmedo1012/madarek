# Screens — Lecture player · Library · Materials · Document viewer (R334 · Phase D / task 3-e)

**Owner:** agent 3-e (Round 2). Files: `app/student/lectures/[lectureId].tsx`, `app/student/library.tsx`, `app/student/materials.tsx`, `app/document/[filename].tsx`, `src/test/lecture-player.test.ts`, this doc.
**Status:** landed — `tsc --noEmit` 0 · jest `render-net` + `lecture-player` 136/136 (`--no-cache --runInBand`) · eslint 0 errors (10 warnings, all intentional patterns listed in §5).

---

## 1. What was built

### 1.1 Lecture player — custom chrome over `expo-video`

- **`nativeControls={false}` inline + a `VideoStage` overlay**: scaled play/pause (`PressableScale` + `haptics.impact("light")`), ±10s chips, speed chip, captions chip, fullscreen chip. The play/pause button is the **ONE orange accent** (`p.accent`); every other glyph rides the fixed on-ink pair (`themeFor("light")` — the letterboxed video is dark in both themes, so the chrome always paints light-on-ink).
- **Seek bar** (`SeekBar`): scrub-then-commit via `PanResponder` on a **physical-LTR timeline** (video timelines read left→right even in RTL apps — same call as the double-tap halves). Buffered tint + played fill + knob; `accessibilityRole="adjustable"` with ±10s increment/decrement actions.
- **Double-tap seek ±10s**: tap halves are PHYSICAL (start half rewinds), feedback is **transform/opacity-only** reanimated ripples (`withSequence`), skipped entirely under reduced motion. Single tap toggles chrome; the delayed single-tap reads chrome through a ref (closure-staleness guard).
- **Speed**: `PickerSheet` with the web-parity ladder `0.75 / 1 / 1.25 / 1.5 / 2` (`PLAYBACK_RATES`), labels in the user's numerals (`fmt(r)×`).
- **Remaining time** shown next to the clock — both through `playerClock`/`remainingClock`, **numerals-safe** (pad-then-convert; see §3 D1).
- **Transcript**: VTT cues render in a nested **`DataList`** (height-capped 360, `nestedScrollEnabled`) — the old 200-cue `.map` mounted every row (audit §3). Captions overlay reuses the same cues (`activeCueAt`).
- **Chrome auto-hide** while playing (3.2s timer, `interactionKey` resets it); always visible when paused.
- **Kept working**: resume-seek (watchedSec−3s, once) + the «استأنفنا من حيث توقفت» toast, 10s watch reporting (high-water never regresses; offline = next tick retries, newest payload wins), checkpoint overlay (now `AppSheet`) with server verdict + haptic notify, chapters, prev/next bar, materials card.
- **Quality sheet: deliberately NOT built** — the API exposes a single `videoUrl` per lecture (no HLS/DASH variants); there is nothing to pick from.
- Fullscreen delegates to `VideoView.enterFullscreen()` — expo-video replaces our chrome with native controls there (platform limitation, disclosed in the file header).

### 1.2 Library (`/student/library`)

- Both tabs migrated to **`DataList`**; books tab pages through **`usePagedList`** (pages ACCUMULATE — the old pagination replaced the page, capping users at 20 rows).
- **`FilterSheet` availability view-filter** (all/available/borrowed). Honest disclosure: the `/library/books` endpoint exposes no filter params, so this filters the LOADED pages — the sheet says so («تصفية على الكتب الظاهرة أدناه — حمّل المزيد لتوسيع النتيجة») and the filter pure helper `bookMatchesAvailability` is unit-tested.
- **`EmptyState room="library"`** with «لا توجد ملفات» as the default title (search/filter miss overrides it with specific copy).
- `humanizeError` on every failure surface; selection haptics on the segment switch; borrow/return toasts.

### 1.3 Materials (`/student/materials`)

- **`DataList`** body; type-specific file icons (PDF/DOC→text, PPT→deck, ZIP→archive, VIDEO, IMAGE, fallback file) + sizes via `sizeLabel`.
- **`FilterSheet` course × type** — client-side over the FULL feed (`/me/materials` returns everything, so the filters are honest, not view-limits). `materialMatches` pure helper unit-tested.
- «لا توجد ملفات» EmptyState, humanized errors, Arabic pluralized counts (`countAr`).

### 1.4 Document viewer (`/document/[filename]`)

- **Skeleton loading**: honest indeterminate `RingProgress` + `SkeletonText` while downloading.
- **Error + retry**: «تعذّر فتح الملف» — humanized (`humanizeError`), retry re-arms the attempt.
- **Share/save via `ActionSheet`** (share through `expo-sharing`; open in the system viewer first, share sheet as the fallback when no viewer exists).
- **Honest offline behavior**: the download failure path never fakes a viewer; the attempt state is keyed to the path so a new file derives a fresh downloading state for free.

---

## 2. Adoption counts (this task's four screens)

| Foundation | Where | Count |
|---|---|---|
| `DataList` / `usePagedList` / `makeRow` | library ×2 lists, materials, nested transcript list | 4 call sites (2 paged, 1 nested virtualized, 1 plain) + 4 `makeRow` rows |
| Sheets (`AppSheet`/`PickerSheet`/`FilterSheet`/`ActionSheet`/`SheetTextInput`) | checkpoint overlay + speed sheet; 2 filter sheets; share sheet + annotations sheet | 6 sheet call sites |
| `haptics` (impact/selection/notify) | all four screens | 26 call sites |
| Reanimated (`PressableScale`, `useSharedValue`/`useAnimatedStyle`, `withSequence`/`withTiming`) | VideoStage chrome fade, double-tap ripples; Skeleton/RingProgress via `@/motion` | 1 direct consumer + 2 motion primitives |
| `expo-image` | — | **0** (no remote imagery on these screens: avatars are initials-based, no lecture posters in the API) |

---

## 3. Decisions worth remembering

1. **Pad-then-convert numerals** — `playerClock` pads `String(n).padStart(2,"0")` BEFORE `arabicIndic()`; padding after injects a latin `0` into an arabic-indic clock (`0١:…`). Hours stay unpadded (web h:mm:ss parity: `1:00:00`).
2. **Physical-LTR media surfaces** — double-tap halves and the seek bar use PHYSICAL x/width, not logical RTL-flipped positions. A timeline is a physical LTR surface even in an RTL app (YouTube parity); `doubleTapSeekDelta(x, width)` is exported + tested.
3. **`useArmOnOpen`** (all four files) — RNGH v3's native install cannot boot under jest, so the `@gorhom/bottom-sheet` family mounts only after the user first opens it. Closed screens never mount the engine → render-net stays green; on device the sheet behaves normally, close animation included. This is the accepted `react-hooks/set-state-in-effect` warning pattern (see §5).
4. **Player mutation contract** — expo-video's seek/rate are property assignments on an external handle (`seekPlayer()` seats this at module scope; `player.playbackRate = next` keeps its react-compiler warning because the linter cannot know the SDK object is mutable).
5. **Leaf isolation** — `VideoStage` keeps its own 4Hz `timeUpdate` mirror; the parent's 1Hz `currentSec` no longer re-renders the whole screen while playing.
6. **No `rgba(0,0,0,*)` literals** in any of the four files — scrims use `themeFor("light").palette.text` + opacity.

## 4. Six-states checklist

| State | Lecture player | Library | Materials | Document |
|---|---|---|---|---|
| **1 Loading** | `SkeletonList` (route frame) | `DataList isLoading` → SkeletonList (books via paged hook) | `DataList isLoading` | RingProgress + `SkeletonText` (indeterminate) |
| **2 Error + retry** | `ErrorState` + humanizeError (fetch); inline «تعذّر تحميل الفيديو» card + `loadSource` retry (video src) | `ErrorState` + humanizeError; `loadMoreError` compact footer keeps rows | `ErrorState` + humanizeError | `ErrorState` compact + «إعادة المحاولة» re-arms the attempt |
| **3 Empty** | «لم يتم تحديد محاضرة» (no id) · «لا فصول/مقاطع» inline notes | `EmptyState room="library"` «لا توجد ملفات» / search-miss copy | `EmptyState room="library"` «لا توجد ملفات» | — (viewer without a file is unreachable by construction) |
| **4 Ready** | full player + chapters + checkpoints + transcript + materials card | books ledger + loans + borrow/return | filtered ledger with icons/sizes | open-in-viewer + share + annotations panel |
| **5 Refresh / more** | query `refetch` via headers; transcript `staleTime` 5min | pull-to-refresh + accumulate pagination («جارٍ تحميل المزيد…») | pull-to-refresh | — (single download attempt) |
| **6 Offline / degraded** | watch report retries on the next 10s tick (newest payload wins); unmount flush fire-and-forget; transcript load error is a non-fatal inline line | filter is a disclosed view-filter over loaded pages; rows stay on next-page failure | filters are client-side → keep working offline over cached feed | download error surfaced honestly; web fallback link; no fake viewer |

## 5. Verification labels (honesty)

- **Verified (jest + tsc, no emulator in this sandbox):** pure helpers (`playerClock`, `remainingClock`, `doubleTapSeekDelta`, `clampSeek`, `activeCueAt`, `resolveReportTotal`, `PLAYBACK_RATES`, `bookMatchesAvailability`, `materialMatches`), route render-net (all screens mount), type contracts.
- **UNVERIFIED on device:** seek-bar scrubbing feel, buffered-tint accuracy, double-tap ripple timing, chrome auto-hide timing, haptic feel, fullscreen hand-off (native controls take over), playback-rate audio pitch, captions sync. These need an emulator/device pass.

## 6. TODOs / hand-offs

- **Byte-level download progress** for the document viewer requires `src/api/pdf.ts` (`downloadAuthenticated` fetches a buffer — no progress events). Owned elsewhere; the ring is honestly indeterminate until then.
- **Quality selector** blocked on the API exposing per-lecture variants (single `videoUrl` today).
- **Device/emulator pass** for §5 items.
- The `useArmOnOpen` lint warnings (4 files) vanish if/when the sheet engine gains a jest-safe boot; the pattern is documented at each use site.
