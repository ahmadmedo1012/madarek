/**
 * /student/(tabs)/courses — مقرّراتي (web CoursesPage parity, mobile
 * recomposed): every enrolled offering as a pressable ledger row —
 * course identity well (emoji + themeColor), teacher, progress bar and
 * the weekly schedule summary. Enrollment stays admin-mediated: the
 * empty state says so honestly.
 */
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react-native";
import { learningApi } from "@/api/learning";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dayName, latn, pct } from "@/lib/format";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { countAr } from "@/features/student/more";
import { CourseWell, ScrollBody, courseProgressHint } from "@/features/student/components";

export default function StudentCourses() {
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["enrollments", "me", scope],
    queryFn: () => learningApi.enrollments(),
  });

  const rows = feed.data ?? [];

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody refreshing={feed.isFetching && !feed.isLoading} onRefresh={() => feed.refetch()}>
        <SectionBar index={1} title="مقرّراتي الدراسية" />

        {feed.isLoading ? (
          <SkeletonList rows={5} rowHeight={96} />
        ) : feed.isError ? (
          <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} color="#62625F" />}
            title="لم تُسجَّل في مقررات بعد"
            message="الإضافة تتم عبر إدارة شؤون الطلاب — ستظهر مقرّراتك هنا فور اعتماد تسجيلك."
            actionLabel="دليل المقرّرات"
            onAction={() => router.push("/student/catalog" as never)}
          />
        ) : (
          <View style={{ gap: sp[12] }}>
            <T variant="sm" color="muted">
              {countAr(rows.length, ["مقرّر مسجَّل واحد", "مقرّران مسجَّلان", "مقرّرات مسجَّلة", "مقرّراً مسجَّلاً"])}
              {" · "}
              {countAr(
                rows.filter((e) => e.progressPct > 0 && e.progressPct < 100).length,
                ["قيد التقدّم واحد", "قيد التقدّم اثنان", "قيد التقدّم", "قيد التقدّم"],
              )}
            </T>
            <RowList>
              {rows.map((e, i) => {
                const c = e.offering.course;
                const teacher = e.offering.teacher;
                const slots = e.offering.schedule ?? [];
                const scheduleSummary = slots
                  .slice(0, 2)
                  .map((s) => `${dayName(s.dayOfWeek)} ${s.startTime}`)
                  .join(" · ");
                return (
                  <LedgerRow
                    key={e.id}
                    last={i === rows.length - 1}
                    accessibilityLabel={`مقرّر ${c.name}`}
                    onPress={() => router.push(`/student/courses/${e.offering.id}` as never)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <CourseWell emoji={c.iconEmoji} color={c.themeColor} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="bodyLg" weight="bold" numberOfLines={1}>
                          {c.name}
                        </T>
                        <T variant="sm" color="secondary" numberOfLines={1}>
                          {teacher ? `د. ${teacher.firstName} ${teacher.lastName}` : "بلا أستاذ مسجَّل"}
                          {` · ${c.code}`}
                        </T>
                        {slots.length > 0 ? (
                          <T variant="xs" color="muted" numberOfLines={1}>
                            {scheduleSummary}
                            {slots.length > 2 ? " …" : ""}
                          </T>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ gap: 4, marginTop: sp[6] }}>
                      <ProgressBar
                        ratio={Math.max(0, Math.min(100, e.progressPct)) / 100}
                        accent
                        label={`تقدّم مقرّر ${c.name}: ${pct(e.progressPct)}`}
                      />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                        <T variant="xs" color="muted">
                          {pct(e.progressPct)}
                        </T>
                        <T variant="xs" color="accentInk" weight="bold">
                          {courseProgressHint(e.progressPct)}
                        </T>
                        <View style={{ flex: 1 }} />
                        <T variant="xs" color="faint">
                          {`فصل ${e.offering.term}`}
                        </T>
                      </View>
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
            <T variant="xs" color="faint">
              {`إجمالي المقرّرات: ${latn(rows.length)}`}
            </T>
          </View>
        )}
      </ScrollBody>
    </Screen>
  );
}
