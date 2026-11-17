import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Bell from "lucide-react-native/icons/bell";
import Search from "lucide-react-native/icons/search";
import Settings from "lucide-react-native/icons/settings";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { BrandMark } from "@/components/ui/brand";
import { latn } from "@/lib/format";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useSession, ROLE_HOME } from "@/auth/session";

/**
 * AppTopBar — the compact role-shell header (R334 3-a policy):
 * brand · title · search · bell (+ settings for three roles).
 *
 * The identity block (user name + institution chip + avatar) lived here
 * since R331 and crowded every tab screen; identity/institution now live
 * in Profile (حسابي — the identity card is that tab's hero). The prop
 * contract is unchanged (`alertsPath`) — all ~30 tab screens compile
 * untouched.
 *
 * R362 — the settings seat. The compact policy's own docblock claimed
 * "/settings stays reachable from the Profile menu", but only STUDENT
 * and TEACHER have a Profile tab: ADMIN, QUALITY and OWNER had NO path
 * to settings — no logout, no theme switch, no numerals, no password
 * change, no app-lock — trapped in-session until a forced relaunch.
 * Those three shells now get a gear seat at the end of the bar (the
 * standard native spot); STUDENT/TEACHER keep the Profile tab as their
 * settings seat, so nothing is duplicated for them.
 *
 * "back/menu" seat: there is no drawer in this app (the shell is
 * tab-based); pushed screens get their back affordance from StackHeader.
 */

/** The role shells without a Profile tab — they get the top-bar gear. */
const SETTINGS_SEAT_ROLES = new Set(["ADMIN", "QUALITY", "OWNER"]);

export function AppTopBar({ alertsPath }: { alertsPath: string }) {
  const p = usePalette();
  const role = useSession((s) => s.user?.role);
  const { data: unread = 0 } = useUnreadCount();
  const showSettings = role !== undefined && SETTINGS_SEAT_ROLES.has(role);

  return (
    <View
      style={{
        paddingHorizontal: sp[16],
        paddingTop: sp[8],
        paddingBottom: sp[8],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        backgroundColor: p.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        minHeight: 52,
      }}
    >
      <BrandMark size={26} />
      <T variant="h4" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
        مدارك
      </T>
      {/* R362 — the chrome pressables get a pressed seat: the icon-only
          44×44 targets were the only pressables in the kit with zero
          touch feedback (every other pressable answers with color /
          opacity / PressableScale). A quiet surfaceHover wash — same
          vocabulary Card uses — not a web hover. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="البحث"
        onPress={() => router.push("/search")}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 0 }}
      >
        {({ pressed }) => (
          <View style={{ alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: pressed ? p.surfaceHover : "transparent" }}>
            <Search size={20} color={pressed ? p.accentInk : p.text} />
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `الإشعارات — ${latn(unread)}` : "الإشعارات"}
        onPress={() => router.push(alertsPath as never)}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 0 }}
      >
        {({ pressed }) => (
          <View style={{ alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: pressed ? p.surfaceHover : "transparent" }}>
            <View>
              <Bell size={20} color={pressed ? p.accentInk : p.text} />
              {unread > 0 ? (
                <View
                  accessibilityElementsHidden
                  style={{
                    position: "absolute",
                    top: -2,
                    start: 12,
                    minWidth: 16,
                    height: 16,
                    // R354-UI-2 — the count chip is the shell's square grammar
                    // (TabBar's badge + the web .nav-badge are square on a
                    // hairline); this one alone was a 8dp pill.
                    borderRadius: 0,
                    backgroundColor: p.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                  }}
                >
                  <T variant="xs" style={{ color: p.accentFg }}>
                    {unread > 99 ? "99+" : latn(unread)}
                  </T>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </Pressable>
      {showSettings ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الإعدادات"
          onPress={() => router.push("/settings" as never)}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 0 }}
        >
          {({ pressed }) => (
            <View style={{ alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: pressed ? p.surfaceHover : "transparent" }}>
              <Settings size={20} color={pressed ? p.accentInk : p.text} />
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * StackHeader — back arrow (RTL: points right) + drafting title.
 * The pushed-screen header (compact policy: back · title · right action).
 * Native large-title collapse is deliberately NOT implemented — these are
 * in-screen headers over a scroll body, not native-stack headers; see
 * docs/mobile/screens/shell.md.
 */
export function StackHeader({
  title,
  kicker,
  right,
  onBack,
}: {
  title: string;
  kicker?: string;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        backgroundColor: p.surface,
        paddingHorizontal: sp[8],
        paddingTop: sp[4],
        paddingBottom: sp[8],
        minHeight: 52,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="رجوع"
        /* R362 — the empty-history fallback: a cold deep link lands
           directly on a detail route (madarek://student/courses/123),
           the stack has nothing under it, and the old bare router.back()
           either no-opped or exited the app. Explicit onBack keeps its
           exact contract; otherwise back when there IS history, and the
           role home when there is not. */
        onPress={() => {
          if (onBack) return onBack();
          if (router.canGoBack()) return router.back();
          const role = useSession.getState().user?.role;
          router.replace(((role && ROLE_HOME[role]) || "/auth") as never);
        }}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 0 }}
      >
        {({ pressed }) => (
          <View style={{ alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: pressed ? p.surfaceHover : "transparent" }}>
            <ArrowRight size={22} color={pressed ? p.accentInk : p.text} />
          </View>
        )}
      </Pressable>
      <View style={{ flex: 1, gap: 0 }}>
        {kicker ? (
          <T variant="xs" color="muted" numberOfLines={1}>
            {kicker}
          </T>
        ) : null}
        <T variant="h4" weight="bold" numberOfLines={1}>
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}
