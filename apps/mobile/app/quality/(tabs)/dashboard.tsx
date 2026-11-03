import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Eye from "lucide-react-native/icons/eye";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Skeleton, SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { num } from "@/lib/format";
import {
  HonestLedger,
  MetricHero,
  MetricTile,
  PAPER_STATUS_LABEL,
  PAPER_STATUS_TONE,
  countAr,
  numOf,
} from "@/features/governance/components";

const ROLE_KEY_LABEL: Record<string, string> = {
  STUDENT: "الطلاب النشطون",
  TEACHER: "هيئة التدريس",
  ADMIN: "المسجلون العامّون",
  QUALITY: "فريق الجودة",
};
const ATTENDANCE_KEY_LABEL: Record<string, string> = {
  PRESENT: "سجلّات حضور",
  LATE: "سجلّات تأخر",
  ABSENT: "سجلّات غياب",
  EXCUSED: "سجلّات استئذان",
};

/** (tabs) Quality dashboard — «لوحة الجودة» (web QualityDashboardPage parity, honest rendering).
 *  Hierarchy: ONE hero (active students) + attendance ring + supporting tiles. */
export default function QualityDashboard() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const overview = useQuery({
    queryKey: ["quality", "overview", scope],
    queryFn: () => qualityApi.overview(),
  });

  const data = overview.data as Record<string, unknown> | undefined;
  const users = (data?.users ?? {}) as Record<string, unknown>;
  const attendance = (data?.attendance ?? {}) as Record<string, unknown>;
  const papers = (data?.papers ?? {}) as Record<string, unknown>;
  const knownKeys = ["users", "attendance", "papers", "courses", "offerings", "lectures"];
  const rest = data
    ? Object.fromEntries(Object.entries(data).filter(([k]) => !knownKeys.includes(k)))
    : {};

  // attendance ring: presence share of all recorded roll-call entries
  const att = {
    present: numOf(attendance.PRESENT) ?? 0,
    late: numOf(attendance.LATE) ?? 0,
    absent: numOf(attendance.ABSENT) ?? 0,
    excused: numOf(attendance.EXCUSED) ?? 0,
  };
  const attTotal = att.present + att.late + att.absent + att.excused;
  const presentRate = attTotal > 0 ? (att.present + att.late) / attTotal : null;
  const hasAnyData =
    Object.keys(users).length + Object.keys(attendance).length + Object.keys(papers).length > 0;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/quality/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              لوحة الجودة
            </T>
            <T variant="body" color="muted">
              بناء نظام تعليمي فعّال عبر تطوير الأداء الأكاديمي والإداري والتقني — وفقاً لمتطلبات
              الاعتماد المحلية والدولية.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        {overview.isLoading ? (
          <View style={{ gap: 8 }}>
            <Skeleton h={132} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Skeleton h={72} />
              <Skeleton h={72} />
            </View>
            <SkeletonList rows={2} rowHeight={48} />
          </View>
        ) : overview.isError ? (
          <ErrorState
            message={humanizeError(overview.error)}
            onRetry={() => overview.refetch()}
          />
        ) : !data ? null : !hasAnyData ? (
          <EmptyState
            title="لا توجد مؤشرات بعد"
            message="ستظهر مؤشرات الجودة هنا فور توفّر بيانات أكاديمية في المؤسّسة."
            actionLabel="تحديث"
            onAction={() => overview.refetch()}
          />
        ) : (
          <>
            <View style={{ gap: 8 }}>
              <MetricHero
                label="الطلاب النشطون"
                value={numOf(users.STUDENT)}
                hint="وفق آخر قراءة من قطاع الجودة"
                progress={presentRate}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MetricTile label="هيئة التدريس" value={numOf(users.TEACHER)} />
                <MetricTile label="المقرّرات" value={numOf(data.courses)} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <MetricTile label="الشُّعب" value={numOf(data.offerings)} />
                <MetricTile
                  label="المحاضرات"
                  value={
                    numOf(data.lectures) !== null
                      ? numOf(data.lectures)
                      : null
                  }
                />
              </View>
            </View>

            <View>
              <SectionBar index={2} title="سجلّات الحضور" />
              <RowList>
                <LedgerRow last>
                  {Object.entries(attendance).map(([key, value]) => (
                    <StatLine
                      key={key}
                      label={ATTENDANCE_KEY_LABEL[key] ?? "سجلّات أخرى"}
                      value={num(numOf(value))}
                      hint={key in ATTENDANCE_KEY_LABEL ? undefined : "فئة حضور غير مصنَّفة"}
                    />
                  ))}
                  {Object.keys(attendance).length === 0 ? (
                    <T variant="body" color="muted">
                      لا سجلّات حضور بعد.
                    </T>
                  ) : null}
                  {presentRate !== null ? (
                    <StatLine
                      label="نسبة الحضور الفعلية"
                      value={`${num(Math.round(presentRate * 100))}%`}
                      hint={countAr(attTotal, ["سجل واحد", "سجلان", "سجلات", "سجلاً"])}
                      tone="accent"
                    />
                  ) : null}
                </LedgerRow>
              </RowList>
            </View>

            <View>
              <SectionBar index={3} title="البحوث" />
              <RowList>
                <LedgerRow last>
                  {Object.entries(papers).map(([key, value]) => (
                    <View key={key} style={{ paddingVertical: sp[6] }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Badge
                          label={PAPER_STATUS_LABEL[key] ?? "حالة أخرى"}
                          tone={PAPER_STATUS_TONE[key] ?? "grey"}
                        />
                        <T variant="bodyLg" weight="bold">
                          {num(numOf(value))}
                        </T>
                      </View>
                    </View>
                  ))}
                  {Object.keys(papers).length === 0 ? (
                    <T variant="body" color="muted">
                      لا بحوث بعد.
                    </T>
                  ) : null}
                </LedgerRow>
              </RowList>
            </View>

            {Object.keys(rest).length > 0 ? (
              <View>
                <SectionBar index={4} title="بيانات إضافية" />
                <RowList>
                  <LedgerRow last>
                    <HonestLedger value={rest} />
                  </LedgerRow>
                </RowList>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Eye size={12} color={p.textFaint} />
              <T variant="xs" color="faint">
                قطاع ضمان الجودة — وصول قراءة فقط · قراءة لحظية للمؤشرات.
              </T>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
