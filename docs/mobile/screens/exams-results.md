# Exams & Results screens — R334 3-g (Round 2)

**Owner:** agent 3-g · branch `r334/r2-exams` (merges into `feat/mobile-r334-pro`).
**Routes:** `app/student/online-exams.tsx` (list) · `app/student/online-exams/[templateId].tsx` (runner) · `app/student/results.tsx`.
**Test net:** `apps/mobile/src/test/exam-runner.test.tsx` (18 tests — pure helpers + countdown leaf + queue wiring; route files export their pure logic BY NAME because the render net requires every `app/` file to default-export a screen).

---

## 1. The countdown fix (audit P1) — the approach, explicitly

**The bug:** the runner ticked a 1 Hz `setInterval → setState`, re-rendering the whole ~1,400-line screen every second for the entire exam (options, navigator state, chips — everything), on top of answer-typing renders.

**The fix (two leaves, no parent renders per tick):**

1. **`ExamCountdown`** (`memo`ized leaf, stable-prop discipline) — the interval writes a **reanimated shared value ONLY** (`secondsLeft.value = s`). The digits update on the **UI thread** through the animated `text` prop on an `Animated.createAnimatedComponent(TextInput)` (the documented reanimated text trick — same as `@/motion`'s CountUp); threshold colors (< 5 min accent ink, < 1 min rose) ride a `useAnimatedStyle`. **No `setState`, no JS re-render per tick.** `onExpire` (auto-submit) fires exactly once from JS via a ref. The wall-clock is recomputed from `expiresAtMs` every tick, so backgrounding can't drift it. A11y label seeds with the live value at mount (screen readers don't sit through ticking text — the CountUp contract).
2. **`ExamTimeBar`** (separate `memo`ized leaf) — the 3px consumed-time strip. This one DOES `setState` per second, but it is an isolated leaf: a tick re-renders only this strip, never the question tree. Decorative (`accessibilityElementsHidden` — the countdown text is the announced time).

**Why a shared-value write is not "a re-render":** reanimated shared values live outside React; the update path is `JS → UI thread` without committing a React render. The parent's re-renders (typing, navigating, chips) never re-render the leaves because their props (`expiresAtMs`, `initialSeconds`, stable `onExpire` ref-keeper) are fixed per attempt.

**Verification honesty:** jest mounts the leaf and pins the seed/defaultValue + a11y contract + one-shot expire (`exam-runner.test.tsx`); the reanimated mock means **UI-thread tick fidelity is NOT observable in this sandbox** — device/EAS scope, honestly labeled. No emulator exists here (`/dev/kvm` absent).

## 2. Other decisions worth remembering

- **List (`online-exams.tsx`)** — `DataList` + module-scope `makeRow` (lists.md recipe); tri-state defaults; `emptySlot` = `EmptyState room="exam-hall"` (default copy «لا توجد امتحانات بعد»); per-filter overrides in Arabic. A calm 30 s tick refreshes «يفتح بعد …» chips — it runs ONLY while an upcoming exam is listed, and re-renders ride `extraData={nowTick}` through the recycled rows (NOT the whole screen; compare the runner's 1 Hz bug).
- **ONE accent** — `examStatusChip` is a pure function (unit-pinned): upcoming → sky («يفتح بعد ساعتين», accusative duals), live/startable → THE accent («متاح الآن» / «متابعة المحاولة»), missed → grey, graded → mint/rose verdict, pending-manual → yellow. Practice retake with the window open → grey «تدريبي — إعادة متاحة» (the retake is the story, but it carries no deadline urgency, so accent stays reserved — the retake check runs BEFORE the graded-verdict branch).
- **Autosave** — MCQ taps save immediately; text saves debounce 1.5 s. Online: chained per-question sends (latest wins). Offline (`planAnswerSave`) or on a failed send: the answer parks in the **durable resilience queue** (`enqueueAnswer`, AsyncStorage, newest-wins per question) and flushes through `sendAnswerViaExamsApi` on reconnect — same POST shape as a direct send (pinned by test). Per-question chip: «تم الحفظ» / «جارٍ الحفظ…» / «في الانتظار — دون اتصال» / «تعذّر الحفظ» (worst-first, `deriveSaveChip`). Debounced text commits on background (AppState) AND unmount — the old cleanup discarded anything inside the debounce window. Submit flushes every in-flight/debounced/queued save bounded at 10 s before the POST.
- **`ExamNetGate`** — NetInfo cannot boot under jest (its internal state fetch rejects unhandled the moment a listener registers; probed empirically), so `useNetworkStatus()` moved OFF the top-level component into a gate mounted **only while an attempt is live**. The render net's signed-out pass of the route stays green, and production behavior is identical (offline line, reconnect flush, once-per-attempt flush). The runner reads connectivity through `isOnlineRef` — which also makes `runAnswerSave` stable across connectivity flips. *TODO for the test-infra owner: once `setup.ts` mocks `@react-native-community/netinfo`, the gate can collapse back to a top-level hook.*
- **Navigator** — `AppSheet` (snap lg, mounted lazily on first open so the bottom-sheet engine stays out of the cold-start path and the jest nets): 44×44 numbered cells with answered (accentSoft) / flagged (accent dot + ring) / failed (rose) / current (primary) / unseen states, legend row, jump-to with `haptics.selection`. Full Arabic a11y sentence per cell (`navCellA11y`, unit-pinned).
- **Submit** — `ConfirmSheet` (destructive) with «لديك N أسئلة بدون إجابة» in the four-form counted-noun grammar (`unansweredNoteAr`, unit-pinned) + the no-retake finality note; `haptics.notify("success")` + toast on submit, `notify("error")` on failure, `notify("warning")` on auto-expire. Terminal submit errors (already-submitted/expired server-side) land on the honest terminal branch, not an error loop.
- **Options (RTL)** — `PressableScale` rows, `minHeight: 48` (44 pt floor), Arabic choice letters (أ ب ج د), selected = accent ink/soft only (accent discipline), saving state locks taps (chained sends). Prompts wrap naturally (`T` with no line clamp) — verified at 200 % font only by code review, honestly: **not pixel-verified (no emulator)**.
- **Results** — score hero = `RingProgress` (react-native-svg) with a UI-thread `CountUp` face (`xx%`, Latin digits), grade-inked (mint ≥ 65 / gold ≥ 50 / rose); per-course cards with `ProgressBar` + per-kind breakdown (`RowList`/`LedgerRow`). **Per-TOPIC breakdown was skipped on purpose: the results payload carries per-course + per-kind rows only — no topic series exists in `normalizeResults`' contract.** Share = `Share.share` with `resultsShareText` (Arabic summary, graded rows only, capped at 5, unit-pinned) + honest failure line. Trends skipped for the same honesty reason (one snapshot per offering, no time series).
- **Sheets/mount discipline** — `navEverOpened`/`confirmEverOpened` latch via the render-phase adjustment pattern (setState during render), not setState-in-effect (repo lint rule).

## 3. Six-states checklist

| State | List | Runner | Results |
|---|---|---|---|
| **Loading** | `DataList` skeleton (defaults) | `LoadingScreen` «جارٍ تحضير الاختبار…» | `SkeletonList rows={6}` |
| **Empty** | `EmptyState room="exam-hall"` «لا توجد امتحانات بعد» (+ per-filter copy) | «لا توجد أسئلة في هذا الاختبار» | «لم تُسجَّل أي درجات بعد» |
| **Error** | `DataList` error slot + `humanizeError` + retry | start-error `ErrorState` (+ open-window hint), submit error line, review `ErrorState` compact | `ErrorState` + `humanizeError` + retry |
| **Offline** | n/a (list needs the network; banner is the shell's) | yellow line «أنت دون اتصال…» + queued chips «في الانتظار — دون اتصال» + queue count | n/a (pull-to-refresh refetches) |
| **Success / data** | rows + status chips | question card, options, navigator, submit flow | hero + per-course breakdown |
| **Partial / degraded** | filter tabs with honest counts | failed-save chips + «أعد الإجابة» line; unanswered count; three-way result (passed / null pending manual / failed) | ungraded course rows («—»), `avgGradePct: null` hides hero |

## 4. Adoption counts (call sites across the three routes)

DataList ×1 + makeRow ×1 · AppSheet ×1 (navigator) + ConfirmSheet ×1 · PressableScale ×4 (options, flag, nav trigger, nav cells) · haptics ×7 (selection ×4, notify ×3) · EmptyState ×6 · ErrorState ×3 · SkeletonList/LoadingScreen ×3 · humanizeError ×5 · Badge chips ×~6 · CountUp ×1 + RingProgress ×1 · queue (enqueueAnswer/flushAnswers/peekAnswers) ×3 each · Share ×1.

## 5. Verification labels (honesty)

- ✅ `npm run typecheck` → **0 errors**.
- ✅ `npx jest --no-cache --runInBand src/test/render-net.test.tsx src/test/exam-runner.test.tsx` → **131/131 green** (113 render-net + 18 exam-runner).
- ✅ `npm run lint` → **0 errors, 0 warnings in owned files** (2 pre-existing warnings remain in `src/brand/plan/*`, untouched — no NEW issues).
- ❌ NOT verified here (no emulator in this sandbox): UI-thread tick fidelity, real haptics, sheet snap physics, 200 % font pixels, device recycling. Owner: EAS preview builds.

## 6. TODOs / handoff

- Test-infra owner: mock `@react-native-community/netinfo` in `src/test/setup.ts`; then `ExamNetGate` can fold back into a top-level `useNetworkStatus()` (the doc'd resilience pattern) without render-net fallout.
- Lead: `NetworkBanner` at the app root (`_layout.tsx` — outside this task's ownership) complements the runner's offline line app-wide.
- Backend/lead: a per-topic series in the results payload would unlock the topic breakdown bars (react-native-svg is already the RingProgress dependency).
