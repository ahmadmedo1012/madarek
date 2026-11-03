import { Tabs } from "expo-router";
import { RoleTabBar } from "@/components/shell/TabBar";
import { ROLE_TABS } from "@/components/shell/roleTabs";
import { useImmersiveTabBar } from "@/components/shell/immersive";
import { usePalette } from "@/design/theme";

/**
 * /student/(tabs) — THE persistent tab shell (R331 A-App-Shell). The bar
 * renders ONCE here, outside every screen, via the `tabBar` prop — it no
 * longer re-mounts/slides with each screen transition (the per-screen
 * RoleTabFrame defect). Route paths are unchanged: the `(tabs)` group
 * contributes no segment, so `/student/dashboard` and
 * `madarek://student/dashboard` resolve exactly as before.
 *
 * Tab screens stay mounted across switches (bottom-tabs default): each
 * keeps its scroll position and query state; `lazy: true` (default) mounts
 * a tab on first focus only. `detachInactiveScreens` (default true on
 * Android via react-native-screens) detaches unfocused tabs from the native
 * view hierarchy WITHOUT dropping their state — that is RN-screens' core
 * contract. Detail screens (courses/[offeringId], lectures/[lectureId]…)
 * live OUTSIDE this group and push over the bar from the parent Stack.
 *
 * R334 3-a:
 *  · `animation: "fade"` — cheap fade-through between tab scenes (opacity
 *    only) instead of the hard cut.
 *  · `useImmersiveTabBar()` — the route-driven hide policy (lecture
 *    player / exam runner / chat composer keyboard): the bar ANIMATES
 *    off-screen, never unmounts. Wired HERE, never in screen files.
 */
export default function StudentTabsLayout() {
  const p = usePalette();
  const immersiveHidden = useImmersiveTabBar();
  return (
    <Tabs
      tabBar={(props) => <RoleTabBar {...props} role="STUDENT" hidden={immersiveHidden} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        animation: "fade",
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {ROLE_TABS.STUDENT.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} />
      ))}
    </Tabs>
  );
}
