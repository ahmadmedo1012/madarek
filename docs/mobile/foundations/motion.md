# R334 2-a — Motion System (Heron mobile)

**Status:** implemented on `r334/motion` · `apps/mobile/src/motion/` · reanimated 4.7.1 + worklets 0.13 + react-native-svg 15.16 (no new deps).
**Verification honesty:** `tsc --noEmit` exit 0 · jest (render-net, mocked reanimated) 52/52 green. **Not** device-verified, **not** emulator-verified (no KVM in this sandbox) — UI-thread frame fidelity is asserted by construction (worklet code paths) and unit-pinned at rest frames only. RN-web compatibility is by-API (reanimated/svg web builds + the CountUp web mirror); not export-verified in this task.

## The contract (every consumer inherits these)

1. **Only `transform` and `opacity` animate** — never Yoga layout properties (width/height/margin/flex). The one deliberate exception is svg *paint* state (`strokeDashoffset` in `RingProgress`) set through reanimated native props: it triggers no layout pass.
2. **prefers-reduced-motion degrades everything** — every primitive reads `useReduceMotion()` (`src/hooks/useReduceMotion.ts`) and lands on an honest static presentation (identity press, flat bone, instant number, frozen ring). Reanimated's layout builders additionally default to `ReduceMotion.System`; the `useEntrance`/`useStaggerEntrance` hooks gate at the React level too — double coverage.
3. **Springs for interaction, timings for state**, one easing family — the shared Heron curve `cubic-bezier(0.23, 1, 0.32, 1)` (`heronEase` in `@/design/tokens`, generated from `shared/design-tokens.json`).
4. **Exit beats entrance** (150ms < 240ms), stagger step 60ms, press settle 120ms.

## Token alignment

Durations that exist in the shared scale are **imported, not redefined**: `micro` 80 · `fast` 200 · `base` 400 · `slow` 500 · `slower` 650 (count-up) + the mobile-added `durationPress` 120 / `durationNav` 240 already living in `@/design/tokens`. **Mobile-only motion tokens defined in `presets.ts` and flagged for the lead** (candidates to upstream into `shared/design-tokens.json` later): `exit` 150 · `shimmer` 1400 · `shimmerPause` 300 · `spin` 900 · `staggerStep` 60.

## API (`import { … } from "@/motion"`)

| Export | Kind | Notes |
|---|---|---|
| `durations`, `easings`, `springs`, `timing()`, `pressFeedback`, `clamp` | presets | `springs.snappy/default/gentle` (mass/damping/stiffness); `timing(ms, easing?)` → reanimated timing config |
| `PressableScale` | component | wraps any pressable content; scale ≈0.98 + opacity ≈0.9 on press-in, UI thread; forwards **all** `PressableProps`; `disabled`/reduced-motion = identity no-ops |
| `fadeIn/fadeInUp/fadeInDown/fadeOut/heronLayout` | builders | reanimated entering/exiting/layout factories with Heron timing baked in; each call returns a fresh builder |
| `slideInFromStart/slideInFromEnd` | builders | **RTL-aware**: reading-start = right in Arabic (via `I18nManager.isRTL`), left in LTR |
| `staggerDelay(i, {base, step})`, `enterStagger(i, opts)` | helpers | list-stagger arithmetic (default step 60ms) |
| `useEntrance(build)`, `useStaggerEntrance(opts)` | hooks | reduced-motion gates; the map-safe form for `.map()` children |
| `Skeleton`, `SkeletonText` | components | UI-thread translateX shimmer over react-native-svg gradient; theme-aware (hairline bone / paper sweep in light, raised surface / ink sweep in dark); `static` prop + reduced-motion = flat bone; geometry props `width/height/radius/lines/lastLineRatio` |
| `CountUp` | component | UI-thread animated number (derived value → animated `text` prop on native; `runOnJS` mirror on web); `formatter(n)` (pass Arabic-Indic numerals for عربية); a11y label = **final** value; reduced-motion = instant |
| `RingProgress` | component | svg `AnimatedCircle` + `useAnimatedProps` (strokeDashoffset); `size/thickness/progress(0..1)/color/trackColor` + `indeterminate` (25% arc, 900ms linear spin); children center inside; reduced-motion = frozen/instant |
| `useReduceMotion` | hook | re-exported from `@/hooks/useReduceMotion` for one-stop imports |

