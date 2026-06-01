import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
} from 'chart.js';
import {
  GraduationCap, Presentation, FileText, FlaskConical,
  BookOpen, CalendarCheck, ClipboardList, Trophy, Radio,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { ErrorState, KpiSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useStudentDashboard } from '../../hooks/useResources';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Greeting that adapts to the local hour. Calm, conversational.
 */
function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'سهرة سعيدة';
  if (h < 12) return 'صباح الخير';
  if (h < 18) return 'مساء النور';
  return 'مساء الخير';
}

const ASSIGNMENT_ICON: Record<'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM', LucideIcon> = {
  HOMEWORK: ClipboardList,
  QUIZ: FileText,
  PROJECT: FlaskConical,
  EXAM: FileText,
};

const ASSIGNMENT_LABEL: Record<'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM', string> = {
  HOMEWORK: 'واجب',
  QUIZ: 'اختبار قصير',
  PROJECT: 'مشروع',
  EXAM: 'امتحان',
};

const DAY_LABEL: Record<'today' | 'tomorrow', string> = {
  today: 'اليوم',
  tomorrow: 'غداً',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  const time = d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
  if (days <= 0) return `اليوم · ${time}`;
  if (days === 1) return `غداً · ${time}`;
  if (days < 7) return `بعد ${days} أيّام · ${time}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

function gpaTone(gpa: number): { label: string; color: 'green' | 'amber' | 'red' } {
  if (gpa >= 3.5) return { label: 'ممتاز', color: 'green' };
  if (gpa >= 3.0) return { label: 'جيد جدّاً', color: 'green' };
  if (gpa >= 2.0) return { label: 'جيد', color: 'amber' };
  return { label: 'بحاجة لتحسين', color: 'red' };
}

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();
  const dash = useStudentDashboard();

  if (dash.isPending) {
    return (
      <div className="page student-dashboard" aria-busy="true" aria-live="polite">
        <header className="page-header welcome-card">
          <h1 className="page-title">{greeting}، {user?.firstName ?? '…'}</h1>
          <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
        </header>
        <KpiSkeleton />
        <CardSkeleton lines={4} />
        <CardSkeleton lines={3} withTitle={false} />
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page student-dashboard">
        <header className="page-header welcome-card">
          <h1 className="page-title">{greeting}، {user?.firstName ?? '…'}</h1>
        </header>
        <ErrorState
          message="تعذَّر تحميل لوحة التحكّم"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </div>
    );
  }

  const d = dash.data;

  // ADMIN/OWNER preview path — no studentProfile of their own. Render an
  // honest "preview" surface instead of crashing on d.profile.gpa.
  if (d.preview || !d.profile) {
    return (
      <div className="page student-dashboard">
        <header className="page-header welcome-card">
          <h1 className="page-title">{greeting}، {user?.firstName ?? ''}</h1>
          <p className="page-subtitle">
            معاينة لوحة الطالب — يحتاج هذا العرض إلى ملف طالب فعليّ.
          </p>
        </header>
        <Card>
          <div className="empty-state">
            <p className="text-sm text-muted">
              لوحة التحكّم هذه مخصّصة للطلّاب. أنت مسجَّل دخول كحساب{' '}
              {user?.role === 'OWNER' ? 'مالك المنصّة' : 'إداريّ'}، لذلك تظهر
              لك صفحة معاينة فارغة. للاطّلاع على لوحة طالب حقيقيّة، استخدم
              حساب طالب مسجَّل أو زر صفحة كلّيّة من قائمة الكلّيّات.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const tone = gpaTone(d.profile.gpa);
  const courseProgressPct = d.progress.avgEnrollmentProgressPct;

  // Compose the agenda from three real sources, sorted by recency.
  type AgendaItem =
    | { kind: 'class'; id: string; title: string; meta: string; icon: LucideIcon; tone: 'accent' | 'gold' | 'red' }
    | { kind: 'assign'; id: string; title: string; meta: string; icon: LucideIcon; tone: 'gold' }
    | { kind: 'live'; id: string; title: string; meta: string; icon: LucideIcon; tone: 'red' };
  const agenda: AgendaItem[] = [
    ...d.agenda.classes.slice(0, 4).map<AgendaItem>((c) => ({
      kind: 'class', id: `c-${c.id}`,
      title: `${c.courseName}${c.room ? ` — ${c.room}` : ''}`,
      meta: `${DAY_LABEL[c.when]} · ${c.startTime}–${c.endTime}`,
      icon: Presentation, tone: c.when === 'today' ? 'accent' : 'gold',
    })),
    ...d.agenda.assignments.slice(0, 3).map<AgendaItem>((a) => ({
      kind: 'assign', id: `a-${a.id}`,
      title: `${ASSIGNMENT_LABEL[a.type]}: ${a.title} (${a.courseCode})`,
      meta: `تسليم ${formatDue(a.dueAt)}`,
      icon: ASSIGNMENT_ICON[a.type], tone: 'gold',
    })),
    ...d.agenda.live.slice(0, 2).map<AgendaItem>((l) => ({
      kind: 'live', id: `l-${l.id}`,
      title: `بثّ مباشر: ${l.title}`,
      meta: `${l.offering.course.code} · ${formatDue(l.scheduledAt)}`,
      icon: Radio, tone: 'red',
    })),
  ];

  return (
    <div className="page student-dashboard">
      <header className="page-header welcome-card">
        <h1 className="page-title">
          {greeting}، {user?.firstName ?? ''}
        </h1>
        <p className="page-subtitle">
          {d.profile.facultyName
            ? `${d.profile.facultyName}${d.profile.departmentName ? ` · ${d.profile.departmentName}` : ''} · السنة ${d.profile.year}`
            : 'لوحة متابعة تقدّمك الأكاديمي.'}
        </p>
      </header>

      {/* At-a-glance KPI row — all real values from the API */}
      <section className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مقررات نشطة"
          value={d.kpi.courseCount.toLocaleString('ar-LY')}
          change={d.kpi.courseCount > 0 ? 'هذا الفصل' : 'لا توجد تسجيلات'}
          color="brand"
        />
        <MetricCard
          icon={CalendarCheck}
          label="نسبة الحضور"
          value={d.kpi.attendancePct !== null ? `${d.kpi.attendancePct}%` : '—'}
          change={d.kpi.attendancePct !== null ? 'إجمالي الفصل' : 'لا توجد سجلات بعد'}
          color={d.kpi.attendancePct === null ? 'brand' : d.kpi.attendancePct >= 80 ? 'green' : d.kpi.attendancePct >= 60 ? 'amber' : 'red'}
        />
        <MetricCard
          icon={ClipboardList}
          label="مهام معلّقة"
          value={d.kpi.pendingAssignmentsCount.toLocaleString('ar-LY')}
          change={d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة'}
          color={d.kpi.pendingAssignmentsCount === 0 ? 'green' : d.kpi.pendingAssignmentsCount > 3 ? 'red' : 'amber'}
        />
        <MetricCard
          icon={Trophy}
          label="نقاط الإنجاز"
          value={d.kpi.totalXp.toLocaleString('ar-LY')}
          change={d.kpi.cohortSize > 1 ? `المركز ${d.kpi.rank} من ${d.kpi.cohortSize} على دفعتك` : 'مستوى ' + d.profile.level}
          color="purple"
        />
      </section>

      {/* Hero KPIs — GPA + Progress side-by-side, stacks on phone */}
      <section className="dash-hero-row">
        <Card className="dash-gpa-card">
          <div className="dash-gpa-body">
            <div className="dash-gpa-text">
              <div className="dash-eyebrow">المعدل التراكمي</div>
              <div className="dash-gpa-value" data-numeric="true">{d.profile.gpa.toFixed(2)}</div>
              <Badge color={tone.color}>{tone.label}</Badge>
            </div>
            <div className="dash-gpa-orb">
              <Icon icon={GraduationCap} size={26} />
            </div>
          </div>
        </Card>

        <Card className="dash-progress-card">
          <div className="dash-progress-body">
            <div className="dash-doughnut">
              <Doughnut
                data={{
                  labels: ['منجز', 'متبقي'],
                  datasets: [{
                    data: [courseProgressPct, Math.max(0, 100 - courseProgressPct)],
                    backgroundColor: [
                      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8E6516',
                      getComputedStyle(document.documentElement).getPropertyValue('--surface-3').trim() || '#F2EDE3',
                    ],
                    borderWidth: 0,
                    spacing: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  cutout: '78%',
                  plugins: { legend: { display: false }, tooltip: { enabled: false } },
                  animation: { duration: 800, easing: 'easeOutQuart' },
                }}
              />
              <div className="dash-doughnut-center" data-numeric="true">{courseProgressPct}%</div>
            </div>
            <div className="dash-progress-text">
              <div className="dash-eyebrow">تقدّم المقرّرات</div>
              <div className="dash-progress-value">
                {d.kpi.courseCount > 0
                  ? `متوسّط تقدّمك في ${d.kpi.courseCount.toLocaleString('ar-LY')} مقرّر نشط`
                  : 'لم تسجّل في أي مقرّر بعد'}
              </div>
              <div className="dash-progress-note">
                {courseProgressPct >= 75 ? 'متقدّم جدّاً ممّا هو مطلوب' :
                  courseProgressPct >= 50 ? 'على الطريق الصحيح' :
                  d.kpi.courseCount > 0 ? 'تحتاج إلى دفعة إضافيّة' : '—'}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Term progress bar — based on real calendar dates */}
      <Card className="dash-term-card">
        <header className="dash-term-head">
          <span className="dash-eyebrow">تقدّم الفصل الدراسي الحالي</span>
          <span className="dash-term-pct" data-numeric="true">{d.term.progressPct}%</span>
        </header>
        <div className="dash-term-bar" role="progressbar" aria-valuenow={d.term.progressPct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${d.term.progressPct}%` }} />
        </div>
        <footer className="dash-term-foot">
          <span>بداية الفصل · {new Date(d.term.startsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
          <span>نهاية الفصل · {new Date(d.term.endsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
        </footer>
      </Card>

      {/* Up-coming agenda — composed from real classes/assignments/live */}
      <section className="dash-agenda">
        <header className="dash-agenda-head">
          <h2 className="dash-section-title">المهام والفصول القادمة</h2>
        </header>
        {agenda.length === 0 ? (
          <Card>
            <p className="text-muted text-sm" style={{ padding: 'var(--sp-3) 0' }}>
              لا توجد مهام أو حصص قادمة في الأسبوع المقبل.
            </p>
          </Card>
        ) : (
          <div className="dash-agenda-list">
            {agenda.map((item) => (
              <Card key={item.id} className="dash-agenda-item" data-tone={item.tone}>
                <div className="dash-agenda-icon">
                  <Icon icon={item.icon} size={22} />
                </div>
                <div className="dash-agenda-text">
                  <div className="dash-agenda-title">{item.title}</div>
                  <div className="dash-agenda-meta">{item.meta}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
