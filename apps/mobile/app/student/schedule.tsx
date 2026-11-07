/**
 * /student/schedule — الجدول الأسبوعي (web SchedulePage parity,
 * mobile-recomposed): every enrollment's schedule slots flattened and
 * grouped by day. R334 Round 2 (3-h Comms):
 *
 *   · a TODAY week strip (day chips, today outlined in the one accent —
 *     replaces the Segmented-in-nested-horizontal-ScrollView smell);
 *   · the body is a DataList (FlashList v2) — «الكل» renders day sections
 *     with STICKY headers, a single day renders its slots flat;
 *   · today's slots carry a status chip — «مباشرة الآن» (live, accent
 *     fill) / «التالية» (next, accentSoft) / «انتهت» (done, grey) — from
 *     the Tripoli clock (useNow ticks every minute, render stays pure);
 *   · EmptyState rooms: building when there is no schedule at all,
 *     lecture-hall «لا توجد محاضرات اليوم» for an empty day;
 *   · errors through humanizeError (never raw error.message).
 */

import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { learningApi } from "@/api/learning";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useNow } from "@/hooks/useNow";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { Screen } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { DataList, makeRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { AR_DAYS, dayName, latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { countAr } from "@/features/student/more";
import { tripoliDow } from "@/features/student/components";

interface DaySlot {
  dow: number;
  startTime: string;
  endTime: string;
  room: string | null;
  courseName: string;
  courseCode: string;
  offeringId: string;
}

const TZ = "Africa/Tripoli";

/* ══ Pure status model (exported for colocated tests — see
      src/features/messages/agenda-logic.test.ts for WHY the tests live
      there: app/ cannot host test files without breaking the render-net
      route walk). ═══════════════════════════════════════════════════ */

export type SlotStatus = "live" | "next" | "done";

/** "09:30" → 570 minutes; unparsable → -1 (never throws). */
export function minutesOf(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return -1;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Status per slot key for ONE day: `done` when it ended, `live` while
 * running, `next` for the FIRST slot yet to start (ties → earliest start).
 * Pure function of (slots, nowMinutes) — the clock is injected.
 */
export function slotStatusesForDay(
  slots: { key: string; startTime: string; endTime: string }[],
  nowMinutes: number,
): Map<string, SlotStatus> {
  const out = new Map<string, SlotStatus>();
  let nextAssigned = false;
  const ordered = [...slots].sort((a, b) => minutesOf(a.startTime) - minutesOf(b.startTime));
  for (const s of ordered) {
    const start = minutesOf(s.startTime);
    const end = minutesOf(s.endTime);
    if (start < 0) continue;
    if (end >= 0 && end <= nowMinutes) {
      out.set(s.key, "done");
    } else if (start <= nowMinutes && (end < 0 || end > nowMinutes)) {
      out.set(s.key, "live");
    } else if (!nextAssigned) {
      out.set(s.key, "next");
      nextAssigned = true;
    }
  }
  return out;
}

/** Minutes since midnight on the Tripoli clock (guarded Intl; never throws). */
export function tripoliMinutes(now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-u-nu-latn", {
      timeZone: TZ,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? "0");
    return get("hour") * 60 + get("minute");
  } catch {
    return now.getHours() * 60 + now.getMinutes();
  }
}

/* ══ Screen ═════════════════════════════════════════════════════════ */

type SectionItem =
  | { kind: "header"; key: string; dow: number }
  | { kind: "slot"; key: string; slot: DaySlot };

export default function ScheduleScreen() {
  const scope = useInstitutionScope();
  const now = useNow(60_000);
  const feed = useQuery({
    queryKey: ["enrollments", "me", scope],
    queryFn: () => learningApi.enrollments(),
  });

  const byDay = useMemo(() => {
    const map = new Map<number, DaySlot[]>();
    for (const e of feed.data ?? []) {
      for (const slot of e.offering.schedule ?? []) {
        const row: DaySlot = {
          dow: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room ?? e.offering.room ?? null,
          courseName: e.offering.course.name,
          courseCode: e.offering.course.code,
          offeringId: e.offering.id,
        };
        const list = map.get(slot.dayOfWeek) ?? [];
        list.push(row);
        map.set(slot.dayOfWeek, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [feed.data]);

  const daysWithItems = useMemo(() => [...byDay.keys()].sort((a, b) => a - b), [byDay]);
  const todayDow = tripoliDow();
  const defaultDay = daysWithItems.includes(todayDow) ? String(todayDow) : "all";
  const [selected, setSelected] = useState(defaultDay);

  const totalSlots = daysWithItems.reduce((sum, d) => sum + (byDay.get(d)?.length ?? 0), 0);

  /** Day status chips — keyed by slot key for TODAY's rows (both «الكل» and
   *  single-day views share the same per-day enumeration → identical keys). */
  const statuses = useMemo(() => {
    const slots = (byDay.get(todayDow) ?? []).map((s, i) => ({
      key: slotKey(s, i),
      startTime: s.startTime,
      endTime: s.endTime,
    }));
    return slotStatusesForDay(slots, tripoliMinutes(new Date(now)));
  }, [todayDow, byDay, now]);

  /** DataList sections: «الكل» → day sections w/ sticky headers; else flat. */
  const sections = useMemo<SectionItem[]>(() => {
    if (selected !== "all") {
      return (byDay.get(Number(selected)) ?? []).map((slot, i) => ({
        kind: "slot" as const,
        key: slotKey(slot, i),
        slot,
      }));
    }
    const items: SectionItem[] = [];
    const stickyOrder = [...daysWithItems];
    for (const dow of stickyOrder) {
      items.push({ kind: "header", key: `h-${dow}`, dow });
      for (const [i, slot] of (byDay.get(dow) ?? []).entries()) {
        items.push({ kind: "slot", key: slotKey(slot, i), slot });
      }
    }
    return items;
  }, [selected, byDay, daysWithItems]);

  const stickyIndices = useMemo(
    () => sections.flatMap((item, i) => (item.kind === "header" ? [i] : [])),
    [sections],
  );

  const selectDay = (id: string) => {
    if (id !== selected) haptics.selection();
    setSelected(id);
  };

  const nothingAtAll = !feed.isLoading && !feed.isError && daysWithItems.length === 0;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title="الجدول الأسبوعي"
        kicker={countAr(totalSlots, ["حصة أسبوعياً واحدة", "حصتان أسبوعياً", "حصص أسبوعياً", "حصة أسبوعياً"])}
      />
      {/* The week strip — day chips, today outlined in the one accent. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp[16], paddingVertical: sp[10], gap: sp[8] }}
      >
        <DayChip id="all" label="الكل" count={totalSlots} selected={selected === "all"} onSelect={selectDay} isToday={false} />
        {daysWithItems.map((d) => (
          <DayChip
            key={d}
            id={String(d)}
            label={dayName(d)}
            count={byDay.get(d)?.length ?? 0}
            selected={selected === String(d)}
            onSelect={selectDay}
            isToday={d === todayDow}
          />
        ))}
      </ScrollView>

      <DataList
        data={feed.isLoading || feed.isError || nothingAtAll ? [] : sections}
        renderItem={(info) =>
          info.item.kind === "header" ? (
            <DaySectionHeader dow={info.item.dow} todayDow={todayDow} />
          ) : (
            <SlotRow item={info.item.slot} status={statuses.get(info.item.key) ?? null} />
          )
        }
        keyExtractor={(item: SectionItem) => item.key}
        stickyHeaderIndices={stickyIndices}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        emptySlot={
          nothingAtAll ? (
            <EmptyState
              room="building"
              title="لا يوجد جدول مسجّل"
              message="ستظهر محاضراتك هنا فور أن يُسجَّل الجدول لمقرّراتك."
            />
          ) : (
            <EmptyState
              room="lecture-hall"
              title={Number(selected) === todayDow ? "لا توجد محاضرات اليوم" : "لا حصص في هذا اليوم"}
              message="اختر يوماً آخر من الشريط أعلاه أو راجع مقرّراتك."
            />
          )
        }
        contentPadding={{ horizontal: 16, top: 8, bottom: 24 }}
        contentStyle={{ gap: 0 }}
      />
    </Screen>
  );
}

function slotKey(s: DaySlot, i: number): string {
  return `${s.offeringId}-${s.startTime}-${i}`;
}

/* ── the week strip chip ─────────────────────────────────────────────── */

function DayChip({
  id,
  label,
  count,
  selected,
  onSelect,
  isToday,
}: {
  id: string;
  label: string;
  count: number;
  selected: boolean;
  onSelect: (id: string) => void;
  isToday: boolean;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={isToday ? `${label} — اليوم` : label}
      accessibilityState={{ selected }}
      onPress={() => onSelect(id)}
      style={{
        minHeight: touchFloor,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: sp[12],
        // M8 — filters speak the Segmented language, not the accent: the
        // selected day is an INK slab (primary/primaryFg), unselected days
        // sit on transparent ground inside a hairline rule frame. Orange
        // stays reserved for the live chip (the screen's one signal).
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        backgroundColor: selected ? p.primary : "transparent",
        gap: 0,
      }}
    >
      <T
        variant="sm"
        weight={selected || isToday ? "bold" : "medium"}
        color={selected ? "onPrimary" : isToday ? "text" : "muted"}
      >
        {label}
      </T>
      <T variant="xs" color={selected ? "onPrimary" : "faint"}>
        {isToday ? `اليوم · ${latn(count)}` : latn(count)}
      </T>
    </Pressable>
  );
}

/** Sticky day header inside the «الكل» list — solid ground while pinned. */
function DaySectionHeader({ dow, todayDow }: { dow: number; todayDow: number }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="header"
      style={{
        backgroundColor: p.surface,
        paddingVertical: sp[6],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
      }}
    >
      {/* M8 — today is INKED (the web's TODAY chip rides text-secondary,
          not the accent); the accent stays on the live chip only. */}
      <T variant="sm" weight="bold" color={dow === todayDow ? "text" : "muted"}>
        {`${AR_DAYS[dow] ?? ""}${dow === todayDow ? " · اليوم" : ""}`}
      </T>
    </View>
  );
}

/* ── one class row ───────────────────────────────────────────────────── */

const STATUS_META: Record<SlotStatus, { label: string }> = {
  live: { label: "مباشرة الآن" },
  next: { label: "التالية" },
  done: { label: "انتهت" },
};

const SlotRow = makeRow<DaySlot, { status: SlotStatus | null }>(({ item: s, status }) => {
  const p = usePalette();
  const meta = status ? STATUS_META[status] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`حصة ${s.courseName}${meta ? `، ${meta.label}` : ""}`}
      onPress={() => router.push(`/student/courses/${s.offeringId}` as never)}
      style={({ pressed }) => ({
        minHeight: 64,
        justifyContent: "center",
        paddingHorizontal: sp[4],
        paddingVertical: sp[10],
        backgroundColor: pressed ? p.surfaceHover : "transparent",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        gap: sp[2],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <MonoLabel>{`${s.startTime}–${s.endTime}`}</MonoLabel>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {`${s.courseCode} — ${s.courseName}`}
          </T>
        </View>
        {/* M8 — the M1 chip tiers: live is the ONE primary (accent fill,
            accentFg ink); next/done collapse to the muted secondary
            (hairline rule frame, transparent ground, muted medium ink). */}
        {meta && status ? (
          <View
            accessibilityLabel={meta.label}
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: sp[8],
              minHeight: 24,
              justifyContent: "center",
              borderWidth: status === "live" ? 0 : StyleSheet.hairlineWidth,
              borderColor: p.rule,
              backgroundColor: status === "live" ? p.accent : "transparent",
            }}
          >
            <T
              variant="xs"
              weight={status === "live" ? "bold" : "medium"}
              style={{ color: status === "live" ? p.accentFg : p.textMuted }}
            >
              {meta.label}
            </T>
          </View>
        ) : null}
      </View>
      <T variant="sm" color="muted">
        {s.room ?? "قاعة تُحدَّد لاحقاً"}
      </T>
    </Pressable>
  );
});
