# Comms & Agenda screens — الرسائل · الجدول · التقويم · التكاليف

**Owner:** agent 3-h (`apps/mobile/app/student/{alerts,messages,schedule,calendar,assignments}.tsx`, `src/features/{messages,notifications}/**`, this doc).
**Status:** Round 2 landed — all four screens rebuilt on the R334 foundations; gates green (`tsc --noEmit` **0** · jest render-net + messages **134/134** · eslint **0 errors**, 2 warnings both pre-existing in `src/brand/plan/*`, baseline-identical).
**Honesty label:** everything below is logic-gated by jest + typecheck only — **no emulator/device pass has happened**. Render-net proves each route module imports and default-exports a function; it does not prove pixels, sheet spring physics, or RTL layout on glass.

---

## 1. What landed

### 1.1 الرسائل — `MessagesUI.tsx` + `logic.ts` (new)

- **Inbox on `DataList`** (audit P0: the longest unbounded list rode `ScrollView`+`.map`). Pagination via `usePagedList` **ACCUMULATION** — the old replace-page «تحميل المزيد» couldn't grow past one page.
- **Conversation model extracted to `logic.ts`** — pure functions of `(rows, myId)`: `collectConversations` (per-correspondent grouping, unread counting, newest-first), `threadMessages` (oldest-first thread), `imageUrlsInBody` (the attachment gate). The thread sheet consumes the memoized result; **reply keystrokes can no longer recompute grouping** (audit P1).
- **Bubbles:** RTL-correct sides (mine = physical LEFT / END), hairline tails on the sender's edge, `Check` → `CheckCheck` receipts. The wire has **no delivered state** — sent/read only, no invented middle tick.
- **Attachments:** image URLs in a DM body render as **expo-image** chips (72×72, `recyclingKey`, disk cache, solid-grey blurhash placeholder `LG[[{…`) → tap opens a contain-fit preview sheet. The `/messages` contract has **no attachment field** — an image link is the honest best signal.
- **Typing indicator:** three reanimated dots, staggered 120° phase, **UI thread only**, reduced-motion renders them static. No remote typing signal exists on REST — it runs while a reply is in flight and is socket-ready.
- **Composer:** `AppSheet` footer with `SheetTextInput` (multiline, `returnKeyType="send"`) + **`KeyboardToolbar`** accessory riding the root KeyboardProvider.
- **Send states + retry:** pending → «جارٍ الإرسال…»; failure → `humanizeError` + `haptics.notify("error")`, the **draft stays in the field so send = retry**.
- **Entrance motion:** `fadeInUp` on each bubble mount (new messages animate in); reduced-motion gated via `useEntrance`.

### 1.2 الجدول — `schedule.tsx`

- **Today week strip**: day chips («الكل» + days that have slots), today outlined + «اليوم ·» count, selected chip filled in the ONE accent; `accessibilityRole="tab"` + state. Replaces the Segmented-in-nested-ScrollView smell.
- **Body on `DataList`**: «الكل» renders day sections with **sticky headers** (headers are ordinary items + `stickyHeaderIndices`); a single day renders flat.
- **Status chips for today's slots** — «مباشرة الآن» (live, accent fill) / «التالية» (next, accentSoft) / «انتهت» (done, grey) — computed by the pure `slotStatusesForDay(slots, nowMinutes)` from the Tripoli clock (`useNow(60_000)`; the render stays pure — the clock is injected).
- **EmptyState rooms:** `building` when no schedule exists at all; `lecture-hall` «لا توجد محاضرات اليوم» for an empty day.

### 1.3 التقويم — `calendar.tsx`

- **RTL month grid** (Sunday-first weekday header flowing right→left, 42 cells, prev-month on the RIGHT). Month nav + «اليوم» reset.
- **Event dots per kind** — class=ink, assignment=accent, exam=gold, live=lavender — with a worded legend; a day cell shows one dot per present kind.
- **Day detail = `AppSheet`** (snap md): that day's events as `LedgerRow`s with kind icon + `Badge` + deep link; `library` EmptyState when quiet. The sheet **mounts only while open** — the bottom-sheet graph stays out of the render-net route walk.
- **Numerals policy:** day numbers, counts and the sheet title render via `useNumerals()` (٠١٢٣ for Arabic-Indic preferrers), times via `timeOf`.

### 1.4 التكاليف — `assignments.tsx`

- **`DataList`** (bounded body, pull-to-refresh) over the dashboard agenda's pending assignments, with an honest header note that submission *history* lives in each course page.
- **Status chips:** `assignmentStatus` models all four states (pending / submitted / graded / late) with graded ⊃ submitted ⊃ late precedence — **the pending-only feed can only reach pending|late today**; the other two exist for the richer per-course surfaces. Documented, not hidden.
- **Due-date countdown** («متبقٍ ساعتان» / «متأخر يومان») ticking once a minute through `useNow`; `dueLabel` badge keeps the absolute date.
- **Submission action:** per-row «تسليم» → the shared `AssignSubmitSheet`; row tap deep-links the course.

