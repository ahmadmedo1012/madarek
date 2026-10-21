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
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft,
  FileText, Hourglass, CalendarClock, ArrowLeft, Check,
  ListChecks, Info, Ban,
} from 'lucide-react';
import { Card, Badge, PageHeader } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { Icon } from '../../components/Icon';
import { Illustration as MkIllustration } from '../../components/illustrations/Illustration';
import { Skeleton, ListSkeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { useReducedMotion } from '../../components/motion';
import { courseIcon } from '../../lib/courseMeta';
import {
  useMyExams, useStartExam, useSubmitAnswer, useFinishExam, useExamReview,
  useExamModerationQueue, useModerateExam, useExamTemplate,
  type MyExam, type StartedAttempt, type ResumedAttempt, type AttemptReviewQuestion,
  type ExamTemplateDetail, type QType, type Difficulty,
} from '../../hooks/useResources';
import {
  apiErrorDetailRaw, apiErrorMessage, countAr, formatDateTimeAr, formatRelativeArShort,
} from '../../lib/format';
import { overlayStack } from '../../lib/overlayStack';
import { useEntityPageTitle } from '../../components/layout/AppShell';
import '../../styles/owner.css'; // ConfirmDialog surfaces (D11 css split, 12-15)
import '../../styles/training.css'; // shared .back-link family (D11 css split, 12-15)
import '../../styles/online-exams.css'; // 4C-d — the .oex page-scoped sheet (list rows / taker chrome / moderation queue)

const KIND_LABEL: Record<string, string> = {
  QUIZ: 'اختبار قصير', MIDTERM: 'نصفي', FINAL: 'نهائي', PRACTICE: 'تدريبي',
};
const KIND_COLOR: Record<string, string> = {
  QUIZ: 'var(--chart-3)',
  MIDTERM: 'var(--chart-5)',
  /* FINAL is an informational kind, not a failure status — the old
     var(--danger) put danger semantics on a kind chip, against the
     sheet's own contract ("semantic colors only for status chips",
     online-exams.css §0). --chart-8 (mauve) keeps the data-series
     family and stays distinct from QUIZ's sky, MIDTERM's lavender and
     PRACTICE's mint, re-keying for dark like every chart token. */
  FINAL: 'var(--chart-8)',
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

/* r165a — a submit answer the backend rejected as TERMINAL. The submit
 * route (exams.routes.ts) answers exactly two terminal truths: 409
 * «تم تسليم هذه المحاولة مسبقاً» (the attempt left IN_PROGRESS — already
 * submitted/graded, or a concurrent submit won the claim), and 403
 * «انتهى وقت هذه المحاولة» (the 60s grace passed, the server flipped the
 * attempt to EXPIRED and it will never accept an answer again). Both
 * exact Arabic wire strings are matched the same apiErrorDetailRaw way
 * startErrorAr matches the start guards. A 5xx / offline / timeout
 * failure is NOT terminal — the honest retry path stays for those.
 * Pure + exported for unit pinning. */
export function isTerminalSubmitError(e: unknown): boolean {
  const detail = apiErrorDetailRaw(e);
  return detail === 'تم تسليم هذه المحاولة مسبقاً' || detail === 'انتهى وقت هذه المحاولة';
}

/* r164-e (assessment loop) — the attempt lifecycle verdict chip.
 * The badge must follow the wire truth, the same three-way contract
 * the post-submit result screen honors (15-c P1-1):
 *  · GRADED — the final verdict (ناجح / لم يجتز) over the real score.
 *  · SUBMITTED — the machine score is PROVISIONAL (the teacher's
 *    manual grading of essays/keyless shorts can still flip it), so
 *    the chip renders the neutral «بانتظار التصحيح اليدوي» — never a
 *    ناجح/لم يجتز verdict the server has withheld. The score itself
 *    stays visible (it is real: the objective half is already graded).
 *  · EXPIRED — terminal, never graded: no score, no verdict, the
 *    honest «انتهى وقت المحاولة» truth.
 *  · IN_PROGRESS — no verdict chip (the resumable chip owns that state).
 * Pure + exported so the list card and the deep-link done-state
 * (and the unit suite) share one mapping. */
export function attemptVerdictChip(
  exam: Pick<MyExam, 'myAttempt' | 'passingScore'>,
): {
  label: string;
  color: 'green' | 'amber' | 'red';
  /** Provisional (SUBMITTED) or final (GRADED) score lockup — the card
   *  renders it bdi-isolated before the label; null for EXPIRED. */
  score: { value: number; max: number } | null;
} | null {
  const a = exam.myAttempt;
  if (!a) return null;
  const scoreOf = a.score === null ? null : { value: Number(a.score), max: Number(a.maxScore) };
  switch (a.status) {
    case 'SUBMITTED':
      return { label: 'بانتظار التصحيح اليدوي', color: 'amber', score: scoreOf };
    case 'EXPIRED':
      return { label: 'انتهى وقت المحاولة دون تسليم', color: 'red', score: null };
    case 'GRADED': {
      if (a.score === null) return null;
      const passed = Number(a.maxScore) > 0 && (Number(a.score) / Number(a.maxScore)) * 100 >= exam.passingScore;
      return { label: passed ? 'ناجح' : 'لم يجتز', color: passed ? 'green' : 'red', score: scoreOf };
    }
    default:
      return null; // IN_PROGRESS owns its own resumable chip
  }
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

/* 6A6-finding-3 — the taker's begin / completed / result screens are
   each a page whose heading IS the page title, so the tag must be h1
   for the document outline. base.css differentiates h1 from h2 by
   size, so the inline style pins the promoted h1 back to the authored
   h2 metrics (--fs-h2 = 22px, --lh-snug = 1.2 → 26.4px; the weight
   is the shared heading rule) — visual parity without touching any
   CSS file. */
const H1_AS_H2_STYLE = { fontSize: 'var(--fs-h2)', lineHeight: 'var(--lh-snug)' } as const;

/* ═══════════════ Student exam list ═══════════════ */
export default function OnlineExamsPage() {
  const q = useMyExams();
  const exams = q.data;
  // 15-h P1-5: the "available" grid mirrors the server's start rule —
  // a windowed exam that has not opened yet or whose submission window
  // has shut is never offered as startable (it renders in the dated
  // group below instead of failing with a raw error on click).
  // 6A6-finding-2 — the mirror is per kind, like the backend: a finished
  // PRACTICE attempt earns a freshStart (decideExamStart) and only a
  // live IN_PROGRESS one blocks it (attemptBlockingStatuses), so
  // practice is always startable; graded kinds stay startable only
  // without an attempt (or with a resumable live one).
  const startable = (e: MyExam) =>
    !e.myAttempt || e.myAttempt.status === 'IN_PROGRESS' || e.kind === 'PRACTICE';
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
    // 6A6-finding-2: practice retakes are real — a finished practice
    // attempt never sinks its card into dead "taken" history (it stays
    // startable above, window permitting).
    () => (exams ?? []).filter((e) => e.myAttempt && e.myAttempt.status !== 'IN_PROGRESS' && e.kind !== 'PRACTICE'),
    [exams],
  );

  return (
    <div className="page">
      <PageHeader
        title="الاختبارات الإلكترونية"
        subtitle="اختبارات معتمدة من مكتب الجودة، موحَّدة عبر الكليات. تنبيه: لا يمكن إعادة المحاولة بعد التسليم إلا في الاختبارات التدريبية."
      />

      {q.isPending ? (
        /* Shape-matched loading — the real surface is a row list, so the
           skeleton rows mirror the row anatomy (icon well + lines). */
        <Card title="اختبارات متاحة لك الآن" icon={ClipboardCheck}>
          <div className="oex-rows" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="oex-skel">
                <div className="oex-skel-icon"><Skeleton width="100%" height="100%" rounded="var(--r-md)" /></div>
                <div className="oex-skel-body flex-col gap-2">
                  <Skeleton width="38%" height={12} />
                  <Skeleton width="90%" height={14} />
                  <Skeleton width="62%" height={10} />
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
              <EmptyState
                illustration="empty-list"
                title="لا توجد اختبارات متاحة حالياً"
                description={
                  unavailable.length > 0
                    ? 'بعض اختباراتك لم يفتح بابها بعد أو أُغلق — مواعيدها في القائمة أدناه.'
                    : 'سماؤك صافية الليلة — ستُضيء النجوم هنا فور اعتماد مكتب الجودة ومُقرِّريك الاختبارات.'
                }
              />
            )}
            {/* r241 list semantics (the tq-rows family grammar): each
                section's row container is a named list and every row a
                listitem — startable rows keep their link semantics via
                the listitem wrapper (never role on the anchor itself,
                which would strip the implicit link role). */}
            <div className="oex-rows" role="list" aria-label="اختبارات متاحة لك الآن">
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
              <div className="oex-rows" role="list" aria-label="اختبارات غير متاحة الآن">
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
              <div className="oex-rows" role="list" aria-label="اختبارات أجريتها">
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
  const ws = examWindowState(exam);
  /* r164-e: the verdict chip follows the attempt's wire status —
   * SUBMITTED renders the neutral awaiting badge over the provisional
   * machine score (never a verdict the server withheld), EXPIRED the
   * honest terminal truth, GRADED the final ناجح/لم يجتز. */
  const verdict = attemptVerdictChip(exam);
  // 4C-d recomposition (list-first): the card became a row. The row is
  // the link (canStart), the meta line carries the window truth, and a
  // trailing primary action names the verb — «متابعة» for a live
  // attempt, «ابدأ» for a fresh start. The chips (resume / verdict /
  // retake / window) stay INSIDE the row so the link's accessible name
  // keeps telling the whole state story (the D5 reachability pins).
  const showResultLink = !!exam.myAttempt
    && (exam.myAttempt.status === 'GRADED' || exam.myAttempt.status === 'SUBMITTED')
    && exam.kind !== 'PRACTICE';

  const body = (
    <>
      <span
        className="oex-row-icon"
        style={{ ['--oex-accent' as never]: accent }}
        aria-hidden
      >
        {/* 5-A6 P3-3 — the courses grid resolves the same course through
            the lucide courseIcon() map; the exam row now speaks the same
            iconography for one concept (emoji stays for the seeded
            training/community flavor surfaces). */}
        <Icon icon={courseIcon(exam.courseName ?? exam.facultyName ?? '')} size={20} />
      </span>
      <span className="oex-row-body">
        <span className="oex-row-title">{exam.title}</span>
        <span className="oex-row-kicker">{KIND_LABEL[exam.kind]} · {exam.courseName ?? exam.facultyName ?? 'موحد'}</span>
        <span className="oex-row-meta">
          <span><Icon icon={Clock} size={12} /> <bdi>{exam.durationMin}</bdi> دقيقة</span>
          {/* 22-c counted nouns — «N سؤال» broke the glossary for
              2 (سؤالان) and 3–10 (أسئلة); countAr speaks the forms. */}
          <span><Icon icon={ClipboardCheck} size={12} /> {countAr(exam.questionCount, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])}</span>
          <span>درجة النجاح <bdi>≥ {exam.passingScore}%</bdi></span>
          {/* 15-h P1-5 — an open-window exam carries its close deadline
              so the student knows how long they really have. */}
          {ws === 'open' && exam.closeAt && (
            <span><Icon icon={CalendarClock} size={12} /> يغلق {formatDateTimeAr(exam.closeAt)}</span>
          )}
        </span>
        {(exam.myAttempt?.status === 'IN_PROGRESS' || verdict || (exam.kind === 'PRACTICE' && ws === 'open' && exam.myAttempt && exam.myAttempt.status !== 'IN_PROGRESS') || (ws === 'upcoming' && exam.openAt) || ws === 'closed') && (
          <span className="oex-row-chips">
            {exam.myAttempt?.status === 'IN_PROGRESS' && (
              /* «— متابعة» only while the attempt is actually resumable
                  — a shut window strands the attempt server-side. */
              <Badge color="amber">{ws === 'closed' ? 'محاولة قيد التقدم' : 'محاولة قيد التقدم — متابعة'}</Badge>
            )}
            {verdict && (
              /* r164-e: score + honest state in one chip. A SUBMITTED
                  attempt carries its provisional machine score with the
                  neutral awaiting label; EXPIRED carries no score (never
                  graded); GRADED carries the final verdict at full danger
                  weight on fail — the result screen's language. */
              <Badge color={verdict.color}>
                {verdict.score && <><bdi>{verdict.score.value} / {verdict.score.max}</bdi> · </>}
                {verdict.label}
              </Badge>
            )}
            {/* 6A6-finding-2 — the retake badge says what the score badge
                cannot: a finished practice attempt is retakeable NOW. Open
                window only — a shut window shows «أغلق باب التسليم» below,
                and that is the truth for a retake too. */}
            {exam.kind === 'PRACTICE' && ws === 'open' && exam.myAttempt && exam.myAttempt.status !== 'IN_PROGRESS' && (
              <Badge color="brand">تدريبي — إعادة المحاولة متاحة</Badge>
            )}
            {ws === 'upcoming' && exam.openAt && (
              <Badge color="brand">يفتح {formatDateTimeAr(exam.openAt)}</Badge>
            )}
            {ws === 'closed' && (
              <Badge>أغلق باب التسليم</Badge>
            )}
          </span>
        )}
      </span>
      {/* Trailing action column — the verb on startable rows, the result
          deep link on finished history rows, and quiet otherwise (the
          window chips above already carry the upcoming/closed truth). */}
      {canStart ? (
        <span className="oex-row-action" aria-hidden>
          {exam.myAttempt?.status === 'IN_PROGRESS' ? 'متابعة' : 'ابدأ'}
          <Icon icon={ChevronLeft} size={14} />
        </span>
      ) : showResultLink ? (
        <span className="oex-row-action">
          {/* 5-A6 P1-1 companion — a finished attempt is not a dead end:
            the taker renders the honest done-state (score or awaiting
            grading) for this deep link, so history stays reachable.
            6A6-finding-2: practice is excluded — its deep link lands on
            the BEGIN screen (the server grants a retake), so a «عرض
            النتيجة» link there would promise what it never shows.
            r164-e: EXPIRED is excluded too — an expired attempt has no
            result story to show; its truth is fully told by the chip
            above, and the link would promise what never lands. */}
          <Link to={`/student/online-exams/${exam.id}`} className="btn ghost sm">
            <Icon icon={ArrowLeft} size={13} />
            عرض النتيجة
          </Link>
        </span>
      ) : null}
    </>
  );

  // Taken / windowed exams render as a static row — no dead "#" link.
  if (!canStart) {
    return <div className="oex-row" role="listitem">{body}</div>;
  }

  return (
    /* The listitem WRAPPER (not role on the anchor itself): an explicit
     * role="listitem" on the <Link> would override the anchor's implicit
     * link role — the row would lose «link» semantics and name-from-content
     * for assistive tech. The wrapper keeps the named list AND the real
     * link (the patterns' RowList does the same: the link rides the row
     * line inside the item). */
    <div className="oex-row-slot" role="listitem">
      <Link
        to={`/student/online-exams/${exam.id}`}
        className="oex-row"
      >
        {body}
      </Link>
    </div>
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
 *  and the verdict in one tight row group (online-exams.css §4). */
function ReviewQuestionRow({ q, index }: { q: AttemptReviewQuestion; index: number }) {
  const myChoice = q.myChoiceIndex !== null && q.choices ? q.choices[q.myChoiceIndex] ?? null : null;
  const keyChoice = typeof q.correctAnswer === 'number' && q.choices ? q.choices[q.correctAnswer] ?? null : null;
  const verdict = reviewVerdict(q);
  const answered = myChoice !== null || (q.myAnswerText ?? '').trim() !== '';
  return (
    <div className="oex-review-q">
      <div className="oex-review-head">
        <span className="oex-review-num" aria-hidden><bdi>{index + 1}</bdi></span>
        <span className="oex-review-prompt">{q.prompt}</span>
        <Badge color={verdict.color}>{verdict.label}</Badge>
      </div>
      <div className="oex-review-meta">
        <bdi>{q.awardedPoints ?? 0} / {q.points}</bdi> درجة
      </div>
      <div className="oex-review-ans">
        <span className="oex-review-label">إجابتك:</span>{' '}
        {answered
          ? (myChoice ?? <span className="oex-review-text">{q.myAnswerText}</span>)
          : <span className="oex-review-missed">لم تُجب عن هذا السؤال</span>}
      </div>
      {/* The released key: MCQ/TRUE_FALSE choice text, SHORT model
          answer. ESSAY rubrics and keyless shorts stay teacher-side
          (null) — nothing renders, the verdict + feedback carry it. */}
      {(keyChoice !== null || typeof q.correctAnswer === 'string') && (
        <div className="oex-review-key">
          <span className="oex-review-label">الإجابة الصحيحة:</span>{' '}
          {keyChoice ?? <span className="oex-review-text">{q.correctAnswer as string}</span>}
        </div>
      )}
      {q.feedback && (
        <div className="oex-review-feedback">
          <span className="oex-review-label">ملاحظة الأستاذ:</span>{' '}
          <span className="oex-review-text">{q.feedback}</span>
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
    <div className="oex-review">
      <button
        type="button"
        className="btn ghost sm oex-review-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon icon={ChevronDown} size={14} className={open ? 'oex-review-chevron is-open' : 'oex-review-chevron'} />
        مراجعة الأسئلة
      </button>
      {open && (
        <div id={listId} className="oex-review-list">
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
  // r183-B6 (A4 P3-4): the tab names the EXAM, not «اختبار إلكتروني» —
  // the started attempt first, else the list's row for this id.
  useEntityPageTitle(attempt?.title ?? (examsQ.data ?? []).find((e) => e.id === id)?.title ?? null);
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
  /* r176e (D-01): questions whose current text answer exceeds the
   * server's 4000-char bound — the save is skipped with the honest
   * bound message instead of a doomed request. */
  const [overCapQids, setOverCapQids] = useState<ReadonlySet<string>>(new Set());
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
  // decideExamStart refuses for graded kinds). Render the honest
  // done-state up front instead of offering a begin the server will
  // reject a round-trip later. 6A6-finding-2: /exams/me DOES return the
  // latest attempt for practice templates too (the myAttempt collapse
  // is kind-agnostic) — the PRACTICE exclusion below is deliberate, not
  // a missing payload: decideExamStart grants a finished practice
  // attempt a freshStart, so the begin screen is the truth for it.
  const hasFinishedAttempt =
    !!listedExam?.myAttempt && listedExam.myAttempt.status !== 'IN_PROGRESS' && listedExam.kind !== 'PRACTICE';
  // 6A6-finding-2 — the submit dialog's finality note mirrors the same
  // start rule: a finished PRACTICE attempt earns a freshStart
  // (decideExamStart), so the practice note must never claim a retake is
  // impossible. Graded kinds keep the hard truth. Derived from the list
  // payload — a rare deep link before the list resolves keeps the
  // conservative non-practice copy.
  const finalityNote = listedExam?.kind === 'PRACTICE'
    ? 'بعد التسليم لا يمكنك تعديل إجاباتك — يمكنك بدء محاولة تدريبية جديدة لاحقاً.'
    : 'بعد التسليم لا يمكنك تعديل إجاباتك أو إعادة المحاولة.';

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
      // 6A6-finding-1: the 00:00 auto-submit fires while a text draft can
      // still sit un-blurred in the focused textarea — its save has not
      // been registered yet, so the flush below would race straight past
      // it and the draft would vanish from grading. Blur the active
      // textarea FIRST: its synchronous onBlur (runAnswerSave) registers
      // the save into pendingSavesRef before the flush consumes it. The
      // manual path was already safe — clicking any button moves focus
      // off the field and blurs it on the way.
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement) active.blur();
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
      /* r165a: a terminal submit answer must never strand the student
       * on a live-looking dead screen. The zombie scenario: the tab was
       * hidden past the deadline, the backend flipped the attempt to
       * EXPIRED, the (auto-)submit answer 403s — the old catch painted
       * the error but kept the attempt mounted: timer frozen at 00:00,
       * questions still editable, beforeunload still armed, and the
       * active-attempt screen had no exit. Retrying only earned the
       * factually-wrong 409 «تم تسليم هذه المحاولة مسبقاً». Terminal
       * answers settle the attempt exactly like a successful submit:
       * alreadyDone renders the honest done/expired state (with its
       * «العودة للقائمة» exit) and the exams list is re-read so the
       * done screen speaks the refetched status truth, not the stale
       * IN_PROGRESS row. Network errors keep the retry path as-is. */
      if (isTerminalSubmitError(e)) {
        autoSubmittedRef.current = true;
        setAttempt(null);
        setConfirming(false);
        setAlreadyDone(true);
        void examsQ.refetch();
        return;
      }
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
    // (r134 lint adoption: prefer-const — declared here instead of a
    // `let` + later single assignment; readClock only reads it at call
    // time, after this line has run.)
    const intervalId: ReturnType<typeof setInterval> = setInterval(readClock, 1000);
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
    // The reading band starts under the sticky bar and ends at the
    // viewport's lower half, so a card
    // only counts once its title is actually readable. "Current" = the
    // first card whose header entered the band. A card that only drips
    // its tail into the band (the previous question scrolling out) never
    // wins; a long card filling the whole band keeps the ring (fallback:
    // topmost intersecting).
    // The band top mirrors the sticky-bar stack the CSS really paints
    // (online-exams.css .oex-q scroll-margin-block-start): ≈120px on
    // wide viewports, 160px (10rem) at ≤640 where the bar grows the
    // 44px dot row. The rect math below and the observer's rootMargin
    // read the SAME value, so the trigger band and the decision band
    // can never disagree. (jsdom defaults to a 1024px innerWidth, so
    // tests stay on the 120px path.)
    const bandTop = window.innerWidth <= 640 ? 160 : 120;
    const pickCurrent = () => {
      const vh = window.innerHeight;
      const bandBottom = vh * 0.5;
      let inBand: HTMLElement | null = null;
      let crossing: HTMLElement | null = null;
      let inBandTop = Infinity;
      let crossingTop = Infinity;
      for (const el of cards) {
        const r = el.getBoundingClientRect();
        if (r.bottom <= bandTop || r.top >= bandBottom) continue; // outside the band
        if (r.top >= bandTop) {
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
      rootMargin: `-${bandTop}px 0px -50% 0px`,
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
    /* r176e (D-01): a text answer past the server's 4000-char bound
     * cannot ever save — firing it anyway produces a 400 the chip renders
     * as «تعذَّر الحفظ» (a connectivity lie) while submit's allSettled
     * flush lets the exam finish with the essay silently unanswered.
     * Mark the question failed LOCALLY with the honest bound copy and
     * skip the doomed wire call (the maxLength already clamps typing;
     * this belt covers programmatic/edge pastes). */
    if (payload.answerText !== undefined && payload.answerText.length > 4000) {
      setFailedQids((prev) => withQid(prev, qid, true));
      setOverCapQids((prev) => withQid(prev, qid, true));
      return;
    }
    setOverCapQids((prev) => withQid(prev, qid, false));
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
    /* r164-e: EXPIRED is its own terminal truth — the clock ran out and
     * the attempt was never graded, so the screen must never claim a
     * result is pending or coming. SUBMITTED keeps the provisional
     * score but renders the neutral awaiting badge (the machine score
     * is real; the verdict is not — the teacher can still flip it). */
    const expired = myAttempt?.status === 'EXPIRED';
    const verdict = exam ? attemptVerdictChip(exam) : null;
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى الاختبارات
        </Link>
        <Card>
          {/* 5-A6 plan-7 — verdict lockup: icon → title → grade → badge
              read as one tight group (the grade and its verdict badge
              are a single decision), generous break before the action. */}
          <div className="empty-state oex-result">
            {expired ? (
              <Icon icon={Hourglass} size={32} style={{ color: 'var(--warning)' }} />
            ) : (
              /* r280: the kit's exam-complete piece replaces the
                 CheckCircle2 icon — the attempt-finished moment now
                 speaks the two-colour state-graphics family (wiring
                 guide §5). The expired branch keeps the honest
                 hourglass — a missed deadline is not a celebration. */
              <MkIllustration name="exam-complete" size={140} />
            )}
            <h1 className="oex-result-title" style={H1_AS_H2_STYLE}>
              {expired ? 'انتهت مدة هذه المحاولة' : 'لقد أكملت هذا الاختبار مسبقاً'}
            </h1>
            {expired ? (
              <>
                <p className="oex-result-note">انتهى وقت المحاولة دون تسليم — لا تُحتسب لها نتيجة ولا يمكن إعادتها.</p>
                <p className="oex-result-note">راجع مواعيد الاختبارات المتاحة من قائمة الاختبارات.</p>
              </>
            ) : exam && myAttempt && score !== null && score !== undefined ? (
              <>
                <div className="oex-result-lockup">
                  <div className="oex-grade">
                    <span className="oex-grade-value"><bdi>{Number(score)} / {Number(myAttempt.maxScore)}</bdi></span>
                  </div>
                  {/* The verdict badge carries the fail case at full danger
                      weight — a withheld pass is not a soft warning. A
                      SUBMITTED attempt renders the same neutral awaiting
                      chip the list card and the post-submit result screen
                      carry (one mapping: attemptVerdictChip). */}
                  {verdict && (
                    <Badge color={verdict.color}>{verdict.label}</Badge>
                  )}
                </div>
                <p className="oex-result-note">
                  {myAttempt.status === 'SUBMITTED'
                    ? 'درجتك الأولية من الأسئلة الآلية — الدرجات المقالية بانتظار تقييم الأستاذ.'
                    : 'لا يمكن إعادة المحاولة بعد التسليم.'}
                </p>
                {/* 5-D3 (5-B3 hand-off #1 / A6 P2-4): the deep-link
                    done-state offers the same review on a GRADED
                    attempt; anything short of GRADED keeps the honest
                    promise instead of a dead toggle. */}
                {myAttempt.status === 'GRADED' ? (
                  <ExamReviewSection attemptId={myAttempt.id} />
                ) : (
                  <p className="oex-result-note">ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح.</p>
                )}
              </>
            ) : examsQ.isPending ? (
              /* Shape-matched loading (the r176f loading-closure
                 discipline): the done-state's resolved anatomy — moment
                 → title → grade lockup → note → action — as skeleton
                 bars, so the pending → resolved swap moves nothing. The
                 old one-line «جارٍ جلب نتيجتك…» note was the only
                 non-shape-matched loading on these surfaces. */
              <div className="oex-result-skel" aria-busy="true">
                <Skeleton width={140} height={140} rounded="var(--r-lg)" />
                <Skeleton width="min(320px, 100%)" height={26} />
                <Skeleton width={120} height={56} rounded="var(--r-lg)" />
                <Skeleton width="min(380px, 100%)" height={12} />
                <Skeleton width={140} height={44} rounded="var(--r-full)" />
              </div>
            ) : examsQ.isError ? (
              <div className="form-error" role="alert">
                <Icon icon={AlertTriangle} size={14} />
                <span className="form-error-msg">تعذَّر جلب نتيجتك — تحقّق من اتصالك.</span>
                <button type="button" className="btn ghost sm" onClick={() => void examsQ.refetch()}>إعادة المحاولة</button>
              </div>
            ) : (
              <>
                <p className="oex-result-note">لا يمكن إعادة المحاولة بعد التسليم.</p>
                <p className="oex-result-note">النتيجة قيد الاحتساب أو بانتظار تقييم الأسئلة المقالية.</p>
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
          العودة إلى الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon icon={ClipboardCheck} size={32} style={{ color: 'var(--accent)' }} />
            <h1 style={{ margin: 'var(--sp-3) 0 var(--sp-2)', ...H1_AS_H2_STYLE }}>
              {hasLiveAttempt ? 'متابعة الاختبار' : 'هل أنت مستعد للبدء؟'}
            </h1>
            <p className="text-sm text-muted oex-begin-note">
              {hasLiveAttempt
                ? 'لديك محاولة قيد التقدم لهذا الاختبار — الوقت لم يتوقف منذ البدء، وإجاباتك المحفوظة ستظهر كما تركتها.'
                : 'بمجرد الضغط على «بدء الاختبار» سيبدأ المؤقت ولا يمكنك إيقافه. اقرأ كل سؤال جيداً قبل الإجابة. تُسجَّل إجابات الاختيار فور اختيارها، والإجابات النصية عند مغادرة الحقل — ويُسلَّم الاختبار تلقائياً عند انتهاء الوقت.'}
            </p>
            {startError && (
              <div className="form-error oex-begin-error" role="alert">
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
              className="btn primary oex-begin-actions"
              onClick={onStart}
              disabled={start.isPending || examsQ.isPending}
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
          العودة إلى الاختبارات
        </Link>
        <Card>
          {/* 5-A6 plan-7 — verdict lockup (see the done-state screen). */}
          <div className="empty-state oex-result">
            {/* The finished moment speaks the same state-graphics language
                as the deep-link done-state twin above — the kit's
                exam-complete piece (r280), not a lone 36px Lucide icon;
                the verdict badge below owns the pass/fail/awaiting
                semantics, exactly like the twin's lockup. */}
            <MkIllustration name="exam-complete" size={140} />
            <h1 className="oex-result-title" style={H1_AS_H2_STYLE}>
              {awaitingManual ? 'تم تسليم اختبارك' : result.passed ? 'مبروك — لقد اجتزت الاختبار!' : 'الاختبار انتهى'}
            </h1>
            {/* The authored moment — the grade reveal: the real score
                lands as the visual anchor (same exam-grade language as
                the student results card; one-shot rise + state ring). */}
            <div className="oex-result-lockup">
              <div className="oex-grade">
                <span className="oex-grade-value"><bdi>{result.score} / {result.maxScore}</bdi></span>
              </div>
              {awaitingManual ? (
                <Badge>بانتظار التصحيح اليدوي</Badge>
              ) : (
                /* Fail reads at full danger weight — the moment a retake
                    is refused deserves more than a caution tint. */
                <Badge color={result.passed ? 'green' : 'red'}>{result.passed ? 'ناجح' : 'لم يجتز'}</Badge>
              )}
            </div>
            <p className="oex-result-note">
              {/* 22-c counted nouns — «N سؤال» broke the glossary for
                  2/3–10; countAr speaks the forms (the same grammar the
                  submit dialog and the moderation rows carry). */}
              {result.needsManual > 0
                ? <>{countAr(result.needsManual, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])} بحاجة لتقييم يدوي من الأستاذ — ستظهر الدرجة النهائية بعد المراجعة.</>
                : 'تم احتساب النتيجة فوراً.'}
            </p>
            {/* 5-D3 (5-B3 hand-off #1 / A6 P2-4): the review endpoint
                ships — the GRADED result offers the per-question
                review behind one toggle; while manual grading pends
                the honest promise replaces the old "not available"
                note (the key is not released until GRADED). */}
            {awaitingManual ? (
              <p className="oex-result-note">ستتمكّن من مراجعة أسئلتك بعد اكتمال التصحيح اليدوي.</p>
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
      {/* r165a: the one live screen that had NO way out. While a submit
          error keeps the retry path (a network fault — never a terminal
          answer, those settle the attempt above), the student gets the
          same «العودة إلى الاختبارات» back-link every other screen of
          this flow carries. Leaving is safe and honest: answers autosave
          per
          question, the attempt stays IN_PROGRESS server-side and the
          list offers «متابعة» back into it (beforeunload still guards
          an accidental full-page reload). */}
      {submitError && (
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى الاختبارات
        </Link>
      )}
      <div className="oex-bar">
        <div className="oex-bar-main">
          <h1 className="oex-bar-title">{attempt.title}</h1>
          {/* 5-A6 P2-2 — answered progress rides the bar subline so the
              unanswered count is visible while scrolling, not only in
              the submit dialog. */}
          <div className="text-xxs text-subtle">
            <bdi>{attempt.questions.length}</bdi> سؤال · أُجيب عن <bdi>{answeredCount}</bdi>
          </div>
        </div>
        {/* 4C-d — the on-screen «س3 من 10» progress chip (Western digits,
            bidi-isolated): the scroll-tracked current question, so it
            moves as the student reads. aria-hidden — the map nav + the
            subline above carry the same facts for assistive tech. */}
        <span className="oex-bar-progress" aria-hidden="true">
          س<bdi>{currentQid ? attempt.questions.findIndex((qq) => qq.id === currentQid) + 1 : 1}</bdi> من <bdi>{attempt.questions.length}</bdi>
        </span>
        {/* Per-question save honesty (15-e P1-1): the chip names the
            exact questions whose answers are NOT on the server, and
            only saving THOSE questions clears it — a success elsewhere
            never hides an earlier failure. */}
        {failedNumbers.length > 0 && (
          <span className="oex-save-warn" role="status">
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
          className={`oex-timer${timeUrgent ? ' urgent' : ''}`}
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
        <nav className="oex-qmap" aria-label="خريطة الأسئلة">
          {attempt.questions.map((q, i) => {
            const qFailed = failedQids.has(q.id);
            const qAnswered = isAnswered(q.id);
            const qCurrent = currentQid === q.id;
            return (
              <button
                key={q.id}
                type="button"
                className={`oex-qmap-dot${qAnswered ? ' answered' : ''}${qFailed ? ' failed' : ''}${qCurrent ? ' current' : ''}`}
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
        <span className="oex-time-rail" aria-hidden="true" data-urgent={timeUrgent ? '' : undefined}>
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
            <div key={q.id} id={`exam-q-${q.id}`} className="oex-q" tabIndex={-1}>
              <Card className="oex-q-card">
                {/* 15-g P1-5 — the prompt is the accessible name of both
                    answer fields: number + prompt ids are referenced by the
                    textarea (aria-labelledby) and the choice group
                    (role=radiogroup), so a screen reader never meets an
                    unnamed graded input. */}
                <div className="text-xxs text-subtle" id={`exam-q-${q.id}-num`}>
                  {/* 22-c counted nouns — نقطة/نقطتان/N نقاط (the
                      نقطة/نقاط ternary broke 2 and never had an 11+
                      form; same grammar as the moderation rows). */}
                  السؤال <bdi>{i + 1}</bdi> من <bdi>{attempt.questions.length}</bdi> · {countAr(q.points, ['نقطة', 'نقطتان', 'نقاط', 'نقطة'])}
                </div>
                <div className="oex-prompt" id={`exam-q-${q.id}-prompt`}>{q.prompt}</div>
                {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && q.choices && (
                  <div
                    className="oex-q-choices"
                    role="radiogroup"
                    aria-labelledby={`exam-q-${q.id}-num exam-q-${q.id}-prompt`}
                  >
                    {q.choices.map((c, idx) => (
                      <label
                        key={idx}
                        className={`oex-choice${answers[q.id]?.choiceIndex === idx ? ' selected' : ''}`}
                      >
                        {/* Locked while this question's save is in flight
                            (15-e P1-2) — the same honesty as the lecture
                            checkpoint options; the .oex-choice:has(
                            input:disabled) state ships with the sheet. */}
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id]?.choiceIndex === idx}
                          onChange={() => onChoiceChange(q.id, idx)}
                          disabled={savingQids.has(q.id)}
                        />
                        {/* The selected-state check — the accent-tinted row
                            plus this filled check is the ONE signal moment
                            of the answering surface (Lucide, aria-inert —
                            the radio's accessible name stays the choice
                            text alone). */}
                        <span className="oex-choice-check" aria-hidden="true">
                          <Icon icon={Check} size={13} />
                        </span>
                        <span className="oex-choice-text">{c}</span>
                      </label>
                    ))}
                  </div>
                )}
                {(q.type === 'SHORT' || q.type === 'ESSAY') && (
                  <>
                    <textarea
                      className="input oex-answer-field"
                      rows={q.type === 'ESSAY' ? 6 : 2}
                      placeholder="اكتب إجابتك هنا…"
                      aria-labelledby={`exam-q-${q.id}-num exam-q-${q.id}-prompt`}
                      value={answers[q.id]?.answerText ?? ''}
                      onChange={(e) => onTextChange(q.id, e.target.value)}
                      onBlur={() => onTextBlur(q.id)}
                      /* r176e (D-01): the backend's answerText bound
                         (z.string().max(4000), exams.routes.ts) mirrored
                         on the control — an uncapped paste used to fail
                         saves with the misleading «تعذَّر الحفظ» chip and
                         could ride Promise.allSettled into a submit that
                         silently dropped the essay. The same mirror every
                         twin textarea in the codebase carries. */
                      maxLength={4000}
                    />
                    {(answers[q.id]?.answerText ?? '').length > 3600 && (
                      <p className="text-xxs text-subtle oex-char-count">
                        {(answers[q.id]?.answerText ?? '').length}/4000
                      </p>
                    )}
                  </>
                )}
                {saveState && (
                  <div className="oex-q-foot">
                    <span className={`oex-q-state ${saveState}`}>
                      <Icon
                        icon={saveState === 'failed' ? AlertTriangle : saveState === 'saving' ? Clock : CheckCircle2}
                        size={12}
                      />
                      {saveState === 'failed'
                        ? overCapQids.has(q.id)
                          ? 'الإجابة أطول من الحد (4000 حرفًا) — اختصرها ليُحفظ'
                          : 'تعذَّر الحفظ'
                        : saveState === 'saving'
                          ? 'جارٍ الحفظ…'
                          : 'محفوظة'}
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
      <div className="oex-submit-bar">
        {submitError && (
          <div className="form-error" role="alert">
            <Icon icon={AlertTriangle} size={14} />
            <span className="form-error-msg">{submitError}</span>
          </div>
        )}
        <span className={`oex-submit-status${unanswered > 0 ? ' warn' : ' ok'}`}>
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
            ? `لديك ${countAr(unanswered, ['سؤال واحد بدون إجابة', 'سؤالان بدون إجابة', 'أسئلة بدون إجابة', 'سؤالاً بدون إجابة'])}. ${finalityNote}`
            : finalityNote
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

/* r155b: خرائط تسميات السؤال للمعاينة داخل لوحة المراجعة — توائم
 * حرفيّة لخرائط ExamAuthorPages (نفس سابقة KIND_LABEL المتطابقة بين
 * الملفين؛ الاستيراد المباشر من صفحة المؤلف يسحب قطاع الأستاذ كاملاً
 * إلى حزمة الطالب/الجودة). أي تعديل يُطبّق على الجهتين. */
const QTYPE_LABEL: Record<QType, string> = {
  MCQ: 'اختيار من متعدد',
  TRUE_FALSE: 'صح أم خطأ',
  SHORT: 'إجابة قصيرة',
  ESSAY: 'سؤال مقالي',
};
const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'سهل',
  MEDIUM: 'متوسط',
  HARD: 'صعب',
};
const DIFFICULTY_COLOR: Record<Difficulty, 'green' | 'amber' | 'red'> = {
  EASY: 'green',
  MEDIUM: 'amber',
  HARD: 'red',
};

/* توأم محلي دقيق للدالة النقية answerKeySummary في ExamAuthorPages —
 * يستقرئ مفتاح الإجابة البشري بحسب نوع السؤال (أو null حين لا يُخدم
 * المفتاح للعارض). المراجع بجودة+EXAMS_MODERATE يصله correctAnswer من
 * الخلفية (canSeeAnswers في exams.routes.ts)؛ null يعني غياباً
 * صادقاً لا مفتاحاً مزيّفاً. */
function answerKeySummary(q: {
  type: QType;
  choices: string[] | null;
  correctAnswer: string | number | boolean | null;
}): string | null {
  if (q.correctAnswer === null || q.correctAnswer === undefined) return null;
  if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
    if (typeof q.correctAnswer === 'boolean') return null;
    const idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : Number(q.correctAnswer);
    if (!Number.isInteger(idx) || idx < 0) return null;
    const choice = q.choices?.[idx];
    return choice !== undefined ? `الإجابة الصحيحة: ${choice}` : null;
  }
  if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim() !== '') {
    return q.type === 'SHORT' ? `الإجابة النموذجية: ${q.correctAnswer}` : `معيار التصحيح: ${q.correctAnswer}`;
  }
  return null;
}

/* r155b: معاينة أسئلة القالب داخل لوحة المراجعة — كانت اللوحة تعرض
 * البيانات الوصفية والملاحظة فقط فيعتمد/يرفض المراجع «على العمى».
 * التحكم يركّب فقط عند فتح اللوحة (الاستعلام يجري عند الفتح، وذاكرة
 * ['exams','templates',id] تخدم الفتح التالي فوراً) — نفس بيانات
 * ExamTemplateDetailPage التي يراها المؤلف. */
function TemplateQuestionsPreview({ templateId }: { templateId: string }) {
  const tplQ = useExamTemplate(templateId);
  const questions = tplQ.data?.questions ?? [];

  return (
    <div className="oex-mod-preview">
      <div className="oex-mod-preview-head">
        <Icon icon={ListChecks} size={13} />
        <span className="text-xs text-muted">
          أسئلة القالب —{' '}
          {tplQ.isPending
            ? 'جارٍ التحميل…'
            : tplQ.data
              ? countAr(questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])
              : '—'}
        </span>
      </div>
      {tplQ.isPending ? (
        <ListSkeleton rows={3} />
      ) : tplQ.isError ? (
        <div className="form-error" role="alert">
          <Icon icon={AlertTriangle} size={14} />
          <span className="form-error-msg">
            {apiErrorMessage(tplQ.error, 'تعذَّر تحميل أسئلة القالب — راجع الأسئلة قبل القرار.')}
          </span>
          <button type="button" className="btn ghost sm" onClick={() => void tplQ.refetch()}>
            إعادة المحاولة
          </button>
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          illustration="empty-list"
          icon={FileText}
          title="لا أسئلة في هذا القالب"
          description="ربما أُوقفت أسئلته من البنك بعد بنائه."
        />
      ) : (
        <div className="flex-col">
          {questions.map((eq, i) => (
            <ModerationQuestionRow key={eq.id} order={i + 1} row={eq} />
          ))}
        </div>
      )}
    </div>
  );
}

/* صفّ سؤال للمعاينة — نحو صفوف TemplateQuestionRow في صفحة تفصيل
 * القالب (list-row + شارات النوع/الصعوبة + سطر مفتاح الإجابة)، بلا
 * إجراءات لكل سؤال: القرار هنا على القالب ككل. */
function ModerationQuestionRow({
  order,
  row,
}: {
  order: number;
  row: ExamTemplateDetail['questions'][number];
}) {
  const q = row.question;
  const points = row.pointsOverride ?? q.points;
  const key = answerKeySummary(q);
  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <bdi className="list-row-meta font-mono">{order}</bdi>
      <div className="list-row-body">
        <div className="list-row-title" title={q.prompt}>{q.prompt}</div>
        <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge>{QTYPE_LABEL[q.type]}</Badge>
          <Badge color={DIFFICULTY_COLOR[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
          {q.category && <span>{q.category.title}</span>}
          <span>
            {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
            {row.pointsOverride !== null && ' (معدَّلة)'}
          </span>
          {!q.isApproved && <Badge color="red" icon={Ban}>موقوف</Badge>}
        </div>
        {/* مفتاح الإجابة — الخلفية تُخفيه (null) عن كل عارض ليس من
            أجله؛ null لا يُعرض إطلاقاً (لا مفتاحاً مزيّفاً). */}
        {key && (
          <div className="oex-mod-key">
            <Icon icon={CheckCircle2} size={11} /> {key}
          </div>
        )}
        {!q.isApproved && q.moderationNote && (
          <div className="oex-mod-note">
            <Icon icon={Info} size={11} /> {q.moderationNote}
          </div>
        )}
      </div>
    </div>
  );
}

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
  /* Honest KPIs (the values the strip renders below): pending shows
   * '…', an API-down queue shows '—' (never a fake zero), and the
   * system-status cell derives from the query instead of a hardcoded
   * «نشط». 6A9-finding-8 — the static «نموذج الجودة: رؤية 2024–2028»
   * tile was invented content (no such data source exists); the
   * questions-awaiting KPI derives from the queue itself, summed over
   * the pending rows. No decision timestamps exist in the page payload
   * (PENDING queue only), so no «decisions this month» was invented
   * either. */
  const kpiKnown = !queueQ.isPending && !queueQ.isError;
  const pendingCount = queue?.length ?? 0;
  const questionsAwaiting = (queue ?? []).reduce((sum, item) => sum + item._count.questions, 0);

  return (
    <div className="page">
      <PageHeader
        title="مراجعة الاختبارات"
        subtitle="مراجعة قوالب الاختبارات الموحَّدة قبل اعتمادها وإتاحتها للطلاب — صلاحية حصرية لمكتب الجودة."
      />

      {/* The quality sector's typographic StatStrip (R189/R190 — the
          same strip QualityPages carries), replacing the retired grid-3
          icon-tile MetricCard grammar. The severity state the old
          MetricCard `color` prop painted on the tile box now rides the
          trend note's tone (down = rose ink / up = mint ink — the
          OwnerAlertsPage mapping; the strip has no per-value tone of
          its own, its value union is the plain up/down/flat trend
          tone). */}
      <StatStrip
        ariaLabel="مؤشرات مراجعة الاختبارات"
        cells={[
          {
            label: 'بانتظار المراجعة',
            value: queueQ.isPending ? '…' : queueQ.isError ? '—' : `${pendingCount}`,
            trend: kpiKnown ? (pendingCount === 0 ? 'لا شيء ينتظر' : 'تنتظر قرارك') : 'بانتظار البيانات',
            trendTone: kpiKnown ? (pendingCount > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'أسئلة بانتظار الفحص',
            value: queueQ.isPending ? '…' : queueQ.isError ? '—' : `${questionsAwaiting}`,
            trend: kpiKnown
              ? (questionsAwaiting === 0 ? 'لا أسئلة معلّقة' : 'مجموع أسئلة القوالب المعلّقة')
              : 'بانتظار البيانات',
            trendTone: kpiKnown ? (questionsAwaiting > 0 ? 'down' : 'up') : 'flat',
          },
          {
            label: 'حالة النظام',
            value: queueQ.isPending ? '…' : queueQ.isError ? 'تعذّر الاتصال' : 'نشط',
            trend: queueQ.isError ? 'تعذّر جلب الطابور' : kpiKnown ? 'اتصال سليم' : 'بانتظار البيانات',
            trendTone: queueQ.isError ? 'down' : kpiKnown ? 'up' : 'flat',
          },
        ]}
      />

      {/* The backend queue is strict FIFO oldest-first (exams.routes.ts
          orders by createdAt asc) — the subtitle discloses the order the
          rows arrive in, the honest contract for a read-heavy queue. */}
      <Card title="قائمة الانتظار" icon={ClipboardCheck} subtitle="الطابور بالأقدم أولًا">
        {queueQ.isPending ? (
          <ListSkeleton rows={4} />
        ) : queueQ.isError ? (
          <ErrorState error={queueQ.error} onRetry={() => void queueQ.refetch()} />
        ) : queue && queue.length === 0 ? (
          /* The shared EmptyState primitive (the same call shape the
             list page's sections use), keeping the exact copy + icon. */
          <EmptyState
            icon={CheckCircle2}
            title="لا شيء بانتظار المراجعة"
            description="كل قوالب الاختبارات المتاحة للطلاب اجتازت المراجعة."
          />
        ) : (
          <div className="oex-queue" role="list" aria-label="طابور المراجعة">
            {queue?.map((item) => {
              const rowPending = acting?.id === item.id;
              return (
                <div key={item.id} className="oex-mod-row" role="listitem">
                  <div className="oex-mod-main">
                    <div className="oex-mod-title">{item.title}</div>
                    <div className="oex-mod-meta">
                      <Badge>{KIND_LABEL[item.kind]}</Badge>
                      {item.offering && <Badge color="brand">{item.offering.course.name}</Badge>}
                      {/* 22-c counted nouns — «N سؤال · N د» broke the
                          glossary for 2 (سؤالان/دقيقتين) and 3–10
                          (أسئلة/دقائق). */}
                      <Badge>
                        {countAr(item._count.questions, ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'])
                          + ' · '
                          + countAr(item.durationMin, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])}
                      </Badge>
                      <span className="text-xxs text-subtle">
                        قدّمه: {item.author.firstName} {item.author.lastName}
                      </span>
                      {/* The payload's createdAt finally renders — the
                          waiting age IS the prioritisation signal (the
                          queue is oldest-first); the reviewer sees how
                          long each template has been waiting.
                          formatRelativeArShort already carries the
                          «منذ» prefix — no second one here. */}
                      <span className="text-xxs text-subtle">
                        بانتظار المراجعة {formatRelativeArShort(item.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="oex-mod-actions">
                    {/* r166b (E2 #7 — weak CTA affordance): the row's ONLY
                        action rendered as a transparent 59×32 ghost button —
                        indistinguishable from a text label. The outline
                        variant keeps ghost's calm (no lift grammar, no fill)
                        while drawing a visible border, so the queue's
                        primary verb always reads as a control. */}
                    <button
                      type="button"
                      className="btn outline sm"
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
                      className="oex-mod-panel"
                      id={`moderation-panel-${item.id}`}
                      role="region"
                      aria-label={`مراجعة ${item.title}`}
                    >
                      {/* r155b: الأسئلة قبل الملاحظة والقرار — المراجع
                          يقرأ ما يعتمده بدل الاعتماد على العنوان والمدة
                          فقط. مسار الاعتماد/الرفض نفسه لم يتغيّر. */}
                      <TemplateQuestionsPreview templateId={item.id} />
                      {/* r165a: the note is capped at the backend's
                          moderateSchema (exams.routes.ts note max 500) —
                          the teacher-side twin (TemplateModerationPanel in
                          ExamAuthorPages) already caps this way; an
                          uncapped textarea past 500 chars failed with a
                          misleading connectivity error. Twin pattern
                          matched exactly (maxLength, no counter). */}
                      <textarea
                        className="input oex-mod-note-field"
                        rows={2}
                        maxLength={500}
                        placeholder="ملاحظات للمؤلف (اختياري)…"
                        aria-label="ملاحظات المراجعة للمؤلف"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <div className="oex-mod-actions">
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
                        <div className="form-error oex-mod-error" role="alert">
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
