import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { dateTime, fromNow, latn, num } from "@/lib/format";
import {
  countAr,
  ExpandChevron,
  useExpanded,
  SYNC_CATEGORY_LABEL,
  SYNC_STATUS_LABEL,
} from "@/features/governance/components";

interface SyncRunRow {
  id?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  status?: string | null;
  source?: string | null;
  factsAdded?: number | null;
  factsUpdated?: number | null;
  durationMs?: number | null;
  errorMsg?: string | null;
  notes?: string | null;
}
interface SyncStatusPayload {
  latestRun?: SyncRunRow | null;
  runHistory?: SyncRunRow[];
  factCount?: number | null;
  staleCount?: number | null;
  categories?: {
    category?: string;
    count?: number;
    items?: { key?: string; value?: string; source?: string; isStale?: boolean; syncedAt?: string }[];
  }[];
}

/** Pushed: /admin/sync — «المزامنة مع البيانات الرسمية» (web AdminSyncPage parity). */
export default function AdminSync() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["admin", "sync", scope],
    queryFn: async () => (await adminApi.syncStatus()) as SyncStatusPayload,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const trigger = useMutation({
    mutationFn: () => adminApi.syncTrigger(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sync"] });
      toast.success("شُغّلت المزامنة — ستظهر النتيجة في السجلّ عند اكتمالها.", "المزامنة");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تشغيل المزامنة"),
  });

  const { expanded, toggle } = useExpanded();
  const latest = status.data?.latestRun ?? null;
  const history = status.data?.runHistory ?? [];

  return (
    <Screen scroll>
      <StackHeader title="المزامنة مع البيانات الرسمية" kicker="لوحة المسجل العام" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          استيراد بيانات المؤسّسة من المصدر المنسَّق للحفاظ على معلومات الجامعة محدّثة. يمكنك تشغيل المزامنة يدوياً عند الحاجة.
        </T>
        <T variant="sm" color="muted">
          وضع محدود — قيد التوسعة.
        </T>

        <Button
          label={trigger.isPending ? "جارٍ التشغيل…" : "تشغيل المزامنة"}
          kind="primary"
          icon={<RefreshCw size={14} color="#FFFFFF" />}
          disabled={trigger.isPending}
          onPress={() => trigger.mutate()}
        />

        {status.isLoading ? (
          <SkeletonList rows={5} />
        ) : status.isError ? (
          <ErrorState message={(status.error as Error).message} onRetry={() => status.refetch()} />
        ) : !status.data ? (
          <EmptyState
            title="لم تُنفَّذ أي مزامنة بعد"
            message="شغّل المزامنة الأولى لاستيراد بيانات الجامعة العامة من مصدرها المنسَّق."
          />
        ) : (
          <>
            <View>
              <RowList>
                <LedgerRow last>
                  <StatLine label="حقول مُزامنة" value={num(status.data.factCount ?? null)} />
                  <StatLine
                    label="حقول قديمة"
                    value={
                      status.data.staleCount
                        ? countAr(status.data.staleCount, [
                            "حقل واحد",
                            "حقلان",
                            "حقول",
                            "حقلاً",
                          ])
                        : "كل البيانات حديثة"
                    }
                  />
                  <StatLine
                    label="حالة آخر تشغيل"
                    value={
                      latest
                        ? SYNC_STATUS_LABEL[latest.status ?? ""] ?? latest.status ?? "—"
                        : "—"
                    }
                    hint={latest?.completedAt ? fromNow(latest.completedAt) : undefined}
                  />
                </LedgerRow>
              </RowList>
            </View>

            {latest?.errorMsg ? (
              <T variant="sm" color="danger">
                {latest.status === "FAILED" ? "تعذّر إكمال التشغيل الأخير: " : "التشغيل الأخير اكتمل جزئياً: "}
                {latest.errorMsg}
              </T>
            ) : null}
            {latest?.notes ? (
              <T variant="xs" color="faint">
                ملاحظات آخر تشغيل: {latest.notes}
              </T>
            ) : null}

            <View>
              <T variant="h4" weight="bold">
                سجلّ المزامنات
              </T>
              {history.length === 0 ? (
                <EmptyState title="لا يوجد سجلّ مزامنات بعد" message="ستظهر العمليات هنا فور تشغيل المزامنة الأولى." />
              ) : (
                <RowList>
                  {history.map((r, i) => (
                    <LedgerRow key={r.id ?? i} last={i === history.length - 1}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Badge
                          label={SYNC_STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                          tone={
                            r.status === "SUCCESS"
                              ? "mint"
                              : r.status === "FAILED"
                                ? "rose"
                                : "yellow"
                          }
                          mono={!(r.status && r.status in SYNC_STATUS_LABEL)}
                        />
                        <T variant="xs" color="muted">
                          {dateTime(r.startedAt)}
                        </T>
                      </View>
                      <T variant="xs" color="faint">
                        {latn(r.factsAdded ?? 0)} جديد · {latn(r.factsUpdated ?? 0)} محدّث
                        {r.durationMs != null && r.durationMs > 0
                          ? ` · ${latn(Math.round(r.durationMs / 1000))} ث`
                          : ""}
                      </T>
                    </LedgerRow>
                  ))}
                </RowList>
              )}
            </View>

            <View>
              <T variant="h4" weight="bold">
                البيانات المُزامنة
              </T>
              <T variant="xs" color="muted">
                مجمّعة حسب الفئة — انقر للتوسيع.
              </T>
              {(status.data.categories ?? []).length === 0 ? (
                <EmptyState
                  title="لا توجد بيانات مُزامنة بعد"
                  message="شغّل المزامنة لاستيراد حقول الجامعة وتصنيفها هنا."
                />
              ) : (
                <View style={{ gap: 8, paddingTop: 8 }}>
                  {(status.data.categories ?? []).map((cat, idx) => {
                    const key = cat.category ?? String(idx);
                    const open = expanded.has(key);
                    const stale = (cat.items ?? []).filter((it) => it.isStale).length;
                    return (
                      <RowList key={key}>
                        <LedgerRow
                          onPress={() => toggle(key)}
                          accessibilityLabel={`فئة ${SYNC_CATEGORY_LABEL[key] ?? key}`}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <T variant="body" weight="bold">
                                {SYNC_CATEGORY_LABEL[key] ?? key}
                              </T>
                              <T variant="xs" color="muted">
                                {latn(cat.count ?? cat.items?.length ?? 0)} حقل
                                {stale > 0 ? ` · ${latn(stale)} قديم` : ""}
                              </T>
                            </View>
                            <ExpandChevron open={open} />
                          </View>
                        </LedgerRow>
                        {open
                          ? (cat.items ?? []).map((it, k, arr) => (
                              <LedgerRow key={`${key}-${it.key ?? k}`} last={k === arr.length - 1}>
                                <T variant="body" weight="medium">
                                  {it.value ?? "—"}
                                </T>
                                <T variant="xs" color="muted">
                                  {it.key ?? "—"} · {it.source ?? "—"}
                                  {it.syncedAt ? ` · آخر تحديث ${fromNow(it.syncedAt)}` : ""}
                                </T>
                                {it.isStale ? <Badge label="قديم" tone="yellow" /> : null}
                              </LedgerRow>
                            ))
                          : null}
                      </RowList>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
