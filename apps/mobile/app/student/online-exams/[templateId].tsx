import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { AppState, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue } from "react-native-reanimated";
import AlertTriangle from "lucide-react-native/icons/triangle-alert";
import Check from "lucide-react-native/icons/check";
import CheckCircle2 from "lucide-react-native/icons/circle-check";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Clock from "lucide-react-native/icons/clock";
import Flag from "lucide-react-native/icons/flag";
import Hourglass from "lucide-react-native/icons/hourglass";
import LayoutGrid from "lucide-react-native/icons/layout-grid";
import { examsApi, type ReviewPayload, type StartExamPayload, type SubmitExamResult } from "@/api/exams";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, radius, touchFloor, type } from "@/design/tokens";
import { fonts } from "@/design/fonts";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card, Hairline } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { ProgressBar } from "@/components/ui/data";
import { AppSheet, ConfirmSheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState, LoadingScreen } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { haptics } from "@/haptics";
import { PressableScale } from "@/motion";
import { humanizeError } from "@/lib/errors";
import { useNetworkStatus } from "@/lib/resilience/network";
import { enqueueAnswer, flushAnswers, peekAnswers, sendAnswerViaExamsApi } from "@/lib/resilience/queue";
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
/** Countdown crosses to the accent ink under 5 minutes, to danger under 1. */
const WARN_UNDER_MS = 300_000;
const DANGER_UNDER_MS = 60_000;

type AnsEntry = { choiceIndex?: number; answerText?: string };

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

/* ── pure helpers (unit-pinned in src/test/exam-runner.test.tsx) ─────── */

/** The per-question autosave chip, worst state first. */
export type SaveChip = "failed" | "saving" | "queued" | "saved" | null;

export function deriveSaveChip(o: {
  failed: boolean;
  saving: boolean;
  queued: boolean;
  saved: boolean;
}): SaveChip {
  if (o.failed) return "failed";
  if (o.saving) return "saving";
  if (o.queued) return "queued";
  if (o.saved) return "saved";
  return null;
}

/** Where an answer save goes: the durable queue whenever we're offline. */
export function planAnswerSave(isOnline: boolean): "direct" | "queue" {
  return isOnline ? "direct" : "queue";
}

/** «لديك سؤالان بدون إجابة.» — the confirm-sheet warning (web grammar). */
export function unansweredNoteAr(n: number): string {
  return `لديك ${countAr(n, ["سؤال واحد بدون إجابة", "سؤالان بدون إجابة", "أسئلة بدون إجابة", "سؤالاً بدون إجابة"])}.`;
}

/** One navigator cell: every state the grid needs, derived purely. */
export interface NavCell {
  qid: string;
  index: number;
  current: boolean;
  answered: boolean;
  flagged: boolean;
  failed: boolean;
}

export function deriveNavigatorCells(
  questions: readonly { id: string }[],
  o: {
    answeredQids: ReadonlySet<string>;
    flaggedQids: ReadonlySet<string>;
    failedQids: ReadonlySet<string>;
    currentIndex: number;
  },
): NavCell[] {
  return questions.map((q, i) => ({
    qid: q.id,
    index: i,
    current: i === o.currentIndex,
    answered: o.answeredQids.has(q.id),
    flagged: o.flaggedQids.has(q.id),
    failed: o.failedQids.has(q.id),
  }));
}

/** Arabic a11y sentence for one navigator cell. */
export function navCellA11y(cell: NavCell): string {
  const parts = [`السؤال ${latn(cell.index + 1)}`];
  if (cell.current) parts.push("الحالي");
  if (cell.failed) parts.push("تعذّر الحفظ");
  else if (cell.answered) parts.push("مُجاب");
  else parts.push("بدون إجابة");
  if (cell.flagged) parts.push("معلَّم للمراجعة");
  return parts.join(" — ");
}

/* ── the countdown leaves (audit P1 fix) ──────────────────────────────── */

/**
 * RN's TextInput has no `text` prop in its public type, but the native
 * component accepts one — the documented reanimated UI-thread text trick
 * (same as @/motion CountUp).
 */
type AnimatedTextInputProps = TextInputProps & { text?: string };
const AnimatedTextInput = Animated.createAnimatedComponent(
  TextInput as unknown as ComponentType<AnimatedTextInputProps>,
);

