/**
 * live — إدارة البث المباشر. Web parity: TeacherLivePage — the KPI strip,
 * «جلسة جديدة» (offering/title/topic/scheduledAt/joinUrl/description),
 * and the lifecycle actions (START/END/CANCEL via liveApi.lifecycle with
 * confirms on the destructive ones + Arabic toasts). The sessions list
 * is already teacher-scoped server-side (offering.teacherId).
 */
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { liveApi } from "@/api/live";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { dateTime, latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { KpiCard, LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  LIVE_STATUS_MAP,
  OfferingPicker,
  StatusBadge,
  arCount,
  useTeacherOfferings,
} from "@/features/teacher/components";

export default function TeacherLive() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];

  const sessions = useQuery({
    queryKey: ["live", "sessions", scope],
    queryFn: () => liveApi.sessions(),
    refetchInterval: 30_000,
  });

  const [creating, setCreating] = useState(false);
  const [offeringId, setOfferingId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "START" | "END" | "CANCEL"; title: string } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const effId = offeringId || offerings[0]?.id || "";
      if (effId === "") throw new Error("اختر مقرراً أولاً.");
      if (title.trim().length < 3) throw new Error("عنوان الجلسة حرفان على الأقل.");
      if (!schedDate) throw new Error("حدّد موعد الجلسة.");
      const t = Date.parse(`${schedDate}T${schedTime.trim() === "" ? "09:00" : schedTime}`);
      if (Number.isNaN(t)) throw new Error("قيمة الموعد غير صالحة.");
      return liveApi.create({
        offeringId: effId,
        title: title.trim(),
        topic: topic.trim() || undefined,
        description: description.trim() || undefined,
        scheduledAt: new Date(t).toISOString(),
        joinUrl: joinUrl.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      toast.success("جُدولت الجلسة وستظهر لطلاب المقرّر.", "تمّت الجدولة");
      setCreating(false);
      setTitle("");
      setTopic("");
      setSchedDate("");
      setSchedTime("");
      setJoinUrl("");
      setDescription("");
      setCreateError(null);
    },
    onError: (e) => setCreateError((e as Error).message),
  });

  const lifecycle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "START" | "END" | "CANCEL" }) =>
      liveApi.lifecycle(id, action),
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      setConfirmAction(null);
      if (vars.action === "START") toast.success("بدأ البث الآن — الطلاب يرون الجلسة مباشرة.", "بدء البث");
      else if (vars.action === "END") toast.success("انتهى البث — أصبحت الجلسة في السجل.", "انتهاء البث");
      else toast.success("أُلغيت الجلسة.", "إلغاء الجلسة");
    },
    onError: (e) => {
      setConfirmAction(null);
      toast.error((e as Error).message, "تعذَّر تحديث حالة الجلسة");
    },
  });

  const all = sessions.data ?? [];
  const live = useMemo(() => all.filter((s) => s.status === "LIVE"), [all]);
  const scheduled = useMemo(() => all.filter((s) => s.status === "SCHEDULED"), [all]);
  const past = useMemo(
    () => all.filter((s) => s.status === "ENDED" || s.status === "CANCELLED"),
    [all],
  );

  const SessionRow = ({
    session,
    onStart,
    onEnd,
    onCancel,
  }: {
    session: (typeof all)[number];
    onStart?: () => void;
    onEnd?: () => void;
    onCancel?: () => void;
  }) => (
    <LedgerRow accessibilityLabel={`جلسة ${session.title}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="medium" numberOfLines={1}>
            {session.title}
          </T>
          <T variant="xs" color="muted" numberOfLines={1}>
            {session.offering?.course?.code ?? ""}
            {session.topic ? ` · ${session.topic}` : ""} · {dateTime(session.scheduledAt)}
          </T>
        </View>
        <StatusBadge status={session.status} map={LIVE_STATUS_MAP} />
      </View>
      {onStart || onEnd || onCancel ? (
        <View style={{ flexDirection: "row", gap: sp[6] }}>
          {onStart ? <Button label="بدء" kind="accent" small onPress={onStart} /> : null}
          {onEnd ? <Button label="إنهاء" kind="primary" small onPress={onEnd} /> : null}
          {onCancel ? <Button label="إلغاء الجلسة" kind="ghost" small onPress={onCancel} /> : null}
        </View>
      ) : null}
    </LedgerRow>
  );

  return (
    <Screen scroll>
      <StackHeader title="إدارة البث المباشر" />
      <PageHeader
        title="إدارة البث المباشر"
        kicker="جدولة المحاضرات الحية وتشغيلها وإيقافها. الطلاب يرون فقط الجلسات الخاصة بمقرّراتهم."
      />
      <SectionBar
        index={1}
        title="حالة الجلسات"
        action={
          <Button label="جلسة جديدة" kind="accent" small onPress={() => setCreating(true)} />
        }
      />
      {sessions.isLoading ? (
        <SkeletonList rows={4} />
      ) : sessions.isError ? (
        <ErrorState message={(sessions.error as Error).message} onRetry={() => sessions.refetch()} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <KpiCard label="مباشرة الآن" value={live.length} />
            <KpiCard label="مجدولة" value={scheduled.length} />
            <KpiCard label="منتهية" value={past.length} />
          </View>

          {live.length > 0 ? (
            <>
              <SectionBar index={2} title="مباشرة الآن" />
              <RowList>
                {live.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onEnd={() => setConfirmAction({ id: s.id, action: "END", title: s.title })}
                  />
                ))}
              </RowList>
            </>
          ) : null}

          <SectionBar
            index={3}
            title="جلسات قادمة"
            action={
              scheduled.length > 0 ? (
                <Badge
                  label={arCount(scheduled.length, ["جلسة مجدولة واحدة", "جلستان مجدولتان", "جلسات مجدولة", "جلسة مجدولة"])}
                  tone="yellow"
                />
              ) : undefined
            }
          />
          {scheduled.length === 0 ? (
            <EmptyState title="لا توجد جلسات قادمة" message="أنشئ جلسة جديدة لتظهر هنا." actionLabel="جلسة جديدة" onAction={() => setCreating(true)} />
          ) : (
            <RowList>
              {scheduled.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onStart={() => lifecycle.mutate({ id: s.id, action: "START" })}
                  onCancel={() => setConfirmAction({ id: s.id, action: "CANCEL", title: s.title })}
                />
              ))}
            </RowList>
          )}

          {past.length > 0 ? (
            <>
              <SectionBar index={4} title="جلسات سابقة" />
              <RowList>
                {past.slice(0, 10).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </RowList>
              {past.length > 10 ? (
                <T variant="xs" color="faint">
                  أحدث {latn(10)} جلسات من أصل {latn(past.length)}
                </T>
              ) : null}
            </>
          ) : null}
        </>
      )}

      {/* جلسة جديدة. */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="جلسة بث جديدة">
        <View style={{ gap: sp[10] }}>
          <OfferingPicker
            offerings={offerings}
            value={offeringId || offerings[0]?.id || ""}
            onChange={setOfferingId}
            label="المقرّر"
            loading={offs.isLoading}
          />
          <Field
            label="عنوان الجلسة"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setCreateError(null);
            }}
            placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي"
            accessibilityLabel="عنوان الجلسة"
          />
          <Field
            label="الموضوع الفرعي (اختياري)"
            value={topic}
            onChangeText={setTopic}
            placeholder="مثال: الانحدار الخطي"
            accessibilityLabel="الموضوع الفرعي"
          />
          <Field
            label="موعد الجلسة — التاريخ"
            value={schedDate}
            onChangeText={(v) => {
              setSchedDate(v);
              setCreateError(null);
            }}
            hint="بصيغة YYYY-MM-DD"
            accessibilityLabel="تاريخ الجلسة"
          />
          <Field
            label="موعد الجلسة — الوقت"
            value={schedTime}
            onChangeText={setSchedTime}
            hint="بصيغة HH:MM"
            accessibilityLabel="وقت الجلسة"
          />
          <Field
            label="رابط الانضمام (اختياري)"
            value={joinUrl}
            onChangeText={setJoinUrl}
            hint="Zoom / BigBlueButton / Jitsi"
            accessibilityLabel="رابط الانضمام"
          />
          <Field
            label="وصف (اختياري)"
            value={description}
            onChangeText={setDescription}
            placeholder="الموضوعات التي ستغطّيها الجلسة…"
            accessibilityLabel="الوصف"
          />
          {createError ? (
            <T variant="sm" color="danger">
              {createError}
            </T>
          ) : null}
          <Button
            label={create.isPending ? "جارٍ الإنشاء…" : "جدولة الجلسة"}
            kind="accent"
            loading={create.isPending}
            disabled={offerings.length === 0}
            onPress={() => {
              setCreateError(null);
              create.mutate();
            }}
          />
        </View>
      </Sheet>

      {/* Lifecycle confirms — END and CANCEL are destructive. */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.action === "END" ? "إنهاء البث" : "إلغاء الجلسة"}
        message={
          confirmAction?.action === "END"
            ? `إنهاء «${confirmAction?.title ?? ""}» ينهي البث للطلاب فورًا وتنتقل الجلسة إلى السجل. هل تريد الإنهاء؟`
            : `إلغاء «${confirmAction?.title ?? ""}» يحذفها من جدول الطلاب. هل تريد الإلغاء؟`
        }
        confirmLabel={confirmAction?.action === "END" ? "إنهاء" : "إلغاء الجلسة"}
        danger={confirmAction?.action === "CANCEL"}
        loading={lifecycle.isPending}
        onConfirm={() => confirmAction && lifecycle.mutate(confirmAction)}
        onCancel={() => setConfirmAction(null)}
      />
    </Screen>
  );
}
