/**
 * /student/results — النتائج (web ResultsPage parity): per-course weighted
 * grade rollup. R334: animated score hero (RingProgress + UI-thread
 * CountUp), share/export of the Arabic summary, humanized errors, and the
 * honest states (skeleton / empty / error) — trends are skipped until the
 * payload carries a time series (it doesn't: one snapshot per offering).
 */
import { useCallback, useState } from "react";
import { Share, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import ShareIcon from "lucide-react-native/icons/share-2";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { BidiText, T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { KpiCard, LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { CountUp, RingProgress } from "@/motion";
import { humanizeError } from "@/lib/errors";
import { latn, num, pct } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { PushFrame, gradeKindLabel, normalizeResults } from "@/features/student/components";

/** «%» with Latin digits — the CountUp face for percentages. */
const pctFace = (n: number): string => `${latn(Math.round(n))}%`;

/** The Arabic share/export summary (text-only, no PII beyond grades). */
export function resultsShareText(data: {
  avgGradePct: number | null;
  courses: { courseName: string; gradePct: number | null }[];
}): string {
  const lines = ["ملخص نتائجي — منصة مدرَك"];
  if (data.avgGradePct !== null) lines.push(`المتوسط العام: ${pct(data.avgGradePct)}`);
  const graded = data.courses.filter((c) => c.gradePct !== null);
  for (const c of graded.slice(0, 5)) lines.push(`• ${c.courseName}: ${pct(c.gradePct)}`);
  if (graded.length > 5) lines.push(`… و${countAr(graded.length - 5, ["مقرّر آخر", "مقرّران آخران", "مقرّرات أخرى", "مقرراً آخر"])}`);
  return lines.join("\n");
}

export default function ResultsScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const tones = useStatusTones();
  const [shareError, setShareError] = useState<string | null>(null);
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

  const onShare = useCallback(async () => {
    if (!headline) return;
    try {
      setShareError(null);
      await Share.share({
        message: resultsShareText({ avgGradePct: headline.avgGradePct, courses }),
      });
    } catch {
      setShareError("تعذّرت المشاركة — حاول مرة أخرى.");
    }
  }, [courses, headline]);

  return (
    <PushFrame
      title="النتائج"
      kicker="تفاصيل درجاتك وتحليل أدائك بناءً على بياناتك الفعليّة"
      refreshing={feed.isFetching && !feed.isLoading}
      onRefresh={() => void feed.refetch()}
    >
      {feed.isLoading ? (
        <SkeletonList rows={6} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={humanizeError(feed.error)} onRetry={() => void feed.refetch()} />
      ) : !hasGrades ? (
        <EmptyState
          title="لم تُسجَّل أي درجات بعد"
          message="يبدأ الحساب فور رصد أوّل تقييم في أي مقرّر."
        />
      ) : (
        <>
          {headline ? (
            <View style={{ gap: sp[8] }}>
              {headline.avgGradePct !== null ? (
                <Card style={{ alignItems: "center", gap: sp[12] }}>
                  <RingProgress
                    progress={Math.min(1, Math.max(0, headline.avgGradePct / 100))}
                    size={120}
                    thickness={8}
                    color={gradeInk(headline.avgGradePct)}
                    accessibilityLabel={`المتوسط العام ${pct(headline.avgGradePct)}`}
                  >
                    <CountUp value={headline.avgGradePct} formatter={pctFace} />
                  </RingProgress>
                  <View style={{ alignItems: "center", gap: sp[2] }}>
                    <T variant="h4" weight="bold">
                      المتوسط العام
                    </T>
                    <T variant="xs" color="muted">
                      {`عبر ${countAr(headline.courseCount, ["مقرّر واحد", "مقرّرين", "مقرّرات", "مقرّراً"])} مُقيَّم`}
                    </T>
                  </View>
                  <Button
                    label="مشاركة الملخص"
                    kind="accent"
                    small
                    icon={<ShareIcon size={16} color={p.accentFg} />}
                    onPress={() => void onShare()}
                  />
                  {shareError ? (
                    <T variant="xs" style={{ color: tones.rose.deep }}>
                      {shareError}
                    </T>
                  ) : null}
                </Card>
              ) : null}
              <View style={{ flexDirection: "row", gap: sp[8] }}>
                <KpiCard
                  label="أعلى درجة"
                  value={headline.highest ? pct(headline.highest.gradePct) : "—"}
                />
                <KpiCard
                  label="أدنى درجة"
                  value={headline.lowest ? pct(headline.lowest.gradePct) : "—"}
                />
              </View>
            </View>
          ) : null}

          <SectionBar index={1} title="تفصيل النتائج حسب المقرّر" />
          <View style={{ gap: sp[12] }}>
            {courses.map((c) => (
              <Card key={c.offeringId} style={{ gap: sp[8] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <View style={{ flex: 1, gap: sp[2] }}>
                    <BidiText variant="bodyLg" weight="bold" numberOfLines={1}>
                      {c.courseName}
                    </BidiText>
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
                  <View style={{ flex: 1, gap: sp[4] }}>
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
                      <LedgerRow
                        key={`${c.offeringId}-${i}`}
                        last={i === c.breakdown.length - 1}
                        accessibilityLabel={`${gradeKindLabel(b.kind)} في ${c.courseName}: ${
                          b.score !== null && b.maxScore !== null
                            ? `${latn(b.score)} من ${latn(b.maxScore)}`
                            : "غير مُقيَّم"
                        }${b.weight != null ? ` — الوزن ${latn(Math.round(b.weight))}%` : ""}`}
                      >
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
