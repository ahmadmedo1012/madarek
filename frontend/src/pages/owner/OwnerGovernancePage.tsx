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
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { cartesianOptions, radialOptions , chartColors} from '../../lib/chartTheme';
import { useOwnerGovernance, useOwnerLoginAnalytics } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

export function OwnerGovernancePage() {
  const governance = useOwnerGovernance();
  const loginAnalytics = useOwnerLoginAnalytics();
  const govData = governance.data;
  const loginData = loginAnalytics.data;
  const c = chartColors();

  const isPending = governance.isPending || loginAnalytics.isPending;
  const isError = governance.isError || loginAnalytics.isError;

  const growthChartData = govData ? {
    labels: govData.weeklyGrowth.map((w) => w.week),
    datasets: [
      {
        label: 'مستخدمون جدد',
        data: govData.weeklyGrowth.map((w) => w.count),
        borderColor: c.accent,
        backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: c.accent,
      },
    ],
  } : null;

  const growthOptions = cartesianOptions();

  const doughnutData = loginData ? {
    labels: ['ناجح', 'فاشل'],
    datasets: [
      {
        data: [loginData.successCount, loginData.failureCount],
        backgroundColor: [c.success, c.warning],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  } : null;

  const doughnutOptions = radialOptions({ legend: true });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الحوكمة المتقدّمة</h1>
          <p className="page-subtitle">تتبّع الصلاحيات والنموّ وتحليل تسجيلات الدخول</p>
        </div>
      </div>

      {isPending ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !govData || !loginData ? (
        <EmptyState title="لا توجد بيانات حوكمة بعد" />
      ) : (
        <>
          {/* Metrics — real values */}
          <div className="grid-3">
            <MetricCard icon={Key} label="تغييرات الصلاحيات" value={govData.permissionChanges.toLocaleString('ar-LY')} color="purple" />
            <MetricCard icon={ShieldCheck} label="تغييرات الأدوار" value={govData.roleChanges.toLocaleString('ar-LY')} color="brand" />
            <MetricCard icon={UserPlus} label="مستخدمون جدد هذا الشهر" value={govData.newUsersThisMonth.toLocaleString('ar-LY')} color="green" />
          </div>

          <div className="owner-ai-chart-grid">
            <Card title="نموّ المستخدمين (8 أسابيع)">
              {govData.weeklyGrowth.length === 0 ? (
                <EmptyState title="لا توجد بيانات نموّ بعد" />
              ) : (
                <div className="owner-chart-container">
                  <Line data={growthChartData!} options={growthOptions} />
                </div>
              )}
            </Card>

            <Card title="تسجيلات الدخول: نجاح / فشل">
              {loginData.total === 0 ? (
                <EmptyState title="لا توجد محاولات دخول بعد" />
              ) : (
                <div className="owner-chart-container">
                  <Doughnut data={doughnutData!} options={doughnutOptions} />
                </div>
              )}
            </Card>
          </div>

          <div className="owner-governance-section">
            <Card title="تفاصيل تسجيلات الدخول اليوميّة">
              {loginData.daily.length === 0 ? (
                <EmptyState title="لا توجد بيانات يوميّة" />
              ) : (
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
              )}
            </Card>
          </div>

          {loginData.topReasons.length > 0 && (
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
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{r.count.toLocaleString('ar-LY')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
