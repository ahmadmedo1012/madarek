# Governance surfaces — registrar / quality / owner consoles (R334 · 3-j, Rounds 1–2)

**Owner:** agent 3-j (`apps/mobile/app/admin/**`, `app/quality/**`, `app/owner/**` — each except `_layout.tsx` and `owner/ai.tsx` — plus `src/features/governance/**` and this doc).
**Branch:** `r334/r2-gov` — Round 1 commits `f7949f1` (strings pass) + `0c27a5d` (dashboard hierarchy), Round 2 commit (this round): registrar lists + owner realtime/governance + sync + activity inbox.

---

## 1. What these screens are

The GOV surface = the three operator consoles (web parity pages `Admin*Page`, `Quality*Page`, `Owner*Page`):

| Console | Screens (owned) |
|---|---|
| Admin (registrar) | `(tabs)/dashboard·students·teachers·faculties·reports`, `sync`, `invites`, `courses`, `digital`, `feedback`, `alerts`, `permissions/[id]` |
| Quality | `(tabs)/dashboard·courses·curriculum·engagement·reports`, `exam-moderation`, `professors`, `alerts` |
| Owner | `(tabs)/dashboard·governance·realtime·users·notifications`, `activity`, `alerts`, `institutions`(+`[slug]`), `system`, `feedback`, `education`, `content` |

Shared kit: **`src/features/governance/components.tsx`** — label/tone maps (web `ownerLabels`/`courseMeta` parity), chips, `MetricHero`/`MetricTile` (CountUp + RingProgress), `FlagToggle`, `UserAvatar`, `pageOf`, `HonestLedger`, audit helpers. CONTRACTS.md freezes the shared `src/components/ui/*` modules; anything GOV-specific lives in this folder.

## 2. Round 2 decisions (the «why»)

### D1 — Registrar lists migrate to `DataList` + `usePagedList` (audit P0)

`students`, `teachers`, `owner/users`, `owner/activity` were `ScrollView + RowList + .map()` with a `PagerFooter` (page-1 pinning: filtering jumped back to page 1 while the list rendered the old page). Now: `DataList` (FlashList v2, recycle) + `usePagedList` accumulate pagination (`onEndReached` → «جارٍ تحميل المزيد…» footer; a failed NEXT page keeps cached rows and renders the compact retry footer — never a blank error page). Rows are `makeRow`-memoized module-scope components (`StudentRow`, `TeacherRow`, `DirectoryRow`, `AuditEventRow`).

