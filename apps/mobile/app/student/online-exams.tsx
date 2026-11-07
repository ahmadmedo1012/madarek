import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import Clock from "lucide-react-native/icons/clock";
import { examsApi, type ExamTemplateRow } from "@/api/exams";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { type StatusToneName } from "@/design/tokens";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/fields";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { useStaggerEntrance } from "@/motion";
import { dateTime, latn, num, shortDate } from "@/lib/format";
import {
  KIND_LABEL,
  attemptVerdict,
  countAr,
  examStartable,
  examWindowState,
} from "@/features/student/more";

/* ── pure helpers (unit-pinned in src/test/exam-runner.test.tsx) ─────── */

/** The accent is reserved for THE actionable state — everything else is semantic. */
export type ExamStatusTone = "accent" | StatusToneName;

/** «يفتح بعد ساعتين» — accusative duals so «بعد …» reads grammatically. */
export function fmtUntilAr(msLeft: number): string {
  const mins = Math.floor(Math.max(0, msLeft) / 60_000);
  if (mins < 1) return "أقل من دقيقة";
  if (mins < 60) return countAr(mins, ["دقيقة واحدة", "دقيقتين", "دقائق", "دقيقة"]);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return countAr(hours, ["ساعة واحدة", "ساعتين", "ساعات", "ساعة"]);
  return countAr(Math.floor(hours / 24), ["يوم واحد", "يومين", "أيام", "يوماً"]);
}

/**
 * The ONE status chip per row: upcoming / live / missed / graded (+
 * pending-manual and resumable), semantic colors, accent only when the
 * student can act NOW.
 */
export function examStatusChip(exam: ExamTemplateRow, now = Date.now()): {
  label: string;
  tone: ExamStatusTone;
} {
  const a = exam.myAttempt;
  const ws = examWindowState(exam, now);
  if (ws === "upcoming" && exam.openAt && a?.status !== "IN_PROGRESS") {
    return { label: `يفتح بعد ${fmtUntilAr(new Date(exam.openAt).getTime() - now)}`, tone: "sky" };
  }
  // Practice retake: a finished attempt while the window is still open —
  // the RETAKE is the story, not the old score (accent stays reserved:
  // a retake has no deadline urgency). Closed windows fall through to the
  // graded verdict below.
  if (ws === "open" && a && a.status !== "IN_PROGRESS" && exam.kind === "PRACTICE") {
    return { label: "تدريبي — إعادة متاحة", tone: "grey" };
  }
  const verdict = attemptVerdict(exam);
  if (a?.status === "GRADED" && !verdict) return { label: "مُصحَّح", tone: "mint" };
  if (verdict && (a?.status === "GRADED" || a?.status === "SUBMITTED" || a?.status === "EXPIRED")) {
    return {
      label: verdict.score
        ? `${verdict.label} · ${latn(verdict.score.value)}/${latn(verdict.score.max)}`
        : verdict.label,
      tone: verdict.tone,
    };
  }
  if (a?.status === "IN_PROGRESS") {
    return { label: ws === "open" ? "متابعة المحاولة" : "لم يكتمل", tone: ws === "open" ? "accent" : "grey" };
  }
  if (ws === "open") {
    return { label: "متاح الآن", tone: "accent" };
  }
  return { label: "أغلق باب التسليم", tone: "grey" };
}

/* ── the row ──────────────────────────────────────────────────────────── */

/**
 * M1 — the exams chip hierarchy, two measured tiers:
 *   · PRIMARY (the one loud chip): tone "accent" = act-now — accentSoft
 *     ground, full accent hairline-weight frame, bold accent ink.
 *   · SECONDARY (muted): every other status (upcoming / graded / missed /
 *     pending / retake) — transparent ground, hairline rule frame, muted
 *     medium ink. The label carries the semantics; the row stays quiet so
 *     the accent is the only chip that can shout.
 */
function StatusChip({ tone, label }: { tone: ExamStatusTone; label: string }) {
  const p = usePalette();
  const primary = tone === "accent";
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        borderWidth: primary ? 1 : StyleSheet.hairlineWidth,
        borderColor: primary ? p.accentInk : p.rule,
        backgroundColor: primary ? p.accentSoft : "transparent",
        paddingHorizontal: sp[8],
        paddingVertical: primary ? sp[4] : sp[2],
        alignSelf: "flex-start",
      }}
    >
      <T
        variant="sm"
        weight={primary ? "bold" : "medium"}
        style={{ color: primary ? p.accentInk : p.textMuted }}
      >
        {label}
      </T>
    </View>
  );
}

type ExamRowProps = { item: ExamTemplateRow; last: boolean; now: number };

