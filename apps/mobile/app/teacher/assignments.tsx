/**
 * assignments — الواجبات والاختبارات. Web parity: AssignmentsPage —
 * the pending queue («تسليمات بانتظار التقييم» → the grade sheet with the
 * student's answer + «متأخر» chip), «جميع الواجبات» (due chips, ceiling),
 * and «واجب جديد» (offering/title/type/due/weight/maxScore/description).
 */
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import type { Submission } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { Avatar, LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, SelectField } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  ASSIGNMENT_KIND_LABEL,
  arCount,
  OfferingPicker,
  useTeacherOfferings,
} from "@/features/teacher/components";

/** Wire shape of /teacher/me/pending-submissions (teacher-dashboard.routes.ts). */
type PendingWire = Submission & {
  assignment?: {
    id?: string;
    title?: string;
    maxScore?: number | null;
    type?: string;
    offering?: { course?: { code?: string; name?: string } | null };
  } | null;
  student?: { firstName?: string; lastName?: string; avatarInitials?: string | null; avatarColor?: string | null } | null;
};

function pendingView(s: PendingWire) {
  return {
    id: s.id,
    studentName: s.student ? `${s.student.firstName} ${s.student.lastName}`.trim() : "طالب",
    assignmentTitle: s.assignment?.title ?? "تسليم",
    courseCode: s.assignment?.offering?.course?.code ?? "",
    maxScore: s.assignment?.maxScore ?? null,
    submittedAt: s.submittedAt ?? null,
    late: s.status === "LATE",
    textAnswer: s.textAnswer ?? null,
    fileUrl: s.fileUrl ?? null,
  };
}

/** Wire shape of /teacher/me/assignments rows. */
type AssignmentWire = {
  id: string;
  title: string;
  type: string;
  dueAt: string | null;
  maxScore?: number | null;
  weight?: number | null;
  course?: { code?: string; name?: string } | null;
  submissions?: number;
  enrolled?: number;
};

function dueLabel(iso: string | null): { text: string; tone: "mint" | "yellow" | "rose" | "grey" } {
  if (!iso) return { text: "بلا موعد", tone: "grey" };
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `انتهى منذ ${arCount(-days, ["يوم", "يومين", "أيام", "يوماً"])}`, tone: "rose" };
  if (days === 0) return { text: "اليوم", tone: "yellow" };
  if (days === 1) return { text: "غدًا", tone: "yellow" };
  if (days <= 3) return { text: `بعد ${arCount(days, ["يوم", "يومين", "أيام", "يوماً"])}`, tone: "yellow" };
  return { text: `بعد ${arCount(days, ["يوم", "يومين", "أيام", "يوماً"])}`, tone: "mint" };
}

