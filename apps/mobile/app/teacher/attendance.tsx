/**
 * attendance — الحضور والغياب. Web parity: AttendancePage (session card:
 * offering + date + topic; the 4-state roll call; live summary counts;
 * the save button posts one record per student).
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { useStatusTones } from "@/design/theme";
import { sp, toneForAttendanceStatus } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { OfferingPicker, toRosterEntry, useTeacherOfferings } from "@/features/teacher/components";

type AttStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

const ATT_OPTIONS: { v: AttStatus; label: string }[] = [
  { v: "PRESENT", label: "حاضر" },
  { v: "LATE", label: "متأخر" },
  { v: "ABSENT", label: "غائب" },
  { v: "EXCUSED", label: "بعذر" },
];

/** 'YYYY-MM-DD' of the client-local day (the roll-call default). */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function StatusToggle({
  status,
  value,
  onPick,
  name,
}: {
  status: AttStatus;
  value: AttStatus;
  onPick: (s: AttStatus) => void;
  name: string;
}) {
  const tones = useStatusTones();
  const on = value === status;
  const t = tones[toneForAttendanceStatus(status)];
  const label = ATT_OPTIONS.find((o) => o.v === status)?.label ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`حضور ${name}: ${label}`}
      accessibilityState={{ selected: on }}
      onPress={() => onPick(status)}
      style={{
        minHeight: 44,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: sp[8],
        backgroundColor: on ? t.bg : "transparent",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: on ? t.ink : "rgba(0,0,0,0.12)",
        flex: 1,
      }}
    >
      <T variant="sm" weight={on ? "bold" : "medium"} style={on ? { color: t.ink } : undefined}>
        {label}
      </T>
    </Pressable>
  );
}

