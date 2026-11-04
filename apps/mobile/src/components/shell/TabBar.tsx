import { useEffect, useMemo, useState } from "react";
import { I18nManager, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { springs, useReduceMotion } from "@/motion";
import { haptics } from "@/haptics";
import { usePalette } from "@/design/theme";
import { T } from "@/components/ui/text";
import { useUnreadCount } from "@/hooks/useNotifications";
import { latn } from "@/lib/format";
import { ROLE_TABS } from "./roleTabs";
import type { AppRole } from "@/api/types";
import type { RoleTab } from "./roleTabs";

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
  /**
   * R334 3-a — immersive mode: the bar ANIMATES off-screen (translateY,
   * UI thread — never unmounts) for fullscreen surfaces (lecture player,
   * exam runner) and while the chat composer's keyboard is open. Wired
   * ONLY from the (tabs) layouts via `useImmersiveTabBar()` — screens
   * never touch shell chrome (see ./immersive.tsx).
   */
  hidden?: boolean;
}

/** The active-tab marker: ONE orange dot, 6dp, on the bar's bottom edge. */
const DOT_SIZE = 6;

/** Fallback slide distance before first layout measures the real height. */
const BAR_HEIGHT_FALLBACK = 84;

/**
 * The dot's physical X translate for a slot (pure — unit-tested).
 *
 * The dot is anchored at the row's START edge; under RTL `start` means the
 * RIGHT edge, so the physical translate flips sign to reach the same visual
 * slot. Guards keep the un-measured first frame at 0 (no jump on layout).
 */
export function indicatorOffset(
  barWidth: number,
  slot: number,
  slotCount: number,
  isRTL: boolean,
): number {
  if (barWidth <= 0 || slot < 0 || slotCount <= 0) return 0;
  const slotWidth = barWidth / slotCount;
  const fromStart = (slot + 0.5) * slotWidth - DOT_SIZE / 2;
  return isRTL ? -fromStart : fromStart;
}

/**
 * RoleTabBar — THE shell's bottom bar (R331 A-App-Shell). Rendered ONCE
 * per role by the `(tabs)` layout via the `tabBar` prop of expo-router's
 * `Tabs`, OUTSIDE every screen — it never re-mounts or slides with screen
 * transitions (pinned by src/test/navigation-stability.test.tsx).
 *
 * R334 3-a upgrades (motion + haptics foundations adopted):
 *  · selection indicator — a single orange dot that springs to the active
 *    tab on the UI THREAD (reanimated, transform-only; reduced-motion =
 *    instant). It retires the old per-tab underline, whose border-bottom
 *    width toggled with the active flag (a layout-property mutation that
 *    re-laid-out the whole row on every switch).
 *  · icon morph outline → filled — the active icon fills with the accent
 *    (lucide's `fill` prop) and pops with a scale spring; inactive icons
 *    stay ink outlines.
 *  · badge pop — the unread badge springs in (scale/opacity) instead of
 *    popping in bare.
 *  · haptics — tab switch fires `haptics.selection()` (the gated, throttled
 *    module) instead of a raw `Haptics.impactAsync` call.
 *  · immersive hide — `hidden` slides the whole bar off-screen with a
 *    spring; the bar leaves layout flow only while hidden (the same
 *    position-flip the stock UIKit bar uses), and NEVER unmounts.
 *
 * The row mirrors automatically under I18nManager.forceRTL; the dot's
 * physical translate is direction-aware (start-anchored, mirrored sign).
 */
