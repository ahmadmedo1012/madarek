import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, KpiCard, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { latn, timeOf } from "@/lib/format";
import { numOf } from "@/features/governance/components";

const POLL_MS = 15_000;

/** Known /owner/realtime keys → Arabic labels (web OwnerRealtimePage parity). */
const REALTIME_LABELS: Record<string, string> = {
  activeSessions: "الجلسات النشطة",
  aiRequestsPerMin: "طلبات الذكاء الاصطناعيّ / دقيقة",
  liveBroadcasts: "بثّ مباشر جارٍ",
  activeExams: "اختبارات جارية",
};

/** Honest fallback label: humanize the raw key, never a fabricated name. */
function realtimeKeyLabel(key: string): string {
  const known = REALTIME_LABELS[key];
  if (known) return known;
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced || key;
}

/**
 * (tabs) Realtime board — «المراقبة الحيّة» (web OwnerRealtimePage parity):
 * polled every 15s; every entry of the payload renders honestly (numbers
 * via latn), the band discloses the cadence and the last fresh reading.
 */
export default function OwnerRealtime() {
  const rt = useQuery({
    queryKey: ["owner", "realtime"],
    queryFn: () => ownerApi.realtime(),
    refetchInterval: POLL_MS,
  });

  // 6A10-9 parity: a failed REFRESH keeps the last reading — the full
  // clear is reserved for the initial load failure (no data ever landed).
  const refreshFailed = rt.isError && !!rt.data;
  const entries = rt.data ? Object.entries(rt.data as Record<string, unknown>) : [];
  const numeric = entries.filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const other = entries.filter(([k, v]) => !(typeof v === "number" && Number.isFinite(v)) && v !== null && v !== undefined);

  const updatedAt = new Date(rt.dataUpdatedAt || Date.now());

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/owner/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            المراقبة الحيّة
          </T>
          <T variant="body" color="muted">
            مراقبة العمليّات الحيّة للمنصّة في الوقت الفعليّ
          </T>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Badge label="يُحدَّث كل 15 ثانية" tone="grey" />
          {rt.data ? (
            <T variant="sm" color="faint">
              آخر تحديث: {timeOf(updatedAt)}
            </T>
          ) : null}
        </View>

        {rt.isLoading ? (
          <SkeletonList rows={4} />
        ) : !rt.data ? (
          <ErrorState message={(rt.error as Error)?.message} onRetry={() => rt.refetch()} />
        ) : (
          <View style={{ gap: 16 }}>
            {refreshFailed ? (
              <T variant="sm" color="danger">
                تعذّر تحديث القراءات — آخر قراءة محفوظة.
              </T>
            ) : null}

            {numeric.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {numeric.map(([key, v]) => (
                  <KpiCard
                    key={key}
                    label={realtimeKeyLabel(key)}
                    value={latn(v as number)}
                    style={{ minWidth: "47%" }}
                  />
                ))}
              </View>
            ) : null}

            {other.length > 0 ? (
              <View>
                <SectionBar index={2} title="قراءات إضافية" />
                <RowList>
                  {other.map(([key, v], i) => (
                    <LedgerRow key={key} last={i === other.length - 1}>
                      <StatLine
                        label={realtimeKeyLabel(key)}
                        value={
                          typeof v === "boolean"
                            ? v
                              ? "نعم"
                              : "لا"
                            : typeof v === "string"
                              ? v || "—"
                              : numOf(v as number) !== null
                                ? latn(numOf(v as number) as number)
                                : "—"
                        }
                      />
                    </LedgerRow>
                  ))}
                </RowList>
              </View>
            ) : null}

            <T variant="xs" color="faint">
              القراءات من نقطة النهاية ‎/owner/realtime‎ — قيم رقميّة بصيغة لاتينية كما تصل من الخادم.
            </T>
          </View>
        )}
      </View>
    </Screen>
  );
}
