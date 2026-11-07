import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Briefcase from "lucide-react-native/icons/briefcase";
import MapPin from "lucide-react-native/icons/map-pin";
import { catalogApi } from "@/api/catalog";
import type { JobPost } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { JOB_TYPE_LABEL, SectionNote, countAr } from "@/features/student/more";

/** One job row — module scope so FlashList rows stay cheap to re-render. */
function JobRow({
  job,
  applied,
  busy,
  onApply,
}: {
  job: JobPost;
  applied: boolean;
  busy: boolean;
  onApply: (jobId: string) => void;
}) {
  const p = usePalette();
  return (
    <LedgerRow accessibilityLabel={`وظيفة: ${job.title}`}>
      <T variant="bodyLg" weight="bold">
        {job.title}
      </T>
      <T variant="sm" color="secondary">
        {job.company}
      </T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
        <Badge label={JOB_TYPE_LABEL[job.type] ?? "فرصة أخرى"} tone="sky" />
        {job.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}>
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
            label={busy ? "جارٍ التقديم…" : "تقدّم"}
            kind="primary"
            small
            loading={busy}
            onPress={() => onApply(job.id)}
            accessibilityLabel={`التقديم على ${job.title}`}
          />
        </View>
      )}
    </LedgerRow>
  );
}

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
    onError: (e) => toast.error(humanizeError(e), "تعذّر إرسال طلب التقديم"),
  });

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="وظائف" kicker="فرص العمل" />
      <DataList
        data={rows}
        renderItem={({ item }) => (
          <JobRow
            job={item}
            applied={!!item.myApplication || !!justApplied[item.id]}
            busy={apply.isPending && apply.variables === item.id}
            onApply={(jobId) => apply.mutate(jobId)}
          />
        )}
        keyExtractor={(job) => job.id}
        extraData={{ justApplied, pendingId: apply.isPending ? apply.variables ?? null : null }}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        emptySlot={
          <EmptyState
            icon={<Briefcase size={24} color={p.textFaint} />}
            title="لا توجد فرص نشطة هذا الأسبوع"
            message="نضيف فرص التوظيف والتدريب بشكل دوري — ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], paddingBottom: sp[8] }}>
            <SectionNote>وظائف وفرص تدريب تجريبية مفتوحة لطلاب وخرّيجي الجامعة (بيانات عرض).</SectionNote>
          </View>
        }
        contentPadding={{ horizontal: 16, bottom: 24 }}
        style={{ flex: 1 }}
      />

      {/* Pinned honest count — always visible under the board. */}
      {rows.length > 0 ? (
        <View
          style={{
            paddingHorizontal: sp[16],
            paddingVertical: sp[10],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: p.rule,
          }}
        >
          <T variant="xs" color="faint">
            {`${countAr(rows.length, ["فرصة واحدة مفتوحة", "فرصتان مفتوحتان", "فرص مفتوحة", "فرصة مفتوحة"])} · ${latn(rows.filter((j) => j.myApplication).length)} قدّمت عليها`}
          </T>
        </View>
      ) : null}
    </Screen>
  );
}