export function RoleTabBar({ state, navigateToTab, insets, role, hidden = false }: RoleTabBarProps) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const { data: unread = 0 } = useUnreadCount();
  const tabs = ROLE_TABS[role];
  const routes = state.routes;
  const paddingBottom = Math.max(insets?.bottom ?? 0, 6);

  // Only routes that map to a ROLE_TABS entry render — the indicator's slot
  // math must use the RENDERED count, not routes.length.
  const entries = useMemo(
    () =>
      routes
        .map((route, index) => ({ route, index, tab: tabs.find((t) => t.name === route.name) }))
        .filter((e): e is { route: { key: string; name: string }; index: number; tab: RoleTab } =>
          Boolean(e.tab),
        ),
    [routes, tabs],
  );
  const activeSlot = entries.findIndex((e) => e.index === state.index);

  /* ── the sliding selection dot (UI thread, transform only) ────────── */

  const [barWidth, setBarWidth] = useState(0);
  const dotX = useSharedValue(0);
  const isRTL = I18nManager.isRTL;

  useEffect(() => {
    if (barWidth <= 0 || activeSlot < 0) return;
    const target = indicatorOffset(barWidth, activeSlot, entries.length, isRTL);
    dotX.value = reduced ? target : withSpring(target, springs.snappy);
  }, [barWidth, activeSlot, entries.length, isRTL, reduced, dotX]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value }],
  }));

  /* ── the immersive hide: animated translateY, NEVER an unmount ────── */

  const [barHeight, setBarHeight] = useState(0);
  const slideY = useSharedValue(0);

  useEffect(() => {
    const target = hidden ? barHeight || BAR_HEIGHT_FALLBACK : 0;
    slideY.value = reduced ? target : withSpring(target, springs.default);
  }, [hidden, barHeight, reduced, slideY]);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  return (
    <Animated.View
      testID="role-tab-bar"
      accessibilityRole="tablist"
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
      style={[
        {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: p.rule,
          backgroundColor: p.surface,
          paddingBottom,
        },
        // While hidden the bar leaves layout flow (the position-flip the
        // stock UIKit bar uses) so immersive screens reclaim the height;
        // the slide itself is the animated translateY above.
        hidden ? { position: "absolute" as const, bottom: 0, start: 0, end: 0 } : null,
        slideStyle,
      ]}
    >
      <View
        style={{ flexDirection: "row" }}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {entries.map(({ route, tab, index }) => (
          <TabButton
            key={route.key}
            tab={tab}
            active={index === state.index}
            badge={tab.inbox ? unread : 0}
            onPress={() => {
              if (index === state.index) return; // already here — no-op, no haptic
              haptics.selection(); // gated + throttled (src/haptics)
              navigateToTab(route.key);
            }}
          />
        ))}
        {/* The single orange dot — start-anchored, springs between slots.
            Exactly ONE instance (test-pinned); a11y-hidden + untouchable. */}
        <Animated.View
          testID="tab-indicator-dot"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              bottom: 3,
              start: 0,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: p.accent,
            },
            dotStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
}

/** One tab: icon (outline→filled morph + scale spring), label, badge pop. */
function TabButton({
  tab,
  active,
  badge,
  onPress,
}: {
  tab: RoleTab;
  active: boolean;
  badge: number;
  onPress: () => void;
}) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const Icon = tab.icon;

  // Icon morph: a scale spring rides the ink→accent color + fill swap.
  const iconScale = useSharedValue(1);
  useEffect(() => {
    iconScale.value = active && !reduced ? withSpring(1.12, springs.snappy) : 1;
  }, [active, reduced, iconScale]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Badge pop: springs in when the count arrives, collapses when it clears.
  const badgeScale = useSharedValue(0);
  useEffect(() => {
    const target = badge > 0 ? 1 : 0;
    badgeScale.value = reduced ? target : withSpring(target, springs.snappy);
  }, [badge, reduced, badgeScale]);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 54,
        paddingTop: 8,
      }}
    >
      <Animated.View style={iconStyle}>
        <View>
          {/* Outline → filled morph: lucide fills the glyph body on the
              active tab (accent), inactive icons stay ink outlines. */}
          <Icon
            size={22}
            color={active ? p.accent : p.text}
            fill={active ? p.accent : "transparent"}
          />
          {badge > 0 ? (
            <Animated.View
              accessibilityLabel={`${latn(badge > 99 ? 99 : badge)} إشعارات غير مقروءة`}
              style={[
                {
                  position: "absolute",
                  top: -6,
                  start: 12,
                  minWidth: 18,
                  height: 18,
                  backgroundColor: p.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 4,
                },
                badgeStyle,
              ]}
            >
              <T variant="xs" style={{ color: p.accentFg }}>
                {badge > 99 ? "99+" : latn(badge)}
              </T>
            </Animated.View>
          ) : null}
        </View>
      </Animated.View>
      <T
        variant="xs"
        weight={active ? "bold" : "medium"}
        numberOfLines={1}
        maxFontSizeMultiplier={1.25}
        style={{
          color: active ? p.accentInk : p.textMuted,
          marginTop: 2,
          // R334 review fix — Arabic labels clipped mid-word at 360–430dp
          // (VLM-verified on RN-web captures): 11/14 fits every role's
          // longest label («الإشعارات») inside a 5-slot row.
          fontSize: 11,
          lineHeight: 14,
          paddingHorizontal: 1,
          textAlign: "center",
        }}
      >
        {tab.label}
      </T>
    </Pressable>
  );
}
