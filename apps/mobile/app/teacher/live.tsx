/**
 * live — إدارة البث المباشر. Web parity: TeacherLivePage — the KPI strip,
 * «جلسة جديدة» (offering/title/topic/scheduledAt/joinUrl/description),
 * and the lifecycle actions (START/END/CANCEL via liveApi.lifecycle with
 * ConfirmSheet on the destructive ones + Arabic toasts + haptics on every
 * state transition). The sessions list is already teacher-scoped
 * server-side (offering.teacherId).
 *
 * Attendee honesty: the live API has no live-attendee feed — rows show
 * the offering's enrolled count («طلاب المقرّر N»), never a live number.
 *
 * R341 M10 — one-primary discipline (M2 flagged this screen): «بدء البث»
 * is the ONE primary per actionable row — charcoal slab, full 48px floor,
 * primaryFg-bound icon (mirrors the student live join slab). END and
 * CANCEL demote to hairline ghosts (each already confirm-gated), and the
 * screen keeps exactly one orange signal: the «جلسة جديدة» create CTA.
 */
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Play from "lucide-react-native/icons/play";
import { StackHeader } from "@/components/shell/AppTopBar";
import { liveApi } from "@/api/live";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { dateTime, latn } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { AppSheet, ConfirmSheet, SheetTextInput } from "@/components/ui/sheet";
import { KpiCard, LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  LIVE_STATUS_MAP,
  OfferingPicker,
  StatusBadge,
  arCount,
  useSheetMounted,
  useTeacherOfferings,
} from "@/features/teacher/components";

const NO_SESSIONS: Awaited<ReturnType<typeof liveApi.sessions>> = [];

