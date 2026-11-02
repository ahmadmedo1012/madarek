import { Tabs } from "expo-router";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";
import { usePalette } from "@/design/theme";

/**
 * /admin/(tabs) — THE persistent tab shell (R331 A-App-Shell; same
 * mechanism as /student/(tabs) — see that layout's docblock). The bar
 * renders ONCE here, outside every screen; paths are unchanged (the group
 * contributes no segment). Detail screens outside the group push over the
 * bar from the parent /admin Stack.
 */
export default function AdminTabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} role="ADMIN" />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: "none",
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {ROLE_TABS.ADMIN.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
