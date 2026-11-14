import "@/global.css";
import { I18nManager } from "react-native";

import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
// R334 3-a — RNGH v3 wants its root view at the TRUE root (audit P0): every
// gesture under it (sheets, pans, edge swipes) rides the installed runtime.
// The bottom-sheet engine keeps its own lazy-loaded copy (the render-net
// regression fix in ui/sheet.tsx is untouched); this static import only
// executes in the app shell — jest never imports _layout files.
import { GestureHandlerRootView } from "react-native-gesture-handler";
// R331 A-App-Motion — the keyboard now rides react-native-keyboard-controller:
// per-pixel tracking driven on the UI thread (reanimated worklets), RTL-safe,
// both platforms. The two legacy RN KeyboardAvoidingView seats (FormScreen,
// the messages composer) swap to the controller's drop-in view; the provider
// must sit above every screen, so the root layout mounts it.
import { KeyboardProvider } from "react-native-keyboard-controller";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/design/theme";
import { heron } from "@/design/tokens";
import { fontMap } from "@/design/fonts";
// R334 2-f — the status bar derives its style from the EFFECTIVE app theme
// (a user preference), never the device scheme (`auto` was wrong).
import { AppStatusBar } from "@/design/statusbar";
// R340 T-M5 (LR-001) — the bottom-side sibling: theme-derived Android
// navigation bar (gesture-handle contrast under enforced edge-to-edge).
// Android-only no-op elsewhere; see src/design/navbar.tsx.
import { AppNavigationBar } from "@/design/navbar";
// R334 B8 (resilience) — the offline layer the root mounts:
//   · NetworkBanner — self-subscribing connectivity banner (it also wires
//     NetInfo → TanStack onlineManager, so queries pause/resume honestly)
//   · persistQueryClient — one-time query-cache restore + session save
import { NetworkBanner } from "@/lib/resilience/network";
import { persistQueryClient } from "@/lib/resilience/persistence";
// R334 3-a (audit round 2) — BottomSheetModalProvider available at the root
// for direct consumers, via the same lazy-require pattern as ui/sheet.tsx
// (the render-net fix stays intact; jest never imports _layout files).
import { RootSheetModalProvider } from "@/components/shell/SheetModalHost";
// R334 2-b — hydrate the persisted haptics preference once at boot.
import { haptics } from "@/haptics";
import { loadRemoteConfig } from "../src/lib/remote-config";
import { ToastHost } from "@/components/ui/toast";
import { useSession } from "@/auth/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers, crumb } from "@/lib/telemetry";
// R349 M1.5 — the previous-session crash, persisted + surfaced after
// relaunch (unclean-exit sentinel + the pending-report drain + the
// user-facing toast). Fire-and-forget at module scope, after the
// global handlers exist.
import { initCrashPersistence } from "@/lib/crashPersist";
import { ensureRTL } from "@/lib/rtl";
import { BlockingUpdateGate, useAppUpdates, useVersionGate } from "@/lib/updates";
import { PushRegistrar } from "@/lib/push";
import { BiometricGate } from "@/lib/biometric";
// Arabic-first: the app is authored RTL. Applied at module scope; Android
// bakes the direction at startup (first-ever launch applies on next start).
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// R327 C4 — the boot timeline (ms since first app-JS evaluation). The
// cold-start budget (<2.5s) is a DEVICE measurement («غير مُثبَت» without
// hardware); these crumbs seat the real milestones in every telemetry
// breadcrumb ring, so the owner's device — or a future simulator run —
// reads the timeline straight out of any crash report.
const BOOT_T0 = Date.now();
const bootMs = (mark: string) => `boot: ${mark} +${Date.now() - BOOT_T0}ms`;

crumb(bootMs("app JS evaluated"));

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// R326 M1.1: global JS-exception + unhandled-rejection capture → /client-errors.
installGlobalErrorHandlers();

// R349 M1.5: previous-crash collection + sentinel arming (async, never blocks boot).
void initCrashPersistence();

/**
 * R334 B8 — one-time query-cache restore + session save subscription.
 * Mounts INSIDE QueryClientProvider; the module guard survives React
 * remounts (StrictMode/dev) so the cache subscription is never doubled.
 */
function QueryCacheBoot() {
  useEffect(() => {
    if (queryCacheStarted) return;
    queryCacheStarted = true;
    const persisted = persistQueryClient({ queryClient });
    void persisted.persistQueryClientRestore().then(() => crumb(bootMs("query cache restored")));
    // the save subscription lives for the session — root never tears down
  }, []);
  return null;
}
let queryCacheStarted = false;

