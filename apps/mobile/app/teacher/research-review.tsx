/**
 * research-review — البحث العلمي. Web parity: ResearchReviewPage — the
 * triage queue (بانتظار تقييمك / رفضها الفحص التجريبي (محاكاة) /
 * مُقيَّمة — جاهزة للنشر), the review sheet (abstract, the declared
 * simulated scan cells, grade 0–20 + التقدير, publish with ConfirmDialog,
 * the PDF reader deep link).
 */
import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { researchApi } from "@/api/research";
import type { ResearchPaper } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, latn } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Avatar, Badge, Card, ConfirmDialog, Sheet, SimulatedBadge } from "@/components/ui";
import { KpiCard, LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { PAPER_STATUS_MAP, StatusBadge } from "@/features/teacher/components";

/** التقدير — the web's band copy for the 0–20 grade. */
function taqdir(score: number): string {
  if (score >= 17) return "ممتاز";
  if (score >= 14) return "جيد جداً";
  if (score >= 12) return "جيد";
  if (score >= 10) return "مقبول";
  return "ضعيف";
}

export default function ResearchReview() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const queue = useQuery({
    queryKey: ["research", "queue", scope],
    queryFn: () => researchApi.queue(),
  });

  const [selected, setSelected] = useState<ResearchPaper | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const papers = queue.data ?? [];
  const passed = useMemo(
    () =>
      papers
        .filter((p) => p.status === "CHECKS_PASSED")
        .sort((a, b) => (a.uploadedAt ?? "").localeCompare(b.uploadedAt ?? "")),
    [papers],
  );
  const failed = useMemo(
    () =>
      papers
        .filter((p) => p.status === "CHECKS_FAILED")
        .sort((a, b) => (a.uploadedAt ?? "").localeCompare(b.uploadedAt ?? "")),
    [papers],
  );
  const graded = useMemo(
    () =>
      papers
        .filter((p) => p.status === "GRADED")
        .sort((a, b) => (a.uploadedAt ?? "").localeCompare(b.uploadedAt ?? "")),
    [papers],
  );

  const grade = useMutation({
    mutationFn: async () => {
      if (!selected) return null;
      const n = Number(score);
      if (score.trim() === "" || Number.isNaN(n) || n < 0 || n > 20) {
        throw new Error("الدرجة رقم بين 0 و20.");
      }
      return researchApi.grade(selected.id, { grade: n, feedback: feedback.trim() || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research", "queue"] });
      toast.success("صار البحث مُقيَّماً؛ يمكنك نشره في المكتبة من قسم «جاهزة للنشر».", "تمّ حفظ التقييم");
      setSelected(null);
      setScore("");
      setFeedback("");
      setGradeError(null);
    },
    onError: (e) => setGradeError((e as Error).message),
  });

  const publish = useMutation({
    mutationFn: (id: string) => researchApi.publish(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research", "queue"] });
      setSelected(null);
      setConfirmPublish(false);
      toast.success("أصبح البحث متاحاً للطلاب في مكتبة الجامعة.", "تمّ نشر البحث");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر النشر"),
  });

  const openPaper = (paper: ResearchPaper) => {
    const fname = paper.fileUrl?.split("/").pop() ?? "";
    if (fname === "") return;
    router.push({
      pathname: "/document/[filename]",
      params: { filename: fname, ns: "papers", title: paper.title, paper: paper.id, back: "/teacher/research-review" },
    } as never);
  };

  const QueueRow = ({ paper }: { paper: ResearchPaper }) => {
    const student = paper.student;
    const name = student ? `${student.firstName} ${student.lastName}` : "طالب";
    const isGraded = paper.status === "GRADED" || paper.status === "PUBLISHED";
    return (
      <LedgerRow
        onPress={() => {
          setSelected(paper);
          setScore(paper.grade !== null && paper.grade !== undefined ? String(paper.grade) : "15");
          setFeedback(paper.feedback ?? "");
          setGradeError(null);
        }}
        accessibilityLabel={`بحث ${paper.title}`}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <Avatar
            initials={student ? (student.firstName[0] ?? "") + (student.lastName[0] ?? "") : "؟"}
            color={(student as { avatarColor?: string | null } | null)?.avatarColor ?? null}
            size={36}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="medium" numberOfLines={1}>
              {paper.title}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {name}
              {paper.scannedAt ? ` · فُحص ${fromNow(paper.scannedAt)}` : paper.uploadedAt ? ` · رُفع ${fromNow(paper.uploadedAt)}` : ""}
            </T>
          </View>
          <View style={{ alignItems: "flex-end", gap: sp[4] }}>
            <StatusBadge status={paper.status} map={PAPER_STATUS_MAP} />
            {isGraded && paper.grade != null ? (
              <T variant="xs" color="muted">
                {latn(paper.grade)}/20
              </T>
            ) : null}
          </View>
        </View>
      </LedgerRow>
    );
  };

  return (
    <Screen scroll>
      <StackHeader title="البحث العلمي" />
      <PageHeader title="البحث العلمي" kicker="قائمة بحوث الطلاب للمراجعة، ومنشوراتك العلمية." />

      {queue.isLoading ? (
        <SkeletonList rows={5} />
      ) : queue.isError ? (
        <ErrorState message={(queue.error as Error).message} onRetry={() => queue.refetch()} />
      ) : (
        <>
          {/* The honest KPI trio. */}
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <KpiCard label="بانتظار تقييمك" value={passed.length} />
            <KpiCard label="تعذّر اجتياز الفحص" value={failed.length} />
            <KpiCard label="جاهزة للنشر" value={graded.length} />
          </View>

          <SectionBar index={1} title="بانتظار تقييمك" />
          {passed.length === 0 ? (
            <EmptyState
              title="لا بحوث في الانتظار"
              message="ستظهر هنا بحوث الطلاب فور اجتيازها الفحص التجريبي (محاكاة) للانتحال والمحتوى الآلي."
            />
          ) : (
            <RowList>
              {passed.map((p) => (
                <QueueRow key={p.id} paper={p} />
              ))}
            </RowList>
          )}

          {failed.length > 0 ? (
            <>
              <SectionBar index={2} title="رفضها الفحص التجريبي (محاكاة)" />
              <RowList>
                {failed.map((p) => (
                  <QueueRow key={p.id} paper={p} />
                ))}
              </RowList>
            </>
          ) : null}

          {graded.length > 0 ? (
            <>
              <SectionBar index={3} title="مُقيَّمة — جاهزة للنشر" />
              <RowList>
                {graded.map((p) => (
                  <QueueRow key={p.id} paper={p} />
                ))}
              </RowList>
            </>
          ) : null}
        </>
      )}

      {/* لوحة المراجعة — the review sheet. */}
      <Sheet open={selected !== null} onClose={() => setSelected(null)} title="مراجعة بحث">
        {selected ? (
          <View style={{ gap: sp[10] }}>
            <T variant="h4" weight="bold">
              {selected.title}
            </T>
            <T variant="sm" color="muted">
              {selected.student ? `${selected.student.firstName} ${selected.student.lastName}` : "طالب"}
              {selected.uploadedAt ? ` · رُفع ${fromNow(selected.uploadedAt)}` : ""}
            </T>

            {selected.abstract ? (
              <Card>
                <T variant="sm" weight="bold">الملخص</T>
                <T variant="body" color="secondary">
                  {selected.abstract}
                </T>
              </Card>
            ) : null}

            {/* نتائج الفحص الأوتوماتيكي — declared simulation. */}
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <View style={{ flex: 1 }}>
                  <T variant="sm" weight="bold">نتائج الفحص الأوتوماتيكي</T>
                </View>
                <SimulatedBadge />
              </View>
              <T variant="body" color="secondary">
                الانتحال: {selected.plagiarismPct != null ? `${latn(Math.round(selected.plagiarismPct))}%` : "—"} · المحتوى الآلي:{" "}
                {selected.aiContentPct != null ? `${latn(Math.round(selected.aiContentPct))}%` : "—"}
              </T>
              <T variant="xs" color="muted">
                قيم الفحص تجريبية معلنة — ليست قياساً فعلياً حتى تفعيل كشف حقيقي.
              </T>
            </Card>

            {selected.fileUrl ? (
              <Button label="قراءة البحث وكتابة ملاحظات" kind="ghost" small onPress={() => openPaper(selected)} />
            ) : null}

            {selected.status !== "GRADED" && selected.status !== "PUBLISHED" ? (
              <>
                <Field
                  label="الدرجة (من 20)"
                  value={score}
                  onChangeText={(v) => {
                    setScore(v);
                    setGradeError(null);
                  }}
                  keyboardType="number-pad"
                  accessibilityLabel="الدرجة"
                />
                <T variant="sm" color="muted">
                  التقدير: {taqdir(Number(score) || 0)}
                </T>
                <Field
                  label="ملاحظات للطالب"
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="اكتب ملاحظاتك على البحث…"
                  accessibilityLabel="ملاحظات للطالب"
                />
                {gradeError ? (
                  <T variant="sm" color="danger">
                    {gradeError}
                  </T>
                ) : null}
                <Button
                  label={grade.isPending ? "جارٍ الحفظ…" : "تأكيد التقييم"}
                  kind="accent"
                  loading={grade.isPending}
                  onPress={() => {
                    setGradeError(null);
                    grade.mutate();
                  }}
                />
              </>
            ) : (
              <>
                <Badge label={`مُقيَّم — الدرجة ${selected.grade != null ? `${latn(selected.grade)}/20` : "—"}`} tone="copper" />
                {selected.status === "GRADED" ? (
                  <Button
                    label="نشر في المكتبة"
                    kind="accent"
                    loading={publish.isPending}
                    onPress={() => setConfirmPublish(true)}
                  />
                ) : (
                  <T variant="sm" color="muted">
                    البحث منشور في المكتبة — لا إجراء متاح عليه هنا.
                  </T>
                )}
              </>
            )}
          </View>
        ) : null}
      </Sheet>

      {/* النشر — the explicit, confirm-guarded action. */}
      <ConfirmDialog
        open={confirmPublish}
        title="نشر البحث"
        message="سيصبح البحث متاحاً للطلاب في مكتبة الجامعة. هل تريد النشر الآن؟"
        confirmLabel="نشر"
        loading={publish.isPending}
        onConfirm={() => selected && publish.mutate(selected.id)}
        onCancel={() => setConfirmPublish(false)}
      />
    </Screen>
  );
}
