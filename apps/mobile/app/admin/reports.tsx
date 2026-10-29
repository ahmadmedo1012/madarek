import { RoleTabFrame } from "@/components/shell/TabFrame";

import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { adminApi } from "@/api/admin";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { countAr, HonestLedger } from "@/features/governance/components";

interface TrendMonth {
  month?: string | null;
  submitted?: number | null;
  graded?: number | null;
  published?: number | null;
}
interface TopCourse {
  code?: string | null;
  name?: string | null;
  enrollments?: number | null;
  lectures?: number | null;
}

/**
 * (tabs) Reports — «التقارير المؤسسية» (web AdminReportsPage parity).
 * The payload renders HONESTLY: known sections (headline / paperTrend /
 * topCourses) get native ledgers; every other top-level entry renders
 * through the honest unknown-JSON ledger (numbers via latn, arrays as
 * counted rows, labels from keys — nothing fabricated).
 */
function AdminReports() {
  const scope = useInstitutionScope();
  const reports = useQuery({
    queryKey: ["admin", "reports", scope],
    queryFn: () => adminApi.reports(),
  });

  let sectionIndex = 0;
  const nextIndex = () => ++sectionIndex;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/admin/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            التقارير المؤسسية
          </T>
          <T variant="body" color="muted">
            مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية.
          </T>
        </View>

        {reports.isLoading ? (
          <SkeletonList rows={6} />
        ) : reports.isError ? (
          <ErrorState message={(reports.error as Error).message} onRetry={() => reports.refetch()} />
        ) : !reports.data || typeof reports.data !== "object" ? (
          <EmptyState title="لا توجد بيانات بعد" message="ستظهر التقارير فور توفّر بيانات المؤسسة." />
        ) : (
          (() => {
            const payload = reports.data as Record<string, unknown>;
            const headline = payload.headline;
            const trend = Array.isArray(payload.paperTrend) ? (payload.paperTrend as TrendMonth[]) : null;
            const topCourses = Array.isArray(payload.topCourses) ? (payload.topCourses as TopCourse[]) : null;
            const rest = Object.entries(payload).filter(
              ([k]) => k !== "headline" && k !== "paperTrend" && k !== "topCourses",
            );
            return (
              <>
                <View>
                  <SectionBar index={nextIndex()} title="مؤشّرات رئيسية" />
                  <RowList>
                    <LedgerRow last>
                      <HonestLedger value={headline ?? {}} />
                    </LedgerRow>
                  </RowList>
                </View>

                <View>
                  <SectionBar index={nextIndex()} title="حركة البحوث العلمية" />
                  {!trend || trend.length === 0 ? (
                    <EmptyState title="لا توجد بيانات نشر بعد" message="ستظهر حركة البحوث هنا بعد رفع أول بحث." />
                  ) : (
                    <RowList>
                      {trend.map((m, i) => (
                        <LedgerRow key={`${m.month ?? i}`} last={i === trend.length - 1}>
                          <T variant="body" weight="bold">
                            {m.month ?? "—"}
                          </T>
                          <T variant="xs" color="muted">
                            مُقدَّم {latn(m.submitted ?? 0)} · مُقيَّم {latn(m.graded ?? 0)} · منشور{" "}
                            {latn(m.published ?? 0)}
                          </T>
                        </LedgerRow>
                      ))}
                    </RowList>
                  )}
                </View>

                <View>
                  <SectionBar index={nextIndex()} title="أكثر المقرّرات تسجيلاً" />
                  {!topCourses || topCourses.length === 0 ? (
                    <EmptyState
                      title="لا توجد تسجيلات بعد"
                      message="ستظهر المقرّرات الأعلى تسجيلاً هنا فور تسجيل الطلاب في مقرّراتهم."
                    />
                  ) : (
                    <RowList>
                      {topCourses.map((c, i) => (
                        <LedgerRow key={`${c.code ?? i}`} last={i === topCourses.length - 1}>
                          <T variant="body" weight="bold">
                            {c.name ?? "—"}
                          </T>
                          <T variant="xs" color="muted">
                            {c.code ?? "—"} ·{" "}
                            {countAr(c.enrollments ?? 0, [
                              "طالب مسجَّل واحد",
                              "طالبان مسجَّلان",
                              "طلاب مسجَّلون",
                              "طالباً مسجَّلاً",
                            ])}{" "}
                            · {latn(c.lectures ?? 0)} محاضرة
                          </T>
                        </LedgerRow>
                      ))}
                    </RowList>
                  )}
                </View>

                {rest.length > 0 ? (
                  <View>
                    <SectionBar index={nextIndex()} title="بيانات إضافية" />
                    <RowList>
                      <LedgerRow last>
                        <HonestLedger value={Object.fromEntries(rest)} />
                      </LedgerRow>
                    </RowList>
                  </View>
                ) : null}

                <T variant="xs" color="faint">
                  سجلّ البحوث الكامل مع تصفية الحالة متاح من لوحة المسجل العام على الويب.
                </T>
              </>
            );
          })()
        )}
      </View>
    </Screen>
  );
}


export default function AdminReportsTabbed() {
  return (
    <RoleTabFrame role="ADMIN">
      <AdminReports />
    </RoleTabFrame>
  );
}
