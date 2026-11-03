import { Stack } from "expo-router";
import { RoleGate } from "@/components/shell/RoleGate";
import { useTheme } from "@/design/theme";
import { heron } from "@/design/tokens";

/**
 * /owner — the role shell: ONE stack whose first child is the `(tabs)`
 * group (the persistent bar lives inside it, rendered once — R331
 * A-App-Shell). Every other route in this directory is a sibling OUTSIDE
 * the group: router.push('/owner/<detail>') stacks it OVER the bar (the
 * bar hides naturally for detail depth), and back returns to the living
 * tab with its scroll position intact. The role URL space is unchanged —
 * groups contribute no path segments.
 *
 * R334 3-a — contentStyle paints the theme ground at THIS navigator level
 * too (paper light / ink dark): no white frames during push/pop
 * transitions or cold-boot gaps at any depth.
 */
export default function OwnerLayout() {
  const { name } = useTheme();
  return (
    <RoleGate allow={["Owner"]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: heron[name].bg },
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
    </RoleGate>
  );
}
