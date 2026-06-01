import { useState } from 'react';
import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, Settings, FileText, Users, TrendingUp,
  Award, Microscope, ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, PageSkeleton } from '../../components/primitives/States';
import { useAdminStats, useAdminFaculties, useAdminReports, useAdminCourses } from '../../hooks/useResources';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { cartesianOptions, valueLabels , chartColors} from '../../lib/chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

export function AdminDashboardPage() {
  const stats = useAdminStats();
  const facs = useAdminFaculties();
  const reports = useAdminReports();
  const c = chartColors();

  if (stats.isPending || facs.isPending || reports.isPending) return <PageSkeleton />;
  if (stats.isError || facs.isError || reports.isError) {
    return (
      <ErrorState
        error={stats.error ?? facs.error ?? reports.error}
        onRetry={() => { stats.refetch(); facs.refetch(); reports.refetch(); }}
      />
    );
  }
  const s = stats.data!;
  const f = facs.data!;
  const r = reports.data!;

  // Real top-8 by student count.
  const topByStudents = [...f]
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, 8)
    .filter((x) => x.studentCount > 0 || f.length <= 8);

  // Distinct cities — replaces the "9 cities" placeholder.
  const cityCount = new Set(f.map((x) => x.city)).size;
  const facultyCount = f.length;

  // Highest-density faculty for "مؤشرات سريعة".
  const topFaculty = topByStudents[0];
  const topByCourses = [...f].sort((a, b) => b.courseCount - a.courseCount)[0];
  const studentTeacherRatio = s.totalTeachers > 0
    ? Math.round((s.totalStudents / s.totalTeachers) * 10) / 10
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الإدارة</h1>
          <p className="page-subtitle">إحصائيات حيّة عن طلاب وأساتذة جامعة الزاوية.</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard
          icon={Building2}
          label="الكليات"
          value={facultyCount.toLocaleString('ar-LY')}
          change={`موزّعة على ${cityCount} ${cityCount === 1 ? 'مدينة' : 'مدن'}`}
          color="brand"
        />
        <MetricCard
          icon={GraduationCap}
          label="الطلاب"
          value={s.totalStudents.toLocaleString('ar-LY')}
          change="مسجَّل في النظام"
          color="green"
        />
        <MetricCard
          icon={School}
          label="هيئة التدريس"
          value={s.totalTeachers.toLocaleString('ar-LY')}
          change="عضو"
          color="amber"
        />
        <MetricCard
          icon={BookOpen}
          label="المقررات"
          value={s.totalCourses.toLocaleString('ar-LY')}
          change={`${s.totalEnrollments.toLocaleString('ar-LY')} تسجيل`}
          color="purple"
        />
      </div>

      <div className="grid-2-1">
        <Card title="توزّع الطلاب حسب الكلية" icon={BarChart3} subtitle={`أعلى ${topByStudents.length} كلّيّة من حيث عدد الطلاب`}>
          {topByStudents.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>
              لا توجد بيانات طلاب بعد.
            </p>
          ) : (
            <div style={{ height: Math.max(180, topByStudents.length * 36) }}>
              <Bar
                data={{
                  labels: topByStudents.map((row) => row.name),
                  datasets: [{
                    label: 'عدد الطلاب',
                    data: topByStudents.map((row) => row.studentCount),
                    backgroundColor: 'rgba(163, 201, 255, 0.55)',
                    borderColor: c.accent,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 22,
                  }],
                }}
                plugins={[valueLabels]}
                options={{ ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const }}
              />
            </div>
          )}
        </Card>

        <Card title="مؤشرات سريعة" icon={TrendingUp}>
          <div className="flex-col gap-2">
            <Stat
              label="أكبر كلّيّة"
              value={topFaculty ? `${topFaculty.name} (${topFaculty.studentCount.toLocaleString('ar-LY')})` : '—'}
            />
            <Stat
              label="أعلى عدد مقرّرات"
              value={topByCourses ? `${topByCourses.name} (${topByCourses.courseCount})` : '—'}
            />
            <Stat
              label="نسبة طالب/أستاذ"
              value={studentTeacherRatio !== null ? `${studentTeacherRatio}` : '—'}
            />
            <Stat
              label="أبحاث منشورة"
              value={r.headline.publishedPapers.toLocaleString('ar-LY')}
            />
            <Stat
              label="إجمالي الأبحاث"
              value={r.headline.totalPapers.toLocaleString('ar-LY')}
            />
          </div>
        </Card>
      </div>

      <Card title="نشاط الإنتاج العلميّ — آخر ٦ أشهر" icon={TrendingUp} subtitle="أبحاث مقدَّمة، مقيَّمة، ومنشورة شهرياً">
        {r.paperTrend.length === 0 || r.paperTrend.every((m) => m.submitted + m.graded + m.published === 0) ? (
          <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>
            لا توجد بيانات أبحاث للأشهر الستة الماضية.
          </p>
        ) : (
          <div style={{ height: 240 }}>
            <Line
              data={{
                labels: r.paperTrend.map((m) => m.month),
                datasets: [
                  {
                    label: 'مقدَّم',
                    data: r.paperTrend.map((m) => m.submitted),
                    borderColor: c.accent,
                    backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.accent,
                  },
                  {
                    label: 'مقيَّم',
                    data: r.paperTrend.map((m) => m.graded),
                    borderColor: c.gold,
                    backgroundColor: 'rgba(255, 200, 87, 0.08)',
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.gold,
                  },
                  {
                    label: 'منشور',
                    data: r.paperTrend.map((m) => m.published),
                    borderColor: c.success,
                    backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.success,
                  },
                ],
              }}
              options={{ ...cartesianOptions({ legend: true }) }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-sm" style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

export function AdminPlaceholder({
  title,
  subtitle = 'هذه الشاشة تعرض بيانات حية من قاعدة البيانات.',
  icon = Settings,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="page">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid-3">
        <MetricCard icon={Users} label="إجمالي السجلات" value="—" color="brand" />
        <MetricCard icon={TrendingUp} label="نشاط هذا الأسبوع" value="—" color="green" />
        <MetricCard icon={FileText} label="عمليات معلقة" value="—" color="amber" />
      </div>
      <Card title="بيانات تفصيلية" icon={icon}>
        <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)', padding: 'var(--sp-4) 0' }}>
          ستظهر هنا قائمة تفصيلية مع إمكانية البحث والتصفية والتعديل المباشر،
          مرتبطة بالـ API. المخطط الحالي للقاعدة جاهز ويدعم جميع العمليات المطلوبة.
        </p>
      </Card>
    </div>
  );
}

/* ─── Admin: Faculties ────────────────────────────────────── */
export function AdminFacultiesPage() {
  const { data, isPending, isError, error, refetch } = useAdminFaculties();

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </div>
    );
  }

  const totalDepts = data.reduce((s, f) => s + f.departmentCount, 0);
  const totalCourses = data.reduce((s, f) => s + f.courseCount, 0);
  const totalStudents = data.reduce((s, f) => s + f.studentCount, 0);
  const totalTeachers = data.reduce((s, f) => s + f.teacherCount, 0);

  return (
    <div className="page">
      <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />

      <div className="grid-4">
        <MetricCard icon={Building2} label="عدد الكليات" value={data.length} color="brand" />
        <MetricCard icon={School} label="عدد الأقسام" value={totalDepts} color="purple" />
        <MetricCard icon={GraduationCap} label="إجمالي الطلاب" value={totalStudents.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Users} label="هيئة التدريس" value={totalTeachers.toLocaleString('ar-LY')} color="amber" />
      </div>

      <Card title={`الكليات (${data.length})`} icon={Building2} subtitle={`${totalDepts} قسم · ${totalCourses} مقرر`}>
        <div className="flex-col gap-3">
          {data.map((f) => (
            <div
              key={f.id}
              style={{
                padding: 'var(--sp-4)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-1)',
              }}
            >
              <div className="flex items-start gap-3" style={{ marginBottom: f.departments.length ? 'var(--sp-3)' : 0 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--r-md)',
                  background: 'var(--accent-soft)', color: 'var(--accent)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {f.iconEmoji ?? <Building2 size={20} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-md font-semibold" style={{ color: 'var(--text)', fontSize: 'var(--fs-md)' }}>
                      {f.name}
                    </span>
                    {f.nameEn && <span className="text-xs text-subtle font-mono">· {f.nameEn}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-subtle" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                    <span className="font-mono">{f.departmentCount} قسم</span>
                    <span className="font-mono">{f.courseCount} مقرر</span>
                    <span className="font-mono">{f.studentCount.toLocaleString('ar-LY')} طالب</span>
                    <span className="font-mono">{f.teacherCount} عضو هيئة تدريس</span>
                  </div>
                </div>
              </div>

              {f.departments.length > 0 && (
                <div className="grid-auto-200" style={{ gap: 'var(--sp-2)' }}>
                  {f.departments.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: 'var(--sp-3)',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--r-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                        {d.name}
                      </span>
                      <span className="text-xxs text-subtle font-mono">
                        {d.students} طالب · {d.teachers} مدرّس · {d.courses} مقرر
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Admin: Reports ──────────────────────────────────────── */
export function AdminReportsPage() {
  const { data, isPending, isError, error, refetch } = useAdminReports();

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </div>
    );
  }

  const maxBucket = Math.max(1, ...data.paperTrend.map((b) => Math.max(b.submitted, b.graded, b.published)));

  return (
    <div className="page">
      <PageHeader title="التقارير المؤسسية" subtitle="مؤشرات أداء الجامعة على مستوى المخرجات الأكاديمية." />

      <div className="grid-4">
        <MetricCard icon={Microscope} label="إجمالي البحوث" value={data.headline.totalPapers} color="brand" />
        <MetricCard icon={Award} label="بحوث منشورة" value={data.headline.publishedPapers} color="green" />
        <MetricCard icon={GraduationCap} label="طلاب نشطون" value={data.headline.activeStudents.toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={Users} label="إجمالي المستخدمين" value={data.headline.totalUsers.toLocaleString('ar-LY')} color="amber" />
      </div>

      {/* Paper publishing trend */}
      <Card title="حركة البحوث العلمية — آخر 6 أشهر" icon={TrendingUp} subtitle="مرفوعة · مقيَّمة · منشورة">
        <div className="flex-col gap-2">
          {data.paperTrend.map((b) => (
            <div key={b.month} className="trend-row">
              <span className="trend-label">{b.month}</span>
              <div className="trend-bars">
                <div className="trend-bar trend-submitted" title={`مرفوعة: ${b.submitted}`} style={{ width: `${(b.submitted / maxBucket) * 100}%` }}>
                  {b.submitted > 0 && <span className="trend-bar-val">{b.submitted}</span>}
                </div>
                <div className="trend-bar trend-graded" title={`مقيَّمة: ${b.graded}`} style={{ width: `${(b.graded / maxBucket) * 100}%` }}>
                  {b.graded > 0 && <span className="trend-bar-val">{b.graded}</span>}
                </div>
                <div className="trend-bar trend-published" title={`منشورة: ${b.published}`} style={{ width: `${(b.published / maxBucket) * 100}%` }}>
                  {b.published > 0 && <span className="trend-bar-val">{b.published}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 text-xxs text-subtle" style={{ marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <LegendDot color="var(--accent)" label="مرفوعة" />
          <LegendDot color="var(--gold)" label="مقيَّمة" />
          <LegendDot color="var(--success)" label="منشورة" />
        </div>
      </Card>

      {/* Top courses */}
      <Card title="أكثر المقررات تسجيلاً" icon={ClipboardCheck} subtitle={`أعلى ${data.topCourses.length} مقرر بناءً على عدد الطلاب`}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 100 }}>الكود</th>
                <th>اسم المقرر</th>
                <th style={{ width: 120, textAlign: 'center' }}>طلاب مسجَّلون</th>
                <th style={{ width: 120, textAlign: 'center' }}>المحاضرات</th>
              </tr>
            </thead>
            <tbody>
              {data.topCourses.map((c) => (
                <tr key={c.code}>
                  <td className="font-mono text-subtle">{c.code}</td>
                  <td>{c.name}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.enrollments}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.lectures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

/* ─── Admin: Courses ─────────────────────────────────────── */
export function AdminCoursesPage() {
  const { data, isPending, isError, error, refetch } = useAdminCourses();
  const [filter, setFilter] = useState<'all' | string>('all');

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="إدارة المقررات" subtitle="جميع المقررات الجامعية مع إحصائيات حية." />
        <Card><LoadingState /></Card>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="page">
        <PageHeader title="إدارة المقررات" subtitle="جميع المقررات الجامعية مع إحصائيات حية." />
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      </div>
    );
  }

  const faculties = Array.from(new Set(data.map((c) => c.faculty).filter(Boolean))) as string[];
  const visible = filter === 'all' ? data : data.filter((c) => c.faculty === filter);

  const totalEnroll = data.reduce((s, c) => s + c.totalEnrollments, 0);
  const totalLec = data.reduce((s, c) => s + c.totalLectures, 0);
  const totalMat = data.reduce((s, c) => s + c.totalMaterials, 0);
  const avgCredits = data.length ? Math.round((data.reduce((s, c) => s + c.credits, 0) / data.length) * 10) / 10 : 0;

  return (
    <div className="page">
      <PageHeader title="إدارة المقررات" subtitle={`${data.length} مقرر · ${totalEnroll.toLocaleString('ar-LY')} تسجيل`} />

      <div className="grid-4">
        <MetricCard icon={BookOpen} label="إجمالي المقررات" value={data.length} color="brand" />
        <MetricCard icon={GraduationCap} label="تسجيلات الطلاب" value={totalEnroll.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={FileText} label="المحاضرات + المواد" value={(totalLec + totalMat).toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={Award} label="متوسط الساعات" value={avgCredits} color="gold" />
      </div>

      {/* Faculty filter pills */}
      <Card compact>
        <div className="filter-bar">
          <button type="button" className={`pill${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>
            الكل ({data.length})
          </button>
          {faculties.map((f) => {
            const count = data.filter((c) => c.faculty === f).length;
            return (
              <button key={f} type="button" className={`pill${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Courses table */}
      <Card title={`المقررات (${visible.length})`} icon={BookOpen}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 90 }}>الكود</th>
                <th>اسم المقرر</th>
                <th>الكلية / القسم</th>
                <th style={{ width: 80, textAlign: 'center' }}>س.م</th>
                <th style={{ width: 110, textAlign: 'center' }}>تسجيلات</th>
                <th style={{ width: 100, textAlign: 'center' }}>محاضرات</th>
                <th style={{ width: 100, textAlign: 'center' }}>الفصول</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-subtle">{c.code}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      {c.themeColor && (
                        <span style={{ width: 6, height: 24, borderRadius: 3, background: c.themeColor, display: 'inline-block' }} />
                      )}
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td>
                    {c.faculty ? (
                      <div className="flex items-center gap-1">
                        {c.facultyEmoji && <span>{c.facultyEmoji}</span>}
                        <span className="text-xs text-muted">{c.faculty}</span>
                        {c.department && <span className="text-xxs text-subtle">· {c.department}</span>}
                      </div>
                    ) : (
                      <span className="text-xxs text-subtle">—</span>
                    )}
                  </td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.credits}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.totalEnrollments}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.totalLectures}</td>
                  <td className="font-mono" style={{ textAlign: 'center' }}>{c.offeringCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
