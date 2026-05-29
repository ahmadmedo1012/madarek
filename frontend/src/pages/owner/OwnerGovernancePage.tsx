import { ShieldCheck, UserPlus, Key, TrendingUp } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Card, MetricCard } from '../../components/primitives';
import { useOwnerGovernance, useOwnerLoginAnalytics } from '../../hooks/useOwner';
import type { GovernanceMetrics, LoginAnalytics } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

const FALLBACK_GOVERNANCE: GovernanceMetrics = {
  permissionChanges: 34,
  roleChanges: 12,
  newUsersThisMonth: 156,
  weeklyGrowth: [
    { week: 'أسبوع 1', count: 18 },
    { week: 'أسبوع 2', count: 22 },
    { week: 'أسبوع 3', count: 15 },
    { week: 'أسبوع 4', count: 28 },
    { week: 'أسبوع 5', count: 20 },
    { week: 'أسبوع 6', count: 25 },
    { week: 'أسبوع 7', count: 30 },
    { week: 'أسبوع 8', count: 32 },
  ],
};

const FALLBACK_LOGIN: LoginAnalytics = {
  total: 8420,
  successCount: 7980,
  failureCount: 440,
  daily: [
    { date: '2024-12-21', success: 1100, failure: 55 },
    { date: '2024-12-22', success: 1050, failure: 62 },
    { date: '2024-12-23', success: 1200, failure: 70 },
    { date: '2024-12-24', success: 1150, failure: 58 },
    { date: '2024-12-25', success: 1180, failure: 65 },
    { date: '2024-12-26', success: 1100, failure: 68 },
    { date: '2024-12-27', success: 1200, failure: 62 },
  ],
  topReasons: [
    { reason: 'كلمة مرور خاطئة', count: 320 },
    { reason: 'حساب معطل', count: 85 },
    { reason: 'انتهاء الجلسة', count: 35 },
  ],
};

export function OwnerGovernancePage() {
  const governance = useOwnerGovernance();
  const loginAnalytics = useOwnerLoginAnalytics();
  const govData = governance.data ?? FALLBACK_GOVERNANCE;
  const loginData = loginAnalytics.data ?? FALLBACK_LOGIN;

  const growthChartData = {
    labels: govData.weeklyGrowth.map((w) => w.week),
    datasets: [
      {
        label: 'مستخدمون جدد',
        data: govData.weeklyGrowth.map((w) => w.count),
        borderColor: '#a3c9ff',
        backgroundColor: 'rgba(163, 201, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#a3c9ff',
      },
    ],
  };

  const growthOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic', size: 11 } } },
      y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { font: { family: 'IBM Plex Sans Arabic', size: 11 } } },
    },
  };

  const doughnutData = {
    labels: ['ناجح', 'فاشل'],
    datasets: [
      {
        data: [loginData.successCount, loginData.failureCount],
        backgroundColor: ['#3DD68C', '#F5A623'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        rtl: true,
        labels: {
          color: 'var(--text-muted)',
          font: { family: 'IBM Plex Sans Arabic', size: 12 },
          padding: 16,
        },
      },
    },
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الحوكمة المتقدمة</h1>
          <p className="page-subtitle">تتبع الصلاحيات والنمو وتحليل تسجيلات الدخول</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid-3">
        <MetricCard icon={Key} label="تغييرات الصلاحيات" value={govData.permissionChanges.toString()} color="purple" />
        <MetricCard icon={ShieldCheck} label="تغييرات الأدوار" value={govData.roleChanges.toString()} color="brand" />
        <MetricCard icon={UserPlus} label="مستخدمون جدد هذا الشهر" value={govData.newUsersThisMonth.toString()} color="green" />
      </div>

      {/* Charts */}
      <div className="owner-ai-chart-grid">
        <Card title="نمو المستخدمين (8 أسابيع)">
          <div className="owner-chart-container">
            <Line data={growthChartData} options={growthOptions} />
          </div>
        </Card>

        <Card title="تسجيلات الدخول: نجاح / فشل">
          <div className="owner-chart-container">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </Card>
      </div>

      {/* Login Analytics */}
      <div className="owner-governance-section">
        <Card title="تفاصيل تسجيلات الدخول اليومية">
          <table className="owner-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>ناجح</th>
                <th>فاشل</th>
              </tr>
            </thead>
            <tbody>
              {loginData.daily.map((d) => (
                <tr key={d.date}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{d.date}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{d.success}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--warning)' }}>{d.failure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Top Failure Reasons */}
      <Card title="أسباب فشل تسجيل الدخول">
        <table className="owner-table">
          <thead>
            <tr>
              <th>السبب</th>
              <th>العدد</th>
            </tr>
          </thead>
          <tbody>
            {loginData.topReasons.map((r) => (
              <tr key={r.reason}>
                <td>{r.reason}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
