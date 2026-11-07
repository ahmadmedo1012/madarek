/**
 * /student/(tabs)/dashboard — لوحة الطالب، R334 R2 mobile-recomposed
 * (R341 M7 web-language parity: the hero keeps the screen's single
 * orange moment at hairline weight, the [nn] section bars carry
 * their honest counts as quiet mono meta — the web BarCount seat):
 * ONE hero «الخطوة التالية» card (the screen's single orange moment —
 * next lecture / assignment / exam / class with one clear action), a
 * numeral-hierarchy stats band (CountUp + RingProgress from @/motion),
 * quick actions (PressableScale), a horizontal today-schedule chip
 * strip, the gaps ledger (shared borders — no repeated accent chips),
 * then ONE merged near-agenda ledger. Entrance staggered via
 * useStaggerEntrance; skeletons mirror the real geometry; failures run
 * through humanizeError. Fires the idempotent POST
 * /me/onboarding/complete once per app run (web parity, errors ignored).
 */
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import Library from "lucide-react-native/icons/library";
import { studentApi } from "@/api/student";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { AppStatusBar } from "@/design/statusbar";
import { sp } from "@/design/tokens";
import { Screen, SectionBar } from "@/components/ui/screen";
import { BidiText, T } from "@/components/ui/text";
import { LedgerRow, RowList } from "@/components/ui/data";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CountUp, PressableScale, RingProgress, Skeleton, SkeletonText, useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { dateTime, dueLabel, greeting, latn, pct, useNumerals } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { useNow } from "@/hooks/useNow";
import { SectionNote, countAr } from "@/features/student/more";
import { GapList, ScrollBody, classWhenLabel, nextStep } from "@/features/student/components";

/** Module-scoped: the idempotent onboarding POST fires once per app run. */
let onboardingFired = false;

/** Quick actions — the four doors students open most (PressableScale tiles). */
const QUICK_ACTIONS: { icon: typeof CalendarClock; label: string; href: string; a11y: string }[] = [
  { icon: CalendarClock, label: "الجدول", href: "/student/schedule", a11y: "افتح الجدول الأسبوعي" },
  { icon: ClipboardList, label: "التكاليف", href: "/student/assignments", a11y: "افتح التكاليف" },
  { icon: ClipboardCheck, label: "الاختبارات", href: "/student/online-exams", a11y: "افتح الاختبارات الإلكترونية" },
  { icon: Library, label: "المكتبة", href: "/student/library", a11y: "افتح المكتبة" },
];

