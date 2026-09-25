/**
 * Unified online exams.
 *
 *   /student/online-exams         student exam list (available + history)
 *   /student/online-exams/:id     student exam taker (start → answer → submit,
 *                                  with D5 resume for IN_PROGRESS attempts)
 *   /quality/exam-moderation      quality moderation queue
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  Sparkles, ShieldCheck, FileText, Hourglass, CalendarClock,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { Skeleton, ListSkeleton, ErrorState } from '../../components/primitives/States';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import {
  useMyExams, useStartExam, useSubmitAnswer, useFinishExam,
  useExamModerationQueue, useModerateExam,
  type MyExam, type StartedAttempt, type ResumedAttempt,
} from '../../hooks/useResources';
import { apiErrorDetailRaw, apiErrorMessage, countAr, formatDateTimeAr } from '../../lib/format';
import '../../styles/owner.css'; // ConfirmDialog surfaces (D11 css split, 12-15)
import '../../styles/training.css'; // shared .track-card / .back-link families (D11 css split, 12-15)

const KIND_LABEL: Record<string, string> = {
  QUIZ: 'اختبار قصير', MIDTERM: 'نصفي', FINAL: 'نهائي', PRACTICE: 'تدريبي',
};
const KIND_COLOR: Record<string, string> = {
  QUIZ: 'var(--chart-3)',
  MIDTERM: 'var(--chart-5)',
  FINAL: 'var(--danger)',
  PRACTICE: 'var(--chart-2)',
};

/* D5 (WAVE-12-MAP, backend batch 12-1) — exam resume contract: when an
   IN_PROGRESS attempt exists, POST /exams/templates/:id/start returns
   the fresh-start shape PLUS `resumed: true` and the saved attempt.
   `alreadyAttempted: true` stays reserved for GRADED / EXPIRED attempts
   (terminal states → the existing "already taken" UI). The wire types
   (SavedAnswerValue / ResumedAttempt / StartExamResponse) live in
   hooks/useResources.ts since 13-13 — the page-local mirrors this file
   used to carry were structurally identical and were deleted in 14-2. */

/* Restore server-saved answers into the taker's form state. Per D5 the
   backend serializes each saved answer as { questionId, value } where
   value is the raw input — the choice index for MCQ / TRUE_FALSE, the
   text otherwise (null / '' when a row holds nothing). Raw string and
   object forms ({ choiceIndex, answerText }) are also accepted so any
   faithful serialization restores correctly. Blank text answers are
   skipped — they must keep counting as unanswered. */
export function restoreSavedAnswers(
  saved: ResumedAttempt['answers'],
): Record<string, { choiceIndex?: number; answerText?: string }> {
  const restored: Record<string, { choiceIndex?: number; answerText?: string }> = {};
  for (const { questionId, value } of saved) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      restored[questionId] = { choiceIndex: value };
    } else if (typeof value === 'string' && value.trim() !== '') {
      restored[questionId] = { answerText: value };
    } else if (value && typeof value === 'object') {
      const entry: { choiceIndex?: number; answerText?: string } = {};
      if (typeof value.choiceIndex === 'number') entry.choiceIndex = value.choiceIndex;
      if (typeof value.answerText === 'string' && value.answerText.trim() !== '') {
        entry.answerText = value.answerText;
      }
      if (entry.choiceIndex !== undefined || entry.answerText !== undefined) {
        restored[questionId] = entry;
      }
    }
  }
  return restored;
}

/* ── 16-E1 exam-taker hardening (audits 15-e, 15-c, 15-g, 15-h) ── */

/* 15-h P1-5 — the submission window is enforced by the backend start
   route but was never shown. `examWindowState` mirrors that route's
   guards (openAt in the future → "Exam not open yet", closeAt in the
   past → "Exam closed") so the list never offers a start the server
   will reject. `now` is injectable for tests. */
export function examWindowState(
  exam: Pick<MyExam, 'openAt' | 'closeAt'>,
  now = Date.now(),
): 'upcoming' | 'open' | 'closed' {
  if (exam.openAt && new Date(exam.openAt).getTime() > now) return 'upcoming';
  if (exam.closeAt && new Date(exam.closeAt).getTime() < now) return 'closed';
  return 'open';
}

/* 15-h P1-5 — the start route's window guards used to arrive as raw
   English AppErrors; since 17-b (D17-3) the backend sends the same
   guards in Arabic — «لم يفتح باب هذا الاختبار بعد» /
   «أغلق باب التسليم لهذا الاختبار» — so they render verbatim through
   the apiErrorMessage fall-through below. The one kept branch
   enriches the bare not-open message with the real opening time the
   list payload already carries; anything non-Arabic still falls back
   to the generic Arabic refusal. apiErrorDetailRaw (not the guarded
   apiErrorDetail) because the enrichment match must be exact against
   the wire string. */
