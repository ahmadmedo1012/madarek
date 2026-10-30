import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Landmark, Library, PlayCircle } from "lucide-react-native";
import { useSession, ROLE_HOME } from "@/auth/session";
import { get } from "@/api/client";
import type { AuthUser } from "@/api/types";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { BrandMark } from "@/components/ui/brand";
import { Hairline } from "@/components/ui/surfaces";
import { LoadingScreen } from "@/components/ui/states";

/**
 * Welcome — the public native entry. Guests see a compact branded sheet
 * (not a miniature of the marketing page); authenticated users are routed
 * to their role home (web HomeRedirect parity). Supports ?continue= for
 * post-auth return.
 */
export default function Welcome() {
  const { bg, surface, border, text } = usePalette();
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
    <Screen scroll padded={false} style={{ backgroundColor: bg }}>
      <View style={{ paddingHorizontal: sp[20], paddingTop: sp[48], gap: sp[16] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
          <BrandMark size={44} />
          <View style={{ gap: 2 }}>
            <T variant="h1" weight="bold">مدارك</T>
            <MonoLabel>MADAREK · LIBYA</MonoLabel>
          </View>
        </View>
        <Hairline />
        <T variant="h3" weight="bold">منصّة التعليم الذكي</T>
        <T variant="bodyLg" color="secondary">
          محاضرات تفاعلية بمحطات فحص، اختبارات إلكترونية، مصفوفة إتقان، بحوث بمراجعة أكاديمية، وتدريب ذاتي — عربية بالكامل.
        </T>
      </View>

      <View style={{ paddingHorizontal: sp[20], gap: sp[12], paddingTop: sp[16] }}>
        <Button
          label="تسجيل الدخول"
          kind="primary"
          onPress={() => router.push({ pathname: "/auth", params: params.continue ? { continue: params.continue } : {} })}
        />
        <Button
          label="إنشاء حساب جديد"
          kind="ghost"
          onPress={() => router.push({ pathname: "/auth/register", params: params.continue ? { continue: params.continue } : {} })}
        />
        <Button
          label="تصفّح الكلّيات"
          kind="ghost"
          onPress={() => router.push("/colleges")}
        />
      </View>

      <View style={{ paddingHorizontal: sp[20], paddingTop: sp[24], gap: sp[8] }}>
        <MonoLabel>[01] قدرات المنصّة</MonoLabel>
        <FeatureRow icon={<PlayCircle size={20} color={text} />} title="محاضرات تفاعلية" sub="محطات فحص أثناء المشاهدة وحضور تلقائي" />
        <FeatureRow icon={<GraduationCap size={20} color={text} />} title="اختبارات إلكترونية" sub="تصحيح فوري للأسئلة الموضوعية" />
        <FeatureRow icon={<Library size={20} color={text} />} title="مكتبة وبحوث" sub="رفع PDF ومراجعة أستاذ المقرّر" />
        <FeatureRow icon={<Landmark size={20} color={text} />} title="كلّيات معتمدة" sub="فهارس عامة للكلّيات والبرامج" />
      </View>

      <View style={{ paddingHorizontal: sp[20], paddingVertical: sp[32] }}>
        <Hairline style={{ marginBottom: sp[12] }} />
        <T variant="xs" color="faint">
          مدارك منصّة تعليمية مستقلّة عربية-أولًا من ليبيا — بيانات مؤسّسة العرض المرجعية بوضع الطيار الحالي.
        </T>
      </View>
    </Screen>
  );
}

function FeatureRow({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: sp[12],
        backgroundColor: p.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        padding: sp[12],
      }}
    >
      <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" weight="bold">{title}</T>
        <T variant="sm" color="muted">{sub}</T>
      </View>
    </View>
  );
}
