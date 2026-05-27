import { BookOpen, Users, Calendar, TrendingUp } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Card, MetricCard, ProgressBar } from '../../components/primitives';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

const FACULTIES = [
  { name: 'الهندسة', courses: 32 },
  { name: 'العلوم', courses: 28 },
  { name: 'الطب', courses: 24 },
  { name: 'الآداب', courses: 22 },
  { name: 'الاقتصاد', courses: 20 },
  { name: 'القانون', courses: 18 },
  { name: 'تقنية المعلومات', courses: 26 },
  { name: 'التربية', courses: 16 },
];

const TOP_COURSES = [
  { code: 'CS101', name: 'مقدمة في علوم الحاسوب', faculty: 'تقنية المعلومات', enrolled: 312 },
  { code: 'ENG201', name: 'الدوائر الكهربائية', faculty: 'الهندسة', enrolled: 285 },
  { code: 'MATH101', name: 'التفاضل والتكامل 1', faculty: 'العلوم', enrolled: 268 },
  { code: 'BIO101', name: 'علم الأحياء العام', faculty: 'العلوم', enrolled: 245 },
  { code: 'LAW101', name: 'مبادئ القانون', faculty: 'القانون', enrolled: 232 },
  { code: 'ECO201', name: 'الاقتصاد الكلي', faculty: 'الاقتصاد', enrolled: 218 },
  { code: 'MED101', name: 'التشريح العام', faculty: 'الطب', enrolled: 195 },
  { code: 'EDU301', name: 'مناهج البحث التربوي', faculty: 'التربية', enrolled: 178 },
];

export function OwnerEducationPage() {
  const barData = {
    labels: FACULTIES.map((f) => f.name),
    datasets: [{
      label: 'عدد المقررات',
      data: FACULTIES.map((f) => f.courses),
      backgroundColor: 'rgba(163, 201, 255, 0.6)',
      borderColor: '#a3c9ff',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'var(--chart-grid)' },
        ticks: { color: 'var(--chart-text)', font: { family: 'IBM Plex Sans Arabic', size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: 'var(--chart-text)', font: { family: 'IBM Plex Sans Arabic', size: 11 } },
      },
    },
  };

  const lineData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [{
      label: 'نسبة الحضور %',
      data: [72, 75, 78, 74, 80, 83],
      borderColor: '#3DD68C',
      backgroundColor: 'rgba(61, 214, 140, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#3DD68C',
    }],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { color: 'var(--chart-grid)' },
        ticks: { color: 'var(--chart-text)', font: { family: 'IBM Plex Sans Arabic', size: 11 } },
      },
      y: {
        min: 60,
        max: 100,
        grid: { color: 'var(--chart-grid)' },
        ticks: { color: 'var(--chart-text)', font: { family: 'IBM Plex Sans Arabic', size: 11 } },
      },
    },
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النظرة التعليمية</h1>
          <p className="page-subtitle">إحصائيات المقررات والأساتذة والطلاب</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-4">
        <MetricCard icon={BookOpen} label="إجمالي المقررات" value="186" color="brand" />
        <MetricCard icon={Users} label="عدد الأساتذة" value="420" color="green" />
        <MetricCard icon={Calendar} label="العروض النشطة" value="312" color="purple" />
        <MetricCard icon={TrendingUp} label="متوسط التسجيل" value="39.7" color="gold" />
      </div>

      {/* Courses per Faculty - Bar Chart */}
      <Card title="المقررات حسب الكلية">
        <div className="owner-chart-container" style={{ height: 320 }}>
          <Bar data={barData} options={barOptions} />
        </div>
      </Card>

      {/* Top Courses Table */}
      <Card title="أكثر المقررات تسجيلاً">
        <table className="owner-table">
          <thead>
            <tr>
              <th>الرمز</th>
              <th>اسم المقرر</th>
              <th>الكلية</th>
              <th>المسجلون</th>
            </tr>
          </thead>
          <tbody>
            {TOP_COURSES.map((c) => (
              <tr key={c.code}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{c.code}</td>
                <td>{c.name}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-xs)' }}>{c.faculty}</td>
                <td style={{ fontWeight: 600 }}>{c.enrolled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Professor Workload */}
      <Card title="توزيع حِمل الأساتذة">
        <div style={{ padding: 'var(--sp-3) 0', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <ProgressBar value={35} label="مقرر واحد (147 أستاذ)" color="#a3c9ff" />
          <ProgressBar value={40} label="مقرران (168 أستاذ)" color="#3DD68C" />
          <ProgressBar value={18} label="3 مقررات (76 أستاذ)" color="#e9c349" />
          <ProgressBar value={7} label="4+ مقررات (29 أستاذ)" color="#F5A623" />
        </div>
      </Card>

      {/* Attendance Trend - Line Chart */}
      <Card title="اتجاه الحضور (آخر 6 أشهر)">
        <div className="owner-chart-container">
          <Line data={lineData} options={lineOptions} />
        </div>
      </Card>
    </div>
  );
}