function startErrorAr(error: unknown, exam: MyExam | undefined): string {
  const detail = apiErrorDetailRaw(error);
  if (detail === 'لم يفتح باب هذا الاختبار بعد' && exam?.openAt) {
    return `لم يفتح باب هذا الاختبار بعد — يفتح ${formatDateTimeAr(exam.openAt)}.`;
  }
  return apiErrorMessage(error, 'تعذَّر بدء الاختبار — تحقّق من اتصالك وحاول مرة أخرى.');
}

/* 15-e P0-1 — submit must never race the autosave: submitAttempt
   flushes every in-flight answer save before finishing. The wait is
   bounded so a hung request cannot block the submit; 10s sits well
   inside the backend's 60s late-submit grace window. */
export const SUBMIT_FLUSH_MS = 10_000;

function flushPendingSaves(pending: Map<string, Promise<void>>): Promise<void> {
  if (pending.size === 0) return Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    Promise.allSettled([...pending.values()]).then(() => undefined),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SUBMIT_FLUSH_MS);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/* 15-e P1-1/P1-2 — immutable toggle for the per-question save sets
   (same reference when nothing changed, so renders stay cheap). */
function withQid(prev: ReadonlySet<string>, qid: string, present: boolean): ReadonlySet<string> {
  if (prev.has(qid) === present) return prev;
  const next = new Set(prev);
  if (present) next.add(qid);
  else next.delete(qid);
  return next;
}

