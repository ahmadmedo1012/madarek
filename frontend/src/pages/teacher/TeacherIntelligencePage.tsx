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
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, BookOpen, Sparkles, ChevronRight,
  Users, ClipboardCheck, BarChart3, Brain, Lightbulb, ArrowUpRight,
  CheckCircle2, AlertCircle, ListVideo, RefreshCw,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import { DetailSkeleton, ErrorState, EmptyState, KpiSkeleton, ListSkeleton, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { CurriculumAuthoringPanel } from '../../components/curriculum';
import { useAuthStore } from '../../stores/auth.store';
import {
  useTeacherOfferings, useTeacherStudents, useOfferingAnalytics,
  useTeacherRisks, useCurriculumSuggest,
  type TeacherOffering, type RiskLevel, type TeacherStudentRow,
} from '../../hooks/useResources';
import '../../styles/owner.css'; // ConfirmDialog surfaces via curriculum authoring (D11 css split, 12-15)
import '../../styles/training.css'; // shared .track-hero/.track-card/.filter-pill/.back-link families (D11 css split, 12-15)

/* Non-text edge for the 1px leading hairline (ruling #4)… */
const RISK_EDGE: Record<RiskLevel, string> = {
  OK: 'var(--success)',
  WATCH: 'var(--gold)',
  AT_RISK: 'var(--warning)',
  CRITICAL: 'var(--danger)',
};
/* …and the text-safe ink for the score column (guardrail #3 — status
 * text always uses -ink tokens, the raw accents can fail AA as text). */
const RISK_INK: Record<RiskLevel, string> = {
  OK: 'var(--success-ink)',
  WATCH: 'var(--gold-ink)',
  AT_RISK: 'var(--warning-ink)',
  CRITICAL: 'var(--danger-ink)',
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
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الذكاء الأكاديمي</h1>
          <p className="page-subtitle">
            متابعة أداء طلابك مدعومة بتحليل لحظي للحضور والدرجات والمتابعة، مع توصيات تدخّل ذكية.
          </p>
        </div>
      </header>

      {/* Global at-risk panel */}
      <Card
        title="طلاب يحتاجون متابعة"
        icon={AlertTriangle}
        subtitle={
          risks.isPending ? 'جارٍ التحميل…'
          : risks.data && risks.data.length > 0 ? `${risks.data.length} طالب موزّعون على مقرّراتك`
          : undefined
        }
        actions={<Badge color="amber"><Icon icon={Brain} size={11} /> AI</Badge>}
      >
        {risks.isPending ? (
          <ListSkeleton rows={3} />
        ) : risks.isError ? (
          <ErrorState
            message="تعذَّر تحميل قائمة المتابعة"
            error={risks.error}
            onRetry={() => risks.refetch()}
          />
        ) : risks.data.length === 0 ? (
          <div className="empty-state">
            <Icon icon={CheckCircle2} size={28} style={{ color: 'var(--success-ink)' }} />
            <p className="text-sm text-muted">جميع طلابك في وضع جيد. لا حاجة لتدخّل عاجل.</p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {risks.data.map((r) => (
              <div
                key={r.studentId + r.offeringId}
                className="risk-row"
                style={{ borderInlineStart: `1px solid ${RISK_EDGE[r.riskLevel]}` }}
              >
                <UserAvatar initials={r.avatarInitials ?? r.name.slice(0, 2)} color={r.avatarColor ?? undefined} size={36} />
                <div className="flex-1">
                  <div className="risk-row-name">{r.name}</div>
                  <div className="risk-row-meta">
                    <span>{r.courseIcon} {r.courseName}</span>
                    {r.signals.map((s) => <Badge key={s} color="amber">{s}</Badge>)}
                  </div>
                  <div className="risk-row-suggestion">
                    <Icon icon={Lightbulb} size={11} style={{ color: 'var(--gold-ink)' }} /> {r.suggestion}
                  </div>
                </div>
                <div className="risk-row-score" style={{ color: RISK_INK[r.riskLevel] }}>
                  <div className="risk-row-pct">{r.riskScore}%</div>
                  <div className="risk-row-label">{RISK_LABEL[r.riskLevel]}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* My offerings */}
      <Card
        title="مقرّراتي"
        icon={BookOpen}
        subtitle={
          offerings.isPending ? 'جارٍ التحميل…'
          : offerings.data && offerings.data.length > 0 ? `${offerings.data.length} مقرر هذا الفصل`
          : undefined
        }
      >
        {offerings.isPending ? (
          <TrackGridSkeleton />
        ) : offerings.isError ? (
          <ErrorState
            message="تعذَّر تحميل مقرّراتك"
            error={offerings.error}
            onRetry={() => offerings.refetch()}
          />
        ) : offerings.data.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="لم تُسند إليك مقرّرات بعد"
            description="ستظهر مقرّراتك هنا فور إسنادها من قِبَل إدارة الشؤون الأكاديمية."
          />
        ) : (
          <div className="track-grid">
            {offerings.data.map((o) => (
              <OfferingCard key={o.id} offering={o} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Shape-matched skeleton for the track-grid catalog (thumb-card anatomy). */
function TrackGridSkeleton() {
  return (
    <div className="track-grid" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="track-card" aria-hidden>
          <Skeleton width={48} height={48} rounded="var(--r-lg)" />
          <div className="track-card-body">
            <Skeleton width="45%" height={10} />
            <Skeleton width="85%" height={16} />
            <Skeleton width="60%" height={10} />
          </div>
        </div>
      ))}
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
      {/* the icon well tint is painted by the .track-card-icon rule from
          --track-accent (training.css owns the family) */}
      <div className="track-card-icon">
        <EmojiIcon emoji={offering.course.iconEmoji ?? '📚'} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat"><bdi>{offering.course.code}</bdi> · {offering.term}</div>
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
  const [tab, setTab] = useState<'students' | 'curriculum' | 'authoring'>('students');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');

  // Hook-order stability: every hook runs before the pending/error early
  // returns below (the LabsPage crash pattern — never conditionally skip).
  const riskCounts = useMemo(() => {
    const rows = students.data ?? [];
    return {
      all: rows.length,
      OK: rows.filter((s) => s.riskLevel === 'OK').length,
      WATCH: rows.filter((s) => s.riskLevel === 'WATCH').length,
      AT_RISK: rows.filter((s) => s.riskLevel === 'AT_RISK').length,
      CRITICAL: rows.filter((s) => s.riskLevel === 'CRITICAL').length,
    } as Record<RiskLevel | 'all', number>;
  }, [students.data]);

  // Curriculum authoring is a TEACHER/ADMIN/OWNER capability (the routes
  // under /teacher already exclude students; the API still 403s non-owners
  // — this gate only hides the affordance, e.g. for QUALITY viewers).
  const role = useAuthStore((s) => s.user?.role);
  const canAuthor = role === 'TEACHER' || role === 'ADMIN' || role === 'OWNER';

  // Honest tri-state (audit 0-e P0-5): pending → skeleton, error → retry,
  // resolved-but-unknown id → a real 404 state — never an infinite skeleton.
  if (offerings.isPending) return <DetailSkeleton />;
  if (offerings.isError) {
    return (
      <div className="page">
        <Link to="/teacher/intelligence" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل مقرّراتي
        </Link>
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الذكاء الأكاديمي</h1>
          </div>
        </header>
        <ErrorState
          message="تعذَّر تحميل بيانات المقرر"
          error={offerings.error}
          onRetry={() => offerings.refetch()}
        />
      </div>
    );
  }
  if (!offering) {
    return (
      <div className="page">
        <Link to="/teacher/intelligence" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل مقرّراتي
        </Link>
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الذكاء الأكاديمي</h1>
          </div>
        </header>
        <EmptyState
          icon={BookOpen}
          title="المقرر غير موجود"
          description="ربما حُذف هذا العرض أو أن الرابط غير صحيح."
        />
      </div>
    );
  }
  const accent = offering.course.themeColor ?? 'var(--accent)';
  // Theme-adaptive accent ink for text/icons (wave 3-b pattern — raw accent
  // hexes can fail contrast on the card ground in either theme).
  const accentInk = `color-mix(in srgb, ${accent} 70%, var(--text))`;

  const onSuggest = () => suggest.mutate(offeringId!);

  return (
    <div className="page">
      <Link to="/teacher/intelligence" className="back-link">
        <Icon icon={ChevronRight} size={14} />
        كل مقرّراتي
      </Link>

      {/* Tinted band painted by .track-hero from --track-accent (training.css
          owns the family) — no inline gradient/stripe (audit 0-e P1-15/16). */}
      <div className="track-hero" style={{ ['--track-accent' as never]: accent }}>
        <div className="track-hero-icon">
          <EmojiIcon emoji={offering.course.iconEmoji ?? '📚'} size={28} />
        </div>
        <div className="track-hero-main">
          <div className="track-hero-cat"><bdi>{offering.course.code}</bdi> · {offering.term}</div>
          <h1 className="track-hero-title">{offering.course.name}</h1>
          <div className="track-hero-meta">
            <Badge><Icon icon={Users} size={11} /> {offering._count.enrollments} طالب</Badge>
            <Badge>{offering.course.credits} وحدة</Badge>
            {offering.room && <Badge>قاعة {offering.room}</Badge>}
          </div>
        </div>
      </div>

      {analytics.isPending && <KpiSkeleton />}
      {analytics.isError && (
        <div className="inline-retry" role="alert">
          <span className="text-sm text-muted">تعذَّر تحميل مؤشرات المقرر.</span>
          <button type="button" className="btn ghost sm" onClick={() => analytics.refetch()}>
            <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
          </button>
        </div>
      )}
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
        {canAuthor && (
          <button type="button" className={`tab${tab === 'authoring' ? ' on' : ''}`} onClick={() => setTab('authoring')}>
            <Icon icon={ListVideo} size={13} /> إدارة المنهج
          </button>
        )}
      </div>

      {tab === 'students' && (
        <Card title="قائمة الطلاب — تحليل لحظي" icon={Users}>
          {students.isPending ? (
            <ListSkeleton rows={4} />
          ) : students.isError ? (
            <ErrorState
              message="تعذَّر تحميل قائمة الطلاب"
              error={students.error}
              onRetry={() => students.refetch()}
            />
          ) : students.data.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا يوجد طلاب مسجَّلون"
              description="ستظهر قائمة الطلاب هنا فور تسجيلهم في المقرر."
            />
          ) : (
            <>
              {/* Risk-level filter — the page's authored moment: on a filter
                  change non-matching rows fade between shades (is-dim) while
                  matching rows keep their color, mirroring the matrix. */}
              <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="تصفية بمستوى المخاطر">
                {([
                  { v: 'all' as const, label: 'الكل' },
                  { v: 'OK' as const, label: RISK_LABEL.OK },
                  { v: 'WATCH' as const, label: RISK_LABEL.WATCH },
                  { v: 'AT_RISK' as const, label: RISK_LABEL.AT_RISK },
                  { v: 'CRITICAL' as const, label: RISK_LABEL.CRITICAL },
                ]).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={`filter-pill${riskFilter === o.v ? ' on' : ''}`}
                    aria-pressed={riskFilter === o.v}
                    onClick={() => setRiskFilter(o.v)}
                  >
                    {o.label}
                    <span className="filter-pill-count">{riskCounts[o.v]}</span>
                  </button>
                ))}
              </div>
              <div className="flex-col gap-2">
                {students.data.map((s) => (
                  <StudentRow
                    key={s.studentId}
                    student={s}
                    dimmed={riskFilter !== 'all' && s.riskLevel !== riskFilter}
                  />
                ))}
              </div>
            </>
          )}
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
            >
              {suggest.isPending ? 'جارٍ التحليل…' : suggest.data ? 'إعادة التوليد' : 'توليد هيكل المنهج'}
              <Icon icon={Sparkles} size={13} />
            </button>
          }
        >
          {suggest.isError && (
            <div className="inline-retry" role="alert" style={{ marginBlockEnd: 'var(--sp-3)' }}>
              <span className="text-sm text-muted">تعذَّر توليد هيكل المنهج.</span>
              <button type="button" className="btn ghost sm" onClick={onSuggest}>
                <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
              </button>
            </div>
          )}
          {!suggest.data && !suggest.isPending && (
            <div className="empty-state">
              <Icon icon={Lightbulb} size={28} style={{ color: 'var(--gold-ink)' }} />
              <p className="text-sm text-muted">
                اضغط الزر أعلاه ليقوم النظام باقتراح هيكل منهج كامل بناءً على اسم المقرر، القسم،
                والمحاضرات الموجودة بالفعل.
              </p>
            </div>
          )}
          {suggest.data && (
            <>
              <div className="ai-rationale" style={{ ['--track-accent' as never]: accent }}>
                <div className="text-xs text-muted">{suggest.data.rationale}</div>
                <div className="flex gap-2 flex-wrap" style={{ marginBlockStart: 'var(--sp-2)' }}>
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
                    <div className="curriculum-chapter-head" style={{ color: accentInk }}>
                      <span>{ch.title}</span>
                      <Badge>{ch.estLectures} محاضرة</Badge>
                    </div>
                    <ul className="curriculum-topics">
                      {ch.topics.map((t) => (
                        <li key={t}><Icon icon={ArrowUpRight} size={11} style={{ color: accentInk }} /> {t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="ai-next-steps">
                <div className="text-xs text-subtle" style={{ marginBlockEnd: 'var(--sp-2)' }}>الخطوات التالية</div>
                <ol className="ai-steps-list">
                  {suggest.data.nextSteps.map((s) => (
                    <li key={s} className="text-sm">{s}</li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </Card>
      )}
      {tab === 'authoring' && canAuthor && offeringId && (
        <CurriculumAuthoringPanel offeringId={offeringId} accent={accent} />
      )}
    </div>
  );
}

function StudentRow({ student, dimmed }: { student: TeacherStudentRow; dimmed: boolean }) {
  return (
    <div
      className={`risk-row${dimmed ? ' is-dim' : ''}`}
      style={{ borderInlineStart: `1px solid ${RISK_EDGE[student.riskLevel]}` }}
    >
      <UserAvatar initials={student.avatarInitials ?? student.name.slice(0, 2)} color={student.avatarColor ?? undefined} size={40} />
      <div className="flex-1">
        <div className="risk-row-name">{student.name}</div>
        <div className="risk-row-meta">
          <bdi className="font-mono text-xxs">{student.universityId}</bdi>
          <span><Icon icon={ClipboardCheck} size={11} /> حضور {student.attendancePct}%</span>
          <span><Icon icon={BarChart3} size={11} /> درجة {student.avgGrade}%</span>
          <span><Icon icon={BookOpen} size={11} /> متابعة {student.watchPct}%</span>
        </div>
        {student.signals.length > 0 && (
          <div className="risk-row-meta" style={{ marginBlockStart: 4 }}>
            {student.signals.map((s) => <Badge key={s} color="amber"><Icon icon={AlertCircle} size={11} /> {s}</Badge>)}
          </div>
        )}
        <div className="risk-row-suggestion">
          <Icon icon={Lightbulb} size={11} style={{ color: 'var(--gold-ink)' }} /> {student.suggestion}
        </div>
      </div>
      <div className="risk-row-score" style={{ color: RISK_INK[student.riskLevel] }}>
        <div className="risk-row-pct">{student.riskScore}%</div>
        <div className="risk-row-label">{RISK_LABEL[student.riskLevel]}</div>
      </div>
    </div>
  );
}

// Re-export
export { TeacherOfferingDetailPage as TeacherIntelligenceDetail };
