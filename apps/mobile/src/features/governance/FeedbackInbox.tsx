import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { Segmented } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { socialApi } from "@/api/social";
import type { PilotFeedback } from "@/api/types";
import { ApiError } from "@/api/client";
import { fromNow, latn } from "@/lib/format";
import {
  FEEDBACK_NEXT,
  FEEDBACK_STATUS_LABEL,
  PagerFooter,
  UNIT,
  feedbackKindLabel,
  feedbackKindTone,
  pageOf,
} from "@/features/governance/components";

const PAGE_LIMIT = 30;

/**
 * FeedbackInbox — the registrar/owner triage inbox (web
 * FeedbackInboxPage parity): kind chip, note, route, one-way status
 * grammar open → triage → fixed | dismissed.
 */
export function FeedbackInbox({ kicker }: { kicker: string }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const inbox = useQuery({
    queryKey: ["feedback", "inbox", { page, status }],
    queryFn: async () =>
      pageOf<PilotFeedback>(await socialApi.feedback(page, PAGE_LIMIT, status === "all" ? undefined : status)),
    placeholderData: (prev) => prev,
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status: string }) =>
      socialApi.updateFeedback(payload.id, payload.status),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["feedback"] });
      toast.success(`انتقل التقرير إلى «${FEEDBACK_STATUS_LABEL[payload.status] ?? payload.status}».`);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تحديث حالة التقرير"),
  });

  const rows = inbox.data?.rows ?? [];

  return (
    <Screen scroll>
      <StackHeader title="صندوق التغذية الراجعة" kicker={kicker} />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          كل «أبلغ عن مشكلة / اقتراح» وصل من مستخدمي المنصّة — مع سياقه الكامل.
        </T>

        <Segmented
          options={[
            { id: "all", label: "الكل" },
            { id: "open", label: "مفتوحة" },
            { id: "triage", label: "تحت المعالجة" },
            { id: "fixed", label: "أُصلحت" },
            { id: "dismissed", label: "مرفوضة" },
          ]}
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
            title="لا تقارير هنا"
            message="عندما يرسل مستخدم «أبلغ عن مشكلة / اقتراح» يظهر تقريره في هذا الصندوق بسياقه الكامل."
          />
        ) : (
          <View style={{ gap: 12 }}>
            <RowList>
              {rows.map((f, i) => {
                const next = FEEDBACK_NEXT[f.status] ?? [];
                return (
                  <LedgerRow key={f.id} last={i === rows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Badge label={feedbackKindLabel(f.kind)} tone={feedbackKindTone(f.kind)} />
                      <Badge
                        label={FEEDBACK_STATUS_LABEL[f.status] ?? f.status}
                        tone={
                          f.status === "fixed"
                            ? "mint"
                            : f.status === "dismissed"
                              ? "grey"
                              : f.status === "triage"
                                ? "yellow"
                                : "sky"
                        }
                      />
                      <T variant="xs" color="faint">
                        {fromNow(f.createdAt)}
                      </T>
                    </View>
                    <T variant="body" weight="medium" style={{ paddingTop: 4 }}>
                      {f.note}
                    </T>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {f.route ? <MonoLabel>{f.route}</MonoLabel> : null}
                      {f.user ? (
                        <T variant="xs" color="faint">
                          {f.user.firstName} {f.user.lastName}
                        </T>
                      ) : null}
                    </View>
                    {next.length > 0 ? (
                      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", paddingTop: 8 }}>
                        {next.map((s) => (
                          <View key={s} style={{ minWidth: 120 }}>
                            <Button
                              label={`→ ${FEEDBACK_STATUS_LABEL[s] ?? s}`}
                              kind="ghost"
                              small
                              disabled={update.isPending}
                              onPress={() => update.mutate({ id: f.id, status: s })}
                            />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </LedgerRow>
                );
              })}
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
              الحالة تتحرّك باتجاه واحد: مفتوحة → تحت المعالجة → أُصلحت أو مرفوضة · {latn(rows.length)} تقريراً في الصفحة.
            </T>
          </View>
        )}
      </View>
    </Screen>
  );
}
