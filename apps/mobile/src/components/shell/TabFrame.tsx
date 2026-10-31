import { Pressable, StyleSheet, View } from "react-native";
import type { ComponentType, ReactNode } from "react";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Activity, BadgeCheck, BarChart3, Bell, BookOpen, CalendarDays, ClipboardList, FileSearch, Home,
  Landmark, LineChart, Network, Scale, School, ScrollText, Sparkles, User, Users,
} from "lucide-react-native";
import { usePalette } from "@/design/theme";
import { T } from "@/components/ui/text";
import { useUnreadCount } from "@/hooks/useNotifications";
import { latn } from "@/lib/format";
import type { AppRole } from "@/api/types";

export interface RoleTab {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Tab hosting the notifications inbox — receives the unread badge. */
  inbox?: boolean;
}

/**
 * Per-role tab destinations (web BottomNav parity). Built as an explicit bar
 * over stack routes — one mechanism that works identically on native, web
 * dev, and static web export (nested route groups are unreliable in the
 * web exporter).
 */
export const ROLE_TABS: Record<AppRole, RoleTab[]> = {
  STUDENT: [
    { path: "/student/dashboard", label: "الرئيسية", icon: Home },
    { path: "/student/courses", label: "مقرراتي", icon: BookOpen },
    { path: "/student/ai", label: "المساعد", icon: Sparkles },
    { path: "/student/alerts", label: "الإشعارات", icon: Bell, inbox: true },
    { path: "/student/profile", label: "حسابي", icon: User },
  ],
  TEACHER: [
    { path: "/teacher/dashboard", label: "اللوحة", icon: Home },
    { path: "/teacher/schedule", label: "الجدول", icon: CalendarDays },
    { path: "/teacher/students", label: "الطلاب", icon: Users },
    { path: "/teacher/intelligence", label: "التحليلات", icon: LineChart },
    { path: "/teacher/profile", label: "حسابي", icon: User },
  ],
  ADMIN: [
    { path: "/admin/dashboard", label: "اللوحة", icon: Home },
    { path: "/admin/faculties", label: "الكلّيات", icon: Landmark },
    { path: "/admin/students", label: "الطلاب", icon: Users },
    { path: "/admin/teachers", label: "الأساتذة", icon: ScrollText },
    { path: "/admin/reports", label: "التقارير", icon: BarChart3 },
  ],
  QUALITY: [
    { path: "/quality/dashboard", label: "اللوحة", icon: Home },
    { path: "/quality/courses", label: "المقررات", icon: BookOpen },
    { path: "/quality/curriculum", label: "المناهج", icon: ClipboardList },
    { path: "/quality/engagement", label: "التفاعل", icon: Network },
    { path: "/quality/reports", label: "التقارير", icon: FileSearch },
  ],
  OWNER: [
    { path: "/owner/dashboard", label: "اللوحة", icon: Home },
    { path: "/owner/users", label: "المستخدمون", icon: Users },
    { path: "/owner/realtime", label: "الحيّ", icon: Activity },
    { path: "/owner/notifications", label: "الإشعارات", icon: Bell, inbox: true },
    { path: "/owner/governance", label: "الحواكمة", icon: Scale },
  ],
};

/** RoleTabFrame — paper ground bar with ink icons and the orange unread signal. */
export function RoleTabFrame({ role, children }: { role: AppRole; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { data: unread = 0 } = useUnreadCount();
  const tabs = ROLE_TABS[role];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flex: 1 }}>{children}</View>
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: p.rule,
          backgroundColor: p.surface,
          paddingBottom: Math.max(insets.bottom, 6),
          flexDirection: "row",
        }}
        accessibilityRole="tablist"
      >
        {tabs.map((tab) => {
          // R327 B3: sub-screens keep their tab lit — /student/courses/[id]
          // highlights «مقرراتي», not nothing.
          const active =
            pathname === tab.path || pathname.startsWith(tab.path + "/");
          const Icon = tab.icon;
          const badge = tab.inbox ? unread : 0;
          return (
            <Pressable
              key={tab.path}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (pathname === tab.path) return; // already at this tab's root
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                // R327 B3: dismissTo returns to the LIVE instance when one is
                // in the stack (scroll position preserved) and only pushes
                // when the tab root isn't mounted yet.
                router.dismissTo(tab.path as never);
              }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                minHeight: 54,
                paddingTop: 8,
                // R327 B3: the active marker — a 2dp orange underline on the
                // tab's bottom edge (no shadows, radius 0, Heron discipline).
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
    </View>
  );
}