/** Labeled sheet input — SheetTextInput so the sheet tracks the keyboard. */
function SheetField({
  label,
  value,
  onChangeText,
  hint,
  placeholder,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  hint?: string;
  placeholder?: string;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: sp[6] }}>
      <T variant="sm" weight="medium" color="secondary">
        {label}
      </T>
      <SheetTextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        style={{
          backgroundColor: p.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          paddingHorizontal: sp[12],
          minHeight: 48,
          color: p.text,
          fontSize: 15,
          textAlign: "right",
        }}
      />
      {hint ? (
        <T variant="xs" color="muted">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

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

  /* Net-safe sheet mounts: the native sheet graph (bottom-sheet → RNGH v3)
   * loads on the first sheet RENDER — gates keep signed-out render nets
   * (which never open a sheet) from ever mounting it. See useSheetMounted. */
  const createSheetMounted = useSheetMounted(creating);
  const confirmSheetMounted = useSheetMounted(confirmAction !== null);

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
      haptics.notify("success");
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
    onError: (e) => {
      haptics.notify("error");
      setCreateError(humanizeError(e));
    },
  });

  const lifecycle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "START" | "END" | "CANCEL" }) =>
      liveApi.lifecycle(id, action),
    onSuccess: (_row, vars) => {
      haptics.notify("success");
      qc.invalidateQueries({ queryKey: ["live", "sessions"] });
      setConfirmAction(null);
      if (vars.action === "START") toast.success("بدأ البث الآن — الطلاب يرون الجلسة مباشرة.", "بدء البث");
      else if (vars.action === "END") toast.success("انتهى البث — أصبحت الجلسة في السجل.", "انتهاء البث");
      else toast.success("أُلغيت الجلسة.", "إلغاء الجلسة");
    },
    onError: (e) => {
      haptics.notify("error");
      setConfirmAction(null);
      toast.error(humanizeError(e), "تعذَّر تحديث حالة الجلسة");
    },
  });

  const all = sessions.data ?? NO_SESSIONS;
  const live = useMemo(() => all.filter((s) => s.status === "LIVE"), [all]);
  const scheduled = useMemo(() => all.filter((s) => s.status === "SCHEDULED"), [all]);
  const past = useMemo(
    () => all.filter((s) => s.status === "ENDED" || s.status === "CANCELLED"),
    [all],
  );
  /** Enrolled students per offering — the honest «طلاب المقرّر» count. */
  const enrolledByOffering = useMemo(() => {
    const m = new Map<string, number | undefined>();
    for (const o of offerings) m.set(o.id, o.studentsCount);
    return m;
  }, [offerings]);

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
  }) => {
    const enrolled = enrolledByOffering.get(session.offeringId);
    const p = usePalette();
    return (
      <LedgerRow accessibilityLabel={`جلسة ${session.title}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <T variant="body" weight="medium" numberOfLines={1}>
              {session.title}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {session.offering?.course?.code ?? ""}
              {session.topic ? ` · ${session.topic}` : ""} · {dateTime(session.scheduledAt)}
              {enrolled !== undefined ? ` · ${arCount(enrolled, ["طالب واحد في المقرّر", "طالبان في المقرّر", "طلاب المقرّر", "طالباً في المقرّر"])}` : ""}
            </T>
          </View>
          <StatusBadge status={session.status} map={LIVE_STATUS_MAP} />
        </View>
        {onStart || onEnd || onCancel ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
            {onCancel ? <Button label="إلغاء الجلسة" kind="ghost" small onPress={onCancel} /> : null}
            {onEnd ? <Button label="إنهاء البث" kind="ghost" small onPress={onEnd} /> : null}
            {onStart ? (
              <Button
                label="بدء البث"
                kind="primary"
                icon={<Play size={16} color={p.primaryFg} />}
                accessibilityLabel={`بدء بث ${session.title}`}
                onPress={onStart}
              />
            ) : null}
          </View>
        ) : null}
      </LedgerRow>
    );
  };

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
        <ErrorState message={humanizeError(sessions.error)} onRetry={() => sessions.refetch()} />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <KpiCard label="مباشرة الآن" value={live.length} tone={live.length > 0 ? "accent" : undefined} />
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
              <T variant="xs" color="faint">
                تحدَّث الحالة تلقائيًا كل {latn(30)} ثانية.
              </T>
            </>
          ) : (
            <T variant="sm" color="muted">
              لا يوجد بث مباشر الآن — ابدأ جلسة مجدولة أو أنشئ جلسة جديدة.
            </T>
          )}

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
            <EmptyState fill title="لا توجد جلسات قادمة" message="أنشئ جلسة جديدة لتظهر هنا." actionLabel="جلسة جديدة" onAction={() => setCreating(true)} />
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

      {/* جلسة جديدة — AppSheet (keyboard-aware SheetTextInput fields). */}
      {createSheetMounted ? (
      <AppSheet
        open={creating}
        onClose={() => setCreating(false)}
        title="جلسة بث جديدة"
        snap="lg"
        dynamic={false}
        scrollable
        footer={
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
        }
      >
        <View style={{ gap: sp[10] }}>
          <OfferingPicker
            offerings={offerings}
            value={offeringId || offerings[0]?.id || ""}
            onChange={setOfferingId}
            label="المقرّر"
            loading={offs.isLoading}
          />
          <SheetField
            label="عنوان الجلسة"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setCreateError(null);
            }}
            placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي"
            accessibilityLabel="عنوان الجلسة"
          />
          <SheetField
            label="الموضوع الفرعي (اختياري)"
            value={topic}
            onChangeText={setTopic}
            placeholder="مثال: الانحدار الخطي"
            accessibilityLabel="الموضوع الفرعي"
          />
          <SheetField
            label="موعد الجلسة — التاريخ"
            value={schedDate}
            onChangeText={(v) => {
              setSchedDate(v);
              setCreateError(null);
            }}
            hint="بصيغة YYYY-MM-DD"
            accessibilityLabel="تاريخ الجلسة"
          />
          <SheetField
            label="موعد الجلسة — الوقت"
            value={schedTime}
            onChangeText={setSchedTime}
            hint="بصيغة HH:MM"
            accessibilityLabel="وقت الجلسة"
          />
          <SheetField
            label="رابط الانضمام (اختياري)"
            value={joinUrl}
            onChangeText={setJoinUrl}
            hint="Zoom / BigBlueButton / Jitsi"
            accessibilityLabel="رابط الانضمام"
          />
          <SheetField
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
        </View>
      </AppSheet>
      ) : null}

      {/* Lifecycle confirms — END and CANCEL are destructive (ConfirmSheet). */}
      {confirmSheetMounted ? (
      <ConfirmSheet
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.action === "END" ? "إنهاء البث" : "إلغاء الجلسة"}
        message={
          confirmAction?.action === "END"
            ? `إنهاء «${confirmAction?.title ?? ""}» ينهي البث للطلاب فورًا وتنتقل الجلسة إلى السجل. هل تريد الإنهاء؟`
            : `إلغاء «${confirmAction?.title ?? ""}» يحذفها من جدول الطلاب. هل تريد الإلغاء؟`
        }
        confirmLabel={confirmAction?.action === "END" ? "إنهاء" : "إلغاء الجلسة"}
        destructive={confirmAction?.action === "CANCEL"}
        loading={lifecycle.isPending}
        onConfirm={() => confirmAction && lifecycle.mutate(confirmAction)}
      />
      ) : null}
    </Screen>
  );
}
