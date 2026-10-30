import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Hourglass } from "lucide-react-native";
import { examsApi, type ReviewPayload, type StartExamPayload, type SubmitExamResult } from "@/api/exams";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, ConfirmDialog, Hairline } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { ProgressBar } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import { dateTime, latn } from "@/lib/format";
import {
  AR_CHOICE_LETTERS,
  TRUE_FALSE_OPTIONS,
  countAr,
  fmtClock,
  isTerminalSubmitError,
  pointsAr,
  restoreSavedAnswers,
} from "@/features/student/more";

/** Bound on flushing in-flight saves before submit (web SUBMIT_FLUSH_MS). */
const SUBMIT_FLUSH_MS = 10_000;
/** Text-answer autosave debounce (spec ~1500ms). */
const TEXT_DEBOUNCE_MS = 1_500;
const TEXT_MAX = 4_000;

type AnsEntry = { choiceIndex?: number; answerText?: string };
type SaveState = "saving" | "saved" | "failed" | null;

interface ResultState {
  attemptId: string;
  score: number;
  maxScore: number;
  passed: boolean | null;
  needsManual: number;
  status: string;
}

/** Immutable toggle for per-question save sets (same reference when unchanged). */
function withQid(prev: ReadonlySet<string>, qid: string, present: boolean): ReadonlySet<string> {
  if (prev.has(qid) === present) return prev;
  const next = new Set(prev);
  if (present) next.add(qid);
  else next.delete(qid);
  return next;
}

/**
 * /student/online-exams/[templateId] — the exam taker.
 * Mirrors the web state machine: auto start on mount (fresh / resumed /
 * alreadyAttempted), wall-clock countdown with one-shot auto-submit at
 * 00:00, per-question autosave (chained, debounced for text), confirm
 * dialog, honest three-way result (passed | null while manual grading
 * pends) and the released-key review on GRADED attempts.
 */
