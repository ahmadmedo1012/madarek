import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { get } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { countAr, type QualityCourseRow } from "@/features/governance/components";

const ROSTER_CAP = 50;

/**
 * (tabs) Quality courses — «جودة المقرّرات» (web QualityCoursesPage parity).
 * NOTE (contract mismatch): /quality/courses' query schema is strict
 * (metric/q only) — page/limit params are rejected with a 400, so the
 * roster is fetched bare (server caps at take:50; the cap is disclosed
 * honestly below when hit).
 */
export default function QualityCourses() {
  const scope = useInstitutionScope();
  const courses = useQuery({
    queryKey: ["quality", "courses", scope],
    queryFn: () => get<QualityCourseRow[]>("/quality/courses"),
  });

  const rows = Array.isArray(courses.data) ? courses.data : [];

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/quality/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              جودة المقرّرات
            </T>
            <T variant="body" color="muted">
              تتبّع جودة كل مقرّر: المحاضرات، الملفات، الواجبات، التسجيلات.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        {courses.isLoading ? (
          <SkeletonList rows={5} />
        ) : courses.isError ? (
          <ErrorState message={(courses.error as Error).message} onRetry={() => courses.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد مقرّرات نشطة بعد"
            message="ستظهر المقرّرات وعروضها الدراسية هنا فور اعتمادها وربطها بالفصل الحاليّ."
          />
        ) : (
          <>
            <RowList>
              {rows.map((o, i) => {
                const counts = o._count ?? {};
                const score = Math.min(
                  100,
                  (counts.lectures ?? 0) * 20 + (counts.materials ?? 0) * 5 + (counts.assignments ?? 0) * 10,
                );
                const attendance = o.metrics?.attendanceRate;
                const completion = o.metrics?.completionRate;
                return (
                  <LedgerRow key={o.id} last={i === rows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="bold" numberOfLines={1}>
                          {o.course?.name ?? "مقرّر"}
                        </T>
                      </View>
                      {o.course?.code ? <MonoLabel>{o.course.code}</MonoLabel> : null}
                    </View>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {o.teacher ? `د. ${o.teacher.firstName ?? ""} ${o.teacher.lastName ?? ""}` : "—"}
                      {o.term ? ` · ${o.term}` : ""}
                    </T>
                    <T variant="xs" color="faint">
                      {latn(counts.enrollments ?? 0)} طالب ·{" "}
                      {countAr(counts.lectures ?? 0, ["محاضرة واحدة", "محاضرتان", "محاضرات", "محاضرة"])} ·{" "}
                      {countAr(counts.materials ?? 0, ["ملف واحد", "ملفان", "ملفات", "ملفاً"])} ·{" "}
                      {latn(counts.assignments ?? 0)} واجب
                    </T>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
                      <Badge
                        label={score === 0 ? "لا محتوى بعد" : `اكتمال المحتوى ${latn(score)}%`}
                        tone={score >= 80 ? "mint" : score >= 50 ? "yellow" : "rose"}
                      />
                      {attendance != null ? (
                        <Badge label={`الحضور ${latn(Math.round(attendance))}%`} tone="sky" />
                      ) : null}
                      {completion != null ? (
                        <Badge label={`الإكمال ${latn(Math.round(completion))}%`} tone="sky" />
                      ) : null}
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
            {rows.length >= ROSTER_CAP ? (
              <T variant="xs" color="faint">
                تُعرض أول {latn(ROSTER_CAP)} عرضًا دراسيًا — حدّ الخادم لهذا السجلّ.
              </T>
            ) : null}
            <T variant="xs" color="faint">
              «اكتمال المحتوى» تقدير: كل محاضرة 20 نقطة، كل ملف 5، كل واجب 10 — بحدّ أقصى 100.
            </T>
          </>
        )}
      </View>
    </Screen>
  );
}
