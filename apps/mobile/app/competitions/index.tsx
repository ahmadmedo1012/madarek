import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Send, Trophy } from "lucide-react-native";
import { socialApi } from "@/api/social";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { dueLabel } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import { SignInPrompt, apiMessage, competitionStatus, isUnauthError, submissionEnded } from "@/features/common/components";

/**
 * /competitions — the academic competitions list (auth context data; a
 * guest gets the honest sign-in prompt). Web twin: CompetitionsIndexPage.
 */
export default function CompetitionsIndex() {
  const p = usePalette();
  const tones = useStatusTones();
  const scope = useInstitutionScope();

  const q = useQuery({
    queryKey: ["competitions", scope],
    queryFn: () => socialApi.competitions(),
  });
  const rows = q.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="المسابقات" kicker="تحديات المعرفة والابتكار" />

      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          المسابقات الأكاديمية
        </T>
        <T variant="body" color="secondary">
          شارك في تحديات المعرفة والابتكار، أو نظِّم مسابقتك الخاصّة.
        </T>
      </View>

      {q.isLoading ? (
        <SkeletonList rows={5} />
      ) : q.isError ? (
        isUnauthError(q.error) ? (
          <SignInPrompt message="المسابقات تحتاج حسابًا — سجّل الدخول لعرضها والمشاركة فيها." />
        ) : (
          <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          title="لا توجد مسابقات بعد"
          message="ستظهر المسابقات المتاحة هنا فور إطلاقها من منظّميها."
          icon={<Trophy size={20} color={p.textMuted} />}
        />
      ) : (
        <RowList>
          {rows.map((c, i) => {
            const ended = submissionEnded(c);
            const st = competitionStatus(c.status);
            const due = dueLabel(c.deadline ?? null);
            return (
              <LedgerRow
                key={c.id}
                last={i === rows.length - 1}
                onPress={() => router.push(`/competitions/${c.id}` as never)}
                accessibilityLabel={`${c.title} — ${ended ? "انتهى التقديم" : st.label}`}
              >
                <View style={{ gap: sp[6] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <Trophy size={16} color={p.goldInk} />
                    <T variant="body" weight="bold" numberOfLines={2} style={{ flex: 1 }}>
                      {c.title}
                    </T>
                    {ended ? (
                      <Badge label="انتهى التقديم" tone="yellow" />
                    ) : (
                      <Badge label={st.label} tone={st.tone} />
                    )}
                  </View>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}
                  >
                    {c.category ? (
                      <T variant="sm" color="muted">
                        {c.category}
                      </T>
                    ) : null}
                    {c.deadline ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Calendar size={12} color={due.overdue ? tones.rose.ink : p.textMuted} />
                        <T variant="sm" color={due.overdue ? "danger" : "muted"}>
                          {due.text}
                        </T>
                      </View>
                    ) : null}
                    {c.myEntry ? (
                      <Badge label="مشاركتي مسجَّلة" tone="sky" />
                    ) : c.status === "OPEN" && !ended ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Send size={12} color={p.accentInk} />
                        <T variant="sm" color="accentInk">
                          يمكنك المشاركة
                        </T>
                      </View>
                    ) : null}
                  </View>
                </View>
              </LedgerRow>
            );
          })}
        </RowList>
      )}
    </Screen>
  );
}
