import { Pressable, StyleSheet, View } from "react-native";
import type { ComponentType, ReactNode } from "react";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { usePalette } from "@/design/theme";
import { T } from "@/components/ui/text";
import { useUnreadCount } from "@/hooks/useNotifications";
import { latn } from "@/lib/format";

interface TabViewState {
  index: number;
  routes: { key: string; name: string }[];
}

export interface TabSpec {
  name: string;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Tab hosting the notifications inbox — receives the unread badge. */
  inbox?: boolean;
}

/**
 * RoleTabs — 5 per-role destinations (web BottomNav parity) on the Heron
 * chrome: paper ground, hairline top rule, ink icons, orange unread signal.
 */
export function RoleTabs({ tabs, children }: { tabs: TabSpec[]; children?: ReactNode }) {
  const spec = (name: string) => tabs.find((t) => t.name === name);

  return (
    <Tabs
      tabBar={({ state, navigateToTab }: { state: TabViewState; navigateToTab: (key: string) => void }) => (
        <HeronTabBar state={state} navigateToTab={navigateToTab} spec={spec} />
      )}
      screenOptions={{
        headerShown: false,
        animation: "none",
        lazy: true,
      }}
    >
      {children}
    </Tabs>
  );
}

function HeronTabBar({
  state,
  navigateToTab,
  spec,
}: {
  state: TabViewState;
  navigateToTab: (routeKey: string) => void;
  spec: (name: string) => TabSpec | undefined;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const { data: unread = 0 } = useUnreadCount();

  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: p.rule,
        backgroundColor: p.surface,
        paddingBottom: Math.max(insets.bottom, 6),
      }}
      accessibilityRole="tablist"
    >
      <View style={{ flexDirection: "row" }}>
        {state.routes.map((route, i) => {
          const active = state.index === i;
          const tab = spec(route.name);
          const Icon = tab?.icon;
          const badge = tab?.inbox ? unread : 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={tab?.label ?? route.name}
              accessibilityState={{ selected: active }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                navigateToTab(route.key);
              }}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 54, paddingTop: 8 }}
            >
              <View>
                {Icon ? <Icon size={22} color={active ? p.accent : p.text} /> : null}
                {badge > 0 ? (
                  <View
                    accessibilityLabel={`${latn(badge)} إشعارات غير مقروءة`}
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
                {tab?.label ?? route.name}
              </T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
