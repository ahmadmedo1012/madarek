# Mobile Foundations — Resilience (R334 B8, branch `r334/resilience`)

Owner: agent 2-g. Scope: the offline/transient-failure layer — blueprint empty
states, the network banner, query-cache persistence, the exam-answer queue, and
retry/backoff defaults. Everything below is **typecheck-verified + jest-verified
only** — no emulator/device in this sandbox (`/dev/kvm` absent), so runtime
behavior on real hardware is `unverified` by the mission's honesty rule.

## API

### `src/components/ui/states.tsx` (additive — all pre-existing exports keep their signatures)

| Export | What's new in R334 |
|---|---|
| `EmptyState` | new optional `room?: "exam-hall" \| "library" \| "lecture-hall" \| "building"` — stages the state as one of the four blueprint rooms, composing the EXISTING `src/brand/plan` sheets (`PlanExamHall`/`PlanLibrary`/`PlanLectureHall`/`PlanBuilding`, rendered with no `progress`/`autoplay` → fully drawn, static → zero animation, reduced-motion-safe by construction). Room-default title/message are overridden by explicit props. `title` widened `string` → `string?` (callers unaffected). Legacy (title+message+icon/art) renders byte-identically. |
| `ErrorState` | new optional `onReport` → second ghost action «إبلاغ عن مشكلة» under «إعادة المحاولة». Without it, rendering is unchanged. |
| `OfflineState` | NEW — the «this screen has nothing offline» seat (no cached data at all), with optional `onRetry`. |
| `LoadingState` | NEW — compact in-page busy row (progressbar a11y role, honest Arabic label). Full-screen waits keep routing to `LoadingScreen`. |
| `OfflineBanner`, `Skeleton`, `SkeletonList`, `Refreshable`, `LoadingScreen` | untouched. |

### `src/lib/resilience/network.tsx`

- `useNetworkStatus(): { isOnline, isResolved, type }` — the ONE NetInfo subscription hook; optimistic-online until first resolve (no false-offline flash at cold start).
- `NetworkBanner` — self-subscribing banner for the app root. Offline: yellow tone «لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا»; on reconnect: mint flash «عاد الاتصال» (~2.4s). Transform/opacity-only enter/exit (heronEase), safe-area top padding, `accessibilityRole="alert"` + live region polite; reduced-motion shows/hides statically.
- `useOnlineManagerBridge()` — ref-counted NetInfo→TanStack `onlineManager` wiring, mounted by `<NetworkBanner/>`; queries PAUSE offline and auto-resume on reconnect (that's what makes the banner's promise honest).

### `src/lib/resilience/persistence.ts`

