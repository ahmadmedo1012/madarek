import type { ReactNode } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, Landmark, Medal, Users } from "lucide-react-native";
import { collegesApi } from "@/api/catalog";
import { useSession } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { num } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import { apiMessage } from "@/features/common/components";

/**
 * /colleges — the public colleges registry (no auth needed; the backend
 * /colleges route is public). Reachable from the welcome screen by guests.
 * Web twin: CollegesIndexPage — quiet rows, name is the row's door,
 * counters as secondary line; guests get the web's public-zeros ruling
 * (a «0 طالب» chip on a thin college reads as a dead campus, so zero
 * counts drop for guests; authed roles keep the honest full view).
 */
export default function CollegesIndex() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const isGuest = !user;

  const q = useQuery({
    queryKey: ["colleges", scope],
    queryFn: () => collegesApi.list(),
    staleTime: 5 * 60_000,
  });
  const colleges = q.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="الكلّيات" kicker="جامعة مدارك التجريبية" />

      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          البنية الأكاديمية التجريبية
        </T>
        <T variant="body" color="secondary">
          استكشف الكلّيّات والأقسام في سجلّ المؤسّسة المرجعية للعرض، وقادة كلّ كلّيّة، وأبرز طلّابها وأنشطها.
        </T>
      </View>

      {q.isLoading ? (
        <SkeletonList rows={6} />
      ) : q.isError ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : colleges.length === 0 ? (
        <EmptyState
          title="لا توجد كلّيّات بعد"
          message="ستظهر الكلّيّات هنا حين يضيفها المسجل العام."
          icon={<Landmark size={20} color={p.textMuted} />}
        />
      ) : (
        <>
          <RowList>
            {colleges.map((c, i) => (
              <LedgerRow
                key={c.id}
                last={i === colleges.length - 1}
                onPress={() => router.push(`/colleges/${c.id}` as never)}
                accessibilityLabel={`كلّيّة ${c.name}${c.city ? ` — ${c.city}` : ""}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    accessibilityLabel="رمز الكلّيّة"
                  >
                    <T variant="h4">{typeof c.iconEmoji === "string" && c.iconEmoji ? c.iconEmoji : "🏛️"}</T>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="bold" numberOfLines={1}>
                      {c.name}
                    </T>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
                      {c.city ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Building2 size={12} color={p.textMuted} />
                          <T variant="sm" color="muted">
                            {c.city}
                          </T>
                        </View>
                      ) : null}
                      <CountChip
                        icon={<GraduationCap size={12} color={p.textMuted} />}
                        value={c.studentCount}
                        label="طالب"
                        hideZero={isGuest}
                      />
                      <CountChip
                        icon={<Users size={12} color={p.textMuted} />}
                        value={c.programsCount}
                        label="برنامج"
                        hideZero={isGuest}
                      />
                    </View>
                  </View>
                </View>
              </LedgerRow>
            ))}
          </RowList>

          <Button
            label="منافسة الكلّيات"
            kind="ghost"
            icon={<Medal size={16} color={p.goldInk} />}
            onPress={() => router.push("/colleges/leaderboard" as never)}
          />
          <MonoLabel>REGISTRY · COLLEGES</MonoLabel>
        </>
      )}
    </Screen>
  );
}

/** Quiet counter text — hidden for guests when zero (web A8 P2-6 ruling). */
function CountChip({
  icon,
  value,
  label,
  hideZero,
}: {
  icon: ReactNode;
  value: number | null | undefined;
  label: string;
  hideZero?: boolean;
}) {
  if (value === null || value === undefined) return null;
  if (hideZero && value === 0) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {icon}
      <T variant="sm" color="muted">{`${num(value)} ${label}`}</T>
    </View>
  );
}
