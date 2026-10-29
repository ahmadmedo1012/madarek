/**
 * /student/(tabs)/dashboard — لوحة الطالب (web DashboardPage parity,
 * mobile-recomposed): greeting + institution line, the four KPI slabs,
 * «أكمل ما بدأته» resume card, «الفجوات ذات الأولوية» with direct
 * «سدّ الفجوة» links, and the agenda sections (classes / assignments /
 * live / exams). Fires the idempotent POST /me/onboarding/complete once
 * per app run on the first role-home (web parity, errors ignored).
 */
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react-native";
import { studentApi } from "@/api/student";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { KpiCard, LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dateTime, dueLabel, greeting, latn, pct } from "@/lib/format";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { SectionNote, countAr } from "@/features/student/more";
import { GapList, ScrollBody, classWhenLabel } from "@/features/student/components";

/** Module-scoped: the idempotent onboarding POST fires once per app run. */
let onboardingFired = false;

export default function StudentDashboard() {
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const p = usePalette();

  const dash = useQuery({
    queryKey: ["me", "dashboard", scope],
    queryFn: () => studentApi.dashboard(),
  });
  const resume = useQuery({
    queryKey: ["me", "resume", scope],
    queryFn: () => studentApi.resume(),
  });
  const gaps = useQuery({
    queryKey: ["me", "gaps", scope],
    queryFn: () => studentApi.gaps(),
  });

  const onboarding = useMutation({
    mutationFn: () => studentApi.onboardingComplete(),
  });
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || onboardingFired || !user) return;
    if (user.onboardingCompletedAt) return;
    onboardingFired = true;
    firedRef.current = true;
    onboarding.mutate(undefined, { onError: () => undefined });
  }, [user, onboarding]);

  const d = dash.data;
  const kpi = d?.kpi;
  const agenda = d?.agenda;

  const refreshing =
    (dash.isFetching && !dash.isLoading) || resume.isFetching || gaps.isFetching;
  const onRefresh = () => {
    void dash.refetch();
    void resume.refetch();
    void gaps.refetch();
  };

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody refreshing={refreshing} onRefresh={onRefresh}>
        {/* Greeting + current institution context */}
        <View style={{ gap: 2 }}>
          <T variant="h3" weight="bold">
            {`${greeting()}${user ? `، ${user.firstName}` : ""}`}
          </T>
          <T variant="sm" color="muted">
            {`موقعك الحالي: ${user?.currentInstitution?.name ?? "—"}`}
          </T>
        </View>

        {/* KPI slabs */}
        {dash.isLoading ? (
          <SkeletonList rows={2} rowHeight={72} />
        ) : dash.isError ? (
          <ErrorState message={(dash.error as Error).message} onRetry={() => dash.refetch()} />
        ) : !d || !kpi ? null : (
          <View style={{ gap: sp[12] }}>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <KpiCard label="المقررات" value={kpi.courseCount} />
              <KpiCard label="الحضور" value={kpi.attendancePct === null ? "—" : pct(kpi.attendancePct)} />
            </View>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <KpiCard label="تكليفات معلّقة" value={kpi.pendingAssignmentsCount} />
              <KpiCard label="نقاط الخبرة" value={kpi.totalXp} tone="accent" />
            </View>
            {kpi.rank != null && kpi.cohortSize != null && kpi.cohortSize > 1 ? (
              <T variant="sm" color="muted">
                {`المركز ${latn(kpi.rank)} من ${latn(kpi.cohortSize)} على دفعتك`}
              </T>
            ) : null}
          </View>
        )}

        {/* «أكمل ما بدأته» — the resume card */}
        {resume.isLoading ? null : resume.isError ? null : resume.data ? (
          <Card
            accessibilityLabel={`أكمل ما بدأته: ${resume.data.lecture.title}`}
            onPress={() => router.push(`/student/lectures/${resume.data!.lecture.id}` as never)}
            style={{ gap: sp[8] }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <Play size={16} color={p.accentInk} />
              <T variant="sm" weight="bold" color="accentInk">
                {resume.data.mode === "continue" ? "أكمل من حيث توقفت" : "الخطوة التالية"}
              </T>
            </View>
            <View style={{ gap: 2 }}>
              <T variant="bodyLg" weight="bold">
                {resume.data.lecture.course.name}
              </T>
              <T variant="sm" color="secondary">
                {`المحاضرة ${latn(resume.data.lecture.ordinal)} · ${resume.data.lecture.title}`}
              </T>
            </View>
            <View style={{ gap: 4 }}>
              <ProgressBar
                ratio={(resume.data.progressPct ?? 0) / 100}
                accent
                label={`تقدّم المحاضرة ${pct(resume.data.progressPct)}`}
              />
              <T variant="xs" color="muted">
                {pct(resume.data.progressPct)}
              </T>
            </View>
          </Card>
        ) : null}

        {/* «الفجوات ذات الأولوية» */}
        <View style={{ gap: sp[8] }}>
          <SectionBar
            index={1}
            title="الفجوات ذات الأولوية"
            action={
              <Button
                label="المصفوفة الكاملة"
                kind="ghost"
                small
                onPress={() => router.push("/student/matrix" as never)}
              />
            }
          />
          {gaps.isLoading ? (
            <SkeletonList rows={2} rowHeight={56} />
          ) : gaps.isError ? (
            <ErrorState message={(gaps.error as Error).message} onRetry={() => gaps.refetch()} compact />
          ) : (
            <GapList gaps={gaps.data ?? []} max={3} fallbackToMatrix />
          )}
        </View>

        {/* حصص اليوم/غدًا */}
        <View style={{ gap: sp[8] }}>
          <SectionBar index={2} title="حصص اليوم/غدًا" />
          {dash.isLoading ? null : agenda && agenda.classes.length > 0 ? (
            <RowList>
              {agenda.classes.slice(0, 4).map((c, i, arr) => (
                <LedgerRow
                  key={c.id}
                  last={i === Math.min(arr.length, 4) - 1}
                  accessibilityLabel={`حصة ${c.courseName}`}
                  onPress={() => router.push(`/student/courses/${c.offeringId}` as never)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="body" weight="bold" style={{ flex: 1 }}>
                      {c.courseName}
                    </T>
                    <Badge label={classWhenLabel(c.when)} tone={c.when === "today" ? "copper" : "yellow"} />
                  </View>
                  <T variant="sm" color="muted">
                    {`${c.startTime}–${c.endTime}${c.room ? ` · قاعة ${c.room}` : ""}`}
                  </T>
                </LedgerRow>
              ))}
            </RowList>
          ) : (
            <SectionNote>لا حصص اليوم أو غدًا — استرح أو راجع محاضراتك.</SectionNote>
          )}
        </View>

        {/* تكليفات */}
        <View style={{ gap: sp[8] }}>
          <SectionBar
            index={3}
            title="تكليفات"
            action={
              <Button
                label="الكل"
                kind="ghost"
                small
                onPress={() => router.push("/student/assignments" as never)}
              />
            }
          />
          {dash.isLoading ? null : agenda && agenda.assignments.length > 0 ? (
            <RowList>
              {agenda.assignments.slice(0, 3).map((a, i, arr) => {
                const due = dueLabel(a.dueAt);
                return (
                  <LedgerRow
                    key={a.id}
                    last={i === Math.min(arr.length, 3) - 1}
                    accessibilityLabel={`تكليف: ${a.title}`}
                    onPress={() => router.push("/student/assignments" as never)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                        {a.courseCode ? `${a.title} (${a.courseCode})` : a.title}
                      </T>
                      <Badge label={due.text} tone={due.overdue ? "rose" : "yellow"} />
                    </View>
                    <T variant="sm" color="muted">
                      {`تسليم ${due.text}`}
                    </T>
                  </LedgerRow>
                );
              })}
            </RowList>
          ) : (
            <SectionNote>لا تكليفات بانتظارك حالياً.</SectionNote>
          )}
        </View>

        {/* حصص مباشرة */}
        <View style={{ gap: sp[8] }}>
          <SectionBar index={4} title="حصص مباشرة" />
          {dash.isLoading ? null : agenda && agenda.live.length > 0 ? (
            <RowList>
              {agenda.live.slice(0, 2).map((l, i, arr) => (
                <LedgerRow
                  key={l.id}
                  last={i === Math.min(arr.length, 2) - 1}
                  accessibilityLabel={`بث مباشر: ${l.title}`}
                  onPress={() => router.push("/student/live" as never)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                      {`بثّ مباشر: ${l.title}`}
                    </T>
                    <Badge label="LIVE" tone="copper" mono />
                  </View>
                  <T variant="sm" color="muted">
                    {dateTime(l.scheduledAt)}
                  </T>
                </LedgerRow>
              ))}
            </RowList>
          ) : (
            <SectionNote>لا جلسات مباشرة مجدولة الآن.</SectionNote>
          )}
        </View>

        {/* اختبارات */}
        <View style={{ gap: sp[8] }}>
          <SectionBar index={5} title="اختبارات" />
          {dash.isLoading ? null : agenda && agenda.exams.length > 0 ? (
            <RowList>
              {agenda.exams.slice(0, 4).map((e, i, arr) => {
                const opensFuture = e.openAt ? new Date(e.openAt).getTime() > Date.now() : false;
                const phase = opensFuture
                  ? `يفتح باب الاختبار ${dateTime(e.openAt)}`
                  : e.closeAt
                    ? `آخر موعد للتسليم ${dateTime(e.closeAt)}`
                    : "نافذة الاختبار مفتوحة";
                return (
                  <LedgerRow
                    key={e.id}
                    last={i === Math.min(arr.length, 4) - 1}
                    accessibilityLabel={`اختبار: ${e.title}`}
                    onPress={() => router.push("/student/online-exams" as never)}
                  >
                    <T variant="body" weight="bold">
                      {e.title}
                    </T>
                    <T variant="sm" color="muted">
                      {phase}
                    </T>
                  </LedgerRow>
                );
              })}
            </RowList>
          ) : (
            <SectionNote>لا اختبارات قادمة في نافذتها الآن.</SectionNote>
          )}
        </View>

        {d && kpi && kpi.courseCount === 0 && agenda && agenda.classes.length === 0 ? (
          <EmptyState
            title="لوحتك تنتظر أول مقرر"
            message="لم تُسجَّل في مقررات بعد — بمجرد اعتماد تسجيلك من شؤون الطلاب سترى جدولك وواجباتك هنا."
          />
        ) : null}

        {d && agenda && agenda.classes.length > 0 ? (
          <T variant="xs" color="faint">
            {countAr(agenda.classes.length, ["حصة واحدة في الأجندة", "حصتان في الأجندة", "حصص في الأجندة", "حصة في الأجندة"])}
          </T>
        ) : null}
      </ScrollBody>
    </Screen>
  );
}
