/**
 * /student/calendar — التقويم (web CalendarPage parity, mobile-recomposed;
 * R341 M7 web-language parity: the legend joins the chip register, the
 * out-of-month dim is an INK step — never opacity — per the web r299
 * AA ruling, weekend days read quiet ink, and TODAY stays the ONE
 * emphasized cell: accent-soft wash + copper hairline edge + the
 * numeral as a filled accent chip):
 * a real month grid on the audience calendar (Africa/Tripoli) uniting the
 * four deadline surfaces — recurring weekly classes (/enrollments/me
 * schedule slots), assignment due dates, exam windows and live sessions
 * (the dashboard agenda) — with per-kind dots (class=ink, assignment=
 * accent, exam=gold, live=lavender).
 *
 * R334 Round 2 (3-h Comms):
 *   · day numbers + counts render through the numerals POLICY hook
 *     (useNumerals — ٠١٢٣ when the user prefers Arabic-Indic glyphs);
 *   · tapping a day opens a DAY SHEET (AppSheet — bottom-sheet v5 with
 *     its interactive keyboard behavior) listing that day's events with
 *     deep links. The sheet mounts ONLY while open: the real bottom-sheet
 *     graph must not load during the jest render-net route walk;
 *   · errors through humanizeError (never raw error.message).
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import Presentation from "lucide-react-native/icons/presentation";
import Radio from "lucide-react-native/icons/radio";
import { learningApi } from "@/api/learning";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { IconButton } from "@/components/ui/pressables";
import { AppSheet } from "@/components/ui/sheet";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { AR_DAYS, timeOf, useNumerals } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { fadeIn, useStaggerEntrance } from "@/motion";
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

/** The day-sheet payload: a grid cell + its events. */
interface DaySheet {
  key: string;
  dow: number;
  day: number;
  events: CalEvent[];
}