export default function StudentDashboard() {
  const now = useNow();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const p = usePalette();
  const { formatNumber: fmt } = useNumerals();

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

  /* The hero's single next step — resume lecture → soonest assignment →
     next exam window → today's first class (pure derivation, unit-pinned). */
  const step = dash.isLoading || resume.isLoading ? null : nextStep(d, resume.data ?? null, now);

  /* Today (then tomorrow) classes — the horizontal chip strip. The
     unsliced count is the honest meta; the strip shows the first 8. */
  const todayTomorrow = (agenda?.classes ?? [])
    .filter((c) => c.when === "today" || c.when === "tomorrow");
  const stripClasses = todayTomorrow.slice(0, 8);
  /* The near-agenda's honest actable total (what the [04] meta prints). */
  const agendaTotal = agenda
    ? agenda.assignments.length + agenda.exams.length + agenda.live.length
    : 0;

  const refreshing =
    (dash.isFetching && !dash.isLoading) || resume.isFetching || gaps.isFetching;
  const onRefresh = () => {
    void dash.refetch();
    void resume.refetch();
    void gaps.refetch();
  };

  /* Entrance stagger — base 40, step 60 → 7th block lands at 400ms (cap). */
  const entering = useStaggerEntrance({ base: 40, step: 60 });

  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody refreshing={refreshing} onRefresh={onRefresh}>
        {/* Greeting + current institution context */}
        <Animated.View entering={entering(0)} style={{ gap: 2 }}>
          <T variant="h3" weight="bold">
            {`${greeting()}${user ? `، ${user.firstName}` : ""}`}
          </T>
          <T variant="sm" color="muted">
            {`موقعك الحالي: ${user?.currentInstitution?.name ?? "—"}`}
          </T>
        </Animated.View>

        {/* «الخطوة التالية» — the ONE orange-accented element */}
        <Animated.View entering={entering(1)}>
          {dash.isLoading || resume.isLoading ? (
            <Card style={{ gap: sp[10] }}>
              <Skeleton width={96} height={14} />
              <SkeletonText lines={2} />
              <Skeleton width="45%" height={36} />
            </Card>
          ) : step ? (
            <Card
              accessibilityLabel={step.a11y}
              onPress={() => router.push(step.href as never)}
              style={{ gap: sp[10], borderWidth: StyleSheet.hairlineWidth, borderColor: p.accent }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <T variant="sm" weight="bold" color="accentInk">
                  الخطوة التالية
                </T>
                <Badge
                  label={
                    step.kind === "lecture"
                      ? "محاضرة"
                      : step.kind === "assignment"
                        ? "تكليف"
                        : step.kind === "exam"
                          ? "اختبار"
                          : "حصة"
                  }
                  tone="grey"
                />
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyLg" weight="bold" numberOfLines={1}>
                    {step.title}
                  </T>
                  {/* BidiText — agenda sublines mix times/rooms/Latin
                      course vocabulary; boundary Latin runs must stay put
                      (review-2 P0-1 · T-50). */}
                  <BidiText variant="sm" color="secondary" numberOfLines={1}>
                    {step.subline}
                  </BidiText>
                </View>
                {step.kind === "lecture" && (step.progressPct ?? 0) > 0 ? (
                  <RingProgress
                    size={44}
                    thickness={4}
                    color={p.primary}
                    progress={(step.progressPct ?? 0) / 100}
                    accessibilityLabel={`تقدّم المحاضرة ${pct(step.progressPct)}`}
                  >
                    <T variant="xs" weight="bold">
                      {fmt(pct(step.progressPct))}
                    </T>
                  </RingProgress>
                ) : null}
              </View>
              <Button
                label={step.actionLabel}
                kind="accent"
                small
                onPress={() => router.push(step.href as never)}
              />
            </Card>
          ) : null}
        </Animated.View>

        {/* Stats band — numeral hierarchy: ring + CountUp trio */}
        <Animated.View entering={entering(2)}>
          <SectionBar index={1} title="أرقامك هذا الفصل" />
          {dash.isLoading ? (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
              <Skeleton width={64} height={64} radius={32} />
              <View style={{ flex: 1, gap: sp[8] }}>
                <SkeletonText lines={3} />
              </View>
            </Card>
          ) : dash.isError ? (
            <ErrorState
              message={humanizeError(dash.error)}
              onRetry={() => dash.refetch()}
              onReport={() => router.push("/report" as never)}
              compact
            />
          ) : !d || !kpi ? null : (
            <Card style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
              <RingProgress
                size={64}
                thickness={5}
                color={p.primary}
                progress={(kpi.attendancePct ?? 0) / 100}
                accessibilityLabel={
                  kpi.attendancePct === null
                    ? "لا بيانات حضور بعد"
                    : `نسبة الحضور ${pct(kpi.attendancePct)}`
                }
              >
                <T variant="sm" weight="bold">
                  {kpi.attendancePct === null ? "—" : fmt(pct(kpi.attendancePct))}
                </T>
              </RingProgress>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  flexWrap: "wrap",
                  rowGap: sp[8],
                  gap: sp[8],
                }}
              >
                {(
                  [
                    { label: "مقررات", value: kpi.courseCount, a11y: `${fmt(kpi.courseCount)} مقررات` },
                    {
                      label: "تكليفات معلّقة",
                      value: kpi.pendingAssignmentsCount,
                      a11y: `${fmt(kpi.pendingAssignmentsCount)} تكليفات معلّقة`,
                    },
                    { label: "نقاط الخبرة", value: kpi.totalXp, a11y: `${fmt(kpi.totalXp)} نقطة خبرة` },
                  ] as const
                ).map((s) => (
                  <View key={s.label} style={{ flexGrow: 1, flexShrink: 1, flexBasis: "30%", gap: 2, alignItems: "center" }}>
                    <CountUp
                      value={s.value}
                      formatter={(n) => fmt(Math.round(n))}
                      accessibilityLabel={s.a11y}
                      style={{ fontSize: 20, fontWeight: "700" }}
                    />
                    <T variant="xs" color="muted" align="center" numberOfLines={1}>
                      {s.label}
                    </T>
                  </View>
                ))}
              </View>
            </Card>
          )}
          {kpi && kpi.rank != null && kpi.cohortSize != null && kpi.cohortSize > 1 ? (
            <T variant="sm" color="muted">
              {`المركز ${fmt(kpi.rank)} من ${fmt(kpi.cohortSize)} على دفعتك`}
            </T>
          ) : null}
        </Animated.View>

        {/* Quick actions — PressableScale tiles */}
        <Animated.View entering={entering(3)} style={{ flexDirection: "row", gap: sp[8] }}>
          {QUICK_ACTIONS.map((a) => (
            <PressableScale
              key={a.href}
              accessibilityRole="button"
              accessibilityLabel={a.a11y}
              onPress={() => {
                haptics.selection();
                router.push(a.href as never);
              }}
              style={{
                flex: 1,
                minHeight: 72,
                alignItems: "center",
                justifyContent: "center",
                gap: sp[6],
                borderWidth: 1,
                borderColor: p.border,
                backgroundColor: p.surface,
                paddingHorizontal: sp[4],
              }}
            >
              <a.icon size={20} color={p.text} />
              <T variant="xs" weight="medium" numberOfLines={1}>
                {a.label}
              </T>
            </PressableScale>
          ))}
        </Animated.View>

        {/* حصص اليوم/غدًا — the horizontal chip strip */}
        {dash.isLoading ? (
          <Animated.View entering={entering(4)} style={{ gap: sp[8] }}>
            <SectionBar index={2} title="حصص اليوم وغدًا" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: sp[8] }}>
              <Skeleton width={180} height={64} />
              <Skeleton width={180} height={64} />
              <Skeleton width={140} height={64} />
            </ScrollView>
          </Animated.View>
        ) : stripClasses.length > 0 ? (
          <Animated.View entering={entering(4)} style={{ gap: sp[8] }}>
            <SectionBar
              index={2}
              title="حصص اليوم وغدًا"
              action={<BarCount n={todayTomorrow.length} a11y={countAr(todayTomorrow.length, ["حصة واحدة", "حصتان", "حصص", "حصة"])} />}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: sp[8] }}
              accessibilityLabel="شريط حصص اليوم وغدًا"
            >
              {stripClasses.map((c) => (
                <PressableScale
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`حصة ${c.courseName} ${classWhenLabel(c.when)} ${c.startTime}`}
                  onPress={() => {
                    haptics.selection();
                    router.push(`/student/courses/${c.offeringId}` as never);
                  }}
                  style={{
                    minWidth: 150,
                    maxWidth: 220,
                    gap: 2,
                    borderWidth: 1,
                    borderColor: p.border,
                    backgroundColor: p.surface,
                    padding: sp[10],
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                    {/* One-accent discipline: the hero owns the screen's orange —
                        «اليوم» stays bold ink, not a second accent moment. */}
                    <T variant="xs" weight={c.when === "today" ? "bold" : undefined} color={c.when === "today" ? "text" : "muted"}>
                      {classWhenLabel(c.when)}
                    </T>
                    <T variant="xs" color="muted">
                      {`${c.startTime}–${c.endTime}`}
                    </T>
                  </View>
                  <T variant="sm" weight="bold" numberOfLines={1}>
                    {c.courseName}
                  </T>
                  {c.room ? (
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {`قاعة ${c.room}`}
                    </T>
                  ) : null}
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* «الفجوات ذات الأولوية» — one shared-border ledger */}
        <Animated.View entering={entering(5)} style={{ gap: sp[8] }}>
          <SectionBar
            index={3}
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
            <Card style={{ gap: sp[10] }}>
              <SkeletonText lines={2} />
              <Skeleton width="60%" height={4} />
              <SkeletonText lines={2} />
              <Skeleton width="40%" height={4} />
            </Card>
          ) : gaps.isError ? (
            <ErrorState
              message={humanizeError(gaps.error)}
              onRetry={() => gaps.refetch()}
              onReport={() => router.push("/report" as never)}
              compact
            />
          ) : (
            <GapList gaps={Array.isArray(gaps.data) ? gaps.data : []} max={3} fallbackToMatrix />
          )}
        </Animated.View>

        {/* أجندتك القريبة — ONE merged ledger (تكليفات + اختبارات + مباشر) */}
        <Animated.View entering={entering(6)} style={{ gap: sp[8] }}>
          <SectionBar
            index={4}
            title="أجندتك القريبة"
            action={
              !dash.isLoading && !dash.isError && agenda && agendaTotal > 0 ? (
                <BarCount
                  n={agendaTotal}
                  a11y={countAr(agendaTotal, ["التزام قريب واحد", "التزامان قريبان", "التزامات قريبة", "التزاماً قريباً"])}
                />
              ) : undefined
            }
          />
          {dash.isLoading ? (
            <Card style={{ gap: sp[8] }}>
              <SkeletonText lines={2} />
              <SkeletonText lines={2} />
              <SkeletonText lines={2} />
            </Card>
          ) : dash.isError ? (
            /* Honesty: a failed agenda must not masquerade as «استرح» —
               the empty note only renders for a REAL empty agenda. */
            <ErrorState
              message={humanizeError(dash.error)}
              onRetry={() => dash.refetch()}
              onReport={() => router.push("/report" as never)}
              compact
            />
          ) : !agenda ||
            (agenda.assignments.length === 0 && agenda.exams.length === 0 && agenda.live.length === 0) ? (
            <SectionNote>لا تكليفات ولا اختبارات في النافذة القريبة — استرح أو راجع محاضراتك.</SectionNote>
          ) : (
            <RowList>
              {agenda.assignments.slice(0, 3).map((a, i, arr) => {
                const due = dueLabel(a.dueAt);
                return (
                  <LedgerRow
                    key={a.id}
                    last={
                      i === arr.length - 1 &&
                      agenda.exams.length === 0 &&
                      agenda.live.length === 0
                    }
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
              {agenda.exams.slice(0, 3).map((e, i, arr) => {
                const opensFuture = e.openAt ? new Date(e.openAt).getTime() > now : false;
                const phase = opensFuture
                  ? `يفتح باب الاختبار ${dateTime(e.openAt)}`
                  : e.closeAt
                    ? `آخر موعد للتسليم ${dateTime(e.closeAt)}`
                    : "نافذة الاختبار مفتوحة";
                return (
                  <LedgerRow
                    key={e.id}
                    last={i === arr.length - 1 && agenda.live.length === 0}
                    accessibilityLabel={`اختبار: ${e.title}`}
                    onPress={() => router.push("/student/online-exams" as never)}
                  >
                    <T variant="body" weight="bold" numberOfLines={1}>
                      {e.title}
                    </T>
                    <T variant="sm" color="muted">
                      {phase}
                    </T>
                  </LedgerRow>
                );
              })}
              {agenda.live.slice(0, 2).map((l, i, arr) => (
                <LedgerRow
                  key={l.id}
                  last={i === arr.length - 1}
                  accessibilityLabel={`بث مباشر: ${l.title}`}
                  onPress={() => router.push("/student/live" as never)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                      {l.title}
                    </T>
                    <Badge label="LIVE" tone="yellow" mono />
                  </View>
                  <T variant="sm" color="muted">
                    {dateTime(l.scheduledAt)}
                  </T>
                </LedgerRow>
              ))}
            </RowList>
          )}
        </Animated.View>

        {d && kpi && kpi.courseCount === 0 && agenda && agenda.classes.length === 0 ? (
          <EmptyState
            room="lecture-hall"
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

/** R341 M7 — the section bar's quiet mono meta (web BarCount grammar):
 *  the honest row count as padded Latin digits in the faint mono voice —
 *  data riding the [nn] bar, never a second accent moment. */
function BarCount({ n, a11y }: { n: number; a11y: string }) {
  return (
    <T variant="monoSm" color="faint" accessibilityLabel={a11y}>
      {latn(n).padStart(2, "0")}
    </T>
  );
}
