import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Bot, Sparkles } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { get } from "@/api/client";
import { latn } from "@/lib/format";
import { numOf, type AiMetricsRow } from "@/features/governance/components";

/** AI feature keys → Arabic labels (web OwnerAiPage FEATURE_LABELS parity). */
const FEATURE_LABELS: Record<string, string> = {
  chat: "المحادثة",
  quiz_gen: "توليد الاختبارات",
  research_assist: "المساعد البحثي",
  translation: "الترجمة",
};

function featureLabel(feature?: string): string {
  if (!feature) return "—";
  return FEATURE_LABELS[feature] ?? feature;
}

/**
 * Pushed: /owner/ai — «مركز الذكاء الاصطناعيّ» (web OwnerAiPage parity):
 * usage metrics as honest StatLines and the provider badge verbatim —
 * `local` discloses the template composer («مزوّد محلي (قالبيّ)»), a real
 * model name renders as itself. No badge before the config answers.
 */
export default function OwnerAi() {
  const metrics = useQuery({
    queryKey: ["owner", "ai-metrics"],
    queryFn: () => ownerApi.aiMetrics(),
  });
  const cfg = useQuery({
    queryKey: ["ai", "config"],
    queryFn: () => get<{ provider: string; model?: string | null }>("/ai/config"),
    staleTime: 300_000,
  });

  const m = metrics.data as AiMetricsRow | undefined;

  return (
    <Screen scroll>
      <StackHeader
        title="مركز الذكاء الاصطناعيّ"
        kicker="لوحة المالك"
        right={
          cfg.data ? (
            cfg.data.provider === "local" ? (
              <Badge label="مزوّد محلي (قالبيّ)" tone="yellow" />
            ) : (
              <Badge label={cfg.data.model || cfg.data.provider} tone="mint" mono={false} />
            )
          ) : undefined
        }
      />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            مركز الذكاء الاصطناعيّ
          </T>
          <T variant="body" color="muted">
            مراقبة استخدام وأداء خدمات الذكاء الاصطناعيّ
          </T>
        </View>

        {metrics.isLoading ? (
          <SkeletonList rows={4} rowHeight={48} />
        ) : metrics.isError ? (
          <ErrorState message={(metrics.error as Error).message} onRetry={() => metrics.refetch()} />
        ) : (
          <View style={{ gap: 16 }}>
            {/* [01] الحقائق الأساسية */}
            <View>
              <SectionBar index={1} title="مؤشّرات الاستخدام" />
              <RowList>
                <LedgerRow last>
                  <StatLine
                    label="إجمالي الطلبات"
                    value={numOf(m?.totalRequests)}
                    hint="تراكميّة على المنصّة"
                  />
                  <StatLine
                    label="إجمالي التوكنات"
                    value={numOf(m?.totalTokens)}
                    hint="مقيسة من المزوّد"
                  />
                  <StatLine
                    label="معدّل النجاح"
                    value={m?.successRate != null ? `${latn(Math.round(m.successRate))}%` : null}
                    hint={
                      m?.successRate != null
                        ? m.successRate >= 90
                          ? "تشغيل مستقرّ"
                          : "راجع الأعطال الأخيرة"
                        : null
                    }
                  />
                  <StatLine
                    label="متوسّط الاستجابة"
                    value={m?.avgLatencyMs != null ? `${latn(Math.round(m.avgLatencyMs))}ms` : null}
                    hint="زمن الردّ المتوسط"
                  />
                </LedgerRow>
              </RowList>
            </View>

            {/* [02] الطلبات حسب الميزة */}
            <View>
              <SectionBar index={2} title="الطلبات حسب الميزة" />
              {(m?.byFeature ?? []).length === 0 ? (
                <EmptyState
                  icon={<Bot size={22} color="#62625F" />}
                  title="لا توجد طلبات لعرضها"
                  message="تظهر مؤشّرات الاستخدام هنا فور تسجيل أوّل طلب."
                />
              ) : (
                <RowList>
                  {(m?.byFeature ?? []).map((f, i, arr) => (
                    <LedgerRow key={f.feature ?? i} last={i === arr.length - 1}>
                      <StatLine
                        label={featureLabel(f.feature)}
                        value={numOf(f.count)}
                        hint={numOf(f.tokens) != null ? `التوكنات: ${latn(numOf(f.tokens) as number)}` : null}
                      />
                    </LedgerRow>
                  ))}
                </RowList>
              )}
            </View>

            {/* [03] اتّجاه الاستخدام */}
            <View>
              <SectionBar index={3} title="اتّجاه الاستخدام (7 أيّام)" />
              {(m?.trend ?? []).length === 0 ? (
                <T variant="body" color="muted">
                  لا توجد بيانات بعد — يُرسم الاتّجاه فور تسجيل أوّل طلب.
                </T>
              ) : (
                <RowList>
                  {(m?.trend ?? []).map((t, i, arr) => (
                    <LedgerRow key={t.date ?? i} last={i === arr.length - 1}>
                      <StatLine label={t.date ?? "—"} value={numOf(t.count)} />
                    </LedgerRow>
                  ))}
                </RowList>
              )}
            </View>

            {cfg.data?.provider === "local" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Sparkles size={14} color="#A8750F" />
                <T variant="sm" color="muted">
                  المزوّد محليّ (قالبيّ) — الردود تُركَّب من قوالب على الخادم وليست من نموذج لغويّ
                  خارجيّ.
                </T>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
