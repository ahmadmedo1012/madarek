import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ClipboardCheck, Clock } from "lucide-react-native";
import { examsApi, type ExamTemplateRow } from "@/api/exams";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { Segmented } from "@/components/ui/fields";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dateTime, latn, num, shortDate } from "@/lib/format";
import {
  KIND_LABEL,
  KIND_TONE,
  attemptVerdict,
  countAr,
  examStartable,
  examWindowState,
} from "@/features/student/more";

/**
 * /student/online-exams — student exam list (web OnlineExamsPage parity):
 * startable window rule (openAt ≤ now ≤ closeAt), attempt chips per the
 * r164-e wire contract, segmented filter الكل/متاحة/منجزة.
 */
export default function OnlineExamsScreen() {
  const scope = useInstitutionScope();
  const [filter, setFilter] = useState("all");
  const feed = useQuery({
    queryKey: ["exams", "me", scope],
    queryFn: () => examsApi.myExams(),
    placeholderData: (p) => p,
  });
  const exams = useMemo(() => feed.data ?? [], [feed.data]);

  const available = useMemo(
    () => exams.filter((e) => examStartable(e) && examWindowState(e) === "open"),
    [exams],
  );
  const taken = useMemo(
    () => exams.filter((e) => e.myAttempt && e.myAttempt.status !== "IN_PROGRESS" && e.kind !== "PRACTICE"),
    [exams],
  );
  const visible = filter === "available" ? available : filter === "taken" ? taken : exams;

  return (
    <Screen scroll>
      <StackHeader title="الاختبارات الإلكترونية" kicker="مركز الاختبارات" />
      <Segmented
        options={[
          { id: "all", label: "الكل" },
          { id: "available", label: "متاحة" },
          { id: "taken", label: "منجزة" },
        ]}
        selectedId={filter}
        onSelect={setFilter}
      />
      <T variant="sm" color="muted">
        اختبارات معتمدة من مكتب الجودة، موحَّدة عبر الكليات — لا يمكن إعادة المحاولة بعد التسليم إلا في الاختبارات التدريبية.
      </T>

      {feed.isLoading ? (
        <SkeletonList rows={5} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="لا توجد اختبارات هنا"
          message={
            filter === "available"
              ? "لا توجد اختبارات متاحة حالياً — ستظهر فور اعتماد مكتب الجودة ومقرريك الاختبارات."
              : "ستظهر اختباراتك المجدولة والمنجزة في هذه القائمة."
          }
        />
      ) : (
        <RowList>
          {visible.map((e, i) => (
            <ExamRow key={e.id} exam={e} last={i === visible.length - 1} />
          ))}
        </RowList>
      )}
      {visible.length > 0 ? (
        <T variant="xs" color="faint">
          {countAr(visible.length, ["اختبار واحد", "اختباران", "اختبارات", "اختباراً"])}
        </T>
      ) : null}
    </Screen>
  );
}

function ExamRow({ exam, last }: { exam: ExamTemplateRow; last: boolean }) {
  const ws = examWindowState(exam);
  const verdict = attemptVerdict(exam);
  const inProgress = exam.myAttempt?.status === "IN_PROGRESS";

  const windowText = exam.openAt
    ? exam.closeAt
      ? `من ${shortDate(exam.openAt)} · حتى ${dateTime(exam.closeAt)}`
      : `يفتح ${dateTime(exam.openAt)}`
    : exam.closeAt
      ? `يغلق ${dateTime(exam.closeAt)}`
      : "بلا نافذة زمنية";

  const attemptChip = (() => {
    const a = exam.myAttempt;
    if (!a) return null;
    if (a.status === "GRADED" && a.score !== null && a.score !== undefined) {
      return (
        <Badge label={`مُصحَّح · ${latn(Number(a.score))}/${latn(Number(a.maxScore))}`} tone="mint" />
      );
    }
    if (a.status === "GRADED") return <Badge label="مُصحَّح" tone="mint" />;
    if (a.status === "SUBMITTED") return <Badge label="بانتظار التصحيح اليدوي" tone="yellow" />;
    if (a.status === "IN_PROGRESS") {
      return <Badge label={ws === "open" ? "لم يكتمل — متابعة" : "لم يكتمل"} tone="copper" />;
    }
    return <Badge label="أُنجز" tone="grey" />;
  })();

  return (
    <LedgerRow
      last={last}
      onPress={() => router.push(`/student/online-exams/${exam.id}` as never)}
      accessibilityLabel={`${exam.title} — ${KIND_LABEL[exam.kind] ?? "اختبار"}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <Badge label={KIND_LABEL[exam.kind] ?? String(exam.kind)} tone={KIND_TONE[exam.kind] ?? "grey"} />
        <View style={{ flex: 1 }} />
        {exam.myAttempt?.status === "IN_PROGRESS" ? null : verdict ? (
          <Badge
            label={verdict.score ? `${verdict.label} · ${latn(verdict.score.value)}/${latn(verdict.score.max)}` : verdict.label}
            tone={verdict.tone}
          />
        ) : null}
      </View>
      <T variant="bodyLg" weight="bold">
        {exam.title}
      </T>
      <T variant="sm" color="secondary">
        {exam.courseName ?? exam.facultyName ?? "موحد"}
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[8] }}>
        <T variant="xs" color="muted">
          {windowText}
        </T>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[12] }}>
        <MetaBit icon="clock" text={`${num(exam.durationMin)} دقيقة`} />
        <MetaBit icon="check" text={countAr(exam.questionCount ?? 0, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} />
        <MetaBit icon="cal" text={`النجاح ≥ ${exam.passingScore != null ? latn(exam.passingScore) : "—"}%`} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[6] }}>
        {attemptChip}
        {exam.kind === "PRACTICE" && ws === "open" && exam.myAttempt && exam.myAttempt.status !== "IN_PROGRESS" ? (
          <Badge label="تدريبي — إعادة المحاولة متاحة" tone="sky" />
        ) : null}
        {ws === "upcoming" && exam.openAt ? <Badge label={`يفتح ${dateTime(exam.openAt)}`} tone="sky" /> : null}
        {ws === "closed" ? <Badge label="أغلق باب التسليم" tone="grey" /> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
        <T variant="sm" weight="bold" color="accentInk">
          {exam.myAttempt?.status === "IN_PROGRESS" ? "متابعة" : examStartable(exam) && ws === "open" ? "ابدأ" : "عرض النتيجة"}
        </T>
      </View>
    </LedgerRow>
  );
}

function MetaBit({ icon, text }: { icon: "clock" | "check" | "cal"; text: string }) {
  const p = usePalette();
  const color = p.textMuted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon === "clock" ? <Clock size={12} color={color} /> : null}
      {icon === "check" ? <ClipboardCheck size={12} color={color} /> : null}
      {icon === "cal" ? <CalendarClock size={12} color={color} /> : null}
      <T variant="xs" color="muted">
        {text}
      </T>
    </View>
  );
}
