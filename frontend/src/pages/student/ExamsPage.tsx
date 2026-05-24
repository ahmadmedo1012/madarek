import { useMemo, useState } from 'react';
import {
  ClipboardCheck, AlertCircle, CheckCircle2, XCircle, Eye, Sparkles,
  ListChecks, Target, BookMarked, ChevronLeft, type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, MetricCard, Badge, ProgressBar } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useGaps } from '../../hooks/useResources';

interface ExamItem {
  id: string;
  course: string;
  code: string;
  semester: string;
  date: string;
  totalQuestions: number;
  correct: number;
  topGapConcepts: string[];   // names of concepts where the student failed
  yourScore: number;          // /100
  classAvg: number;
  status: 'graded' | 'pending';
}

const EXAMS: ExamItem[] = [
  {
    id: 'e-1',
    course: 'هياكل البيانات والخوارزميات',
    code: 'CS-202',
    semester: 'الفصل الربيعي 2026',
    date: '2026-04-12',
    totalQuestions: 40,
    correct: 28,
    yourScore: 70,
    classAvg: 64,
    topGapConcepts: ['الأشجار الثنائية', 'التعقيد الزمني', 'الجداول التجزئية'],
    status: 'graded',
  },
  {
    id: 'e-2',
    course: 'مقدمة في الذكاء الاصطناعي',
    code: 'CS-310',
    semester: 'الفصل الربيعي 2026',
    date: '2026-03-28',
    totalQuestions: 30,
    correct: 24,
    yourScore: 80,
    classAvg: 71,
    topGapConcepts: ['Backpropagation', 'Loss Functions'],
    status: 'graded',
  },
  {
    id: 'e-3',
    course: 'قواعد البيانات',
    code: 'CS-205',
    semester: 'الفصل الربيعي 2026',
    date: '2026-04-02',
    totalQuestions: 35,
    correct: 19,
    yourScore: 54,
    classAvg: 68,
    topGapConcepts: ['التطبيع (Normalization)', 'فهرسة قواعد البيانات', 'استعلامات JOIN المتقدمة'],
    status: 'graded',
  },
  {
    id: 'e-4',
    course: 'شبكات الحاسوب',
    code: 'CS-330',
    semester: 'الفصل الربيعي 2026',
    date: '2026-05-08',
    totalQuestions: 32,
    correct: 0,
    yourScore: 0,
    classAvg: 0,
    topGapConcepts: [],
    status: 'pending',
  },
];

type View = 'list' | 'detail';

