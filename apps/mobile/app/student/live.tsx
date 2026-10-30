import { useMemo, useState } from "react";
import { View , Linking } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, MonitorPlay } from "lucide-react-native";
import { liveApi } from "@/api/live";
import type { LiveSession } from "@/api/types";
import { ApiError } from "@/api/client";
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
import { toast } from "@/components/ui/toast";
import { dateTime, latn, num } from "@/lib/format";
import { LIVE_STATUS, SectionNote, countAr, fmtClock } from "@/features/student/more";

/** The backend opens the join window 10 minutes before the scheduled time. */
const JOIN_WINDOW_MS = 10 * 60 * 1000;

function joinHint(s: LiveSession): string {
  const scheduled = new Date(s.scheduledAt).getTime();
  const opensAt = scheduled - JOIN_WINDOW_MS;
  const now = Date.now();
  if (s.status === "LIVE") return "على الهواء الآن — انضمّ قبل انتهاء الجلسة.";
  if (now >= opensAt) return "باب الانضمام مفتوح — يبدأ البث عند الموعد.";
  const waitMs = opensAt - now;
  if (waitMs <= 60 * 60 * 1000) return `يفتح الانضمام بعد ${fmtClock(waitMs / 1000)} (قبل الموعد بـ10 دقائق).`;
  return `يفتح الانضمام ${dateTime(new Date(opensAt).toISOString())} (قبل الموعد بـ10 دقائق).`;
}

/**
 * /student/live — الحصص المباشرة (web LivePage parity, watch-only):
 * live/upcoming/ended sections with the honest status chips, the
 * 10-minutes-early join window hint, attendance-recorded join that
 * opens the Jitsi room in an external browser (disclosed).
 */
export default function LiveScreen() {
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["live", "sessions", scope],
    queryFn: () => liveApi.sessions(),
    refetchInterval: 30_000,
    placeholderData: (p) => p,
  });
  const list = useMemo(() => feed.data ?? [], [feed.data]);
  const live = list.filter((s) => s.status === "LIVE");
  const upcoming = list.filter((s) => s.status === "SCHEDULED");
  const ended = list.filter((s) => s.status === "ENDED" || s.status === "CANCELLED").slice(0, 8);

  const join = useMutation({
    mutationFn: (id: string) => liveApi.join(id),
    onSuccess: (res) => {
      toast.success("سُجّل حضورك.", "تمّ الانضمام");
      const url = res?.session?.joinUrl ?? null;
      if (url) {
        void Linking.openURL(url).catch(() => toast.error("تعذّر فتح الغرفة الخارجية."));
      }
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر الانضمام"),
  });

  return (
    <Screen scroll>
      <StackHeader title="الحصص المباشرة" kicker="البث المباشر" />
      <SectionNote>
        الجلسات الحيّة لمقرّراتك المسجَّلة — تُفتح الغرفة عبر متصفح خارجي (Jitsi)، ويُسجَّل حضورك تلقائياً.
      </SectionNote>

      {feed.isLoading ? (
        <SkeletonList rows={4} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          title="لا توجد بثوث بعد"
          message="لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً."
        />
      ) : (
        <View style={{ gap: sp[16] }}>
          <SessionSection
            title="مباشرة الآن"
            sessions={live}
            emptyLabel="لا بثّ مباشرة الآن"
            emptyNote="لا توجد جلسات نشطة لمقرراتك في هذه اللحظة؛ راجع الجلسات القادمة أدناه."
            onJoin={live.length > 0 ? (id) => join.mutate(id) : undefined}
            joinPending={join.isPending ? join.variables ?? null : null}
          />
          <SessionSection
            title="جلسات قادمة"
            sessions={upcoming}
            emptyLabel="لا توجد جلسات مجدولة"
            emptyNote="سيظهر هنا أي بثّ يجدوله أساتذتك."
          />
          {ended.length > 0 ? (
            <SessionSection title="جلسات منتهية" sessions={ended} emptyLabel="" emptyNote="" />
          ) : null}
        </View>
      )}
      <T variant="xs" color="faint">
        {`مباشرة: ${num(live.length)} · قادمة: ${num(upcoming.length)} · منتهية: ${num(list.filter((s) => s.status === "ENDED").length)}`}
      </T>
    </Screen>
  );
}

function SessionSection({
  title,
  sessions,
  emptyLabel,
  emptyNote,
  onJoin,
  joinPending,
}: {
  title: string;
  sessions: LiveSession[];
  emptyLabel: string;
  emptyNote: string;
  onJoin?: (id: string) => void;
  joinPending?: string | null;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: sp[8] }}>
      <T variant="h4" weight="bold">
        {title}
      </T>
      {sessions.length === 0 ? (
        emptyLabel ? (
          <EmptyState title={emptyLabel} message={emptyNote} />
        ) : null
      ) : (
        <RowList>
          {sessions.map((s, i) => {
            const status = LIVE_STATUS[s.status] ?? { label: s.status, tone: "grey" as const };
            const course = s.offering?.course;
            return (
              <LedgerRow key={s.id} last={i === sessions.length - 1} accessibilityLabel={`جلسة: ${s.title}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
                  <Badge label={status.label} tone={status.tone} />
                  {s.topic ? <Badge label={s.topic} tone="grey" /> : null}
                </View>
                <T variant="bodyLg" weight="bold">
                  {s.title}
                </T>
                <T variant="sm" color="secondary">
                  {course ? `${course.code} — ${course.name}` : "مقرّرك"}
                </T>
                <T variant="xs" color="muted">
                  {dateTime(s.scheduledAt)}
                </T>
                {s.status === "LIVE" || s.status === "SCHEDULED" ? (
                  <T variant="xs" color="accentInk">
                    {joinHint(s)}
                  </T>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], alignSelf: "flex-start" }}>
                  {s.status === "LIVE" && onJoin ? (
                    <Button
                      label={joinPending === s.id ? "جارٍ الانضمام…" : "انضمام"}
                      kind="primary"
                      small
                      loading={joinPending === s.id}
                      disabled={!s.joinUrl}
                      onPress={() => onJoin(s.id)}
                      icon={<MonitorPlay size={14} color={p.accentFg} />}
                      accessibilityLabel={`انضمام إلى ${s.title}`}
                    />
                  ) : null}
                  {s.status === "ENDED" && s.recordingUrl ? (
                    <Button
                      label="التسجيل"
                      kind="ghost"
                      small
                      onPress={() => {
                        void Linking.openURL(s.recordingUrl!).catch(() => toast.error("تعذّر فتح التسجيل."));
                      }}
                      icon={<ExternalLink size={14} color={p.text} />}
                    />
                  ) : null}
                </View>
                {s.status === "LIVE" && s.joinUrl ? (
                  <T variant="xs" color="faint">
                    تُفتح الغرفة عبر متصفح خارجي (Jitsi) — الحضور يُسجَّل تلقائياً.
                  </T>
                ) : null}
              </LedgerRow>
            );
          })}
        </RowList>
      )}
      {sessions.length > 0 ? (
        <T variant="xs" color="faint">
          {countAr(sessions.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}
        </T>
      ) : null}
    </View>
  );
}
