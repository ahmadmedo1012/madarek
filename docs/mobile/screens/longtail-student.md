# Mobile Screens — Student long-tail L2 sweep (R334 Round 2.5, branch `r334/r3-sweep-stu`)

Owner: agent 4-a (A-Sweep-Student). Scope: the 16 student long-tail routes —
`app/student/{research,social,webinars,skills,gamification,ar,map,jobs,mooc,labs,live,matrix,university,payment}.tsx`
+ `app/achievements.tsx` + `app/search.tsx`. Light-touch L2 pass (errors →
`humanizeError`, no raw enums/English leakage, six states present, DataList where
the list can exceed ~20 rows) — **not** a redesign; each screen keeps its
existing structure. Everything below is **typecheck-verified + jest-verified
only** — no emulator/device in this sandbox (`/dev/kvm` absent), so on-device
scroll physics/recycling/haptics are `unverified` by the mission's honesty rule
(EAS preview builds are the owner's channel).

## Verification labels (final, branch head)

- `npm run typecheck` → **0 errors** **[typecheck-verified]**
- `npx jest --no-cache --runInBand src/test/render-net.test.tsx` → **113/113 green** **[jest-verified]** (hard gate)
- `npm run lint` → **0 errors, 18 warnings — all pre-existing and none in the 16 swept files** (warning sites: `report.tsx`, `document/[filename].tsx`, `lectures/[lectureId].tsx`, `library.tsx`, `materials.tsx`, `teacher/grades.tsx`, `teacher/live.tsx`, `src/brand/plan/*`, `src/test/setup.ts`) **[lint-clean]**

## Per-file log (what was fixed, states, TODOs)

| File | Fixed | States / lists | TODO for lead |
|---|---|---|---|
| `student/research.tsx` | 4 raw error paths → `humanizeError` (scan toast, list `ErrorState`, PDF pick, submit); `PAPER_STATUS` fallback `String(status)` → «حالة غير معروفة» (2 sites); `haptics.selection` on the offering picker | tri-state already present (SkeletonList/ErrorState/EmptyState) — kept; papers list stays `RowList` (a student's own papers, short) | — |
| `student/social.tsx` | 4 raw errors → `humanizeError` (react/unreact/create toasts + `ErrorState`); **feed migrated ScrollView`.map` → `DataList`** (FlashList v2) — audit-P1 memory risk on the image feed: cards now recycle; module-scope `PostCard`, `ItemSeparatorComponent`, `extraData` = optimistic likes + like-busy; pull-to-refresh added; FAB + compose sheet unchanged | tri-state via DataList defaults + custom empty copy | — |
| `student/webinars.tsx` | `ErrorState` → `humanizeError`; `LIVE_STATUS` fallback raw enum → «حالة غير معروفة»; **feed → `DataList`** (P1 #16 of the lists migration map) with pull-to-refresh; trailing count+link row now a pinned bottom bar (DataList has no `ListFooterComponent` pass-through) | tri-state via DataList (`emptySlot` keeps the icon+action empty state) | DataList footer passthrough (2-d) would let the action row scroll with content |
| `student/skills.tsx` | `ErrorState` → `humanizeError` | tri-state present — kept (skills list bounded) | — |
| `student/gamification.tsx` | 3 `ErrorState`s → `humanizeError` (profile/leaderboard/badges); `RARITY` fallback `b.rarity` → «تصنيف خاص» | tri-states present — kept; leaderboard top-10 + badge grid bounded | badge grid could ride DataList masonry if badges grow >50 |
| `student/ar.tsx` | `ErrorState` → `humanizeError` | tri-state present — kept (read-only seeded index, bounded) | operator unbuilt (mission-known L1) |
| `student/map.tsx` | `ErrorState` → `humanizeError` | tri-state present — kept | city-sectioned faculties → the sticky-header DataList exemplar (same pattern as calendar/schedule) if faculties grow |
| `student/jobs.tsx` | apply toast + `ErrorState` → `humanizeError`; `JOB_TYPE` fallback `job.type` → «فرصة أخرى»; **board → `DataList`** (audit P1 unbounded) — module-scope `JobRow`, per-row busy via `extraData` (justApplied + pendingId), pinned honest-count bottom row, pull-to-refresh | tri-state via DataList + `emptySlot` | — |
| `student/mooc.tsx` | `ErrorState` → `humanizeError`; **catalog → `DataList`** (audit P1 unbounded) — module-scope `MoocRow`; the summary count card moved into the list header (DataList has no footer) | tri-state via DataList + `emptySlot` | footer passthrough (same 2-d note) |
| `student/labs.tsx` | record-session toast + `ErrorState` → `humanizeError` | tri-state present — kept; lab directory + last-8 sessions bounded; sheets untouched | — |
| `student/live.tsx` | join toast + `ErrorState` → `humanizeError`; `LIVE_STATUS` fallback raw enum → «حالة غير معروفة» | tri-state present — kept (live/upcoming/ended sections, ended sliced to 8) | sectioned list → sticky-header DataList if sessions grow |
| `student/matrix.tsx` | gaps + matrix `ErrorState`s → `humanizeError`; `haptics.selection` on the mastery-level `Segmented` filter | tri-states present — kept (per-course concept rows under a filter) | concept rows → DataList once a course exceeds ~20 concepts |
| `student/university.tsx` | facts `ErrorState` → `humanizeError`; unknown fact categories no longer leak raw Latin ids → «معلومات إضافية» (Arabic server categories pass verbatim); membership-role fallback raw role → «عضو» | tri-state present — kept | fact-entry keys are server data (pilot endpoint) — a key→Arabic glossary needs backend buy-in |
| `student/payment.tsx` | **unchanged by design** — honest-empty stub (no Fee/Payment/Invoice entities in the model); disclosure card + EmptyState already carry the six-state story (no data ⇒ no loading/error variants to fake) | static honest-empty | real payment surface blocked on the data model (mission-known L1) |
| `achievements.tsx` | 3 `ErrorState`s off raw `apiMessage(...)` → `humanizeError` (badges/certs/leaderboard; `SignInPrompt` kept for 401); cert-status raw enum → `CERT_STATUS_LABEL` map (مكتملة/صادرة/قيد الإصدار/ملغاة); `RARITY` fallback → «تصنيف خاص»; `haptics.selection` on tab `Segmented` | per-tab tri-states present — kept | — |
| `search.tsx` | error path was muted text + **raw message** → `ErrorState` + `humanizeError` + retry; «تنفيذ البحث» pressable now ≥44pt (padding + hitSlop) | loading/empty/no-results present; results stay sectioned ScrollView | results → flattened sticky-header DataList (headers as data items) — deferred, needs a heterogeneous row type |

## Counts

- **23 raw-error sites** killed (`(e as ApiError).message` / `(e as Error)?.message` / `apiMessage`) → `humanizeError`.
- **8 raw-enum/English fallbacks** mapped to Arabic (paper status ×2, live status ×2, job type, rarity ×2, cert status, university category/role).
- **4 screens migrated to `DataList`** (social, webinars, jobs, mooc) — 4 of the 5 audit-flagged unbounded/image-heavy lists in this scope; research/labs/matrix/search deferred with reasons above.
- **2 `haptics.selection`** call sites added (research offering picker, matrix level filter, achievements tabs = 3 total).
- **0 dark-mode/RTL regressions introduced**: no `rgba(0,0,0,*)` literals existed in these files; no physical left/right props; all icon-only touchables already carried Arabic labels (`social` FAB, like button).

## Known limitations (honesty)

- Device/emulator: **unverified** — recycling feel, pinned-bar layout under notches, haptics need an EAS preview build.
- DataList pull-to-refresh on the 4 migrated screens is jest-render-verified only (mount + RefreshControl wiring), not gesture-verified.
- `payment.tsx` intentionally untouched (honest stub); the lead may still want the real surface prioritized against the backend data model.
