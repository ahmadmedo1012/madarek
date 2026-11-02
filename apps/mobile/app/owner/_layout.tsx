import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";

/**
 * /owner — the role shell: ONE stack whose first child is the `(tabs)`
 * group (the persistent bar lives inside it, rendered once — R331
 * A-App-Shell). Every other route in this directory is a sibling OUTSIDE
 * the group: router.push('/owner/<detail>') stacks it OVER the bar (the
 * bar hides naturally for detail depth), and back returns to the living
 * tab with its scroll position intact. The role URL space is unchanged —
 * groups contribute no path segments.
 */
export default function OwnerLayout() {
  return (
    <RoleGate allow={["OWNER"]}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </RoleGate>
  );
}