export default function CalendarScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const entering = useStaggerEntrance({ base: 40, step: 60 });
  const tones = useStatusTones();
  const { formatNumber } = useNumerals();

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
  const [daySheet, setDaySheet] = useState<DaySheet | null>(null);

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
    view.y !== today.y || view.m !== today.m;
  const shiftMonth = (delta: number) => {
    haptics.selection();
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m - 1 + delta, 1));
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
    });
  };
  const goToday = () => {
    haptics.selection();
    const t = tripoliToday();
    setView({ y: t.y, m: t.m });
  };

  const monthEventCells = cells.filter((c) => c.inMonth && byDay.has(c.key)).length;
  const loading = enrollments.isLoading || dash.isLoading;

  return (
    <>
      <PushFrame
        title="التقويم"
        kicker="كل مواعيدك في نظرة واحدة — بتوقيت ليبيا"
        refreshing={(enrollments.isFetching || dash.isFetching) && !loading}
        onRefresh={() => {
          void enrollments.refetch();
          void dash.refetch();
        }}
      >
      {/* Legend — the chip register: one quiet hairline chip per kind
          (web .cal-legend grammar — sunken ground, hairline frame, 0
          radius) behind the eyebrow that classifies the row. */}
      {/* T-50 (review-1 T12): the calendar was a motionless seat —
          legend + month block take the staggered entrance, month swaps
          fade (remount key), day taps fire selection haptics. */}
      <Animated.View entering={entering(0)} style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[6], rowGap: 4 }}>
        <T variant="xs" color="muted">أنواع المواعيد</T>
        {(Object.keys(KIND_LABEL) as CalKind[]).map((kind) => (
          <View
            key={kind}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
              backgroundColor: p.surfaceHover,
              paddingHorizontal: sp[8],
              paddingVertical: 3,
            }}
          >
            <View style={{ width: 8, height: 8, backgroundColor: dotColor(kind) }} />
            <T variant="xs" color="secondary">
              {KIND_LABEL[kind]}
            </T>
          </View>
        ))}
      </Animated.View>

      {loading ? (
        <SkeletonList rows={6} rowHeight={56} />
      ) : enrollments.isError ? (
        <ErrorState message={humanizeError(enrollments.error)} onRetry={() => enrollments.refetch()} />
      ) : dash.isError ? (
        <ErrorState message={humanizeError(dash.error)} onRetry={() => dash.refetch()} />
      ) : (
        <>
          {/* Month navigation — RTL: السابق sits on the right. */}
          <Animated.View
            key={`${view.y}-${view.m}`}
            entering={fadeIn()}
            style={{ gap: sp[8] }}
          >
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
          {/* Weekday header — Sunday-first, RTL flow (starts at the right). */}
          <View style={{ flexDirection: "row" }}>
            {AR_DAYS.map((name) => (
              <View key={name} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                <T variant="xs" color="muted" numberOfLines={1}>
                  {name}
                </T>
              </View>
            ))}
          </View>

          {/* The 42-cell month grid — numerals render via the policy hook. */}
          <View style={{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}>
            {Array.from({ length: 6 }).map((_, row) => (
              <View key={row} style={{ flexDirection: "row" }}>
                {cells.slice(row * 7, row * 7 + 7).map((cell) => {
                  const kinds = kindsFor(cell.key);
                  const count = byDay.get(cell.key)?.length ?? 0;
                  const isToday = cell.key === todayKey;
                  /* R341 M7 — the web r299 AA ruling: out-of-month reads
                     as an INK step (muted tier), never opacity; the
                     Libya weekend (Fri/Sat, dow 5/6 on the 0=Sunday
                     contract) reads quiet ink too — today always wins. */
                  const weekend = cell.dow === 5 || cell.dow === 6;
                  const dayInk =
                    !cell.inMonth || (weekend && !isToday) ? p.textMuted : p.text;
                  return (
                    <Pressable
                      key={cell.key}
                      accessibilityRole="button"
                      accessibilityLabel={
                        `${AR_DAYS[cell.dow]} ${formatNumber(cell.day)}${count > 0 ? ` — ${formatNumber(count)} ${count === 1 ? "حدث" : "أحداث"}` : ""}`
                      }
                      onPress={() => {
                        haptics.selection();
                        setDaySheet({
                          key: cell.key,
                          dow: cell.dow,
                          day: cell.day,
                          events: byDay.get(cell.key) ?? [],
                        });
                      }}
                      style={[
                        styles.cell,
                        {
                          /* Today = the ONE emphasized cell: accent-soft
                             wash + copper edge (the numeral becomes a
                             filled accent chip below) — web parity. */
                          borderColor: isToday ? p.accent : p.border,
                          backgroundColor: isToday ? p.accentSoft : "transparent",
                        },
                      ]}
                    >
                      {isToday ? (
                        <View
                          style={{
                            minWidth: 24,
                            minHeight: 24,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: p.accent,
                          }}
                        >
                          <T variant="sm" weight="bold" color="onAccent">
                            {formatNumber(cell.day)}
                          </T>
                        </View>
                      ) : (
                        <T variant="sm" style={{ color: dayInk }}>
                          {formatNumber(cell.day)}
                        </T>
                      )}
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
          </Animated.View>

          {/* Hint — the events themselves live in the day sheet now. */}
          <T variant="xs" color="faint">
            اختر يوماً من الشبكة لعرض مواعيده.
          </T>

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

      {/* DAY SHEET — mounts only while a day is chosen (bottom-sheet graph
          stays out of the route render net; loads on first open on device). */}
      {daySheet ? (
        <AppSheet
          open
          onClose={() => setDaySheet(null)}
          title={`${AR_DAYS[daySheet.dow]} · ${formatNumber(daySheet.day)}`}
          snap="md"
        >
          {daySheet.events.length === 0 ? (
            <EmptyState
              room="library"
              title="لا أحداث في هذا اليوم"
              message="اختر يومًا آخر من الشبكة — أو راجع جدولك ومقرّراتك."
            />
          ) : (
            <RowList>
              {daySheet.events.map((ev, i) => (
                <LedgerRow
                  key={ev.key}
                  last={i === daySheet.events.length - 1}
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
        </AppSheet>
      ) : null}
    </>
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
