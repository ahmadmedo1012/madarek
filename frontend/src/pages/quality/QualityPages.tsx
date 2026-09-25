import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import {
  ShieldCheck, Users, BookOpen, GraduationCap, Activity,
  AlertTriangle, TrendingUp, FileText, ClipboardCheck, ListChecks,
  Building2, School, Star, Clock, ArrowLeft,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow, ProgressBar } from '../../components/primitives';
import { ChartFrame } from '../../components/charts';
import { cartesianOptions, radialOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ChartSkeleton, ListSkeleton, TableSkeleton, Skeleton, CardSkeleton } from '../../components/primitives/States';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { formatRelativeArShort, WEEKDAY_NAMES_AR, countAr } from '../../lib/format';
import '../../styles/training.css'; // .filter-pill family (D11 css split, 12-15)

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);

/* ════════════════════════════════════════════════════════════════
   API hooks
   ════════════════════════════════════════════════════════════════ */
interface QualityOverview {
  users: Partial<Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY', number>>;
  courses: number;
  offerings: number;
  lectures: number;
  attendance: Partial<Record<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED', number>>;
  papers: Partial<Record<'UPLOADED' | 'SCANNING' | 'CHECKS_PASSED' | 'CHECKS_FAILED' | 'GRADED' | 'PUBLISHED', number>>;
}

const useOverview = () => useQuery({
  queryKey: ['quality', 'overview'],
  queryFn: () => unwrap<QualityOverview>(api.get('/quality/overview')),
});

interface QualityCourse {
  id: string;
  term: string;
  course: { id: string; name: string; code: string; themeColor?: string | null };
  teacher: { id: string; firstName: string; lastName: string };
  _count: { enrollments: number; lectures: number; materials: number; assignments: number };
}
const useQualityCourses = () => useQuery({
  queryKey: ['quality', 'courses'],
  queryFn: () => unwrap<QualityCourse[]>(api.get('/quality/courses')),
});

interface ProfessorRow {
  id: string;
  firstName: string;
  lastName: string;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  rank: string;
  specialty: string;
  faculty: string;
  department: string;
  offerings: number;
  totals: { enrollments: number; materials: number; lectures: number; assignments: number; attendance: number };
  satisfaction: number;
  responseHours: number;
  compliance: number;
}
const useProfessors = () => useQuery({
  queryKey: ['quality', 'professors'],
  queryFn: () => unwrap<ProfessorRow[]>(api.get('/quality/professors')),
});

interface Engagement {
  attendance: { presentRate: number; lateRate: number; absentRate: number; total: number };
  videos: { totalLectures: number; totalEvents: number; completionRate: number; completedLectures: number };
  enrollments: number;
  totalStudents: number;
  papersByStatus: Record<string, number>;
  weeklyActive: number[];
  /** true when the backend filled the curve with its deterministic fallback. */
  weeklyActiveEstimated: boolean;
}
const useEngagement = () => useQuery({
  queryKey: ['quality', 'engagement'],
  queryFn: () => unwrap<Engagement>(api.get('/quality/engagement')),
});

interface FacultyTree {
  id: string;
  name: string;
  iconEmoji?: string | null;
  departments: Array<{
    id: string;
    name: string;
    courses: Array<{
      id: string;
      name: string;
      code: string;
      themeColor?: string | null;
      offerings: Array<{
        id: string;
        term: string;
        _count: { lectures: number; materials: number; assignments: number; enrollments: number };
      }>;
      _count: { offerings: number; concepts: number };
    }>;
  }>;
}
const useCurriculum = () => useQuery({
  queryKey: ['quality', 'curriculum'],
  queryFn: () => unwrap<FacultyTree[]>(api.get('/quality/curriculum')),
});

const RANK_LABEL: Record<string, string> = {
  LECTURER: 'محاضر',
  ASSISTANT_PROFESSOR: 'أستاذ مساعد',
  ASSOCIATE_PROFESSOR: 'أستاذ مشارك',
  PROFESSOR: 'أستاذ',
};

/* ════════════════════════════════════════════════════════════════
   Quality alerts — derived from real database signals
   (shared by the dashboard's summary card + the full alerts page)
   ════════════════════════════════════════════════════════════════ */

interface QualityAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'attendance' | 'plagiarism' | 'content';
  title: string;
  description: string;
  occurredAt: string;
}
interface QualityAlertsResponse {
  alerts: QualityAlert[];
  counts: { critical: number; warning: number; info: number; total: number };
}

