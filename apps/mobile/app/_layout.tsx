import "@/global.css";
import { I18nManager } from "react-native";

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { ToastHost } from "@/components/ui/toast";
import { useSession } from "@/auth/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers, crumb } from "@/lib/telemetry";
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
  // R326 M1.3(e): one controlled reload if the native RTL direction hasn't
  // been applied yet (first-ever launch). While the check runs we keep the
  // splash up — no LTR flash, no mirrored screens.
  const [rtlReady, setRtlReady] = useState(false);
  // R326 M0.7 — the server-issued minimum-version floor: below it, the
  // blocking gate replaces the app (nothing runs under the floor).
  const gate = useVersionGate();
  useEffect(() => {
    crumb(bootMs("root layout mounted"));
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
      <QueryClientProvider client={queryClient}>
        {/* R331 A-App-Motion — the keyboard's animated root (see the import
            note): every KeyboardAvoidingView/KeyboardToolbar below rides it. */}
        <KeyboardProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            {/* R327 C3 — the optional cold-start biometric lock. Off by
                default; renders nothing until the SecureStore flag says
                otherwise. Web: hasHardware=false → permanent no-op. */}
            <BiometricGate>
              <StatusBar style="auto" />
              <ErrorBoundary scope="navigator">
                <RootNavigator />
              </ErrorBoundary>
            </BiometricGate>
            {/* R327 C3 — channels + tap→deep-link + silent registration. */}
            <PushRegistrar />
            <ToastHost />
            {/* R331 A-App-Shell — no floating FeedbackSheetHost FAB here anymore:
                «الإبلاغ عن مشكلة» is a real route (/report) from the Profile
                menu and /settings; nothing overlays screen content now. */}
          </SafeAreaProvider>
        </ThemeProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
