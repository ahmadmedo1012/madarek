/**
 * /student/schedule — الجدول الأسبوعي (web SchedulePage parity,
 * mobile-recomposed): every enrollment's schedule slots flattened and
 * grouped by day; a day filter (Segmented, today first) narrows the
 * ledger. Rows carry the course code+name, the time range and the room.
 */
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { learningApi } from "@/api/learning";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/fields";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { AR_DAYS, dayName } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { PushFrame, tripoliDow } from "@/features/student/components";

interface DaySlot {
  dow: number;
  startTime: string;
  endTime: string;
  room: string | null;
  courseName: string;
  courseCode: string;
  offeringId: string;
}

export default function ScheduleScreen() {
  const scope = useInstitutionScope();
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

  const daysWithItems = useMemo(
    () => [...byDay.keys()].sort((a, b) => a - b),
    [byDay],
  );
  const todayDow = tripoliDow();
  const defaultDay = daysWithItems.includes(todayDow) ? String(todayDow) : "all";
  const [selected, setSelected] = useState(defaultDay);

  const totalSlots = daysWithItems.reduce((sum, d) => sum + (byDay.get(d)?.length ?? 0), 0);
  const visible =
    selected === "all"
      ? daysWithItems.flatMap((d) => byDay.get(d) ?? [])
      : byDay.get(Number(selected)) ?? [];

  const filterOptions = [
    { id: "all", label: "الكل" },
    ...daysWithItems.map((d) => ({ id: String(d), label: dayName(d) })),
  ];

  return (
    <PushFrame
      title="الجدول الأسبوعي"
      kicker={`${countAr(totalSlots, ["حصة أسبوعياً واحدة", "حصتان أسبوعياً", "حصص أسبوعياً", "حصة أسبوعياً"])}`}
      refreshing={feed.isFetching && !feed.isLoading}
      onRefresh={() => feed.refetch()}
    >
      {feed.isLoading ? (
        <SkeletonList rows={6} rowHeight={64} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : daysWithItems.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول مسجّل"
          message="ستظهر محاضراتك هنا فور أن يُسجَّل الجدول لمقرّراتك."
        />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minHeight: 44 }}>
            <Segmented
              options={filterOptions}
              selectedId={selected}
              onSelect={setSelected}
              style={{ minWidth: Math.max(320, filterOptions.length * 92) }}
            />
          </ScrollView>

          {selected === "all" ? (
            <View style={{ gap: sp[16] }}>
              {daysWithItems.map((d) => (
                <DaySection key={d} dow={d} slots={byDay.get(d) ?? []} todayDow={todayDow} />
              ))}
            </View>
          ) : (
            <View style={{ gap: sp[8] }}>
              <SectionBar index={1} title={dayName(Number(selected))} />
              <SlotList slots={visible} />
            </View>
          )}

          <T variant="xs" color="faint">
            {`أيام الدراسة: ${daysWithItems.map((d) => AR_DAYS[d]).join(" · ")}`}
          </T>
        </>
      )}
    </PushFrame>
  );
}

function DaySection({ dow, slots, todayDow }: { dow: number; slots: DaySlot[]; todayDow: number }) {
  return (
    <View style={{ gap: sp[8] }}>
      <SectionBar
        index={dow + 1}
        title={dayName(dow)}
        action={dow === todayDow ? <T variant="xs" color="accentInk">اليوم</T> : undefined}
      />
      <SlotList slots={slots} />
    </View>
  );
}

function SlotList({ slots }: { slots: DaySlot[] }) {
  if (slots.length === 0) {
    return (
      <T variant="sm" color="muted">
        لا حصص في هذا اليوم.
      </T>
    );
  }
  return (
    <RowList>
      {slots.map((s, i) => (
        <LedgerRow
          key={`${s.offeringId}-${s.startTime}-${i}`}
          last={i === slots.length - 1}
          accessibilityLabel={`حصة ${s.courseName}`}
          onPress={() => router.push(`/student/courses/${s.offeringId}` as never)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <MonoLabel>{`${s.startTime}–${s.endTime}`}</MonoLabel>
            <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
              {`${s.courseCode} — ${s.courseName}`}
            </T>
          </View>
          <T variant="sm" color="muted">
            {s.room ?? "قاعة تُحدَّد لاحقاً"}
          </T>
        </LedgerRow>
      ))}
    </RowList>
  );
}