const SEVERITY_TONE: Record<QualityAlert['severity'], 'red' | 'amber' | 'brand'> = {
  critical: 'red',
  warning: 'amber',
  info: 'brand',
};
const CATEGORY_ICON: Record<QualityAlert['category'], LucideIcon> = {
  attendance: ClipboardCheck,
  plagiarism: FileText,
  content: BookOpen,
};

/* formatRelativeArShort (compact relative time) lives in lib/format.ts
 * (wave 9-a) — identical strings to the former local copy. */

const useQualityAlerts = () => useQuery({
  queryKey: ['quality', 'alerts'],
  queryFn: () => unwrap<QualityAlertsResponse>(api.get('/quality/alerts')),
  staleTime: 60_000,
});

/* ─── Shared chart/table helpers ────────────────────────────── */
// NOTE: chart options must be built during render (see components below) —
// a module-level `cartesianOptions()` would freeze the resolved CSS colours
// at import time and never follow a light/dark theme switch.

/* WEEKDAY_NAMES_AR (Sunday-first Arabic weekday names) lives in
 * lib/format.ts (13-15 fold). */

/**
 * Read a --motion-duration-* token as milliseconds. Returns 0 when the
 * token is missing/unparsable so callers can fall back explicitly.
 * (Replicated from the wave 4-a DashboardPage helper — promote both
 * copies into a shared hooks module in a lib-owning wave.)
 */
function motionTokenMs(token: string): number {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw.endsWith('ms')) return 0;
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * CountIn — the in-app data edition of the count-up reveal (first paint
 * only: mounts on the settled value and counts toward it; later value
 * changes render instantly; instant under prefers-reduced-motion).
 * Replicated from wave 4-a's DashboardPage per the wave 5-c mission —
 * extracting a shared hook would mean touching DashboardPage, which is
 * outside this wave's file scope. Same contract, same easing.
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

  // Fractional values (e.g. 4.2/5) keep one decimal, integers none —
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

/* ════════════════════════════════════════════════════════════════
   Quality Dashboard
   ════════════════════════════════════════════════════════════════ */