function ExamRowInner({ item: exam, last, now }: ExamRowProps) {
  const ws = examWindowState(exam, now);
  const status = examStatusChip(exam, now);
  const windowText = exam.openAt
    ? exam.closeAt
      ? `من ${shortDate(exam.openAt)} · حتى ${dateTime(exam.closeAt)}`
      : `يفتح ${dateTime(exam.openAt)}`
    : exam.closeAt
      ? `يغلق ${dateTime(exam.closeAt)}`
      : "بلا نافذة زمنية";

  const cta =
    exam.myAttempt?.status === "IN_PROGRESS"
      ? "متابعة"
      : examStartable(exam) && ws === "open"
        ? exam.myAttempt && exam.kind === "PRACTICE"
          ? "إعادة المحاولة"
          : "ابدأ"
        : "عرض التفاصيل";

  return (
    <LedgerRow
      last={last}
      onPress={() => {
        haptics.selection();
        router.push(`/student/online-exams/${exam.id}` as never);
      }}
      accessibilityLabel={`${exam.title} — ${KIND_LABEL[exam.kind] ?? "اختبار"} — ${status.label}`}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[8] }}>
        <View style={{ flex: 1, gap: sp[2] }}>
          <T variant="bodyLg" weight="bold">
            {exam.title}
          </T>
          <T variant="sm" color="muted">
            {`${exam.courseName ?? exam.facultyName ?? "موحد"} · ${KIND_LABEL[exam.kind] ?? "اختبار"}`}
          </T>
        </View>
        <StatusChip tone={status.tone} label={status.label} />
      </View>
      <T variant="xs" color="muted">
        {windowText}
      </T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[12] }}>
        <MetaBit icon="clock" text={`${num(exam.durationMin)} دقيقة`} />
        <MetaBit icon="check" text={countAr(exam.questionCount ?? 0, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} />
        <MetaBit icon="cal" text={`النجاح ≥ ${exam.passingScore != null ? latn(exam.passingScore) : "—"}%`} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
        <T variant="sm" weight="bold" color={status.tone === "accent" ? "accentInk" : "secondary"}>
          {cta}
        </T>
      </View>
    </LedgerRow>
  );
}

/** Module-scope memoized row — DataList recycling discipline (lists.md). */
const ExamRow = makeRow<ExamTemplateRow, Omit<ExamRowProps, "item">>(ExamRowInner);

function MetaBit({ icon, text }: { icon: "clock" | "check" | "cal"; text: string }) {
  const p = usePalette();
  const color = p.textMuted;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
      {icon === "clock" ? <Clock size={12} color={color} /> : null}
      {icon === "check" ? <ClipboardCheck size={12} color={color} /> : null}
      {icon === "cal" ? <CalendarClock size={12} color={color} /> : null}
      <T variant="xs" color="muted">
        {text}
      </T>
    </View>
  );
}

/** Refresh cadence for «يفتح بعد …» chips — a calm 30s, only while needed. */
const UPGRADE_TICK_MS = 30_000;

/**
 * /student/online-exams — student exam list (web OnlineExamsPage parity):
 * startable window rule, ONE status chip per row (semantic tones, accent
 * reserved for act-now), DataList (FlashList v2) with tri-state defaults,
 * exam-hall empty state, and a 30s refresh tick that only runs while an
 * upcoming exam is listed (timer-to-start).
 */
export default function OnlineExamsScreen() {
  const scope = useInstitutionScope();
  const [filter, setFilter] = useState("all");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const entering = useStaggerEntrance({ base: 40, step: 60 });
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

  const hasUpcoming = exams.some((e) => examWindowState(e) === "upcoming" && e.openAt);
  useEffect(() => {
    if (!hasUpcoming) return;
    const id = setInterval(() => setNowTick(Date.now()), UPGRADE_TICK_MS);
    return () => clearInterval(id);
  }, [hasUpcoming]);

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="الاختبارات الإلكترونية" kicker="مركز الاختبارات" />
      {/* T-50 (review-1 T13): the exam center was a motionless seat —
          header + filter now take the standard staggered entrance. */}
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        <Segmented
          options={[
            { id: "all", label: "الكل" },
            { id: "available", label: "متاحة" },
            { id: "taken", label: "منجزة" },
          ]}
          selectedId={filter}
          onSelect={(id) => {
            haptics.selection();
            setFilter(id);
          }}
        />
        <T variant="sm" color="muted">
          اختبارات معتمدة من مكتب الجودة، موحَّدة عبر الكليات — لا يمكن إعادة المحاولة بعد التسليم إلا في الاختبارات التدريبية.
        </T>
        {visible.length > 0 ? (
          <T variant="xs" color="faint">
            {countAr(visible.length, ["اختبار واحد", "اختباران", "اختبارات", "اختباراً"])}
          </T>
        ) : null}
      </Animated.View>
      <View style={{ flex: 1 }}>
        <DataList
          data={visible}
          renderItem={({ item, index }) => (
            <ExamRow item={item} last={index === visible.length - 1} now={nowTick} />
          )}
          keyExtractor={(e) => e.id}
          extraData={nowTick}
          isLoading={feed.isLoading}
          isError={feed.isError}
          errorMessage={humanizeError(feed.error)}
          onRetry={() => void feed.refetch()}
          refetch={() => void feed.refetch()}
          isRefetching={feed.isRefetching}
          emptySlot={
            <EmptyState
              fill
              room="exam-hall"
              title={filter === "all" ? undefined : "لا توجد اختبارات هنا"}
              message={
                filter === "available"
                  ? "لا توجد اختبارات متاحة حالياً — ستظهر فور اعتماد مكتب الجودة ومقرريك الاختبارات."
                  : filter === "taken"
                    ? "ستظهر اختباراتك المنجزة في هذه القائمة."
                    : undefined
              }
            />
          }
          contentPadding={{ horizontal: 20, bottom: 24 }}
        />
      </View>
    </Screen>
  );
}
