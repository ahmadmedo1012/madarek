import "@/global.css";
import { I18nManager } from "react-native";

import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider, useTheme } from "@/design/theme";
import { fontMap } from "@/design/fonts";
import { ToastHost } from "@/components/ui/toast";
import { FeedbackSheetHost } from "@/features/feedback/FeedbackFab";
import { useSession } from "@/auth/session";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { installGlobalErrorHandlers } from "@/lib/telemetry";
import { ensureRTL } from "@/lib/rtl";
// Arabic-first: the app is authored RTL. Applied at module scope; Android
// bakes the direction at startup (first-ever launch applies on next start).
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// R326 M1.1: global JS-exception + unhandled-rejection capture → /client-errors.
installGlobalErrorHandlers();

function RootNavigator() {
  const { name } = useTheme();
  return (
    // R326 M1.3/M2.3: no global `slide_from_left` — the physical direction is
    // wrong/janky under forced RTL on Android. Platform-default stack
    // animations are RTL-aware on both iOS and Android, and the native
    // back gesture then works from the correct (right) edge in RTL.
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: name === "dark" ? "#282828" : "#F6F6EE" },
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

  useEffect(() => {
    let cancelled = false;
    void ensureRTL().then((reloading) => {
      if (!cancelled && !reloading) setRtlReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loaded && rtlReady) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, rtlReady]);

  if (!loaded || !rtlReady) {
    return null;
  }

  return (
    <ErrorBoundary scope="root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SafeAreaProvider>
            <StatusBar style="auto" />
            <ErrorBoundary scope="navigator">
              <RootNavigator />
            </ErrorBoundary>
            <ToastHost />
            <FeedbackSheetHost />
          </SafeAreaProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
