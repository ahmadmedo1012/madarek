import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Bell from "lucide-react-native/icons/bell";
import Search from "lucide-react-native/icons/search";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { BrandMark } from "@/components/ui/brand";
import { latn } from "@/lib/format";
import { useUnreadCount } from "@/hooks/useNotifications";

/**
 * AppTopBar — the compact role-shell header (R334 3-a policy):
 * brand · title · search · bell.
 *
 * The identity block (user name + institution chip + avatar → /settings)
 * lived here since R331 and crowded every tab screen; identity/institution
 * now live in Profile (حسابي — the identity card is that tab's hero) and
 * /settings stays reachable from the Profile menu + the report card. The
 * prop contract is unchanged (`alertsPath`) — all ~30 tab screens compile
 * untouched.
 *
 * "back/menu" seat: there is no drawer in this app (the shell is
 * tab-based); pushed screens get their back affordance from StackHeader.
 */
export function AppTopBar({ alertsPath }: { alertsPath: string }) {
  const p = usePalette();
  const { data: unread = 0 } = useUnreadCount();

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="البحث"
        onPress={() => router.push("/search")}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Search size={20} color={p.text} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread > 0 ? `الإشعارات — ${latn(unread)} غير مقروءة` : "الإشعارات"}
        onPress={() => router.push(alertsPath as never)}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <View>
          <Bell size={20} color={p.text} />
          {unread > 0 ? (
            <View
              accessibilityElementsHidden
              style={{
                position: "absolute",
                top: -2,
                start: 12,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
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
      </Pressable>
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
        onPress={() => (onBack ? onBack() : router.back())}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <ArrowRight size={22} color={p.text} />
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
