import { Tabs } from "expo-router";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";
import { useImmersiveTabBar } from "@/components/shell/immersive";
import { usePalette } from "@/design/theme";
import { useResponsive } from "@/hooks/useResponsive";

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
 *
 * R366 A5 — the responsive shell axis: bottom bar on compact phones, side
 * RAIL on ≥600dp windows (foldables open, landscape phones, tablets).
 * `tabBarPosition: "left"` is the LOGICAL start side — the navigator's
 * RTL row handling pins the rail to the right edge under forced RTL;
 * RoleTabBar flips its own axis, so every Maestro anchor works on both.
 */
export default function TeacherTabsLayout() {
  const p = usePalette();
  const immersiveHidden = useImmersiveTabBar();
  const { wide } = useResponsive();
  return (
    <Tabs
      tabBar={(props) => (
        <RoleTabBar
          {...props}
          role="TEACHER"
          hidden={immersiveHidden}
          orientation={wide ? "vertical" : "horizontal"}
        />
      )}
      screenOptions={{
        tabBarPosition: wide ? "left" : "bottom",
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
