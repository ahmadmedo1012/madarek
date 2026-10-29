/**
 * /student/results — النتائج (web ResultsPage parity): per-course weighted
 * grade rollup — the big gradePct, the canonical kind labels
 * (واجب / اختبار قصير 1 / اختبار قصير 2 / نصفي / مشروع / نهائي), each
 * breakdown row as score/maxScore, and the teacher's feedback. The
 * headline (highest / average / lowest) rides the payload when present.
 */
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { KpiCard, LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn, num, pct } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { PushFrame, gradeKindLabel, normalizeResults } from "@/features/student/components";

export default function ResultsScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const tones = useStatusTones();
  const gradeInk = (gradePct: number | null): string => {
    if (gradePct === null) return p.textMuted;
    if (gradePct >= 65) return tones.mint.ink;
    if (gradePct >= 50) return p.goldInk;
    return tones.rose.ink;
  };
  const feed = useQuery({
    queryKey: ["me", "results", scope],
    queryFn: async () => normalizeResults(await studentApi.results()),
  });

  const { headline, courses } = feed.data ?? { headline: null, courses: [] };
  const hasGrades = courses.some((c) => c.gradePct !== null);

  return (
    <PushFrame
      title="النتائج"
      kicker="تفاصيل درجاتك وتحليل أدائك بناءً على بياناتك الفعليّة"
      refreshing={feed.isFetching && !feed.isLoading}
      onRefresh={() => feed.refetch()}
    >
      {feed.isLoading ? (
        <SkeletonList rows={6} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : !hasGrades ? (
        <EmptyState
          title="لم تُسجَّل أي درجات بعد"
          message="يبدأ الحساب فور رصد أوّل تقييم في أي مقرّر."
        />
      ) : (
        <>
          {headline ? (
            <View style={{ gap: sp[8] }}>
              <View style={{ flexDirection: "row", gap: sp[8] }}>
                <KpiCard
                  label="أعلى درجة"
                  value={headline.highest ? pct(headline.highest.gradePct) : "—"}
                  tone="accent"
                />
                <KpiCard
                  label="المتوسط"
                  value={headline.avgGradePct !== null ? pct(headline.avgGradePct) : "—"}
                />
              </View>
              <View style={{ flexDirection: "row", gap: sp[8] }}>
                <KpiCard
                  label="أدنى درجة"
                  value={headline.lowest ? pct(headline.lowest.gradePct) : "—"}
                />
                <KpiCard
                  label="مقرّرات مُقيَّمة"
                  value={headline.courseCount}
                />
              </View>
              {headline.avgGradePct !== null ? (
                <T variant="xs" color="muted">
                  {`المتوسط عبر ${countAr(headline.courseCount, ["مقرّر واحد", "مقرّرين", "مقرّرات", "مقرّراً"])}`}
                </T>
              ) : null}
            </View>
          ) : null}

          <SectionBar index={1} title="تفصيل النتائج حسب المقرّر" />
          <View style={{ gap: sp[12] }}>
            {courses.map((c) => (
              <Card key={c.offeringId} style={{ gap: sp[8] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodyLg" weight="bold" numberOfLines={1}>
                      {c.courseName}
                    </T>
                    <T variant="xs" color="muted">
                      {`الفصل ${c.term}`}
                    </T>
                  </View>
                  <Badge label={c.courseCode} tone="grey" mono />
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
                  <T variant="h2" weight="bold" style={{ color: gradeInk(c.gradePct) }}>
                    {c.gradePct === null ? "—" : pct(c.gradePct)}
                  </T>
                  <View style={{ flex: 1, gap: 4 }}>
                    <ProgressBar
                      ratio={(c.gradePct ?? 0) / 100}
                      accent
                      label={`درجة مقرّر ${c.courseName}`}
                    />
                  </View>
                </View>

                {c.breakdown.length > 0 ? (
                  <RowList>
                    {c.breakdown.map((b, i) => (
                      <LedgerRow key={`${c.offeringId}-${i}`} last={i === c.breakdown.length - 1}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                          <T variant="body" weight="medium" style={{ flex: 1 }}>
                            {gradeKindLabel(b.kind)}
                          </T>
                          <T variant="body" weight="bold">
                            {b.score !== null && b.maxScore !== null
                              ? `${latn(b.score)} / ${latn(b.maxScore)}`
                              : "—"}
                          </T>
                        </View>
                        {b.weight != null ? (
                          <T variant="xs" color="muted">
                            {`الوزن ${latn(Math.round(b.weight))}%`}
                          </T>
                        ) : null}
                        {b.feedback ? (
                          <T variant="sm" color="secondary">
                            {`ملاحظة الأستاذ: ${b.feedback}`}
                          </T>
                        ) : null}
                      </LedgerRow>
                    ))}
                  </RowList>
                ) : null}
              </Card>
            ))}
          </View>
          <T variant="xs" color="faint">
            {`مجموع الدرجات المرصودة: ${num(courses.filter((c) => c.gradePct !== null).length)}`}
          </T>
        </>
      )}
    </PushFrame>
  );
}