/* ═══════════════ Student exam list ═══════════════ */
export default function OnlineExamsPage() {
  const q = useMyExams();
  const exams = q.data;
  // 15-h P1-5: the "available" grid mirrors the server's start rule —
  // a windowed exam that has not opened yet or whose submission window
  // has shut is never offered as startable (it renders in the dated
  // group below instead of failing with a raw error on click).
  const startable = (e: MyExam) => !e.myAttempt || e.myAttempt.status === 'IN_PROGRESS';
  const available = useMemo(
    // D5: an IN_PROGRESS attempt is resumable, not taken — keep the
    // card linked so a mid-exam reload can find its way back to the
    // taker (GRADED / EXPIRED / SUBMITTED stay in the history list).
    () => (exams ?? []).filter((e) => startable(e) && examWindowState(e) === 'open'),
    [exams],
  );
  const unavailable = useMemo(
    () => (exams ?? []).filter((e) => startable(e) && examWindowState(e) !== 'open'),
    [exams],
  );
  const taken = useMemo(
    () => (exams ?? []).filter((e) => e.myAttempt && e.myAttempt.status !== 'IN_PROGRESS'),
    [exams],
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الاختبارات الإلكترونية</h1>
          <p className="page-subtitle">
            اختبارات معتمدة من مكتب الجودة، موحَّدة عبر الكليات. تنبيه: لا يمكن إعادة المحاولة بعد التسليم.
          </p>
        </div>
      </header>

      {q.isPending ? (
        /* Shape-matched loading — the real surface is a card grid, so the
           skeleton tiles mirror the track-card anatomy (icon well + lines). */
        <Card title="اختبارات متاحة لك الآن" icon={ClipboardCheck}>
          <div className="track-grid" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="exam-card-skel">
                <div className="exam-card-skel-icon"><Skeleton width="100%" height="100%" rounded="var(--r-lg)" /></div>
                <div className="exam-card-skel-body flex-col gap-2">
                  <Skeleton width="55%" height={10} />
                  <Skeleton width="90%" height={12} />
                  <Skeleton width="70%" height={10} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card title="اختبارات متاحة لك الآن" icon={ClipboardCheck} subtitle={`${available.length} اختبار`}>
            {available.length === 0 && (
              <div className="state">
                <div className="state-icon state-icon-success"><Icon icon={CheckCircle2} size={20} /></div>
                <div className="state-title">لا توجد اختبارات متاحة حالياً</div>
                <div className="state-desc">
                  {/* When the only exams are windowed ones, point at their
                      dated group below instead of implying nothing exists. */}
                  {unavailable.length > 0
                    ? 'بعض اختباراتك لم يفتح بابها بعد أو أُغلق — مواعيدها في القائمة أدناه.'
                    : 'ستظهر الاختبارات هنا فور اعتمادها من مكتب الجودة ومُقرِّريك.'}
                </div>
              </div>
            )}
            <div className="track-grid">
              {available.map((e) => <ExamCard key={e.id} exam={e} canStart />)}
            </div>
          </Card>

          {/* 15-h P1-5 — windowed exams outside their open window stay
              visible with their real schedule («يفتح …» / «أغلق باب
              التسليم») instead of masquerading as startable. */}
          {unavailable.length > 0 && (
            <Card title="اختبارات غير متاحة الآن" icon={CalendarClock} subtitle={`${unavailable.length} اختبار`}>
              <div className="track-grid">
                {unavailable.map((e) => <ExamCard key={e.id} exam={e} canStart={false} />)}
              </div>
            </Card>
          )}

          {taken.length > 0 && (
            <Card title="اختبارات أجريتها" icon={FileText} subtitle={`${taken.length} اختبار`}>
              <div className="track-grid">
                {taken.map((e) => <ExamCard key={e.id} exam={e} canStart={false} />)}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ExamCard({ exam, canStart }: { exam: MyExam; canStart: boolean }) {
  const accent = KIND_COLOR[exam.kind] ?? 'var(--accent)';
  const passed = exam.myAttempt && exam.myAttempt.score !== null && (Number(exam.myAttempt.score) / Number(exam.myAttempt.maxScore)) * 100 >= exam.passingScore;
  const ws = examWindowState(exam);

  const body = (
    <>
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={exam.courseIcon ?? '📝'} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{KIND_LABEL[exam.kind]} · {exam.courseName ?? exam.facultyName ?? 'موحد'}</div>
        <div className="track-card-title">{exam.title}</div>
        <div className="track-card-meta">
          <span><Icon icon={Clock} size={12} /> <bdi>{exam.durationMin}</bdi> دقيقة</span>
          <span><Icon icon={ClipboardCheck} size={12} /> <bdi>{exam.questionCount}</bdi> سؤال</span>
          <span>درجة النجاح <bdi>≥ {exam.passingScore}%</bdi></span>
          {/* 15-h P1-5 — an open-window exam carries its close deadline
              so the student knows how long they really have. */}
          {ws === 'open' && exam.closeAt && (
            <span><Icon icon={CalendarClock} size={12} /> يغلق {formatDateTimeAr(exam.closeAt)}</span>
          )}
        </div>
        {exam.myAttempt?.status === 'IN_PROGRESS' && (
          <div style={{ marginTop: 8 }}>
            {/* «— متابعة» only while the attempt is actually resumable
                — a shut window strands the attempt server-side. */}
            <Badge color="amber">{ws === 'closed' ? 'محاولة قيد التقدم' : 'محاولة قيد التقدم — متابعة'}</Badge>
          </div>
        )}
        {exam.myAttempt && exam.myAttempt.score !== null && (
          <div style={{ marginTop: 8 }}>
            <Badge color={passed ? 'green' : 'amber'}>
              <bdi>{Number(exam.myAttempt.score)} / {Number(exam.myAttempt.maxScore)}</bdi> · {passed ? 'ناجح' : 'لم يجتز'}
            </Badge>
          </div>
        )}
        {ws === 'upcoming' && exam.openAt && (
          <div style={{ marginTop: 8 }}>
            <Badge color="brand">يفتح {formatDateTimeAr(exam.openAt)}</Badge>
          </div>
        )}
        {ws === 'closed' && (
          <div style={{ marginTop: 8 }}>
            <Badge>أغلق باب التسليم</Badge>
          </div>
        )}
      </div>
    </>
  );

  // Taken exams render as a static card — no dead "#" link.
  if (!canStart) {
    return (
      <div
        className="track-card"
        style={{ ['--track-accent' as never]: accent, cursor: 'default' }}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      to={`/student/online-exams/${exam.id}`}
      className="track-card"
      style={{ ['--track-accent' as never]: accent }}
    >
      {body}
    </Link>
  );
}

/* ═══════════════ Student exam taker ═══════════════ */
export function ExamTakerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const examsQ = useMyExams();
  const start = useStartExam();
  const answer = useSubmitAnswer();
  const finish = useFinishExam();
  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, { choiceIndex?: number; answerText?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  // 15-c P1-1: the backend deliberately reports `passed: null` while
  // manual grading pends (needsManual > 0) — the state is typed
  // honestly so null renders the neutral «بانتظار التصحيح اليدوي»
  // badge, never a «لم يجتز» verdict the server withheld.
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean | null; needsManual: number } | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Autosave honesty, per question (15-e P0-1/P1-1/P1-2 — replaces the
  // old global `saveFailed` flag): `pendingSavesRef` holds each
  // question's in-flight save (chained per question) so submitAttempt
  // can flush them before finishing — a blur-time text save must never
  // be silently excluded from grading. `savingQids` mirrors the
  // in-flight set as state, locking a choice group while its save
  // flies so two quick clicks cannot land out of order and leave the
  // server holding the older choice. `failedQids` is the per-question
  // failure set behind the sticky warning chip: a later success on
  // ANOTHER question must never clear an earlier question's failure.
  const pendingSavesRef = useRef(new Map<string, Promise<void>>());
  const [savingQids, setSavingQids] = useState<ReadonlySet<string>>(new Set());
  const [failedQids, setFailedQids] = useState<ReadonlySet<string>>(new Set());
  // Guards against double auto-submit when the countdown reaches 00:00
  // (the interval may tick once more before it is cleared).
  const autoSubmittedRef = useRef(false);
  // True while a finish request is in flight — the countdown's
  // auto-submit must never fire a concurrent second finish (15-e P0-2).
  const finishingRef = useRef(false);
  // One assertive screen-reader announcement when the remaining time
  // crosses into the urgent window (never per-tick — that would spam).
  const [urgentNote, setUrgentNote] = useState<string | null>(null);

  // D5 orientation: if the exams list already knows this student has an
  // IN_PROGRESS attempt, the entry screen speaks the truth — the timer
  // never stopped and saved answers will reappear. Deep links that skip
  // the list fall back to the fresh-start copy until start() reveals
  // the resume. Also feeds the Arabic window-error copy in onStart.
  const listedExam = (examsQ.data ?? []).find((e) => e.id === id);
  const hasLiveAttempt = listedExam?.myAttempt?.status === 'IN_PROGRESS';

  const onStart = async () => {
    if (!id) return;
    setStartError(null);
    try {
      // D5: the response may carry resumed:true + the saved attempt
      // (an IN_PROGRESS attempt) — useStartExam already unwraps
      // StartExamResponse (13-13), so no cast is needed.
      const r = await start.mutateAsync(id);
      if (r.alreadyAttempted) {
        // Already taken (GRADED / EXPIRED per D5) — honest state, real
        // result shown from the exams list payload (no fabricated score).
        setAlreadyDone(true);
        return;
      }
      autoSubmittedRef.current = false;
      finishingRef.current = false;
      pendingSavesRef.current.clear();
      setSavingQids(new Set());
      setFailedQids(new Set());
      setUrgentNote(null);
      setConfirming(false);
      setAttempt(r);
      // D5 resume: restore the answers the server already holds so a
      // mid-exam reload continues exactly where it left off (a fresh
      // start resets the map, as before).
      setAnswers(r.resumed && r.attempt ? restoreSavedAnswers(r.attempt.answers) : {});
      // The timer restores from the attempt's expiresAt — for a resumed
      // attempt that is the ORIGINAL deadline, so the countdown shows
      // the true remaining time, not a fresh durationMin.
      const expiry = new Date(r.expiresAt).getTime();
      setSecondsLeft(Math.max(0, Math.round((expiry - Date.now()) / 1000)));
    } catch (e) {
      // 15-h P1-5: the two window guards the start route raises are
      // English server messages — speak them in Arabic, with the real
      // window dates when the list payload knows them.
      setStartError(startErrorAr(e, listedExam));
    }
  };

  const submitAttempt = async () => {
    if (!attempt || finishingRef.current) return;
    finishingRef.current = true;
    setSubmitError(null);
    try {
      // 15-e P0-1: flush every in-flight answer save first — the finish
      // request must never overtake an autosave (the wait is bounded by
      // SUBMIT_FLUSH_MS so a hung save cannot block the submit).
      await flushPendingSaves(pendingSavesRef.current);
      const r = await finish.mutateAsync(attempt.attemptId);
      // 15-e P0-2: the attempt is settled — clearing it tears the
      // countdown interval and the beforeunload warning down, and the
      // auto-submit path can never re-fire finish on it.
      autoSubmittedRef.current = true;
      setAttempt(null);
      // The wire truth is `passed: boolean | null` (null while manual
      // grading pends); the hook's declared type still says boolean —
      // coerce so null flows into the three-way badge (15-c P1-1).
      setResult({ score: Number(r.score), maxScore: Number(r.maxScore), passed: r.passed ?? null, needsManual: r.needsManual });
    } catch (e) {
      setSubmitError(apiErrorMessage(e, 'تعذَّر تسليم الاختبار — حاول مرة أخرى.'));
      // A failed manual submit must not block the countdown's later
      // auto-submit — only success settles the attempt (15-e P0-2).
      finishingRef.current = false;
    }
  };

  // Keep a ref to the latest submit function so the countdown interval
  // always calls the current closure.
  const submitAttemptRef = useRef(submitAttempt);
  useEffect(() => {
    submitAttemptRef.current = submitAttempt;
  });

  // Countdown — auto-submits exactly once when the timer hits 00:00.
  // Deps are [attempt] only: the submit path goes through
  // submitAttemptRef (always-current closure), and depending on the
  // `finish` mutation object tore the interval down and recreated it on
  // every render (audit 11-f P2-3). Wall-clock math on every tick keeps
  // the display immune to interval drift. The effect retires with the
  // attempt — submitAttempt clears it on success, so neither the timer
  // nor the auto-submit outlives the attempt onto the result screen
  // (15-e P0-2).
  useEffect(() => {
    if (!attempt) return;
    const expiry = new Date(attempt.expiresAt).getTime();
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const readClock = () => {
      const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        if (intervalId !== undefined) clearInterval(intervalId);
        // Auto-submit when the timer hits 0 (double-fire guarded via
        // autoSubmittedRef). Without this, students were stranded on a
        // dead "00:00" page with in-progress answers silently lost.
        // The backend reject path surfaces as an error state rather
        // than a fake result screen.
        if (!autoSubmittedRef.current && !finishingRef.current) {
          autoSubmittedRef.current = true;
          void submitAttemptRef.current();
        }
      }
    };
    intervalId = setInterval(readClock, 1000);
    // Background tabs throttle setInterval to a minute or more — on
    // returning to the tab, re-read the wall clock immediately so the
    // countdown (and the 00:00 auto-submit) are never minutes stale.
    const onVisible = () => {
      if (document.visibilityState === 'visible') readClock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (intervalId !== undefined) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt]);

  // Warn before a full page close/reload while an attempt is live —
  // answers autosave per question, but a mid-question reload loses the
  // unsaved draft and the attempt keeps burning time. Retires with the
  // attempt (15-e P0-2): a student on the result screen can close the
  // tab without a stale "unsaved answers" prompt.
  useEffect(() => {
    if (!attempt) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy requirement for Chrome/Edge to show the native prompt.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [attempt]);

  // Urgency threshold crossing (< 2 minutes) — announce once.
  useEffect(() => {
    if (!attempt || autoSubmittedRef.current) return;
    if (secondsLeft > 0 && secondsLeft <= 120 && urgentNote === null) {
      setUrgentNote('تبقّى أقلّ من دقيقتين — سيُسلَّم الاختبار تلقائياً عند انتهاء الوقت.');
    }
  }, [attempt, secondsLeft, urgentNote]);

  // One autosave path for every answer shape. Saves chain per question
  // (a new save waits behind any still-in-flight one for the same
  // question), so an older, slower request can never land after a newer
  // one and overwrite it server-side (15-e P1-2). The tracked tail is
  // what submitAttempt flushes (15-e P0-1).
  const runAnswerSave = (qid: string, payload: { answerText?: string; choiceIndex?: number }) => {
    if (!attempt) return;
    const attemptId = attempt.attemptId;
    const earlier = pendingSavesRef.current.get(qid);
    const tracked = (earlier ? earlier.catch(() => undefined) : Promise.resolve())
      .then(async () => {
        try {
          await answer.mutateAsync({ attemptId, questionId: qid, ...payload });
          setFailedQids((prev) => withQid(prev, qid, false));
        } catch {
          setFailedQids((prev) => withQid(prev, qid, true));
        }
      })
      .finally(() => {
        // Only the newest tracked promise may retire its own entry — a
        // chained successor has already replaced it in the map.
        if (pendingSavesRef.current.get(qid) === tracked) {
          pendingSavesRef.current.delete(qid);
          setSavingQids((prev) => withQid(prev, qid, false));
        }
      });
    pendingSavesRef.current.set(qid, tracked);
    setSavingQids((prev) => withQid(prev, qid, true));
  };

  const onChoiceChange = (qid: string, idx: number) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { choiceIndex: idx } }));
    runAnswerSave(qid, { choiceIndex: idx });
  };
  const onTextChange = (qid: string, text: string) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { answerText: text } }));
  };
  const onTextBlur = (qid: string) => {
    if (!attempt) return;
    runAnswerSave(qid, { answerText: answers[qid]?.answerText ?? '' });
  };

  // Unanswered count for the submit confirmation copy.
  const unanswered = attempt
    ? attempt.questions.filter((qq) => {
        const a = answers[qq.id];
        return !a || (a.choiceIndex === undefined && (a.answerText ?? '').trim() === '');
      }).length
    : 0;

  // Already-attempted honest state: real score from the exams list if
  // the attempt has been graded, otherwise "awaiting result".
  if (alreadyDone && !attempt && !result) {
    const exam = (examsQ.data ?? []).find((e) => e.id === id);
    const myAttempt = exam?.myAttempt ?? null;
    const score = myAttempt?.score;
    const passed =
      exam && score !== null && score !== undefined && myAttempt
        ? (Number(score) / Number(myAttempt.maxScore)) * 100 >= exam.passingScore
        : null;
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon icon={CheckCircle2} size={32} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>لقد أكملت هذا الاختبار مسبقاً</h2>
            <p className="text-sm text-muted" style={{ maxWidth: 480, textAlign: 'center' }}>
              لا يمكن إعادة المحاولة بعد التسليم. نتيجتك الفعلية:
            </p>
            {exam && myAttempt && score !== null && score !== undefined ? (
              <>
                <div className="exam-grade" style={{ marginTop: 'var(--sp-2)' }}>
                  <span className="exam-grade-value"><bdi>{Number(score)} / {Number(myAttempt.maxScore)}</bdi></span>
                </div>
                <Badge color={passed ? 'green' : 'amber'}>{passed ? 'ناجح' : 'لم يجتز'}</Badge>
              </>
            ) : examsQ.isPending ? (
              <p className="text-sm text-muted" style={{ marginTop: 'var(--sp-2)' }}>
                جارٍ جلب نتيجتك…
              </p>
            ) : examsQ.isError ? (
              <div className="form-error" role="alert" style={{ marginTop: 'var(--sp-2)', maxWidth: 480 }}>
                <Icon icon={AlertTriangle} size={14} />
                <span className="form-error-msg">تعذَّر جلب نتيجتك — تحقّق من اتصالك.</span>
                <button type="button" className="btn ghost sm" onClick={() => void examsQ.refetch()}>إعادة المحاولة</button>
              </div>
            ) : (
              <p className="text-sm text-muted" style={{ marginTop: 'var(--sp-2)' }}>
                النتيجة قيد الاحتساب أو بانتظار تقييم الأسئلة المقالية.
              </p>
            )}
            <button type="button" className="btn primary" onClick={() => navigate('/student/online-exams')} style={{ marginTop: 'var(--sp-3)' }}>
              العودة للقائمة
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Initial state — show "Begin" prompt
  if (!attempt && !result) {
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon icon={ClipboardCheck} size={32} style={{ color: 'var(--accent)' }} />
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>
              {hasLiveAttempt ? 'متابعة الاختبار' : 'هل أنت مستعد للبدء؟'}
            </h2>
            <p className="text-sm text-muted" style={{ maxWidth: 480, textAlign: 'center' }}>
              {hasLiveAttempt
                ? 'لديك محاولة قيد التقدم لهذا الاختبار — الوقت لم يتوقف منذ البدء، وإجاباتك المحفوظة ستظهر كما تركتها.'
                : 'بمجرد الضغط على "بدء الاختبار" سيبدأ المؤقت ولا يمكنك إيقافه. اقرأ كل سؤال جيداً قبل الإجابة. الأسئلة تُسجَّل تلقائياً عند تغيير الإجابة.'}
            </p>
            {startError && (
              <div className="form-error" role="alert" style={{ marginTop: 'var(--sp-3)', maxWidth: 480 }}>
                <Icon icon={AlertTriangle} size={14} />
                <span className="form-error-msg">{startError}</span>
              </div>
            )}
            <button type="button" className="btn primary" onClick={onStart} disabled={start.isPending} style={{ marginTop: 'var(--sp-3)' }}>
              {start.isPending ? 'جارٍ التحضير…' : hasLiveAttempt ? 'متابعة الاختبار' : 'بدء الاختبار'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (result) {
    // 15-c P1-1: three-way verdict — `passed === null` means the server
    // deliberately withheld the verdict while essay/short answers await
    // the teacher's manual grading. The badge stays neutral; it must
    // never render the «لم يجتز» failure the student has not earned.
    const awaitingManual = result.passed === null;
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon
              icon={awaitingManual ? Hourglass : result.passed ? CheckCircle2 : AlertTriangle}
              size={36}
              style={{ color: awaitingManual ? 'var(--info)' : result.passed ? 'var(--success)' : 'var(--warning)' }}
            />
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>
              {awaitingManual ? 'تم تسليم اختبارك' : result.passed ? 'مبروك — لقد اجتزت الاختبار!' : 'الاختبار انتهى'}
            </h2>
            {/* The authored moment — the grade reveal: the real score
                lands as the visual anchor (same exam-grade language as
                the student results card; one-shot rise + state ring). */}
            <div className="exam-grade">
              <span className="exam-grade-value"><bdi>{result.score} / {result.maxScore}</bdi></span>
            </div>
            {awaitingManual ? (
              <Badge>بانتظار التصحيح اليدوي</Badge>
            ) : (
              <Badge color={result.passed ? 'green' : 'amber'}>{result.passed ? 'ناجح' : 'لم يجتز'}</Badge>
            )}
            <div className="text-sm text-muted" style={{ marginTop: 'var(--sp-2)' }}>
              {result.needsManual > 0
                ? <><bdi>{result.needsManual}</bdi> سؤال بحاجة لتقييم يدوي من الأستاذ — ستظهر الدرجة النهائية بعد المراجعة.</>
                : 'تم احتساب النتيجة فوراً.'}
            </div>
            <button type="button" className="btn primary" onClick={() => navigate('/student/online-exams')} style={{ marginTop: 'var(--sp-3)' }}>
              العودة للقائمة
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!attempt) return null;

  // Active attempt — render questions
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const timeUrgent = secondsLeft < 120;
  // Question positions (1-based) whose latest save failed — the chip
  // names them so the student knows exactly what to re-answer.
  const failedNumbers = attempt.questions
    .map((qq, i) => (failedQids.has(qq.id) ? i + 1 : null))
    .filter((n): n is number => n !== null);

  return (
    <div className="page">
      <div className="exam-bar">
        <div>
          <h1 className="exam-bar-title">{attempt.title}</h1>
          <div className="text-xxs text-subtle"><bdi>{attempt.questions.length}</bdi> سؤال</div>
        </div>
        {/* Per-question save honesty (15-e P1-1): the chip names the
            exact questions whose answers are NOT on the server, and
            only saving THOSE questions clears it — a success elsewhere
            never hides an earlier failure. */}
        {failedNumbers.length > 0 && (
          <span className="exam-save-warn" role="status">
            <Icon icon={AlertTriangle} size={13} />
            {failedNumbers.length === 1
              ? `تعذَّر حفظ إجابة السؤال ${failedNumbers[0]} — أعد الإجابة عليه`
              : `تعذَّر حفظ إجابات الأسئلة ${failedNumbers.slice(0, 3).join(' و')}${failedNumbers.length > 3 ? ' وأخرى' : ''} — أعد الإجابة عليها`}
          </span>
        )}
        {/* role=timer names the countdown for assistive tech without
            announcing every tick; the urgency threshold crossing is
            announced once via the live region below. */}
        <div
          className={`exam-timer${timeUrgent ? ' urgent' : ''}`}
          role="timer"
          aria-label={`الوقت المتبقي: ${countAr(m, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])} و${countAr(s, ['ثانية', 'ثانيتين', 'ثوانٍ', 'ثانية'])}`}
        >
          <Icon icon={Clock} size={14} />
          <span className="font-mono" dir="ltr">{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</span>
        </div>
      </div>
      {urgentNote && <span className="visually-hidden" role="alert">{urgentNote}</span>}

      <div className="flex-col gap-3">
        {attempt.questions.map((q, i) => (
          <Card key={q.id}>
            {/* 15-g P1-5 — the prompt is the accessible name of both
                answer fields: number + prompt ids are referenced by the
                textarea (aria-labelledby) and the choice group
                (role=radiogroup), so a screen reader never meets an
                unnamed graded input. */}
            <div className="text-xxs text-subtle" id={`exam-q-${q.id}-num`} style={{ marginBottom: 4 }}>
              السؤال <bdi>{i + 1}</bdi> من <bdi>{attempt.questions.length}</bdi> · <bdi>{q.points}</bdi> {q.points === 1 ? 'نقطة' : 'نقاط'}
            </div>
            <div className="exam-prompt" id={`exam-q-${q.id}-prompt`}>{q.prompt}</div>
            {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && q.choices && (
              <div
                className="flex-col gap-2"
                style={{ marginTop: 'var(--sp-3)' }}
                role="radiogroup"
                aria-labelledby={`exam-q-${q.id}-num exam-q-${q.id}-prompt`}
              >
                {q.choices.map((c, idx) => (
                  <label
                    key={idx}
                    className={`exam-choice${answers[q.id]?.choiceIndex === idx ? ' selected' : ''}`}
                  >
                    {/* Locked while this question's save is in flight
                        (15-e P1-2) — the same honesty as the lecture
                        checkpoint options; the .exam-choice:has(
                        input:disabled) state already exists. */}
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id]?.choiceIndex === idx}
                      onChange={() => onChoiceChange(q.id, idx)}
                      disabled={savingQids.has(q.id)}
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            )}
            {(q.type === 'SHORT' || q.type === 'ESSAY') && (
              <textarea
                className="input"
                rows={q.type === 'ESSAY' ? 6 : 2}
                placeholder="اكتب إجابتك هنا…"
                aria-labelledby={`exam-q-${q.id}-num exam-q-${q.id}-prompt`}
                value={answers[q.id]?.answerText ?? ''}
                onChange={(e) => onTextChange(q.id, e.target.value)}
                onBlur={() => onTextBlur(q.id)}
                style={{ marginTop: 'var(--sp-3)' }}
              />
            )}
          </Card>
        ))}
      </div>

      <div className="exam-submit-bar">
        {submitError && (
          <div className="form-error" role="alert">
            <Icon icon={AlertTriangle} size={14} />
            <span className="form-error-msg">{submitError}</span>
          </div>
        )}
        <button type="button" className="btn primary" onClick={() => setConfirming(true)} disabled={finish.isPending}>
          {finish.isPending ? 'جارٍ التسليم…' : 'تسليم الاختبار'}
        </button>
      </div>

      {/* Submission is irreversible — confirm before it happens, and
          surface the unanswered count so the decision is informed. */}
      <ConfirmDialog
        open={confirming}
        title="تسليم الاختبار"
        message={
          unanswered > 0
            ? `لديك ${unanswered} سؤال بدون إجابة. بعد التسليم لا يمكنك تعديل إجاباتك أو إعادة المحاولة.`
            : 'بعد التسليم لا يمكنك تعديل إجاباتك أو إعادة المحاولة.'
        }
        confirmLabel="تسليم نهائي"
        cancelLabel="مراجعة إجاباتي"
        onConfirm={async () => {
          await submitAttempt();
          setConfirming(false);
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/* ═══════════════ Quality moderation queue ═══════════════ */
export function ExamModerationPage() {
  const queueQ = useExamModerationQueue();
  const moderate = useModerateExam();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  // Which row/action is in flight (drives the confirm pulse + labels).
  const [acting, setActing] = useState<{ id: string; approve: boolean } | null>(null);
  // A failed decision surfaces inline on its row, with a working retry.
  const [actionError, setActionError] = useState<{ id: string; approve: boolean; message: string } | null>(null);

  const runModeration = async (id: string, approve: boolean) => {
    setActionError(null);
    setActing({ id, approve });
    try {
      await moderate.mutateAsync({ id, approve, note: note || undefined });
      setOpen(null);
      setNote('');
    } catch (e) {
      setActionError({ id, approve, message: apiErrorMessage(e, 'تعذَّر تنفيذ القرار — تحقّق من اتصالك وحاول مرة أخرى.') });
    } finally {
      setActing(null);
    }
  };

  const queue = queueQ.data;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مراجعة الاختبارات</h1>
          <p className="page-subtitle">
            مراجعة قوالب الاختبارات الموحَّدة قبل اعتمادها وإتاحتها للطلاب — صلاحية حصرية لمكتب الجودة.
          </p>
        </div>
      </header>

      <div className="grid-3">
        {/* Honest KPIs: pending shows '…', an API-down queue shows '—'
            (never a fake zero), and the system-status card derives from
            the query instead of a hardcoded "نشط". */}
        <MetricCard
          icon={ShieldCheck}
          label="بانتظار المراجعة"
          value={queueQ.isPending ? '…' : queueQ.isError ? '—' : `${queue?.length ?? 0}`}
          color="amber"
        />
        <MetricCard
          icon={queueQ.isError ? AlertTriangle : CheckCircle2}
          label="حالة النظام"
          value={queueQ.isPending ? '…' : queueQ.isError ? 'تعذّر الاتصال' : 'نشط'}
          color={queueQ.isError ? 'red' : 'green'}
        />
        <MetricCard icon={Sparkles} label="نموذج الجودة" value="رؤية 2024–2028" color="purple" change="معايير الجودة المحلية والدولية" />
      </div>

      <Card title="قائمة الانتظار" icon={ClipboardCheck}>
        {queueQ.isPending ? (
          <ListSkeleton rows={4} />
        ) : queueQ.isError ? (
          <ErrorState error={queueQ.error} onRetry={() => void queueQ.refetch()} />
        ) : queue && queue.length === 0 ? (
          <div className="state">
            <div className="state-icon state-icon-success"><Icon icon={CheckCircle2} size={20} /></div>
            <div className="state-title">لا شيء بانتظار المراجعة</div>
            <div className="state-desc">كل قوالب الاختبارات المتاحة للطلاب اجتازت المراجعة.</div>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {queue?.map((item) => {
              const rowPending = acting?.id === item.id;
              return (
                <div key={item.id} className="moderation-row">
                  <div className="moderation-row-main">
                    <div className="moderation-title">{item.title}</div>
                    <div className="moderation-meta">
                      <Badge>{KIND_LABEL[item.kind]}</Badge>
                      {item.offering && <Badge color="brand">{item.offering.course.name}</Badge>}
                      <Badge><bdi>{item._count.questions}</bdi> سؤال · <bdi>{item.durationMin}</bdi> د</Badge>
                      <span className="text-xxs text-subtle">
                        قدّمه: {item.author.firstName} {item.author.lastName}
                      </span>
                    </div>
                  </div>
                  <div className="moderation-actions">
                    <button
                      type="button"
                      className="btn ghost sm"
                      aria-expanded={open === item.id}
                      onClick={() => {
                        // Switching rows starts a fresh note — a stale
                        // note must never leak into another author's
                        // review.
                        setOpen(open === item.id ? null : item.id);
                        setNote('');
                        setActionError(null);
                      }}
                    >
                      {open === item.id ? 'إغلاق' : 'مراجعة'}
                    </button>
                  </div>
                  {open === item.id && (
                    <div className="moderation-panel">
                      <textarea
                        className="input"
                        rows={2}
                        placeholder="ملاحظات للمؤلف (اختياري)…"
                        aria-label="ملاحظات المراجعة للمؤلف"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        style={{ marginBottom: 'var(--sp-2)' }}
                      />
                      <div className="moderation-actions">
                        <button
                          type="button"
                          className={`btn success sm${rowPending && acting?.approve ? ' moderation-pulse' : ''}`}
                          onClick={() => void runModeration(item.id, true)}
                          disabled={rowPending}
                        >
                          <Icon icon={CheckCircle2} size={13} />
                          {rowPending && acting?.approve ? 'جارٍ الاعتماد…' : 'اعتماد'}
                        </button>
                        <button
                          type="button"
                          className={`btn danger sm${rowPending && !acting?.approve ? ' moderation-pulse' : ''}`}
                          onClick={() => void runModeration(item.id, false)}
                          disabled={rowPending}
                        >
                          <Icon icon={AlertTriangle} size={13} />
                          {rowPending && !acting?.approve ? 'جارٍ الرفض…' : 'رفض'}
                        </button>
                      </div>
                      {actionError?.id === item.id && (
                        <div className="form-error" role="alert" style={{ marginTop: 'var(--sp-2)' }}>
                          <Icon icon={AlertTriangle} size={14} />
                          <span className="form-error-msg">{actionError.message}</span>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => void runModeration(actionError.id, actionError.approve)}
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
