import { useEffect } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSession, ROLE_HOME } from "@/auth/session";
import { get } from "@/api/client";
import type { AuthUser } from "@/api/types";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { BrandMark } from "@/components/ui/brand";
import { Hairline } from "@/components/ui/surfaces";
import { LoadingScreen } from "@/components/ui/states";
import { PlanBuilding } from "@/brand/plan";

/**
 * Welcome — the public native entry. Guests see the app's SIGNATURE:
 * the drafted architectural plan of the website, drawing itself in on
 * paper — one facade elevation, one type stack, ONE orange CTA.
 * Authenticated users are routed to their role home (web HomeRedirect
 * parity). Supports ?continue= for post-auth return.
 */
export default function Welcome() {
  const { bg, text } = usePalette();
  const user = useSession((s) => s.user);
  const isHydrated = useSession((s) => s.isHydrated);
  const params = useLocalSearchParams<{ continue?: string }>();

  const meQuery = useQuery({
    queryKey: ["session", "me"],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: () => get<AuthUser>("/auth/me"),
  });

  useEffect(() => {
    if (!isHydrated || !user) return;
    const fresh = meQuery.data ? (meQuery.data as AuthUser) : user;
    const cont = params.continue ? decodeURIComponent(params.continue) : null;
    const dest =
      cont && (fresh.currentInstitution || fresh.role === "OWNER")
        ? cont
        : !fresh.currentInstitution && fresh.role !== "OWNER"
          ? "/select-institution"
          : ROLE_HOME[fresh.role] ?? "/student/dashboard";
    router.replace(dest as never);
  }, [isHydrated, user, meQuery.data, params.continue]);

  if (!isHydrated) {
    return <LoadingScreen label="جارٍ تجهيز الجلسة…" />;
  }
  if (user) {
    return <LoadingScreen label="جارٍ الدخول…" />;
  }

  return (
    <Screen scroll padded={false} style={{ backgroundColor: bg }} contentContainerStyle={{ flexGrow: 1 }}>
      {/* the drafting sheet: faint axis grid across the whole paper */}
      <GridBackdrop color={text} />

      <View style={{ paddingHorizontal: sp[24], paddingTop: sp[40], paddingBottom: sp[16], flexGrow: 1 }}>
        {/* quiet mark row — the drawing carries the brand from here */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <BrandMark size={20} />
          <T variant="bodyLg" weight="bold">مدارك</T>
        </View>

        {/* the signature: the facade draws itself in */}
        <PlanBuilding autoplay width="78%" style={{ marginTop: sp[40] }} />

        {/* title stack */}
        <View style={{ marginTop: sp[32], gap: sp[6] }}>
          <T variant="display" weight="bold" style={{ lineHeight: 40 }}>رحلة تعلم واحدة</T>
          <T variant="h4" weight="medium" color="secondary">من المحاضرة إلى الإتقان</T>
        </View>

        {/* decisive actions — ONE orange CTA, one quiet link */}
        <View style={{ marginTop: "auto", paddingTop: sp[40], gap: sp[4] }}>
          <Button
            label="تسجيل الدخول"
            kind="accent"
            onPress={() => router.push({ pathname: "/auth", params: params.continue ? { continue: params.continue } : {} })}
          />
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => router.push({ pathname: "/auth/register", params: params.continue ? { continue: params.continue } : {} })}
            style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
          >
            <T variant="body" weight="medium" color="secondary" style={{ textAlign: "center" }}>
              إنشاء حساب جديد
            </T>
          </Pressable>
        </View>

        <View style={{ marginTop: sp[24], gap: sp[8] }}>
          <Hairline />
          <T variant="xs" color="faint">
            مدارك منصّة تعليمية مستقلّة عربية-أولًا من ليبيا — بيانات مؤسّسة العرض المرجعية بوضع الطيار الحالي.
          </T>
        </View>
      </View>
    </Screen>
  );
}

/** Full-bleed hairline grid — the drafting paper under the whole sheet. */
function GridBackdrop({ color }: { color: string }) {
  const { width, height } = useWindowDimensions();
  const step = 32;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height} style={{ opacity: 0.06 }}>
        {Array.from({ length: cols + 1 }, (_, i) => (
          <Line key={`v${i}`} x1={i * step} y1={0} x2={i * step} y2={height} stroke={color} strokeWidth={1} />
        ))}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <Line key={`h${i}`} x1={0} y1={i * step} x2={width} y2={i * step} stroke={color} strokeWidth={1} />
        ))}
      </Svg>
    </View>
  );
}
