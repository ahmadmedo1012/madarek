import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function QualityLayout() {
  return (
    <RoleGate allow={["QUALITY"]}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}>
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      </Stack>
    </RoleGate>
  );
}
