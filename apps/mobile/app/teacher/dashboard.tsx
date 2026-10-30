/**
 * (tabs)/dashboard — لوحة الأستاذ. Web parity: TeacherDashboardPage.tsx
 * (KPI strip · pending-grading queue · today's classes · trend · feed),
 * mobile-composed with the mobile dashboard wire shape read honestly.
 */
import { RoleTabFrame } from "@/components/shell/TabFrame";

import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardCheck, FileText, Microscope, TriangleAlert } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn, pct } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Hairline } from "@/components/ui/surfaces";
import { KpiCard, LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { Segmented } from "@/components/ui/fields";
import { arCount, useTeacherOfferings } from "@/features/teacher/components";

type FeedFilter = "all" | "submissions" | "research" | "attendance";

const FEED_ACTION: Record<string, { label: string; to: string }> = {
  submissions: { label: "تقييم التسليم", to: "/teacher/assignments" },
  research: { label: "مراجعة البحث", to: "/teacher/research-review" },
  attendance: { label: "تسجيل الحضور", to: "/teacher/attendance" },
};

type WireFeedItem = {
  kind?: string;
  title?: string;
  text?: string;
  when?: string;
  at?: string;
  author?: { firstName: string; lastName: string } | null;
  meta?: string;
  late?: boolean;
};

type WirePendingGroup = {
  assignmentId?: string;
  title?: string;
  count?: number;
  course?: { name?: string; code?: string };
  oldestSubmittedAt?: string | null;
};

type WireTrendPoint = { week: string; avgGradePct?: number | null; attendancePct?: number | null; value?: number | null };

/** One today slot composed from the offerings' schedules (web todaySlots). */
function todaySlots(offerings: Awaited<ReturnType<typeof teacherApi.offerings>>, now: Date) {
  const dow = now.getDay();
  const rows: { key: string; courseName: string; courseCode: string; startTime: string; endTime: string; room: string | null }[] = [];
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

function TeacherDashboard() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const [filter, setFilter] = useState<FeedFilter>("all");

  const dash = useQuery({
    queryKey: ["teacher", "dashboard", scope],
    queryFn: () => teacherApi.dashboard(),
  });
  const offs = useTeacherOfferings();

  const d = dash.data;
  const kpi = d?.kpi;

  const trend = useMemo(() => {
    const raw = ((d as unknown as { trend?: WireTrendPoint[] })?.trend ?? []) as WireTrendPoint[];
    return raw.map((t) => ({
      week: t.week,
      grade: t.avgGradePct ?? t.value ?? null,
      attendance: t.attendancePct ?? null,
    }));
  }, [d]);

  const trendDrawable =
    trend.filter((t) => t.grade !== null).length >= 2 || trend.filter((t) => t.attendance !== null).length >= 2;

  const feed = useMemo(() => {
    const raw = ((d as unknown as { feed?: WireFeedItem[] })?.feed ?? []) as WireFeedItem[];
    return raw;
  }, [d]);
  const visible = filter === "all" ? feed : feed.filter((f) => f.kind === filter);

  const pendingGroups = useMemo(() => {
    const raw = d?.pendingGrading;
    if (Array.isArray(raw)) return raw as unknown as WirePendingGroup[];
    return null;
  }, [d]);

  const offerings = offs.data ?? [];
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
        <ErrorState message={(dash.error as Error).message} onRetry={() => dash.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader
        title="لوحة الأستاذ"
        kicker="كل ما يحتاج تدخّلك اليوم — في تيار واحد، مرتّب حسب الأولوية."
      />

      {/* KPI strip — the mobile spec's four labels. */}
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <KpiCard label="طلابي" value={kpi?.studentCount ?? 0} />
        <KpiCard label="متوسط الدرجات" value={kpi?.avgGradePct !== null && kpi?.avgGradePct !== undefined ? pct(kpi.avgGradePct) : "—"} />
      </View>
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <KpiCard label="الحضور" value={kpi?.attendancePct !== null && kpi?.attendancePct !== undefined ? pct(kpi.attendancePct) : "—"} />
        <KpiCard
          label="بحوث بانتظار المراجعة"
          value={kpi?.needsReview ?? 0}
          tone="accent"
          style={{ justifyContent: "center" }}
        />
      </View>

      {/* طابور التصحيح — the pending-grading queue. */}
      <SectionBar index={1} title="طابور التصحيح" />
      {pendingGroups === null ? (
        <Card>
          <T variant="body" color="muted">
            {typeof d.pendingGrading === "number"
              ? d.pendingGrading === 0
                ? "لا انتظار — كل التسليمات مُقيَّمة"
                : `${arCount(Number(d.pendingGrading), ["تسليم واحد بانتظار درجتك", "تسليمان بانتظار درجتك", "تسليمات بانتظار درجتك", "تسليماً بانتظار درجتك"])}`
              : "لا انتظار — كل التسليمات مُقيَّمة"}
          </T>
        </Card>
      ) : pendingGroups.length === 0 ? (
        <Card>
          <T variant="body" weight="bold">لا انتظار — كل التسليمات مُقيَّمة</T>
          <T variant="sm" color="muted">
            ستظهر هنا التسليمات الجديدة فور وصولها بانتظار درجتك.
          </T>
        </Card>
      ) : (
        <RowList>
          {pendingGroups.map((g, i) => (
            <LedgerRow
              key={g.assignmentId ?? String(i)}
              last={i === pendingGroups.length - 1}
              onPress={() => router.push("/teacher/assignments" as never)}
              accessibilityLabel={`طابور التصحيح — ${g.title ?? ""}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <T variant="h4" weight="bold" color="accentInk">
                  {latn(g.count ?? 0)}
                </T>
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {g.title ?? "تسليم"}
                  </T>
                  <T variant="xs" color="muted" numberOfLines={1}>
                    {g.course?.name ?? ""}
                    {g.oldestSubmittedAt ? ` · أقدم تسليم ${fromNow(g.oldestSubmittedAt)}` : ""}
                  </T>
                </View>
                <Badge label="بانتظارك" tone="yellow" />
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* طابور اليوم — today's classes. */}
      <SectionBar index={2} title="طابور اليوم" />
      {offs.isLoading ? (
        <SkeletonList rows={2} rowHeight={48} />
      ) : offs.isError ? (
        <ErrorState message={(offs.error as Error).message} onRetry={() => offs.refetch()} compact />
      ) : slots.length === 0 ? (
        <Card>
          <T variant="body" weight="bold">لا محاضرات اليوم</T>
          <T variant="sm" color="muted">جدول اليوم فارغ — استرح أو راجع الجدول الأسبوعيّ.</T>
        </Card>
      ) : (
        <RowList>
          {slots.map((s, i) => {
            const phase = slotPhase(s.startTime, s.endTime, new Date());
            return (
              <LedgerRow
                key={s.key}
                last={i === slots.length - 1}
                onPress={() => router.push("/teacher/schedule" as never)}
                accessibilityLabel={`محاضرة ${s.courseName}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <CalendarDays size={18} color={p.textMuted} />
                  <View style={{ flex: 1 }}>
                    <T variant="body" weight="medium" numberOfLines={1}>
                      {s.courseName}
                    </T>
                    <T variant="xs" color="muted">
                      {`${s.startTime} — ${s.endTime}`}
                      {s.room ? ` · ${s.room}` : ""} · {s.courseCode}
                    </T>
                  </View>
                  <Badge
                    label={phase === "ongoing" ? "جارٍ الآن" : phase === "done" ? "انتهت" : "قادمة"}
                    tone={phase === "ongoing" ? "rose" : phase === "done" ? "grey" : "sky"}
                  />
                </View>
              </LedgerRow>
            );
          })}
        </RowList>
      )}

      {/* Trend — SVG-free View bars, honestly floored at ≥2 points. */}
      <SectionBar index={3} title="اتجاه الأداء والحضور" />
      <Card>
        <T variant="sm" color="muted">
          متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية
        </T>
        {!trendDrawable ? (
          <EmptyState
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

      {/* Feed — filter + rows. */}
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
        onSelect={(id) => setFilter(id as FeedFilter)}
      />
      {visible.length === 0 ? (
        <Card>
          <T variant="body" weight="bold">لا متطلبات الآن — أحسنت!</T>
          <T variant="sm" color="muted">سيظهر هنا أي عنصر جديد فور وصوله.</T>
        </Card>
      ) : (
        <RowList>
          {visible.map((f, i) => {
            const kind = f.kind ?? "";
            const action = FEED_ACTION[kind];
            const Icon = kind === "research" ? Microscope : kind === "attendance" ? TriangleAlert : FileText;
            const author = f.author ? `${f.author.firstName} ${f.author.lastName}` : "النظام";
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
                      {author} · {fromNow(f.when ?? f.at ?? null)}
                    </T>
                  </View>
                  {action ? <Badge label={action.label} tone="sky" /> : null}
                </View>
              </LedgerRow>
            );
          })}
        </RowList>
      )}

      {/* مقرّراتي — one tap into each offering's roster. */}
      <SectionBar index={5} title="مقرّراتي" />
      {offerings.length === 0 ? (
        <Card>
          <T variant="body" color="muted">لم تُسند إليك مقرّرات بعد</T>
        </Card>
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
    </Screen>
  );
}

/** One horizontal View bar (SVG-free trend line, latn value labels). */
function TrendBar({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
      <View style={{ width: 92 }}>
        <T variant="xs" color="muted">
          {label}
        </T>
      </View>
      <View style={{ flex: 1, height: 8, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
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


export default function TeacherDashboardTabbed() {
  return (
    <RoleTabFrame role="TEACHER">
      <TeacherDashboard />
    </RoleTabFrame>
  );
}
