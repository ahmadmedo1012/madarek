# Arsenal — R334 mobile mission (agent 1-a, A-Scout)

**Method.** Every version below was read live from the npm registry (`npm view`) on **2026-11-03 (~20:40 UTC)** or from this repo/worktree (`apps/mobile/package.json`, installed `node_modules`, tarball probes via `npm pack`). Honesty labels on every claim: `verified-in-sandbox` (registry/repo/tarball read from here) vs `unverified` (docs-site or device-class claim not runnable here). No app code was changed.

**Environment (stated once):** `/dev/kvm` is absent → no local Android emulator/iOS simulator; every device-class claim below rides EAS preview builds on the owner's hardware. Maestro device flows are impossible from this sandbox.

---

## 1. Version & compatibility table

Baseline: Expo SDK 58 (`expo ~58.0.21`) · RN `0.88.1` · React `19.3.0` · expo-router `58.0.28` · React Compiler ON. "SDK-58 pin" = `expo/bundledNativeModules.json` read from the installed expo package (verified-in-sandbox).

| Package | Installed (repo) | npm latest (2026-11-03) | SDK-58 pin | Native module? | Peer fit on RN 0.88.1 / Expo 58 | Notes | Source |
|---|---|---|---|---|---|---|---|
| react-native-reanimated | 4.7.1 | **4.7.1** ✅ latest | 4.7.1 | Yes (in fingerprint) | peers `react-native 0.86–0.88` + `worklets 0.13.x` → exact match | No action | [npm](https://www.npmjs.com/package/react-native-reanimated) |
| react-native-worklets | 0.13.0 | 0.13.1 (1 patch ahead) | 0.13.0 | Yes | peers `RN 0.86–0.88` | Stay on SDK pin; bump only in a fingerprint-bumping commit | [npm](https://www.npmjs.com/package/react-native-worklets) |
| react-native-gesture-handler | 3.3.0 | 3.4.0 (1 minor ahead) | ~3.3.0 | Yes | `react-native: *` | ⚠️ repo gap: **no `GestureHandlerRootView` mounted anywhere yet** (`app/_layout.tsx` has none — verified-in-sandbox); required before any gesture/sheet work ships | [npm](https://www.npmjs.com/package/react-native-gesture-handler) |
| @shopify/flash-list | 2.3.2 | 2.3.3 (1 patch ahead) | 2.3.2 | **No — v2 is JS-only** | `@babel/runtime` peer only | v2 differences below (§2). Currently used only by `NotificationsScreen.tsx` (verified-in-sandbox) | [npm](https://www.npmjs.com/package/@shopify/flash-list) |
| @gorhom/bottom-sheet | 5.2.14 | **5.2.14** ✅ latest | not Expo-managed | No (JS on reanimated+RNGH) | `RNGH >=2.16.1` ✅ · `reanimated >=3.16 || >=4` ✅ | Sheets decision §6-i | [npm](https://www.npmjs.com/package/@gorhom/bottom-sheet) · [docs](https://gorhom.dev/react-native-bottom-sheet) |
| @expo/ui | not installed | 58.0.27 (SDK-versioned line) | — | **Yes** (Compose/SwiftUI views) | peer `react-native-worklets: *` ✅ (installed) | Deep-dive §3. expo-router 58.0.28 declares it as an **optional peer** `^58.0.25` (verified-in-sandbox) | [npm](https://www.npmjs.com/package/@expo/ui) · [docs](https://docs.expo.dev/versions/latest/sdk/ui/) |
| react-native-bottom-tabs | not installed | 1.5.0 | — | Yes (BottomNavigationView / UITabBar) | `react-native: *` | Callstack's native tabs; JS deps only (`react-freeze`, `use-latest-callback`, `sf-symbols-typescript`) + native code. Tabs decision §6-ii | [npm](https://www.npmjs.com/package/react-native-bottom-tabs) · [repo](https://github.com/callstack/react-native-bottom-tabs) |
| react-native-screen-transitions | not installed | 4.0.0 | — | Indirect — requires peer `react-native-teleport >=1.2.0` (not installed) | `react >=19.2` ✅ · worklets `>=0.8` ✅ · reanimated `>=4` ✅ · RNGH `>=2.16.1` ✅ · `@react-navigation/native >=7.3` (via expo-router) | Native-feel transitions; adoption = 2 new native modules (teleport + itself) → fingerprint bump | [npm](https://www.npmjs.com/package/react-native-screen-transitions) |
| legend-list | not installed | **3.7.1 — npm name is `@legendapp/list`** (`legend-list` is a 404 on npm — verified-in-sandbox) | — | **No — JS-only** (peer `react: *` only) | Drop-in FlatList replacement | Lists decision §6-iii | [npm](https://www.npmjs.com/package/@legendapp/list) · [repo](https://github.com/LegendApp/legend-list) |
| @shopify/react-native-skia | not installed | 2.14.0 | — | **Yes** (heavy) | `react >=19` ✅ · `RN >=0.78` ✅ · worklets `>=0.7` ✅ · reanimated `>=4` ✅ | Peers fit, but native binary + bundle gate (≤8 MB, RELEASE.md). Charts decision §6-iv | [npm](https://www.npmjs.com/package/@shopify/react-native-skia) |
| react-native-reanimated-carousel | not installed | 5.2.1 | — | **No — JS-only** (tarball probe: zero `android/`/`ios/` dirs — verified-in-sandbox) | peers `RNGH >=2.9 <4.0.0` ✅ (3.3.0) · worklets `>=0.5` ✅ · reanimated `>=4.1` ✅ | Caveat: RNGH `<4` pin blocks a future RNGH-4 bump | [npm](https://www.npmjs.com/package/react-native-reanimated-carousel) |
| react-native-svg | 15.16.0 | **15.16.0** ✅ latest | 15.16.0 | Yes (already in fingerprint) | `react-native: *` | Used today only by brand/logo/plan illustrations (verified-in-sandbox) | [npm](https://www.npmjs.com/package/react-native-svg) |
| expo-video | 58.0.13 | **58.0.13** ✅ latest | ~58.0.13 | Yes (in fingerprint) | `expo: *` | No action | [npm](https://www.npmjs.com/package/expo-video) |
| expo-image | 58.0.18 | **58.0.18** ✅ latest | ~58.0.18 | Yes (in fingerprint) | incl. `react-native-web: *` | No action | [npm](https://www.npmjs.com/package/expo-image) |
| expo-haptics | 58.0.7 | **58.0.7** ✅ latest | ~58.0.7 | Yes (in fingerprint) | `expo: *` | No action | [npm](https://www.npmjs.com/package/expo-haptics) |
| react-native-keyboard-controller | 1.22.7 | 1.22.9 (2 patches ahead) | 1.22.7 | Yes (in fingerprint) | `reanimated >=3` ✅ | Already wired at root (`KeyboardProvider` in `app/_layout.tsx` — verified-in-sandbox). Stay on SDK pin for R334 | [npm](https://www.npmjs.com/package/react-native-keyboard-controller) |

**Takeaway:** the installed stack is exactly the Expo-58-pinned set; the only drift vs npm is 4 patch/minor bumps (worklets 0.13.1, RNGH 3.4.0, flash-list 2.3.3, keyboard-controller 1.22.9) — all safe to defer; diverging from `bundledNativeModules` pins mid-mission buys nothing and costs a fingerprint churn.

## 2. FlashList v1 vs v2 (installed = 2.3.2)

All from the installed README (`node_modules/@shopify/flash-list/README.md`, verified-in-sandbox) + [v2-changes doc](https://shopify.github.io/flash-list/docs/v2-changes) (URL cited in that README; page content unverified from here):

- **v2 is JS-only** — "moving to a JS-only solution", no native dependency → installing/upgrading flash-list does **not** change the runtime fingerprint (v1 carried native code).
- **No size estimates**: v1 required `estimatedItemSize`; v2 "doesn't require any estimates" — automatic item sizing.
- **New-architecture only**: "designed to be new architecture only and will not run on old architecture" — fine on RN 0.88.1 (new arch). v1's last release is 1.8.3 (verified via `npm view @shopify/flash-list@1`).
- New in v2: built-in **masonry** layout, `maintainVisibleContentPosition` **enabled by default**, multiple recycling pools via `getItemType`, view recycling with no blank cells.
- Still a FlatList drop-in (same prop surface).

## 3. @expo/ui — stability, SDK-58 fit, RTL fitness

Verified-in-sandbox via tarball probe of `@expo/ui@58.0.27` (`npm pack` + file/`.d.ts` reads):

- **What it is**: real native components — Jetpack Compose (Android) / SwiftUI (iOS) / web polyfills. Three tiers: platform (`@expo/ui/swift-ui`, `…/jetpack-compose`), universal (`@expo/ui`), and **community drop-ins** (`@expo/ui/community/…`) that are "API-compatible replacements for popular React Native community libraries. Swapping the import is usually the whole migration" — the drop-in list explicitly includes `@gorhom/bottom-sheet`, datetime-picker, slider, masked-view, menu, picker, segmented-control, pager-view.
- **Community `BottomSheet`**: native sheets (SwiftUI iOS · Material3 `ModalBottomSheet` Android · HTML `<dialog>` web). Ref methods are "Compatible with `@gorhom/bottom-sheet` `BottomSheetMethods`"; props mirror gorhom's (`snapPoints`, `enableDynamicSizing`, `keyboardBehavior: 'interactive'|'extend'|'fillParent'`, …). **Android limitation (from its own `.d.ts`): only two snap states — partial (~50%) and expanded; `snapToIndex` maps to nearest state; arbitrary `snapToPosition` only on web.** Native keyboard handling is automatic. Presents as a **modal overlay** on native (gorhom renders inline in its container). One behavioral difference: `enableDynamicSizing` + `snapPoints` → snapPoints wins (gorhom prepends a content-sized point).
- **SDK-58 compatibility**: versioned with the SDK (58.x line, latest 58.0.27 published 2026-11-03 — `time.modified` verified). expo-router 58.0.28 peers `@expo/ui ^58.0.25` (optional). Active patch cadence (58.0.23→58.0.27 all recent; changelog entries cited in tarball).
- **RTL/Arabic fitness — the honest caveat**: these are OS-native views; they follow the **device locale/layout direction**, whereas this app forces RTL at the JS level (`I18nManager.forceRTL(true)` in `app/_layout.tsx`, verified-in-sandbox). On an LTR-locale device, RN-drawn screens mirror RTL but Compose/SwiftUI chrome would not — a mixed-direction UI. `unverified` (device-class claim; standard RN behavior per [I18nManager docs](https://reactnative.dev/docs/i18n) — must be confirmed on owner devices via EAS preview builds).
- **Cost**: new native module → runtime fingerprint change → every OTA update waits for a matching EAS build (RELEASE.md policy, verified-in-sandbox).

## 4. Newer-or-better scan

### (a) RN animation & gestures
- **moti 0.30.0** ([npm](https://www.npmjs.com/package/moti)) — latest stable's own README still says "powered by Reanimated **3**" (verified-in-sandbox tarball); peer is `react-native-reanimated: *` so npm would co-install with 4.7.1, but v4 support is **unverified**. Not adoptable for R334.
- **react-native-screen-transitions 4.0.0** — the modern transitions kit (zoom/slide/crossfade between screens on worklets); blocked here by the `react-native-teleport` native peer + fingerprint cost. Track for a post-R334 native-bump release.
- **framer-motion / motion 14.9.0** — web-DOM only; irrelevant to native app screens (can't drive RN views). Not RN tooling.
- Nothing found that beats installed reanimated 4.7.1 + RNGH 3.3.0 (both are the current SDK-58 canon).

### (b) Native-feel component kits
- **@expo/ui 58.0.27** — the strongest "native material" kit on SDK 58 (§3); costs a fingerprint bump and carries the locale-vs-forceRTL caveat.
- **react-native-bottom-tabs 1.5.0** (callstack) — native tab bar; what expo-router's NativeTabs builds on. Same fingerprint + RTL caveats (§6-ii).
- **zeego 3.0.6** ([npm](https://www.npmjs.com/package/zeego)) — native menus (context/dropdown) on top of native menu primitives. Not needed now; note for future overflow menus. `unverified` beyond version.
- **sonner-native 0.27.0** ([npm](https://www.npmjs.com/package/sonner-native)) — polished toast port; **JS-only** (reanimated-driven) and its peer set is fully satisfied by what's installed (RNGH `>=2.28` ✅ 3.3.0 · reanimated `^4.1.1` ✅ 4.7.1 · safe-area `^5.6` ✅ 5.10.1 · screens `^4.16` ✅ 4.30.0 · svg `^15.12.1` ✅ 15.16.0 — verified-in-sandbox). Candidate if the current `ToastHost` gets redesigned; zero new native code.

### (c) Mobile visual-regression testing
- **pixelmatch 8.0.0** — **already a root devDep** (`package.json:64`, verified-in-sandbox; [npm](https://www.npmjs.com/package/pixelmatch)). The adopt-move is *using* it, not installing it: diff `expo export:web` captures between commits.
- **Lost Pixel 3.22.0** (`lost-pixel` on npm; [repo](https://github.com/lost-pixel/lost-pixel) `unverified` beyond npm metadata) — Playwright-based visual regression, runs as a GitHub Action; would slot into the existing CI (Playwright already proven in-sandbox).
- **reg-suit 0.14.5** ([npm](https://www.npmjs.com/package/reg-suit)) — mature report/S3 workflow; heavier infra than this mission needs.
- **odiff-bin 4.5.0** ([npm](https://www.npmjs.com/package/odiff-bin)) — fast native-CLI image diff; alternative engine to pixelmatch. Note: the bare npm name `odiff` (1.5.0) is an unrelated JS deep-equal lib — verified-in-sandbox trap.
- **Native-device visual regression: not possible from this sandbox** (no KVM, no devices, Maestro absent — §5). Device screenshots must come from EAS builds on owner hardware.

### (d) Arabic/RTL QA tooling for RN
- **No dedicated RN RTL QA package exists on npm** — `npm search "rtl react-native"` (2026-11-03, verified-in-sandbox) returns only web-side helpers (`rtl-css-js` 1.16.1, `rtl-detect` 1.1.2, `storybook-addon-rtl` 3.0.2) and one stale 2022 list-styling lib (`@jsamr/react-native-li` 2.3.1). `npm search "arabic react-native"` surfaces font packs, not QA.
- Practical RTL QA stack (all already in-repo, verified-in-sandbox): `I18nManager.allowRTL/forceRTL` + `ensureRTL` (`src/lib/rtl.ts`); jest render suites under forced RTL; RN-web export + Playwright captures (Playwright 1.57.0 works here — §5); device-class RTL checks ride EAS preview builds.
- The one RTL risk that *needs* device QA: native OS components (§3/§6-ii) following device locale instead of `forceRTL`.

## 5. Sandbox smoke tests (all verified-in-sandbox, 2026-11-03)

| Command | Result |
|---|---|
| `npx --yes knip --version` | **knip 6.44.1** ✅ ([repo](https://github.com/webpro-nl/knip)) |
| `npx --yes eas-cli --version` | **eas-cli/27.4.0** linux-x64 node-v24.22.2 ✅ — satisfies `eas.json` `cli.version >= 16.0.0` ([repo](https://github.com/expo/eas-cli)) |
| `npx playwright --version` | **Version 1.57.0** ✅ — resolves from the sandbox-global install (`/home/z/.npm-global`, `/home/z/.venv/bin/playwright`); note `frontend/package.json` declares `@playwright/test ^1.60.0` — a 1.57/1.60 drift to reconcile when frontend deps are installed in a worktree |
| `maestro --version` | **absent** — `maestro: No such file or directory` (expected). The npm package named `maestro` (2.1.1) is an unrelated AWS Step Functions framework (verified-in-sandbox); the real CLI installs from [maestro.mobile.dev](https://maestro.mobile.dev) (`unverified` URL), and device flows are impossible here anyway (no KVM) |

---

*Committed progressively: table + smoke tests first (this part), decisions + scan + adopt-list follow in the next commit on this branch.*
