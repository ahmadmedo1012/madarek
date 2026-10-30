
import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Screen } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Segmented } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn } from "@/lib/format";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";
import {
  SeverityChip,
  alertCategoryLabel,
  numOf,
  type QualityAlertsPayload,
} from "@/features/governance/components";

/**
 * Pushed: /quality/alerts — the quality bell target: BOTH boards in one
 * screen (Segmented «عملياتي/البريد»): the operational alert board
 * (qualityApi.alerts) and the personal inbox (NotificationsScreen).
 */
export default function QualityAlerts() {
  const [tab, setTab] = useState<"board" | "inbox">("board");

  if (tab === "inbox") {
    return <NotificationsScreen title="بريدي" kicker="بريدك" />;
  }
  return <AlertsBoard onInbox={() => setTab("inbox")} />;
}

function AlertsBoard({ onInbox }: { onInbox: () => void }) {
  const scope = useInstitutionScope();
  const alerts = useQuery({
    queryKey: ["quality", "alerts", scope],
    queryFn: async () => (await qualityApi.alerts()) as QualityAlertsPayload | QualityAlertsPayload["alerts"],
    staleTime: 60_000,
  });

  const payload: QualityAlertsPayload = Array.isArray(alerts.data)
    ? { alerts: alerts.data, counts: null }
    : ((alerts.data as QualityAlertsPayload) ?? {});
  const rows = payload.alerts ?? [];
  const critical = numOf(payload.counts?.critical) ?? rows.filter((a) => a.severity === "critical").length;
  const warning = numOf(payload.counts?.warning) ?? rows.filter((a) => a.severity === "warning").length;
  const info = numOf(payload.counts?.info) ?? rows.filter((a) => a.severity === "info").length;

  return (
    <Screen scroll>
      <StackHeader title="تنبيهات الجودة" kicker="قطاع ضمان الجودة" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          أحداث تستوجب تدخّل فريق ضمان الجودة — مُستخرجة فوريًا من بيانات المنصّة.
        </T>

        <Segmented
          options={[
            { id: "board", label: "عملياتي" },
            { id: "inbox", label: "البريد" },
          ]}
          selectedId="board"
          onSelect={(id) => id === "inbox" && onInbox()}
        />

        {alerts.isLoading ? (
          <SkeletonList rows={4} />
        ) : alerts.isError ? (
          <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد تنبيهات حالياً"
            message="كلّ المؤشّرات ضمن النطاق الطبيعيّ."
          />
        ) : (
          <>
            <RowList>
              <LedgerRow last>
                <StatLine label="تنبيهات حرجة" value={latn(critical)} hint="تستوجب قرارًا" />
                <StatLine label="تحذيرات" value={latn(warning)} hint="تحتاج متابعة" />
                <StatLine label="معلومات" value={latn(info)} hint="للمتابعة فقط" />
              </LedgerRow>
            </RowList>

            <RowList>
              {rows.map((a, i) => (
                <LedgerRow key={a.id} last={i === rows.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <SeverityChip severity={a.severity} />
                    <Badge label={alertCategoryLabel(a.category)} tone="grey" />
                    <T variant="xs" color="faint">
                      {fromNow(a.occurredAt)}
                    </T>
                  </View>
                  <T variant="body" weight="bold">
                    {a.title ?? "—"}
                  </T>
                  {a.description ? (
                    <T variant="sm" color="muted">
                      {a.description}
                    </T>
                  ) : null}
                </LedgerRow>
              ))}
            </RowList>
            {rows.length >= 20 ? (
              <T variant="xs" color="faint">
                تُعرض أول {latn(20)} تنبيهًا — حدّ الخادم لهذا اللوح.
              </T>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}


