import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function QualityLayout() {
  return (
    <RoleGate allow={["QUALITY"]}>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </RoleGate>
  );
}
