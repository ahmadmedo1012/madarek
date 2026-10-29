import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function OwnerLayout() {
  return (
    <RoleGate allow={["OWNER"]}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}>
      </Stack>
    </RoleGate>
  );
}
