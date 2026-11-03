import { Tabs } from "expo-router";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";
import { useImmersiveTabBar } from "@/components/shell/immersive";
import { usePalette } from "@/design/theme";

/**
 * /teacher/(tabs) — THE persistent tab shell (R331 A-App-Shell; same
 * mechanism as /student/(tabs) — see that layout's docblock). The bar
 * renders ONCE here, outside every screen; paths are unchanged (the group
 * contributes no segment). Detail screens outside the group push over the
 * bar from the parent /teacher Stack.
 *
 * R334 3-a: fade-through between tab scenes (opacity only) and the
 * route-driven immersive-hide policy via `useImmersiveTabBar()` — the
 * bar animates off-screen on immersive surfaces, never unmounts; wired
 * HERE, never in screen files.
 */
export default function TeacherTabsLayout() {
  const p = usePalette();
  const immersiveHidden = useImmersiveTabBar();
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} role="TEACHER" hidden={immersiveHidden} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: "fade",
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {ROLE_TABS.TEACHER.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
