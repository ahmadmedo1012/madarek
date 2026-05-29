/**
 * Unified online exams.
 *
 *   /student/online-exams         student exam list (available + history)
 *   /student/online-exams/:id     student exam taker (start → answer → submit)
 *   /quality/exam-moderation      quality moderation queue
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ChevronLeft,
  Sparkles, ShieldCheck, FileText, BookOpen, type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard, ProgressBar } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useMyExams, useStartExam, useSubmitAnswer, useFinishExam,
  useExamModerationQueue, useModerateExam,
  type MyExam, type StartedAttempt,
} from '../../hooks/useResources';

const KIND_LABEL: Record<string, string> = {
  QUIZ: 'اختبار قصير', MIDTERM: 'نصفي', FINAL: 'نهائي', PRACTICE: 'تدريبي',
};
const KIND_COLOR: Record<string, string> = {
  QUIZ: '#2952C8', MIDTERM: '#7B3AED', FINAL: '#EF4444', PRACTICE: '#0E5C2F',
};

/* ═══════════════ Student exam list ═══════════════ */
export default function OnlineExamsPage() {
  const { data: exams } = useMyExams();
  const available = useMemo(() => (exams ?? []).filter((e) => !e.myAttempt), [exams]);
  const taken = useMemo(() => (exams ?? []).filter((e) => e.myAttempt), [exams]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الاختبارات الإلكترونية</h1>
          <p className="page-subtitle">
            اختبارات معتمدة من مكتب الجودة، موحَّدة عبر الكليات. تنبيه: لا يمكن إعادة المحاولة بعد التسليم.
          </p>
        </div>
      </div>

      <Card title="اختبارات متاحة لك الآن" icon={ClipboardCheck} subtitle={`${available.length} اختبار`}>
        {available.length === 0 && (
          <div className="empty-state">
            <Icon icon={CheckCircle2} size={28} style={{ color: 'var(--success)' }} />
            <p className="text-sm text-muted">لا توجد اختبارات نشطة حالياً.</p>
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
    </div>
  );
}

function ExamCard({ exam, canStart }: { exam: MyExam; canStart: boolean }) {
  const accent = KIND_COLOR[exam.kind] ?? 'var(--accent)';
  const passed = exam.myAttempt && exam.myAttempt.score !== null && (Number(exam.myAttempt.score) / Number(exam.myAttempt.maxScore)) * 100 >= exam.passingScore;
  return (
    <Link
      to={canStart ? `/student/online-exams/${exam.id}` : '#'}
      onClick={(e) => { if (!canStart) e.preventDefault(); }}
      className="track-card"
      style={{ ['--track-accent' as never]: accent, cursor: canStart ? 'pointer' : 'default' }}
    >
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={exam.courseIcon ?? '📝'} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{KIND_LABEL[exam.kind]} · {exam.courseName ?? exam.facultyName ?? 'موحد'}</div>
        <div className="track-card-title">{exam.title}</div>
        <div className="track-card-meta">
          <span><Icon icon={Clock} size={12} /> {exam.durationMin} دقيقة</span>
          <span><Icon icon={ClipboardCheck} size={12} /> {exam.questionCount} سؤال</span>
          <span>درجة النجاح ≥ {exam.passingScore}%</span>
        </div>
        {exam.myAttempt && exam.myAttempt.score !== null && (
          <div style={{ marginTop: 8 }}>
            <Badge color={passed ? 'green' : 'amber'}>
              {Number(exam.myAttempt.score)} / {Number(exam.myAttempt.maxScore)} · {passed ? 'ناجح' : 'لم يجتز'}
            </Badge>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ═══════════════ Student exam taker ═══════════════ */
export function ExamTakerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const start = useStartExam();
  const answer = useSubmitAnswer();
  const finish = useFinishExam();
  const [attempt, setAttempt] = useState<StartedAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, { choiceIndex?: number; answerText?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean; needsManual: number } | null>(null);

  const onStart = async () => {
    if (!id) return;
    const r = await start.mutateAsync(id);
    if (r.alreadyAttempted) {
      // Already taken — show msg and return to list
      setResult({ score: 0, maxScore: 1, passed: false, needsManual: 0 });
      return;
    }
    setAttempt(r);
    const expiry = new Date(r.expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(s);
    };
    tick();
  };

  // Countdown
  useEffect(() => {
    if (!attempt) return;
    const id = setInterval(() => {
      const expiry = new Date(attempt.expiresAt).getTime();
      const s = Math.max(0, Math.round((expiry - Date.now()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [attempt]);

  const onChoiceChange = async (qid: string, idx: number) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { choiceIndex: idx } }));
    void answer.mutateAsync({ attemptId: attempt.attemptId, questionId: qid, choiceIndex: idx });
  };
  const onTextChange = async (qid: string, text: string) => {
    if (!attempt) return;
    setAnswers((a) => ({ ...a, [qid]: { answerText: text } }));
  };
  const onTextBlur = async (qid: string) => {
    if (!attempt) return;
    const v = answers[qid]?.answerText ?? '';
    void answer.mutateAsync({ attemptId: attempt.attemptId, questionId: qid, answerText: v });
  };

  const onSubmit = async () => {
    if (!attempt) return;
    const r = await finish.mutateAsync(attempt.attemptId);
    setResult({ score: Number(r.score), maxScore: Number(r.maxScore), passed: r.passed, needsManual: r.needsManual });
  };

  // Initial state — show "Begin" prompt
  if (!attempt && !result) {
    return (
      <div className="page">
        <Link to="/student/online-exams" className="back-link">
          <Icon icon={ChevronLeft} size={14} />
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
          <Icon icon={ChevronLeft} size={14} />
          كل الاختبارات
        </Link>
        <Card>
          <div className="empty-state">
            <Icon
              icon={result.passed ? CheckCircle2 : AlertTriangle}
              size={36}
              style={{ color: result.passed ? 'var(--success)' : 'var(--warn)' }}
            />
            <h2 style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>
              {result.passed ? 'مبروك — لقد اجتزت الاختبار!' : 'الاختبار انتهى'}
            </h2>
            <div style={{ fontSize: 32, fontWeight: 700, color: result.passed ? 'var(--success)' : 'var(--warn)' }}>
              {result.score} / {result.maxScore}
            </div>
            <div className="text-sm text-muted">
              {result.needsManual > 0 ? `${result.needsManual} سؤال بحاجة لتقييم يدوي من الأستاذ.` : 'تم احتساب النتيجة فوراً.'}
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
          <h1 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>{attempt.title}</h1>
          <div className="text-xxs text-subtle">{attempt.questions.length} سؤال</div>
        </div>
        <div className={`exam-timer${timeUrgent ? ' urgent' : ''}`}>
          <Icon icon={Clock} size={14} />
          <span className="font-mono">{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div className="flex-col gap-3">
        {attempt.questions.map((q, i) => (
          <Card key={q.id}>
            <div className="text-xxs text-subtle" style={{ marginBottom: 4 }}>
              السؤال {i + 1} من {attempt.questions.length} · {q.points} {q.points === 1 ? 'نقطة' : 'نقاط'}
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
                      onChange={() => onChoiceChange(q.id, idx)}
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
                onChange={(e) => onTextChange(q.id, e.target.value)}
                onBlur={() => onTextBlur(q.id)}
                style={{ marginTop: 'var(--sp-3)' }}
              />
            )}
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
        <button type="button" className="btn primary" onClick={onSubmit} disabled={finish.isPending}>
          {finish.isPending ? 'جارٍ التسليم…' : 'تسليم الاختبار'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════ Quality moderation queue ═══════════════ */
export function ExamModerationPage() {
  const { data: queue } = useExamModerationQueue();
  const moderate = useModerateExam();
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مراجعة الاختبارات</h1>
          <p className="page-subtitle">
            مراجعة قوالب الاختبارات الموحَّدة قبل اعتمادها وإتاحتها للطلاب — صلاحية حصرية لمكتب الجودة.
          </p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={ShieldCheck} label="بانتظار المراجعة" value={(queue?.length ?? 0).toString()} color="amber" />
        <MetricCard icon={CheckCircle2} label="حالة النظام" value="نشط" color="green" />
        <MetricCard icon={Sparkles} label="نموذج الجودة" value="رؤية 2024–2028" color="purple" change="معايير الجودة المحلية والدولية" />
      </div>

      <Card title="قائمة الانتظار" icon={ClipboardCheck}>
        {queue && queue.length === 0 && (
          <div className="empty-state">
            <Icon icon={CheckCircle2} size={28} style={{ color: 'var(--success)' }} />
            <p className="text-sm text-muted">لا توجد اختبارات بانتظار المراجعة الآن.</p>
          </div>
        )}
        <div className="flex-col gap-2">
          {queue?.map((q) => (
            <div key={q.id} className="moderation-row">
              <div style={{ flex: 1 }}>
                <div className="moderation-title">{q.title}</div>
                <div className="moderation-meta">
                  <Badge>{KIND_LABEL[q.kind]}</Badge>
                  {q.offering && <Badge color="brand">{q.offering.course.name}</Badge>}
                  <Badge>{q._count.questions} سؤال · {q.durationMin} د</Badge>
                  <span className="text-xxs text-subtle">
                    قدّمه: {q.author.firstName} {q.author.lastName}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => setOpen(open === q.id ? null : q.id)}
                >
                  {open === q.id ? 'إغلاق' : 'مراجعة'}
                </button>
              </div>
              {open === q.id && (
                <div style={{ width: '100%', marginTop: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="ملاحظات للمؤلف (اختياري)…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ marginBottom: 'var(--sp-2)' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn primary sm"
                      style={{ background: 'var(--success)' }}
                      onClick={async () => {
                        await moderate.mutateAsync({ id: q.id, approve: true, note: note || undefined });
                        setOpen(null); setNote('');
                      }}
                    >
                      <Icon icon={CheckCircle2} size={13} /> اعتماد
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={async () => {
                        await moderate.mutateAsync({ id: q.id, approve: false, note: note || undefined });
                        setOpen(null); setNote('');
                      }}
                    >
                      <Icon icon={AlertTriangle} size={13} /> رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
