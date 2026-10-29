/**
 * exams — بنك الأسئلة والاختبارات. Web parity: ExamAuthorPages hub —
 * «القوالب» (my templates: clone / gated publish with its ConfirmDialog
 * / view) | «بنك الأسئلة» (searchable bank rows + «سؤال جديد» with the
 * per-type choices/correct-answer editor).
 */
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { examsApi } from "@/api/exams";
import type { ExamQuestionRow, ExamTemplateRow } from "@/api/exams";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { dateTime, latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, SearchBar, Segmented, SelectField } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  DIFFICULTY_LABEL,
  EXAM_KIND_LABEL,
  EXAM_STATUS_MAP,
  QUESTION_TYPE_LABEL,
  StatusBadge,
  arCount,
} from "@/features/teacher/components";

type QuestionCategory = { id: string; title?: string; name?: string };

/** Web publishGateReason — the per-status honesty for the gated publish. */
function publishGateReason(status: string): string | null {
  if (status === "PENDING_REVIEW" || status === "DRAFT") {
    return "بانتظار مراجعة الجودة — يُفتح النشر بعد اعتمادها.";
  }
  if (status === "REJECTED") return "مرفوض من الجودة — لا يمكن نشره.";
  if (status === "PUBLISHED" || status === "CLOSED") return "منشور بالفعل.";
  return null;
}

