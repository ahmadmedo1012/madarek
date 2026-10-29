/**
 * (tabs)/schedule — جدول المحاضرات. Web parity: TeacherSchedulePage
 * (dayName sections + «اليوم» marker + slot rows with time/room/code).
 */
import { useMemo } from "react";
import { View } from "react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { dayName } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { arCount, useTeacherOfferings } from "@/features/teacher/components";

type Slot = {
  startTime: string;
  endTime: string;
  courseName: string;
  courseCode: string;
  room: string | null;
  enrolled?: number;
};

export default function TeacherSchedule() {
  const offs = useTeacherOfferings();

  const days = useMemo(() => {
    const byDay = new Map<number, Slot[]>();
    for (const o of offs.data ?? []) {
      const count = o.studentsCount ?? undefined;
      for (const slot of o.schedule ?? []) {
        const bucket = byDay.get(slot.dayOfWeek) ?? [];
        bucket.push({
          startTime: slot.startTime,
          endTime: slot.endTime,
          courseName: o.course.name,
          courseCode: o.course.code,
          room: slot.room ?? null,
          enrolled: count,
        });
        byDay.set(slot.dayOfWeek, bucket);
      }
    }
    for (const list of byDay.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return [...byDay.entries()]
      .map(([dow, items]) => ({ dow, items }))
      .filter((d) => d.items.length > 0)
      .sort((a, b) => a.dow - b.dow);
  }, [offs.data]);

  const todayDow = new Date().getDay();

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader title="جدول المحاضرات" kicker="جدولك الأسبوعيّ مع القاعات والأوقات." />
      {offs.isLoading ? (
        <SkeletonList rows={5} />
      ) : offs.isError ? (
        <ErrorState message={(offs.error as Error).message} onRetry={() => offs.refetch()} />
      ) : days.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول مسجَّل"
          message="ستظهر محاضراتك هنا فور تسجيل الجداول لمقرّراتك من قِبَل المسجل العام."
        />
      ) : (
        days.map((d, di) => (
          <View key={d.dow} style={{ gap: sp[8] }}>
            <SectionBar
              index={di + 1}
              title={dayName(d.dow)}
              action={d.dow === todayDow ? <Badge label="اليوم" tone="copper" /> : undefined}
            />
            <RowList>
              {d.items.map((it, i) => (
                <LedgerRow
                  key={`${d.dow}:${i}`}
                  last={i === d.items.length - 1}
                  accessibilityLabel={`${it.courseName} ${it.startTime}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="medium" numberOfLines={1}>
                        {it.courseName}
                      </T>
                      <T variant="xs" color="muted">
                        {it.room ? `${it.room} · ` : ""}
                        {it.enrolled === undefined
                          ? ""
                          : it.enrolled === 0
                            ? "لا طلاب مسجَّلين"
                            : arCount(it.enrolled, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}
                      </T>
                    </View>
                    <T variant="sm" color="secondary">
                      {`${it.startTime} — ${it.endTime}`}
                    </T>
                    <Badge label={it.courseCode} tone="grey" mono />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          </View>
        ))
      )}
    </Screen>
  );
}
