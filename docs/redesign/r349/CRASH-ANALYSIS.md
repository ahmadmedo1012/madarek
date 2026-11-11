# R349 M1 — The iOS crash, root-caused and made impossible to ship again

## M1.1 — The case (rebuilt from the §1 evidence; no .ips re-supplied this session)

The owner's `.ips` (iPhone15,2 · iOS 27.0.1 · app `ly.madarek.mobile`): **SIGABRT** from an
uncaught JS exception raised inside a Reanimated/worklets **UI-runtime animation-frame
callback** — `AnimationFrameBatchinator::flush` → `HermesRuntimeImpl::throwPendingError` →
`std::terminate`, **~15 s after login on the dashboard**.

Tree facts measured on `main@15fb3b48` (all re-verified this session):

| fact | command | result |
|---|---|---|
| zero worklet directives in the app | `grep -rn "'worklet'" apps/mobile/src apps/mobile/app` | 0 |
| deprecated cross-thread API in the suspect | `grep -rn runOnJS apps/mobile` | `CountUp.tsx:110` |
| the suspect closure | `CountUp.tsx:101` | `useDerivedValue(() => formatter(progress.value))` |

`formatter` is a **plain JS function** (default `defaultFormatter`, or caller props). A
`useDerivedValue` closure executes **on the UI runtime**; calling a captured non-worklet
function there throws with no JS handler in the frame batchinator → the process aborts.
The dashboard KPI count-ups start right after login — matching the ~15 s window (splash +
login + dashboard mount + first animation frames).

**Second instance of the same class found by the audit** (the spec's §1 suspect was not
alone): `app/student/online-exams/[templateId].tsx:209` —
`useDerivedValue(() => fmtClock(secondsLeft.value))` where `fmtClock` → `latn()` →
`toLatinDigits()` are all plain JS.

## M1.3 — The fix (the class, not the instance)

### a) CountUp v2 (`apps/mobile/src/motion/CountUp.tsx`)

Three faces chosen per formatter **by runtime truth** (`isWorkletFunction` from
react-native-worklets — worklet-transformed functions carry `__workletHash`; a wrong guess
here IS the crash, so the component checks instead of trusting the caller):

1. **Worklet formatter on native** (module-level fn with `'worklet'`: the default face,
   `pctFace`) → the fast path: derived string on the UI thread, pushed through the
   Animated-TextInput `text` trick. Zero JS-thread frames (the original design kept).
2. **JS formatter on native** — hook-bound closures (`useNumerals().formatNumber`) can
   NEVER be worklets (they close over React state) → the mirror path: the progress value
   rides `useAnimatedReaction` → **`scheduleOnRN`** (worklets 0.13's `runOnJS` successor —
   the deprecated `runOnJS` is gone) back to JS state; a plain TextInput renders it.
3. **Web** — always the mirror path (RN-web TextInput has no `text` native prop).

The derived-value closure now closes ONLY over a proven-worklet function
(`derivedFace = isWorkletFunction(formatter) ? formatter : defaultFormatter`) — lawful no
matter what the caller passed. `defaultFormatter` carries the `'worklet'` directive.

Callers: `pctFace` (results) marked `'worklet'`; the dashboard's inline
`(n) => fmt(Math.round(n))` stays a JS closure and automatically rides the mirror path —
no caller-side worklet discipline required.

### b) The exam clock

`fmtClock`, `latn`, `toLatinDigits` all marked `'worklet'` (pure string math — lawful on
both threads; still plain-JS-callable everywhere else). The `useDerivedValue` call is now
UI-runtime-legal.

### Full audit table (every UI-runtime closure in the tree)

