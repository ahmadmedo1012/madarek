import type { CSSProperties } from 'react';
import { BookOpen, Users, Calendar, TrendingUp } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Card, MetricCard, ProgressBar } from '../../components/primitives';
import {
  ErrorState, EmptyState, KpiSkeleton, ChartSkeleton, TableSkeleton, ListSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerEducation } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

/** Proper Arabic counted plural for teacher counts (bucket labels). */
function teachersCountLabel(n: number): string {
  if (n === 0) return 'لا أساتذة';
  if (n === 1) return 'أستاذ واحد';
  if (n === 2) return 'أستاذان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} أساتذة`;
  return `${n.toLocaleString('ar-LY')} أستاذاً`;
}

/** Proper Arabic counted plural for the faculty count (chart summary). */
function facultiesCountLabel(n: number): string {
  if (n === 1) return 'كلية واحدة';
  if (n === 2) return 'كليتان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} كليات`;
  return `${n.toLocaleString('ar-LY')} كلية`;
}

export function OwnerEducationPage() {
  const q = useOwnerEducation();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  if (q.isPending) {
    return (
      <div className="page" aria-busy="true">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النظرة التعليميّة</h1>
            <p className="page-subtitle">جارٍ جمع البيانات…</p>
          </div>
        </header>
        {/* Shape-matched skeletons — one per card the data will fill. */}
        <KpiSkeleton />
        <Card title="المقرّرات حسب الكلّيّة"><ChartSkeleton height={240} /></Card>
        <Card title="أكثر المقرّرات تسجيلاً"><TableSkeleton rows={5} cols={4} /></Card>
        <Card title="توزيع حِمل أعضاء هيئة التدريس"><ListSkeleton rows={5} /></Card>
        <Card title="اتّجاه الحضور"><ChartSkeleton height={240} /></Card>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النظرة التعليميّة</h1>
          </div>
        </header>
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }

  const d = q.data;
  const { totals, byFaculty, topCourses, workloadBuckets, attendanceTrend } = d;

  const totalTeachers =
    workloadBuckets.idle +
    workloadBuckets.one +
    workloadBuckets.two +
    workloadBuckets.three +
    workloadBuckets.fourPlus;
  const pct = (n: number) => (totalTeachers > 0 ? Math.round((n / totalTeachers) * 100) : 0);

  const c = chartColors();
  // Build the shared chart options ONCE per render (each cartesianOptions()
  // call resolves CSS custom properties — it is not free).
  const baseOpts = cartesianOptions();

  const barData = {
    labels: byFaculty.map((f) => f.name),
    datasets: [{
      label: 'عدد المقررات',
      data: byFaculty.map((f) => f.courseCount),
      backgroundColor: `color-mix(in srgb, ${c.accent} 60%, transparent)`,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 4,
    }],
  };
  const barOptions = { ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const };
  const barHeight = Math.max(220, byFaculty.length * 36);

  const trendHasData = attendanceTrend.some((t) => t.attendancePct !== null);
  const lineData = {
    labels: attendanceTrend.map((t) => t.month),
    datasets: [{
      label: 'نسبة الحضور %',
      data: attendanceTrend.map((t) => t.attendancePct ?? null),
      borderColor: c.success,
      backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: c.success,
      spanGaps: true,
    }],
  };
  const lineOptions = {
    ...baseOpts,
    scales: {
      ...baseOpts.scales,
      y: { ...baseOpts.scales!.y, min: 0, max: 100 },
    },
  };
  const trendMax = attendanceTrend.length > 0
    ? Math.max(...attendanceTrend.map((t) => t.attendancePct ?? 0))
    : 0;

  // Workload buckets — share-of-teachers meters (owner.css §6-b); the
  // staggered fill on load is the page's authored moment.
  const buckets: Array<{ label: string; n: number; color: string; aria: string }> = [
    { label: 'بدون عرض هذا الفصل', n: workloadBuckets.idle, color: 'var(--neutral-400)', aria: 'نسبة الأساتذة بدون عرض هذا الفصل' },
    { label: 'عرض واحد', n: workloadBuckets.one, color: c.accent, aria: 'نسبة الأساتذة بعرض واحد هذا الفصل' },
    { label: 'عرضان', n: workloadBuckets.two, color: c.success, aria: 'نسبة الأساتذة بعرضين هذا الفصل' },
    { label: '3 عروض', n: workloadBuckets.three, color: c.gold, aria: 'نسبة الأساتذة بثلاثة عروض هذا الفصل' },
    { label: '4 فأكثر', n: workloadBuckets.fourPlus, color: c.warning, aria: 'نسبة الأساتذة بأربعة عروض فأكثر هذا الفصل' },
  ];

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النظرة التعليميّة</h1>
          <p className="page-subtitle">إحصائيات حيّة عن المقرّرات وأعضاء هيئة التدريس والطلاب</p>
        </div>
      </header>

      <div className="grid-4">
        <MetricCard icon={BookOpen} label="إجمالي المقرّرات" value={totals.totalCourses.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Users} label="عدد الأساتذة" value={totals.teachers.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Calendar} label="العروض النشطة" value={totals.totalOfferings.toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={TrendingUp} label="متوسط التسجيل في العرض" value={totals.avgEnrolment.toLocaleString('ar-LY')} color="gold" />
      </div>

      <Card title="المقرّرات حسب الكلّيّة" subtitle="عدد المقرّرات المُدرَّجة في كل كلّيّة">
        {byFaculty.length === 0 ? (
          <EmptyState title="لا مقرّرات بعد" description="ستظهر هنا حين تُسجَّل مقرّرات على نظام الكلّيّات." />
        ) : (
          <ChartFrame
            ariaLabel="مخطط أعمدة أفقي — عدد المقرّرات في كل كلّيّة"
            summary={`${facultiesCountLabel(byFaculty.length)} بها مقرّرات؛ أكبرها ${byFaculty.reduce((a, b) => (b.courseCount > a.courseCount ? b : a)).name}.`}
            table={{
              caption: 'المقرّرات حسب الكلّيّة',
              columns: ['الكلّيّة', 'عدد المقرّرات'],
              rows: byFaculty.map((f) => [f.name, f.courseCount]),
            }}
            height={barHeight}
          >
            <Bar key={themeKey} data={barData} options={barOptions} />
          </ChartFrame>
        )}
      </Card>

      <Card title="أكثر المقرّرات تسجيلاً">
        {topCourses.length === 0 ? (
          <EmptyState title="لا تسجيلات بعد" description="ستظهر المقرّرات الأكثر تسجيلاً فور تسجيل الطلاب في العروض." />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th>الرمز</th>
                  <th>اسم المقرّر</th>
                  <th>الكلّيّة</th>
                  <th>المسجَّلون</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.map((course) => (
                  <tr key={course.code}>
                    <td data-label="الرمز"><bdi className="owner-num" dir="ltr">{course.code}</bdi></td>
                    <td className="tbl-strong" data-label="اسم المقرّر">{course.name}</td>
                    <td data-label="الكلّيّة" className="owner-cell-muted">{course.facultyName}</td>
                    <td className="owner-num" data-label="المسجَّلون">{course.enrolled.toLocaleString('ar-LY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="توزيع حِمل أعضاء هيئة التدريس"
        subtitle="نسبة الأساتذة حسب عدد العروض التي يُدرِّسونها هذا الفصل"
      >
        {totalTeachers === 0 ? (
          <EmptyState title="لا يوجد أساتذة بعد" description="يُحسب التوزيع فور إسناد أوّل عرض لمقرّر." />
        ) : (
          <div className="owner-workload">
            {buckets.map((b, i) => (
              <div key={b.label} className="owner-meter" style={{ '--meter-i': i } as CSSProperties}>
                <ProgressBar
                  value={pct(b.n)}
                  label={`${b.label} (${teachersCountLabel(b.n)})`}
                  ariaLabel={b.aria}
                  color={b.color}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="اتّجاه الحضور" subtitle="آخر 6 أشهر — يُحسب من سجلات الحضور الفعليّة">
        {!trendHasData ? (
          <EmptyState title="لا توجد سجلّات حضور بعد" description="يبدأ الحساب فور تسجيل أوّل جلسة حضور على المنصّة." />
        ) : (
          <ChartFrame
            ariaLabel="مخطط خطّي لاتّجاه نسبة الحضور الشهريّة على مدى آخر ستة أشهر"
            summary={`أعلى نسبة حضور مسجَّلة ${trendMax}%.`}
            table={{
              caption: 'اتّجاه الحضور الشهري',
              columns: ['الشهر', 'نسبة الحضور %'],
              rows: attendanceTrend.map((t) => [t.month, t.attendancePct ?? '—']),
            }}
            height={240}
          >
            <Line key={themeKey} data={lineData} options={lineOptions} />
          </ChartFrame>
        )}
      </Card>
    </div>
  );
}
