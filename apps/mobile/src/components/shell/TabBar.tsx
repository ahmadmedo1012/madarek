import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { usePalette } from "@/design/theme";
import { T } from "@/components/ui/text";
import { useUnreadCount } from "@/hooks/useNotifications";
import { latn } from "@/lib/format";
import { ROLE_TABS } from "./roleTabs";
import type { AppRole } from "@/api/types";

/**
 * The minimal slice of expo-router's BottomTabBarProps the bar consumes —
 * kept structural (no vendored-nav type imports) so the component stays
 * unit-testable under jest with the router mocked away.
 */
export interface RoleTabBarProps {
  /** Focused tab index + the tab routes in bar order. */
  state: { index: number; routes: readonly { key: string; name: string }[] };
  /** Switch to the tab owning this route key. */
  navigateToTab: (routeKey: string) => void;
  /** Safe-area insets (bottom = home indicator / gesture bar). */
  insets?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Which role's ROLE_TABS row to render. */
  role: AppRole;
}

/**
 * RoleTabBar — THE shell's bottom bar (R331 A-App-Shell). Rendered ONCE
 * per role by the `(tabs)` layout via the `tabBar` prop of expo-router's
 * `Tabs`, OUTSIDE every screen — it never re-mounts or slides with screen
 * transitions (the defect: screens used to wrap themselves in a per-screen
 * RoleTabFrame over a plain Stack).
 *
 * Visual parity with the previous bar is deliberate: paper ground surface,
 * hairline top rule, ink icons with the orange 2dp underline marking the
 * active tab, the orange unread badge on the inbox tab, light haptics on
 * tab switch. The row mirrors automatically under I18nManager.forceRTL.
 *
 * State preservation: switching tabs only changes `state.index` — the bar
 * instance (and every mounted tab screen below it) persists.
 */
export function RoleTabBar({ state, navigateToTab, insets, role }: RoleTabBarProps) {
  const p = usePalette();
  const { data: unread = 0 } = useUnreadCount();
  const tabs = ROLE_TABS[role];
  const routes = state.routes;
  const paddingBottom = Math.max(insets?.bottom ?? 0, 6);

  return (
    <View
      testID="role-tab-bar"
      accessibilityRole="tablist"
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: p.rule,
        backgroundColor: p.surface,
        paddingBottom,
        flexDirection: "row",
      }}
    >
      {routes.map((route, index) => {
        const tab = tabs.find((t) => t.name === route.name);
        if (!tab) return null;
        const active = index === state.index;
        const Icon = tab.icon;
        const badge = tab.inbox ? unread : 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return; // already at this tab — no-op, no haptic
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              navigateToTab(route.key);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 54,
              paddingTop: 8,
              // The active marker — a 2dp orange underline on the tab's
              // bottom edge (no shadows, radius 0, Heron discipline).
              borderBottomWidth: active ? 2 : 0,
              borderBottomColor: p.accent,
            }}
          >
            <View>
              <Icon size={22} color={active ? p.accent : p.text} />
              {badge > 0 ? (
                <View
                  accessibilityLabel={`${latn(badge > 99 ? 99 : badge)} إشعارات غير مقروءة`}
                  style={{
                    position: "absolute",
                    top: -6,
                    start: 12,
                    minWidth: 18,
                    height: 18,
                    backgroundColor: p.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <T variant="xs" style={{ color: p.accentFg }}>
                    {badge > 99 ? "99+" : latn(badge)}
                  </T>
                </View>
              ) : null}
            </View>
            <T
              variant="xs"
              weight={active ? "bold" : "medium"}
              style={{ color: active ? p.accentInk : p.textMuted, marginTop: 2 }}
            >
              {tab.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
