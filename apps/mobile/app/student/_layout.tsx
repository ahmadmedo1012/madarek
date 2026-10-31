import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function StudentLayout() {
  return (
    <RoleGate allow={["STUDENT"]}>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </RoleGate>
  );
}
