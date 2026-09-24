import { useState } from 'react';
import {
  Building2, GraduationCap, School, BookOpen,
  BarChart3, FileText, Users, TrendingUp,
  Award, Microscope, ClipboardCheck,
} from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import {
  EmptyState, ErrorState, PageSkeleton,
  KpiSkeleton, CardSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useAdminStats, useAdminFaculties, useAdminReports, useAdminCourses } from '../../hooks/useResources';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import { cartesianOptions, valueLabels, chartColors, useChartThemeKey } from '../../lib/chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip);

export function AdminDashboardPage() {
  const stats = useAdminStats();
  const facs = useAdminFaculties();
  const reports = useAdminReports();
  const c = chartColors();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

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
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الإدارة</h1>
          <p className="page-subtitle">إحصائيات حيّة عن طلاب وأساتذة جامعة الزاوية.</p>
        </div>
      </header>

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
        <Card title="توزّع الطلاب حسب الكلية" icon={BarChart3} subtitle={topByStudents.length > 0 ? `أعلى ${topByStudents.length} كلّيّة من حيث عدد الطلاب` : undefined}>
          {topByStudents.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="لا توجد بيانات طلاب بعد"
              description="ستظهر التوزيعة هنا فور تسجيل الطلاب في الكليات."
            />
          ) : (
            <ChartFrame
              ariaLabel={`توزيع الطلاب حسب الكلية — ${topByStudents.length} كليات الأعلى عددًا`}
              summary={topFaculty ? `أعلى كلية عددًا للطلاب: ${topFaculty.name} بـ${topFaculty.studentCount.toLocaleString('ar-LY')} طالبًا.` : undefined}
              height={Math.max(180, topByStudents.length * 36)}
              table={{
                caption: 'توزيع الطلاب حسب الكلية',
                columns: ['الكلية', 'عدد الطلاب'],
                rows: topByStudents.map((row) => [row.name, row.studentCount]),
              }}
            >
              <Bar
                key={themeKey}
                data={{
                  labels: topByStudents.map((row) => row.name),
                  datasets: [{
                    label: 'عدد الطلاب',
                    data: topByStudents.map((row) => row.studentCount),
                    backgroundColor: `color-mix(in srgb, ${c.accent} 55%, transparent)`,
                    borderColor: c.accent,
                    borderWidth: 1,
                    borderRadius: 6,
                    maxBarThickness: 22,
                  }],
                }}
                plugins={[valueLabels]}
                options={{ ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const }}
              />
            </ChartFrame>
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
          <EmptyState
            icon={TrendingUp}
            title="لا توجد بيانات أبحاث بعد"
            description="ستظهر حركة النشر هنا بعد رفع أول بحث إلى المنصة."
          />
        ) : (
          <ChartFrame
            ariaLabel="نشاط الإنتاج العلمي في الأشهر الستة الأخيرة — أبحاث مقدَّمة ومقيَّمة ومنشورة شهريًا"
            summary="مقارنة حركة البحوث المرفوعة والمقيَّمة والمنشورة على مدى الأشهر الستة الأخيرة."
            height={240}
            table={{
              caption: 'نشاط الإنتاج العلمي شهريًا',
              columns: ['الشهر', 'مقدَّم', 'مقيَّم', 'منشور'],
              rows: r.paperTrend.map((m) => [m.month, m.submitted, m.graded, m.published]),
            }}
          >
            <Line
              key={themeKey}
              data={{
                labels: r.paperTrend.map((m) => m.month),
                datasets: [
                  {
                    label: 'مقدَّم',
                    data: r.paperTrend.map((m) => m.submitted),
                    borderColor: c.accent,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.accent,
                  },
                  {
                    label: 'مقيَّم',
                    data: r.paperTrend.map((m) => m.graded),
                    borderColor: c.gold,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.gold,
                  },
                  {
                    label: 'منشور',
                    data: r.paperTrend.map((m) => m.published),
                    borderColor: c.success,
                    fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
                    pointBackgroundColor: c.success,
                  },
                ],
              }}
              options={cartesianOptions({ legend: true, gradientFill: true })}
            />
          </ChartFrame>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-stat-row">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-mono text-sm admin-stat-value">{value}</span>
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
    </header>
  );
}