function SummaryBar({ label, ratio, tone }: { label: string; ratio: number; tone: "mint" | "yellow" | "rose" | "sky" }) {
  const tones = useStatusTones();
  return (
    <View style={{ gap: sp[4] }}>
      <T variant="sm" color="secondary">
        {label}
      </T>
      <View style={{ height: 6, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <View
          style={{
            height: 6,
            width: `${Math.min(1, Math.max(0, ratio)) * 100}%`,
            backgroundColor: tones[tone].ink,
          }}
        />
      </View>
    </View>
  );
}

export default function Attendance() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";
  const offering = offerings.find((o) => o.id === effectiveId) ?? null;

  const [date, setDate] = useState<string>(() => localDayKey(new Date()));
  const [dateError, setDateError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttStatus>>({});

  const roster = useQuery({
    queryKey: ["teacher", "offering", effectiveId, "students", scope],
    queryFn: () => teacherApi.students(effectiveId),
    enabled: effectiveId !== "",
  });

  const rows = useMemo(() => (roster.data ?? []).map(toRosterEntry), [roster.data]);
  const counts = useMemo(() => {
    let present = 0,
      late = 0,
      absent = 0,
      excused = 0;
    for (const r of rows) {
      const st = statusByStudent[r.id] ?? "PRESENT";
      if (st === "PRESENT") present++;
      else if (st === "LATE") late++;
      else if (st === "ABSENT") absent++;
      else excused++;
    }
    return { present, late, absent, excused, total: rows.length };
  }, [rows, statusByStudent]);

  const save = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("حدّد تاريخ الجلسة قبل الحفظ.");
      return teacherApi.attendance(effectiveId, {
        date: new Date(`${date}T12:00:00`).toISOString(),
        topic: topic.trim() || undefined,
        records: rows.map((r) => ({
          studentId: r.id,
          status: statusByStudent[r.id] ?? "PRESENT",
        })),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("تمّ حفظ سجلّ الحضور لهذا التاريخ.", "تمّ الحفظ");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الحفظ"),
  });

  return (
    <Screen scroll>
      <StackHeader title="الحضور والغياب" />
      <PageHeader
        title="الحضور والغياب"
        kicker="سجِّل الحضور لكلّ محاضرة. يحفظ سجلّاً واحداً لكلّ تاريخ في قاعدة البيانات."
      />

      {/* الجلسة — offering + date + topic. */}
      <SectionBar index={1} title="الجلسة" />
      {offs.isLoading ? (
        <T variant="body" color="muted">جارٍ تحميل مقرّراتك…</T>
      ) : offs.isError ? (
        <ErrorState message={(offs.error as Error).message} onRetry={() => offs.refetch()} compact />
      ) : offerings.length === 0 ? (
        <EmptyState title="لا توجد مقرّرات" message="ستظهر المقرّرات هنا حين تُسنَد إليك." />
      ) : (
        <>
          <OfferingPicker offerings={offerings} value={effectiveId} onChange={setOfferingId} label="المقرّر" />
          <Field
            label="تاريخ الجلسة"
            value={date}
            onChangeText={(v) => {
              setDate(v);
              setDateError(null);
            }}
            hint="بصيغة YYYY-MM-DD — افتراضيًا اليوم"
            error={dateError}
            accessibilityLabel="تاريخ الجلسة"
          />
          <Field
            label="الموضوع (اختياريّ)"
            value={topic}
            onChangeText={setTopic}
            placeholder="مثال: مقدّمة في UML"
            accessibilityLabel="الموضوع"
          />

          {/* الطلاب — the roll call. */}
          <SectionBar
            index={2}
            title={offering ? `طلاب ${offering.course.name}` : "الطلاب"}
            action={
              <T variant="sm" color="muted">
                حاضر {latn(counts.present)} · متأخر {latn(counts.late)} · غائب {latn(counts.absent)} · بعذر {latn(counts.excused)}
              </T>
            }
          />
          {roster.isLoading ? (
            <SkeletonList rows={4} />
          ) : roster.isError ? (
            <ErrorState message={(roster.error as Error).message} onRetry={() => roster.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="لا يوجد طلاب" message="لا توجد تسجيلات نشطة في هذا المقرّر بعد." />
          ) : (
            <>
              <RowList>
                {rows.map((r, i) => (
                  <View
                    key={r.id}
                    style={{
                      paddingHorizontal: sp[16],
                      paddingVertical: sp[12],
                      gap: sp[8],
                      borderBottomWidth: i === rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                      borderColor: "rgba(0,0,0,0.08)",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium" numberOfLines={1}>
                          {r.name}
                        </T>
                        <T variant="xs" color="muted">
                          {r.universityId}
                        </T>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: sp[6] }}>
                      {ATT_OPTIONS.map((opt) => (
                        <StatusToggle
                          key={opt.v}
                          status={opt.v}
                          value={statusByStudent[r.id] ?? "PRESENT"}
                          onPick={(s) => setStatusByStudent((m) => ({ ...m, [r.id]: s }))}
                          name={r.name}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </RowList>

              {/* إحصائيّات الجلسة — the live summary bars. */}
              <Card>
                <T variant="h4" weight="bold">إحصائيّات الجلسة</T>
                <View style={{ gap: sp[10], paddingTop: sp[8] }}>
                  <SummaryBar
                    label={`الحضور (${latn(counts.present)})`}
                    ratio={counts.total > 0 ? counts.present / counts.total : 0}
                    tone="mint"
                  />
                  <SummaryBar
                    label={`التأخّر (${latn(counts.late)})`}
                    ratio={counts.total > 0 ? counts.late / counts.total : 0}
                    tone="yellow"
                  />
                  <SummaryBar
                    label={`الغياب (${latn(counts.absent)})`}
                    ratio={counts.total > 0 ? counts.absent / counts.total : 0}
                    tone="rose"
                  />
                  <SummaryBar
                    label={`بعذر (${latn(counts.excused)})`}
                    ratio={counts.total > 0 ? counts.excused / counts.total : 0}
                    tone="sky"
                  />
                </View>
              </Card>

              <Button
                label="حفظ السجلّ"
                kind="accent"
                loading={save.isPending}
                disabled={effectiveId === "" || rows.length === 0}
                onPress={() => {
                  if (!date) {
                    setDateError("حدّد تاريخ الجلسة قبل الحفظ.");
                    return;
                  }
                  save.mutate();
                }}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