export function QualityDashboardPage() {
  const ov = useOverview();
  const eg = useEngagement();
  const al = useQualityAlerts();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  if (ov.isPending || eg.isPending) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">مركز ضمان الجودة</h1>
            <p className="page-subtitle">رؤية لحظية لسير العملية التعليمية في الجامعة.</p>
          </div>
        </header>
        <KpiSkeleton />
        <div className="grid-2-1">
          <Card><ChartSkeleton /></Card>
          <Card><ChartSkeleton height={180} /></Card>
        </div>
        <div className="grid-2-1">
          <Card><ListSkeleton rows={5} /></Card>
          <Card><ListSkeleton rows={3} /></Card>
        </div>
      </div>
    );
  }
  if (ov.isError || !ov.data || eg.isError || !eg.data) {
    return (
      <ErrorState
        error={ov.error ?? eg.error}
        onRetry={() => { ov.refetch(); eg.refetch(); }}
      />
    );
  }
  const d = ov.data;
  const e = eg.data;
  // Resolve chart colours/options during render so a theme flip (which
  // remounts the canvases via `key`) picks up fresh values — the old
  // module-level `const chartOpts = cartesianOptions()` froze at import time.
  const cc = chartColors();
  const opts = cartesianOptions();

  // KPI bars — every value derives from a real payload field:
  //   · معدل الحضور / إكمال المحاضرات  ← /quality/engagement
  //   · معدل التسجيل                   ← enrollments ÷ totalStudents
  //   · البحوث المكتملة                ← /quality/overview papers (GRADED+PUBLISHED ÷ total)
  // (The old hardcoded 68/82/91 bars presented numbers no API provides.)
  const enrollmentRate = e.totalStudents > 0
    ? Math.min(100, (e.enrollments / e.totalStudents) * 100)
    : 0;
  const paperTotal = Object.values(d.papers).reduce((s, n) => s + (n ?? 0), 0);
  const paperDone = (d.papers.GRADED ?? 0) + (d.papers.PUBLISHED ?? 0);
  const paperProgress = paperTotal > 0 ? (paperDone / paperTotal) * 100 : 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز ضمان الجودة</h1>
          <p className="page-subtitle">
            بناء نظام تعليمي فعّال عبر تطوير الأداء الأكاديمي والإداري والتقني — وفقاً لمتطلبات
            الاعتماد المحلية والدولية.
          </p>
        </div>
        <Badge color="gold" icon={ShieldCheck}>وصول قراءة فقط</Badge>
      </header>

      <div className="grid-4">
        <MetricCard icon={GraduationCap} label="الطلاب النشطون" value={<CountIn value={d.users.STUDENT ?? 0} />} change="مسجَّل في النظام" color="brand" />
        <MetricCard icon={Users} label="هيئة التدريس" value={<CountIn value={d.users.TEACHER ?? 0} />} color="green" />
        <MetricCard icon={BookOpen} label="مقرّرات نشطة" value={<CountIn value={d.offerings} />} change={countAr(d.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])} color="amber" />
        <MetricCard
          icon={Activity}
          label="معدل الحضور"
          value={<CountIn value={Math.round(e.attendance.presentRate)} suffix="%" />}
          change={countAr(e.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً'])}
          color="purple"
        />
      </div>

      <div className="grid-2-1">
        <Card
          title="النشاط الأسبوعي"
          subtitle={
            e.weeklyActiveEstimated
              ? 'عدد الجلسات اليومية النشطة على المنصة — منحنى تقديري لحدّة البيانات'
              : 'عدد الجلسات اليومية النشطة على المنصة'
          }
          icon={TrendingUp}
        >
          <ChartFrame
            ariaLabel={`مخطط خطّي للنشاط الأسبوعي — جلسات نشطة يومياً${e.weeklyActiveEstimated ? ' (منحنى تقديري)' : ''}`}
            summary={
              e.weeklyActive.length > 0
                ? `ذروة النشاط ${countAr(Math.max(...e.weeklyActive), ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])} يوم ${WEEKDAY_NAMES_AR[e.weeklyActive.indexOf(Math.max(...e.weeklyActive))] ?? ''}.`
                : 'لا بيانات نشاط لهذا الأسبوع.'
            }
            table={{
              caption: 'النشاط الأسبوعي — جلسات نشطة يومياً',
              columns: ['اليوم', 'جلسات'],
              rows: WEEKDAY_NAMES_AR.map((day, i) => [day, e.weeklyActive[i] ?? 0]),
            }}
            height={220}
          >
          <Line
            key={themeKey}
            data={{
              labels: WEEKDAY_NAMES_AR,
              datasets: [{
                label: 'مستخدم نشط',
                data: e.weeklyActive,
                borderColor: cc.accent,
                backgroundColor: `color-mix(in srgb, ${cc.accent} 12%, transparent)`,
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: cc.accent,
              }],
            }}
            options={opts}
          />
        </ChartFrame>
        </Card>

        <Card title="توزيع الحضور" icon={ClipboardCheck}>
          <ChartFrame
            ariaLabel={`توزيع الحضور: حضور ${Math.round(e.attendance.presentRate)}% وتأخر ${Math.round(e.attendance.lateRate)}% وغياب ${Math.round(e.attendance.absentRate)}%`}
            table={{
              caption: 'توزيع الحضور',
              columns: ['الحالة', 'النسبة'],
              rows: [
                ['حضور', Math.round(e.attendance.presentRate)],
                ['تأخر', Math.round(e.attendance.lateRate)],
                ['غياب', Math.round(e.attendance.absentRate)],
              ],
            }}
            height={220}
          >
            <Doughnut
              key={themeKey}
              data={{
                labels: ['حضور', 'تأخر', 'غياب'],
                datasets: [{
                  data: [e.attendance.presentRate, e.attendance.lateRate, e.attendance.absentRate],
                  backgroundColor: [cc.success, cc.warning, cc.danger],
                  borderColor: cc.surface,
                  borderWidth: 2,
                }],
              }}
              options={radialOptions({ legend: true, cutout: '65%' })}
            />
          </ChartFrame>
        </Card>
      </div>

      <div className="grid-2-1">
        <Card title="مؤشرات الجودة الأساسية" icon={ShieldCheck}>
          <div className="flex-col gap-4">
            <ProgressBar value={e.attendance.presentRate} label="معدل الحضور التراكمي" ariaLabel="معدل الحضور التراكمي" color="var(--success)" />
            <ProgressBar value={e.videos.completionRate} label="معدل إكمال المحاضرات" ariaLabel="معدل إكمال المحاضرات" color="var(--accent)" />
            <ProgressBar value={enrollmentRate} label="معدل تسجيل الطلاب في المقرّرات" ariaLabel="معدل تسجيل الطلاب في المقرّرات" color="var(--brand-purple)" />
            <ProgressBar value={paperProgress} label="نسبة البحوث المكتملة التقييم" ariaLabel="نسبة البحوث المكتملة التقييم" color="var(--gold)" />
          </div>
        </Card>

        <Card title="تنبيهات الجودة" icon={AlertTriangle}>
          {al.isPending ? (
            <ListSkeleton rows={3} />
          ) : al.isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="تعذّر تحميل التنبيهات"
              description="حدث خطأ في الاتصال أثناء جلب التنبيهات."
              action={
                <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn ghost sm" onClick={() => void al.refetch()}>
                    <Icon icon={ArrowLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
                    إعادة المحاولة
                  </button>
                  <Link to="/quality/alerts" className="btn ghost sm">صفحة التنبيهات</Link>
                </div>
              }
            />
          ) : !al.data || al.data.alerts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="لا توجد تنبيهات"
              description="كل المؤشرات ضمن النطاق الطبيعي حالياً."
            />
          ) : (
            <>
              <div className="flex-col gap-2">
                {/* Server sorts critical-first; show the top 3 and link out. */}
                {al.data.alerts.slice(0, 3).map((a) => (
                  <AlertRow
                    key={a.id}
                    color={SEVERITY_TONE[a.severity]}
                    icon={CATEGORY_ICON[a.category]}
                    title={a.title}
                    description={a.description}
                    time={formatRelativeArShort(a.occurredAt)}
                  />
                ))}
              </div>
              <Link to="/quality/alerts" className="btn ghost sm" style={{ marginTop: 'var(--sp-3)' }}>
                <Icon icon={ArrowLeft} size={13} />
                عرض كل التنبيهات
              </Link>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Quality Courses
   ════════════════════════════════════════════════════════════════ */
export function QualityCoursesPage() {
  const c = useQualityCourses();
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جودة المقرّرات</h1>
          <p className="page-subtitle">تتبّع جودة كل مقرّر: المحاضرات، الملفات، الواجبات، التسجيلات.</p>
        </div>
      </header>
      {c.isPending ? (
        <Card title="المقرّرات النشطة" icon={BookOpen}><TableSkeleton rows={4} cols={7} /></Card>
      ) :
       c.isError ? <ErrorState error={c.error} onRetry={() => c.refetch()} /> :
       !c.data?.length ? <Card><EmptyState icon={BookOpen} title="لا توجد مقرّرات نشطة بعد" description="ستظهر المقرّرات وعروضها الدراسية هنا فور اعتمادها وربطها بالفصل الحاليّ." /></Card> : (
        <Card title="المقرّرات النشطة" icon={BookOpen}>
          {/* tbl-stack (A8 P1-1): the roster collapses to labelled cards
              on phones — same .table-wrap > .table.tbl-stack pattern as
              every admin roster (OwnerUsersPage reference). */}
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th>المقرّر</th>
                  <th>الأستاذ</th>
                  <th>الفصل</th>
                  <th>الطلاب</th>
                  <th>المحاضرات</th>
                  <th>الملفات</th>
                  {/* A8 P2-4: this is an estimated completion index, not
                      a measured “quality” — renamed + weights surfaced so
                      the number names its own formula. */}
                  <th title="تقدير اكتمال المحتوى: كل محاضرة 20 نقطة، كل ملف 5، كل واجب 10 — بحدّ أقصى 100">اكتمال المحتوى</th>
                </tr>
              </thead>
              <tbody>
                {c.data.map((o) => {
                  const score = Math.min(100, o._count.lectures * 20 + o._count.materials * 5 + o._count.assignments * 10);
                  // Score 0 = no content yet — a neutral state, never a
                  // danger register (A8 P2-4: red “0%” spent the danger
                  // color on “no data”).
                  const color = score === 0 ? null : score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
                  return (
                    <tr key={o.id}>
                      <td className="tbl-strong" data-label="المقرّر">{o.course.name}</td>
                      <td data-label="الأستاذ">د. {o.teacher.firstName} {o.teacher.lastName}</td>
                      <td className="font-mono text-xs" data-label="الفصل"><bdi>{o.term}</bdi></td>
                      <td className="tbl-num" data-label="الطلاب">{o._count.enrollments}</td>
                      <td className="tbl-num" data-label="المحاضرات">{o._count.lectures}</td>
                      <td className="tbl-num" data-label="الملفات">{o._count.materials}</td>
                      <td data-label="اكتمال المحتوى">
                        {score === 0
                          ? <Badge>لا محتوى بعد</Badge>
                          : <Badge color={color as never}>{score}%</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Professor Evaluation
   ════════════════════════════════════════════════════════════════ */
export function QualityProfessorsPage() {
  const p = useProfessors();
  if (p.isPending) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">تقييم الأساتذة</h1>
            <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
          </div>
        </header>
        <KpiSkeleton />
        <Card title="هيئة التدريس" icon={School}><TableSkeleton rows={5} cols={8} /></Card>
      </div>
    );
  }
  if (p.isError || !p.data) return <ErrorState error={p.error} onRetry={() => p.refetch()} />;

  const avgSat = p.data.length ? p.data.reduce((s, t) => s + t.satisfaction, 0) / p.data.length : 0;
  const avgResp = p.data.length ? p.data.reduce((s, t) => s + t.responseHours, 0) / p.data.length : 0;
  const lowComp = p.data.filter((t) => t.compliance < 50).length;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تقييم الأساتذة</h1>
          <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
        </div>
      </header>

      <div className="grid-3">
        <MetricCard icon={Star} label="متوسط رضا الطلاب" value={<CountIn value={Math.round(avgSat * 10) / 10} />} change="من 5.0" color="gold" />
        <MetricCard icon={Clock} label="متوسط الاستجابة" value={<CountIn value={Math.round(avgResp)} suffix=" س" />} change="على رسائل الطلاب" color="brand" />
        <MetricCard icon={AlertTriangle} label="بحاجة لمتابعة" value={<CountIn value={lowComp} />} change="أداء منخفض" color="red" />
      </div>

      <Card title="هيئة التدريس" icon={School}>
        {/* tbl-stack (A8 P1-1): 8 columns sideways-scrolled 524px at
            390px — the roster now collapses to labelled cards like the
            admin siblings. */}
        <div className="table-wrap">
          <table className="table tbl-stack">
            <thead>
              <tr>
                <th>الأستاذ</th>
                <th>الكلّيّة / القسم</th>
                <th>الرتبة</th>
                <th>المقرّرات</th>
                <th>الملفات المرفوعة</th>
                <th>رضا الطلاب</th>
                <th>زمن الاستجابة</th>
                <th>الالتزام</th>
              </tr>
            </thead>
            <tbody>
              {p.data.map((t) => {
                const compColor = t.compliance >= 75 ? 'green' : t.compliance >= 50 ? 'amber' : 'red';
                return (
                  <tr key={t.id}>
                    <td data-label="الأستاذ">
                      <div className="flex items-center gap-2">
                        <div
                          className="avatar"
                          style={{
                            width: 28, height: 28, fontSize: 11,
                            background: t.avatarColor ?? 'var(--accent)',
                          }}
                        >
                          {t.avatarInitials ?? `${t.firstName[0] ?? ''}${t.lastName[0] ?? ''}`}
                        </div>
                        <div>
                          <div className="tbl-strong">د. {t.firstName} {t.lastName}</div>
                          <div className="text-xxs text-subtle">{t.specialty}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="الكلّيّة / القسم">
                      <div>{t.faculty}</div>
                      <div className="text-xxs text-subtle">{t.department}</div>
                    </td>
                    <td data-label="الرتبة"><Badge>{RANK_LABEL[t.rank] ?? t.rank}</Badge></td>
                    <td className="tbl-num" data-label="المقرّرات">{t.offerings}</td>
                    <td className="tbl-num" data-label="الملفات المرفوعة">{t.totals.materials}</td>
                    <td className="tbl-num" data-label="رضا الطلاب" style={{ color: 'var(--gold-ink, var(--c-yellow-deep))' }}><Icon icon={Star} size={14} /> {t.satisfaction}</td>
                    <td className="tbl-num" data-label="زمن الاستجابة">{t.responseHours}س</td>
                    <td data-label="الالتزام">
                      <div className="q-compliance">
                        <ProgressBar value={t.compliance} showValue={false} ariaLabel={`التزام د. ${t.firstName} ${t.lastName}`} />
                        <Badge color={compColor as never}>{t.compliance}%</Badge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Engagement & Attendance
   ════════════════════════════════════════════════════════════════ */
export function QualityEngagementPage() {
  const e = useEngagement();
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Page chrome stays up in every state — loading and error keep the
  // header (audit 0-e P2-39: siblings must not drop it mid-load).
  const pageHeader = (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">الانخراط والحضور</h1>
        <p className="page-subtitle">نسب الحضور، إكمال المحاضرات، النقاط المتفاعلة.</p>
      </div>
    </header>
  );
  if (e.isPending) {
    return (
      <div className="page">
        {pageHeader}
        <KpiSkeleton />
        <div className="grid-2-1">
          <Card><ChartSkeleton height={240} /></Card>
          <Card><ListSkeleton rows={3} /></Card>
        </div>
      </div>
    );
  }
  if (e.isError || !e.data) {
    return (
      <div className="page">
        {pageHeader}
        <ErrorState error={e.error} onRetry={() => void e.refetch()} />
      </div>
    );
  }
  const d = e.data;
  const cc = chartColors();
  const opts = cartesianOptions();

  const enrollmentRate = d.totalStudents > 0 ? Math.min(100, (d.enrollments / d.totalStudents) * 100) : 0;
  // Empty weeklyActive (backend edge) must read as an honest dash,
  // never as NaN (audit 0-e P2-39).
  const weeklyAvg = d.weeklyActive.length > 0
    ? Math.round(d.weeklyActive.reduce((a, b) => a + b, 0) / d.weeklyActive.length)
    : null;
  const peak = d.weeklyActive.length > 0 ? Math.max(...d.weeklyActive) : null;

  return (
    <div className="page">
      {pageHeader}

      <div className="grid-4">
        <MetricCard icon={ClipboardCheck} label="معدل الحضور" value={<CountIn value={Math.round(d.attendance.presentRate)} suffix="%" />} change={countAr(d.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً'])} color="green" />
        <MetricCard icon={Activity} label="إكمال المحاضرات" value={<CountIn value={Math.round(d.videos.completionRate)} suffix="%" />} change={countAr(d.videos.completedLectures, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة'])} color="brand" />
        <MetricCard icon={GraduationCap} label="معدل التسجيل" value={<CountIn value={Math.round(enrollmentRate)} suffix="%" />} change={countAr(d.enrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً'])} color="amber" />
        <MetricCard icon={TrendingUp} label="متوسط النشاط الأسبوعي" value={weeklyAvg === null ? '—' : <CountIn value={weeklyAvg} />} change="مستخدم/يوم" color="purple" />
      </div>

      <div className="grid-2-1">
        <Card title="النشاط الأسبوعي" icon={TrendingUp}>
          <ChartFrame
            ariaLabel="مخطط أعمدة للنشاط الأسبوعي — عدد الجلسات النشطة يومياً"
            summary={
              peak !== null
                ? `ذروة النشاط ${countAr(peak, ['جلسة نشطة واحدة', 'جلستان نشطتان', 'جلسات نشطة', 'جلسة نشطة'])}.`
                : 'لا بيانات نشاط لهذا الأسبوع.'
            }
            table={{
              caption: 'النشاط الأسبوعي — جلسات نشطة يومياً',
              columns: ['اليوم', 'جلسات'],
              rows: WEEKDAY_NAMES_AR.map((day, i) => [day, d.weeklyActive[i] ?? 0]),
            }}
            height={240}
          >
            <Bar
              key={themeKey}
              data={{
                labels: WEEKDAY_NAMES_AR,
                datasets: [{
                  label: 'نشاط يومي',
                  data: d.weeklyActive,
                  backgroundColor: cc.accent,
                  borderRadius: 6,
                  borderSkipped: false,
                }],
              }}
              options={opts}
            />
          </ChartFrame>
        </Card>

        <Card title="تحليل المشاهدة" icon={Activity}>
          <div className="flex-col gap-4">
            <ProgressBar value={d.videos.completionRate} label="معدل الإكمال" ariaLabel="معدل إكمال المحاضرات" color="var(--accent)" />
            <ProgressBar value={(d.videos.completedLectures / Math.max(d.videos.totalLectures, 1)) * 100} label="نسبة المحاضرات المكتملة" ariaLabel="نسبة المحاضرات المكتملة" color="var(--success)" />
            <ProgressBar value={d.attendance.absentRate} label="نسبة الغياب" ariaLabel="نسبة الغياب" color="var(--danger)" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Curriculum Review — completion heatmap
   ════════════════════════════════════════════════════════════════ */

type CurriculumCourse = FacultyTree['departments'][number]['courses'][number];
type CurriculumLevel = 'strong' | 'weak' | 'poor';

/** Content-completion score per course (lectures/materials/concepts). */
function courseCompletion(co: CurriculumCourse): number {
  const lectures = co.offerings.reduce((s, o) => s + o._count.lectures, 0);
  const materials = co.offerings.reduce((s, o) => s + o._count.materials, 0);
  return Math.min(100, lectures * 18 + materials * 5 + co._count.concepts * 4);
}
function completionLevel(pct: number): CurriculumLevel {
  if (pct >= 70) return 'strong';
  if (pct >= 40) return 'weak';
  return 'poor';
}
const LEVEL_LABEL: Record<CurriculumLevel | 'all', string> = {
  all: 'الكل',
  strong: 'مكتمل',
  weak: 'جزئي',
  poor: 'متأخر',
};
const LEVEL_LEGEND: Record<CurriculumLevel, string> = {
  strong: 'مكتمل — 70% فأكثر',
  weak: 'جزئي — 40 إلى 69%',
  poor: 'متأخر — أقلّ من 40%',
};

export function QualityCurriculumPage() {
  const c = useCurriculum();
  // Level filter — declared BEFORE the early returns so the hook order
  // is stable across the pending → data transition.
  const [level, setLevel] = useState<CurriculumLevel | 'all'>('all');
  // Page chrome stays up in every state (audit 0-e P2-39).
  const pageHeader = (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">مراجعة المناهج</h1>
        <p className="page-subtitle">شجرة الكلّيّات والأقسام والمقرّرات، مع مؤشرات اكتمال المحتوى.</p>
      </div>
    </header>
  );
  if (c.isPending) {
    return (
      <div className="page">
        {pageHeader}
        <CardSkeleton lines={2} />
        <Card>
          <div className="matrix-cells" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={56} />
            ))}
          </div>
        </Card>
      </div>
    );
  }
  if (c.isError || !c.data) {
    return (
      <div className="page">
        {pageHeader}
        <ErrorState error={c.error} onRetry={() => void c.refetch()} />
      </div>
    );
  }

  // Real per-level counts across the whole tree (drives the pills).
  const levelCounts: Record<CurriculumLevel, number> = { strong: 0, weak: 0, poor: 0 };
  for (const f of c.data) {
    for (const d of f.departments) {
      for (const co of d.courses) levelCounts[completionLevel(courseCompletion(co))] += 1;
    }
  }
  const total = levelCounts.strong + levelCounts.weak + levelCounts.poor;

  return (
    <div className="page">
      {pageHeader}

      {/* Filter + legend — the pills reuse the shared .filter-pill
          segmented-control family; cells dim (not disappear) so the
          heatmap stays whole while filtering (matrix-page language). */}
      <Card>
        <div className="filter-pill-row" role="group" aria-label="تصفية المقرّرات بحسب نسبة اكتمال المحتوى">
          <button
            type="button"
            className="filter-pill"
            aria-pressed={level === 'all'}
            onClick={() => setLevel('all')}
          >
            {LEVEL_LABEL.all}
            <span className="filter-pill-count">{total}</span>
          </button>
          {(['strong', 'weak', 'poor'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className="filter-pill"
              aria-pressed={level === key}
              onClick={() => setLevel(key)}
              disabled={levelCounts[key] === 0}
            >
              {LEVEL_LABEL[key]}
              <span className="filter-pill-count">{levelCounts[key]}</span>
            </button>
          ))}
        </div>
        <div className="heat-legend">
          {(['strong', 'weak', 'poor'] as const).map((key) => (
            <span key={key} className="heat-legend-key">
              <span className={`heat-legend-dot ${key === 'strong' ? 'lvl-strong' : key === 'weak' ? 'lvl-weak' : 'lvl-poor'}`} />
              {LEVEL_LEGEND[key]}
            </span>
          ))}
        </div>
      </Card>

      <div className="flex-col gap-4">
        {c.data.map((f) => (
          <Card key={f.id} title={f.name} icon={Building2}
            subtitle={`${countAr(f.departments.length, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(f.departments.reduce((s, d) => s + d.courses.length, 0), ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`}>
            <div className="flex-col gap-4">
              {f.departments.map((d) => {
                const completions = d.courses.map((co) => courseCompletion(co));
                const deptAvg = completions.length > 0
                  ? Math.round(completions.reduce((s, v) => s + v, 0) / completions.length)
                  : null;
                return (
                  <div key={d.id}>
                    <div className="section-title">{d.name}</div>
                    {!d.courses.length ? (
                      <div className="text-xs text-subtle" style={{ padding: '6px 0' }}>لا مقرّرات</div>
                    ) : (
                      <>
                        <div className="q-dept-stat">
                          <span>{countAr(d.courses.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span>
                          <span>متوسط الاكتمال <bdi>{deptAvg}%</bdi></span>
                        </div>
                        {/* The heatmap — .matrix-cells/.matrix-cell + .lvl-*
                            tiles (the platform's one heatmap language,
                            shared with the student skills matrix). Cells
                            transition between shades on data change
                            (matrix-cell rides --t-clean) and recede via
                            .is-dim when filtered out. */}
                        <div className="matrix-cells">
                          {d.courses.map((co) => {
                            const completion = courseCompletion(co);
                            const lvl = completionLevel(completion);
                            const lectures = co.offerings.reduce((s, o) => s + o._count.lectures, 0);
                            const materials = co.offerings.reduce((s, o) => s + o._count.materials, 0);
                            return (
                              <div
                                key={co.id}
                                className={`matrix-cell ${lvl === 'strong' ? 'lvl-strong' : lvl === 'weak' ? 'lvl-weak' : 'lvl-poor'}${level !== 'all' && lvl !== level ? ' is-dim' : ''}`}
                                title={`${co.name} (${co.code}) — اكتمال ${completion}% · ${countAr(lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])} · ${countAr(materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])} · ${countAr(co._count.concepts, ['مفهوم واحد', 'مفهومان', 'مفاهيم', 'مفهوماً'])}`}
                              >
                                <div><bdi className="font-mono text-xxs">{co.code}</bdi></div>
                                <div>{co.name}</div>
                                <div className="matrix-meta">
                                  <span className="matrix-meta-pct">{completion}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Reports — honest landing for institutional dashboards
   ════════════════════════════════════════════════════════════════ */
export function QualityReportsPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تقارير الجودة</h1>
          <p className="page-subtitle">لوحات حيّة بدلاً من تقارير ثابتة — تُحدَّث مع كل عمليّة على المنصّة.</p>
        </div>
      </header>

      <div className="grid-2">
        <Card title="جودة المقرّرات" icon={BookOpen} subtitle="تحليل لكلّ عرض دراسيّ — تسجيلات، محتوى، تقييم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            تستعرض اللوحة كل العروض الدراسيّة مع تفصيل عدد المسجَّلين، ساعات المحاضرات، الملفات، والاختبارات.
          </p>
          <Link to="/quality/courses" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="تقييم الأساتذة" icon={School} subtitle="ملفّات أعضاء هيئة التدريس وتاريخ توثيقهم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            قائمة كاملة بأعضاء هيئة التدريس مرتَّبة بحسب القسم والكلّيّة، مع حالة التوثيق وتفاصيل التخصّص.
          </p>
          <Link to="/quality/professors" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="الانخراط والحضور" icon={Activity} subtitle="نسب الحضور ومؤشّرات التفاعل أسبوعيّاً">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            نسب الحضور والغياب، مشاهدات المحاضرات، الطلاب النشطين أسبوعيّاً، حالة البحوث.
          </p>
          <Link to="/quality/engagement" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="مراجعة المناهج" icon={ListChecks} subtitle="نسبة اكتمال المحتوى الرقميّ في كل قسم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            مؤشّر اكتمال رفع المحاضرات والملفات التعليميّة عبر الكلّيّات والأقسام.
          </p>
          <Link to="/quality/curriculum" className="btn primary sm">
            <Icon icon={ArrowLeft} size={13} />
            فتح اللوحة
          </Link>
        </Card>
      </div>

      <Card title="تصدير تقارير ثابتة (PDF/Excel)" icon={FileText}>
        <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0', lineHeight: 1.6 }}>
          إصدار التقارير القابلة للتحميل قيد التطوير. حاليّاً يمكنك الاعتماد على اللوحات الحيّة أعلاه — كلّ
          الأرقام تُحدَّث فوريّاً مع البيانات في قاعدة المنصّة.
        </p>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Quality Alerts page (full list — hooks/helpers live near the top,
   shared with the dashboard's summary card)
   ════════════════════════════════════════════════════════════════ */

export function QualityAlertsPage() {
  const q = useQualityAlerts();

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تنبيهات الجودة</h1>
          <p className="page-subtitle">أحداث تستوجب تدخّل فريق ضمان الجودة — مُستخرجة فوريّاً من بيانات المنصّة.</p>
        </div>
        {q.data && q.data.counts.critical > 0 && (
          <Badge color="red">{countAr(q.data.counts.critical, ['تنبيه حرج', 'تنبيهان حرجان', 'تنبيهات حرجة', 'تنبيهاً حرجاً'])}</Badge>
        )}
      </header>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.alerts.length === 0 ? (
        <Card>
          <div className="state">
            <div className="state-icon state-icon-success">
              <Icon icon={CheckCircle2} size={20} />
            </div>
            <div className="state-title">لا توجد تنبيهات حالياً</div>
            <div className="state-desc">كلّ المؤشّرات ضمن النطاق الطبيعيّ.</div>
          </div>
        </Card>
      ) : (
        <Card title="تنبيهات نشطة" icon={AlertTriangle}>
          <div className="flex-col gap-2">
            {q.data.alerts.map((a) => (
              <AlertRow
                key={a.id}
                color={SEVERITY_TONE[a.severity]}
                icon={CATEGORY_ICON[a.category]}
                title={a.title}
                description={a.description}
                time={formatRelativeArShort(a.occurredAt)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
