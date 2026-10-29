import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { qualityApi } from "@/api/quality";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { num } from "@/lib/format";
import {
  HonestLedger,
  PAPER_STATUS_LABEL,
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

/** (tabs) Quality dashboard — «لوحة الجودة» (web QualityDashboardPage parity, honest rendering). */
export default function QualityDashboard() {
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
          <SkeletonList rows={6} />
        ) : overview.isError ? (
          <ErrorState
            message={(overview.error as Error).message}
            onRetry={() => overview.refetch()}
          />
        ) : !data ? null : (
          <>
            <View>
              <SectionBar index={1} title="مؤشرات أساسية" />
              <RowList>
                <LedgerRow last>
                  {Object.entries(users).map(([key, value]) => (
                    <StatLine
                      key={key}
                      label={ROLE_KEY_LABEL[key] ?? key}
                      value={num(numOf(value))}
                      hint={key in ROLE_KEY_LABEL ? undefined : key}
                    />
                  ))}
                  <StatLine label="المقرّرات" value={num(numOf(data.courses))} />
                  <StatLine label="الشُّعب" value={num(numOf(data.offerings))} />
                  <StatLine
                    label="المحاضرات"
                    value={
                      numOf(data.lectures) !== null
                        ? countAr(numOf(data.lectures) ?? 0, ["محاضرة واحدة", "محاضرتان", "محاضرات", "محاضرة"])
                        : "—"
                    }
                  />
                </LedgerRow>
              </RowList>
            </View>

            <View>
              <SectionBar index={2} title="سجلّات الحضور" />
              <RowList>
                <LedgerRow last>
                  {Object.entries(attendance).map(([key, value]) => (
                    <StatLine
                      key={key}
                      label={ATTENDANCE_KEY_LABEL[key] ?? key}
                      value={num(numOf(value))}
                      hint={key in ATTENDANCE_KEY_LABEL ? undefined : key}
                    />
                  ))}
                  {Object.keys(attendance).length === 0 ? (
                    <T variant="body" color="muted">
                      لا سجلّات حضور بعد.
                    </T>
                  ) : null}
                </LedgerRow>
              </RowList>
            </View>

            <View>
              <SectionBar index={3} title="البحوث" />
              <RowList>
                <LedgerRow last>
                  {Object.entries(papers).map(([key, value]) => (
                    <StatLine
                      key={key}
                      label={PAPER_STATUS_LABEL[key] ?? key}
                      value={num(numOf(value))}
                      hint={key in PAPER_STATUS_LABEL ? undefined : key}
                    />
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
              <Eye size={12} color="#70706A" />
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