---

## 2. Six-states checklist (per screen)

State key: ⏳ first-load skeleton · ⚠️ error + retry · ∅ empty · ✓ data · ⟳ pull-to-refresh · ↕︎ pagination-footer. (✓ covers press/hover feedback + a11y labels — checked per row, not repeated.)

| screen | ⏳ | ⚠️ | ∅ | ✓ | ⟳ | ↕︎ |
|---|---|---|---|---|---|---|
| الرسائل inbox | DataList default skeleton | `humanizeError` + retry | «لا رسائل بعد» + guidance | rows: avatar/name/«أنت: » preview/`fromNow`/unread Badge, 64pt rows, a11y `محادثة …، N غير مقروءة` | refetch wired | accumulate + load-more-error retry footer |
| الرسائل thread (sheet) | send-pending «جارٍ الإرسال…» | `humanizeError` inline + haptic, draft kept = retry | «لا رسائل محمّلة…» | bubbles + tails + receipts + attachments + entrance | — (invalidated on send) | — (client-side thread) |
| الجدول | DataList skeleton | `humanizeError` + retry | building / lecture-hall rooms («لا توجد محاضرات اليوم») | week strip + sticky day sections + status chips, 64pt rows, a11y `حصة …، مباشرة الآن` | refetch wired | — (bounded ≤ 7 days × slots) |
| التقويم | `SkeletonList` | two `ErrorState`s (enrollments, dashboard) + `humanizeError` | «شهر هادئ» + day-sheet `library` room | 42-cell grid + dots + day sheet deep links, a11y per cell `الأحد ٣ — ٢ أحداث` | PushFrame refresh wired | — (grid is bounded) |
| التكاليف | DataList skeleton | `humanizeError` + retry | «لا تكاليف بانتظارك» + guidance | title/kind/code + due Badge + status Badge + countdown + «تسليم», 72pt rows, a11y `تكليف: …، بانتظار التسليم` | refetch wired | — (agenda feed is small) |

All error text passes through `humanizeError` (never raw `error.message`); every interactive row is ≥ 44pt with an Arabic `accessibilityLabel`; day chips are 44pt `tab`s with `accessibilityState`.

---

## 3. Adoption counts (this round)

| foundation | adoption |
|---|---|
| `DataList` | **3** new consumers (messages inbox, schedule, assignments) — alerts.tsx landed in Round 1 |
| `usePagedList` accumulate | **1** (messages inbox) |
| `AppSheet` | **3** mount-gated sheets (thread, image preview, calendar day) + reused `AssignSubmitSheet` |
| `EmptyState` rooms | **5** render sites (building, lecture-hall, library, ×2 defaults) |
| `humanizeError` | **8** call sites across the four screens |
| `haptics` | selection on every open/select; `notify(success|error)` on mutations; `impact("light")` on send |
| expo-image | **2** sites (chips + preview), placeholder + disk cache |
| `useNow` ticking | 2 (schedule statuses, assignment countdowns) |
| `useNumerals` / format helpers | calendar grid + sheet; `fromNow`, `dueLabel`, `timeOf`, `latn`, `countAr` everywhere |
| motion | `fadeInUp` bubbles; 3-dot UI-thread typing indicator |
| new tests | **21** (10 `logic.test.ts` + 11 `agenda-logic.test.ts`) — pure modules, no renderer needed |

**Note:** the calendar month grid deliberately stays a `View` lattice — 42 fixed cells is not a data list, and `DataList` there would be adoption theater.

## 4. Why the agenda tests live in `src/features/messages/`

The render-net test walks **every** `.ts/.tsx` under `app/` as a route; a colocated `*.test.ts` would be picked up and fail the `typeof default === "function"` gate. The comms agent owns `src/features/messages/**`, so the pure helpers stay exported from their route files and their tests sit in `agenda-logic.test.ts` — the nearest owned, test-friendly directory. The render net proves the route modules import cleanly on every run.

## 5. TODOs (next round)

1. **Emulator/device pass** — sheet springs, RTL bubble sides, keyboard tracking and haptics are unverified on glass.
2. **Messages delivered-state** — needs a wire field (e.g. `deliveredAt`) before a third tick is honest.
3. **Remote typing signal** — the indicator is socket-ready; no transport exists yet.
4. **Calendar day sheet** — a very busy day (>20 events) is a plain `RowList`; acceptable today, revisit if real feeds grow.
5. **Schedule cross-week** — the week view assumes the enrollment schedule repeats weekly (it does on the wire); a term-calendar exception surface would need a new wire shape.
