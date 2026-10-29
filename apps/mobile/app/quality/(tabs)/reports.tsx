import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Skeleton, SkeletonList, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn, num } from "@/lib/format";
import {
  SeverityChip,
  alertCategoryLabel,
  countAr,
  numOf,
  type QualityAlertsPayload,
} from "@/features/governance/components";

/** (tabs) Quality reports — composite (web QualityReportsPage + dashboard sections). */
export default function QualityReports() {
  const scope = useInstitutionScope();
  const overview = useQuery({
    queryKey: ["quality", "overview", scope],
    queryFn: () => qualityApi.overview(),
  });
  const engagement = useQuery({
    queryKey: ["quality", "engagement", scope],
    queryFn: () => qualityApi.engagement(),
  });
  const alerts = useQuery({
    queryKey: ["quality", "alerts", scope],
    queryFn: async () => (await qualityApi.alerts()) as QualityAlertsPayload | QualityAlertsPayload["alerts"],
    staleTime: 60_000,
  });

  const ov = overview.data as Record<string, unknown> | undefined;
  const users = (ov?.users ?? {}) as Record<string, unknown>;
  const eng = engagement.data as
    | {
        attendance?: { presentRate?: number; total?: number };
        videos?: { completionRate?: number };
        enrollments?: number;
        totalStudents?: number;
        weeklyActive?: number[];
      }
    | undefined;
  const alertsPayload: QualityAlertsPayload = Array.isArray(alerts.data)
    ? { alerts: alerts.data, counts: null }
    : ((alerts.data as QualityAlertsPayload) ?? {});
  const alertRows = alertsPayload.alerts ?? [];
  const counts = alertsPayload.counts ?? null;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/quality/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              تقارير الجودة
            </T>
            <T variant="body" color="muted">
              لوحات حيّة بدلاً من تقارير ثابتة — تُحدَّث مع كل عمليّة على المنصّة.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        <View>
          <SectionBar index={1} title="نظرة عامة" />
          {overview.isLoading ? (
            <SkeletonList rows={3} />
          ) : overview.isError ? (
            <ErrorState message={(overview.error as Error).message} onRetry={() => overview.refetch()} compact />
          ) : (
            <RowList>
              <LedgerRow last>
                <StatLine label="الطلاب النشطون" value={num(numOf(users.STUDENT))} />
                <StatLine label="هيئة التدريس" value={num(numOf(users.TEACHER))} />
                <StatLine label="المقرّرات" value={num(numOf(ov?.courses))} />
                <StatLine label="الشُّعب" value={num(numOf(ov?.offerings))} />
              </LedgerRow>
            </RowList>
          )}
        </View>

        <View>
          <SectionBar index={2} title="الانخراط والحضور" />
          {engagement.isLoading ? (
            <SkeletonList rows={3} />
          ) : engagement.isError ? (
            <ErrorState message={(engagement.error as Error).message} onRetry={() => engagement.refetch()} compact />
          ) : (
            <RowList>
              <LedgerRow last>
                <StatLine
                  label="معدل الحضور"
                  value={`${latn(Math.round(eng?.attendance?.presentRate ?? 0))}%`}
                  hint={countAr(eng?.attendance?.total ?? 0, ["سجل واحد", "سجلان", "سجلات", "سجلاً"])}
                />
                <StatLine
                  label="معدل إكمال المحاضرات"
                  value={`${latn(Math.round(eng?.videos?.completionRate ?? 0))}%`}
                />
                <StatLine
                  label="التسجيلات"
                  value={countAr(eng?.enrollments ?? 0, ["تسجيل واحد", "تسجيلان", "تسجيلات", "تسجيلاً"])}
                />
              </LedgerRow>
            </RowList>
          )}
        </View>

        <View>
          <SectionBar index={3} title="تنبيهات الجودة" />
          {alerts.isLoading ? (
            <View style={{ gap: 8 }}>
              <Skeleton h={44} />
              <Skeleton h={44} />
            </View>
          ) : alerts.isError ? (
            <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} compact />
          ) : alertRows.length === 0 ? (
            <T variant="body" color="muted">
              لا توجد تنبيهات — كل المؤشرات ضمن النطاق الطبيعي حالياً.
            </T>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Badge
                  label={`حرجة ${latn(counts?.critical ?? alertRows.filter((a) => a.severity === "critical").length)}`}
                  tone="rose"
                />
                <Badge
                  label={`تحذيرات ${latn(counts?.warning ?? alertRows.filter((a) => a.severity === "warning").length)}`}
                  tone="yellow"
                />
                <Badge
                  label={`معلومات ${latn(counts?.info ?? alertRows.filter((a) => a.severity === "info").length)}`}
                  tone="sky"
                />
              </View>
              <RowList>
                {alertRows.slice(0, 3).map((a, i, arr) => (
                  <LedgerRow key={a.id} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <SeverityChip severity={a.severity} />
                      <T variant="xs" color="faint">
                        {alertCategoryLabel(a.category)} · {fromNow(a.occurredAt)}
                      </T>
                    </View>
                    <T variant="body" weight="medium">
                      {a.title ?? "—"}
                    </T>
                    {a.description ? (
                      <T variant="sm" color="muted" numberOfLines={2}>
                        {a.description}
                      </T>
                    ) : null}
                  </LedgerRow>
                ))}
              </RowList>
              <Button
                label="عرض كل التنبيهات"
                kind="ghost"
                small
                onPress={() => router.push("/quality/alerts" as never)}
              />
            </View>
          )}
        </View>

        <T variant="xs" color="faint">
          إصدار التقارير القابلة للتحميل (PDF/Excel) قيد التطوير. حاليّاً يمكنك الاعتماد على اللوحات الحيّة — كلّ
          الأرقام تُحدَّث فوريًّا مع البيانات في قاعدة المنصّة.
        </T>
      </View>
    </Screen>
  );
}
