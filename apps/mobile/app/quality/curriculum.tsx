import { RoleTabFrame } from "@/components/shell/TabFrame";

import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import {
  countAr,
  ExpandChevron,
  useExpanded,
  type CurriculumFaculty,
} from "@/features/governance/components";

type Level = "strong" | "weak" | "poor";
const LEVEL_LABEL: Record<Level, string> = { strong: "مكتمل", weak: "جزئي", poor: "متأخر" };
const LEVEL_TONE: Record<Level, "mint" | "yellow" | "rose"> = {
  strong: "mint",
  weak: "yellow",
  poor: "rose",
};

function courseCompletion(co: {
  offerings?: { _count?: { lectures?: number; materials?: number } | null }[];
  _count?: { concepts?: number } | null;
}): { pct: number; level: Level; lectures: number; materials: number } {
  const lectures = (co.offerings ?? []).reduce((s, o) => s + (o._count?.lectures ?? 0), 0);
  const materials = (co.offerings ?? []).reduce((s, o) => s + (o._count?.materials ?? 0), 0);
  const pct = Math.min(100, lectures * 18 + materials * 5 + (co._count?.concepts ?? 0) * 4);
  const level: Level = pct >= 70 ? "strong" : pct >= 40 ? "weak" : "poor";
  return { pct, level, lectures, materials };
}

/** (tabs) Curriculum review — «مراجعة المناهج» (web QualityCurriculumPage parity). */
function QualityCurriculum() {
  const scope = useInstitutionScope();
  const tree = useQuery({
    queryKey: ["quality", "curriculum", scope],
    queryFn: async () => (await qualityApi.curriculum()) as CurriculumFaculty[],
  });
  const { expanded, toggle } = useExpanded();
  const facs = Array.isArray(tree.data) ? tree.data : [];

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/quality/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              مراجعة المناهج
            </T>
            <T variant="body" color="muted">
              شجرة الكلّيّات والأقسام والمقرّرات، مع مؤشرات اكتمال المحتوى.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Badge label="مكتمل — 70% فأكثر" tone="mint" />
          <Badge label="جزئي — 40 إلى 69%" tone="yellow" />
          <Badge label="متأخر — أقلّ من 40%" tone="rose" />
        </View>

        {tree.isLoading ? (
          <SkeletonList rows={6} />
        ) : tree.isError ? (
          <ErrorState message={(tree.error as Error).message} onRetry={() => tree.refetch()} />
        ) : facs.length === 0 ? (
          <EmptyState
            title="لا مناهج بعد"
            message="ستظهر شجرة المناهج هنا فور إنشاء الكلّيّات والمقرّرات."
          />
        ) : (
          facs.map((f) => {
            const facKey = `f:${f.id}`;
            const facOpen = expanded.has(facKey);
            const departments = f.departments ?? [];
            const coursesCount = departments.reduce((s, d) => s + (d.courses?.length ?? 0), 0);
            return (
              <Card key={f.id}>
                <LedgerRow onPress={() => toggle(facKey)} accessibilityLabel={`كلّيّة ${f.name}`}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <T variant="bodyLg" weight="bold">
                        {f.iconEmoji ? `${f.iconEmoji} ` : ""}
                        {f.name}
                      </T>
                      <T variant="xs" color="muted">
                        {countAr(departments.length, ["قسم واحد", "قسمان", "أقسام", "قسماً"])} ·{" "}
                        {countAr(coursesCount, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])}
                      </T>
                    </View>
                    <ExpandChevron open={facOpen} />
                  </View>
                </LedgerRow>

                {facOpen
                  ? departments.map((d) => {
                      const deptKey = `d:${d.id}`;
                      const deptOpen = expanded.has(deptKey);
                      const courses = d.courses ?? [];
                      const completions = courses.map((co) => courseCompletion(co));
                      const deptAvg =
                        completions.length > 0
                          ? Math.round(completions.reduce((s, c) => s + c.pct, 0) / completions.length)
                          : null;
                      return (
                        <View key={d.id} style={{ paddingTop: 8 }}>
                          <LedgerRow onPress={() => toggle(deptKey)} accessibilityLabel={`قسم ${d.name}`}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{ flex: 1 }}>
                                <T variant="body" weight="bold">
                                  {d.name}
                                </T>
                                <T variant="xs" color="muted">
                                  {countAr(courses.length, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])}
                                  {deptAvg !== null ? ` · متوسط الاكتمال ${latn(deptAvg)}%` : ""}
                                </T>
                              </View>
                              <ExpandChevron open={deptOpen} />
                            </View>
                          </LedgerRow>
                          {deptOpen ? (
                            <RowList>
                              {courses.length === 0 ? (
                                <LedgerRow last>
                                  <T variant="sm" color="muted">
                                    لا مقرّرات
                                  </T>
                                </LedgerRow>
                              ) : (
                                courses.map((co, i, arr) => {
                                  const c = courseCompletion(co);
                                  return (
                                    <LedgerRow key={co.id} last={i === arr.length - 1}>
                                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                        <View style={{ flex: 1 }}>
                                          <T variant="body" weight="medium" numberOfLines={1}>
                                            {co.name}
                                          </T>
                                        </View>
                                        {co.code ? <MonoLabel>{co.code}</MonoLabel> : null}
                                        <Badge label={LEVEL_LABEL[c.level]} tone={LEVEL_TONE[c.level]} />
                                      </View>
                                      <T variant="xs" color="muted">
                                        {countAr(c.lectures, ["محاضرة واحدة", "محاضرتان", "محاضرات", "محاضرة"])} ·{" "}
                                        {countAr(c.materials, ["ملف واحد", "ملفان", "ملفات", "ملفاً"])} ·{" "}
                                        {countAr(co._count?.concepts ?? 0, ["مفهوم واحد", "مفهومان", "مفاهيم", "مفهوماً"])}
                                      </T>
                                      <T variant="bodyLg" weight="bold">
                                        {latn(c.pct)}%
                                      </T>
                                    </LedgerRow>
                                  );
                                })
                              )}
                            </RowList>
                          ) : null}
                        </View>
                      );
                    })
                  : null}
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}


export default function QualityCurriculumTabbed() {
  return (
    <RoleTabFrame role="QUALITY">
      <QualityCurriculum />
    </RoleTabFrame>
  );
}