export interface ExamCountdownProps {
  /** Absolute expiry (wall clock) — backgrounding can't drift it. */
  expiresAtMs: number;
  /** Seconds left when the attempt started rendering (a11y label seed). */
  initialSeconds: number;
  onExpire: () => void;
  testID?: string;
}

/**
 * EXAM COUNTDOWN — the audit-P1 fix. The 1 Hz tick writes a reanimated
 * shared value ONLY: the digits update on the UI thread through the
 * animated `text` prop and the threshold colors through an animated style,
 * so a ticking second re-renders NOTHING on the JS side — the previous
 * implementation setState'd the whole 800-line screen every second for the
 * whole exam. `onExpire` (auto-submit) fires exactly once, from JS.
 *
 * Memoized with stable-prop discipline: expiresAtMs/initialSeconds are
 * plain numbers fixed per attempt, onExpire is a stable useCallback in the
 * parent — the screen's re-renders (typing, navigating) never re-render it.
 */
export const ExamCountdown = memo(function ExamCountdown({
  expiresAtMs,
  initialSeconds,
  onExpire,
  testID,
}: ExamCountdownProps) {
  const p = usePalette();
  const tones = useStatusTones();
  const secondsLeft = useSharedValue(initialSeconds);

  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (initialSeconds <= 0) {
      onExpireRef.current();
      return;
    }
    let expired = false;
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000));
      secondsLeft.value = s; // UI-thread write — no setState, no re-render
      if (s <= 0 && !expired) {
        expired = true;
        clearInterval(id);
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAtMs, initialSeconds, secondsLeft]);

  const clockText = useDerivedValue(() => fmtClock(secondsLeft.value));
  const animatedProps = useAnimatedProps<AnimatedTextInputProps>(() => ({
    text: clockText.value,
  }));
  const timeStyle = useAnimatedStyle(() => ({
    color:
      secondsLeft.value * 1000 <= DANGER_UNDER_MS
        ? tones.rose.ink
        : secondsLeft.value * 1000 <= WARN_UNDER_MS
          ? p.accentInk
          : p.text,
  }));

  return (
    <View style={{ alignItems: "flex-end", gap: sp[2] }}>
      <AnimatedTextInput
        testID={testID}
        editable={false}
        pointerEvents="none"
        defaultValue={fmtClock(initialSeconds)}
        animatedProps={animatedProps}
        accessibilityLabel={`الوقت المتبقي ${fmtClock(initialSeconds)}`}
        // M8 — the clock rides the bodyLg rung from the app tokens (raw
        // 15/24/700 → type.bodyLg + the bold family), not ad-hoc numbers.
        style={[{ fontSize: type.bodyLg, lineHeight: 24, fontFamily: fonts.bodyBold }, timeStyle]}
      />
      <Clock size={12} color={p.textMuted} />
    </View>
  );
});

/**
 * Time-consumed bar — its own memoized leaf. The 1 Hz tick re-renders ONLY
 * this 3px strip (never the question tree); the digits above ride the UI
 * thread via ExamCountdown. Decorative: hidden from a11y (the countdown
 * text is the announced time).
 */
export const ExamTimeBar = memo(function ExamTimeBar({
  expiresAtMs,
  durationMs,
  initialSeconds,
}: {
  expiresAtMs: number;
  durationMs: number;
  initialSeconds: number;
}) {
  const p = usePalette();
  const tones = useStatusTones();
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.max(0, Math.round((expiresAtMs - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAtMs]);
  const total = durationMs > 0 ? durationMs : 1;
  const consumed = Math.min(1, Math.max(0, (total - seconds * 1000) / total));
  return (
    <View
      style={{ height: 3, backgroundColor: p.border }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          height: 3,
          width: `${consumed * 100}%`,
          backgroundColor: seconds * 1000 <= DANGER_UNDER_MS ? tones.rose.ink : p.accent,
        }}
      />
    </View>
  );
});

/**
 * /student/online-exams/[templateId] — the exam taker.
 * Mirrors the web state machine: auto start on mount (fresh / resumed /
 * alreadyAttempted), wall-clock countdown with one-shot auto-submit at
 * 00:00 (UI-thread ticking — audit P1), per-question autosave (chained
 * when online, the durable offline queue when not — never lost on
 * backgrounding), question navigator + confirm via AppSheet, honest
 * three-way result (passed | null while manual grading pends) and the
 * released-key review on GRADED attempts.
 */