export default function Assignments() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];

  const assignments = useQuery({
    queryKey: ["teacher", "me", "assignments", scope],
    queryFn: () => teacherApi.assignments(),
  });
  const pending = useQuery({
    queryKey: ["teacher", "me", "pending-submissions", scope],
    queryFn: () => teacherApi.pendingSubmissions(),
  });

  /* Grade sheet state. */
  const [gradeTarget, setGradeTarget] = useState<ReturnType<typeof pendingView> | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [gradeError, setGradeError] = useState<string | null>(null);

  /* Create sheet state. */
  const [creating, setCreating] = useState(false);
  const [offeringId, setOfferingId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("HOMEWORK");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [weight, setWeight] = useState("10");
  const [maxScore, setMaxScore] = useState("100");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const grade = useMutation({
    mutationFn: async () => {
      const value = Number(score);
      if (score.trim() === "" || Number.isNaN(value)) throw new Error("أدخل درجة صحيحة.");
      if (value < 0) throw new Error("لا يمكن أن تكون الدرجة سالبة.");
      if (gradeTarget?.maxScore != null && value > gradeTarget.maxScore) {
        throw new Error(`الدرجة يجب ألّا تتجاوز ${latn(gradeTarget.maxScore)}.`);
      }
      const rounded = Math.round(value * 100) / 100;
      return teacherApi.gradeSubmission(gradeTarget!.id, {
        grade: rounded,
        feedback: feedback.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "me", "pending-submissions"] });
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.", "تمّ التقييم");
      setGradeTarget(null);
      setScore("");
      setFeedback("");
      setGradeError(null);
    },
    onError: (e) => setGradeError((e as Error).message),
  });

  const create = useMutation({
    mutationFn: async () => {
      const effId = offeringId || offerings[0]?.id || "";
      if (effId === "") throw new Error("اختر المقرّر أولاً.");
      if (title.trim().length < 2) throw new Error("العنوان حرفان على الأقل.");
      if (!dueDate) throw new Error("حدّد الموعد النهائي للتسليم.");
      const when = `${dueDate}T${dueTime.trim() === "" ? "23:59" : dueTime}`;
      const t = Date.parse(when);
      if (Number.isNaN(t)) throw new Error("قيمة الموعد النهائي غير صالحة.");
      const w = Number(weight);
      const mx = Number(maxScore);
      if (Number.isNaN(w) || w < 0 || w > 100) throw new Error("الوزن بين 0 و100.");
      if (Number.isNaN(mx) || mx <= 0) throw new Error("الدرجة العظمى أكبر من صفر.");
      return teacherApi.createAssignment(effId, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueAt: new Date(t).toISOString(),
        weight: w,
        maxScore: mx,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "me", "assignments"] });
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("أُنشئ الواجب وسيظهر لطلاب المقرّر فوراً.", "تمّ الإنشاء");
      setCreating(false);
      setTitle("");
      setType("HOMEWORK");
      setDueDate("");
      setDueTime("");
      setWeight("10");
      setMaxScore("100");
      setDescription("");
      setCreateError(null);
    },
    onError: (e) => setCreateError((e as Error).message),
  });

  const pendingRows = ((pending.data ?? []) as unknown as PendingWire[]).map(pendingView);
  const assignmentRows = (assignments.data ?? []) as unknown as AssignmentWire[];

  return (
    <Screen scroll>
      <StackHeader title="الواجبات والاختبارات" />
      <PageHeader
        title="الواجبات والاختبارات"
        kicker="كلّ الواجبات الموزَّعة على مقرّراتك، والتسليمات بانتظار تقييمك."
      />
      <SectionBar
        index={1}
        title="تسليمات بانتظار التقييم"
        action={
          <Button label="واجب جديد" kind="accent" small onPress={() => setCreating(true)} />
        }
      />
      {pending.isLoading ? (
        <SkeletonList rows={3} />
      ) : pending.isError ? (
        <ErrorState message={(pending.error as Error).message} onRetry={() => pending.refetch()} />
      ) : pendingRows.length === 0 ? (
        <EmptyState title="لا تسليمات بانتظار التصحيح" message="ستظهر هنا تسليمات طلابك فور وصولها." />
      ) : (
        <RowList>
          {pendingRows.map((s, i) => (
            <LedgerRow
              key={s.id}
              last={i === pendingRows.length - 1}
              onPress={() => {
                setGradeTarget(s);
                setScore("");
                setFeedback("");
                setGradeError(null);
              }}
              accessibilityLabel={`تصحيح تسليم ${s.studentName}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Avatar initials={s.studentName.split(" ").map((w) => w[0] ?? "").slice(0, 2).join("")} size={36} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="medium" numberOfLines={1}>
                        {s.studentName}
                      </T>
                    </View>
                    {s.late ? <Badge label="متأخر" tone="yellow" /> : null}
                  </View>
                  <T variant="xs" color="muted" numberOfLines={1}>
                    {s.assignmentTitle}
                    {s.courseCode ? ` · ${s.courseCode}` : ""}
                    {s.submittedAt ? ` · وصل ${fromNow(s.submittedAt)}` : ""}
                  </T>
                </View>
                <Badge label="تصحيح" tone="copper" />
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* جميع الواجبات. */}
      <SectionBar index={2} title="جميع الواجبات" />
      {assignments.isLoading ? (
        <SkeletonList rows={4} />
      ) : assignments.isError ? (
        <ErrorState message={(assignments.error as Error).message} onRetry={() => assignments.refetch()} />
      ) : assignmentRows.length === 0 ? (
        <EmptyState
          title="لا توجد واجبات بعد"
          message="أنشئ أول واجب بزر «واجب جديد» بالأعلى — سيظهر لطلاب المقرّر فوراً."
        />
      ) : (
        <RowList>
          {assignmentRows.map((a, i) => {
            const due = dueLabel(a.dueAt);
            const subs = a.submissions ?? 0;
            const enr = a.enrolled ?? 0;
            const ratio = enr > 0 ? Math.round((subs / enr) * 100) : 0;
            return (
              <LedgerRow key={a.id} last={i === assignmentRows.length - 1} accessibilityLabel={`واجب ${a.title}`}>
                <T variant="body" weight="medium" numberOfLines={2}>
                  {ASSIGNMENT_KIND_LABEL[a.type] ?? a.type}: {a.title}
                </T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], alignItems: "center" }}>
                  {a.course?.name ? (
                    <T variant="xs" color="muted">
                      {a.course.name} · {a.course.code}
                    </T>
                  ) : null}
                  {a.maxScore != null ? (
                    <T variant="xs" color="muted">
                      الدرجة من {latn(a.maxScore)}
                    </T>
                  ) : null}
                  <Badge label={due.text} tone={due.tone} />
                </View>
                <T variant="xs" color="faint">
                  {subs === 0 ? "لا تسليمات بعد" : `${arCount(subs, ["تسليم", "تسليمان", "تسليمات", "تسليماً"])} · ${latn(ratio)}%`}
                </T>
              </LedgerRow>
            );
          })}
        </RowList>
      )}

      {/* تقييم التسليم — grade + feedback, honest answer display. */}
      <Sheet open={gradeTarget !== null} onClose={() => setGradeTarget(null)} title="تقييم التسليم">
        {gradeTarget ? (
          <View style={{ gap: sp[10] }}>
            <T variant="h4" weight="bold">
              {gradeTarget.assignmentTitle}
            </T>
            <T variant="sm" color="muted">
              {gradeTarget.studentName}
              {gradeTarget.courseCode ? ` · ${gradeTarget.courseCode}` : ""}
              {gradeTarget.submittedAt ? ` · وصل ${fromNow(gradeTarget.submittedAt)}` : ""}
            </T>
            {gradeTarget.textAnswer ? (
              <Card>
                <T variant="sm" weight="bold">إجابة الطالب</T>
                <T variant="body" color="secondary">
                  {gradeTarget.textAnswer}
                </T>
              </Card>
            ) : null}
            {gradeTarget.fileUrl ? (
              <Button
                label="فتح الملف في العارض"
                kind="ghost"
                small
                onPress={() => {
                  const fname = gradeTarget.fileUrl!.split("/").pop() ?? "";
                  if (fname !== "") {
                    router.push({
                      pathname: "/document/[filename]",
                      params: {
                        filename: fname,
                        ns: "papers",
                        title: gradeTarget.assignmentTitle,
                        back: "/teacher/assignments",
                      },
                    } as never);
                  }
                }}
              />
            ) : null}
            <Field
              label={`الدرجة${gradeTarget.maxScore != null ? ` (من 0 إلى ${latn(gradeTarget.maxScore)})` : ""}`}
              value={score}
              onChangeText={(v) => {
                setScore(v);
                setGradeError(null);
              }}
              keyboardType="number-pad"
              hint="رقم حتى منزلتين عشريتين"
              accessibilityLabel="الدرجة"
            />
            <Field
              label="ملاحظات للطالب (اختياري)"
              value={feedback}
              onChangeText={setFeedback}
              placeholder="اكتب ملاحظاتك على الإجابة…"
              accessibilityLabel="ملاحظات للطالب"
            />
            {gradeError ? (
              <T variant="sm" color="danger">
                {gradeError}
              </T>
            ) : null}
            <Button label="حفظ الدرجة" kind="accent" loading={grade.isPending} onPress={() => grade.mutate()} />
          </View>
        ) : null}
      </Sheet>

      {/* واجب جديد. */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="واجب جديد">
        <View style={{ gap: sp[10] }}>
          <OfferingPicker
            offerings={offerings}
            value={offeringId || offerings[0]?.id || ""}
            onChange={setOfferingId}
            label="المقرّر"
            loading={offs.isLoading}
          />
          <Field
            label="العنوان"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setCreateError(null);
            }}
            placeholder="مثال: واجب الأسبوع الأول — مقدمة في الموضوع"
            accessibilityLabel="عنوان الواجب"
          />
          <SelectField
            label="النوع"
            value={{ id: type, label: ASSIGNMENT_KIND_LABEL[type] ?? type }}
            options={Object.keys(ASSIGNMENT_KIND_LABEL).map((k) => ({
              id: k,
              label: ASSIGNMENT_KIND_LABEL[k],
            }))}
            onSelect={(id) => setType(id)}
            sheetTitle="النوع"
          />
          <Field
            label="الموعد النهائي (YYYY-MM-DD)"
            value={dueDate}
            onChangeText={(v) => {
              setDueDate(v);
              setCreateError(null);
            }}
            hint="بصيغة YYYY-MM-DD"
            accessibilityLabel="الموعد النهائي"
          />
          <Field
            label="الوقت (اختياري HH:MM)"
            value={dueTime}
            onChangeText={setDueTime}
            hint="افتراضيًا 23:59"
            accessibilityLabel="وقت التسليم"
          />
          <Field
            label="الوزن (% من الدرجات)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="number-pad"
            hint="بين 0 و100"
            accessibilityLabel="الوزن"
          />
          <Field
            label="الدرجة العظمى"
            value={maxScore}
            onChangeText={setMaxScore}
            keyboardType="number-pad"
            hint="أكبر من صفر"
            accessibilityLabel="الدرجة العظمى"
          />
          <Field
            label="الوصف (اختياري)"
            value={description}
            onChangeText={setDescription}
            placeholder="تعليمات التسليم، المراجع، معايير التقييم…"
            accessibilityLabel="الوصف"
          />
          {createError ? (
            <T variant="sm" color="danger">
              {createError}
            </T>
          ) : null}
          <Button
            label={create.isPending ? "جارٍ الإنشاء…" : "إنشاء الواجب"}
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
    </Screen>
  );
}