export default function ExamsPage() {
  const [view, setView] = useState<View>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const gaps = useGaps();

  const stats = useMemo(() => {
    const graded = EXAMS.filter((e) => e.status === 'graded');
    const avgScore = graded.reduce((s, e) => s + e.yourScore, 0) / Math.max(graded.length, 1);
    const totalQuestions = graded.reduce((s, e) => s + e.totalQuestions, 0);
    const totalCorrect = graded.reduce((s, e) => s + e.correct, 0);
    const successRate = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return { avgScore: Math.round(avgScore), totalQuestions, totalCorrect, successRate };
  }, []);

  const selected = selectedId ? EXAMS.find((e) => e.id === selectedId) : null;

  if (view === 'detail' && selected) {
    return <ExamDetail exam={selected} onBack={() => { setView('list'); setSelectedId(null); }} />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تحليل الامتحانات</h1>
          <p className="page-subtitle">
            عرض موسّع لكل امتحان أديتَه: الأسئلة التي أخطأت فيها، الفراغات المعرفية المرتبطة، والفيديوهات المقترحة لسدّها.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={ClipboardCheck} label="متوسّط درجاتك" value={`${stats.avgScore}%`} color={stats.avgScore >= 75 ? 'green' : stats.avgScore >= 60 ? 'gold' : 'amber'} />
        <MetricCard icon={CheckCircle2} label="إجابات صحيحة" value={`${stats.totalCorrect}/${stats.totalQuestions}`} color="brand" />
        <MetricCard icon={Target} label="نسبة النجاح" value={`${stats.successRate}%`} color="purple" />
        <MetricCard icon={AlertCircle} label="فراغات نشطة" value={gaps.data?.length ?? '—'} color="amber" />
      </div>

      {/* Methodology callout — directly cites the spec */}
      <Card>
        <div className="flex items-start gap-3" style={{ flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', width: 40, height: 40, borderRadius: 'var(--r-md)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon icon={Sparkles} size={18} />
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              كيف يعمل تحليل الفراغات في الامتحان؟
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 6, lineHeight: 'var(--lh-base)' }}>
              عند الإجابة الخاطئة، يُحلّل الذكاء الاصطناعي السؤال إلى أجزاء معرفية صغيرة (مفاهيم) ويربطها
              بفيديوهات الشروحات في المنهج. اضغط على أي مفهوم خاطئ لتعرض المنصة الفيديو الذي يشرحه
              تحديداً، فتسدّ الفراغ ثم تعود للسؤال — وفقاً لمنهجية المصفوفة التعليمية.
            </p>
          </div>
        </div>
      </Card>

      {/* Exams list */}
      <div className="flex-col gap-3">
        {EXAMS.map((e) => {
          const ratio = e.totalQuestions ? e.correct / e.totalQuestions : 0;
          const tone = e.status === 'pending' ? 'amber' : ratio >= 0.75 ? 'green' : ratio >= 0.6 ? 'gold' : 'amber';
          return (
            <button
              key={e.id}
              type="button"
              className="exam-row"
              onClick={() => {
                if (e.status === 'pending') return;
                setSelectedId(e.id);
                setView('detail');
              }}
              disabled={e.status === 'pending'}
              style={{ cursor: e.status === 'pending' ? 'not-allowed' : 'pointer' }}
            >
              <div className="exam-row-head">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 4 }}>
                    <span className="font-mono text-xs text-subtle">{e.code}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{e.course}</span>
                    {e.status === 'pending' ? (
                      <Badge color="amber">بانتظار التصحيح</Badge>
                    ) : (
                      <Badge color={tone === 'green' ? 'green' : tone === 'gold' ? 'gold' : 'amber'}>
                        {e.yourScore}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-subtle">
                    {e.semester} • {new Date(e.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div className="exam-row-stats">
                  {e.status === 'graded' && (
                    <>
                      <div className="exam-stat">
                        <span className="exam-stat-label">صحيح</span>
                        <span className="exam-stat-val font-mono" style={{ color: 'var(--success)' }}>{e.correct}</span>
                      </div>
                      <div className="exam-stat">
                        <span className="exam-stat-label">خطأ</span>
                        <span className="exam-stat-val font-mono" style={{ color: 'var(--danger)' }}>{e.totalQuestions - e.correct}</span>
                      </div>
                      <div className="exam-stat">
                        <span className="exam-stat-label">متوسط الفصل</span>
                        <span className="exam-stat-val font-mono">{e.classAvg}%</span>
                      </div>
                    </>
                  )}
                  {e.status === 'graded' && (
                    <Icon icon={ChevronLeft} size={16} className="text-subtle" />
                  )}
                </div>
              </div>
              {e.status === 'graded' && e.topGapConcepts.length > 0 && (
                <div className="exam-gaps">
                  <span className="text-xxs text-subtle" style={{ marginInlineEnd: 6 }}>فراغات أساسية:</span>
                  {e.topGapConcepts.map((c) => (
                    <span key={c} className="gap-chip">{c}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExamDetail({ exam, onBack }: { exam: ExamItem; onBack: () => void }) {
  // Synthetic per-question breakdown — deterministic based on exam id.
  const questions = useMemo(() => {
    const items: Array<{ q: number; section: string; correct: boolean; concept: string }> = [];
    const sections = ['أسئلة معرفية', 'تطبيقات عملية', 'تحليل عميق'];
    const concepts = exam.topGapConcepts.length ? exam.topGapConcepts : ['مفهوم أساسي', 'مفهوم متقدم'];
    for (let i = 0; i < exam.totalQuestions; i++) {
      const correct = i < exam.correct;
      items.push({
        q: i + 1,
        section: sections[i % sections.length]!,
        correct,
        concept: correct ? '—' : concepts[i % concepts.length]!,
      });
    }
    return items;
  }, [exam]);

  const sectionStats = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    for (const q of questions) {
      const cur = map.get(q.section) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (q.correct) cur.correct += 1;
      map.set(q.section, cur);
    }
    return [...map.entries()].map(([name, s]) => ({ name, ...s, pct: Math.round((s.correct / s.total) * 100) }));
  }, [questions]);

  return (
    <div className="page">
      <button type="button" className="btn ghost sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronLeft} size={14} style={{ transform: 'scaleX(-1)' }} />
        الرجوع للقائمة
      </button>

      <div className="page-header">
        <div className="page-title-block">
          <div className="text-xxs font-mono text-subtle">{exam.code}</div>
          <h1 className="page-title">{exam.course}</h1>
          <p className="page-subtitle">
            {exam.semester} · {new Date(exam.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={ClipboardCheck} label="درجتك" value={`${exam.yourScore}%`} color={exam.yourScore >= 75 ? 'green' : exam.yourScore >= 60 ? 'gold' : 'amber'} />
        <MetricCard icon={CheckCircle2} label="صحيح" value={`${exam.correct}/${exam.totalQuestions}`} color="brand" />
        <MetricCard icon={Target} label="متوسط الفصل" value={`${exam.classAvg}%`} color="purple" />
        <MetricCard icon={AlertCircle} label="فراغات أساسية" value={exam.topGapConcepts.length} color="amber" />
      </div>

      {/* Section breakdown */}
      <Card title="الأداء حسب القسم" icon={ListChecks}>
        <div className="flex-col gap-3">
          {sectionStats.map((s) => (
            <div key={s.name}>
              <div className="flex items-center justify-between text-xs" style={{ marginBottom: 4 }}>
                <span style={{ color: 'var(--text)' }}>{s.name}</span>
                <span className="font-mono text-subtle">{s.correct}/{s.total} · {s.pct}%</span>
              </div>
              <ProgressBar
                value={s.pct}
                showValue={false}
                color={s.pct >= 75 ? 'var(--success)' : s.pct >= 60 ? 'var(--accent)' : 'var(--warning)'}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Top gaps + recommendations */}
      {exam.topGapConcepts.length > 0 && (
        <Card title="فراغات معرفية مكتشفة" icon={Target} subtitle="مفاهيم رئيسية ظهرت في الإجابات الخاطئة — مع الفيديوهات المقترحة لسدّها.">
          <div className="flex-col gap-3">
            {exam.topGapConcepts.map((c, i) => (
              <GapItem key={c} title={c} index={i} />
            ))}
          </div>
        </Card>
      )}

      {/* Per-question table */}
      <Card title={`تفاصيل الأسئلة (${exam.totalQuestions})`} icon={Eye}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>القسم</th>
                <th>المفهوم المرتبط</th>
                <th style={{ width: 80, textAlign: 'center' }}>النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.q}>
                  <td className="font-mono text-subtle">{q.q}</td>
                  <td>{q.section}</td>
                  <td className={q.correct ? 'text-subtle' : 'text-muted'}>{q.concept}</td>
                  <td style={{ textAlign: 'center' }}>
                    {q.correct ? (
                      <span style={{ color: 'var(--success)', display: 'inline-flex' }}>
                        <Icon icon={CheckCircle2} size={14} />
                      </span>
                    ) : (
                      <span style={{ color: 'var(--danger)', display: 'inline-flex' }}>
                        <Icon icon={XCircle} size={14} />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GapItem({ title, index }: { title: string; index: number }) {
  // Deterministic recommended lecture (mock) so the workflow demos cleanly.
  const Icons: LucideIcon[] = [BookMarked, Target, ListChecks];
  const iconCmp = Icons[index % Icons.length]!;
  return (
    <div className="gap-row">
      <span className="gap-row-icon">
        <Icon icon={iconCmp} size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</div>
        <div className="text-xxs text-subtle" style={{ marginTop: 2 }}>
          فيديو الشرح المقترح: محاضرة {index + 1} — مدة المشاهدة المقدّرة 12 د
        </div>
      </div>
      <Link to="/student/matrix" className="btn primary sm">
        <Icon icon={Sparkles} size={13} />
        افتح المصفوفة
      </Link>
    </div>
  );
}
