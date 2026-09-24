/**
 * Unified online exams.
 *
 *   /student/online-exams         student exam list (available + history)
 *   /student/online-exams/:id     student exam taker (start → answer → submit)
 *   /quality/exam-moderation      quality moderation queue
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  Sparkles, ShieldCheck, FileText,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { Skeleton, ListSkeleton, ErrorState } from '../../components/primitives/States';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import {
  useMyExams, useStartExam, useSubmitAnswer, useFinishExam,
  useExamModerationQueue, useModerateExam, apiErrorMessage,
  type MyExam, type StartedAttempt,
} from '../../hooks/useResources';

const KIND_LABEL: Record<string, string> = {
  QUIZ: 'اختبار قصير', MIDTERM: 'نصفي', FINAL: 'نهائي', PRACTICE: 'تدريبي',
};
const KIND_COLOR: Record<string, string> = {
  QUIZ: 'var(--chart-3)',
  MIDTERM: 'var(--chart-5)',
  FINAL: 'var(--danger)',
  PRACTICE: 'var(--chart-2)',
};

/* ═══════════════ Student exam list ═══════════════ */
export default function OnlineExamsPage() {
  const q = useMyExams();
  const exams = q.data;
  const available = useMemo(() => (exams ?? []).filter((e) => !e.myAttempt), [exams]);
  const taken = useMemo(() => (exams ?? []).filter((e) => e.myAttempt), [exams]);

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
                <div className="state-desc">ستظهر الاختبارات هنا فور اعتمادها من مكتب الجودة ومُقرِّريك.</div>
              </div>
            )}
            <div className="track-grid">
              {available.map((e) => <ExamCard key={e.id} exam={e} canStart />)}
            </div>
          </Card>

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
        </div>
        {exam.myAttempt && exam.myAttempt.score !== null && (
          <div style={{ marginTop: 8 }}>
            <Badge color={passed ? 'green' : 'amber'}>
              <bdi>{Number(exam.myAttempt.score)} / {Number(exam.myAttempt.maxScore)}</bdi> · {passed ? 'ناجح' : 'لم يجتز'}
            </Badge>
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
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean; needsManual: number } | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Autosave honesty: a failed answer save must never be silent — the
  // sticky bar carries a warning chip until the next save succeeds.
  const [saveFailed, setSaveFailed] = useState(false);
  // Guards against double auto-submit when the countdown reaches 00:00
  // (the interval may tick once more before it is cleared).
  const autoSubmittedRef = useRef(false);
  // One assertive screen-reader announcement when the remaining time
  // crosses into the urgent window (never per-tick — that would spam).
  const [urgentNote, setUrgentNote] = useState<string | null>(null);

  const onStart = async () => {
    if (!id) return;
    setStartError(null);
    try {
      const r = await start.mutateAsync(id);
      if (r.alreadyAttempted) {
        // Already taken — honest state, real result shown from the
        // exams list payload (no fabricated score).
        setAlreadyDone(true);
        return;
      }
      autoSubmittedRef.current = false;
      setUrgentNote(null);
      setConfirming(false);
      setAttempt(r);
      const expiry = new Date(r.expiresAt).getTime();
      const tick = () => {
        const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
        setSecondsLeft(s);
      };
      tick();
    } catch (e) {
      setStartError(apiErrorMessage(e, 'تعذَّر بدء الاختبار — تحقّق من اتصالك وحاول مرة أخرى.'));
    }
  };

  const submitAttempt = async () => {
    if (!attempt) return;
    setSubmitError(null);
    try {
      const r = await finish.mutateAsync(attempt.attemptId);
      setResult({ score: Number(r.score), maxScore: Number(r.maxScore), passed: r.passed, needsManual: r.needsManual });
    } catch (e) {
      setSubmitError(apiErrorMessage(e, 'تعذَّر تسليم الاختبار — حاول مرة أخرى.'));
    }
  };

  // Keep a ref to the latest submit function so the countdown interval
  // always calls the current closure.
  const submitAttemptRef = useRef(submitAttempt);
  useEffect(() => {
    submitAttemptRef.current = submitAttempt;
  });

  // Countdown — auto-submits exactly once when the timer hits 00:00.
  useEffect(() => {
    if (!attempt) return;
    const id = setInterval(() => {
      const expiry = new Date(attempt.expiresAt).getTime();
      const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(id);
        // Auto-submit when the timer hits 0 (double-fire guarded via
        // autoSubmittedRef). Without this, students were stranded on a
        // dead "00:00" page with in-progress answers silently lost.
        // The backend reject path surfaces as an error state rather
        // than a fake result screen.
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          void submitAttemptRef.current();
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [attempt, finish]);

  // Warn before a full page close/reload while an attempt is live —
  // answers autosave per question, but a mid-question reload loses the
  // unsaved draft and the attempt keeps burning time.
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

  const onChoiceChange = async (qid: string, idx: number) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { choiceIndex: idx } }));
    try {
      await answer.mutateAsync({ attemptId: attempt.attemptId, questionId: qid, choiceIndex: idx });
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
  };
  const onTextChange = async (qid: string, text: string) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { answerText: text } }));
  };
  const onTextBlur = async (qid: string) => {
    if (!attempt) return;
    const v = answers[qid]?.answerText ?? '';
    try {
      await answer.mutateAsync({ attemptId: attempt.attemptId, questionId: qid, answerText: v });
      setSaveFailed(false);
    } catch {
      setSaveFailed(true);
    }
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
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>هل أنت مستعد للبدء؟</h2>
            <p className="text-sm text-muted" style={{ maxWidth: 480, textAlign: 'center' }}>
              بمجرد الضغط على "بدء الاختبار" سيبدأ المؤقت ولا يمكنك إيقافه. اقرأ كل سؤال جيداً
              قبل الإجابة. الأسئلة تُسجَّل تلقائياً عند تغيير الإجابة.
            </p>
            {startError && (
              <div className="form-error" role="alert" style={{ marginTop: 'var(--sp-3)', maxWidth: 480 }}>
                <Icon icon={AlertTriangle} size={14} />
                <span className="form-error-msg">{startError}</span>
              </div>
            )}
            <button type="button" className="btn primary" onClick={onStart} disabled={start.isPending} style={{ marginTop: 'var(--sp-3)' }}>
              {start.isPending ? 'جارٍ التحضير…' : 'بدء الاختبار'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon
              icon={result.passed ? CheckCircle2 : AlertTriangle}
              size={36}
              style={{ color: result.passed ? 'var(--success)' : 'var(--warning)' }}
            />
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>
              {result.passed ? 'مبروك — لقد اجتزت الاختبار!' : 'الاختبار انتهى'}
            </h2>
            {/* The authored moment — the grade reveal: the real score
                lands as the visual anchor (same exam-grade language as
                the student results card; one-shot rise + state ring). */}
            <div className="exam-grade">
              <span className="exam-grade-value"><bdi>{result.score} / {result.maxScore}</bdi></span>
            </div>
            <Badge color={result.passed ? 'green' : 'amber'}>{result.passed ? 'ناجح' : 'لم يجتز'}</Badge>
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

  return (
    <div className="page">
      <div className="exam-bar">
        <div>
          <h1 className="exam-bar-title">{attempt.title}</h1>
          <div className="text-xxs text-subtle"><bdi>{attempt.questions.length}</bdi> سؤال</div>
        </div>
        {saveFailed && (
          <span className="exam-save-warn" role="status">
            <Icon icon={AlertTriangle} size={13} />
            تعذَّر حفظ آخر إجابة — أعد تحديدها
          </span>
        )}
        {/* role=timer names the countdown for assistive tech without
            announcing every tick; the urgency threshold crossing is
            announced once via the live region below. */}
        <div
          className={`exam-timer${timeUrgent ? ' urgent' : ''}`}
          role="timer"
          aria-label={`الوقت المتبقي: ${m} دقيقة و${s} ثانية`}
        >
          <Icon icon={Clock} size={14} />
          <span className="font-mono" dir="ltr">{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</span>
        </div>
      </div>
      {urgentNote && <span className="visually-hidden" role="alert">{urgentNote}</span>}

      <div className="flex-col gap-3">
        {attempt.questions.map((q, i) => (
          <Card key={q.id}>
            <div className="text-xxs text-subtle" style={{ marginBottom: 4 }}>
              السؤال <bdi>{i + 1}</bdi> من <bdi>{attempt.questions.length}</bdi> · <bdi>{q.points}</bdi> {q.points === 1 ? 'نقطة' : 'نقاط'}
            </div>
            <div className="exam-prompt">{q.prompt}</div>
            {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && q.choices && (
              <div className="flex-col gap-2" style={{ marginTop: 'var(--sp-3)' }}>
                {q.choices.map((c, idx) => (
                  <label
                    key={idx}
                    className={`exam-choice${answers[q.id]?.choiceIndex === idx ? ' selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id]?.choiceIndex === idx}
                      onChange={() => void onChoiceChange(q.id, idx)}
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
                value={answers[q.id]?.answerText ?? ''}
                onChange={(e) => void onTextChange(q.id, e.target.value)}
                onBlur={() => void onTextBlur(q.id)}
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