- `createAsyncStoragePersister({ storage?, key?, throttleTime? })` + `persistQueryClient({ queryClient, persister?, buster?, maxAge? })` — drop-in contract mirrors of `@tanstack/query-async-storage-persister` / `query-persist-client-core` (NOT installed; no new deps). Honesty rules: `maxAge` default **24h** (older caches deleted on restore), buster mismatch → discard, corrupt payload → delete, storage failures never crash.
- Module defaults: `queryCachePersister`, `QUERY_CACHE_STORAGE_KEY = "madarek-mobile-query-cache"`, `QUERY_CACHE_BUSTER = "r334-v1"`.
- **Lead wiring (Round 2, app root — outside this branch's ownership):**
  ```ts
  const persisted = persistQueryClient({ queryClient, persister: queryCachePersister });
  useEffect(() => { void persisted.persistQueryClientRestore(); }, []); // once
  // keep the subscription for the session; unsubscribe() only on teardown (root never tears down)
  ```

### `src/lib/resilience/queue.ts` — offline exam-answer queue

- `enqueueAnswer({ attemptId, questionId, answerText? | choiceIndex?, now? })` — stable id `${attemptId}:${questionId}`; re-answering a still-pending question REPLACES it (newest-wins — matches server per-question latest-value semantics).
- `peekAnswers()`, `pendingAnswerCount()`, `removeAnswer(id)`, `clearAnswerQueue()`.
- `flushAnswers(sender, { shouldDrop?, now? })` — FIFO, single-flight, failures re-queued with `attempts`/`lastError`/`lastTriedAt`; permanent failures (per caller's `shouldDrop`, e.g. 404 attempt-closed) are dropped and REPORTED in the `FlushReport { sent, failed, dropped, remaining }` — never lost silently.
- Transport-agnostic; shipped adapter `sendAnswerViaExamsApi` is THE integration with `src/api/exams.ts`:
  `examsApi.answer(attemptId, { questionId, answerText?, choiceIndex? })` → `POST /exams/attempts/:id/answer`.
  Exam-screen usage: `await flushAnswers(sendAnswerViaExamsApi, { shouldDrop: (e) => e instanceof ApiError && e.status === 404 })`.

### `src/lib/queryClient.ts`

- Queries: retry = **3 × transient-only** (network/timeout/5xx; 4xx is an answer, not a flake), `retryDelay` = exponential **1s→2s→4s (cap 30s) + ≤250ms jitter**. Exports for reuse/tests: `MAX_QUERY_RETRIES`, `isTransientError`, `queryRetryDelay`.
- Mutations: `retry: 0` (silent mutation retries would double-send; writes are owned by the queue / explicit user retry).
- Everything else identical to pre-R334: `staleTime 30_000`, `gcTime 5min`, `refetchOnWindowFocus: false`.
- **401-refresh single-flight verdict: EXISTS — no gap.** `src/api/client.ts` (read-only here) holds module-level `refreshInFlight: Promise<boolean>`: concurrent 401s share ONE `POST /auth/refresh`, each request replays at most once (`_isRetry` guard), auth-family paths excluded. Nothing for this branch to add.

## Arabic copy (canonical strings)

| Seat | Copy |
|---|---|
| Empty exam hall | «لا توجد امتحانات بعد» / «عند نشر الامتحانات ستظهر هنا.» |
| Empty library | «لا توجد ملفات» / «الملفات المشتركة معك ستظهر هنا.» |
| Empty lecture hall | «لا توجد محاضرات» / «ستظهر المحاضرات هنا بمجرد إضافتها.» |
| Empty building | «لا يوجد محتوى» / «سيظهر المحتوى هنا بمجرد إضافته.» |
| ErrorState | «تعذّر تحميل البيانات» · «حدث خطأ أثناء الاتصال بالخادم.» · «إعادة المحاولة» · «إبلاغ عن مشكلة» |
| OfflineState | «أنت غير متصل بالإنترنت» / «لا توجد نسخة محفوظة من هذه الصفحة — سيتم تحميلها عند عودة الاتصال.» |
| NetworkBanner | «لا يوجد اتصال بالإنترنت — سيتم إعادة المحاولة تلقائيًا» · «عاد الاتصال» |
| LoadingState | «جارٍ التحميل…» (default, label overridable) |

## Adoption map (Round 2 — none of this is wired yet; `app/_layout.tsx` is outside 2-g ownership)

| Screen | Adopt |
|---|---|
| app root (`app/_layout.tsx`) | `<NetworkBanner />` once, inside SafeAreaProvider; `persistQueryClient` restore-once (snippet above). LEAD. |
| exams list (`app/student/exams*`) | `EmptyState room="exam-hall"`; `ErrorState onReport`; flush queue + banner-driven refetch. |
| exam attempt screen | `enqueueAnswer` on answer taps offline; `flushAnswers(sendAnswerViaExamsApi)` on reconnect (`useNetworkStatus().isOnline`); `LoadingState` between questions. |
| files/library screens | `EmptyState room="library"`; persisted cache + `OfflineState` when no cache. |
| live/lectures | `EmptyState room="lecture-hall"`. |
| courses/schedule/grades | persisted cache (key screens for the 24h rule); `OfflineState` fallback; `LoadingState` for in-page refreshes. |
| generic/misc screens | `EmptyState room="building"` default. |

## Verification labels

- `tsc --noEmit` → **0 errors** (twice, before and after final test fix).
- `npx jest --no-cache --runInBand src/components/ui/states.test.tsx src/lib` → **5 suites / 42 tests green**, clean exit (fixed lingering TanStack gc timers in persistence tests via `client.clear()`).
- Backward compat: pre-existing render-net suite (113 tests) re-run green with the new states.tsx/queryClient.ts in place; legacy `EmptyState`/`ErrorState`/`OfflineBanner` prop contracts asserted in states.test.tsx.
- Device/emulator: **unverified** (no emulator in sandbox).
