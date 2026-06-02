/**
 * Teacher Academic Intelligence — replaces the hardcoded teacher pages
 * with real DB-backed data + risk scoring + curriculum AI suggestions.
 *
 *  /teacher/intelligence  →  list of my offerings with KPI summary
 *                            + global risk panel across all offerings
 *  /teacher/intelligence/:offeringId   →   per-course deep dive
 *                            (roster · risk per student · curriculum AI)
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  GraduationCap, AlertTriangle, BookOpen, Sparkles, ChevronLeft,
  Users, ClipboardCheck, BarChart3, Brain, Lightbulb, ArrowUpRight,
  CheckCircle2, AlertCircle, type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard, ProgressBar, UserAvatar } from '../../components/primitives';
import { DetailSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useTeacherOfferings, useTeacherStudents, useOfferingAnalytics,
  useTeacherRisks, useCurriculumSuggest,
  type TeacherOffering, type RiskLevel, type TeacherStudentRow,
} from '../../hooks/useResources';

const RISK_COLOR: Record<RiskLevel, string> = {
  OK: 'var(--success)',
  WATCH: 'var(--gold)',
  AT_RISK: 'var(--warning)',
  CRITICAL: 'var(--danger)',
};
const RISK_LABEL: Record<RiskLevel, string> = {
  OK: 'مستقر',
  WATCH: 'تحت المراقبة',
  AT_RISK: 'في خطر',
  CRITICAL: 'حرج',
};

/* ═══════════════ Catalog (my offerings + global risks) ═══════════════ */
export default function TeacherIntelligencePage() {
  const offerings = useTeacherOfferings();
  const risks = useTeacherRisks();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الذكاء الأكاديمي</h1>
          <p className="page-subtitle">
            متابعة أداء طلابك مدعومة بتحليل لحظي للحضور والدرجات والمتابعة، مع توصيات تدخّل ذكية.
          </p>
        </div>
      </div>

      {/* Global at-risk panel */}
      <Card
        title="طلاب يحتاجون متابعة"
        icon={AlertTriangle}
        subtitle={risks.data?.length ? `${risks.data.length} طالب موزّعون على مقرّراتك` : undefined}
        actions={<Badge color="amber"><Icon icon={Brain} size={11} /> AI</Badge>}
      >
        {risks.data && risks.data.length === 0 && (
          <div className="empty-state">
            <Icon icon={CheckCircle2} size={28} style={{ color: 'var(--success)' }} />
            <p className="text-sm text-muted">جميع طلابك في وضع جيد. لا حاجة لتدخل عاجل.</p>
          </div>
        )}
        {risks.data && risks.data.length > 0 && (
          <div className="flex-col gap-2">
            {risks.data.map((r) => (
              <div key={r.studentId + r.offeringId} className="risk-row" style={{ borderRight: `3px solid ${RISK_COLOR[r.riskLevel]}` }}>
                <UserAvatar initials={r.avatarInitials ?? r.name.slice(0, 2)} color={r.avatarColor ?? undefined} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="risk-row-name">{r.name}</div>
                  <div className="risk-row-meta">
                    <span>{r.courseIcon} {r.courseName}</span>
                    {r.signals.map((s) => <Badge key={s} color="amber">{s}</Badge>)}
                  </div>
                  <div className="risk-row-suggestion">
                    <Icon icon={Lightbulb} size={11} style={{ color: 'var(--gold)' }} /> {r.suggestion}
                  </div>
                </div>
                <div className="risk-row-score" style={{ color: RISK_COLOR[r.riskLevel] }}>
                  <div className="risk-row-pct">{r.riskScore}%</div>
                  <div className="risk-row-label">{RISK_LABEL[r.riskLevel]}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My offerings */}
      <Card title="مقرّراتي" icon={BookOpen} subtitle={`${offerings.data?.length ?? 0} مقرر هذا الفصل`}>
        <div className="track-grid">
          {offerings.data?.map((o) => (
            <OfferingCard key={o.id} offering={o} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function OfferingCard({ offering }: { offering: TeacherOffering }) {
  const accent = offering.course.themeColor ?? 'var(--accent)';
  return (
    <Link
      to={`/teacher/intelligence/${offering.id}`}
      className="track-card"
      style={{ ['--track-accent' as never]: accent }}
    >
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={offering.course.iconEmoji ?? '📚'} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{offering.course.code} · {offering.term}</div>
        <div className="track-card-title">{offering.course.name}</div>
        <div className="track-card-meta">
          <span><Icon icon={Users} size={12} /> {offering._count.enrollments} طالب</span>
          <span><Icon icon={BookOpen} size={12} /> {offering._count.lectures} محاضرة</span>
          <span><Icon icon={ClipboardCheck} size={12} /> {offering._count.assignments} واجب</span>
          {offering._count.examTemplates > 0 && (
            <span><Icon icon={Sparkles} size={12} /> {offering._count.examTemplates} اختبار</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════ Per-offering deep dive ═══════════════ */
export function TeacherOfferingDetailPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const offerings = useTeacherOfferings();
  const offering = offerings.data?.find((o) => o.id === offeringId);
  const students = useTeacherStudents(offeringId);
  const analytics = useOfferingAnalytics(offeringId);
  const suggest = useCurriculumSuggest();
  const [tab, setTab] = useState<'students' | 'curriculum'>('students');

  if (!offering) return <DetailSkeleton />;
  const accent = offering.course.themeColor ?? 'var(--accent)';

  const onSuggest = () => suggest.mutate(offeringId!);

  return (
    <div className="page">
      <Link to="/teacher/intelligence" className="back-link">
        <Icon icon={ChevronLeft} size={14} />
        كل مقرّراتي
      </Link>

      <div className="track-hero" style={{ background: `linear-gradient(135deg, ${accent}26 0%, transparent 70%)`, borderRight: `3px solid ${accent}` }}>
        <div className="track-hero-icon" style={{ background: accent, color: '#fff' }}>
          <EmojiIcon emoji={offering.course.iconEmoji ?? '📚'} size={28} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="track-hero-cat">{offering.course.code} · {offering.term}</div>
          <h1 className="track-hero-title">{offering.course.name}</h1>
          <div className="track-hero-meta">
            <Badge><Icon icon={Users} size={11} /> {offering._count.enrollments} طالب</Badge>
            <Badge>{offering.course.credits} وحدة</Badge>
            {offering.room && <Badge>قاعة {offering.room}</Badge>}
          </div>
        </div>
      </div>

      {analytics.data && (
        <div className="grid-4">
          <MetricCard icon={Users} label="مسجَّلون" value={analytics.data.enrolled.toString()} color="brand" />
          <MetricCard icon={ClipboardCheck} label="الحضور العام" value={`${analytics.data.overallAttendance}%`} color={analytics.data.overallAttendance >= 75 ? 'green' : 'amber'} />
          <MetricCard icon={BarChart3} label="متوسط الدرجات" value={`${analytics.data.avgGrade}%`} color={analytics.data.avgGrade >= 65 ? 'green' : 'amber'} />
          <MetricCard icon={CheckCircle2} label="نسبة النجاح" value={`${analytics.data.passRate}%`} color="purple" />
        </div>
      )}

      <div className="tabs">
        <button type="button" className={`tab${tab === 'students' ? ' on' : ''}`} onClick={() => setTab('students')}>
          <Icon icon={Users} size={13} /> الطلاب وتقييم المخاطر
        </button>
        <button type="button" className={`tab${tab === 'curriculum' ? ' on' : ''}`} onClick={() => setTab('curriculum')}>
          <Icon icon={Brain} size={13} /> مساعد المنهج
        </button>
      </div>

      {tab === 'students' && (
        <Card title="قائمة الطلاب — تحليل لحظي" icon={Users}>
          {students.data && students.data.length === 0 && (
            <div className="empty-state"><Icon icon={Users} size={28} className="text-subtle" /><p className="text-sm text-muted">لا يوجد طلاب مسجَّلون.</p></div>
          )}
          <div className="flex-col gap-2">
            {students.data?.map((s) => <StudentRow key={s.studentId} student={s} />)}
          </div>
        </Card>
      )}

      {tab === 'curriculum' && (
        <Card
          title="مساعد المنهج بالذكاء الاصطناعي"
          icon={Brain}
          actions={
            <button
              type="button"
              className="btn primary sm"
              onClick={onSuggest}
              disabled={suggest.isPending}
              style={{ background: accent }}
            >
              {suggest.isPending ? 'جارٍ التحليل…' : suggest.data ? 'إعادة التوليد' : 'توليد هيكل المنهج'}
              <Icon icon={Sparkles} size={13} />
            </button>
          }
        >
          {!suggest.data && (
            <div className="empty-state">
              <Icon icon={Lightbulb} size={28} style={{ color: 'var(--gold)' }} />
              <p className="text-sm text-muted">
                اضغط الزر أعلاه ليقوم النظام باقتراح هيكل منهج كامل بناءً على اسم المقرر، القسم،
                والمحاضرات الموجودة بالفعل.
              </p>
            </div>
          )}
          {suggest.data && (
            <>
              <div style={{
                padding: 'var(--sp-3)', background: `color-mix(in srgb, ${accent} 8%, transparent)`,
                borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-3)',
                border: `1px solid color-mix(in srgb, ${accent} 22%, transparent)`,
              }}>
                <div className="text-xs text-muted">{suggest.data.rationale}</div>
                <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                  <Badge>{suggest.data.outline.length} فصول</Badge>
                  <Badge color="brand">{suggest.data.suggestedTotalLectures} محاضرة مقترحة</Badge>
                  {suggest.data.currentLectureCount > 0 && (
                    <Badge color="green">{suggest.data.currentLectureCount} محاضرة موجودة</Badge>
                  )}
                </div>
              </div>
              <div className="flex-col gap-3">
                {suggest.data.outline.map((ch, i) => (
                  <div key={i} className="curriculum-chapter">
                    <div className="curriculum-chapter-head" style={{ color: accent }}>
                      <span>{ch.title}</span>
                      <Badge>{ch.estLectures} محاضرة</Badge>
                    </div>
                    <ul className="curriculum-topics">
                      {ch.topics.map((t) => (
                        <li key={t}><Icon icon={ArrowUpRight} size={11} style={{ color: accent }} /> {t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}>
                <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-2)' }}>الخطوات التالية</div>
                <ol style={{ margin: 0, paddingInlineStart: 'var(--sp-4)' }}>
                  {suggest.data.nextSteps.map((s) => (
                    <li key={s} className="text-sm" style={{ marginBottom: 4 }}>{s}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function StudentRow({ student }: { student: TeacherStudentRow }) {
  return (
    <div className="risk-row" style={{ borderRight: `3px solid ${RISK_COLOR[student.riskLevel]}` }}>
      <UserAvatar initials={student.avatarInitials ?? student.name.slice(0, 2)} color={student.avatarColor ?? undefined} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="risk-row-name">{student.name}</div>
        <div className="risk-row-meta">
          <span className="font-mono text-xxs">{student.universityId}</span>
          <span><Icon icon={ClipboardCheck} size={11} /> حضور {student.attendancePct}%</span>
          <span><Icon icon={BarChart3} size={11} /> درجة {student.avgGrade}%</span>
          <span><Icon icon={BookOpen} size={11} /> متابعة {student.watchPct}%</span>
        </div>
        {student.signals.length > 0 && (
          <div className="risk-row-meta" style={{ marginTop: 4 }}>
            {student.signals.map((s) => <Badge key={s} color="amber"><Icon icon={AlertCircle} size={11} /> {s}</Badge>)}
          </div>
        )}
        <div className="risk-row-suggestion">
          <Icon icon={Lightbulb} size={11} style={{ color: 'var(--gold)' }} /> {student.suggestion}
        </div>
      </div>
      <div className="risk-row-score" style={{ color: RISK_COLOR[student.riskLevel] }}>
        <div className="risk-row-pct">{student.riskScore}%</div>
        <div className="risk-row-label">{RISK_LABEL[student.riskLevel]}</div>
      </div>
    </div>
  );
}

// Re-export
export { TeacherOfferingDetailPage as TeacherIntelligenceDetail };
