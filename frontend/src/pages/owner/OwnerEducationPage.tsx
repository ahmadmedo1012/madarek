import { BookOpen, Users, Calendar, TrendingUp } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Card, MetricCard, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { cartesianOptions } from '../../lib/chartTheme';
import { useOwnerEducation } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

export function OwnerEducationPage() {
  const q = useOwnerEducation();

  if (q.isPending) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النظرة التعليميّة</h1>
            <p className="page-subtitle">جارٍ جمع البيانات…</p>
          </div>
        </div>
        <LoadingState />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النظرة التعليميّة</h1>
          </div>
        </div>
        <ErrorState />
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

  const barData = {
    labels: byFaculty.map((f) => f.name),
    datasets: [{
      label: 'عدد المقررات',
      data: byFaculty.map((f) => f.courseCount),
      backgroundColor: 'rgba(163, 201, 255, 0.6)',
      borderColor: '#a3c9ff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };
  const barOptions = { ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const };

  const trendHasData = attendanceTrend.some((t) => t.attendancePct !== null);
  const lineData = {
    labels: attendanceTrend.map((t) => t.month),
    datasets: [{
      label: 'نسبة الحضور %',
      data: attendanceTrend.map((t) => t.attendancePct ?? null),
      borderColor: '#3DD68C',
      backgroundColor: 'rgba(61, 214, 140, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#3DD68C',
      spanGaps: true,
    }],
  };
  const lineOptions = {
    ...cartesianOptions(),
    scales: {
      ...cartesianOptions().scales,
      y: { ...cartesianOptions().scales!.y, min: 0, max: 100 },
    },
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النظرة التعليميّة</h1>
          <p className="page-subtitle">إحصائيات حيّة عن المقررات وأعضاء هيئة التدريس والطلاب</p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={BookOpen} label="إجمالي المقرّرات" value={totals.totalCourses.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Users} label="عدد الأساتذة" value={totals.teachers.toLocaleString('ar-LY')} color="green" />
        <MetricCard icon={Calendar} label="العروض النشطة" value={totals.totalOfferings.toLocaleString('ar-LY')} color="purple" />
        <MetricCard icon={TrendingUp} label="متوسط التسجيل / عرض" value={totals.avgEnrolment.toLocaleString('ar-LY')} color="gold" />
      </div>

      <Card title="المقرّرات حسب الكلّيّة" subtitle={`أعلى ${byFaculty.length} كلّيّة`}>
        {byFaculty.length === 0 ? (
          <EmptyState title="لا مقرّرات بعد" description="ستظهر هنا حين تُسجَّل مقرّرات على نظام الكلّيّات." />
        ) : (
          <div className="owner-chart-container" style={{ height: Math.max(220, byFaculty.length * 36) }}>
            <Bar data={barData} options={barOptions} />
          </div>
        )}
      </Card>

      <Card title="أكثر المقرّرات تسجيلاً">
        {topCourses.length === 0 ? (
          <EmptyState title="لا تسجيلات بعد" />
        ) : (
          <table className="owner-table">
            <thead>
              <tr>
                <th>الرمز</th>
                <th>اسم المقرّر</th>
                <th>الكلّيّة</th>
                <th>المسجَّلون</th>
              </tr>
            </thead>
            <tbody>
              {topCourses.map((c) => (
                <tr key={c.code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{c.code}</td>
                  <td>{c.name}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{c.facultyName}</td>
                  <td style={{ fontWeight: 600 }}>{c.enrolled.toLocaleString('ar-LY')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="توزيع حِمل أعضاء هيئة التدريس" subtitle={`عدد الأساتذة الذين يُدرِّسون N من العروض هذا الفصل`}>
        <div style={{ padding: 'var(--sp-3) 0', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <ProgressBar
            value={pct(workloadBuckets.idle)}
            label={`بدون عرض هذا الفصل (${workloadBuckets.idle.toLocaleString('ar-LY')} أستاذ)`}
            color="#9CA3AF"
          />
          <ProgressBar
            value={pct(workloadBuckets.one)}
            label={`عرض واحد (${workloadBuckets.one.toLocaleString('ar-LY')} أستاذ)`}
            color="#a3c9ff"
          />
          <ProgressBar
            value={pct(workloadBuckets.two)}
            label={`عرضان (${workloadBuckets.two.toLocaleString('ar-LY')} أستاذ)`}
            color="#3DD68C"
          />
          <ProgressBar
            value={pct(workloadBuckets.three)}
            label={`٣ عروض (${workloadBuckets.three.toLocaleString('ar-LY')} أستاذ)`}
            color="#e9c349"
          />
          <ProgressBar
            value={pct(workloadBuckets.fourPlus)}
            label={`٤ فأكثر (${workloadBuckets.fourPlus.toLocaleString('ar-LY')} أستاذ)`}
            color="#F5A623"
          />
        </div>
      </Card>

      <Card title="اتّجاه الحضور" subtitle="آخر ٦ أشهر — يُحسب من سجلات الحضور الفعليّة">
        {!trendHasData ? (
          <EmptyState title="لا توجد سجلّات حضور بعد" description="يبدأ الحساب فور تسجيل أوّل جلسة حضور على المنصّة." />
        ) : (
          <div className="owner-chart-container">
            <Line data={lineData} options={lineOptions} />
          </div>
        )}
      </Card>
    </div>
  );
}
