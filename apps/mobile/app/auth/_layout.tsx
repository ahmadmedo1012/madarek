import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" options={{ animation: "slide_from_left" }} />
      <Stack.Screen name="forgot-password" options={{ animation: "slide_from_left" }} />
      <Stack.Screen name="reset-password" options={{ animation: "slide_from_left" }} />
    </Stack>
  );
}
