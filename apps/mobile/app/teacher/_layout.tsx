import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

export default function TeacherLayout() {
  return (
    <RoleGate allow={["TEACHER"]}>
      <Stack screenOptions={{ headerShown: false, animation: "slide_from_left" }}>
      </Stack>
    </RoleGate>
  );
}
