/**
 * (tabs)/dashboard — لوحة الأستاذ. Web parity: TeacherDashboardPage.tsx
 * recomposed mobile-first (R334 Phase D):
 *
 *   · stats hierarchy — ONE hero card (CountUp طلابي + the accent
 *     RingProgress للحضور) over quiet StatLines; no 2×2 card grid;
 *   · today's classes as a horizontal strip (phase-badged slots);
 *   · grading queue with the count in its section header («N بانتظار
 *     التصحيح») and one row per pending group;
 *   · quick actions (تصحيح/حضور/بث/بحوث) on PressableScale;
 *   · wire extras parsed structurally (src/features/teacher/wire.ts —
 *     no more `as unknown as Wire*` double casts).
 *  R334 review-panel fixes: staggered entrance, haptics.selection on
 *  the segment filter + quick actions + today slots, an Arabic
 *  accessibilityLabel on the attendance RingProgress, and kit
 *  EmptyState rooms for the true-empty sections.
 */
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import FileText from "lucide-react-native/icons/file-text";
import LineChart from "lucide-react-native/icons/chart-line";
import Microscope from "lucide-react-native/icons/microscope";
import Radio from "lucide-react-native/icons/radio";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { humanizeError } from "@/lib/errors";
import { fromNow, latn, pct } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Hairline } from "@/components/ui/surfaces";
import { LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { Segmented } from "@/components/ui/fields";
import { CountUp, PressableScale, RingProgress, useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { arCount, useTeacherOfferings } from "@/features/teacher/components";
import { parseFeed, parsePendingGroups, parseTrend } from "@/features/teacher/wire";

const NO_OFFERINGS: Awaited<ReturnType<typeof teacherApi.offerings>> = [];

type FeedFilter = "all" | "submissions" | "research" | "attendance";

const FEED_ACTION: Record<string, { label: string; to: string }> = {
  submissions: { label: "تقييم التسليم", to: "/teacher/assignments" },
  research: { label: "مراجعة البحث", to: "/teacher/research-review" },
  attendance: { label: "تسجيل الحضور", to: "/teacher/attendance" },
};

const QUICK_ACTIONS: { key: string; label: string; to: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { key: "grades", label: "التصحيح", to: "/teacher/grades", icon: ClipboardCheck },
  { key: "attendance", label: "الحضور", to: "/teacher/attendance", icon: CalendarDays },
  { key: "live", label: "بث مباشر", to: "/teacher/live", icon: Radio },
  { key: "research", label: "البحوث", to: "/teacher/research-review", icon: Microscope },
];

type TodaySlot = {
  key: string;
  courseName: string;
  courseCode: string;
  startTime: string;
  endTime: string;
  room: string | null;
};

/** One today slot composed from the offerings' schedules (web todaySlots). */
function todaySlots(offerings: Awaited<ReturnType<typeof teacherApi.offerings>>, now: Date): TodaySlot[] {
  const dow = now.getDay();
  const rows: TodaySlot[] = [];
  for (const o of offerings) {
    for (const slot of o.schedule ?? []) {
      if (slot.dayOfWeek !== dow) continue;
      rows.push({
        key: `${o.id}:${slot.id}`,
        courseName: o.course.name,
        courseCode: o.course.code,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room ?? null,
      });
    }
  }
  rows.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return rows;
}

function slotPhase(start: string, end: string, now: Date): "done" | "ongoing" | "upcoming" {
  const mins = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  if (cur >= mins(end)) return "done";
  if (cur >= mins(start)) return "ongoing";
  return "upcoming";
}

export default function TeacherDashboard() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const [filter, setFilter] = useState<FeedFilter>("all");
  /* Entrance stagger — base 40, step 60 → 7th block lands at 400ms (cap). */
  const entering = useStaggerEntrance({ base: 40, step: 60 });

  const dash = useQuery({
    queryKey: ["teacher", "dashboard", scope],
    queryFn: () => teacherApi.dashboard(),
  });
  const offs = useTeacherOfferings();

  const d = dash.data;
  const kpi = d?.kpi;

  const trend = useMemo(() => parseTrend(d?.trend), [d]);
  const trendDrawable =
    trend.filter((t) => t.grade !== null).length >= 2 || trend.filter((t) => t.attendance !== null).length >= 2;

  const feed = useMemo(() => parseFeed(d?.feed), [d]);
  const visible = filter === "all" ? feed : feed.filter((f) => f.kind === filter);

  const pendingGroups = useMemo(() => parsePendingGroups(d?.pendingGrading), [d]);
  const pendingTotal = useMemo(
    () => (pendingGroups ? pendingGroups.reduce((sum, g) => sum + g.count, 0) : (typeof d?.pendingGrading === "number" ? d.pendingGrading : 0)),
    [pendingGroups, d],
  );

  const offerings = offs.data ?? NO_OFFERINGS;
  const slots = useMemo(() => todaySlots(offerings, new Date()), [offerings]);

  if (dash.isLoading) {
    return (
      <Screen scroll>
        <AppTopBar alertsPath="/teacher/alerts" />
        <SkeletonList rows={6} />
      </Screen>
    );
  }
  if (dash.isError || !d) {
    return (
      <Screen scroll>
        <AppTopBar alertsPath="/teacher/alerts" />
        <PageHeader title="لوحة الأستاذ" />
        <ErrorState message={humanizeError(dash.error)} onRetry={() => dash.refetch()} />
      </Screen>
    );
  }

  const emptySemester =
    kpi && (kpi.studentCount ?? 0) === 0 && kpi.avgGradePct == null && kpi.attendancePct == null;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader
        title="لوحة الأستاذ"
        kicker="كل ما يحتاج تدخّلك اليوم — في تيار واحد، مرتّب حسب الأولوية."
      />

      {/* إحصاءات الفصل — hierarchy: one hero card, no card grid.
          The attendance RingProgress carries the screen's ONE accent. */}
      {emptySemester ? (
        <Animated.View entering={entering(0)}>
          <Card>
            <EmptyState
              icon={<ClipboardCheck size={22} color={p.textMuted} />}
              title="لا بيانات فصلية بعد"
              message="لا طلاب مسجّلين لديك حاليًا — عند تسجيل الطلاب في شُعَبك ستظهر هنا معدلات الدرجات ونسب الحضور أسبوعًا بعد أسبوع."
            />
          </Card>
        </Animated.View>
      ) : (
        <Animated.View entering={entering(0)}>
          <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[16] }}>
            <View style={{ flex: 1 }}>
              <T variant="sm" color="muted">
                طلابي هذا الفصل
              </T>
              <CountUp value={kpi?.studentCount ?? 0} />
            </View>
            <RingProgress
              size={84}
              thickness={8}
              progress={kpi?.attendancePct != null ? Math.min(1, Math.max(0, kpi.attendancePct / 100)) : 0}
              color={p.accent}
              trackColor={p.border}
              accessibilityLabel={
                kpi?.attendancePct != null
                  ? `نسبة الحضور ${pct(kpi.attendancePct)}`
                  : "لا بيانات حضور بعد"
              }
            >
              <T variant="sm" weight="bold">
                {kpi?.attendancePct != null ? pct(kpi.attendancePct) : "—"}
              </T>
              <T variant="xs" color="muted">
                الحضور
              </T>
            </RingProgress>
          </View>
          <View style={{ paddingTop: sp[4] }}>
            <StatLine
              label="متوسط الدرجات"
              value={kpi?.avgGradePct != null ? pct(kpi.avgGradePct) : "—"}
            />
            <StatLine label="بحوث بانتظار المراجعة" value={kpi?.needsReview ?? 0} />
          </View>
        </Card>
      </Animated.View>
      )}

      {/* إجراءات سريعة — one tap into the heavy workflows. */}
      <Animated.View entering={entering(1)} style={{ flexDirection: "row", gap: sp[8] }}>
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <PressableScale
              key={a.key}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => {
                haptics.selection();
                router.push(a.to as never);
              }}
              style={{
                flex: 1,
                minHeight: 72,
                alignItems: "center",
                justifyContent: "center",
                gap: sp[6],
                backgroundColor: p.surface,
                borderWidth: 1,
                borderColor: p.border,
              }}
            >
              <Icon size={20} color={p.textSecondary} />
              <T variant="sm" weight="medium">
                {a.label}
              </T>
            </PressableScale>
          );
        })}
      </Animated.View>

      {/* طابور التصحيح — count in the header, one row per group. */}
      <Animated.View entering={entering(2)} style={{ gap: sp[8] }}>
        <SectionBar
        index={1}
        title="طابور التصحيح"
        action={
          pendingTotal > 0 ? (
            <Badge
              label={arCount(pendingTotal, [
                "تسليم واحد بانتظار التصحيح",
                "تسليمان بانتظار التصحيح",
                "تسليمات بانتظار التصحيح",
                "تسليماً بانتظار التصحيح",
              ])}
              tone="yellow"
            />
          ) : undefined
        }
      />
      {pendingGroups !== null && pendingGroups.length > 0 ? (
        <RowList>
          {pendingGroups.map((g, i) => (
            <LedgerRow
              key={g.assignmentId !== "" ? g.assignmentId : String(i)}
              last={i === pendingGroups.length - 1}
              onPress={() => router.push("/teacher/assignments" as never)}
              accessibilityLabel={`طابور التصحيح — ${g.title}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <T variant="h4" weight="bold" color="accentInk">
                  {latn(g.count)}
                </T>
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {g.title}
                  </T>
                  <T variant="xs" color="muted" numberOfLines={1}>
                    {g.courseName}
                    {g.oldestSubmittedAt ? ` · أقدم تسليم ${fromNow(g.oldestSubmittedAt)}` : ""}
                  </T>
                </View>
                <Badge label="بانتظارك" tone="yellow" />
              </View>
            </LedgerRow>
          ))}
        </RowList>
      ) : pendingGroups === null && pendingTotal > 0 ? (
        /* count-only wire: pending work exists but the payload carries no
           group detail — render the honest count, never a fake list. */
        <Card>
          <T variant="body" color="muted">
            {arCount(pendingTotal, [
              "تسليم واحد بانتظار درجتك",
              "تسليمان بانتظار درجتك",
              "تسليمات بانتظار درجتك",
              "تسليماً بانتظار درجتك",
            ])}
          </T>
        </Card>
      ) : (
        <EmptyState
          room="exam-hall"
          title="لا انتظار — كل التسليمات مُقيَّمة"
          message="ستظهر هنا التسليمات الجديدة فور وصولها بانتظار درجتك."
          actionLabel="فتح التكاليف"
          onAction={() => router.push("/teacher/assignments" as never)}
        />
      )}
      </Animated.View>

      {/* طابور اليوم — horizontal strip of today's slots. */}
      <Animated.View entering={entering(3)} style={{ gap: sp[8] }}>
        <SectionBar index={2} title="طابور اليوم" />
        {offs.isLoading ? (
          <SkeletonList rows={2} rowHeight={48} />
        ) : offs.isError ? (
          <ErrorState message={humanizeError(offs.error)} onRetry={() => offs.refetch()} compact />
        ) : slots.length === 0 ? (
          <EmptyState
            room="lecture-hall"
            title="لا محاضرات اليوم"
            message="جدول اليوم فارغ — استرح أو راجع الجدول الأسبوعيّ."
            actionLabel="الجدول الأسبوعيّ"
            onAction={() => router.push("/teacher/schedule" as never)}
          />
        ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: sp[8], paddingBottom: sp[4] }}
        >
          {slots.map((s) => {
            const phase = slotPhase(s.startTime, s.endTime, new Date());
            return (
              <PressableScale
                key={s.key}
                accessibilityRole="button"
                accessibilityLabel={`محاضرة ${s.courseName} ${s.startTime} — ${s.endTime}`}
                onPress={() => {
                  haptics.selection();
                  router.push("/teacher/schedule" as never);
                }}
                style={{
                  width: 200,
                  gap: sp[6],
                  padding: sp[12],
                  backgroundColor: p.surface,
                  borderWidth: 1,
                  borderColor: phase === "ongoing" ? p.rule : p.border,
                  opacity: phase === "done" ? 0.55 : 1,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <T variant="sm" weight="bold">
                    {s.startTime} — {s.endTime}
                  </T>
                  <Badge
                    label={phase === "ongoing" ? "جارٍ الآن" : phase === "done" ? "انتهت" : "قادمة"}
                    tone={phase === "ongoing" ? "rose" : phase === "done" ? "grey" : "sky"}
                  />
                </View>
                <T variant="body" weight="medium" numberOfLines={1}>
                  {s.courseName}
                </T>
                <T variant="xs" color="muted" numberOfLines={1}>
                  {s.room ? `${s.room} · ` : ""}
                  {s.courseCode}
                </T>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}
      </Animated.View>

      {/* Trend — SVG-free View bars, honestly floored at ≥2 points. */}
      <Animated.View entering={entering(4)} style={{ gap: sp[8] }}>
        <SectionBar index={3} title="اتجاه الأداء والحضور" />
        <Card>
        <T variant="sm" color="muted">
          متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية
        </T>
        {!trendDrawable ? (
          <EmptyState
            icon={<LineChart size={22} color={p.textMuted} />}
            title="لا تتوفّر بيانات كافية بعد لرسم الاتجاه"
            message="لم يُسجَّل أي أسبوع حتى الآن — يُرسم المخطط تلقائيًا بعد اكتمال أسبوعين على الأقل."
          />
        ) : (
          <View style={{ gap: sp[10], paddingTop: sp[8] }}>
            {trend.map((t) => (
              <View key={t.week} style={{ gap: sp[4] }}>
                <T variant="xs" color="muted">
                  {t.week}
                </T>
                <TrendBar label="متوسط الأداء" value={t.grade} color={p.accent} />
                <TrendBar label="الحضور" value={t.attendance} color={p.gold} />
              </View>
            ))}
          </View>
        )}
        </Card>
      </Animated.View>

      {/* Feed — filter + rows. */}
      <Animated.View entering={entering(5)} style={{ gap: sp[8] }}>
        <SectionBar
        index={4}
        title="تيار المتابعة"
        action={
          <Badge
            label={
              visible.length === 0
                ? "لا عناصر تحتاج متابعة"
                : arCount(visible.length, ["عنصر يحتاج متابعة", "عنصران يحتاجان متابعة", "عناصر تحتاج متابعة", "عنصراً يحتاج متابعة"])
            }
            tone={visible.length === 0 ? "mint" : "yellow"}
          />
        }
      />
      <Segmented
        options={[
          { id: "all", label: "الكل" },
          { id: "submissions", label: "تسليمات" },
          { id: "research", label: "بحوث" },
          { id: "attendance", label: "حضور" },
        ]}
        selectedId={filter}
        onSelect={(id) => {
          haptics.selection();
          setFilter(id as FeedFilter);
        }}
      />
      {visible.length === 0 ? (
        <EmptyState
          room="building"
          title="لا متطلبات الآن — أحسنت!"
          message="سيظهر هنا أي عنصر جديد يحتاج متابعتك فور وصوله."
        />
      ) : (
        <RowList>
          {visible.map((f, i) => {
            const action = FEED_ACTION[f.kind];
            const Icon = f.kind === "research" ? Microscope : f.kind === "attendance" ? TriangleAlert : FileText;
            const author = f.author ?? "النظام";
            return (
              <LedgerRow
                key={String(i)}
                last={i === visible.length - 1}
                onPress={action ? () => router.push(action.to as never) : undefined}
                accessibilityLabel={f.title ?? f.text ?? "عنصر متابعة"}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <Icon size={18} color={p.textMuted} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium" numberOfLines={2}>
                          {f.title ?? f.text ?? "—"}
                        </T>
                      </View>
                      {f.late ? <Badge label="متأخر" tone="yellow" /> : null}
                    </View>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {author} · {fromNow(f.when)}
                    </T>
                  </View>
                  {action ? <Badge label={action.label} tone="sky" /> : null}
                </View>
              </LedgerRow>
            );
          })}
        </RowList>
      )}
      </Animated.View>

      {/* مقرّراتي — one tap into each offering's roster. */}
      <Animated.View entering={entering(6)} style={{ gap: sp[8] }}>
        <SectionBar index={5} title="مقرّراتي" />
        {offerings.length === 0 ? (
          <EmptyState
            room="library"
            title="لم تُسند إليك مقرّرات بعد"
            message="ستظهر مقرّراتك وشُعَبك هنا فور إسنادها من إدارة شؤون الأساتذة."
          />
        ) : (
        <RowList>
          {offerings.map((o, i) => (
            <LedgerRow
              key={o.id}
              last={i === offerings.length - 1}
              onPress={() => router.push(`/teacher/students/${o.id}` as never)}
              accessibilityLabel={`طلاب ${o.course.name}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <ClipboardCheck size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {o.course.name}
                  </T>
                  <T variant="xs" color="muted">
                    {o.course.code} · {o.term}
                    {o.studentsCount !== undefined ? ` · ${arCount(o.studentsCount, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}` : ""}
                  </T>
                </View>
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}
      <Hairline />
      </Animated.View>
    </Screen>
  );
}

/** One horizontal View bar (SVG-free trend line, latn value labels). */
function TrendBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
      <View style={{ width: 92 }}>
        <T variant="xs" color="muted">
          {label}
        </T>
      </View>
      <View style={{ flex: 1, height: 8, backgroundColor: p.border, overflow: "hidden" }}>
        <View
          style={{
            height: 8,
            width: value === null ? 0 : `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <T variant="xs" color="muted">
        {value === null ? "—" : pct(value)}
      </T>
    </View>
  );
}
