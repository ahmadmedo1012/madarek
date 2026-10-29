import "../src/global.css";
import { I18nManager } from "react-native";
// Arabic-first: the app is authored RTL. Applied at module scope; Android
// bakes the direction at startup (first-ever launch applies on next start).
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { queryClient } from "../src/lib/queryClient";
import { ThemeProvider, useTheme } from "../src/design/theme";
import { fontMap } from "../src/design/fonts";
import { ToastHost } from "../src/components/ui/toast";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { name } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: name === "dark" ? "#282828" : "#F6F6EE" },
        animation: "slide_from_left",
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

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <ToastHost />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