| file:line | closure | captured JS calls | verdict |
|---|---|---|---|
| `src/motion/CountUp.tsx:101` (pre-fix) | `useDerivedValue` | `formatter` (plain fn prop) | **WAS THE CRASH — fixed (v2)** |
| `app/student/online-exams/[templateId].tsx:209` (pre-fix) | `useDerivedValue` | `fmtClock`→`latn`→`toLatinDigits` | **same class — fixed (worklets)** |
| `src/motion/CountUp.tsx` mirror reaction | `useAnimatedReaction` | `scheduleOnRN(onMirrorTick, …)` | legal (scheduleOnRN executes on JS) |
| `app/student/online-exams/[templateId].tsx` timeStyle | `useAnimatedStyle` | reads `p`/`tones` (plain data objects of strings) — property reads, no calls | safe |
| `src/motion/RingProgress.tsx:104,121` | `useAnimatedProps/Style` | arithmetic on captured numbers + shared values | safe |
| `src/components/shell/TabBar.tsx:126,140,226,236` | `useAnimatedStyle` | arithmetic only (`indicatorOffset`/`springs` run on JS thread in effects) | safe |
| `app/student/lectures/[lectureId].tsx:1151–1166` | `useAnimatedStyle` | arithmetic only | safe |
| `src/features/messages/MessagesUI.tsx:479` | `useAnimatedStyle` | arithmetic + captured booleans | safe |
| `src/motion/Skeleton.tsx:86` | `useAnimatedStyle` | arithmetic on captured numbers | safe |
| `src/motion/PressableScale.tsx:57` | `useAnimatedStyle` | arithmetic on captured numbers | safe |

### c) The lint-time guard — `scripts/qa/worklet-audit.mjs`

TypeScript AST (dependency: the workspace `typescript`): every worklet context (a
function with the `'worklet'` directive, or a callback passed to `useDerivedValue /
useAnimatedStyle / useAnimatedProps / useAnimatedReaction / useFrameCallback /
useAnimatedScrollHandler`) must not CALL an identifier resolving to a user-code function
without the directive — including **one level of cross-file resolution** (relative and
`@/` imports into `apps/mobile/src`). Library imports and Hermes builtins are in scope of
theirs. Prop-received functions are reported as INFO (runtime-guarded — CountUp's
`isWorkletFunction`), never failures.

- Wired into `scripts/verify.sh` (full mode, step 4.5) and `ci.yml` (`typecheck` job).
- Current state: **LAWFUL — 234 files, 0 violations.**
- Red-box proven both shapes: a local non-worklet callee inside `useDerivedValue` → exit 1
  (`zz-redbox.ts:6`); an imported non-worklet callee → exit 1 (cross-file resolution to
  `zz-helper.ts:1`); restored → exit 0.

### d) UI-runtime uncaught-error path — researched, does not exist

`reportFatalErrorOnJS(message, stack, name)` exists **only on the internal
`IWorkletsModule` proxy** (`react-native-worklets/lib/typescript/WorkletsModule/…`) — it is
what the runtime itself uses to surface a fatal UI error to JS; there is **no public
`setUncaughtExceptionHandler`-style API in worklets 0.13** and no supported way to convert
a UI-runtime throw into a handled JS event. Honest conclusion: the defence is
**prevention** (the audit guard + the fix + the CI simulator smoke), not interception.

### e) `reactCompiler`

Stays **OFF** (`app.config.ts`, R327 C5). No new evidence to overturn that ruling; the
crash is fully explained and fixed without it. Revisit only with device-equivalent Release
proofs.

## Proof so far (this session's box)

| check | result |
|---|---|
| `apps/mobile` tsc | 0 errors |
| `apps/mobile` jest (full) | **1179/1179 passed** incl. the new mirror-path regression test |
| CountUp suite | 7/7 (fast path defaultValue contract + mirror path + a11y labels) |
| worklet-audit | LAWFUL, 234 files, 0 violations (red-box both shapes) |
| verify.sh | identity + worklet steps green (fast mode re-run) |

## Still open in this lane

- **M1.2** CI macOS simulator smoke (Maestro flow + 60 s alive assertion + `.ips`
  collection) — workflow to author (needs the macOS runner; red-then-green on
  `d795809b^`-equivalent is skippable: the guard + unit proofs carry the fix, the smoke
  proves the pipeline).
- **M1.4** the Android emulator parity smoke (same workflow family, linux runner).
- **M1.5** previous-session crash persisted + shown after relaunch (verify the existing
  crash-report screen behaviour).
- **M1.6** publish a new internal SideStore IPA via the workflow and hand the owner the
  run link.