export default function ExamTakerScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const p = usePalette();
  const tones = useStatusTones();

  const examsQ = useQuery({
    queryKey: ["exams", "me", scope],
    queryFn: () => examsApi.myExams(),
    placeholderData: (prev) => prev,
  });
  const listedExam = useMemo(
    () => (examsQ.data ?? []).find((e) => e.id === templateId) ?? null,
    [examsQ.data, templateId],
  );

  const [phase, setPhase] = useState<"starting" | "active" | "terminal">("starting");
  const [startError, setStartError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<StartExamPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnsEntry>>({});
  const [savedQids, setSavedQids] = useState<ReadonlySet<string>>(new Set());
  const [savingQids, setSavingQids] = useState<ReadonlySet<string>>(new Set());
  const [failedQids, setFailedQids] = useState<ReadonlySet<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  const startedRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const finishingRef = useRef(false);
  const pendingSavesRef = useRef(new Map<string, Promise<void>>());
  const debounceRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /* ── start on mount (spec: on mount — the payload discriminates) ── */
  useEffect(() => {
    if (startedRef.current || !templateId) return;
    startedRef.current = true;
    let alive = true;
    (async () => {
      try {
        const r = await examsApi.start(templateId);
        if (!alive) return;
        if (r.alreadyAttempted) {
          setPhase("terminal");
          return;
        }
        autoSubmittedRef.current = false;
        finishingRef.current = false;
        pendingSavesRef.current.clear();
        setSavingQids(new Set());
        setFailedQids(new Set());
        setSavedQids(new Set());
        const restored = r.resumed && r.attempt ? restoreSavedAnswers(r.attempt.answers) : {};
        setAnswers(restored);
        setSavedQids(new Set(Object.keys(restored)));
        setQIndex(0);
        setAttempt(r);
        setPhase("active");
        const expiry = new Date(r.expiresAt).getTime();
        setSecondsLeft(Math.max(0, Math.round((expiry - Date.now()) / 1000)));
      } catch (e) {
        if (!alive) return;
        const err = e as ApiError;
        const detail = err.message ?? "";
        if (detail === "لم يفتح باب هذا الاختبار بعد" && listedExam?.openAt) {
          setStartError(`لم يفتح باب هذا الاختبار بعد — يفتح ${dateTime(listedExam.openAt)}.`);
        } else {
          setStartError(detail || "تعذَّر بدء الاختبار — تحقّق من اتصالك وحاول مرة أخرى.");
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  /* ── per-question autosave (chained, never out-of-order) ─────────── */
  const runAnswerSave = useCallback(
    (qid: string, payload: { answerText?: string; choiceIndex?: number }) => {
      if (!attempt) return;
      if (payload.answerText !== undefined && payload.answerText.length > TEXT_MAX) {
        setFailedQids((prev) => withQid(prev, qid, true));
        return;
      }
      const attemptId = attempt.attemptId;
      const earlier = pendingSavesRef.current.get(qid);
      const tracked = (earlier ? earlier.catch(() => undefined) : Promise.resolve())
        .then(async () => {
          try {
            await examsApi.answer(attemptId, { questionId: qid, ...payload });
            setFailedQids((prev) => withQid(prev, qid, false));
            setSavedQids((prev) => withQid(prev, qid, true));
          } catch {
            setFailedQids((prev) => withQid(prev, qid, true));
            setSavedQids((prev) => withQid(prev, qid, false));
          }
        })
        .finally(() => {
          if (pendingSavesRef.current.get(qid) === tracked) {
            pendingSavesRef.current.delete(qid);
            setSavingQids((prev) => withQid(prev, qid, false));
          }
        });
      pendingSavesRef.current.set(qid, tracked);
      setSavingQids((prev) => withQid(prev, qid, true));
      setSavedQids((prev) => withQid(prev, qid, false));
    },
    [attempt],
  );

  const onChoice = useCallback(
    (qid: string, idx: number) => {
      if (!attempt) return;
      setAnswers((a) => ({ ...a, [qid]: { choiceIndex: idx } }));
      runAnswerSave(qid, { choiceIndex: idx });
    },
    [attempt, runAnswerSave],
  );

  const onTextChange = useCallback(
    (qid: string, text: string) => {
      if (!attempt) return;
      setAnswers((a) => ({ ...a, [qid]: { answerText: text } }));
      const existing = debounceRef.current.get(qid);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        debounceRef.current.delete(qid);
        runAnswerSave(qid, { answerText: text });
      }, TEXT_DEBOUNCE_MS);
      debounceRef.current.set(qid, t);
    },
    [attempt, runAnswerSave],
  );

  /** Flush a debounced text save now (navigate/submit paths). */
  const flushText = useCallback(
    (qid: string) => {
      const t = debounceRef.current.get(qid);
      if (!t) return;
      clearTimeout(t);
      debounceRef.current.delete(qid);
      runAnswerSave(qid, { answerText: answers[qid]?.answerText ?? "" });
    },
    [answers, runAnswerSave],
  );

  const isAnswered = useCallback((qid: string) => {
    const a = answers[qid];
    return !!a && (a.choiceIndex !== undefined || (a.answerText ?? "").trim() !== "");
  }, [answers]);

  const questions = attempt?.questions ?? [];
  const unanswered = questions.filter((q) => !isAnswered(q.id)).length;

  /* ── submit (flush every in-flight/debounced save first) ────────── */
  const submitAttempt = useCallback(async () => {
    if (!attempt || finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setConfirming(false);
    try {
      for (const t of debounceRef.current.values()) clearTimeout(t);
      for (const qid of debounceRef.current.keys()) {
        runAnswerSave(qid, { answerText: answers[qid]?.answerText ?? "" });
      }
      debounceRef.current.clear();
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        Promise.allSettled([...pendingSavesRef.current.values()]).then(() => undefined),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, SUBMIT_FLUSH_MS);
        }),
      ]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
      });
      const r: SubmitExamResult = await examsApi.submit(attempt.attemptId);
      autoSubmittedRef.current = true;
      const attemptId = attempt.attemptId;
      setAttempt(null);
      setResult({
        attemptId,
        score: Number(r.score),
        maxScore: Number(r.maxScore),
        passed: r.passed ?? null,
        needsManual: Number(r.needsManual ?? 0),
        status: r.status,
      });
      void qc.invalidateQueries({ queryKey: ["exams"] });
    } catch (e) {
      if (isTerminalSubmitError(e)) {
        autoSubmittedRef.current = true;
        setAttempt(null);
        setConfirming(false);
        setSubmitting(false);
        setPhase("terminal");
        void examsQ.refetch();
        return;
      }
      setSubmitError((e as Error).message || "تعذَّر تسليم الاختبار — حاول مرة أخرى.");
      finishingRef.current = false;
      setSubmitting(false);
    }
  }, [attempt, answers, examsQ, qc, runAnswerSave]);

  const submitAttemptRef = useRef(submitAttempt);
  useEffect(() => {
    submitAttemptRef.current = submitAttempt;
  }, [submitAttempt]);

  /* ── countdown — wall-clock math, auto-submit exactly once ──────── */
  useEffect(() => {
    if (!attempt) return;
    const expiry = new Date(attempt.expiresAt).getTime();
    const readClock = () => {
      const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0 && !autoSubmittedRef.current && !finishingRef.current) {
        autoSubmittedRef.current = true;
        void submitAttemptRef.current();
      }
    };
    const id = setInterval(readClock, 1000);
    return () => clearInterval(id);
  }, [attempt]);

  /* ── clear pending debouncers on unmount ────────────────────────── */
  useEffect(() => {
    const debounces = debounceRef.current;
    return () => {
      for (const t of debounces.values()) clearTimeout(t);
      debounces.clear();
    };
  }, []);

  const finalityNote =
    listedExam?.kind === "PRACTICE"
      ? "بعد التسليم لا يمكنك تعديل إجاباتك — يمكنك بدء محاولة تدريبية جديدة لاحقاً."
      : "بعد التسليم لا يمكنك تعديل إجاباتك أو إعادة المحاولة.";

  /* ── render: post-submit result ─────────────────────────────────── */
  if (result) {
    return (
      <Screen scroll>
        <StackHeader title="نتيجة الاختبار" onBack={() => router.push("/student/online-exams" as never)} />
        <ResultBody
          result={result}
          onBackToList={() => router.push("/student/online-exams" as never)}
        />
      </Screen>
    );
  }

  /* ── render: terminal (alreadyAttempted) ─────────────────────────── */
  if (phase === "terminal") {
    const myAttempt = listedExam?.myAttempt ?? null;
    const expired = myAttempt?.status === "EXPIRED";
    return (
      <Screen scroll>
        <StackHeader title={listedExam?.title ?? "الاختبار"} />
        {expired ? (
          <>
            <EmptyState
              icon={<Hourglass size={28} color={tones.yellow.ink} />}
              title="انتهت مدة هذه المحاولة"
              message="انتهى وقت المحاولة دون تسليم — لا تُحتسب لها نتيجة ولا يمكن إعادتها."
            />
            <Button label="العودة للقائمة" onPress={() => router.push("/student/online-exams" as never)} />
          </>
        ) : myAttempt && (myAttempt.status === "GRADED" || myAttempt.status === "SUBMITTED") ? (
          <ResultBody
            result={{
              attemptId: myAttempt.id,
              score:
                myAttempt.score !== null && myAttempt.score !== undefined ? Number(myAttempt.score) : 0,
              maxScore:
                myAttempt.maxScore !== null && myAttempt.maxScore !== undefined
                  ? Number(myAttempt.maxScore)
                  : 0,
              passed:
                myAttempt.status === "SUBMITTED"
                  ? null
                  : myAttempt.score !== null &&
                      myAttempt.score !== undefined &&
                      Number(myAttempt.maxScore) > 0
                    ? (Number(myAttempt.score) / Number(myAttempt.maxScore)) * 100 >=
                      (listedExam?.passingScore ?? 0)
                    : null,
              needsManual: myAttempt.status === "SUBMITTED" ? 1 : 0,
              status: myAttempt.status,
            }}
            deepLinked
            onBackToList={() => router.push("/student/online-exams" as never)}
          />
        ) : (
          <>
            <EmptyState
              icon={<CheckCircle2 size={28} color={tones.mint.ink} />}
              title="لقد أكملت هذا الاختبار مسبقاً"
              message="لا يمكن إعادة المحاولة بعد التسليم — راجع نتيجتك من قائمة الاختبارات."
            />
            <Button label="العودة للقائمة" onPress={() => router.push("/student/online-exams" as never)} />
          </>
        )}
      </Screen>
    );
  }

  /* ── render: start failure ──────────────────────────────────────── */
  if (startError) {
    return (
      <Screen scroll>
        <StackHeader title={listedExam?.title ?? "الاختبار"} />
        <ErrorState message={startError} onRetry={() => router.push("/student/online-exams" as never)} />
        <Button label="العودة للقائمة" kind="ghost" onPress={() => router.push("/student/online-exams" as never)} />
      </Screen>
    );
  }

  /* ── render: starting ───────────────────────────────────────────── */
  if (!attempt) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title={listedExam?.title ?? "الاختبار"} />
        <LoadingScreen label="جارٍ تحضير الاختبار…" />
      </Screen>
    );
  }

  /* ── render: active attempt ────────────────────────────────────── */
  const total = questions.length;
  const answeredCount = total - unanswered;
  const timeColor = secondsLeft < 60 ? tones.rose.ink : secondsLeft < 300 ? p.accentInk : p.text;
  const totalMs = (attempt.durationMin || 0) * 60_000 || 1;
  const consumed = Math.min(1, Math.max(0, (totalMs - secondsLeft * 1000) / totalMs));
  const failedNumbers = questions.map((q, i) => (failedQids.has(q.id) ? i + 1 : null)).filter((n): n is number => n !== null);
  const current = total > 0 ? questions[Math.min(qIndex, total - 1)] : null;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title={attempt.title ?? listedExam?.title ?? "الاختبار"}
        kicker={`${latn(total)} سؤال · أُجيب عن ${latn(answeredCount)}`}
        right={
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <T variant="bodyLg" weight="bold" style={{ color: timeColor }}>
              {fmtClock(secondsLeft)}
            </T>
            <Clock size={12} color={timeColor} />
          </View>
        }
      />
      <View style={{ height: 3, backgroundColor: p.border }}>
        <View style={{ height: 3, width: `${consumed * 100}%`, backgroundColor: secondsLeft < 60 ? tones.rose.ink : p.accent }} />
      </View>

      {failedNumbers.length > 0 ? (
        <View style={{ paddingHorizontal: sp[20], paddingTop: sp[8] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
            <AlertTriangle size={14} color={tones.rose.ink} />
            <T variant="sm" style={{ color: tones.rose.deep }}>
              {failedNumbers.length === 1
                ? `تعذَّر حفظ إجابة السؤال ${latn(failedNumbers[0])} — أعد الإجابة عليه`
                : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).map(latn).join(" و")} — أعد الإجابة عليها`}
            </T>
          </View>
        </View>
      ) : null}

      {total > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sp[12], paddingVertical: sp[8], gap: sp[6] }}
          accessibilityLabel="خريطة الأسئلة"
        >
          {questions.map((q, i) => {
            const isCurrent = i === qIndex;
            const answered = isAnswered(q.id);
            const failed = failedQids.has(q.id);
            return (
              <Pressable
                key={q.id}
                accessibilityRole="button"
                accessibilityLabel={`السؤال ${latn(i + 1)} — ${failed ? "تعذَّر الحفظ" : answered ? "مُجاب" : "بدون إجابة"}`}
                onPress={() => {
                  if (current) flushText(current.id);
                  setQIndex(i);
                }}
                style={{
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: failed ? tones.rose.ink : isCurrent ? p.primary : answered ? p.accentInk : p.border,
                  backgroundColor: isCurrent ? p.primary : answered ? p.accentSoft : p.surface,
                }}
              >
                <T
                  variant="sm"
                  weight="bold"
                  style={{ color: isCurrent ? p.primaryFg : answered ? p.accentInk : p.textMuted }}
                >
                  {latn(i + 1)}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: sp[20], paddingBottom: sp[16], gap: sp[12] }} keyboardShouldPersistTaps="handled">
        {total === 0 || !current ? (
          <EmptyState
            title="لا توجد أسئلة في هذا الاختبار"
            message="لم يُعتمد أي سؤال لهذه الورقة بعد — يمكنك تسليم المحاولة كما هي."
          />
        ) : (
          <Card style={{ gap: sp[10] }}>
            <T variant="xs" color="muted">
              {`السؤال ${latn(qIndex + 1)} من ${latn(total)} · ${pointsAr(current.points)}`}
            </T>
            <T variant="bodyLg" weight="bold">
              {current.prompt}
            </T>

            {current.type === "MCQ" || current.type === "TRUE_FALSE" ? (
              <View style={{ gap: sp[8], marginTop: sp[4] }}>
                {(current.choices && current.choices.length > 0
                  ? current.choices
                  : TRUE_FALSE_OPTIONS
                ).map((choice, idx) => {
                  const selected = answers[current.id]?.choiceIndex === idx;
                  const locked = savingQids.has(current.id);
                  return (
                    <Pressable
                      key={idx}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: locked }}
                      accessibilityLabel={`${AR_CHOICE_LETTERS[idx] ?? ""} — ${choice}`}
                      disabled={locked}
                      onPress={() => onChoice(current.id, idx)}
                      style={({ pressed }) => [
                        {
                          minHeight: 48,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: sp[10],
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: selected ? p.accentInk : p.border,
                          backgroundColor: pressed ? p.surfaceHover : selected ? p.accentSoft : p.surface,
                          paddingHorizontal: sp[12],
                          opacity: locked ? 0.7 : 1,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: selected ? p.accentInk : p.rule,
                          backgroundColor: selected ? p.accent : "transparent",
                        }}
                      >
                        {selected ? <Check size={14} color={p.accentFg} /> : null}
                      </View>
                      <T variant="sm" weight="bold" style={{ color: p.accentInk }}>
                        {AR_CHOICE_LETTERS[idx] ?? ""}
                      </T>
                      <View style={{ flex: 1 }}>
                        <T variant="body" color={selected ? "text" : "secondary"}>
                          {choice}
                        </T>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <TextInput
                accessibilityLabel={`إجابة السؤال: ${current.prompt}`}
                value={answers[current.id]?.answerText ?? ""}
                onChangeText={(t) => onTextChange(current.id, t)}
                onBlur={() => flushText(current.id)}
                placeholder="اكتب إجابتك هنا…"
                placeholderTextColor={p.textFaint}
                multiline
                maxLength={TEXT_MAX}
                style={{
                  minHeight: current.type === "ESSAY" ? 150 : 76,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: p.rule,
                  backgroundColor: p.bg,
                  color: p.text,
                  fontSize: 15,
                  textAlign: "right",
                  padding: sp[12],
                }}
              />
            )}

            {(() => {
              const saveState: SaveState = failedQids.has(current.id)
                ? "failed"
                : savingQids.has(current.id)
                  ? "saving"
                  : savedQids.has(current.id)
                    ? "saved"
                    : null;
              if (!saveState) return null;
              const icon =
                saveState === "failed" ? (
                  <AlertTriangle size={12} color={tones.rose.ink} />
                ) : saveState === "saving" ? (
                  <Clock size={12} color={p.textMuted} />
                ) : (
                  <CheckCircle2 size={12} color={tones.mint.ink} />
                );
              return (
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                  {icon}
                  <T
                    variant="xs"
                    style={{
                      color:
                        saveState === "failed" ? tones.rose.deep : saveState === "saved" ? tones.mint.deep : p.textMuted,
                    }}
                  >
                    {saveState === "failed"
                      ? (answers[current.id]?.answerText ?? "").length > TEXT_MAX
                        ? "الإجابة أطول من الحد (4000 حرفًا) — اختصرها ليُحفظ"
                        : "تعذَّر الحفظ"
                      : saveState === "saving"
                        ? "جارٍ الحفظ…"
                        : "محفوظة"}
                  </T>
                </View>
              );
            })()}
          </Card>
        )}

        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <Button
              label="السابق"
              kind="ghost"
              small
              disabled={qIndex <= 0}
              onPress={() => {
                if (current) flushText(current.id);
                setQIndex((i) => Math.max(0, i - 1));
              }}
              icon={<ChevronRight size={16} color={p.text} />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="التالي"
              kind="ghost"
              small
              disabled={total === 0 || qIndex >= total - 1}
              onPress={() => {
                if (current) flushText(current.id);
                setQIndex((i) => Math.min(total - 1, i + 1));
              }}
              icon={<ChevronLeft size={16} color={p.text} />}
            />
          </View>
        </View>

        {submitError ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
            <AlertTriangle size={14} color={tones.rose.ink} />
            <T variant="sm" style={{ color: tones.rose.deep }}>
              {submitError}
            </T>
          </View>
        ) : null}

        <Hairline />
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <T variant="sm" color={unanswered > 0 ? "danger" : "muted"}>
              {unanswered > 0
                ? countAr(unanswered, ["سؤال واحد بدون إجابة", "سؤالان بدون إجابة", "أسئلة بدون إجابة", "سؤالاً بدون إجابة"])
                : "أُجيب عن كل الأسئلة"}
            </T>
          </View>
          <Button label="تسليم الاختبار" kind="primary" loading={submitting} onPress={() => setConfirming(true)} />
        </View>
        <ProgressBar ratio={total > 0 ? answeredCount / total : 0} label="تقدّم الإجابات" />
      </ScrollView>

      <ConfirmDialog
        open={confirming}
        title="تأكيد التسليم؟ لا يمكن التراجع."
        message={
          unanswered > 0
            ? `لديك ${countAr(unanswered, ["سؤال واحد بدون إجابة", "سؤالان بدون إجابة", "أسئلة بدون إجابة", "سؤالاً بدون إجابة"])}. ${finalityNote}`
            : finalityNote
        }
        confirmLabel="تسليم نهائي"
        loading={submitting}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void submitAttempt()}
      />
    </Screen>
  );
}

/* ── Result + review body (shared by post-submit and deep-link done) ── */
function ResultBody({
  result,
  deepLinked,
  onBackToList,
}: {
  result: ResultState;
  deepLinked?: boolean;
  onBackToList: () => void;
}) {
  const p = usePalette();
  const tones = useStatusTones();
  const awaitingManual = result.passed === null && result.status !== "GRADED";
  const [reviewOpen, setReviewOpen] = useState(Boolean(deepLinked) && !awaitingManual);
  const review = useQuery({
    queryKey: ["exams", "review", result.attemptId],
    queryFn: () => examsApi.review(result.attemptId),
    enabled: reviewOpen,
  });

  const scoreVisible = result.score > 0 || result.maxScore > 0;

  return (
    <View style={{ gap: sp[16] }}>
      <EmptyState
        icon={<CheckCircle2 size={28} color={tones.mint.ink} />}
        title={
          awaitingManual
            ? "تم تسليم اختبارك"
            : result.passed
              ? "مبروك — لقد اجتزت الاختبار!"
              : "الاختبار انتهى"
        }
        message={
          awaitingManual
            ? "درجتك الأولية من الأسئلة الآلية — الدرجات المقالية بانتظار تقييم الأستاذ."
            : "تم احتساب النتيجة."
        }
      />

      {scoreVisible || !awaitingManual ? (
        <Card style={{ alignItems: "center", gap: sp[8] }}>
          {scoreVisible ? (
            <T variant="h1" weight="bold">
              {`${latn(result.score)} / ${latn(result.maxScore)}`}
            </T>
          ) : null}
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            {awaitingManual ? (
              <Badge label="بانتظار التصحيح اليدوي" tone="yellow" />
            ) : result.passed === null ? (
              <Badge label="مُصحَّح" tone="mint" />
            ) : (
              <Badge label={result.passed ? "ناجح" : "لم يجتز"} tone={result.passed ? "mint" : "rose"} />
            )}
          </View>
          <T variant="sm" color="muted" align="center">
            {result.needsManual > 0
              ? `${countAr(result.needsManual, ["سؤال", "سؤالان", "أسئلة", "سؤالاً"])} بحاجة لتقييم يدوي من الأستاذ — ستظهر الدرجة النهائية بعد المراجعة.`
              : "تم احتساب النتيجة فوراً."}
          </T>
        </Card>
      ) : null}

      {awaitingManual ? (
        <T variant="sm" color="muted" align="center">
          ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح اليدوي.
        </T>
      ) : (
        <View style={{ gap: sp[8] }}>
          <Button
            label={reviewOpen ? "إخفاء المراجعة" : "مراجعة الأسئلة"}
            kind="ghost"
            small
            onPress={() => setReviewOpen((v) => !v)}
          />
          {reviewOpen ? (
            review.isLoading ? (
              <T variant="sm" color="muted">
                جارٍ تحميل المراجعة…
              </T>
            ) : review.isError ? (
              <ErrorState message={(review.error as Error).message} onRetry={() => review.refetch()} compact />
            ) : (
              <View style={{ gap: sp[10] }}>
                {(review.data?.questions ?? []).map((q, i) => (
                  <ReviewQuestion key={q.questionId} q={q} index={i} />
                ))}
                {(review.data?.questions ?? []).length === 0 ? (
                  <T variant="sm" color="muted">
                    لا توجد تفاصيل مراجعة لهذه المحاولة.
                  </T>
                ) : null}
              </View>
            )
          ) : null}
        </View>
      )}

      <Button label="العودة للقائمة" kind="primary" onPress={onBackToList} />
    </View>
  );
}

function ReviewQuestion({ q, index }: { q: ReviewPayload["questions"][number]; index: number }) {
  const p = usePalette();
  const tones = useStatusTones();
  const myChoice =
    q.myChoiceIndex !== null && q.myChoiceIndex !== undefined && q.choices ? q.choices[q.myChoiceIndex] ?? null : null;
  const keyChoice =
    typeof q.correctAnswer === "number" && q.choices ? q.choices[q.correctAnswer] ?? null : null;
  const answered = myChoice !== null || (q.myAnswerText ?? "").trim() !== "";
  const verdictTone = q.isCorrect === true ? "mint" : q.isCorrect === false ? "rose" : "grey";
  const verdictLabel = q.isCorrect === true ? "صحيحة" : q.isCorrect === false ? "خاطئة" : "بتقييم الأستاذ";
  return (
    <Card style={{ gap: sp[6] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <T variant="sm" weight="bold" color="accentInk">
          {latn(index + 1)}
        </T>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="bold">
            {q.prompt}
          </T>
        </View>
        <Badge label={verdictLabel} tone={verdictTone} />
      </View>
      <T variant="xs" color="muted">
        {`${latn(q.awardedPoints ?? 0)} / ${latn(q.points)} درجة`}
      </T>
      <T variant="sm" color="secondary">
        {`إجابتك: ${answered ? myChoice ?? q.myAnswerText ?? "" : "لم تُجب عن هذا السؤال"}`}
      </T>
      {keyChoice !== null || typeof q.correctAnswer === "string" ? (
        <T variant="sm" color="secondary">
          {`الإجابة الصحيحة: ${keyChoice ?? String(q.correctAnswer)}`}
        </T>
      ) : null}
      {q.feedback ? (
        <T variant="sm" color="accentInk">
          {`ملاحظة الأستاذ: ${q.feedback}`}
        </T>
      ) : null}
    </Card>
  );
}