export default function ExamTakerScreen() {
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const p = usePalette();
  const tones = useStatusTones();
  // Connectivity rides ExamNetGate (mounted only while an attempt is
  // live) — the runner reads the value through this ref. NetInfo's
  // subscription cannot boot under jest (its internal state fetch
  // rejects unhandled the moment a listener registers), so it must stay
  // out of the render net's signed-out pass of this route.
  const isOnlineRef = useRef(true);

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
  const [clock, setClock] = useState<{ expiresAtMs: number; seedMs: number } | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnsEntry>>({});
  const [savedQids, setSavedQids] = useState<ReadonlySet<string>>(new Set());
  const [savingQids, setSavingQids] = useState<ReadonlySet<string>>(new Set());
  const [failedQids, setFailedQids] = useState<ReadonlySet<string>>(new Set());
  const [queuedQids, setQueuedQids] = useState<ReadonlySet<string>>(new Set());
  const [flaggedQids, setFlaggedQids] = useState<ReadonlySet<string>>(new Set());
  const [qIndex, setQIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);

  /* navigator + confirm sheets — mounted only after first open: keeps the
     heavy bottom-sheet engine out of the cold-start path (and out of the
     jest render net — RNGH can't boot without a native runtime). Latch via
     the render-phase adjustment pattern (setState during render for a
     derived latch is the blessed alternative to setState-in-effect). */
  const [navOpen, setNavOpen] = useState(false);
  const [navEverOpened, setNavEverOpened] = useState(false);
  const [navPick, setNavPick] = useState<number | null>(null);
  const [confirmEverOpened, setConfirmEverOpened] = useState(false);
  if (navOpen && !navEverOpened) setNavEverOpened(true);
  if (confirming && !confirmEverOpened) setConfirmEverOpened(true);

  const startedRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const finishingRef = useRef(false);
  const pendingSavesRef = useRef(new Map<string, Promise<void>>());
  const debounceRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const answersRef = useRef<Record<string, AnsEntry>>({});

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
        setQueuedQids(new Set());
        const restored = r.resumed && r.attempt ? restoreSavedAnswers(r.attempt.answers) : {};
        setAnswers(restored);
        answersRef.current = restored;
        setSavedQids(new Set(Object.keys(restored)));
        setQIndex(0);
        setAttempt(r);
        const expiresAtMs = new Date(r.expiresAt).getTime();
        setClock({ expiresAtMs, seedMs: Date.now() });
        setPhase("active");
      } catch (e) {
        if (!alive) return;
        const detail = humanizeError(e);
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

  /* ── queue bookkeeping (offline answers) ─────────────────────────── */

  /** Flush the durable queue (single-flight) and reconcile the chips. */
  const flushQueue = useCallback(
    async (attemptId: string, announce: boolean) => {
      const before = await peekAnswers();
      const mineBefore = new Set(
        before.filter((q) => q.attemptId === attemptId).map((q) => q.questionId),
      );
      const report = await flushAnswers(sendAnswerViaExamsApi, {
        shouldDrop: (e) => e instanceof ApiError && e.status === 404,
      });
      const after = await peekAnswers();
      const stillQueued = new Set(after.filter((q) => q.attemptId === attemptId).map((q) => q.questionId));
      setQueuedQids(stillQueued);
      const gone = [...mineBefore].filter((qid) => !stillQueued.has(qid));
      if (gone.length > 0) {
        setSavedQids((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const qid of gone)
            if (!next.has(qid)) {
              next.add(qid);
              changed = true;
            }
          return changed ? next : prev;
        });
        setFailedQids((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const qid of gone)
            if (next.has(qid)) {
              next.delete(qid);
              changed = true;
            }
          return changed ? next : prev;
        });
      }
      if (announce && report.sent > 0) {
        toast.success("تمت مزامنة إجاباتك المحفوظة.", "عاد الاتصال");
      }
      return report;
    },
    [],
  );

  /* flush on reconnect + once per attempt while online (relaunch with a
     resumed attempt may still hold queued answers from last session) —
     both live inside ExamNetGate, mounted only while the attempt runs. */

  /* ── per-question autosave (chained online, durable offline) ─────── */

  const runAnswerSave = useCallback(
    (qid: string, payload: { answerText?: string; choiceIndex?: number }) => {
      if (!attempt) return;
      if (payload.answerText !== undefined && payload.answerText.length > TEXT_MAX) {
        setFailedQids((prev) => withQid(prev, qid, true));
        return;
      }
      const attemptId = attempt.attemptId;

      if (planAnswerSave(isOnlineRef.current) === "queue") {
        // Offline: durable enqueue — flushAnswers picks it up on reconnect.
        setSavingQids((prev) => withQid(prev, qid, false));
        setSavedQids((prev) => withQid(prev, qid, false));
        void enqueueAnswer({ attemptId, questionId: qid, ...payload })
          .then(() => setQueuedQids((prev) => withQid(prev, qid, true)))
          .catch(() => setFailedQids((prev) => withQid(prev, qid, true)));
        return;
      }

      const earlier = pendingSavesRef.current.get(qid);
      const tracked = (earlier ? earlier.catch(() => undefined) : Promise.resolve())
        .then(async () => {
          try {
            await examsApi.answer(attemptId, { questionId: qid, ...payload });
            setFailedQids((prev) => withQid(prev, qid, false));
            setQueuedQids((prev) => withQid(prev, qid, false));
            setSavedQids((prev) => withQid(prev, qid, true));
          } catch {
            // Never lose the tap: park it in the durable queue (a resend of
            // the same latest value is harmless per-question server-side)
            // and retry once; the reconnect flush catches the rest.
            setSavedQids((prev) => withQid(prev, qid, false));
            try {
              await enqueueAnswer({ attemptId, questionId: qid, ...payload });
              setQueuedQids((prev) => withQid(prev, qid, true));
              setFailedQids((prev) => withQid(prev, qid, false));
            } catch {
              setFailedQids((prev) => withQid(prev, qid, true));
            }
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

  const runAnswerSaveRef = useRef(runAnswerSave);
  useEffect(() => {
    runAnswerSaveRef.current = runAnswerSave;
  }, [runAnswerSave]);

  const onChoice = useCallback(
    (qid: string, idx: number) => {
      if (!attempt) return;
      setAnswers((a) => {
        const next = { ...a, [qid]: { choiceIndex: idx } };
        answersRef.current = next;
        return next;
      });
      runAnswerSave(qid, { choiceIndex: idx });
    },
    [attempt, runAnswerSave],
  );

  const onTextChange = useCallback(
    (qid: string, text: string) => {
      if (!attempt) return;
      setAnswers((a) => {
        const next = { ...a, [qid]: { answerText: text } };
        answersRef.current = next;
        return next;
      });
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
      runAnswerSave(qid, { answerText: answersRef.current[qid]?.answerText ?? "" });
    },
    [runAnswerSave],
  );

  /** Fire every still-debounced text save NOW — backgrounding/unmount/submit. */
  const commitDebouncedText = useCallback(() => {
    for (const [qid, t] of debounceRef.current) {
      clearTimeout(t);
      runAnswerSaveRef.current(qid, { answerText: answersRef.current[qid]?.answerText ?? "" });
    }
    debounceRef.current.clear();
  }, []);

  /* never lose a typed answer on suspend: commit debounces to the
     queue/network the moment the app leaves the foreground. */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") commitDebouncedText();
    });
    return () => sub.remove();
  }, [commitDebouncedText]);

  /* unmount: commit (not discard) — the old cleanup threw away anything
     still inside the 1.5s debounce window. */
  useEffect(() => {
    const debounces = debounceRef.current;
    return () => {
      for (const [qid, t] of debounces) {
        clearTimeout(t);
        runAnswerSaveRef.current(qid, { answerText: answersRef.current[qid]?.answerText ?? "" });
      }
      debounces.clear();
    };
  }, []);

  const toggleFlag = useCallback((qid: string) => {
    haptics.selection();
    setFlaggedQids((prev) => withQid(prev, qid, !prev.has(qid)));
  }, []);

  const isAnswered = useCallback((qid: string) => {
    const a = answers[qid];
    return !!a && (a.choiceIndex !== undefined || (a.answerText ?? "").trim() !== "");
  }, [answers]);

  const questions = attempt?.questions ?? [];
  const total = questions.length;
  const current = total > 0 ? questions[Math.min(qIndex, total - 1)] : null;
  const unanswered = questions.filter((q) => !isAnswered(q.id)).length;

  /** Jump to a question from the navigator sheet (plain fn — used inline by
      the sheet footer only, so the compiler memoizes what it needs). */
  const jumpTo = (target: number) => {
    if (current) flushText(current.id);
    setQIndex(target);
    setNavOpen(false);
  };

  /* ── submit (flush every in-flight/debounced/queued save first) ──── */
  const submitAttempt = useCallback(async () => {
    if (!attempt || finishingRef.current) return;
    finishingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setConfirming(false);
    try {
      for (const t of debounceRef.current.values()) clearTimeout(t);
      for (const qid of debounceRef.current.keys()) {
        runAnswerSave(qid, { answerText: answersRef.current[qid]?.answerText ?? "" });
      }
      debounceRef.current.clear();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const bound = SUBMIT_FLUSH_MS;
      await Promise.race([
        Promise.allSettled([...pendingSavesRef.current.values()]).then(() => undefined),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, bound);
        }),
      ]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
      });
      // offline-queued answers ride the same bounded flush before submit
      await Promise.race([
        flushQueue(attempt.attemptId, false).then(() => undefined),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, bound);
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
      haptics.notify("success");
      toast.success("تم تسليم اختبارك.", "تمّ التسليم");
      void qc.invalidateQueries({ queryKey: ["exams"] });
      void qc.invalidateQueries({ queryKey: ["me", "results"] });
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
      haptics.notify("error");
      setSubmitError(humanizeError(e) || "تعذَّر تسليم الاختبار — حاول مرة أخرى.");
      finishingRef.current = false;
      setSubmitting(false);
    }
  }, [attempt, examsQ, flushQueue, qc, runAnswerSave]);

  const submitAttemptRef = useRef(submitAttempt);
  useEffect(() => {
    submitAttemptRef.current = submitAttempt;
  }, [submitAttempt]);

  /** Time's up — one-shot auto-submit (called from the countdown leaf). */
  const handleExpire = useCallback(() => {
    if (autoSubmittedRef.current || finishingRef.current) return;
    autoSubmittedRef.current = true;
    haptics.notify("warning");
    void submitAttemptRef.current();
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
  if (!attempt || !clock) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title={listedExam?.title ?? "الاختبار"} />
        <LoadingScreen label="جارٍ تحضير الاختبار…" />
      </Screen>
    );
  }

  /* ── render: active attempt ────────────────────────────────────── */
  const answeredCount = total - unanswered;
  const totalMs = (attempt.durationMin || 0) * 60_000 || 1;
  const initialSeconds = Math.max(0, Math.round((clock.expiresAtMs - clock.seedMs) / 1000));
  const failedNumbers = questions.map((q, i) => (failedQids.has(q.id) ? i + 1 : null)).filter((n): n is number => n !== null);
  const navCells = deriveNavigatorCells(questions, {
    answeredQids: new Set(questions.filter((q) => isAnswered(q.id)).map((q) => q.id)),
    flaggedQids,
    failedQids,
    currentIndex: qIndex,
  });

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title={attempt.title ?? listedExam?.title ?? "الاختبار"}
        kicker={`${latn(total)} سؤال · أُجيب عن ${latn(answeredCount)}`}
        right={
          <ExamCountdown
            expiresAtMs={clock.expiresAtMs}
            initialSeconds={initialSeconds}
            onExpire={handleExpire}
          />
        }
      />
      <ExamTimeBar expiresAtMs={clock.expiresAtMs} durationMs={totalMs} initialSeconds={initialSeconds} />

      <ExamNetGate attemptId={attempt.attemptId} isOnlineRef={isOnlineRef} onFlush={flushQueue} />

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
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`خريطة الأسئلة — ${latn(answeredCount)} مُجاب و${latn(flaggedQids.size)} معلَّم للمراجعة من ${latn(total)}`}
          onPress={() => {
            haptics.selection();
            setNavPick(qIndex);
            setNavOpen(true);
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: sp[8],
            marginHorizontal: sp[20],
            marginTop: sp[8],
            minHeight: touchFloor,
            paddingHorizontal: sp[12],
            paddingVertical: sp[6],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            backgroundColor: p.surface,
          }}
        >
          <LayoutGrid size={16} color={p.textMuted} />
          <T variant="sm" weight="bold">
            خريطة الأسئلة
          </T>
          <View style={{ flex: 1 }} />
          <T variant="xs" color="muted">{`مُجاب ${latn(answeredCount)}/${latn(total)} · معلَّم ${latn(flaggedQids.size)}`}</T>
        </PressableScale>
      ) : null}

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: sp[20], paddingBottom: sp[16], gap: sp[12] }} keyboardShouldPersistTaps="handled">
        {total === 0 || !current ? (
          <EmptyState
            title="لا توجد أسئلة في هذا الاختبار"
            message="لم يُعتمد أي سؤال لهذه الورقة بعد — يمكنك تسليم المحاولة كما هي."
          />
        ) : (
          <Card style={{ gap: sp[10] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <T variant="xs" color="muted">
                  {`السؤال ${latn(qIndex + 1)} من ${latn(total)} · ${pointsAr(current.points)}`}
                </T>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ selected: flaggedQids.has(current.id) }}
                accessibilityLabel={flaggedQids.has(current.id) ? "إزالة علامة المراجعة" : "وضع علامة المراجعة على هذا السؤال"}
                onPress={() => toggleFlag(current.id)}
                style={{
                  minHeight: touchFloor,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: sp[6],
                  paddingHorizontal: sp[8],
                }}
              >
                <Flag size={16} color={flaggedQids.has(current.id) ? p.accentInk : p.textMuted} />
                <T variant="xs" color={flaggedQids.has(current.id) ? "accentInk" : "muted"}>
                  {flaggedQids.has(current.id) ? "معلَّم للمراجعة" : "علِّم للمراجعة"}
                </T>
              </PressableScale>
            </View>
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
                    <PressableScale
                      key={idx}
                      accessibilityRole="radio"
                      accessibilityState={{ selected, disabled: locked }}
                      accessibilityLabel={`${AR_CHOICE_LETTERS[idx] ?? ""} — ${choice}`}
                      disabled={locked}
                      onPress={() => onChoice(current.id, idx)}
                      style={{
                        minHeight: 48,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: sp[10],
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: selected ? p.accentInk : p.border,
                        backgroundColor: selected ? p.accentSoft : p.surface,
                        paddingHorizontal: sp[12],
                        paddingVertical: sp[8],
                        opacity: locked ? 0.7 : 1,
                      }}
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
                    </PressableScale>
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
                  // M8 — the answer field rides the bodyLg rung (15/24)
                  // from the app tokens.
                  fontSize: type.bodyLg,
                  lineHeight: 24,
                  textAlign: "right",
                  padding: sp[12],
                }}
              />
            )}

            {(() => {
              const chip = deriveSaveChip({
                failed: failedQids.has(current.id),
                saving: savingQids.has(current.id),
                queued: queuedQids.has(current.id),
                saved: savedQids.has(current.id),
              });
              if (!chip) return null;
              // M1 — the save chip is the SECONDARY tier: hairline frame,
              // muted ink. Only «تعذّر الحفظ» keeps its rose alert ink —
              // a failed save is an error to act on, not a status color.
              const failed = chip === "failed";
              const icon =
                chip === "failed" ? (
                  <AlertTriangle size={12} color={tones.rose.ink} />
                ) : chip === "saving" ? (
                  <Clock size={12} color={p.textMuted} />
                ) : chip === "queued" ? (
                  <Hourglass size={12} color={p.textMuted} />
                ) : (
                  <CheckCircle2 size={12} color={p.textMuted} />
                );
              return (
                <View
                  style={{
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: sp[6],
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: failed ? tones.rose.ink : p.rule,
                    paddingHorizontal: sp[8],
                    paddingVertical: sp[2],
                  }}
                >
                  {icon}
                  <T
                    variant="sm"
                    weight="medium"
                    style={{ color: failed ? tones.rose.deep : p.textMuted }}
                  >
                    {chip === "failed"
                      ? (answers[current.id]?.answerText ?? "").length > TEXT_MAX
                        ? "الإجابة أطول من الحد (4000 حرفًا) — اختصرها ليُحفظ"
                        : "تعذّر الحفظ"
                      : chip === "saving"
                        ? "جارٍ الحفظ…"
                        : chip === "queued"
                          ? "في الانتظار — دون اتصال"
                          : "تم الحفظ"}
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
            {queuedQids.size > 0 ? (
              <T variant="sm" style={{ color: tones.yellow.deep }}>
                {`${countAr(queuedQids.size, ["إجابة واحدة في الانتظار", "إجابتان في الانتظار", "إجابات في الانتظار", "إجابةً في الانتظار"])} — دون اتصال`}
              </T>
            ) : (
              <T variant="sm" color={unanswered > 0 ? "danger" : "muted"}>
                {unanswered > 0
                  ? countAr(unanswered, ["سؤال واحد بدون إجابة", "سؤالان بدون إجابة", "أسئلة بدون إجابة", "سؤالاً بدون إجابة"])
                  : "أُجيب عن كل الأسئلة"}
              </T>
            )}
          </View>
          <Button label="تسليم الاختبار" kind="primary" loading={submitting} onPress={() => setConfirming(true)} />
        </View>
        <ProgressBar ratio={total > 0 ? answeredCount / total : 0} label="تقدّم الإجابات" />
      </ScrollView>

      {/* navigator sheet — mounted on first open (lazy engine load) */}
      {navEverOpened ? (
        <AppSheet
          open={navOpen}
          onClose={() => setNavOpen(false)}
          title="خريطة الأسئلة"
          snap="lg"
          dynamic={false}
          scrollable
          footer={
            <Button
              label={navPick == null ? "اختر سؤالاً" : `انتقال إلى السؤال ${latn(navPick + 1)}`}
              kind="primary"
              disabled={navPick == null}
              onPress={() => {
                if (navPick == null) return;
                haptics.selection();
                jumpTo(navPick);
              }}
            />
          }
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[12], paddingBottom: sp[12] }}>
            <NavLegend dotColor={p.accentSoft} ringColor={p.accentInk} label="مُجاب" />
            <NavLegend dotColor={p.surface} ringColor={p.accentInk} label="معلَّم للمراجعة" flag />
            <NavLegend dotColor={p.surface} ringColor={tones.rose.ink} label="تعذّر الحفظ" />
            <NavLegend dotColor={p.surface} ringColor={p.border} label="بدون إجابة" />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[8], paddingBottom: sp[8] }}>
            {navCells.map((cell) => {
              const picked = navPick === cell.index;
              const bg = cell.current
                ? p.primary
                : cell.failed
                  ? tones.rose.bg
                  : cell.answered
                    ? p.accentSoft
                    : p.surface;
              const ink = cell.current
                ? p.primaryFg
                : cell.failed
                  ? tones.rose.ink
                  : cell.answered
                    ? p.accentInk
                    : p.textMuted;
              const border = cell.current
                ? p.primary
                : cell.failed
                  ? tones.rose.ink
                  : cell.flagged
                    ? p.accentInk
                    : picked
                      ? p.text
                      : p.border;
              return (
                <PressableScale
                  key={cell.qid}
                  accessibilityRole="button"
                  accessibilityLabel={navCellA11y(cell)}
                  accessibilityState={{ selected: picked }}
                  onPress={() => {
                    haptics.selection();
                    setNavPick(cell.index);
                  }}
                  style={{
                    width: touchFloor,
                    height: touchFloor,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: border,
                    backgroundColor: bg,
                  }}
                >
                  <T variant="sm" weight="bold" style={{ color: ink }}>
                    {latn(cell.index + 1)}
                  </T>
                  {cell.flagged ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 4,
                        start: 4,
                        width: 7,
                        height: 7,
                        borderRadius: radius.full,
                        backgroundColor: p.accent,
                      }}
                    />
                  ) : null}
                </PressableScale>
              );
            })}
          </View>
        </AppSheet>
      ) : null}

      {/* submit confirmation — AppSheet preset, destructive styling */}
      {confirmEverOpened ? (
        <ConfirmSheet
          open={confirming}
          onClose={() => setConfirming(false)}
          title="تأكيد التسليم؟ لا يمكن التراجع."
          message={unanswered > 0 ? `${unansweredNoteAr(unanswered)} ${finalityNote}` : finalityNote}
          confirmLabel="تسليم نهائي"
          destructive
          loading={submitting}
          onConfirm={() => void submitAttempt()}
        />
      ) : null}
    </Screen>
  );
}

