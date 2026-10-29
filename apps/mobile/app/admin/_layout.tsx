import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function AdminLayout() {
  return (
    <RoleGate allow={["ADMIN"]}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}>
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
      </Stack>
    </RoleGate>
  );
}
