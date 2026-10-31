import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function OwnerLayout() {
  return (
    <RoleGate allow={["OWNER"]}>
      <Stack screenOptions={{ headerShown: false }}>
      </Stack>
    </RoleGate>
  );
}