/**
 * Connectivity for the ACTIVE attempt only. Why a mounted gate and not a
 * top-level `useNetworkStatus()`: NetInfo's subscription cannot boot under
 * jest — its internal state fetch rejects unhandled the moment a listener
 * registers — so the render net's signed-out pass of this route would
 * fail. The gate mounts exactly while an attempt is live (when
 * connectivity actually matters), keeps the runner's `isOnlineRef`
 * current for the queue-vs-direct save plan, drives the reconnect flush
 * (durable queue → server) + the once-per-attempt flush, and renders the
 * honest offline line. Production behavior is identical to the hook at
 * the top; the render net simply never reaches this branch.
 */
function ExamNetGate({
  attemptId,
  isOnlineRef,
  onFlush,
}: {
  attemptId: string;
  isOnlineRef: { current: boolean };
  onFlush: (attemptId: string, announce: boolean) => Promise<unknown>;
}) {
  const tones = useStatusTones();
  const { isOnline } = useNetworkStatus();
  const wasOnlineRef = useRef(isOnline);
  const flushedRef = useRef(false);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline, isOnlineRef]);

  useEffect(() => {
    const reconnected = wasOnlineRef.current === false;
    wasOnlineRef.current = isOnline;
    if (!isOnline) return;
    // flush on reconnect (announce) + once per attempt while online —
    // a relaunch with a resumed attempt may still hold queued answers
    // from the previous session.
    if (!reconnected && flushedRef.current) return;
    flushedRef.current = true;
    void onFlush(attemptId, reconnected);
  }, [isOnline, attemptId, onFlush]);

  if (isOnline) return null;
  return (
    <View style={{ paddingHorizontal: sp[20], paddingTop: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
        <Clock size={14} color={tones.yellow.ink} />
        <T variant="sm" style={{ color: tones.yellow.deep }}>
          أنت دون اتصال — إجاباتك تُحفظ وستُرسل تلقائياً عند عودة الشبكة.
        </T>
      </View>
    </View>
  );
}

function NavLegend({
  dotColor,
  ringColor,
  label,
  flag,
}: {
  dotColor: string;
  ringColor: string;
  label: string;
  flag?: boolean;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
      <View
        style={{
          width: 14,
          height: 14,
          borderWidth: 1,
          borderColor: ringColor,
          backgroundColor: dotColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {flag ? <View style={{ width: 5, height: 5, borderRadius: radius.full, backgroundColor: p.accent }} /> : null}
      </View>
      <T variant="xs" color="muted">
        {label}
      </T>
    </View>
  );
}

/**
 * MutedChip — M1's SECONDARY chip tier on the exams screens: hairline
 * rule frame, transparent ground, muted medium ink. Every non-actionable
 * status (pending grading / graded / pass-fail verdicts) renders here so
 * the ONE primary tier (the accent act-now chip on the list) stays
 * unmatched — the verdict story is carried by the score numeral, the
 * EmptyState title, and the labels, not by chip color.
 */
function MutedChip({ label }: { label: string }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        paddingHorizontal: sp[8],
        paddingVertical: sp[2],
        alignSelf: "flex-start",
      }}
    >
      <T variant="sm" weight="medium" style={{ color: p.textMuted }}>
        {label}
      </T>
    </View>
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
              <MutedChip label="بانتظار التصحيح اليدوي" />
            ) : result.passed === null ? (
              <MutedChip label="مُصحَّح" />
            ) : (
              <MutedChip label={result.passed ? "ناجح" : "لم يجتز"} />
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
              <ErrorState message={humanizeError(review.error)} onRetry={() => review.refetch()} compact />
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
  const myChoice =
    q.myChoiceIndex !== null && q.myChoiceIndex !== undefined && q.choices ? q.choices[q.myChoiceIndex] ?? null : null;
  const keyChoice =
    typeof q.correctAnswer === "number" && q.choices ? q.choices[q.correctAnswer] ?? null : null;
  const answered = myChoice !== null || (q.myAnswerText ?? "").trim() !== "";
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
        <MutedChip label={verdictLabel} />
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
