/**
 * /student/matrix — مصفوفة الإتقان (web MatrixPage parity, recomposed
 * for small screens): the per-course concept heatmap becomes concept
 * ROWS (name + 5-level mastery language + progress), weak/poor rows
 * carry the direct «سدّ الفجوة» remediation link from /me/gaps, and the
 * priority-gaps ledger leads the page. Level legend stated in text —
 * the words ARE the encoding (never hue alone).
 */
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { studentApi } from "@/api/student";
import type { MasteryConcept } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { Segmented } from "@/components/ui/fields";
import { LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn, pct } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { GapList, CourseWell, PushFrame, masteryMeta } from "@/features/student/components";

const LEVEL_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "mint", label: "إتقان" },
  { id: "sky", label: "جيد" },
  { id: "yellow", label: "يحتاج مراجعة" },
  { id: "rose", label: "ضعف" },
  { id: "grey", label: "لم يُختبر" },
];

export default function MatrixScreen() {
  const scope = useInstitutionScope();
  const tones = useStatusTones();
  const [filter, setFilter] = useState("all");

  const matrix = useQuery({
    queryKey: ["me", "matrix", scope],
    queryFn: () => studentApi.matrix(),
  });
  const gaps = useQuery({
    queryKey: ["me", "gaps", scope],
    queryFn: () => studentApi.gaps(),
  });

  /* concept → recommended lecture (the same /me/gaps payload the rows read). */
  const remediationByConcept = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of gaps.data ?? []) {
      if (g.recommendedLectureId) map.set(g.conceptId, g.recommendedLectureId);
    }
    return map;
  }, [gaps.data]);

  const courses = matrix.data ?? [];
  const mappedCourses = courses.filter((c) => c.concepts.length > 0);
  const totalConcepts = courses.reduce((sum, c) => sum + c.concepts.length, 0);

  const visibleConcepts = (list: MasteryConcept[]) =>
    filter === "all" ? list : list.filter((k) => masteryMeta(k.level, k.attempts).tone === filter);

  return (
    <PushFrame
      title="مصفوفة الإتقان"
      kicker="تتبّع المعرفة"
      refreshing={(matrix.isFetching && !matrix.isLoading) || gaps.isFetching}
      onRefresh={() => {
        void matrix.refetch();
        void gaps.refetch();
      }}
    >
      <T variant="sm" color="muted">
        {`خريطة معرفيّة شخصيّة لكل مفهوم درسته — تُرسم من نقاط التفاعل في المحاضرات والاختبارات.`}
      </T>

      {/* Legend — words + dots, ranges stated in text */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], rowGap: 4 }}>
        {(["mint", "sky", "yellow", "rose", "grey"] as const).map((tone) => {
          const label =
            tone === "mint"
              ? "إتقان (80%+)"
              : tone === "sky"
                ? "جيد (60–80%)"
                : tone === "yellow"
                  ? "يحتاج مراجعة (40–60%)"
                  : tone === "rose"
                    ? "ضعف (<40%)"
                    : "لم يُختبر";
          return (
            <View key={tone} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: tones[tone].ink }} />
              <T variant="xs" color="muted">
                {label}
              </T>
            </View>
          );
        })}
      </View>

      {/* فجوات ذات أولوية */}
      <View style={{ gap: sp[8] }}>
        <SectionBar
          index={1}
          title="فجواتك ذات الأولوية"
          action={
            <T variant="xs" color="muted">
              {`${latn(gaps.data?.length ?? 0)}`}
            </T>
          }
        />
        <T variant="sm" color="muted">
          ابدأ بسدّ هذه الفجوات — حيث تتوفّر توصية، يأخذك الصفّ مباشرة إلى المحاضرة المناسبة.
        </T>
        {gaps.isLoading ? (
          <SkeletonList rows={2} rowHeight={56} />
        ) : gaps.isError ? (
          <ErrorState message={(gaps.error as Error).message} onRetry={() => gaps.refetch()} compact />
        ) : (gaps.data ?? []).length === 0 ? (
          <T variant="sm" color="muted">
            لا فجوات حالياً — أحسنت! استمر بحضور المحاضرات والإجابة على نقاط التفاعل.
          </T>
        ) : (
          <GapList gaps={gaps.data ?? []} max={5} />
        )}
      </View>

      {/* مصفوفتك حسب المقرّر */}
      {matrix.isLoading ? (
        <SkeletonList rows={5} rowHeight={72} />
      ) : matrix.isError ? (
        <ErrorState message={(matrix.error as Error).message} onRetry={() => matrix.refetch()} />
      ) : courses.length === 0 ? (
        <EmptyState
          title="لم تتشكّل مصفوفتك بعد"
          message="شاهد أول محاضرة وأجب عن نقاط التفاعل فيها، وستبدأ المصفوفة برسم خريطة معرفتك تلقائياً."
        />
      ) : (
        <>
          <View style={{ gap: sp[8] }}>
            <SectionBar index={2} title="مصفوفتك حسب المقرّر" />
            {totalConcepts > 0 ? (
              <T variant="xs" color="muted">
                {countAr(totalConcepts, ["مفهوم واحد مُقاس", "مفهومان مُقاسان", "مفاهيم مُقاسة", "مفهوماً مُقاساً"])}
              </T>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minHeight: 44 }}>
              <Segmented options={LEVEL_FILTERS} selectedId={filter} onSelect={setFilter} style={{ minWidth: 600 }} />
            </ScrollView>
          </View>

          {mappedCourses.length === 0 ? (
            <T variant="sm" color="muted">
              لم تُحدَّد مفاهيم مقرّراتك بعد — ستظهر المفاهيم هنا فور إضافتها من الأستاذ.
            </T>
          ) : (
            <View style={{ gap: sp[16] }}>
              {mappedCourses.map((c) => {
                const visible = visibleConcepts(c.concepts);
                const mastered = c.concepts.filter((x) => x.level >= 0.8).length;
                const avgPct =
                  c.concepts.length > 0
                    ? Math.round((c.concepts.reduce((s, x) => s + x.level, 0) / c.concepts.length) * 100)
                    : 0;
                return (
                  <View key={c.courseId} style={{ gap: sp[8] }}>
                    <Card style={{ gap: sp[8] }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                        <CourseWell emoji="📘" color={c.themeColor} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <T variant="bodyLg" weight="bold" numberOfLines={1}>
                            {c.courseName}
                          </T>
                          <T variant="xs" color="muted">
                            {`${c.courseCode} · ${countAr(c.concepts.length, [
                              "مفهوم واحد",
                              "مفهومان",
                              "مفاهيم",
                              "مفهوماً",
                            ])}${mastered > 0 ? ` · أتقنت ${latn(mastered)}` : " · لم تتقن منها بعد"}`}
                          </T>
                        </View>
                      </View>
                      <ProgressBar
                        ratio={avgPct / 100}
                        label={`متوسط إتقان مقرر ${c.courseName}: ${pct(avgPct)}`}
                      />
                      <T variant="xs" color="muted">
                        {`متوسط الإتقان ${pct(avgPct)}`}
                      </T>
                    </Card>

                    {visible.length > 0 ? (
                      <RowList>
                        {visible.map((k, i) => {
                          const meta = masteryMeta(k.level, k.attempts);
                          const isGap = k.attempts > 0 && k.level < 0.6;
                          const lectureId = isGap ? remediationByConcept.get(k.id) : undefined;
                          return (
                            <LedgerRow
                              key={k.id}
                              last={i === visible.length - 1}
                              accessibilityLabel={
                                lectureId
                                  ? `سدّ الفجوة: ${k.name}`
                                  : `${k.name} — ${meta.label}${k.attempts > 0 ? ` (${pct(k.level * 100)})` : ""}`
                              }
                              onPress={
                                lectureId
                                  ? () => router.push(`/student/lectures/${lectureId}` as never)
                                  : undefined
                              }
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                                <T variant="body" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                                  {k.name}
                                </T>
                                <Badge label={meta.label} tone={meta.tone} />
                              </View>
                              <View style={{ gap: 4 }}>
                                <ProgressBar
                                  ratio={k.attempts > 0 ? k.level : 0}
                                  accent={isGap}
                                  label={`إتقان ${k.name}: ${k.attempts > 0 ? pct(k.level * 100) : "—"}`}
                                />
                                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                                  <T variant="xs" color="muted">
                                    {k.attempts > 0 ? pct(k.level * 100) : "—"}
                                  </T>
                                  <T variant="xs" color="faint">
                                    {`محاولات: ${latn(k.attempts)}`}
                                  </T>
                                  {lectureId ? (
                                    <View style={{ flex: 1 }} />
                                  ) : null}
                                  {lectureId ? <Badge label="سدّ الفجوة" tone="copper" /> : null}
                                </View>
                              </View>
                            </LedgerRow>
                          );
                        })}
                      </RowList>
                    ) : (
                      <T variant="sm" color="muted">
                        لا مفاهيم في هذا التصنيف لهذا المقرّر.
                      </T>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </PushFrame>
  );
}
