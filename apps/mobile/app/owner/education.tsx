import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { RowList, LedgerRow, StatLine, ProgressBar } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { clamp01, latn } from "@/lib/format";
import { numOf, type EducationRow } from "@/features/governance/components";

/** Workload buckets → Arabic labels (web OwnerEducationPage parity). */
const BUCKETS: { key: keyof NonNullable<EducationRow["workloadBuckets"]>; label: string }[] = [
  { key: "idle", label: "بدون عرض هذا الفصل" },
  { key: "one", label: "عرض واحد" },
  { key: "two", label: "عرضان" },
  { key: "three", label: "3 عروض" },
  { key: "fourPlus", label: "4 عروض فأكثر" },
];

/**
 * Pushed: /owner/education — «النظرة التعليميّة» (web OwnerEducationPage
 * parity): live education statistics as honest StatLines — totals, courses
 * per faculty, the most-enrolled courses, the teaching-load distribution
 * and the attendance trend. No fabricated numbers: every figure comes
 * from /owner/education or renders «—».
 */
export default function OwnerEducation() {
  const edu = useQuery({
    queryKey: ["owner", "education"],
    queryFn: () => ownerApi.education(),
  });

  const e = edu.data as EducationRow | undefined;
  const buckets = e?.workloadBuckets ?? null;
  const totalTeachers = buckets
    ? ["idle", "one", "two", "three", "fourPlus"].reduce(
        (s, k) => s + (numOf((buckets as Record<string, unknown>)[k]) ?? 0),
        0,
      )
    : 0;

  return (
    <Screen scroll>
      <StackHeader title="النظرة التعليميّة" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            النظرة التعليميّة
          </T>
          <T variant="body" color="muted">
            إحصائيات حيّة عن المقرّرات وأعضاء هيئة التدريس والطلاب
          </T>
        </View>

        {edu.isLoading ? (
          <SkeletonList rows={5} rowHeight={48} />
        ) : edu.isError ? (
          <ErrorState message={(edu.error as Error).message} onRetry={() => edu.refetch()} />
        ) : (
          <View style={{ gap: 16 }}>
            {/* [01] الإجماليات */}
            <View>
              <SectionBar index={1} title="الإجماليات" />
              <RowList>
                <LedgerRow last>
                  <StatLine label="إجمالي المقرّرات" value={numOf(e?.totals?.totalCourses)} />
                  <StatLine label="عدد الأساتذة" value={numOf(e?.totals?.teachers)} />
                  <StatLine label="العروض النشطة" value={numOf(e?.totals?.totalOfferings)} />
                  <StatLine label="متوسط التسجيل في العرض" value={numOf(e?.totals?.avgEnrolment)} />
                </LedgerRow>
              </RowList>
            </View>

            {/* [02] المقرّرات حسب الكلّيّة */}
            <View>
              <SectionBar index={2} title="المقرّرات حسب الكلّيّة" />
              {(e?.byFaculty ?? []).length === 0 ? (
                <T variant="body" color="muted">
                  لا مقرّرات بعد — ستظهر هنا حين تُسجَّل مقرّرات على نظام الكلّيّات.
                </T>
              ) : (
                <RowList>
                  {(e?.byFaculty ?? []).map((f, i, arr) => (
                    <LedgerRow key={f.name ?? i} last={i === arr.length - 1}>
                      <StatLine label={f.name ?? "—"} value={numOf(f.courseCount)} />
                    </LedgerRow>
                  ))}
                </RowList>
              )}
            </View>

            {/* [03] أكثر المقرّرات تسجيلاً */}
            <View>
              <SectionBar index={3} title="أكثر المقرّرات تسجيلاً" />
              {(e?.topCourses ?? []).length === 0 ? (
                <T variant="body" color="muted">
                  لا تسجيلات بعد — ستظهر المقرّرات الأكثر تسجيلاً فور تسجيل الطلاب في العروض.
                </T>
              ) : (
                <RowList>
                  {(e?.topCourses ?? []).map((c, i, arr) => (
                    <LedgerRow key={`${c.code ?? ""}·${c.facultyName ?? ""}·${i}`} last={i === arr.length - 1}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {c.code ? <MonoLabel>{c.code}</MonoLabel> : null}
                        <T variant="body" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                          {c.name ?? "—"}
                        </T>
                      </View>
                      {c.facultyName ? (
                        <T variant="xs" color="muted" numberOfLines={1}>
                          {c.facultyName}
                        </T>
                      ) : null}
                      {c.enrolled != null ? (
                        <T variant="xs" color="faint">
                          المسجَّلون: {latn(c.enrolled)}
                        </T>
                      ) : null}
                    </LedgerRow>
                  ))}
                </RowList>
              )}
            </View>

            {/* [04] توزيع حِمل أعضاء هيئة التدريس */}
            <View>
              <SectionBar index={4} title="توزيع حِمل أعضاء هيئة التدريس" />
              {totalTeachers === 0 ? (
                <T variant="body" color="muted">
                  لا يوجد أساتذة بعد — يُحسب التوزيع فور إسناد أوّل عرض لمقرّر.
                </T>
              ) : (
                <RowList>
                  {BUCKETS.map((b, i) => {
                    const n = numOf((buckets as Record<string, unknown>)[b.key]) ?? 0;
                    const share = totalTeachers > 0 ? Math.round((n / totalTeachers) * 100) : 0;
                    return (
                      <LedgerRow key={b.key} last={i === BUCKETS.length - 1}>
                        <StatLine label={b.label} value={latn(n)} hint={`نسبة ${latn(share)}% من الأساتذة`} />
                        <ProgressBar ratio={clamp01(n / Math.max(1, totalTeachers))} />
                      </LedgerRow>
                    );
                  })}
                </RowList>
              )}
            </View>

            {/* [05] اتّجاه الحضور */}
            <View>
              <SectionBar index={5} title="اتّجاه الحضور" />
              {(e?.attendanceTrend ?? []).length === 0 ? (
                <T variant="body" color="muted">
                  لا توجد سجلّات حضور بعد — يبدأ الحساب فور تسجيل أوّل جلسة حضور على المنصّة.
                </T>
              ) : (
                <RowList>
                  {(e?.attendanceTrend ?? []).map((t, i, arr) => (
                    <LedgerRow key={t.month ?? i} last={i === arr.length - 1}>
                      <StatLine
                        label={t.month ?? "—"}
                        value={t.attendancePct != null ? `${latn(Math.round(t.attendancePct))}%` : null}
                      />
                    </LedgerRow>
                  ))}
                </RowList>
              )}
              <T variant="xs" color="faint">
                يُحسب من سجلات الحضور الفعليّة على المنصّة.
              </T>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}
