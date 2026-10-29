/**
 * labs — المعامل الافتراضية. Web parity: TeacherLabsPage (the catalog
 * index + the academic disclaimer). «معاينة كطالب» is honest about what
 * it does: recording a lab session exactly the way the student labs
 * explorer does (studentApi.recordLab).
 */
import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { catalogApi } from "@/api/catalog";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Card, Sheet } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { arCount } from "@/features/teacher/components";

type LabRow = {
  id: string;
  name: string;
  discipline?: string;
  description?: string | null;
  iconEmoji?: string | null;
  experiments?: { id: string; name: string }[];
};

export default function TeacherLabs() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const labs = useQuery({
    queryKey: ["catalog", "labs", scope],
    queryFn: () => catalogApi.labs(),
  });
  const [preview, setPreview] = useState<LabRow | null>(null);

  const record = useMutation({
    mutationFn: ({ labId, experimentName }: { labId: string; experimentName: string }) =>
      studentApi.recordLab(labId, experimentName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "lab-sessions"] });
      toast.success("سُجّلت جلسة معمل (معاينة كطالب) — تظهر في سجل جلساتك.", "معاينة المعمل");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر تسجيل الجلسة"),
  });

  const rows = (labs.data ?? []) as unknown as LabRow[];

  return (
    <Screen scroll>
      <StackHeader title="المعامل الافتراضية" />
      <PageHeader
        title="المعامل الافتراضية"
        kicker="استعرض المعامل المتاحة على المنصة ووجّه طلابك إليها كمكمّل عملي للمحاضرات."
      />

      {/* التنويه الأكاديمي — web parity, verbatim. */}
      <Card>
        <View style={{ flexDirection: "row", gap: sp[8], alignItems: "flex-start" }}>
          <TriangleAlert size={16} color={p.goldInk} />
          <T variant="sm" color="secondary" style={{ flex: 1 }}>
            <T variant="sm" weight="bold">تنويه أكاديمي: </T>
            المعامل الافتراضية هي بيئات محاكاة معتمدة في الجامعة. استخدمها لتعزيز فهم الطلاب للمحتوى النظري — ليست بديلاً عن المختبر الواقعي.
          </T>
        </View>
      </Card>

      <SectionBar index={1} title="المعامل المتاحة" />
      {labs.isLoading ? (
        <SkeletonList rows={4} />
      ) : labs.isError ? (
        <ErrorState message={(labs.error as Error).message} onRetry={() => labs.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="لم تُضف معامل بعد"
          message="تواصل مع إدارة المنصة لإضافة معامل لكليتك."
        />
      ) : (
        <RowList>
          {rows.map((lab, i) => (
            <LedgerRow
              key={lab.id}
              last={i === rows.length - 1}
              onPress={() => setPreview(lab)}
              accessibilityLabel={`معمل ${lab.name}`}
            >
              <T variant="body" weight="medium" numberOfLines={1}>
                {lab.iconEmoji ? `${lab.iconEmoji} ` : ""}
                {lab.name}
              </T>
              <T variant="xs" color="muted">
                {lab.discipline ?? "معمل"}
                {lab.experiments
                  ? ` · ${arCount(lab.experiments.length, ["تجربة معدّة واحدة", "تجربتان معدّتان", "تجارب معدّة", "تجربة معدّة"])}`
                  : ""}
              </T>
              <Button label="معاينة كطالب" kind="ghost" small onPress={() => setPreview(lab)} />
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* معاينة كطالب — honest: records a session like the student flow. */}
      <Sheet open={preview !== null} onClose={() => setPreview(null)} title={preview?.name ?? ""}>
        {preview ? (
          <View style={{ gap: sp[8] }}>
            <T variant="sm" color="muted">
              «معاينة كطالب» تسجّل جلسة معمل باسمك كما يفعل الطالب في صفحة المعامل — تجربة المعمل نفسها تُدار من واجهة الطالب.
            </T>
            {preview.description ? (
              <T variant="body" color="secondary">
                {preview.description}
              </T>
            ) : null}
            {preview.experiments && preview.experiments.length > 0 ? (
              <RowList>
                {preview.experiments.map((e, i) => (
                  <LedgerRow
                    key={e.id}
                    last={i === preview.experiments!.length - 1}
                    onPress={() => {
                      record.mutate({ labId: preview.id, experimentName: e.name });
                      setPreview(null);
                    }}
                    accessibilityLabel={`تجربة ${e.name}`}
                  >
                    <T variant="body" weight="medium">
                      {e.name}
                    </T>
                    <T variant="xs" color="muted">
                      تسجيل جلسة ({latn(1)})
                    </T>
                  </LedgerRow>
                ))}
              </RowList>
            ) : (
              <T variant="sm" color="muted">
                لا تجارب معدّة في هذا المعمل بعد.
              </T>
            )}
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