/* ─── Admin: Faculties ────────────────────────────────────── */
export function AdminFacultiesPage() {
  const { data, isPending, isError, error, refetch } = useAdminFaculties();

  if (isPending) {
    return (
      <div className="page">
        <PageHeader title="الكليات والأقسام" subtitle="جميع كليات الجامعة وأقسامها مع إحصائيات حية." />
        <KpiSkeleton />
        <CardSkeleton lines={7} />
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
            <div key={f.id} className="admin-faculty-card">
              <div className={`admin-faculty-head${f.departments.length > 0 ? ' has-depts' : ''}`}>
                <div className="admin-faculty-icon">
                  <EmojiIcon emoji={f.iconEmoji ?? undefined} fallback={Building2} size={22} />
                </div>
                <div className="admin-faculty-body">
                  <div className="admin-faculty-titles">
                    <span className="admin-faculty-name">{f.name}</span>
                    {f.nameEn && (
                      <span className="admin-faculty-name-en font-mono text-xs text-subtle">
                        · <bdi>{f.nameEn}</bdi>
                      </span>
                    )}
                  </div>
                  <div className="admin-faculty-meta">
                    <span className="font-mono">{f.departmentCount} قسم</span>
                    <span className="font-mono">{f.courseCount} مقرر</span>
                    <span className="font-mono">{f.studentCount.toLocaleString('ar-LY')} طالب</span>
                    <span className="font-mono">{f.teacherCount} عضو هيئة تدريس</span>
                  </div>
                </div>
              </div>

              {f.departments.length > 0 && (
                <div className="admin-faculty-depts">
                  {f.departments.map((d) => (
                    <div key={d.id} className="admin-faculty-dept">
                      <span className="admin-faculty-dept-name">{d.name}</span>
                      <span className="admin-faculty-dept-meta font-mono">
                        {d.students} طالب · {d.teachers} مدرّس · {d.courses} مقرر
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {data.length === 0 && (
            <EmptyState
              icon={Building2}
              title="لم تُسجَّل كليات بعد"
              description="ستظهر الكليات وأقسامها هنا فور إضافتها إلى قاعدة البيانات."
            />
          )}
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
        <KpiSkeleton />
        <CardSkeleton lines={6} />
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
        {data.paperTrend.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="لا توجد بيانات نشر بعد"
            description="ستظهر حركة البحوث هنا بعد رفع أول بحث."
          />
        ) : (
          <div className="flex-col gap-2">
            {data.paperTrend.map((b) => (
              <div key={b.month} className="trend-row">
                <span className="trend-label">{b.month}</span>
                <div className="trend-bars">
                  <div
                    className="trend-bar trend-submitted"
                    title={`مرفوعة: ${b.submitted}`}
                    style={{ width: `${(b.submitted / maxBucket) * 100}%` }}
                  >
                    {b.submitted > 0 && <span className="trend-bar-val">{b.submitted}</span>}
                  </div>
                  <div
                    className="trend-bar trend-graded"
                    title={`مقيَّمة: ${b.graded}`}
                    style={{ width: `${(b.graded / maxBucket) * 100}%` }}
                  >
                    {b.graded > 0 && <span className="trend-bar-val">{b.graded}</span>}
                  </div>
                  <div
                    className="trend-bar trend-published"
                    title={`منشورة: ${b.published}`}
                    style={{ width: `${(b.published / maxBucket) * 100}%` }}
                  >
                    {b.published > 0 && <span className="trend-bar-val">{b.published}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="trend-legend">
          <LegendDot color="var(--accent)" label="مرفوعة" />
          <LegendDot color="var(--gold)" label="مقيَّمة" />
          <LegendDot color="var(--success)" label="منشورة" />
        </div>
      </Card>

      {/* Top courses */}
      <Card title="أكثر المقررات تسجيلاً" icon={ClipboardCheck} subtitle={data.topCourses.length > 0 ? `أعلى ${data.topCourses.length} مقرر بناءً على عدد الطلاب` : undefined}>
        {data.topCourses.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="لا توجد تسجيلات بعد"
            description="ستظهر المقررات الأعلى تسجيلاً هنا فور تسجيل الطلاب في مقرراتهم."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>الكود</th>
                  <th>اسم المقرر</th>
                  <th className="admin-table-num" style={{ width: 130 }}>طلاب مسجَّلون</th>
                  <th className="admin-table-num" style={{ width: 110 }}>المحاضرات</th>
                </tr>
              </thead>
              <tbody>
                {data.topCourses.map((c) => (
                  <tr key={c.code}>
                    <td className="font-mono text-subtle" data-label="الكود"><bdi>{c.code}</bdi></td>
                    <td data-label="اسم المقرر">{c.name}</td>
                    <td className="admin-table-num font-mono" data-label="طلاب مسجَّلون">{c.enrollments}</td>
                    <td className="admin-table-num font-mono" data-label="المحاضرات">{c.lectures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="trend-legend-item">
      <span className="trend-legend-dot" style={{ background: color }} />
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
        <KpiSkeleton />
        <TableSkeleton rows={6} cols={7} />
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
        <div className="filter-bar" role="group" aria-label="تصفية المقررات حسب الكلية">
          <button
            type="button"
            className={`pill${filter === 'all' ? ' on' : ''}`}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            الكل ({data.length})
          </button>
          {faculties.map((f) => {
            const count = data.filter((c) => c.faculty === f).length;
            return (
              <button
                key={f}
                type="button"
                className={`pill${filter === f ? ' on' : ''}`}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Courses table */}
      <Card title={`المقررات (${visible.length})`} icon={BookOpen}>
        <div className="table-wrap">
          <table className="table tbl-stack">
            <thead>
              <tr>
                <th style={{ width: 100 }}>الكود</th>
                <th>اسم المقرر</th>
                <th>الكلية / القسم</th>
                <th className="admin-table-num" style={{ width: 70 }}>س.م</th>
                <th className="admin-table-num" style={{ width: 110 }}>تسجيلات</th>
                <th className="admin-table-num" style={{ width: 100 }}>محاضرات</th>
                <th className="admin-table-num" style={{ width: 100 }}>الفصول</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="لا توجد مقررات في هذه الكلية"
                      description="اختر كلية أخرى أو أعد ضبط التصفية لعرض جميع المقررات."
                      action={
                        <button type="button" className="btn ghost sm" onClick={() => setFilter('all')}>
                          عرض جميع المقررات
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-subtle" data-label="الكود"><bdi>{c.code}</bdi></td>
                  <td data-label="اسم المقرر">
                    <div className="flex items-center gap-2">
                      {c.themeColor && (
                        <span className="admin-course-tint" style={{ background: c.themeColor }} aria-hidden />
                      )}
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                    </div>
                  </td>
                  <td data-label="الكلية / القسم">
                    {c.faculty ? (
                      <div className="flex items-center gap-1">
                        <EmojiIcon emoji={c.facultyEmoji} fallback={BookOpen} size={16} className="text-subtle" />
                        <span className="text-xs text-muted">{c.faculty}</span>
                        {c.department && <span className="text-xxs text-subtle">· {c.department}</span>}
                      </div>
                    ) : (
                      <span className="text-xxs text-subtle">—</span>
                    )}
                  </td>
                  <td className="admin-table-num font-mono" data-label="ساعات معتمدة">{c.credits}</td>
                  <td className="admin-table-num font-mono" data-label="تسجيلات">{c.totalEnrollments}</td>
                  <td className="admin-table-num font-mono" data-label="محاضرات">{c.totalLectures}</td>
                  <td className="admin-table-num font-mono" data-label="الفصول">{c.offeringCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
