import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ArrowRight, Building2, Search } from "lucide-react-native";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { BrandMark } from "@/components/ui/brand";
import { initials , latn } from "@/lib/format";
import { useUnreadCount } from "@/hooks/useNotifications";

/**
 * AppTopBar — the role shell header: brand, greeting + institution chip,
 * search entry, and the notifications badge (bell target per role maps to
 * the alerts page, mirroring web alertsPath).
 */
export function AppTopBar({ alertsPath }: { alertsPath: string }) {
  const p = usePalette();
  const user = useSession((s) => s.user);
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
      }}
    >
      <BrandMark size={28} />
      <View style={{ flex: 1, gap: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
          <T variant="xs" weight="bold" numberOfLines={1}>
            {user ? `${ROLE_LABELS[user.role] ?? ""} · ${user.firstName} ${user.lastName}` : "مدارك"}
          </T>
        </View>
        {user?.currentInstitution ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Building2 size={11} color={p.textMuted} />
            <T variant="xs" color="muted" numberOfLines={1}>
              {user.currentInstitution.name}
            </T>
          </View>
        ) : null}
      </View>
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
          <MonoLabel>{unread > 0 ? latn(unread > 99 ? 99 : unread) : "•"}</MonoLabel>
          <View
            style={{
              position: "absolute",
              top: 6,
              start: 10,
              width: 8,
              height: 8,
              backgroundColor: unread > 0 ? p.accent : "transparent",
            }}
          />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="حسابي"
        onPress={() => router.push("/settings")}
        style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: user?.avatarColor ?? p.accentSoft,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.rule,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <T variant="xs" weight="bold" style={{ color: "#FFFFFF" }}>
            {user ? initials(user.firstName, user.lastName) : "؟"}
          </T>
        </View>
      </Pressable>
    </View>
  );
}

/** StackHeader — back arrow (RTL: points right) + drafting title. */
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
