import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { ChartFrame } from '../../components/charts';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useStudentDashboard } from '../../hooks/useResources';
import { useChartThemeKey, chartColors, radialOptions } from '../../lib/chartTheme';
import { ASSIGNMENT_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatNum } from '../../utils/numbers';

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

/* ASSIGNMENT_KIND_LABEL (the assignment-kind Arabic labels) lives in
 * lib/courseMeta.ts — the 13-15 fold of this page's ASSIGNMENT_LABEL
 * and CourseDetailPage's TYPE_LABELS (values byte-identical). */

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
  // Arabic plural rules inside the ≤6-day window: dual, then plural.
  if (days === 2) return `بعد يومين · ${time}`;
  if (days < 7) return `بعد ${days} أيام · ${time}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

function gpaTone(gpa: number): { label: string; color: 'green' | 'amber' | 'red' } {
  if (gpa >= 3.5) return { label: 'ممتاز', color: 'green' };
  if (gpa >= 3.0) return { label: 'جيد جدّاً', color: 'green' };
  if (gpa >= 2.0) return { label: 'جيد', color: 'amber' };
  return { label: 'بحاجة لتحسين', color: 'red' };
}

/**
 * Read a --motion-duration-* token as milliseconds. Returns 0 when the
 * token is missing/unparsable so callers can fall back explicitly.
 */
function motionTokenMs(token: string): number {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw.endsWith('ms')) return 0;
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * CountIn — the in-app data edition of the count-up reveal (the shared
 * components/CountUp is marketing-only by contract). Animates the numeric
 * reveal once on mount with an exponential ease-out at
 * --motion-duration-stat, then settles on the real value; any later
 * value change renders instantly. Reduced motion → the settled value.
 */
function CountIn({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current || reducedMotion || !Number.isFinite(value)) {
      setDisplay(value);
      if (!reducedMotion) settled.current = true;
      return;
    }
    // Mirrors --motion-duration-stat (700ms); 0 only when the token is
    // unreadable, in which case the division below settles on frame one.
    const duration = motionTokenMs('--motion-duration-stat') || 700;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // exponential ease-out
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else settled.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);

  // Fractional values (e.g. 87.5%) keep one decimal, integers none —
  // the settled render matches the raw API value exactly.
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <>
      {display.toLocaleString('ar-LY', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

type AgendaTone = 'accent' | 'gold' | 'red';
type AgendaItem = {
  kind: 'class' | 'assign' | 'live';
  id: string;
  title: ReactNode;
  meta: ReactNode;
  icon: LucideIcon;
  tone: AgendaTone;
};

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const greeting = useGreeting();
  const dash = useStudentDashboard();
  // Remounts every Chart.js canvas when the light/dark theme flips, so
  // canvas colours are re-resolved instead of staying stale.
  const themeKey = useChartThemeKey();

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
  const remainingPct = Math.max(0, 100 - courseProgressPct);
  const cc = chartColors();

  // Compose the agenda from three real sources, sorted by recency.
  // Latin runs (course codes, time ranges) are bdi-wrapped so the bidi
  // algorithm never scrambles them inside the Arabic sentence.
  const agenda: AgendaItem[] = [
    ...d.agenda.classes.slice(0, 4).map<AgendaItem>((c) => ({
      kind: 'class', id: `c-${c.id}`,
      title: `${c.courseName}${c.room ? ` — ${c.room}` : ''}`,
      meta: <>{DAY_LABEL[c.when]} · <bdi>{c.startTime}–{c.endTime}</bdi></>,
      icon: Presentation, tone: c.when === 'today' ? 'accent' : 'gold',
    })),
    ...d.agenda.assignments.slice(0, 3).map<AgendaItem>((a) => ({
      kind: 'assign', id: `a-${a.id}`,
      title: <>{ASSIGNMENT_KIND_LABEL[a.type]}: {a.title} (<bdi>{a.courseCode}</bdi>)</>,
      meta: <>تسليم {formatDue(a.dueAt)}</>,
      icon: ASSIGNMENT_ICON[a.type], tone: 'gold',
    })),
    ...d.agenda.live.slice(0, 2).map<AgendaItem>((l) => ({
      kind: 'live', id: `l-${l.id}`,
      title: <>بثّ مباشر: {l.title}</>,
      meta: <><bdi>{l.offering.course.code}</bdi> · {formatDue(l.scheduledAt)}</>,
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

      {/* At-a-glance KPI row — real values; the count-up reveal rides the
          grid's entrance stagger (polish grid children) as the page moment */}
      <section className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مقررات نشطة"
          value={<CountIn value={d.kpi.courseCount} />}
          change={d.kpi.courseCount > 0 ? 'هذا الفصل' : 'لا توجد تسجيلات'}
          color="brand"
        />
        <MetricCard
          icon={CalendarCheck}
          label="نسبة الحضور"
          value={d.kpi.attendancePct !== null ? <CountIn value={d.kpi.attendancePct} suffix="%" /> : '—'}
          change={d.kpi.attendancePct !== null ? 'إجمالي الفصل' : 'لا توجد سجلات بعد'}
          color={d.kpi.attendancePct === null ? 'brand' : d.kpi.attendancePct >= 80 ? 'green' : d.kpi.attendancePct >= 60 ? 'amber' : 'red'}
        />
        <MetricCard
          icon={ClipboardList}
          label="مهام معلّقة"
          value={<CountIn value={d.kpi.pendingAssignmentsCount} />}
          change={d.agenda.assignments[0] ? `أقربها ${formatDue(d.agenda.assignments[0].dueAt)}` : 'لا مهام قريبة'}
          color={d.kpi.pendingAssignmentsCount === 0 ? 'green' : d.kpi.pendingAssignmentsCount > 3 ? 'red' : 'amber'}
        />
        <MetricCard
          icon={Trophy}
          label="نقاط الإنجاز"
          value={<CountIn value={d.kpi.totalXp} />}
          change={d.kpi.cohortSize > 1 ? <>المركز <bdi>{d.kpi.rank}</bdi> من <bdi>{d.kpi.cohortSize}</bdi> على دفعتك</> : 'مستوى ' + d.profile.level}
          color="purple"
        />
      </section>

      {/* Hero KPIs — GPA + Progress side-by-side, stacks on phone */}
      <section className="dash-hero-row">
        <Card className="dash-gpa-card">
          <div className="dash-gpa-body">
            <div className="dash-gpa-text">
              <div className="dash-eyebrow">المعدل التراكمي</div>
              <div className="dash-gpa-value" data-numeric="true">{formatNum(d.profile.gpa, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
              <ChartFrame
                className="dash-doughnut-frame"
                ariaLabel={`متوسط التقدّم في المقرّرات: ${courseProgressPct}% منجز و${remainingPct}% متبقٍّ`}
                summary={
                  d.kpi.courseCount > 0
                    ? `أنجزت ${courseProgressPct}% من متوسط مقرّراتك المسجَّلة هذا الفصل.`
                    : 'لم تسجّل في أي مقرّر بعد.'
                }
                table={{
                  caption: 'متوسط التقدّم في المقرّرات النشطة',
                  columns: ['الحالة', 'النسبة'],
                  rows: [['منجز', `${courseProgressPct}%`], ['متبقٍّ', `${remainingPct}%`]],
                }}
              >
                <Doughnut
                  key={themeKey}
                  data={{
                    labels: ['منجز', 'متبقي'],
                    datasets: [{
                      data: [courseProgressPct, remainingPct],
                      backgroundColor: [cc.accent, cc.surfaceMuted],
                      borderWidth: 0,
                      spacing: 2,
                    }],
                  }}
                  options={radialOptions({ cutout: '78%', legend: false })}
                />
              </ChartFrame>
              {/* key → the number re-rises whenever a refetch moves the
                  average (the authored data-change transition). No
                  data-numeric here — polish's generic [data-numeric]
                  entrance would override the authored one. */}
              <div className="dash-doughnut-center" key={courseProgressPct}>
                {courseProgressPct}%
              </div>
            </div>
            <div className="dash-progress-text">
              <div className="dash-eyebrow">تقدّم المقرّرات</div>
              <div className="dash-progress-value">
                {d.kpi.courseCount > 0
                  ? `متوسّط تقدّمك في ${countAr(d.kpi.courseCount, ['مقرّر نشط واحد', 'مقرّرين نشطين', 'مقرّرات نشطة', 'مقرّراً نشطاً'])}`
                  : 'لم تسجّل في أي مقرّر بعد'}
              </div>
              <div className="dash-progress-note">
                {courseProgressPct >= 75 ? 'متقدّم كثيراً عن المطلوب' :
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
        <div
          className="dash-term-bar"
          role="progressbar"
          aria-label="تقدّم الفصل الدراسي الحالي"
          aria-valuenow={d.term.progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${d.term.progressPct}%` }} />
        </div>
        <footer className="dash-term-foot">
          <span>بداية الفصل · {new Date(d.term.startsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
          <span>نهاية الفصل · {new Date(d.term.endsAt).toLocaleDateString('ar-LY', { day: '2-digit', month: '2-digit' })}</span>
        </footer>
      </Card>

      {/* Up-coming agenda — composed from real classes/assignments/live.
          Items slide in from inline-start (polish agenda stagger). */}
      <section className="dash-agenda">
        <header className="dash-agenda-head">
          <h2 className="dash-section-title">المهام والفصول القادمة</h2>
        </header>
        {agenda.length === 0 ? (
          <Card>
            <p className="text-muted text-sm" style={{ padding: 'var(--sp-3) 0' }}>
              لا حصص أو مهام قادمة في أجندتك حالياً.
            </p>
          </Card>
        ) : (
          <div className="dash-agenda-list">
            {agenda.map((item) => (
              <Card key={item.id} className="dash-agenda-item">
                {/* data-tone rides the icon well — Card doesn't spread
                    unknown props, so the old root-level data-tone never
                    reached the DOM (silently dead since inception). */}
                <div className="dash-agenda-icon" data-tone={item.tone}>
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
