import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { Segmented } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { socialApi } from "@/api/social";
import type { PilotFeedback } from "@/api/types";
import { ApiError } from "@/api/client";
import { fromNow } from "@/lib/format";
import {
  FEEDBACK_STATUS_LABEL,
  PagerFooter,
  UNIT,
  feedbackKindLabel,
  feedbackKindTone,
  pageOf,
} from "@/features/governance/components";

const PAGE_LIMIT = 30;

/** Status pills — the inbox's server-side filter (FeedbackInboxPage parity). */
const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "open", label: FEEDBACK_STATUS_LABEL.open ?? "مفتوحة" },
  { id: "triage", label: FEEDBACK_STATUS_LABEL.triage ?? "تحت المعالجة" },
  { id: "fixed", label: FEEDBACK_STATUS_LABEL.fixed ?? "أُصلحت" },
  { id: "dismissed", label: FEEDBACK_STATUS_LABEL.dismissed ?? "مرفوضة" },
];

/** The four working states — the sheet's Segmented grammar. */
const STATUS_OPTIONS: { id: string; label: string }[] = [
  { id: "open", label: FEEDBACK_STATUS_LABEL.open ?? "مفتوحة" },
  { id: "triage", label: FEEDBACK_STATUS_LABEL.triage ?? "تحت المعالجة" },
  { id: "fixed", label: FEEDBACK_STATUS_LABEL.fixed ?? "أُصلحت" },
  { id: "dismissed", label: FEEDBACK_STATUS_LABEL.dismissed ?? "مرفوضة" },
];

function statusBadgeTone(status: string): "mint" | "grey" | "yellow" | "sky" {
  if (status === "fixed") return "mint";
  if (status === "dismissed") return "grey";
  if (status === "triage") return "yellow";
  return "sky";
}

/**
 * Pushed: /owner/feedback — «صندوق التغذية الراجعة» (web FeedbackInboxPage
 * parity): every «أبلغ عن مشكلة / اقتراح» with its context, a status
 * filter, and a per-report sheet whose Segmented moves the row through the
 * one-way status grammar → socialApi.updateFeedback.
 */
export default function OwnerFeedback() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PilotFeedback | null>(null);

  const inbox = useQuery({
    queryKey: ["feedback", "inbox", { page, status }],
    queryFn: async () =>
      pageOf<PilotFeedback>(
        await socialApi.feedback(page, PAGE_LIMIT, status === "all" ? undefined : status),
      ),
    placeholderData: (prev) => prev,
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      socialApi.updateFeedback(payload.id, payload.status),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success(`انتقل التقرير إلى «${FEEDBACK_STATUS_LABEL[payload.status] ?? payload.status}».`);
      setSelected(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تحديث حالة التقرير"),
  });

  const rows = inbox.data?.rows ?? [];

  return (
    <Screen scroll>
      <StackHeader title="صندوق التغذية الراجعة" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            صندوق التغذية الراجعة
          </T>
          <T variant="body" color="muted">
            كل «أبلغ عن مشكلة / اقتراح» وصل من مستخدمي المنصّة — مع سياقه الكامل.
          </T>
        </View>

        <Segmented
          options={STATUS_FILTERS}
          selectedId={status}
          onSelect={(s) => {
            setStatus(s);
            setPage(1);
          }}
        />

        {inbox.isLoading ? (
          <SkeletonList rows={4} />
        ) : inbox.isError ? (
          <ErrorState message={(inbox.error as Error).message} onRetry={() => inbox.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={status === "all" ? "لا تقارير هنا" : "لا تقارير في هذه الحالة"}
            message="عندما يرسل مستخدم «أبلغ عن مشكلة / اقتراح» يظهر تقريره في هذا الصندوق بسياقه الكامل."
          />
        ) : (
          <View style={{ gap: 12 }}>
            <RowList>
              {rows.map((f, i) => (
                <LedgerRow
                  key={f.id}
                  onPress={() => setSelected(f)}
                  accessibilityLabel={`حالة تقرير ${f.user ? `${f.user.firstName} ${f.user.lastName}` : "مجهول"}`}
                  last={i === rows.length - 1}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Badge label={feedbackKindLabel(f.kind)} tone={feedbackKindTone(f.kind)} />
                    <Badge
                      label={FEEDBACK_STATUS_LABEL[f.status] ?? f.status}
                      tone={statusBadgeTone(f.status)}
                      mono={!(f.status in FEEDBACK_STATUS_LABEL)}
                    />
                    <T variant="xs" color="faint">
                      {fromNow(f.createdAt)}
                    </T>
                  </View>
                  <T variant="body" weight="medium">
                    {f.note}
                  </T>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {f.route ? <MonoLabel>{f.route}</MonoLabel> : null}
                    {f.user ? (
                      <T variant="xs" color="faint">
                        {f.user.firstName} {f.user.lastName}
                      </T>
                    ) : null}
                  </View>
                </LedgerRow>
              ))}
            </RowList>
            <PagerFooter
              page={page}
              rowsLength={rows.length}
              limit={PAGE_LIMIT}
              meta={inbox.data?.meta ?? null}
              unit={UNIT.report}
              onPage={setPage}
              loading={inbox.isFetching}
            />
            <T variant="xs" color="faint">
              الحالة تتحرّك باتجاه واحد: مفتوحة → تحت المعالجة → أُصلحت أو مرفوضة · المسار يُسجَّل كما
              وصل من مُبلِّغه.
            </T>
          </View>
        )}
      </View>

      {selected ? (
        <Sheet open onClose={() => setSelected(null)} title="حالة التقرير">
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge label={feedbackKindLabel(selected.kind)} tone={feedbackKindTone(selected.kind)} />
              <Badge
                label={FEEDBACK_STATUS_LABEL[selected.status] ?? selected.status}
                tone={statusBadgeTone(selected.status)}
                mono={!(selected.status in FEEDBACK_STATUS_LABEL)}
              />
            </View>
            <T variant="body" color="secondary">
              {selected.note}
            </T>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {selected.route ? <MonoLabel>{selected.route}</MonoLabel> : null}
              <T variant="xs" color="faint">
                {fromNow(selected.createdAt)}
              </T>
            </View>

            <T variant="sm" color="muted">
              اختر الحالة الجديدة للتقرير:
            </T>
            <Segmented
              options={STATUS_OPTIONS}
              selectedId={selected.status in FEEDBACK_STATUS_LABEL ? selected.status : ""}
              onSelect={(next) => {
                if (next !== selected.status) update.mutate({ id: selected.id, status: next });
              }}
            />
            {update.isPending ? <T variant="sm" color="muted">جارٍ تحديث الحالة…</T> : null}
          </View>
        </Sheet>
      ) : null}
    </Screen>
  );
}
