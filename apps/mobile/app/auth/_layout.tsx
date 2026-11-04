import { Stack } from "expo-router";
import { useTheme } from "@/design/theme";
import { heron } from "@/design/tokens";

/**
 * /auth — the guest stack (login · register · forgot/reset password).
 * Fade transitions between its screens (no lateral direction to mirror
 * wrong under RTL). R334 3-a: contentStyle paints the theme ground here
 * too — no white frames between fades.
 */
export default function AuthLayout() {
  const { name } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: heron[name].bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
