import { RoleTabFrame } from "@/components/shell/TabFrame";

import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge, SimulatedBadge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { AR_DAYS, latn, num } from "@/lib/format";
import { HonestLedger, PAPER_STATUS_LABEL, countAr, numOf } from "@/features/governance/components";

interface EngagementPayload {
  attendance?: { presentRate?: number; lateRate?: number; absentRate?: number; total?: number };
  videos?: { totalLectures?: number; totalEvents?: number; completionRate?: number; completedLectures?: number };
  enrollments?: number;
  totalStudents?: number;
  papersByStatus?: Record<string, number>;
  weeklyActive?: number[];
  weeklyActiveEstimated?: boolean;
}

/** (tabs) Engagement — «الانخراط والحضور» (web QualityEngagementPage parity, honest rendering). */
function QualityEngagement() {
  const scope = useInstitutionScope();
  const engagement = useQuery({
    queryKey: ["quality", "engagement", scope],
    queryFn: async () => (await qualityApi.engagement()) as EngagementPayload,
  });

  const d = engagement.data;
  const weekly = d?.weeklyActive ?? [];
  const papers = d?.papersByStatus ?? {};
  const knownKeys = ["attendance", "videos", "enrollments", "totalStudents", "papersByStatus", "weeklyActive", "weeklyActiveEstimated"];
  const rest = d
    ? Object.fromEntries(Object.entries(d as Record<string, unknown>).filter(([k]) => !knownKeys.includes(k)))
    : {};

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/quality/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              الانخراط والحضور
            </T>
            <T variant="body" color="muted">
              نسب الحضور، إكمال المحاضرات، النقاط المتفاعلة.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        {engagement.isLoading ? (
          <SkeletonList rows={5} />
        ) : engagement.isError ? (
          <ErrorState
            message={(engagement.error as Error).message}
            onRetry={() => engagement.refetch()}
          />
        ) : !d ? null : (
          <>
            <View>
              <SectionBar index={1} title="مؤشرات الانخراط" />
              <RowList>
                <LedgerRow last>
                  <StatLine
                    label="معدل الحضور"
                    value={`${latn(Math.round(d.attendance?.presentRate ?? 0))}%`}
                    hint={countAr(d.attendance?.total ?? 0, ["سجل واحد", "سجلان", "سجلات", "سجلاً"])}
                  />
                  <StatLine label="نسبة التأخر" value={`${latn(Math.round(d.attendance?.lateRate ?? 0))}%`} />
                  <StatLine label="نسبة الغياب" value={`${latn(Math.round(d.attendance?.absentRate ?? 0))}%`} />
                  <StatLine label="معدل إكمال المحاضرات" value={`${latn(Math.round(d.videos?.completionRate ?? 0))}%`} />
                  <StatLine label="إجمالي الطلاب" value={num(numOf(d.totalStudents))} />
                  <StatLine
                    label="التسجيلات"
                    value={countAr(d.enrollments ?? 0, ["تسجيل واحد", "تسجيلان", "تسجيلات", "تسجيلاً"])}
                  />
                </LedgerRow>
              </RowList>
            </View>

            <View>
              <SectionBar
                index={2}
                title="النشاط الأسبوعي"
                action={d.weeklyActiveEstimated ? <SimulatedBadge note="منحنى تقديري" /> : undefined}
              />
              <RowList>
                {weekly.length === 0 ? (
                  <LedgerRow last>
                    <T variant="body" color="muted">
                      لا بيانات نشاط لهذا الأسبوع.
                    </T>
                  </LedgerRow>
                ) : (
                  weekly.map((n, i) => (
                    <LedgerRow key={i} last={i === weekly.length - 1}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <T variant="sm" color="muted">
                            {AR_DAYS[i] ?? `اليوم ${latn(i + 1)}`}
                          </T>
                        </View>
                        <T variant="bodyLg" weight="bold">
                          {latn(n)}
                        </T>
                      </View>
                    </LedgerRow>
                  ))
                )}
              </RowList>
              {d.weeklyActiveEstimated ? (
                <T variant="xs" color="faint">
                  عدد الجلسات اليومية النشطة — منحنى تقديري لحدّة البيانات المسجَّلة.
                </T>
              ) : null}
            </View>

            <View>
              <SectionBar index={3} title="البحوث حسب الحالة" />
              <RowList>
                <LedgerRow last>
                  {Object.keys(papers).length === 0 ? (
                    <T variant="body" color="muted">
                      لا بحوث بعد.
                    </T>
                  ) : (
                    Object.entries(papers).map(([key, value]) => (
                      <StatLine
                        key={key}
                        label={PAPER_STATUS_LABEL[key] ?? key}
                        value={num(numOf(value))}
                        hint={key in PAPER_STATUS_LABEL ? undefined : key}
                      />
                    ))
                  )}
                </LedgerRow>
              </RowList>
            </View>

            {Object.keys(rest).length > 0 ? (
              <View>
                <SectionBar index={4} title="بيانات إضافية" />
                <RowList>
                  <LedgerRow last>
                    <HonestLedger value={rest} />
                  </LedgerRow>
                </RowList>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}


export default function QualityEngagementTabbed() {
  return (
    <RoleTabFrame role="QUALITY">
      <QualityEngagement />
    </RoleTabFrame>
  );
}
