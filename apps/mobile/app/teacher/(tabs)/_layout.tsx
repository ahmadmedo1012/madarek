import { Tabs } from "expo-router";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";
import { usePalette } from "@/design/theme";

/**
 * /teacher/(tabs) — THE persistent tab shell (R331 A-App-Shell; same
 * mechanism as /student/(tabs) — see that layout's docblock). The bar
 * renders ONCE here, outside every screen; paths are unchanged (the group
 * contributes no segment). Detail screens outside the group push over the
 * bar from the parent /teacher Stack.
 */
export default function TeacherTabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} role="TEACHER" />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: "none",
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {ROLE_TABS.TEACHER.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
