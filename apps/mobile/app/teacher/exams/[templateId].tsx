/**
 * exams/[templateId] — القالب: أسئلته ونقاطه ومدته وحالته، تعديل بيانات
 * العرض والتوقيت (updateTemplate)، والمحاولات مع التصحيح اليدوي
 * (gradeAttempt — verdict صحيحة/خاطئة + ملاحظة لكل إجابة معلَّقة).
 */
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { examsApi } from "@/api/exams";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { dateTime, latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, Segmented } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  ATTEMPT_STATUS_MAP,
  EXAM_KIND_LABEL,
  EXAM_STATUS_MAP,
  QUESTION_TYPE_LABEL,
  StatusBadge,
  arCount,
} from "@/features/teacher/components";

/** Wire shape of GET /exams/templates/:id (the ExamTemplateQuestion join rows). */
type TemplateQuestionWire = {
  id?: string;
  order?: number;
  pointsOverride?: number | null;
  question?: {
    id?: string;
    prompt?: string;
    type?: string;
    points?: number;
    difficulty?: string;
    choices?: string[] | null;
  } | null;
  prompt?: string;
  type?: string;
  points?: number;
};

/** Wire shape of GET /exams/templates/:id/attempts (exams.routes.ts). */
type AttemptWire = {
  id: string;
  studentName: string;
  status: string;
  startedAt?: string;
  submittedAt?: string | null;
  score: number | null;
  maxScore: number;
  pendingReview?: number;
  pendingAnswers?: {
    answerId: string;
    prompt: string;
    type: string;
    points: number;
    studentAnswer: string | null;
  }[];
};

