# Shell & Navigation — R334 Round 2, Task 3-a (`r334/r2-shell`)

The app shell: root layout, role stacks/tabs, the persistent bottom bar,
the top-bar policy, and the update/boot layer. Owner: task 3-a. Files
owned here: `app/_layout.tsx`, every other `app/**/_layout.tsx`,
`src/components/shell/**`, `src/lib/updates.tsx`, this doc.

Honesty labels (no emulator exists in this sandbox — KVM absent):
`tsc`-verified · jest-verified (gates + new bar/policy net) ·
**device-UNVERIFIED** — every animated/native claim below needs the
owner's EAS preview pass.

---

## 1. Root layout (`app/_layout.tsx`)

| Concern | Decision |
|---|---|
| Gesture root | `GestureHandlerRootView` now wraps the whole tree at the TRUE root (inside the root `ErrorBoundary`, outside `QueryClientProvider`). Static import — jest never imports `_layout` files (render-net skips them), so the RNGH v3 import-time install that the sheet lazy-load fix guards against cannot regress the nets. |
| Keyboard | `KeyboardProvider` kept where it was (above every screen) — keyboard-controller is consumed by `FormScreen`, the messages composer, and `AppSheet`'s interactive keyboard tracking. |
| BottomSheetModalProvider | **Left self-contained in `ui/sheet.tsx`** (2-c's file). It guarantees availability for every AppSheet consumer; hoisting it to the root would put `@gorhom/bottom-sheet` → RNGH into the app's startup module graph and break the lazy-load regression fix unless the per-sheet provider is dropped in the SAME change (2-c's call — lead follow-up #1 below). |
| Network banner | `<NetworkBanner />` mounted once inside `SafeAreaProvider` (it pads `insets.top` itself and self-wires NetInfo → TanStack `onlineManager`, so queries pause/resume honestly with the banner's promise). |
| Query-cache persistence | `QueryCacheBoot` (null-rendering component inside `QueryClientProvider`): one-time `persistQueryClientRestore()` + the session-long save subscription (module guard survives remounts; root never tears down). 24h maxAge / buster-gated — see `docs/mobile/foundations/resilience.md`. |
| Status bar | `<StatusBar style="auto" />` → `<AppStatusBar />` (theming foundation): style derived from the EFFECTIVE user theme; Android root-view tinted to the page ground via `expo-system-ui` (no white overscroll flashes in dark). |
| Haptics | `void haptics.hydrate()` once at root mount — the persisted kill-switch is exact for the session. |
| Backgrounds | Navigator ground painted at EVERY level: root `Stack.contentStyle` (was already), role stacks `contentStyle` (NEW), `(tabs)` `sceneStyle`, auth stack `contentStyle` — paper light / ink dark, no white frames between transitions or at cold boot. |
| OTA + version gate | untouched behavior; Arabic copy reviewed — already clean (see §6). |

## 2. The persistent bottom bar (`TabBar.tsx`)

Still ONE bar per role rendered by the `(tabs)` layout's `tabBar` prop —
never unmounts, never slides with screen pushes (pinned by the
navigation-stability net, now extended).

R334 upgrades:
- **Selection indicator** — a single 6dp orange dot springs between tab
  slots on the UI thread (`withSpring(springs.snappy)`, transform only).
  Replaces the old `borderBottomWidth: active ? 2 : 0` underline, which
  mutated a LAYOUT property on every switch. The dot is start-anchored;
  its physical translate sign flips under `I18nManager.isRTL`.
- **Icon morph outline → filled** — active icons fill their glyph body
  with the accent (lucide `fill` prop; the `RoleTab.icon` contract in
  `roleTabs.ts` now includes `fill`) plus a scale pop (`1 → 1.12`
  spring). Inactive icons stay ink outlines.
- **Badge** — unread badge springs in/out (scale + opacity).
- **Haptics** — `Haptics.impactAsync(Light)` inline → `haptics.selection()`
  (gated + throttled; same-tab press is still a no-op).
- **Reduced motion** — every spring degrades to an instant set.
- **a11y** — `tablist`/`tab` roles, Arabic labels, `selected` state, and
  the unread-count label are unchanged (test-pinned).

### Immersive hide (`shell/immersive.tsx`)
Route-driven policy, wired ONLY in the five `(tabs)` layouts (screens
never touch shell chrome — enforced by a new test):
- `/student/lectures/[id]` (المشغّل) and `/student/online-exams/[id]`
  (غرفة الاختبار) — always hidden while focused. They push OVER the bar
  from the parent stack (covered anyway); hiding also keeps the bar from
  peeking during transition frames.
- `/student/ai` (المساعد — chat composer tab) — hidden only while the
  KEYBOARD is open (`useKeyboardState`); returns when it closes, so the
  tab stays navigable.
- Mechanism: the bar ANIMATES `translateY` off-screen (reanimated spring)
  and leaves layout flow only while hidden (`position: absolute` — the
  same flip the stock UIKit bar uses when hidden). It never unmounts.
- `/student/online-exams` (the LIST) deliberately keeps the bar.

## 3. Transitions

- **Stacks** — platform defaults everywhere (`gestureEnabled: true`); no
  `slide_from_left` (physical direction is wrong under forced RTL; the
  iOS edge-swipe works from the correct RTL side via react-native-screens
  defaults — device-unverified). `contentStyle` painted at every level.
- **Tabs** — `animation: "fade"` (fade-through, opacity-only, cheap) on
  all five `(tabs)` layouts (was `"none"`).
- **Auth** — fade kept; `contentStyle` added.
- **Predictive back stays OFF** (JS-only discipline — `app.config.ts`
  untouched). LEAD FOLLOW-UP: enabling edge-to-edge + predictive-back
  gestures on Android is a config/native decision.

## 4. Top bar policy (`AppTopBar.tsx`)

Compact: **brand · title · search · bell**. The identity block (name,
institution chip, avatar → /settings) was REMOVED — identity/institution
live in Profile (حسابي identity card); /settings stays reachable from the
Profile menu + report card. Prop contracts unchanged
(`AppTopBar alertsPath`, `StackHeader title kicker right onBack`) — all
~60 call sites compile untouched. The bell is now a real bell + count
badge (was a MonoLabel `•`/count + hidden dot). "menu" seat: N/A — the
app has no drawer; pushed screens get back from `StackHeader`.
Large-title collapse: **skipped** — these are in-screen headers, not
native-stack headers; adopting native headers is a screen-owner decision,
not a shell one.

## 5. Overlay removal

Verified: NO floating assistant bubble/FAB layer exists anywhere in the
shell or layouts (R331 already replaced the FAB with the `/report` route;
grep-verified + test-pinned). The assistant is the `/student/ai` TAB.
No action needed. `rgba(0,0,0,*)` audit-P0 literals: **none live in
shell-owned files** (verified by sweep) — the 7 audit instances are in
`ui/surfaces.tsx`, `ui/states.tsx`, `teacher/attendance.tsx`,
`teacher/(tabs)/dashboard.tsx`, `teacher/exams/[templateId].tsx` →
their owners.

## 6. Updates/boot (`src/lib/updates.tsx`)

Behavior untouched (OTA silent check + toast «تحديث جاهز — أعد التشغيل
لتطبيقه» + min-version gate). Arabic copy reviewed — already correct and
honest; no changes needed.

## 7. Checklist (verification)

- [x] `npm run typecheck` → 0 errors
- [x] `npx jest --no-cache --runInBand src/test/render-net.test.tsx
      src/test/navigation-stability.test.tsx` → green
- [x] new tests: immersive route matchers, layouts-only wiring, bar
      never-unmounts-while-hidden, a11y preserved, compact top bar
      source contract
- [x] `npm run lint` — no new errors on owned files
- [ ] device pass (EAS preview): dot spring feel, RTL dot direction,
      immersive slide, keyboard-hide on /student/ai, edge-swipe RTL,
      dark-mode transition grounds

## 8. Lead follow-ups

1. Hoist `BottomSheetModalProvider` (+ drop the per-sheet copy) — needs a
   same-change edit in `ui/sheet.tsx` (2-c's file).
2. Predictive back / edge-to-edge config decision (`app.config.ts`).
3. `expo-navigation-bar` (Android gesture-scrim contrast) — new dep.
4. If `/student/messages` or teacher composers want the same
   keyboard-immersive treatment from a TAB seat, extend
   `COMPOSER_ROUTE_MATCHERS` (one line, shell-owned).
