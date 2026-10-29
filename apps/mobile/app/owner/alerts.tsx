
import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { ownerApi } from "@/api/owner";
import { ApiError } from "@/api/client";
import { dateTime, latn } from "@/lib/format";
import { alertCategoryLabel } from "@/features/governance/components";

interface OwnerAlertRow {
  id: string;
  severity?: string;
  category?: string;
  title: string;
  message?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

/**
 * Pushed: /owner/alerts — «التنبيهات التشغيليّة» (web OwnerAlertsPage parity):
 * the operational alert board — severity/category chips, the message, an
 * exact stamp, and «معالجة» behind a confirm (the resolution writes an
 * audit row). This is the owner bell target from every tab's AppTopBar.
 */
export default function OwnerAlerts() {
  const qc = useQueryClient();
  const [resolveTarget, setResolveTarget] = useState<OwnerAlertRow | null>(null);

  const alerts = useQuery({
    queryKey: ["owner", "alerts"],
    queryFn: async () => (await ownerApi.alerts()) as OwnerAlertRow[],
    staleTime: 30_000,
  });

  const resolve = useMutation({
    mutationFn: (id: string) => ownerApi.resolveAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner", "alerts"] });
      toast.success("أُغلق التنبيه وسُجّلت العمليّة في سجلّ النشاط.", "تمّ حلّ التنبيه");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حلّ التنبيه"),
  });

  const rows = Array.isArray(alerts.data) ? alerts.data : [];
  const critical = rows.filter((a) => a.severity === "critical" || a.severity === "error" || a.severity === "CRITICAL").length;
  const warning = rows.filter((a) => a.severity === "warning" || a.severity === "WARNING").length;
  const info = rows.filter((a) => a.severity === "info" || a.severity === "INFO").length;

  return (
    <Screen scroll>
      <StackHeader title="التنبيهات التشغيليّة" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            التنبيهات التشغيليّة
          </T>
          <T variant="body" color="muted">
            إدارة ومراقبة التنبيهات والحوادث التشغيليّة — مباشرة من سجلّ المنصّة.
          </T>
        </View>

        {alerts.isLoading ? (
          <SkeletonList rows={4} />
        ) : alerts.isError ? (
          <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={22} color="#3F8F5C" />}
            title="لا توجد تنبيهات مفتوحة"
            message="كل أنظمة المنصّة تعمل بشكل طبيعيّ — تابع آخر العمليّات من سجلّ النشاط."
          />
        ) : (
          <View style={{ gap: 16 }}>
            <RowList>
              <LedgerRow last>
                <StatLine label="تنبيهات مفتوحة" value={latn(rows.length)} hint="ضمن الحدّ الأقصى للعرض" />
                <StatLine label="حرجة" value={latn(critical)} hint="تستوجب قرارًا" />
                <StatLine label="تحذيرات" value={latn(warning)} hint="تحتاج متابعة" />
                <StatLine label="معلومات" value={latn(info)} hint="للمتابعة فقط" />
              </LedgerRow>
            </RowList>

            <View>
              <SectionBar index={1} title="التنبيهات المفتوحة" />
              <RowList>
                {rows.map((a, i) => (
                  <LedgerRow key={a.id} last={i === rows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <SeverityBadge severity={a.severity} />
                      {a.category ? <Badge label={alertCategoryLabel(a.category)} tone="grey" /> : null}
                      <T variant="xs" color="faint">
                        {dateTime(a.createdAt)}
                      </T>
                    </View>
                    <T variant="body" weight="bold">
                      {a.title ?? "—"}
                    </T>
                    {a.message ? (
                      <T variant="sm" color="muted">
                        {a.message}
                      </T>
                    ) : null}
                    <View style={{ alignSelf: "flex-start" }}>
                      <Button
                        label={resolve.isPending && resolve.variables === a.id ? "جارٍ الحلّ…" : "معالجة"}
                        kind="primary"
                        small
                        disabled={resolve.isPending && resolve.variables === a.id}
                        onPress={() => setResolveTarget(a)}
                      />
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
              {rows.length >= 50 ? (
                <T variant="xs" color="faint">
                  تُعرض أول {latn(50)} تنبيهاً — حدّ الخادم لهذا اللوح؛ الأعداد أعلاه من الصفوف الظاهرة.
                </T>
              ) : null}
            </View>
          </View>
        )}
      </View>

      <ConfirmDialog
        open={resolveTarget !== null}
        title="حلّ التنبيه التشغيليّ"
        confirmLabel="معالجة"
        danger
        message={
          resolveTarget
            ? `سيُغلَق التنبيه «${resolveTarget.title ?? "—"}» نهائيًّا، ويُسجَّل الحل باسمك في سجلّ النشاط. إذا استمر السبب الذي أنشأه فقد يُرفع تنبيه جديد.`
            : ""
        }
        loading={resolve.isPending}
        onConfirm={() => {
          if (resolveTarget) resolve.mutate(resolveTarget.id);
          setResolveTarget(null);
        }}
        onCancel={() => setResolveTarget(null)}
      />
    </Screen>
  );
}

/** Severity chip — the console's one vocabulary (حرج/تحذير/معلومة). */
function SeverityBadge({ severity }: { severity?: string }) {
  const key = severity ?? "";
  const known =
    key === "critical" || key === "CRITICAL" || key === "error" ||
    key === "warning" || key === "WARNING" ||
    key === "info" || key === "INFO";
  const label =
    key === "critical" || key === "CRITICAL" || key === "error"
      ? "حرج"
      : key === "warning" || key === "WARNING"
        ? "تحذير"
        : key === "info" || key === "INFO"
          ? "معلومة"
          : key || "—";
  const tone =
    key === "critical" || key === "CRITICAL" || key === "error"
      ? "rose"
      : key === "warning" || key === "WARNING"
        ? "yellow"
        : key === "info" || key === "INFO"
          ? "sky"
          : "grey";
  return <Badge label={label} tone={tone} mono={!known && !!key} />;
}