export default function Exams() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"templates" | "bank">("templates");

  const templates = useQuery({
    queryKey: ["exams", "templates", scope],
    queryFn: () => examsApi.templates(),
  });

  /* Bank state. */
  const [q, setQ] = useState("");
  const bank = useQuery({
    queryKey: ["exams", "question-bank", q, scope],
    queryFn: () => examsApi.questionBank({ q: q.trim() === "" ? undefined : q.trim() }),
  });
  const categories = useQuery({
    queryKey: ["exams", "question-categories", scope],
    queryFn: () => examsApi.questionCategories(),
  });

  /* Template actions. */
  const [publishTarget, setPublishTarget] = useState<ExamTemplateRow | null>(null);
  const clone = useMutation({
    mutationFn: (id: string) => examsApi.cloneTemplate(id),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["exams", "templates"] });
      toast.success(`أُستنسخ القالب إلى مسودة جديدة — «${row.title}».`, "تمّ الاستنساخ");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الاستنساخ"),
  });
  const publish = useMutation({
    mutationFn: (id: string) => examsApi.publishTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", "templates"] });
      qc.invalidateQueries({ queryKey: ["exams", "template", publishTarget?.id] });
      setPublishTarget(null);
      toast.success("نُشر الاختبار وسيظهر للطلاب حسب نطاقه.", "تمّ نشر الاختبار");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر النشر"),
  });

  /* New-question sheet state. */
  const [creating, setCreating] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [type, setType] = useState<"MCQ" | "TRUE_FALSE" | "SHORT" | "ESSAY">("MCQ");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [modelAnswer, setModelAnswer] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [points, setPoints] = useState("1");
  const [qError, setQError] = useState<string | null>(null);

  const createQuestion = useMutation({
    mutationFn: async () => {
      if (prompt.trim().length < 3) throw new Error("اكتب نص السؤال كما سيظهر للطالب.");
      const pts = Number(points);
      if (points.trim() === "" || Number.isNaN(pts) || pts < 1 || pts > 20) {
        throw new Error("النقاط عدد بين 1 و20.");
      }
      let correctAnswer: unknown = undefined;
      if (type === "MCQ") {
        const filled = choices.map((c) => c.trim()).filter((c) => c !== "");
        if (filled.length < 2) throw new Error("خياران على الأقل لسؤال الاختيار من متعدد.");
        if (correctIndex === null || correctIndex >= filled.length) throw new Error("حدِّد الإجابة الصحيحة قبل الحفظ.");
        correctAnswer = correctIndex;
      } else if (type === "TRUE_FALSE") {
        if (correctIndex === null) throw new Error("حدِّد الإجابة الصحيحة (صواب أو خطأ).");
        correctAnswer = correctIndex;
      } else if (type === "SHORT") {
        if (modelAnswer.trim() === "") throw new Error("الإجابة النموذجية مطلوبة للأسئلة القصيرة.");
        correctAnswer = modelAnswer.trim();
      }
      return examsApi.createQuestion({
        categoryId: categoryId || undefined,
        type,
        prompt: prompt.trim(),
        ...(type === "MCQ"
          ? { choices: choices.map((c) => c.trim()).filter((c) => c !== "") }
          : type === "TRUE_FALSE"
            ? { choices: ["صواب", "خطأ"] }
            : {}),
        correctAnswer,
        difficulty,
        points: pts,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams", "question-bank"] });
      toast.success(
        "أُرسل السؤال إلى مراجعة الجودة — سيظهر في البنك ويصبح متاحاً للقوالب بعد الاعتماد.",
        "أُرسل السؤال",
      );
      setCreating(false);
      setPrompt("");
      setChoices(["", ""]);
      setCorrectIndex(null);
      setModelAnswer("");
      setCategoryId("");
      setDifficulty("MEDIUM");
      setPoints("1");
      setQError(null);
    },
    onError: (e) => setQError((e as Error).message),
  });

  const categoryRows = (categories.data ?? []) as unknown as QuestionCategory[];
  const categoryOptions = categoryRows.map((c) => ({ id: c.id, label: c.title ?? c.name ?? "تصنيف" }));

  const bankRows = (bank.data?.data ?? []) as ExamQuestionRow[];

  return (
    <Screen scroll>
      <StackHeader title="بنك الأسئلة والاختبارات" />
      <PageHeader
        title="بنك الأسئلة والاختبارات"
        kicker="تأليف الأسئلة وبناء قوالب الاختبارات الموحَّدة، ومتابعة اعتمادها من الجودة حتى النشر."
      />
      <Segmented
        options={[
          { id: "templates", label: "القوالب" },
          { id: "bank", label: "بنك الأسئلة" },
        ]}
        selectedId={tab}
        onSelect={(id) => setTab(id as "templates" | "bank")}
      />

      {tab === "templates" ? (
        <>
          <SectionBar index={1} title="قوالب اختباراتي" />
          {templates.isLoading ? (
            <SkeletonList rows={4} />
          ) : templates.isError ? (
            <ErrorState message={(templates.error as Error).message} onRetry={() => templates.refetch()} />
          ) : (templates.data ?? []).length === 0 ? (
            <EmptyState
              title="لم تُنشئ قوالب اختبارات بعد"
              message="ستظهر قوالبك هنا — ابنِ قالباً من أسئلة البنك المعتمدة (البناء يتم حاليًا من لوحة الويب)، ثم أرسله لمراجعة الجودة ونشره."
            />
          ) : (
            <RowList>
              {(templates.data ?? []).map((t, i) => {
                const gate = publishGateReason(t.status);
                return (
                  <LedgerRow
                    key={t.id}
                    last={i === (templates.data ?? []).length - 1}
                    onPress={() => router.push(`/teacher/exams/${t.id}` as never)}
                    accessibilityLabel={`قالب ${t.title}`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium" numberOfLines={1}>
                          {t.title}
                        </T>
                        <T variant="xs" color="muted">
                          {arCount(t.durationMin, ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"])}
                          {t.questionCount !== undefined ? ` · ${arCount(t.questionCount, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالاً"])}` : ""}
                          {t.openAt ? ` · يفتح ${dateTime(t.openAt)}` : ""}
                        </T>
                      </View>
                      <Badge label={EXAM_KIND_LABEL[t.kind] ?? t.kind} tone="lavender" />
                      <StatusBadge status={t.status} map={EXAM_STATUS_MAP} />
                    </View>
                    <View style={{ flexDirection: "row", gap: sp[6], flexWrap: "wrap" }}>
                      <Button
                        label="استنساخ"
                        kind="ghost"
                        small
                        loading={clone.isPending && clone.variables === t.id}
                        onPress={() => clone.mutate(t.id)}
                      />
                      <Button
                        label="نشر"
                        kind={gate ? "ghost" : "accent"}
                        small
                        disabled={gate !== null}
                        onPress={() => setPublishTarget(t)}
                      />
                      <Button
                        label="عرض"
                        kind="ghost"
                        small
                        onPress={() => router.push(`/teacher/exams/${t.id}` as never)}
                      />
                    </View>
                    {gate ? (
                      <T variant="xs" color="muted">
                        {gate}
                      </T>
                    ) : null}
                  </LedgerRow>
                );
              })}
            </RowList>
          )}
        </>
      ) : (
        <>
          <SectionBar
            index={1}
            title="بنك الأسئلة"
            action={
              <Button label="سؤال جديد" kind="accent" small onPress={() => setCreating(true)} />
            }
          />
          <SearchBar value={q} onChange={setQ} placeholder="ابحث في نص الأسئلة…" />
          {bank.isLoading ? (
            <SkeletonList rows={5} />
          ) : bank.isError ? (
            <ErrorState message={(bank.error as Error).message} onRetry={() => bank.refetch()} />
          ) : bankRows.length === 0 ? (
            <EmptyState
              title={q.trim() !== "" ? "لا توجد أسئلة تطابق البحث" : "البنك فارغ حتى الآن"}
              message={
                q.trim() !== ""
                  ? "جرّب كلمات بحث مختلفة أو أزل عوامل التصفية."
                  : "أنشئ أول سؤال — بعد اعتماده من الجودة سيظهر هنا ويصبح متاحاً للقوالب."
              }
            />
          ) : (
            <RowList>
              {bankRows.map((question, i) => (
                <LedgerRow
                  key={question.id}
                  last={i === bankRows.length - 1}
                  accessibilityLabel={`سؤال ${question.prompt}`}
                >
                  <T variant="body" numberOfLines={2}>
                    {question.prompt}
                  </T>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6], alignItems: "center" }}>
                    <Badge label={QUESTION_TYPE_LABEL[question.type] ?? question.type} tone="grey" />
                    <Badge
                      label={DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
                      tone={question.difficulty === "EASY" ? "mint" : question.difficulty === "HARD" ? "rose" : "yellow"}
                    />
                    <Badge
                      label={question.isApproved ? "معتمد" : "بانتظار"}
                      tone={question.isApproved ? "mint" : "yellow"}
                    />
                    <T variant="xs" color="muted">
                      {arCount(question.points, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])}
                    </T>
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          )}
        </>
      )}

      {/* نشر الاختبار — the gated, confirm-guarded publish. */}
      <ConfirmDialog
        open={publishTarget !== null}
        title="نشر الاختبار"
        message="بعد النشر يظهر الاختبار للطلاب حسب نطاقه (المقرّر أو الكلّيّة) ولا يمكن سحبه من هذه الصفحة. هل تريد النشر الآن؟"
        confirmLabel="نشر نهائي"
        loading={publish.isPending}
        onConfirm={() => publishTarget && publish.mutate(publishTarget.id)}
        onCancel={() => setPublishTarget(null)}
      />

      {/* سؤال جديد — the per-type authoring sheet. */}
      <Sheet open={creating} onClose={() => setCreating(false)} title="سؤال جديد">
        <View style={{ gap: sp[10] }}>
          <SelectField
            label="تصنيف السؤال"
            value={
              categoryId !== ""
                ? { id: categoryId, label: categoryOptions.find((c) => c.id === categoryId)?.label ?? "تصنيف" }
                : null
            }
            options={categoryOptions}
            onSelect={setCategoryId}
            placeholder="اختر تصنيفاً…"
            loading={categories.isLoading}
            sheetTitle="تصنيف السؤال"
            emptyLabel="لا توجد تصنيفات بعد"
          />
          <SelectField
            label="نوع السؤال"
            value={{ id: type, label: QUESTION_TYPE_LABEL[type] }}
            options={(Object.keys(QUESTION_TYPE_LABEL) as (keyof typeof QUESTION_TYPE_LABEL)[]).map((t) => ({
              id: t as string,
              label: QUESTION_TYPE_LABEL[t],
            }))}
            onSelect={(id) => {
              const next = id as typeof type;
              setType(next);
              setCorrectIndex(null);
              if (next === "TRUE_FALSE") setChoices(["صواب", "خطأ"]);
              else if (type === "TRUE_FALSE") setChoices(["", ""]);
              setQError(null);
            }}
            sheetTitle="نوع السؤال"
          />
          <Field
            label="نص السؤال"
            value={prompt}
            onChangeText={(v) => {
              setPrompt(v);
              setQError(null);
            }}
            multiline
            placeholder="اكتب نص السؤال كما سيظهر للطالب…"
            accessibilityLabel="نص السؤال"
          />
          {type === "MCQ" ? (
            <View style={{ gap: sp[6] }}>
              <T variant="sm" weight="medium" color="secondary">
                الخيارات — اضغط «صحيحة» لتحديد الإجابة
              </T>
              {choices.map((c, i) => (
                <View key={i} style={{ flexDirection: "row", gap: sp[6], alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label={`الخيار ${latn(i + 1)}`}
                      value={c}
                      onChangeText={(v) => {
                        setChoices((m) => m.map((x, j) => (j === i ? v : x)));
                        setQError(null);
                      }}
                      accessibilityLabel={`الخيار ${latn(i + 1)}`}
                    />
                  </View>
                  <Button
                    label={correctIndex === i ? "✓ صحيحة" : "صحيحة"}
                    kind={correctIndex === i ? "accent" : "ghost"}
                    small
                    onPress={() => setCorrectIndex(i)}
                  />
                  {choices.length > 2 ? (
                    <Button
                      label="حذف"
                      kind="ghost"
                      small
                      onPress={() => {
                        setChoices((m) => m.filter((_, j) => j !== i));
                        if (correctIndex === i) setCorrectIndex(null);
                        else if (correctIndex !== null && correctIndex > i) setCorrectIndex(correctIndex - 1);
                      }}
                    />
                  ) : null}
                </View>
              ))}
              {choices.length < 6 ? (
                <Button label="إضافة خيار" kind="ghost" small onPress={() => setChoices((m) => [...m, ""])} />
              ) : null}
            </View>
          ) : null}
          {type === "TRUE_FALSE" ? (
            <SelectField
              label="الإجابة الصحيحة"
              value={
                correctIndex !== null
                  ? { id: String(correctIndex), label: correctIndex === 0 ? "صواب" : "خطأ" }
                  : null
              }
              options={[
                { id: "0", label: "صواب" },
                { id: "1", label: "خطأ" },
              ]}
              onSelect={(id) => setCorrectIndex(Number(id))}
              sheetTitle="الإجابة الصحيحة"
            />
          ) : null}
          {type === "SHORT" ? (
            <Field
              label="الإجابة النموذجية"
              value={modelAnswer}
              onChangeText={setModelAnswer}
              hint="تُصحَّح إجابة الطالب آلياً بمطابقتها مع هذا النص"
              accessibilityLabel="الإجابة النموذجية"
            />
          ) : null}
          {type === "ESSAY" ? (
            <T variant="sm" color="muted">
              الأسئلة المقالية تُصحَّح يدوياً — سجّل معيار التصحيح من لوحة الويب إن لزم.
            </T>
          ) : null}
          <SelectField
            label="الصعوبة"
            value={{ id: difficulty, label: DIFFICULTY_LABEL[difficulty] ?? difficulty }}
            options={Object.keys(DIFFICULTY_LABEL).map((d) => ({ id: d, label: DIFFICULTY_LABEL[d] }))}
            onSelect={(d) => setDifficulty(d)}
            sheetTitle="الصعوبة"
          />
          <Field
            label="النقاط"
            value={points}
            onChangeText={setPoints}
            keyboardType="number-pad"
            hint="بين 1 و20"
            accessibilityLabel="النقاط"
          />
          {qError ? (
            <T variant="sm" color="danger">
              {qError}
            </T>
          ) : null}
          <Button
            label={createQuestion.isPending ? "جارٍ الإرسال…" : "إرسال السؤال"}
            kind="accent"
            loading={createQuestion.isPending}
            onPress={() => {
              setQError(null);
              createQuestion.mutate();
            }}
          />
        </View>
      </Sheet>
    </Screen>
  );
}
