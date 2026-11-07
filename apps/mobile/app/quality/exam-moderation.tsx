import { useState } from "react";
import { View } from "react-native";
import { humanizeError } from "@/lib/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import XCircle from "lucide-react-native/icons/circle-x";
import { Screen, PageHeader, SectionBar } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { examsApi } from "@/api/exams";
import type { ExamQuestionRow, ExamTemplateRow } from "@/api/exams";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { fromNow, latn, num } from "@/lib/format";
import { EXAM_KIND_LABEL, countAr, difficultyLabel, pageOf, questionTypeLabel, UNKNOWN_LABEL } from "@/features/governance/components";

interface ModerationTarget {
  kind: "template" | "question";
  id: string;
  title: string;
}

/** Pushed: /quality/exam-moderation — «مراجعة الاختبارات» (web ExamModerationPage parity). */
export default function QualityExamModeration() {
  const p = usePalette();
  const tones = useStatusTones();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const queue = useQuery({
    queryKey: ["exams", "moderation-queue", scope],
    queryFn: () => examsApi.moderationQueue(),
  });
  const questionBank = useQuery({
    queryKey: ["exams", "question-bank", "moderation", scope],
    queryFn: async () => pageOf<ExamQuestionRow>(await examsApi.questionBank({})),
    staleTime: 60_000,
  });

  const [target, setTarget] = useState<ModerationTarget | null>(null);
  const [note, setNote] = useState("");
  const [rejectConfirm, setRejectConfirm] = useState<ModerationTarget | null>(null);

  const moderateTemplate = useMutation({
    mutationFn: (payload: { id: string; approve: boolean; note?: string }) =>
      examsApi.moderateTemplate(payload.id, { approve: payload.approve, note: payload.note || undefined }),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["exams", "moderation-queue"] });
      toast.success(payload.approve ? "اعتُمد القالب وأُتيح للطلاب." : "رُفض القالب.");
      setTarget(null);
      setNote("");
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر تنفيذ القرار"),
  });

  const moderateQuestion = useMutation({
    mutationFn: (payload: { id: string; approve: boolean; note?: string }) =>
      examsApi.moderateQuestion(payload.id, { approve: payload.approve, note: payload.note || undefined }),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["exams", "question-bank"] });
      toast.success(payload.approve ? "اعتُمد السؤال." : "رُفض السؤال.");
      setTarget(null);
      setNote("");
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر تنفيذ القرار"),
  });

  const runModeration = (t: ModerationTarget, approve: boolean) => {
    const payload = { id: t.id, approve, note: note.trim() || undefined };
    if (t.kind === "template") moderateTemplate.mutate(payload);
    else moderateQuestion.mutate(payload);
  };

  const templates = Array.isArray(queue.data) ? queue.data : [];
  const questionsAwaiting = templates.reduce(
    (s, t) => s + ((t as ExamTemplateRow & { _count?: { questions?: number } })._count?.questions ?? 0),
    0,
  );
  const pendingQuestions = (questionBank.data?.rows ?? []).filter((q) => q.isApproved === false);

  const busy = moderateTemplate.isPending || moderateQuestion.isPending;

  return (
    <Screen scroll>
      <StackHeader title="مراجعة الاختبارات" kicker="قطاع ضمان الجودة" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <PageHeader
          title="مراجعة الاختبارات"
          kicker="مراجعة قوالب الاختبارات الموحَّدة قبل اعتمادها وإتاحتها للطلاب — صلاحية حصرية لمكتب الجودة."
        />

        <RowList>
          <LedgerRow last>
            <StatLine
              label="بانتظار المراجعة"
              value={num(queue.data ? templates.length : null, "…")}
              hint={templates.length === 0 ? "لا شيء ينتظر" : "تنتظر قرارك"}
            />
            <StatLine
              label="أسئلة بانتظار الفحص"
              value={num(queue.data ? questionsAwaiting : null, "…")}
              hint="مجموع أسئلة القوالب المعلّقة"
            />
          </LedgerRow>
        </RowList>

        <View style={{ gap: 12 }}>
          <SectionBar index={1} title="قائمة الانتظار" />
          <T variant="xs" color="muted">
            الطابور بالأقدم أولًا.
          </T>
          {queue.isLoading ? (
            <SkeletonList rows={4} />
          ) : queue.isError ? (
            <ErrorState message={humanizeError(queue.error)} onRetry={() => queue.refetch()} />
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={22} color={tones.mint.ink} />}
              title="لا شيء بانتظار المراجعة"
              message="كل قوالب الاختبارات المتاحة للطلاب اجتازت المراجعة."
            />
          ) : (
            <RowList>
              {templates.map((t, i) => {
                const row = t as ExamTemplateRow & {
                  _count?: { questions?: number };
                  author?: { firstName?: string; lastName?: string };
                  offering?: { course?: { name?: string } | null };
                };
                return (
                  <LedgerRow
                    key={row.id}
                    onPress={() => setTarget({ kind: "template", id: row.id, title: row.title })}
                    accessibilityLabel={`مراجعة ${row.title}`}
                    last={i === templates.length - 1}
                  >
                    <T variant="body" weight="bold" numberOfLines={1}>
                      {row.title}
                    </T>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Badge
                        label={EXAM_KIND_LABEL[row.kind ?? ""] ?? UNKNOWN_LABEL}
                        tone="copper"
                      />
                      {row.offering?.course?.name ? (
                        <Badge label={row.offering.course.name} tone="sky" />
                      ) : null}
                      <T variant="xs" color="faint">
                        {latn(row._count?.questions ?? 0)} سؤال · {latn(row.durationMin ?? 0)} دقيقة
                      </T>
                    </View>
                    <T variant="xs" color="muted">
                      قدّمه: {row.author?.firstName ?? "—"} {row.author?.lastName ?? ""}
                      {row.createdAt ? ` · بانتظار المراجعة ${fromNow(String(row.createdAt ?? ""))}` : ""}
                    </T>
                  </LedgerRow>
                );
              })}
            </RowList>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SectionBar index={2} title="أسئلة بانتظار الاعتماد" />
          <T variant="xs" color="muted">
            من بنك الأسئلة — الأسئلة غير المعتمدة فقط.
          </T>
          {questionBank.isLoading ? (
            <SkeletonList rows={2} />
          ) : questionBank.isError ? (
            <ErrorState
              message={humanizeError(questionBank.error)}
              onRetry={() => questionBank.refetch()}
              compact
            />
          ) : pendingQuestions.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck size={22} color={p.textMuted} />}
              title="لا أسئلة بانتظار الاعتماد حالياً"
              message="لا يعرض مسار بنك الأسئلة أسئلة غير معتمدة في هذا الطابور بعد."
            />
          ) : (
            <RowList>
              {pendingQuestions.map((q, i) => (
                <LedgerRow
                  key={q.id}
                  onPress={() => setTarget({ kind: "question", id: q.id, title: q.prompt })}
                  accessibilityLabel={`مراجعة السؤال ${q.prompt}`}
                  last={i === pendingQuestions.length - 1}
                >
                  <T variant="body" weight="medium" numberOfLines={2}>
                    {q.prompt}
                  </T>
                  <T variant="xs" color="muted">
                    {questionTypeLabel(q.type)} · {difficultyLabel(q.difficulty)} ·{" "}
                    {countAr(q.points ?? 0, ["نقطة واحدة", "نقطتان", "نقاط", "نقطة"])}
                  </T>
                </LedgerRow>
              ))}
            </RowList>
          )}
        </View>
      </View>

      <Sheet
        open={target !== null}
        onClose={() => {
          setTarget(null);
          setNote("");
        }}
        title="قرار المراجعة"
      >
        <View style={{ gap: 12 }}>
          <T variant="body" weight="bold">
            {target?.title ?? ""}
          </T>
          <T variant="xs" color="muted">
            {target?.kind === "template" ? "قالب اختبار" : "سؤال من بنك الأسئلة"}
          </T>
          <Field
            label="ملاحظة المراجعة (اختياري)"
            value={note}
            onChangeText={setNote}
            placeholder="ملاحظة تُحفظ مع القرار"
            multiline
          />
          <Button
            label={busy ? "جارٍ الاعتماد…" : "اعتماد"}
            kind="primary"
            icon={<CheckCircle2 size={14} color={p.primaryFg} />}
            disabled={busy}
            onPress={() => target && runModeration(target, true)}
          />
          <Button
            label="رفض"
            kind="danger"
            icon={<XCircle size={14} color={p.accentFg} />}
            disabled={busy}
            onPress={() => target && setRejectConfirm(target)}
          />
        </View>
      </Sheet>

      <ConfirmDialog
        open={rejectConfirm !== null}
        title="رفض القرار"
        message={
          rejectConfirm
            ? `سيُرفض «${rejectConfirm.title}» ويخرج من الطابور بلا تراجع. هل أنت متأكد؟`
            : ""
        }
        confirmLabel="رفض نهائي"
        danger
        loading={busy}
        onConfirm={() => {
          if (rejectConfirm) runModeration(rejectConfirm, false);
          setRejectConfirm(null);
        }}
        onCancel={() => setRejectConfirm(null)}
      />
    </Screen>
  );
}