- `owner/activity` groups by day (`groupByDay` + `auditDayLabel`): sticky day headers as data items; each event opens a **tap-to-detail sheet** (actor, exact + relative time, resource, honest metadata JSON with the technical id disclosed as audit-trail data — never as the row's identity).
- Search keeps the 300 ms debounce; the query key carries the applied term + role so TanStack `placeholderData` holds the old rows while a filter fetches.

### D2 — Avatars: expo-image **when the server sends a URL**, initials forever otherwise

`UserAvatar` (kit): remote URL → `expo-image` `Image` laid OVER the initials circle (150 ms transition) — initials stay visible while loading and FOREVER after an `onError` (a broken image box never renders). No URL → plain initials `Avatar` (the roster default today: `/admin/users` and `/owner/users` send `avatarInitials`/`avatarColor` only). `avatarUrlOf()` coerces the payload defensively — only a non-empty string counts.

### D3 — The no-raw-enum rule, enforced kit-wide (Round 2 kill count: **30**)

Rule: a KNOWN enum renders its web-parity Arabic label; an UNKNOWN enum renders the honest Arabic fallback («غير معروف» / scoped sibling) — never the internal code. Round 1 covered the 30-screen `humanizeError` pass; Round 2 killed the remaining raw render sites:

| Surface | Killed leak | Fix |
|---|---|---|
| `admin/sync` ×5 | `SYNC_STATUS_LABEL[...] ?? raw`, raw category keys, raw `errorMsg` | `syncStatusLabel`/`SyncStatusChip`, «بيانات أخرى», `humanizeError(errorMsg)` |
| `admin/teachers` ×3 | `ROLE_LABELS[..] ?? role`, `POSITION_LABELS[..] ?? position` ×2 | «دور آخر» / «منصب آخر» |
| `owner/users` ×6 | `ROLE_LABELS[..] ?? role` (toast, chip, select ×2, confirm ×2) | «دور آخر» |
| `owner/governance` ×1 | raw login-failure reason codes | `loginReasonLabel` (LOGIN_REASON_LABEL) |
| `quality/exam-moderation` ×3 | raw exam-kind fallback + raw `q.type` / `q.difficulty` | `UNKNOWN_LABEL` + new `QUESTION_TYPE_LABEL` / `DIFFICULTY_LABEL` (web QTYPE/DIFFICULTY parity) |
| `quality/engagement` ×2 | raw paper-status fallback + raw key as hint | `UNKNOWN_LABEL`, hint dropped |
| `owner/feedback` + `FeedbackInbox` ×5 | `FEEDBACK_STATUS_LABEL[..] ?? raw` + `mono` flags | `feedbackStatusLabel` (list, sheet, toast, next-step buttons) |
| `owner/system` ×2 | raw storage-driver code, raw settings `category` | `storageDriverLabel` («تعريف غير معروف»), `settingCategoryLabel` («فئة أخرى») |
| `owner/alerts` ×1 | local severity badge with raw fallback | kit `SeverityChip` |
| `owner/institutions` + `[slug]` ×2 | raw institution status + `mono` | kit `InstitutionStatusChip` |

New kit maps this round: `QUESTION_TYPE_LABEL`, `DIFFICULTY_LABEL/TONE`, `SETTING_CATEGORY_LABEL`, `feedbackStatusLabel`, `instStatusLabel` + `InstitutionStatusChip`, `avatarUrlOf`/`UserAvatar`. Deliberate disclosures that stay: `MonoLabel` setting keys (editable identifiers), feature-flag slugs, endpoint honesty lines («القراءات من نقطة النهاية /owner/realtime…») — those are identifiers/truth labels, not enum states.

### D4 — Realtime freshness chips + sync progress states

- `owner/realtime`: a status band chip — «تحديث حيّ» (mint) / «قراءات قديمة» (yellow, reading older than 2× the 15 s poll via `useNow`) / «انقطع التحديث» (rose, poll error — last reading stays on screen, 6A10-9 parity).
- `admin/sync`: a RUNNING latest run guards the trigger button (no double-fire), renders «مزامنة قيد التنفيذ الآن» + honest «بدأت {منذ…} — يُحدَّث السجلّ تلقائياً كل 30 ثانية» — NO fabricated progress bar (the backend exposes no percentage).

### D5 — Errors: always `humanizeError`

Every failure path (`useQuery` error states, mutation `onError` toasts, sync `errorMsg`) flows through `src/lib/errors.ts` — Arabic always, raw `error.message` never.

## 3. Six-states checklist (every dashboard/list here)

Per screen, the six seats — ✅ = verified this round:

| Seat | Mechanism | Where |
|---|---|---|
| 1 Loading (first) | `DataList` → `SkeletonList(6)` / dashboards: real-geometry skeletons (hero + tile shapes) | students, teachers, users, activity, 3 dashboards |
| 2 Error (first) | `DataList` → `ErrorState` + retry, `humanizeError` | same |
| 3 Empty | Arabic honest copy (filter-aware: «لا نتائج مطابقة» vs «ستظهر القائمة فور…») | same |
| 4 Content | FlashList rows / `MetricHero` + `MetricTile` hierarchy, `CountUp`/`RingProgress` | dashboards (commit 0c27a5d) |
| 5 Refresh | pull-to-refresh (`refetch`/`isRefetching`), refresh-failure keeps rows | all DataList screens; realtime/sync poll |
| 6 Pagination | accumulate `onEndReached` + «جارٍ تحميل المزيد…» footer + retry footer | students, teachers, users, activity |

Cross-cutting: **44 pt floor** (LedgerRow minHeight 48, StatLine 44, FlagToggle 44 — kit primitives), **Arabic a11y labels** on every tappable row/chip (`accessibilityLabel` naming the row's subject), **RTL default** (`DataList rtl`, Arabic-first layout), **no `rgba(0,0,0,*)` literals** in owned files (palette tokens only — verified by scan).

## 4. Verification (this round, in-sandbox — no emulator, honest)

- `npm run typecheck` → **0 errors**.
- `npx jest --no-cache --runInBand src/test/render-net.test.tsx` → **113/113** (all routes mount, transports mocked).
- `npx jest --no-cache --runInBand src/features/governance/components.test.tsx` → **13/13** (colocated: label-map coverage incl. unknown-enum fallbacks, chip renders, `avatarUrlOf`/UserAvatar contract).
- `npx eslint app/admin app/quality app/owner src/features/governance` → **0 errors, 0 warnings** (also cleared the pre-existing `ROLE_KEY_LABEL` dead map).
- NOT verified here: on-device image loading, FlashList recycling feel, poll timing — no emulator in this sandbox.

## 5. Light-touch TODOs (next rounds)

- `owner/activity` day headers could use FlashList `stickyHeaderIndices` once section offsets are measured (data is already header+rows shaped).
- `admin/(tabs)/faculties·reports`, `admin/courses·invites·digital`, `quality/(tabs)/courses·curriculum·reports·professors` still `RowList + map` — DataList candidates when their rows grow past ~20.
- `owner/notifications` + `admin/feedback` still on `PagerFooter`; same `usePagedList` recipe as users applies.
- Backend `/admin/users`/`/owner/users` carry no `avatarUrl` today — `UserAvatar` is wired and renders initials until they do.
- `owner/ai.tsx` is owned by another agent (its `cfg.data.model || provider` mono badge stays out of scope).
