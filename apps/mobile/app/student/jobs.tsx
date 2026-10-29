import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, MapPin } from "lucide-react-native";
import { catalogApi } from "@/api/catalog";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { latn } from "@/lib/format";
import { JOB_TYPE_LABEL, SectionNote, countAr } from "@/features/student/more";

/**
 * /student/jobs — وظائف (web JobsPage parity): the open-opportunities board
 * with the type labels, the honest salary run, and the server-truth
 * application chip (myApplication) plus the optimistic session toggle.
 */
export default function JobsScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const feed = useQuery({
    queryKey: ["jobs", scope],
    queryFn: () => catalogApi.jobs(),
    placeholderData: (prev) => prev,
  });
  const rows = feed.data ?? [];

  const [justApplied, setJustApplied] = useState<Record<string, boolean>>({});
  const apply = useMutation({
    mutationFn: (jobId: string) => catalogApi.applyJob(jobId),
    onSuccess: (_res, jobId) => {
      setJustApplied((prev) => ({ ...prev, [jobId]: true }));
      void qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("وصل طلبك إلى صاحب الفرصة.", "تمّ التقديم");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر إرسال طلب التقديم"),
  });

  return (
    <Screen scroll>
      <StackHeader title="وظائف" kicker="فرص العمل" />
      <SectionNote>وظائف وفرص تدريب تجريبية مفتوحة لطلاب وخرّيجي الجامعة (بيانات عرض).</SectionNote>

      {feed.isLoading ? (
        <SkeletonList rows={5} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={24} color={p.textFaint} />}
          title="لا توجد فرص نشطة هذا الأسبوع"
          message="نضيف فرص التوظيف والتدريب بشكل دوري — ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
        />
      ) : (
        <RowList>
          {rows.map((job, i) => {
            const applied = !!job.myApplication || !!justApplied[job.id];
            return (
              <LedgerRow key={job.id} last={i === rows.length - 1} accessibilityLabel={`وظيفة: ${job.title}`}>
                <T variant="bodyLg" weight="bold">
                  {job.title}
                </T>
                <T variant="sm" color="secondary">
                  {job.company}
                </T>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                  <Badge label={JOB_TYPE_LABEL[job.type] ?? job.type} tone="sky" />
                  {job.location ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <MapPin size={12} color={p.textMuted} />
                      <T variant="xs" color="muted">
                        {job.location}
                      </T>
                    </View>
                  ) : null}
                  <T variant="xs" color="muted">
                    {job.salary ? `الراتب: ${job.salary}` : "حسب الاتفاق"}
                  </T>
                </View>
                {applied ? (
                  <Badge label="تم التقديم" tone="mint" />
                ) : (
                  <View style={{ alignSelf: "flex-start" }}>
                    <Button
                      label={apply.isPending && apply.variables === job.id ? "جارٍ التقديم…" : "تقدّم"}
                      kind="primary"
                      small
                      loading={apply.isPending && apply.variables === job.id}
                      onPress={() => apply.mutate(job.id)}
                      accessibilityLabel={`التقديم على ${job.title}`}
                    />
                  </View>
                )}
              </LedgerRow>
            );
          })}
        </RowList>
      )}
      {rows.length > 0 ? (
        <T variant="xs" color="faint">
          {countAr(rows.length, ["فرصة واحدة مفتوحة", "فرصتان مفتوحتان", "فرص مفتوحة", "فرصة مفتوحة"])}
          {" · "}
          {`${latn(rows.filter((j) => j.myApplication).length)} قدّمت عليها`}
        </T>
      ) : null}
    </Screen>
  );
}