function RootNavigator() {
  const { name } = useTheme();
  // R326 M0.7 — silent OTA check (cold start + foreground, throttled).
  useAppUpdates();
  return (
    // R326 M1.3/M2.3: no global `slide_from_left` — the physical direction is
    // wrong/janky under forced RTL on Android. Platform-default stack
    // animations are RTL-aware on both iOS and Android, and the native
    // back gesture then works from the correct (right) edge in RTL.
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: heron[name].bg },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="select-institution" options={{ gestureEnabled: false }} />
      <Stack.Screen name="student" />
      <Stack.Screen name="teacher" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="quality" />
      <Stack.Screen name="owner" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts(fontMap as unknown as Record<string, number>);
  const hydrate = useSession((s) => s.hydrate);
  // R326 M1.3(e): the direction is baked natively before the first
  // React root (plugins/force-rtl-android.js — r349-P4), so the boot
  // resolves rtlReady on the FIRST pass: no LTR flash, no mirrored
  // screens, and — since the old controlled reload is retired — no
  // reloaded-context dead render pipeline (the smoke's bare-paper bug).
  const [rtlReady, setRtlReady] = useState(false);
  // R326 M0.7 — the server-issued minimum-version floor: below it, the
  // blocking gate replaces the app (nothing runs under the floor).
  const gate = useVersionGate();
  useEffect(() => {
    crumb(bootMs("root layout mounted"));
    // R334 2-b — exact haptics gate state for this session (fire-and-forget;
    // the module already kicked its own cheap hydrate at import).
    void haptics.hydrate();
    // R351 X3 — the remote app config (ordered apiOrigins): cached list
    // applies instantly, the freshest source refreshes it. Never fatal —
    // the bundled defaults + failover keep every installed build working.
    void loadRemoteConfig().then(() => crumb(bootMs("remote config resolved")));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureRTL().then((reloading) => {
      if (!cancelled && !reloading) {
        crumb(bootMs("rtl ready"));
        setRtlReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void hydrate().then(() => crumb(bootMs("session hydrated")));
  }, [hydrate]);

  useEffect(() => {
    if (loaded && rtlReady) {
      crumb(bootMs("fonts+rtl ready — splash handoff (first frame)"));
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, rtlReady]);

  if (!loaded || !rtlReady) {
    return null;
  }

  if (gate.status === "blocked") {
    return (
      <ErrorBoundary scope="root">
        <BlockingUpdateGate updateUrl={gate.updateUrl} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary scope="root">
      {/* R334 3-a — the gesture runtime's true root (audit P0). */}
      <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/* R334 B8 — persisted query cache (24h, buster-gated). */}
        <QueryCacheBoot />
        {/* R331 A-App-Motion — the keyboard's animated root (see the import
            note): every KeyboardAvoidingView/KeyboardToolbar below rides it. */}
        <KeyboardProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            {/* R334 3-a (audit round 2) — sheet modals hosted from the root:
                BottomSheetModalProvider for any DIRECT BottomSheetModal
                consumer (AppSheet keeps its local provider — 2-c's file). */}
            <RootSheetModalProvider>
            {/* R327 C3 — the optional cold-start biometric lock. Off by
                default; renders nothing until the SecureStore flag says
                otherwise. Web: hasHardware=false → permanent no-op. */}
            <BiometricGate>
              {/* R334 2-f — theme-derived status bar (was: style="auto"). */}
              <AppStatusBar />
              {/* R340 T-M5 (LR-001) — theme-derived Android navigation bar
                  (gesture-handle contrast; null on iOS/web). */}
              <AppNavigationBar />
              <ErrorBoundary scope="navigator">
                <RootNavigator />
              </ErrorBoundary>
              {/* R334 B8 — offline banner + TanStack onlineManager bridge. */}
              <NetworkBanner />
            </BiometricGate>
            {/* R327 C3 — channels + tap→deep-link + silent registration. */}
            <PushRegistrar />
            <ToastHost />
            {/* R331 A-App-Shell — no floating FeedbackSheetHost FAB here anymore:
                «الإبلاغ عن مشكلة» is a real route (/report) from the Profile
                menu and /settings; nothing overlays screen content now. */}
            </RootSheetModalProvider>
          </SafeAreaProvider>
        </ThemeProvider>
        </KeyboardProvider>
      </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
