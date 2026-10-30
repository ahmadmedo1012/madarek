import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal } from "lucide-react-native";
import { collegesApi } from "@/api/catalog";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn, num } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import { apiMessage } from "@/features/common/components";

/**
 * /colleges/leaderboard — the inter-college comparison board. Ranked rows
 * (rank latn · name · score) with gold-tone accents on the leaders (the
 * Heron gold palette role — p.goldInk). Web twin: CollegesLeaderboardPage
 * (mobile keeps the ranked-list anatomy; the 7-column table is not a
 * phone surface).
 */
export default function CollegesLeaderboard() {
  const p = usePalette();
  const scope = useInstitutionScope();

  const q = useQuery({
    queryKey: ["colleges", "leaderboard", scope],
    queryFn: () => collegesApi.leaderboard(),
    staleTime: 5 * 60_000,
  });

  const rows = (q.data ?? [])
    .slice()
    .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));

  return (
    <Screen scroll>
      <StackHeader title="منافسة الكلّيات" kicker="لوحة المتصدّرين" />

      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          لوحة المتصدّرين
        </T>
        <T variant="body" color="secondary">
          مقارنة الكلّيّات على مؤشّرات الأداء الأكاديميّ والنشاط الرقميّ.
        </T>
      </View>

      {q.isLoading ? (
        <SkeletonList rows={8} />
      ) : q.isError ? (
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لوحة منافسة الكلّيّات فارغة"
          message="تُحتسب النقاط من نشاط الطلاب المسجّل؛ ستظهر أولى النتائج مع بداية النشاط هذا الفصل."
          icon={<Medal size={20} color={p.textMuted} />}
        />
      ) : (
        <>
          {/* The leader podium band — gold ink carries the top story. */}
          <Card style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Crown size={22} color={p.goldInk} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="body" weight="bold">
                  {rows[0]?.name ?? "—"}
                </T>
                <T variant="sm" color="muted">
                  {`${num(rows[0]?.score ?? 0)} نقطة`}
                </T>
              </View>
              <MonoLabel>{latn(1)}</MonoLabel>
            </View>
          </Card>

          <RowList>
            {rows.map((c, i) => {
              const rank = i + 1;
              const top3 = rank <= 3;
              return (
                <LedgerRow
                  key={c.id}
                  last={i === rows.length - 1}
                  onPress={() => router.push(`/colleges/${c.id}` as never)}
                  accessibilityLabel={`الترتيب ${latn(rank)}: ${c.name}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <View style={{ width: 34, alignItems: "center" }} accessibilityLabel={`الترتيب ${latn(rank)}`}>
                      {rank <= 3 ? (
                        <Medal size={18} color={p.goldInk} />
                      ) : (
                        <MonoLabel>{latn(rank)}</MonoLabel>
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight={top3 ? "bold" : "medium"} numberOfLines={1}>
                        {c.name}
                      </T>
                      {c.city ? (
                        <T variant="sm" color="muted">
                          {c.city}
                        </T>
                      ) : null}
                    </View>
                    <T
                      variant="bodyLg"
                      weight="bold"
                      color={top3 ? "gold" : "text"}
                    >
                      {c.score === null || c.score === undefined ? "—" : num(c.score)}
                    </T>
                  </View>
                </LedgerRow>
              );
            })}
          </RowList>

          <T variant="xs" color="faint" style={{ textAlign: "center" }}>
            تُحتسب النقاط من نشاط الطلاب المسجّل في كل كلّيّة — بيانات تجريبية.
          </T>
        </>
      )}
    </Screen>
  );
}
