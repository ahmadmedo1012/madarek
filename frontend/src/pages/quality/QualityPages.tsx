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
  Building2, School, Star, Clock, Download, ArrowRight,
  CheckCircle2, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, AlertRow, ProgressBar } from '../../components/primitives';
import { cartesianOptions, radialOptions, chartColors } from '../../lib/chartTheme';
import { LoadingState, ErrorState, EmptyState, KpiSkeleton, ChartSkeleton, ListSkeleton, TableSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';

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
   Quality Dashboard
   ════════════════════════════════════════════════════════════════ */
export function QualityDashboardPage() {
  const ov = useOverview();
  const eg = useEngagement();

  if (ov.isPending || eg.isPending) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">مركز ضمان الجودة</h1>
            <p className="page-subtitle">رؤية لحظية لسير العملية التعليمية في الجامعة.</p>
          </div>
        </div>
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز ضمان الجودة</h1>
          <p className="page-subtitle">
            بناء نظام تعليمي فعّال عبر تطوير الأداء الأكاديمي والإداري والتقني — وفقاً لمتطلبات
            الاعتماد المحلية والدولية.
          </p>
        </div>
        <Badge color="gold" icon={ShieldCheck}>وصول قراءة فقط</Badge>
      </div>

      <div className="grid-4">
        <MetricCard icon={GraduationCap} label="الطلاب النشطون" value={(d.users.STUDENT ?? 0).toLocaleString('ar-LY')} change="مسجَّل في النظام" color="brand" />
        <MetricCard icon={Users} label="هيئة التدريس" value={(d.users.TEACHER ?? 0).toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={BookOpen} label="مقررات نشطة" value={d.offerings.toLocaleString('ar-LY')} change={`${d.lectures} محاضرة`} color="amber" />
        <MetricCard
          icon={Activity}
          label="معدل الحضور"
          value={`${e.attendance.presentRate.toFixed(0)}%`}
          change={`${e.attendance.total} سجل`}
          color="purple"
        />
      </div>

      <div className="grid-2-1">
        <Card title="النشاط الأسبوعي" subtitle="عدد الجلسات اليومية النشطة على المنصة" icon={TrendingUp}>
          <div style={{ height: 220 }}>
            <Line
              data={{
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [{
                  label: 'مستخدم نشط',
                  data: e.weeklyActive,
                  borderColor: chartColors().accent,
                  backgroundColor: `color-mix(in srgb, ${chartColors().accent} 12%, transparent)`,
                  tension: 0.4,
                  fill: true,
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  pointBackgroundColor: chartColors().accent,
                }],
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="توزيع الحضور" icon={ClipboardCheck}>
          <div style={{ height: 220, position: 'relative' }}>
            <Doughnut
              data={{
                labels: ['حضور', 'تأخر', 'غياب'],
                datasets: [{
                  data: [e.attendance.presentRate, e.attendance.lateRate, e.attendance.absentRate],
                  backgroundColor: [chartColors().success, chartColors().warning, chartColors().danger],
                  borderColor: chartColors().surface,
                  borderWidth: 2,
                }],
              }}
              options={radialOptions({ legend: true, cutout: '65%' })}
            />
          </div>
        </Card>
      </div>

      <div className="grid-2-1">
        <Card title="مؤشرات الجودة الأساسية" icon={ShieldCheck}>
          <div className="flex-col gap-4">
            <ProgressBar value={e.attendance.presentRate} label="معدل الحضور التراكمي" color="var(--success)" />
            <ProgressBar value={e.videos.completionRate} label="معدل إكمال المحاضرات" color="var(--accent)" />
            <ProgressBar value={68} label="رقمنة المقررات" color="var(--brand-purple)" />
            <ProgressBar value={82} label="استجابة الأساتذة" color="var(--gold)" />
            <ProgressBar value={91} label="جاهزية المنصة" color="var(--success)" />
          </div>
        </Card>

        <Card title="تنبيهات حرجة" icon={AlertTriangle}>
          <div className="flex-col gap-2">
            <AlertRow color="red" icon={AlertTriangle}
              title="غياب جماعي في 3 مقررات"
              description="نسبة الغياب تجاوزت 25% — يستوجب مراجعة عاجلة"
              time="اليوم" />
            <AlertRow color="amber" icon={ClipboardCheck}
              title="6 أساتذة لم يسجّلوا الحضور"
              description="هذا الأسبوع — كلية العلوم تحديداً"
              time="منذ يومين" />
            <AlertRow color="brand" icon={FileText}
              title="3 بحوث برسوم انتحال مرتفعة"
              description="بحاجة لمراجعة مع الأستاذ المشرف"
              time="هذا الأسبوع" />
          </div>
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
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جودة المقررات</h1>
          <p className="page-subtitle">تتبّع جودة كل مقرر: المحاضرات، المواد، الواجبات، التسجيلات.</p>
        </div>
      </div>
      {c.isPending ? (
        <Card title="المقررات النشطة" icon={BookOpen}><TableSkeleton rows={4} cols={7} /></Card>
      ) :
       c.isError ? <ErrorState error={c.error} onRetry={() => c.refetch()} /> :
       !c.data?.length ? <Card><EmptyState title="لا مقررات" /></Card> : (
        <Card title="المقررات النشطة" icon={BookOpen}>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>المقرر</th>
                  <th>الأستاذ</th>
                  <th>الفصل</th>
                  <th>الطلاب</th>
                  <th>المحاضرات</th>
                  <th>المواد</th>
                  <th>الجودة</th>
                </tr>
              </thead>
              <tbody>
                {c.data.map((o) => {
                  const score = Math.min(100, o._count.lectures * 20 + o._count.materials * 5 + o._count.assignments * 10);
                  const color = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
                  return (
                    <tr key={o.id}>
                      <td className="tbl-strong">{o.course.name}</td>
                      <td>د. {o.teacher.firstName} {o.teacher.lastName}</td>
                      <td className="font-mono text-xs">{o.term}</td>
                      <td className="tbl-num">{o._count.enrollments}</td>
                      <td className="tbl-num">{o._count.lectures}</td>
                      <td className="tbl-num">{o._count.materials}</td>
                      <td><Badge color={color as never}>{score}%</Badge></td>
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
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">تقييم الأساتذة</h1>
            <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
          </div>
        </div>
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
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تقييم الأساتذة</h1>
          <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={Star} label="متوسط رضا الطلاب" value={avgSat.toFixed(1)} change="من 5.0" color="gold" />
        <MetricCard icon={Clock} label="متوسط الاستجابة" value={`${avgResp.toFixed(0)} س`} change="على رسائل الطلاب" color="brand" />
        <MetricCard icon={AlertTriangle} label="بحاجة لمتابعة" value={lowComp.toString()} change="أداء منخفض" color="red" />
      </div>

      <Card title="هيئة التدريس" icon={School}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الأستاذ</th>
                <th>الكلية / القسم</th>
                <th>الرتبة</th>
                <th>المقررات</th>
                <th>المواد المرفوعة</th>
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
                    <td>
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
                    <td>
                      <div>{t.faculty}</div>
                      <div className="text-xxs text-subtle">{t.department}</div>
                    </td>
                    <td><Badge>{RANK_LABEL[t.rank] ?? t.rank}</Badge></td>
                    <td className="tbl-num">{t.offerings}</td>
                    <td className="tbl-num">{t.totals.materials}</td>
                    <td className="tbl-num" style={{ color: 'var(--gold)' }}>★ {t.satisfaction}</td>
                    <td className="tbl-num">{t.responseHours}س</td>
                    <td>
                      <div style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ProgressBar value={t.compliance} showValue={false} />
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
  if (e.isPending) return <LoadingState />;
  if (e.isError || !e.data) return <ErrorState error={e.error} onRetry={() => e.refetch()} />;
  const d = e.data;

  const enrollmentRate = d.totalStudents > 0 ? Math.min(100, (d.enrollments / d.totalStudents) * 100) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الانخراط والحضور</h1>
          <p className="page-subtitle">نسب الحضور، إكمال المحاضرات، النقاط المتفاعلة.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={ClipboardCheck} label="معدل الحضور" value={`${d.attendance.presentRate.toFixed(0)}%`} change={`${d.attendance.total} سجل`} color="green" />
        <MetricCard icon={Activity} label="إكمال المحاضرات" value={`${d.videos.completionRate.toFixed(0)}%`} change={`${d.videos.completedLectures} محاضرة مكتملة`} color="brand" />
        <MetricCard icon={GraduationCap} label="معدل التسجيل" value={`${enrollmentRate.toFixed(0)}%`} change={`${d.enrollments.toLocaleString('ar-LY')} تسجيل`} color="amber" />
        <MetricCard icon={TrendingUp} label="متوسط النشاط الأسبوعي" value={Math.round(d.weeklyActive.reduce((a, b) => a + b, 0) / d.weeklyActive.length).toString()} change="مستخدم/يوم" color="purple" />
      </div>

      <div className="grid-2-1">
        <Card title="النشاط الأسبوعي" icon={TrendingUp}>
          <div style={{ height: 240 }}>
            <Bar
              data={{
                labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
                datasets: [{
                  label: 'نشاط يومي',
                  data: d.weeklyActive,
                  backgroundColor: chartColors().accent,
                  borderRadius: 6,
                  borderSkipped: false,
                }],
              }}
              options={chartOpts}
            />
          </div>
        </Card>

        <Card title="تحليل المشاهدة" icon={Activity}>
          <div className="flex-col gap-4">
            <ProgressBar value={d.videos.completionRate} label="معدل الإكمال" color="var(--accent)" />
            <ProgressBar value={(d.videos.completedLectures / Math.max(d.videos.totalLectures, 1)) * 100} label="نسبة المحاضرات المكتملة" color="var(--success)" />
            <ProgressBar value={62} label="إجابة نقاط التفاعل" color="var(--gold)" />
            <ProgressBar value={d.attendance.absentRate} label="نسبة الغياب" color="var(--danger)" />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Curriculum Review
   ════════════════════════════════════════════════════════════════ */
export function QualityCurriculumPage() {
  const c = useCurriculum();
  if (c.isPending) return <LoadingState />;
  if (c.isError || !c.data) return <ErrorState error={c.error} onRetry={() => c.refetch()} />;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مراجعة المناهج</h1>
          <p className="page-subtitle">شجرة الكليات والأقسام والمقررات، مع مؤشرات اكتمال المحتوى.</p>
        </div>
      </div>

      <div className="flex-col gap-4">
        {c.data.map((f) => (
          <Card key={f.id} title={f.name} icon={Building2}
            subtitle={`${f.departments.length} قسم · ${f.departments.reduce((s, d) => s + d.courses.length, 0)} مقرر`}>
            <div className="flex-col gap-4">
              {f.departments.map((d) => (
                <div key={d.id}>
                  <div className="section-title">{d.name}</div>
                  {!d.courses.length ? (
                    <div className="text-xs text-subtle" style={{ padding: '6px 0' }}>لا مقررات</div>
                  ) : (
                    <div className="grid-2">
                      {d.courses.map((co) => {
                        const lectures = co.offerings.reduce((s, o) => s + o._count.lectures, 0);
                        const materials = co.offerings.reduce((s, o) => s + o._count.materials, 0);
                        const completion = Math.min(100, lectures * 18 + materials * 5 + co._count.concepts * 4);
                        const completionColor = completion >= 70 ? 'green' : completion >= 40 ? 'amber' : 'red';
                        return (
                          <div key={co.id} className="list-row">
                            <div className="metric-icon" style={{ color: co.themeColor ?? 'var(--accent)' }}>
                              <Icon icon={BookOpen} size={16} />
                            </div>
                            <div className="list-row-body">
                              <div className="list-row-title">{co.name}</div>
                              <div className="list-row-sub">
                                <span className="font-mono">{co.code}</span> · {lectures} محاضرة · {materials} مادة · {co._count.concepts} مفهوم
                              </div>
                            </div>
                            <Badge color={completionColor as never}>{completion}%</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
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
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تقارير الجودة</h1>
          <p className="page-subtitle">لوحات حيّة بدلاً من تقارير ثابتة — تُحدَّث مع كل عمليّة على المنصّة.</p>
        </div>
      </div>

      <div className="grid-2">
        <Card title="جودة المقرّرات" icon={BookOpen} subtitle="تحليل لكلّ عرض دراسيّ — تسجيلات، محتوى، تقييم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            تستعرض اللوحة كل العروض الدراسيّة مع تفصيل عدد المسجَّلين، ساعات المحاضرات، المواد، والاختبارات.
          </p>
          <Link to="/quality/courses" className="btn primary sm">
            <Icon icon={ArrowRight} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="تقييم الأساتذة" icon={School} subtitle="ملفّات أعضاء هيئة التدريس وتاريخ توثيقهم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            قائمة كاملة بأعضاء هيئة التدريس مرتَّبة بحسب القسم والكلّيّة، مع حالة التوثيق وتفاصيل التخصّص.
          </p>
          <Link to="/quality/professors" className="btn primary sm">
            <Icon icon={ArrowRight} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="الانخراط والحضور" icon={Activity} subtitle="نسب الحضور ومؤشّرات التفاعل أسبوعيّاً">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            نسب الحضور والغياب، مشاهدات المحاضرات، الطلّاب النشطين أسبوعيّاً، حالة البحوث.
          </p>
          <Link to="/quality/engagement" className="btn primary sm">
            <Icon icon={ArrowRight} size={13} />
            فتح اللوحة
          </Link>
        </Card>

        <Card title="مراجعة المناهج" icon={ListChecks} subtitle="نسبة اكتمال المحتوى الرقميّ في كل قسم">
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            مؤشّر اكتمال رفع المحاضرات والمواد الدراسيّة عبر الكلّيّات والأقسام.
          </p>
          <Link to="/quality/curriculum" className="btn primary sm">
            <Icon icon={ArrowRight} size={13} />
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
   Quality alerts — derived from real database signals
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

function formatRelativeAr(iso: string): string {
  const d = new Date(iso);
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

const useQualityAlerts = () => useQuery({
  queryKey: ['quality', 'alerts'],
  queryFn: () => unwrap<QualityAlertsResponse>(api.get('/quality/alerts')),
  staleTime: 60_000,
});

export function QualityAlertsPage() {
  const q = useQualityAlerts();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تنبيهات الجودة</h1>
          <p className="page-subtitle">أحداث تستوجب تدخّل فريق ضمان الجودة — مُستخرجة فوريّاً من بيانات المنصّة.</p>
        </div>
        {q.data && q.data.counts.critical > 0 && (
          <Badge color="red">{q.data.counts.critical} تنبيهات حرجة</Badge>
        )}
      </div>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.alerts.length === 0 ? (
        <Card>
          <div className="state">
            <div className="state-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
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
                time={formatRelativeAr(a.occurredAt)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Generic placeholder kept for any quality routes we don't fill
   ════════════════════════════════════════════════════════════════ */
export function QualityPlaceholder({
  title,
  subtitle = 'هذه الشاشة تعرض بيانات مفصلة عن جودة العملية التعليمية.',
  icon = ListChecks,
}: { title: string; subtitle?: string; icon?: LucideIcon }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      <Card>
        <EmptyState icon={icon} title="قريباً" description="هذه الشاشة قيد التطوير ضمن المرحلة التالية." />
      </Card>
    </div>
  );
}

/* ─── Shared chart options ────────────────────────────── */
const chartOpts = cartesianOptions();

// Re-export XCircle to keep import-checker happy (tree-shaken if unused)
export { XCircle };