### Examples

```tsx
import { PressableScale, Skeleton, SkeletonText, CountUp, RingProgress, useStaggerEntrance } from "@/motion";

// press feedback on a card row
<PressableScale onPress={openLesson} accessibilityRole="button" accessibilityLabel="افتح الدرس">
  <LessonRow />
</PressableScale>

// staggered list entrance (RTL-safe, reduced-motion-safe)
const childEntering = useStaggerEntrance({ base: 80, step: 60 });
<Animated.View entering={childEntering(0)}>…</Animated.View> // index per row

// loading → content swap
{isLoading ? <SkeletonText lines={3} /> : <Body />}
{isBusy ? <RingProgress indeterminate /> : null}
<CountUp value={score} formatter={(n) => new Intl.NumberFormat("ar-EG").format(Math.round(n))} />
```

## Ownership & integration notes for the lead

- `ui/pressables.tsx` (Button/IconButton) keeps its own pressed styles — **untouched** (2-a owns only `src/motion/**`). If Round 2 wants the spring feel on Buttons, that is a pressables change, not a motion change.
- `ui/states.tsx` already ships a **non-animated** `Skeleton`/`SkeletonList` (owned by 2-g Resilience). The motion `Skeleton` is a drop-in upgrade; reconciling the two is 2-g's call — recommend `states.tsx` re-exporting/wrapping `@/motion`'s.
- `LoadingScreen` (states.tsx) can adopt `RingProgress indeterminate` for its spinner slot.
- Adoption is additive: nothing outside `src/motion/` imports the barrel yet, so this lands with zero regression surface (full repo typecheck exit 0).

## Adoption map for Round-2 screens

| Screen / surface | Adopt |
|---|---|
| `app/index.tsx` (home) | `useStaggerEntrance` on hero + section cards; `CountUp` on KPI/stat numbers |
| `app/achievements.tsx` | `CountUp` (XP/points) + `RingProgress` (goal rings, children = ٪ label) |
| `app/search.tsx` | `Skeleton`/`SkeletonText` for result placeholders; `fadeInUp` on empty-state |
| `app/campus.tsx`, `app/community.tsx` | `slideInFromStart` for panels/drawers (RTL-aware), `PressableScale` on cards |
| `app/competitions/*`, `app/training/*` | `RingProgress` (determinate progress), `CountUp` for leaderboards |
| `features/messages/MessagesUI.tsx` | `slideInFromEnd` detail push-in, `fadeIn` on list swaps |
| `features/notifications/*` | `SkeletonText` while fetching, `fadeInDown` on banner drop |
| Lists (2-d, `ui/data.tsx`) | `enterStagger` per row (cap stagger at ~8 children), `LinearTransition` via `heronLayout()` on reorder |
| Sheets/toasts (2-c) | `springs.gentle` for sheet settle; `fadeOut` for toast exit (150ms) |
| Global loading (`ui/states.tsx`, 2-g) | `RingProgress indeterminate` replaces spinner; motion `Skeleton` replaces static bone |

**Stagger discipline:** keep `base + n×step ≤ 400ms` (base rhythm) — cap or drop stagger beyond ~8 children.

## Files

```
apps/mobile/src/motion/
  presets.ts          durations/easings/springs/timing/pressFeedback/clamp (+ presets.test.ts)
  PressableScale.tsx  animated press feedback          (+ PressableScale.test.tsx)
  entrance.ts         entering/exiting/layout builders (+ entrance.test.ts)
  Skeleton.tsx        Skeleton + SkeletonText shimmer  (+ Skeleton.test.tsx)
  CountUp.tsx         UI-thread animated number        (+ CountUp.test.tsx)
  RingProgress.tsx    svg ring, determinate+indeterminate (+ RingProgress.test.tsx)
  index.ts            barrel
apps/mobile/src/hooks/useReduceMotion.ts  (pre-existing, the gate every primitive reads)
```
