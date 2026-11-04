import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import Clock from "lucide-react-native/icons/clock";
import Video from "lucide-react-native/icons/video";
import { liveApi } from "@/api/live";
import type { LiveSession } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { useNow } from "@/hooks/useNow";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { dateTime, num, weekdayOf } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { LIVE_STATUS, SectionNote, countAr } from "@/features/student/more";

/**
 * /student/webinars — ندوات قادمة (web WebinarsPage parity): the honest
 * upcoming-schedule view over the same live-sessions payload — upcoming
 * rows only, no join action (the live screen owns joining).
 */
export default function WebinarsScreen() {
  const now = useNow(60_000);
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
        .filter((s) => s.status === "SCHEDULED" && new Date(s.scheduledAt).getTime() > now)
        .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [feed.data, now],
  );

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="ندوات قادمة" kicker="الندوات وورش العمل" />
      <DataList
        data={upcoming}
        renderItem={({ item }) => <UpcomingRow session={item} />}
        keyExtractor={(s) => s.id}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        emptySlot={
          <EmptyState
            icon={<CalendarClock size={24} color={p.textFaint} />}
            title="لا توجد جلسات مباشرة مجدولة الآن"
            message="عندما يبدأ أستاذك بثّاً مباشراً ستجده هنا وفي صفحة البثّ — مع التسجيلات بعد انتهاء الجلسة."
            actionLabel="زيارة صفحة البثّ"
            onAction={() => router.push("/student/live" as never)}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], paddingBottom: sp[8] }}>
            <SectionNote>
              جدول البثّ المباشر لمقرّراتك — المباشرة منها تجري في صفحة البثّ مع زر الانضمام.
            </SectionNote>
          </View>
        }
        contentPadding={{ horizontal: 16, bottom: 24 }}
        style={{ flex: 1 }}
      />

      {/* Pinned action row — the live-page link stays reachable without scrolling. */}
      {upcoming.length > 0 ? (
        <View
          style={{
            paddingHorizontal: sp[16],
            paddingVertical: sp[10],
            gap: sp[8],
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: p.rule,
          }}
        >
          <T variant="xs" color="faint">
            {`${countAr(upcoming.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} · فعاليّات قادمة: ${num(upcoming.length)}`}
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
    </Screen>
  );
}

function UpcomingRow({ session }: { session: LiveSession }) {
  const p = usePalette();
  const status = LIVE_STATUS[session.status] ?? { label: "حالة غير معروفة", tone: "grey" as const };
  const course = session.offering?.course;
  return (
    <LedgerRow accessibilityLabel={`جلسة قادمة: ${session.title}`}>
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