export default function ExamTemplateDetail() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const id = templateId ?? "";

  const template = useQuery({
    queryKey: ["exams", "template", id, scope],
    queryFn: () => examsApi.template(id),
    enabled: id !== "",
  });
  const attempts = useQuery({
    queryKey: ["exams", "template", id, "attempts", scope],
    queryFn: () => examsApi.attempts(id),
    enabled: id !== "",
  });

  const t = template.data ?? null;

  /* Edit sheet state. */
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [passingScore, setPassingScore] = useState("");
  const [randomized, setRandomized] = useState("no");
  const [openDate, setOpenDate] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: async () => {
      const dur = Number(durationMin);
      if (Number.isNaN(dur) || dur < 5 || dur > 480) throw new Error("المدة بين 5 و480 دقيقة.");
      const pass = Number(passingScore);
      if (Number.isNaN(pass) || pass < 0 || pass > 100) throw new Error("درجة النجاح نسبة بين 0 و100.");
      const toIsoOrNull = (date: string, time: string) => {
        if (date.trim() === "") return null;
        const t = Date.parse(`${date}T${time.trim() === "" ? "12:00" : time}`);
        if (Number.isNaN(t)) throw new Error("قيمة تاريخ غير صالحة.");
        return new Date(t).toISOString();
      };
      return examsApi.updateTemplate(id, {
        title: title.trim(),
        durationMin: dur,
        passingScore: pass,
        randomized: randomized === "yes",
        openAt: toIsoOrNull(openDate, openTime),
        closeAt: toIsoOrNull(closeDate, closeTime),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", "template", id] });
      qc.invalidateQueries({ queryKey: ["exams", "templates"] });
      toast.success("حُفظت التعديلات على القالب.", "تمّ الحفظ");
      setEditing(false);
      setEditError(null);
    },
    onError: (e) => setEditError((e as Error).message),
  });

  /* Publish / clone. */
  const [confirmPublish, setConfirmPublish] = useState(false);
  const publish = useMutation({
    mutationFn: () => examsApi.publishTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", "template", id] });
      qc.invalidateQueries({ queryKey: ["exams", "templates"] });
      setConfirmPublish(false);
      toast.success("نُشر الاختبار وسيظهر للطلاب حسب نطاقه.", "تمّ نشر الاختبار");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر النشر"),
  });
  const clone = useMutation({
    mutationFn: () => examsApi.cloneTemplate(id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["exams", "templates"] });
      toast.success(`أُستنسخ القالب إلى مسودة جديدة — «${row.title}».`, "تمّ الاستنساخ");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الاستنساخ"),
  });

  /* Manual grading state. */
  const [grading, setGrading] = useState<AttemptWire | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [gradeError, setGradeError] = useState<string | null>(null);

  const gradeAttempt = useMutation({
    mutationFn: async () => {
      const pending = grading?.pendingAnswers ?? [];
      if (pending.some((a) => verdicts[a.answerId] === undefined)) {
        throw new Error("يجب تصحيح كل الإجابات المعلّقة قبل إنهاء المحاولة.");
      }
      return examsApi.gradeAttempt(grading!.id, pending.map((a) => ({
        answerId: a.answerId,
        isCorrect: verdicts[a.answerId] === true,
        feedback: (notes[a.answerId] ?? "").trim() || undefined,
      })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", "template", id, "attempts"] });
      toast.success("اعتُمدت الدرجة النهائية للمحاولة.", "تمّ التصحيح");
      setGrading(null);
      setVerdicts({});
      setNotes({});
      setGradeError(null);
    },
    onError: (e) => setGradeError((e as Error).message),
  });

  const questions = useMemo(() => {
    const raw = ((t as unknown as { questions?: TemplateQuestionWire[] })?.questions ?? []) as TemplateQuestionWire[];
    return raw.map((q) => ({
      id: q.question?.id ?? q.id ?? "",
      prompt: q.question?.prompt ?? q.prompt ?? "—",
      type: q.question?.type ?? q.type ?? "",
      points: q.pointsOverride ?? q.question?.points ?? q.points ?? 0,
      difficulty: q.question?.difficulty ?? "",
    }));
  }, [t]);
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const attemptRows = (attempts.data ?? []) as unknown as AttemptWire[];
  const awaiting = attemptRows.filter((a) => a.status === "SUBMITTED").length;

  if (template.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="قالب الاختبار" />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (template.isError) {
    return (
      <Screen scroll>
        <StackHeader title="قالب الاختبار" />
        <ErrorState message={(template.error as Error).message} onRetry={() => template.refetch()} />
      </Screen>
    );
  }
  if (!t) {
    return (
      <Screen scroll>
        <StackHeader title="قالب الاختبار" />
        <EmptyState title="القالب غير موجود" message="ربما حُذف هذا القالب أو أن الرابط غير صحيح." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <StackHeader title={t.title} kicker={EXAM_KIND_LABEL[t.kind] ?? undefined} />
      <PageHeader title={t.title} kicker="دورة حياة القالب: مسودة ← مراجعة الجودة ← الاعتماد ← النشر للطلاب." />

      <View style={{ flexDirection: "row", gap: sp[6], flexWrap: "wrap", alignItems: "center" }}>
        <StatusBadge status={t.status} map={EXAM_STATUS_MAP} />
        <Badge label={EXAM_KIND_LABEL[t.kind] ?? t.kind} tone="lavender" />
      </View>

      {/* تفاصيل القالب. */}
      <SectionBar
        index={1}
        title="تفاصيل القالب"
        action={
          <View style={{ flexDirection: "row", gap: sp[6] }}>
            <Button
              label="تعديل"
              kind="ghost"
              small
              onPress={() => {
                setTitle(t.title);
                setDurationMin(String(t.durationMin ?? 60));
                setPassingScore(String(t.passingScore ?? 50));
                setRandomized(t.randomized ? "yes" : "no");
                const parseDate = (iso: string | null | undefined) => {
                  if (!iso) return { date: "", time: "" };
                  const d = new Date(iso);
                  const pad = (n: number) => String(n).padStart(2, "0");
                  return {
                    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                  };
                };
                const o = parseDate(t.openAt);
                const c = parseDate(t.closeAt);
                setOpenDate(o.date);
                setOpenTime(o.time);
                setCloseDate(c.date);
                setCloseTime(c.time);
                setEditError(null);
                setEditing(true);
              }}
            />
            <Button
              label="استنساخ"
              kind="ghost"
              small
              loading={clone.isPending}
              onPress={() => clone.mutate()}
            />
            <Button
              label="نشر"
              kind="accent"
              small
              disabled={t.status !== "APPROVED"}
              loading={publish.isPending}
              onPress={() => setConfirmPublish(true)}
            />
          </View>
        }
      />
      {t.status !== "APPROVED" ? (
        <T variant="sm" color="muted">
          {t.status === "PENDING_REVIEW"
            ? "بانتظار مراجعة الجودة — يُفتح النشر بعد اعتمادها."
            : t.status === "PUBLISHED" || t.status === "CLOSED"
              ? "القالب منشور بالفعل."
              : "النشر متاح بعد اعتماد الجودة."}
        </T>
      ) : null}
      <Card>
        <StatLine label="المدة" value={arCount(t.durationMin ?? 0, ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"])} />
        <StatLine label="درجة النجاح" value={t.passingScore != null ? `${latn(t.passingScore)}%` : "—"} />
        <StatLine label="ترتيب الأسئلة" value={t.randomized ? "عشوائي لكل طالب" : "ثابت بترتيب الإنشاء"} />
        {t.openAt ? <StatLine label="يفتح في" value={dateTime(t.openAt)} /> : null}
        {t.closeAt ? <StatLine label="يغلق في" value={dateTime(t.closeAt)} /> : null}
      </Card>

      {/* أسئلة القالب. */}
      <SectionBar index={2} title="أسئلة القالب" />
      {questions.length === 0 ? (
        <EmptyState title="لا أسئلة في هذا القالب" message="ربما أُوقفت أسئلته من البنك بعد بنائه." />
      ) : (
        <RowList>
          {questions.map((q, i) => (
            <LedgerRow key={q.id || i} last={i === questions.length - 1} accessibilityLabel={`سؤال ${latn(i + 1)}`}>
              <T variant="body" numberOfLines={2}>
                {q.prompt}
              </T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], alignItems: "center" }}>
                <Badge label={QUESTION_TYPE_LABEL[q.type] ?? q.type} tone="grey" />
                <T variant="xs" color="muted">
                  {arCount(q.points, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])}
                </T>
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}
      <T variant="sm" color="muted">
        مجموع النقاط {arCount(totalPoints, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])}
      </T>

      {/* التصحيح — the attempts section. */}
      <SectionBar
        index={3}
        title="التصحيح"
        action={
          awaiting > 0 ? (
            <Badge
              label={arCount(awaiting, ["محاولة واحدة بانتظار تصحيحك", "محاولتان بانتظار تصحيحك", "محاولات بانتظار تصحيحك", "محاولة بانتظار تصحيحك"])}
              tone="yellow"
            />
          ) : undefined
        }
      />
      {attempts.isLoading ? (
        <SkeletonList rows={3} />
      ) : attempts.isError ? (
        <ErrorState message={(attempts.error as Error).message} onRetry={() => attempts.refetch()} />
      ) : attemptRows.length === 0 ? (
        <EmptyState
          title="لا محاولات بعد"
          message="يبدأ الطلاب المحاولات من صفحة الاختبارات الخاصة بهم؛ تظهر محاولاتهم هنا لحظة بدئها."
        />
      ) : (
        <RowList>
          {attemptRows.map((a, i) => (
            <LedgerRow key={a.id} last={i === attemptRows.length - 1} accessibilityLabel={`محاولة ${a.studentName}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {a.studentName}
                  </T>
                  <T variant="xs" color="muted">
                    {a.submittedAt ? `سلِّمت ${dateTime(a.submittedAt)}` : a.startedAt ? `بدأت ${dateTime(a.startedAt)}` : ""}
                    {a.pendingReview ? ` · ${arCount(a.pendingReview, ["إجابة واحدة بانتظار تقييمك", "إجابتان بانتظار تقييمك", "إجابات بانتظار تقييمك", "إجابة بانتظار تقييمك"])}` : ""}
                  </T>
                </View>
                <T variant="body" weight="bold">
                  {a.score === null ? "—" : `${latn(a.score)} / ${latn(a.maxScore)}`}
                </T>
                <StatusBadge status={a.status} map={ATTEMPT_STATUS_MAP} />
              </View>
              {a.status === "SUBMITTED" ? (
                <Button
                  label="تصحيح يدوي"
                  kind="accent"
                  small
                  onPress={() => {
                    setGrading(a);
                    setVerdicts({});
                    setNotes({});
                    setGradeError(null);
                  }}
                />
              ) : null}
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* نشر الاختبار — confirm. */}
      <ConfirmDialog
        open={confirmPublish}
        title="نشر الاختبار"
        message="بعد النشر يظهر الاختبار للطلاب حسب نطاقه (المقرّر أو الكلّيّة) ولا يمكن سحبه من هذه الصفحة. هل تريد النشر الآن؟"
        confirmLabel="نشر نهائي"
        loading={publish.isPending}
        onConfirm={() => publish.mutate()}
        onCancel={() => setConfirmPublish(false)}
      />

      {/* تعديل القالب — the safe fields. */}
      <Sheet open={editing} onClose={() => setEditing(false)} title="تعديل القالب">
        <T variant="sm" color="muted">
          الأسئلة ونوع الاختبار ونطاقه ثابتة بعد الإنشاء — عدّل بيانات العرض والتوقيت هنا، أو استنسخ القالب لنسخة تُبنى عليها أسئلة مختلفة.
        </T>
        <Field label="عنوان القالب" value={title} onChangeText={setTitle} accessibilityLabel="عنوان القالب" />
        <Field
          label="المدة (بالدقائق)"
          value={durationMin}
          onChangeText={setDurationMin}
          hint="بين 5 و480 دقيقة"
          keyboardType="number-pad"
          accessibilityLabel="المدة"
        />
        <Field
          label="درجة النجاح (%)"
          value={passingScore}
          onChangeText={setPassingScore}
          hint="نسبة من مجموع النقاط"
          keyboardType="number-pad"
          accessibilityLabel="درجة النجاح"
        />
        <T variant="sm" weight="medium" color="secondary">
          ترتيب عشوائي للأسئلة
        </T>
        <Segmented
          options={[
            { id: "no", label: "ثابت" },
            { id: "yes", label: "عشوائي" },
          ]}
          selectedId={randomized}
          onSelect={setRandomized}
        />
        <Field
          label="يفتح في — التاريخ (اختياري)"
          value={openDate}
          onChangeText={setOpenDate}
          hint="بصيغة YYYY-MM-DD — غير محدَّد يفتح فور النشر"
          accessibilityLabel="تاريخ الفتح"
        />
        <Field
          label="يفتح في — الوقت (اختياري)"
          value={openTime}
          onChangeText={setOpenTime}
          hint="بصيغة HH:MM"
          accessibilityLabel="وقت الفتح"
        />
        <Field
          label="يغلق في — التاريخ (اختياري)"
          value={closeDate}
          onChangeText={setCloseDate}
          hint="بصيغة YYYY-MM-DD — بلا إغلاق تلقائي"
          accessibilityLabel="تاريخ الإغلاق"
        />
        <Field
          label="يغلق في — الوقت (اختياري)"
          value={closeTime}
          onChangeText={setCloseTime}
          hint="بصيغة HH:MM"
          accessibilityLabel="وقت الإغلاق"
        />
        {editError ? (
          <T variant="sm" color="danger">
            {editError}
          </T>
        ) : null}
        <Button
          label={update.isPending ? "جارٍ حفظ التعديل…" : "حفظ التعديل"}
          kind="accent"
          loading={update.isPending}
          onPress={() => {
            setEditError(null);
            update.mutate();
          }}
        />
      </Sheet>

      {/* تصحيح محاولة — verdict + note per parked answer. */}
      <Sheet
        open={grading !== null}
        onClose={() => {
          setGrading(null);
          setVerdicts({});
          setNotes({});
        }}
        title={grading ? `تصحيح محاولة — ${grading.studentName}` : ""}
      >
        {grading ? (
          <View style={{ gap: sp[10] }}>
            <T variant="sm" color="muted">
              {t.title} · الحالة: {ATTEMPT_STATUS_MAP[grading.status]?.label ?? grading.status}
              {grading.score !== null ? ` · الدرجة الآلية حتى الآن: ${latn(grading.score)} / ${latn(grading.maxScore)}` : ""}
            </T>
            {(grading.pendingAnswers ?? []).length === 0 ? (
              <T variant="sm" color="muted">
                لا إجابات معلّقة في هذه المحاولة (أسئلتها المقالية تركت بلا إجابة) — حفظ التصحيح يعتدّ بالدرجة الآلية كما هي ويُنهي المحاولة.
              </T>
            ) : (
              (grading.pendingAnswers ?? []).map((a, i) => (
                <Card key={a.answerId}>
                  <T variant="sm" weight="bold" numberOfLines={2}>
                    {latn(i + 1)}. {a.prompt}
                  </T>
                  <T variant="xs" color="muted">
                    {QUESTION_TYPE_LABEL[a.type] ?? a.type} ·{" "}
                    {arCount(a.points, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])}
                  </T>
                  <View style={{ backgroundColor: "rgba(0,0,0,0.04)", padding: sp[8], marginTop: sp[4] }}>
                    {a.studentAnswer !== null && a.studentAnswer !== "" ? (
                      <T variant="body" color="secondary">
                        {a.studentAnswer}
                      </T>
                    ) : (
                      <T variant="sm" color="muted">
                        لم يكتب الطالب إجابة لهذا السؤال — حكمك يحدد درجته.
                      </T>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: sp[6], paddingTop: sp[8] }}>
                    <Button
                      label="صحيحة"
                      kind={verdicts[a.answerId] === true ? "accent" : "ghost"}
                      small
                      onPress={() => setVerdicts((m) => ({ ...m, [a.answerId]: true }))}
                    />
                    <Button
                      label="خاطئة"
                      kind={verdicts[a.answerId] === false ? "primary" : "ghost"}
                      small
                      onPress={() => setVerdicts((m) => ({ ...m, [a.answerId]: false }))}
                    />
                  </View>
                  <Field
                    label="ملاحظة للطالب (اختيارية)"
                    value={notes[a.answerId] ?? ""}
                    onChangeText={(v) => setNotes((m) => ({ ...m, [a.answerId]: v }))}
                    accessibilityLabel={`ملاحظة على إجابة السؤال ${latn(i + 1)}`}
                  />
                </Card>
              ))
            )}
            {gradeError ? (
              <T variant="sm" color="danger">
                {gradeError}
              </T>
            ) : null}
            <Button
              label={gradeAttempt.isPending ? "جارٍ اعتماد الدرجة…" : "حفظ التصحيح واعتماد الدرجة"}
              kind="accent"
              loading={gradeAttempt.isPending}
              onPress={() => {
                setGradeError(null);
                gradeAttempt.mutate();
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
