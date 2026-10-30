import { useMemo } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Clock, Video } from "lucide-react-native";
import { liveApi } from "@/api/live";
import type { LiveSession } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dateTime, num, weekdayOf } from "@/lib/format";
import { LIVE_STATUS, SectionNote, countAr } from "@/features/student/more";

/**
 * /student/webinars — ندوات قادمة (web WebinarsPage parity): the honest
 * upcoming-schedule view over the same live-sessions payload — upcoming
 * rows only, no join action (the live screen owns joining).
 */
export default function WebinarsScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["live", "sessions", scope],
    queryFn: () => liveApi.sessions(),
    refetchInterval: 30_000,
    placeholderData: (p) => p,
  });
  const upcoming = useMemo(
    () =>
      (feed.data ?? [])
        .filter((s) => s.status === "SCHEDULED" && new Date(s.scheduledAt).getTime() > Date.now())
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [feed.data],
  );

  return (
    <Screen scroll>
      <StackHeader title="ندوات قادمة" kicker="الندوات وورش العمل" />
      <SectionNote>
        جدول البثّ المباشر لمقرّراتك — المباشرة منها تجري في صفحة البثّ مع زر الانضمام.
      </SectionNote>

      {feed.isLoading ? (
        <SkeletonList rows={3} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={24} color={p.textFaint} />}
          title="لا توجد جلسات مباشرة مجدولة الآن"
          message="عندما يبدأ أستاذك بثّاً مباشراً ستجده هنا وفي صفحة البثّ — مع التسجيلات بعد انتهاء الجلسة."
          actionLabel="زيارة صفحة البثّ"
          onAction={() => router.push("/student/live" as never)}
        />
      ) : (
        <RowList>
          {upcoming.map((s, i) => (
            <UpcomingRow key={s.id} session={s} last={i === upcoming.length - 1} />
          ))}
        </RowList>
      )}
      {upcoming.length > 0 ? (
        <View style={{ gap: sp[8] }}>
          <T variant="xs" color="faint">
            {countAr(upcoming.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}
          </T>
          <Button
            label="فتح صفحة البثّ"
            kind="ghost"
            small
            onPress={() => router.push("/student/live" as never)}
            icon={<Video size={16} color={p.text} />}
          />
        </View>
      ) : null}
      <T variant="xs" color="faint">
        {`فعاليّات قادمة: ${num(upcoming.length)}`}
      </T>
    </Screen>
  );
}

function UpcomingRow({ session, last }: { session: LiveSession; last: boolean }) {
  const p = usePalette();
  const status = LIVE_STATUS[session.status] ?? { label: session.status, tone: "grey" as const };
  const course = session.offering?.course;
  return (
    <LedgerRow last={last} accessibilityLabel={`جلسة قادمة: ${session.title}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
        <Badge label={status.label} tone={status.tone} />
        {session.topic ? <Badge label={session.topic} tone="grey" /> : null}
      </View>
      <T variant="bodyLg" weight="bold">
        {session.title}
      </T>
      <T variant="sm" color="secondary">
        {course ? `${course.code} — ${course.name}` : "مقرّرك"}
      </T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
        <Clock size={12} color={p.textMuted} />
        <T variant="xs" color="muted">
          {`${weekdayOf(session.scheduledAt)} · ${dateTime(session.scheduledAt)}`}
        </T>
      </View>
      <T variant="xs" color="faint">
        يفتح باب الانضمام قبل الموعد بـ10 دقائق من صفحة البثّ.
      </T>
    </LedgerRow>
  );
}
