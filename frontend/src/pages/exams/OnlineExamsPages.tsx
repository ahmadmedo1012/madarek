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
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown,
  Sparkles, ShieldCheck, FileText, Hourglass, CalendarClock, ArrowLeft,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { Skeleton, ListSkeleton, ErrorState } from '../../components/primitives/States';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { useReducedMotion } from '../../components/motion';
import { courseIcon } from '../../lib/courseMeta';
import {
  useMyExams, useStartExam, useSubmitAnswer, useFinishExam, useExamReview,
  useExamModerationQueue, useModerateExam,
  type MyExam, type StartedAttempt, type ResumedAttempt, type AttemptReviewQuestion,
} from '../../hooks/useResources';
import { apiErrorDetailRaw, apiErrorMessage, countAr, formatDateTimeAr } from '../../lib/format';
import { overlayStack } from '../../lib/overlayStack';
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
          {/* 22-c (A4 P2-3): counted nouns — «1 اختبار» broke the
              glossary (Latin digit + wrong noun form). countAr is
              already imported for the timer aria-label. */}
          <Card
            title="اختبارات متاحة لك الآن"
            icon={ClipboardCheck}
            subtitle={countAr(available.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])}
          >
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
            <Card
              title="اختبارات غير متاحة الآن"
              icon={CalendarClock}
              subtitle={countAr(unavailable.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])}
            >
              <div className="track-grid">
                {unavailable.map((e) => <ExamCard key={e.id} exam={e} canStart={false} />)}
              </div>
            </Card>
          )}

          {taken.length > 0 && (
            <Card
              title="اختبارات أجريتها"
              icon={FileText}
              subtitle={countAr(taken.length, ['اختبار واحد', 'اختباران', 'اختبارات', 'اختباراً'])}
            >
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
        {/* 5-A6 P3-3 — the courses grid resolves the same course through
            the lucide courseIcon() map; the exam card now speaks the same
            iconography for one concept (emoji stays for the seeded
            training/community flavor surfaces). */}
        <Icon icon={courseIcon(exam.courseName ?? exam.facultyName ?? '')} size={22} />
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
        {exam.myAttempt && exam.myAttempt.status !== 'IN_PROGRESS' && (
          <div style={{ marginTop: 8 }}>
            {/* 5-A6 P1-1 companion — a finished attempt is not a dead end:
              the taker renders the honest done-state (score or awaiting
              grading) for this deep link, so history stays reachable. */}
            <Link to={`/student/online-exams/${exam.id}`} className="btn ghost sm">
              <Icon icon={ArrowLeft} size={13} />
              عرض النتيجة
            </Link>
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

/* ═══════════════ Post-grading review (5-D3 — 5-B3 hand-off #1) ═══════════════ */

/** The teacher-side null verdict (manually graded, no boolean to
 *  report) reads as its own neutral chip — the awarded points carry
 *  the decision, the chip never invents a صحيحة/خاطئة the server did
 *  not state. */
function reviewVerdict(q: AttemptReviewQuestion): { color: 'green' | 'red' | undefined; label: string } {
  if (q.isCorrect === true) return { color: 'green', label: 'صحيحة' };
  if (q.isCorrect === false) return { color: 'red', label: 'خاطئة' };
  return { color: undefined, label: 'بتقييم الأستاذ' };
}

/** One reviewed question — the prompt, my answer, the released key
 *  and the verdict in one tight row group (student.css §5-D3). */
function ReviewQuestionRow({ q, index }: { q: AttemptReviewQuestion; index: number }) {
  const myChoice = q.myChoiceIndex !== null && q.choices ? q.choices[q.myChoiceIndex] ?? null : null;
  const keyChoice = typeof q.correctAnswer === 'number' && q.choices ? q.choices[q.correctAnswer] ?? null : null;
  const verdict = reviewVerdict(q);
  const answered = myChoice !== null || (q.myAnswerText ?? '').trim() !== '';
  return (
    <div className="exam-review-q">
      <div className="exam-review-head">
        <span className="exam-review-num" aria-hidden><bdi>{index + 1}</bdi></span>
        <span className="exam-review-prompt">{q.prompt}</span>
        <Badge color={verdict.color}>{verdict.label}</Badge>
      </div>
      <div className="exam-review-meta">
        <bdi>{q.awardedPoints ?? 0} / {q.points}</bdi> درجة
      </div>
      <div className="exam-review-ans">
        <span className="exam-review-label">إجابتك:</span>{' '}
        {answered
          ? (myChoice ?? <span className="exam-review-text">{q.myAnswerText}</span>)
          : <span className="exam-review-missed">لم تُجب عن هذا السؤال</span>}
      </div>
      {/* The released key: MCQ/TRUE_FALSE choice text, SHORT model
          answer. ESSAY rubrics and keyless shorts stay teacher-side
          (null) — nothing renders, the verdict + feedback carry it. */}
      {(keyChoice !== null || typeof q.correctAnswer === 'string') && (
        <div className="exam-review-key">
          <span className="exam-review-label">الإجابة الصحيحة:</span>{' '}
          {keyChoice ?? <span className="exam-review-text">{q.correctAnswer as string}</span>}
        </div>
      )}
      {q.feedback && (
        <div className="exam-review-feedback">
          <span className="exam-review-label">ملاحظة الأستاذ:</span>{' '}
          <span className="exam-review-text">{q.feedback}</span>
        </div>
      )}
    </div>
  );
}

/** Collapsible «مراجعة الأسئلة» on the terminal screens — the verdict
 *  stays the moment; the per-question detail is one toggle away and
 *  only fetches when the student actually opens it (the attempt is
 *  GRADED by construction here — the hook is server-gated to that). */
function ExamReviewSection({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false);
  const reviewQ = useExamReview(attemptId, open);
  const listId = `exam-review-${attemptId}`;
  return (
    <div className="exam-review">
      <button
        type="button"
        className="btn ghost sm exam-review-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon icon={ChevronDown} size={14} className={open ? 'exam-review-chevron is-open' : 'exam-review-chevron'} />
        مراجعة الأسئلة
      </button>
      {open && (
        <div id={listId} className="exam-review-list">
          {reviewQ.isPending ? (
            <ListSkeleton rows={3} />
          ) : reviewQ.isError ? (
            <ErrorState error={reviewQ.error} onRetry={() => reviewQ.refetch()} />
          ) : (
            (reviewQ.data?.questions ?? []).map((q, i) => (
              <ReviewQuestionRow key={q.questionId} q={q} index={i} />
            ))
          )}
        </div>
      )}
    </div>
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
  // badge, never a «لم يجتز» verdict the server withheld. attemptId +
  // status (5-D3) ride along so the GRADED result screen can offer the
  // post-grading review without a second navigation.
  const [result, setResult] = useState<{
    attemptId: string;
    score: number; maxScore: number; passed: boolean | null; needsManual: number; status: string;
  } | null>(null);
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
  // 5-A6 P2-3 — the positive half of the autosave honesty pair: the
  // questions whose latest save the server has confirmed. A new save
  // for a question retires its "saved" mark until the server answers,
  // so the chip can never claim a stale answer is stored.
  const [savedQids, setSavedQids] = useState<ReadonlySet<string>>(new Set());
  // 5-A6 P2-2 — map jumps scroll smoothly unless the student asked the
  // system for reduced motion (taste floor: fewer and gentler, not zero).
  const reducedMotion = useReducedMotion();
  // 5-A6 P2-2 — the question the student is currently looking at (the
  // map dot wears a ring). Scroll-tracked via IntersectionObserver; the
  // jump path needs no special casing because a jump scrolls too.
  const [currentQid, setCurrentQid] = useState<string | null>(null);
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
  // 5-A6 P1-1 — the list payload already knows this exam is finished for
  // this student (GRADED / SUBMITTED / EXPIRED are exactly the statuses
  // decideExamStart refuses). Render the honest done-state up front
  // instead of offering a begin the server will reject a round-trip
  // later. Practice exams are retakeable server-side and never carry a
  // finished attempt in the list payload — the guard keeps the mirror
  // of the start rule exact.
  const hasFinishedAttempt =
    !!listedExam?.myAttempt && listedExam.myAttempt.status !== 'IN_PROGRESS' && listedExam.kind !== 'PRACTICE';

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
      setSavedQids(new Set());
      setUrgentNote(null);
      setConfirming(false);
      setAttempt(r);
      // D5 resume: restore the answers the server already holds so a
      // mid-exam reload continues exactly where it left off (a fresh
      // start resets the map, as before). Restored answers are BY
      // DEFINITION saved — the per-question «محفوظة» state (5-A6 P2-3)
      // starts true for them.
      const restored = r.resumed && r.attempt ? restoreSavedAnswers(r.attempt.answers) : {};
      setAnswers(restored);
      setSavedQids(new Set(Object.keys(restored)));
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
      setResult({
        attemptId: attempt.attemptId,
        score: Number(r.score),
        maxScore: Number(r.maxScore),
        passed: r.passed ?? null,
        needsManual: r.needsManual,
        status: r.status,
      });
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

  // 5-A6 P2-2 — which question is on screen right now. The observer is
  // only the TRIGGER (it fires when any card crosses the band edge);
  // the decision reads every card's live rect so a partial entries
  // batch can never pick a stale winner. State flips only when the
  // current question CHANGES, so scrolling costs nothing until the
  // student crosses a card boundary. jsdom ships no
  // IntersectionObserver — the guard keeps tests (and any ancient
  // browser) on the no-ring path instead of crashing.
  useEffect(() => {
    if (!attempt || typeof IntersectionObserver === 'undefined') return;
    const cards = attempt.questions
      .map((q) => document.getElementById(`exam-q-${q.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (cards.length === 0) return;
    // The reading band starts under the sticky bar (its measured height:
    // 113px ≥768, 162px at 390 — student.css; the band top mirrors the
    // rootMargin below) and ends at the viewport's lower half, so a card
    // only counts once its title is actually readable. "Current" = the
    // first card whose header entered the band. A card that only drips
    // its tail into the band (the previous question scrolling out) never
    // wins; a long card filling the whole band keeps the ring (fallback:
    // topmost intersecting).
    const BAND_TOP = 170;
    const pickCurrent = () => {
      const vh = window.innerHeight;
      const bandBottom = vh * 0.5;
      let inBand: HTMLElement | null = null;
      let crossing: HTMLElement | null = null;
      let inBandTop = Infinity;
      let crossingTop = Infinity;
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (r.bottom <= BAND_TOP || r.top >= bandBottom) continue; // outside the band
        if (r.top >= BAND_TOP) {
          if (r.top < inBandTop) { inBandTop = r.top; inBand = el; }
        } else if (r.top < crossingTop) { crossingTop = r.top; crossing = el; }
      }
      const winner = inBand ?? crossing;
      if (winner) {
        const qid = winner.id.slice('exam-q-'.length);
        setCurrentQid((prev) => (prev === qid ? prev : qid));
      }
    };
    const io = new IntersectionObserver(pickCurrent, {
      rootMargin: '-170px 0px -50% 0px',
      threshold: 0,
    });
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [attempt]);

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
          setSavedQids((prev) => withQid(prev, qid, true));
        } catch {
          setFailedQids((prev) => withQid(prev, qid, true));
          setSavedQids((prev) => withQid(prev, qid, false));
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
    // The new answer is not on the server yet — retire any earlier
    // «محفوظة» mark for this question until this save resolves (P2-3).
    setSavedQids((prev) => withQid(prev, qid, false));
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

  // A question counts as answered with a picked choice or non-blank
  // text — drives the bar subline, the question map dots, the sticky
  // submit count and the confirm dialog copy (5-A6 P2-2).
  const isAnswered = (qid: string) => {
    const a = answers[qid];
    return !!a && (a.choiceIndex !== undefined || (a.answerText ?? '').trim() !== '');
  };

  // Unanswered count for the submit confirmation copy.
  const unanswered = attempt
    ? attempt.questions.filter((qq) => !isAnswered(qq.id)).length
    : 0;

  // 5-A6 P2-2 — jump target for the question map: scrolls the card
  // clear of the sticky bar (scroll-margin on .exam-q) and moves focus
  // so keyboard / screen-reader users land ON the question, not just
  // near it. tabIndex={-1} keeps the wrapper out of tab order.
  const jumpToQuestion = (qid: string) => {
    const el = document.getElementById(`exam-q-${qid}`);
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  };

  // Already-attempted honest state: real score from the exams list if
  // the attempt has been graded, otherwise "awaiting result". Reached
  // two ways — the server said alreadyAttempted on click, or (5-A6
  // P1-1) the list payload already said so before any click was offered.
  if ((alreadyDone || hasFinishedAttempt) && !attempt && !result) {
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
          {/* 5-A6 plan-7 — verdict lockup: icon → title → grade → badge
              read as one tight group (the grade and its verdict badge
              are a single decision), generous break before the action. */}
          <div className="empty-state exam-result">
            <Icon icon={CheckCircle2} size={32} style={{ color: 'var(--accent)' }} />
            <h2 className="exam-result-title">لقد أكملت هذا الاختبار مسبقاً</h2>
            {exam && myAttempt && score !== null && score !== undefined ? (
              <>
                <div className="exam-result-lockup">
                  <div className="exam-grade">
                    <span className="exam-grade-value"><bdi>{Number(score)} / {Number(myAttempt.maxScore)}</bdi></span>
                  </div>
                  {/* The verdict badge carries the fail case at full danger
                      weight — a withheld pass is not a soft warning. */}
                  <Badge color={passed ? 'green' : 'red'}>{passed ? 'ناجح' : 'لم يجتز'}</Badge>
                </div>
                <p className="exam-result-note">لا يمكن إعادة المحاولة بعد التسليم.</p>
                {/* 5-D3 (5-B3 hand-off #1 / A6 P2-4): the deep-link
                    done-state offers the same review on a GRADED
                    attempt; anything short of GRADED keeps the honest
                    promise instead of a dead toggle. */}
                {myAttempt.status === 'GRADED' ? (
                  <ExamReviewSection attemptId={myAttempt.id} />
                ) : (
                  <p className="exam-result-note">ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح.</p>
                )}
              </>
            ) : examsQ.isPending ? (
              <p className="exam-result-note">جارٍ جلب نتيجتك…</p>
            ) : examsQ.isError ? (
              <div className="form-error" role="alert">
                <Icon icon={AlertTriangle} size={14} />
                <span className="form-error-msg">تعذَّر جلب نتيجتك — تحقّق من اتصالك.</span>
                <button type="button" className="btn ghost sm" onClick={() => void examsQ.refetch()}>إعادة المحاولة</button>
              </div>
            ) : (
              <>
                <p className="exam-result-note">لا يمكن إعادة المحاولة بعد التسليم.</p>
                <p className="exam-result-note">النتيجة قيد الاحتساب أو بانتظار تقييم الأسئلة المقالية.</p>
              </>
            )}
            <button type="button" className="btn primary" onClick={() => navigate('/student/online-exams')}>
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
            {/* While the list payload is still in flight we cannot yet
                know whether this exam is finished — the begin control
                waits instead of offering a start the server may refuse
                (the P1-1 pre-empt needs the list truth; cached lists
                resolve instantly, so this only guards hard deep links). */}
            <button
              type="button"
              className="btn primary"
              onClick={onStart}
              disabled={start.isPending || examsQ.isPending}
              style={{ marginTop: 'var(--sp-3)' }}
            >
              {start.isPending ? 'جارٍ التحضير…' : examsQ.isPending ? 'جارٍ التحقق…' : hasLiveAttempt ? 'متابعة الاختبار' : 'بدء الاختبار'}
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
          {/* 5-A6 plan-7 — verdict lockup (see the done-state screen). */}
          <div className="empty-state exam-result">
            <Icon
              icon={awaitingManual ? Hourglass : result.passed ? CheckCircle2 : AlertTriangle}
              size={36}
              style={{ color: awaitingManual ? 'var(--info)' : result.passed ? 'var(--success)' : 'var(--warning)' }}
            />
            <h2 className="exam-result-title">
              {awaitingManual ? 'تم تسليم اختبارك' : result.passed ? 'مبروك — لقد اجتزت الاختبار!' : 'الاختبار انتهى'}
            </h2>
            {/* The authored moment — the grade reveal: the real score
                lands as the visual anchor (same exam-grade language as
                the student results card; one-shot rise + state ring). */}
            <div className="exam-result-lockup">
              <div className="exam-grade">
                <span className="exam-grade-value"><bdi>{result.score} / {result.maxScore}</bdi></span>
              </div>
              {awaitingManual ? (
                <Badge>بانتظار التصحيح اليدوي</Badge>
              ) : (
                /* Fail reads at full danger weight — the moment a retake
                    is refused deserves more than a caution tint. */
                <Badge color={result.passed ? 'green' : 'red'}>{result.passed ? 'ناجح' : 'لم يجتز'}</Badge>
              )}
            </div>
            <p className="exam-result-note">
              {result.needsManual > 0
                ? <><bdi>{result.needsManual}</bdi> سؤال بحاجة لتقييم يدوي من الأستاذ — ستظهر الدرجة النهائية بعد المراجعة.</>
                : 'تم احتساب النتيجة فوراً.'}
            </p>
            {/* 5-D3 (5-B3 hand-off #1 / A6 P2-4): the review endpoint
                ships — the GRADED result offers the per-question
                review behind one toggle; while manual grading pends
                the honest promise replaces the old "not available"
                note (the key is not released until GRADED). */}
            {awaitingManual ? (
              <p className="exam-result-note">ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح اليدوي.</p>
            ) : (
              <ExamReviewSection attemptId={result.attemptId} />
            )}
            <button type="button" className="btn primary" onClick={() => navigate('/student/online-exams')}>
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
  // 5-A6 plan-6 — the time-consumed hairline fraction: elapsed share of
  // the full attempt window (durationMin — the same window expiresAt
  // was derived from), drained from the inline-start edge.
  const totalMs = attempt.durationMin * 60_000;
  const consumedFrac = Math.min(1, Math.max(0, (totalMs - secondsLeft * 1000) / totalMs));
  const answeredCount = attempt.questions.length - unanswered;
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
          {/* 5-A6 P2-2 — answered progress rides the bar subline so the
              unanswered count is visible while scrolling, not only in
              the submit dialog. */}
          <div className="text-xxs text-subtle">
            <bdi>{attempt.questions.length}</bdi> سؤال · أُجيب عن <bdi>{answeredCount}</bdi>
          </div>
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
        {/* 5-A6 P2-2 — the question map: one dot per question, answered /
            save-failed states at a glance, click or keyboard to jump.
            flex-basis 100% wraps it onto its own bar row (the bar already
            wraps at 320px — 5-A5 measured the slot). */}
        <nav className="exam-qmap" aria-label="خريطة الأسئلة">
          {attempt.questions.map((q, i) => {
            const qFailed = failedQids.has(q.id);
            const qAnswered = isAnswered(q.id);
            const qCurrent = currentQid === q.id;
            return (
              <button
                key={q.id}
                type="button"
                className={`exam-qmap-dot${qAnswered ? ' answered' : ''}${qFailed ? ' failed' : ''}${qCurrent ? ' current' : ''}`}
                aria-current={qCurrent ? 'true' : undefined}
                aria-label={`السؤال ${i + 1} من ${attempt.questions.length} — ${qFailed ? 'تعذَّر الحفظ' : qAnswered ? 'مُجاب' : 'بدون إجابة'}`}
                onClick={() => jumpToQuestion(q.id)}
              >
                <bdi>{i + 1}</bdi>
              </button>
            );
          })}
        </nav>
        {/* 5-A6 plan-6 — the time-consumed hairline: the window draining
            from the inline-start edge; color-only urgency below two
            minutes (the documented no-pulse decision stands). */}
        <span className="exam-time-rail" aria-hidden="true" data-urgent={timeUrgent ? '' : undefined}>
          <span style={{ transform: `scaleX(${consumedFrac})` }} />
        </span>
      </div>
      {urgentNote && <span className="visually-hidden" role="alert">{urgentNote}</span>}

      <div className="flex-col gap-3">
        {attempt.questions.map((q, i) => {
          /* 5-A6 P2-3 — the save-state chip at the question footer: the
              positive signal pairs the existing failure chip (failed →
              danger, in-flight → muted, server-confirmed → success). */
          const saveState = failedQids.has(q.id)
            ? 'failed'
            : savingQids.has(q.id)
              ? 'saving'
              : savedQids.has(q.id)
                ? 'saved'
                : null;
          /* 5-A6 P2-2 — the wrapper is the map's jump target: id +
             programmatic focus (tabIndex -1 keeps it out of tab order;
             scroll-margin clears the sticky bar). */
          return (
            <div key={q.id} id={`exam-q-${q.id}`} className="exam-q" tabIndex={-1}>
              <Card>
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
                {saveState && (
                  <div className="exam-q-foot">
                    <span className={`exam-q-state ${saveState}`}>
                      <Icon
                        icon={saveState === 'failed' ? AlertTriangle : saveState === 'saving' ? Clock : CheckCircle2}
                        size={12}
                      />
                      {saveState === 'failed' ? 'تعذَّر الحفظ' : saveState === 'saving' ? 'جارٍ الحفظ…' : 'محفوظة'}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* 5-A6 P2-2 — the submit bar carries the unanswered count inline
          (not only inside the confirm dialog) and is bottom-sticky on
          phone so a 60-question paper never hides the way out. */}
      <div className="exam-submit-bar">
        {submitError && (
          <div className="form-error" role="alert">
            <Icon icon={AlertTriangle} size={14} />
            <span className="form-error-msg">{submitError}</span>
          </div>
        )}
        <span className={`exam-submit-status${unanswered > 0 ? ' warn' : ' ok'}`}>
          <Icon icon={unanswered > 0 ? AlertTriangle : CheckCircle2} size={14} />
          {unanswered > 0
            ? countAr(unanswered, ['سؤال واحد بدون إجابة', 'سؤالان بدون إجابة', 'أسئلة بدون إجابة', 'سؤالاً بدون إجابة'])
            : 'أُجيب عن كل الأسئلة'}
        </span>
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
            /* 22-c (A4 P2-3) counted-noun convention — the dialog speaks
               the same «سؤال واحد بدون إجابة» grammar as the sticky bar. */
            ? `لديك ${countAr(unanswered, ['سؤال واحد بدون إجابة', 'سؤالان بدون إجابة', 'أسئلة بدون إجابة', 'سؤالاً بدون إجابة'])}. بعد التسليم لا يمكنك تعديل إجاباتك أو إعادة المحاولة.`
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
  // Reject removes the template from the queue with no undo — a
  // confirmation dialog gates it (audit 4-A8 P2-3; approve stays
  // instant — it is the safe/default outcome).
  const [confirmingReject, setConfirmingReject] = useState<string | null>(null);
  // 4-A8 P3-6 (23-b): the disclosure panel is keyboard-reachable —
  // Escape closes the open row and returns focus to its toggle (the
  // toggle ref is captured on open so Esc can hand focus back).
  const openToggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // A stacked overlay (the reject ConfirmDialog…) owns the key while
      // it is up — the panel must not also close underneath it (the
      // global-shortcut guard idiom: react only when the overlay stack
      // is empty).
      if (!overlayStack.isEmpty()) return;
      setOpen(null);
      setNote('');
      setActionError(null);
      openToggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

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
                      aria-controls={`moderation-panel-${item.id}`}
                      onClick={(e) => {
                        // Switching rows starts a fresh note — a stale
                        // note must never leak into another author's
                        // review.
                        openToggleRef.current = e.currentTarget;
                        setOpen(open === item.id ? null : item.id);
                        setNote('');
                        setActionError(null);
                      }}
                    >
                      {open === item.id ? 'إغلاق' : 'مراجعة'}
                    </button>
                  </div>
                  {open === item.id && (
                    <div
                      className="moderation-panel"
                      id={`moderation-panel-${item.id}`}
                      role="region"
                      aria-label={`مراجعة ${item.title}`}
                    >
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
                          onClick={() => setConfirmingReject(item.id)}
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

      {/* Reject is destructive and unundoable — the queue loses the
          template on click. The dialog names the consequence before the
          mutation runs (audit 4-A8 P2-3); the optional note above still
          ships with the decision. */}
      <ConfirmDialog
        open={confirmingReject !== null}
        title="رفض قالب الاختبار"
        message="سيُرفض القالب ويُعاد إلى مؤلفه مع ملاحظاتك، ويخرج من قائمة الانتظار. لا يمكن التراجع عن هذا القرار."
        confirmLabel="رفض القالب"
        cancelLabel="مراجعة القالب"
        danger
        onConfirm={async () => {
          const id = confirmingReject;
          setConfirmingReject(null);
          if (id) await runModeration(id, false);
        }}
        onCancel={() => setConfirmingReject(null)}
      />
    </div>
  );
}
