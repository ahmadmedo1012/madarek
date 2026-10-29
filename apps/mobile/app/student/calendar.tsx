/**
 * /student/calendar — التقويم (web CalendarPage parity, mobile-recomposed):
 * a real month grid on the audience calendar (Africa/Tripoli) uniting the
 * four deadline surfaces — recurring weekly classes (/enrollments/me
 * schedule slots), assignment due dates, exam windows and live sessions
 * (the dashboard agenda) — with per-kind dots (class=ink, assignment=
 * accent, exam=gold, live=lavender) and a selected-day list below.
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, Presentation, Radio } from "lucide-react-native";
import { learningApi } from "@/api/learning";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { IconButton } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { AR_DAYS, latn, timeOf } from "@/lib/format";
import { countAr } from "@/features/student/more";
import {
  PushFrame,
  civilKey,
  civilOf,
  monthGridCells,
  monthTitle,
  tripoliToday,
} from "@/features/student/components";

type CalKind = "class" | "assignment" | "exam" | "live";

interface CalEvent {
  key: string;
  kind: CalKind;
  title: string;
  time: string | null;
  to: string | null;
}

const KIND_LABEL: Record<CalKind, string> = {
  class: "حصص ومحاضرات",
  assignment: "واجبات",
  exam: "اختبارات",
  live: "بث مباشر",
};

const KIND_ORDER: Record<CalKind, number> = { class: 0, assignment: 1, exam: 2, live: 3 };

export default function CalendarScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const tones = useStatusTones();

  const enrollments = useQuery({
    queryKey: ["enrollments", "me", scope],
    queryFn: () => learningApi.enrollments(),
  });
  const dash = useQuery({
    queryKey: ["me", "dashboard", scope],
    queryFn: () => studentApi.dashboard(),
  });

  const today = tripoliToday();
  const todayKey = civilKey(today);
  const [view, setView] = useState({ y: today.y, m: today.m });
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const cells = useMemo(() => monthGridCells(view.y, view.m), [view]);

  /* Merge the four sources per civil day (recurring classes expand grid-scoped). */
  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const push = (key: string, ev: CalEvent) => {
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    };
    for (const cell of cells) {
      if (!cell.inMonth) continue;
      for (const e of enrollments.data ?? []) {
        for (const slot of e.offering.schedule ?? []) {
          if (slot.dayOfWeek === cell.dow) {
            push(cell.key, {
              key: `c-${e.id}-${slot.id}-${cell.key}`,
              kind: "class",
              title: `${e.offering.course.code} — ${e.offering.course.name}`,
              time: `${slot.startTime}–${slot.endTime}${slot.room ? ` · ${slot.room}` : ""}`,
              to: `/student/courses/${e.offering.id}`,
            });
          }
        }
      }
    }
    for (const a of dash.data?.agenda.assignments ?? []) {
      if (!a.dueAt) continue;
      push(civilKey(civilOf(a.dueAt)), {
        key: `a-${a.id}`,
        kind: "assignment",
        title: `واجب: ${a.title}${a.courseCode ? ` (${a.courseCode})` : ""}`,
        time: timeOf(a.dueAt),
        to: "/student/assignments",
      });
    }
    for (const e of dash.data?.agenda.exams ?? []) {
      const at = e.openAt ?? e.closeAt;
      if (!at) continue;
      push(civilKey(civilOf(at)), {
        key: `e-${e.id}`,
        kind: "exam",
        title: `اختبار: ${e.title}`,
        time: timeOf(at),
        to: "/student/online-exams",
      });
    }
    for (const l of dash.data?.agenda.live ?? []) {
      push(civilKey(civilOf(l.scheduledAt)), {
        key: `l-${l.id}`,
        kind: "live",
        title: `بث مباشر: ${l.title}`,
        time: timeOf(l.scheduledAt),
        to: "/student/live",
      });
    }
    for (const list of map.values()) list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    return map;
  }, [cells, enrollments.data, dash.data]);

  const kindsFor = (key: string): CalKind[] => {
    const events = byDay.get(key) ?? [];
    const kinds = new Set<CalKind>();
    for (const ev of events) kinds.add(ev.kind);
    return [...kinds];
  };
  const dotColor = (kind: CalKind): string =>
    kind === "class" ? p.text : kind === "assignment" ? p.accent : kind === "exam" ? p.gold : tones.lavender.ink;

  const awayFromToday =
    view.y !== today.y || view.m !== today.m || selectedKey !== todayKey;
  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
  };
  const goToday = () => {
    const t = tripoliToday();
    setView({ y: t.y, m: t.m });
    setSelectedKey(civilKey(t));
  };

  const selectedEvents = byDay.get(selectedKey) ?? [];
  const selectedCell = cells.find((c) => c.key === selectedKey);
  const monthEventCells = cells.filter((c) => c.inMonth && byDay.has(c.key)).length;

  const loading = enrollments.isLoading || dash.isLoading;

  return (
    <PushFrame
      title="التقويم"
      kicker="كل مواعيدك في نظرة واحدة — بتوقيت ليبيا"
      refreshing={(enrollments.isFetching || dash.isFetching) && !loading}
      onRefresh={() => {
        void enrollments.refetch();
        void dash.refetch();
      }}
    >
      {/* Legend — words + dots */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[10], rowGap: 4 }}>
        {(Object.keys(KIND_LABEL) as CalKind[]).map((kind) => (
          <View key={kind} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, backgroundColor: dotColor(kind) }} />
            <T variant="xs" color="muted">
              {KIND_LABEL[kind]}
            </T>
          </View>
        ))}
      </View>

      {loading ? (
        <SkeletonList rows={6} rowHeight={56} />
      ) : enrollments.isError ? (
        <ErrorState message={(enrollments.error as Error).message} onRetry={() => enrollments.refetch()} />
      ) : dash.isError ? (
        <ErrorState message={(dash.error as Error).message} onRetry={() => dash.refetch()} />
      ) : (
        <>
          {/* Month navigation */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <IconButton label="الشهر السابق" onPress={() => shiftMonth(-1)}>
              <ChevronRight size={20} color={p.text} />
            </IconButton>
            <View style={{ flex: 1, alignItems: "center" }}>
              <T variant="h4" weight="bold">
                {monthTitle(view.y, view.m)}
              </T>
            </View>
            {awayFromToday ? (
              <IconButton label="العودة إلى اليوم" onPress={goToday}>
                <T variant="xs" color="accentInk">
                  اليوم
                </T>
              </IconButton>
            ) : null}
            <IconButton label="الشهر التالي" onPress={() => shiftMonth(1)}>
              <ChevronLeft size={20} color={p.text} />
            </IconButton>
          </View>

          {/* Weekday header — Sunday-first, RTL flow */}
          <View style={{ flexDirection: "row" }}>
            {AR_DAYS.map((name) => (
              <View key={name} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                <T variant="xs" color="muted" numberOfLines={1}>
                  {name}
                </T>
              </View>
            ))}
          </View>

          {/* The 42-cell month grid */}
          <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
            {Array.from({ length: 6 }).map((_, row) => (
              <View key={row} style={{ flexDirection: "row" }}>
                {cells.slice(row * 7, row * 7 + 7).map((cell) => {
                  const kinds = kindsFor(cell.key);
                  const count = byDay.get(cell.key)?.length ?? 0;
                  const isToday = cell.key === todayKey;
                  const isSelected = cell.key === selectedKey;
                  return (
                    <Pressable
                      key={cell.key}
                      accessibilityRole="button"
                      accessibilityLabel={
                        `${AR_DAYS[cell.dow]} ${latn(cell.day)}${count > 0 ? ` — ${latn(count)} ${count === 1 ? "حدث" : "أحداث"}` : ""}`
                      }
                      onPress={() => setSelectedKey(cell.key)}
                      style={[
                        styles.cell,
                        {
                          borderColor: p.border,
                          backgroundColor: isSelected ? p.primary : "transparent",
                          opacity: cell.inMonth ? 1 : 0.35,
                        },
                      ]}
                    >
                      <T
                        variant="sm"
                        weight={isToday || isSelected ? "bold" : "regular"}
                        style={{ color: isSelected ? p.primaryFg : isToday ? p.accent : p.text }}
                      >
                        {latn(cell.day)}
                      </T>
                      {kinds.length > 0 ? (
                        <View style={{ flexDirection: "row", gap: 3, marginTop: 2 }}>
                          {kinds.map((kind) => (
                            <View
                              key={kind}
                              style={{ width: 5, height: 5, backgroundColor: dotColor(kind) }}
                            />
                          ))}
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Selected day */}
          <View style={{ gap: sp[8] }}>
            <SectionBar
              index={1}
              title={
                selectedCell
                  ? `${AR_DAYS[selectedCell.dow]} · ${latn(selectedCell.day)}`
                  : "اختر يومًا"
              }
              action={
                selectedEvents.length > 0 ? (
                  <T variant="xs" color="muted">
                    {latn(selectedEvents.length)}
                  </T>
                ) : undefined
              }
            />
            {selectedEvents.length === 0 ? (
              <EmptyState
                title="لا أحداث في هذا اليوم"
                message="اختر يومًا آخر من الشبكة أعلاه — أو راجع جدولك ومقرّراتك."
              />
            ) : (
              <RowList>
                {selectedEvents.map((ev, i) => (
                  <LedgerRow
                    key={ev.key}
                    last={i === selectedEvents.length - 1}
                    accessibilityLabel={ev.title}
                    onPress={() => {
                      if (ev.to) router.push(ev.to as never);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      {ev.kind === "class" ? (
                        <Presentation size={16} color={p.text} />
                      ) : ev.kind === "assignment" ? (
                        <ClipboardList size={16} color={p.accent} />
                      ) : ev.kind === "exam" ? (
                        <ClipboardCheck size={16} color={p.goldInk} />
                      ) : (
                        <Radio size={16} color={tones.lavender.ink} />
                      )}
                      <T variant="body" weight="medium" style={{ flex: 1 }} numberOfLines={2}>
                        {ev.title}
                      </T>
                      <Badge label={KIND_LABEL[ev.kind]} tone={ev.kind === "class" ? "grey" : ev.kind === "assignment" ? "copper" : ev.kind === "exam" ? "yellow" : "lavender"} />
                    </View>
                    {ev.time ? (
                      <T variant="sm" color="muted">
                        {ev.time}
                      </T>
                    ) : null}
                  </LedgerRow>
                ))}
              </RowList>
            )}
          </View>

          {monthEventCells === 0 ? (
            <T variant="sm" color="muted">
              {`شهر هادئ — لا مواعيد في ${monthTitle(view.y, view.m)}.`}
            </T>
          ) : (
            <T variant="xs" color="faint">
              {countAr(monthEventCells, ["يوم واحد له مواعيد", "يوماً لهما مواعيد", "أيام لها مواعيد", "يومًا له مواعيد"])}
            </T>
          )}
        </>
      )}
    </PushFrame>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
