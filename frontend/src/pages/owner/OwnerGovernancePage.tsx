import { ShieldCheck, UserPlus, Key } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import { useMemo } from 'react';
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
import {
  ErrorState, EmptyState, Skeleton, ChartSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, radialOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerGovernance, useOwnerLoginAnalytics } from '../../hooks/useOwner';
import { countAr } from '../../lib/format';
import { useReducedMotion } from '../../components/motion';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

/** 3-up KPI strip skeleton — the grid-3 twin of States' KpiSkeleton. */
function GovKpiSkeleton() {
  return (
    <div className="grid-3" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="metric">
          <div className="flex-col gap-2">
            <Skeleton width={90} height={11} />
            <Skeleton width={70} height={26} />
            <Skeleton width={130} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OwnerGovernancePage() {
  const governance = useOwnerGovernance();
  const loginAnalytics = useOwnerLoginAnalytics();
  const govData = governance.data;
  const loginData = loginAnalytics.data;
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();

  // Chart data/options are memoized (audit 11-f P2-2): either query
  // settling re-rendered the page and rebuilt every data/options object,
  // re-triggering react-chartjs-2's options reapply + animated update.
  // themeKey participates because the colors and option factories resolve
  // CSS custom properties at call time — the remounted canvas must
  // re-resolve them for the new theme.
  const c = useMemo(() => chartColors(), [themeKey]);

  const growthChartData = useMemo(() => govData ? {
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
  } : null, [govData, c]);

  const growthOptions = useMemo(
    () => cartesianOptions(),
    [themeKey, reducedMotion],
  );

  const doughnutData = useMemo(() => loginData ? {
    labels: ['ناجحة', 'فاشلة'],
    datasets: [
      {
        data: [loginData.successCount, loginData.failureCount],
        backgroundColor: [c.success, c.warning],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  } : null, [loginData, c]);

  // The authored moment: the total attempt count lands in the doughnut's
  // center (madarekCenterLabelPlugin, metric type tokens) while the arcs
  // rotate in — the figure was previously invisible behind the legend.
  const doughnutOptions = useMemo(() => radialOptions({
    legend: true,
    centerLabel: loginData
      ? { value: loginData.total.toLocaleString('ar-LY'), label: 'إجمالي المحاولات' }
      : undefined,
  }), [loginData, themeKey, reducedMotion]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الحوكمة المتقدّمة</h1>
          <p className="page-subtitle">تتبّع الصلاحيات والنموّ وتحليل تسجيلات الدخول</p>
        </div>
      </header>

      {/* Governance metrics — each area owns its pending/error state, so a
          failing endpoint never blanks the sections that resolved. */}
      {governance.isPending ? (
        <GovKpiSkeleton />
      ) : governance.isError || !govData ? (
        <Card>
          <ErrorState
            error={governance.error}
            message="تعذّر تحميل بيانات الحوكمة"
            onRetry={() => governance.refetch()}
          />
        </Card>
      ) : (
        <div className="grid-3">
          <MetricCard icon={Key} label="تغييرات الصلاحيات" value={govData.permissionChanges.toLocaleString('ar-LY')} color="purple" />
          <MetricCard icon={ShieldCheck} label="تغييرات الأدوار" value={govData.roleChanges.toLocaleString('ar-LY')} color="brand" />
          <MetricCard icon={UserPlus} label="مستخدمون جدد هذا الشهر" value={govData.newUsersThisMonth.toLocaleString('ar-LY')} color="green" />
        </div>
      )}

      <div className="owner-ai-chart-grid">
        <Card title="نموّ المستخدمين (8 أسابيع)">
          {governance.isPending ? (
            <ChartSkeleton height={236} />
          ) : governance.isError || !govData ? (
            <ErrorState
              error={governance.error}
              message="تعذّر تحميل بيانات النموّ"
              onRetry={() => governance.refetch()}
            />
          ) : govData.weeklyGrowth.length === 0 ? (
            <EmptyState title="لا توجد بيانات نموّ بعد" description="سيُرسم المنحنى فور تسجيل أوّل مستخدم." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel="مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً على مدى 8 أسابيع"
              summary={`أعلى نموّ ${countAr(Math.max(...govData.weeklyGrowth.map((w) => w.count)), ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوع واحد.`}
              table={{
                caption: 'نموّ المستخدمين الأسبوعي',
                columns: ['الأسبوع', 'مستخدمون جدد'],
                rows: govData.weeklyGrowth.map((w) => [w.week, w.count]),
              }}
            >
              <Line key={themeKey} data={growthChartData!} options={growthOptions} />
            </ChartFrame>
          )}
        </Card>

        <Card title="تسجيلات الدخول: نجاح / فشل">
          {loginAnalytics.isPending ? (
            <ChartSkeleton height={236} />
          ) : loginAnalytics.isError || !loginData ? (
            <ErrorState
              error={loginAnalytics.error}
              message="تعذّر تحميل تحليلات تسجيل الدخول"
              onRetry={() => loginAnalytics.refetch()}
            />
          ) : loginData.total === 0 ? (
            <EmptyState title="لا توجد محاولات دخول بعد" description="سيظهر التوزيع فور أوّل محاولة تسجيل دخول." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel={`توزيع محاولات تسجيل الدخول: ${countAr(loginData.successCount, ['محاولة ناجحة واحدة', 'محاولتان ناجحتان', 'محاولات ناجحة', 'محاولة ناجحة'])} و${countAr(loginData.failureCount, ['محاولة فاشلة واحدة', 'محاولتان فاشلتان', 'محاولات فاشلة', 'محاولة فاشلة'])}`}
              summary={`نجحت ${countAr(loginData.successCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])} وفشلت ${countAr(loginData.failureCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}.`}
              table={{
                caption: 'محاولات تسجيل الدخول',
                columns: ['النتيجة', 'العدد'],
                rows: [
                  ['ناجحة', loginData.successCount],
                  ['فاشلة', loginData.failureCount],
                ],
              }}
            >
              <Doughnut key={themeKey} data={doughnutData!} options={doughnutOptions} />
            </ChartFrame>
          )}
        </Card>
      </div>

      <div className="owner-governance-section">
        <Card title="تفاصيل تسجيلات الدخول اليوميّة">
          {loginAnalytics.isPending ? (
            <TableSkeleton rows={5} cols={3} />
          ) : loginAnalytics.isError || !loginData ? (
            <ErrorState
              error={loginAnalytics.error}
              message="تعذّر تحميل تفاصيل تسجيل الدخول"
              onRetry={() => loginAnalytics.refetch()}
            />
          ) : loginData.daily.length === 0 ? (
            <EmptyState title="لا توجد بيانات يوميّة" description="تُسجَّل المحاولات يوماً بيوم فور حدوثها." />
          ) : (
            <div className="table-wrap">
              <table className="table tbl-stack">
                <thead>
                  <tr>
                    <th>التاريخ</th>
                    <th>ناجحة</th>
                    <th>فاشلة</th>
                  </tr>
                </thead>
                <tbody>
                  {loginData.daily.map((d) => (
                    <tr key={d.date}>
                      <td data-label="التاريخ"><bdi className="owner-num" dir="ltr">{d.date}</bdi></td>
                      <td className="owner-num owner-num-success" data-label="ناجحة">{d.success.toLocaleString('ar-LY')}</td>
                      <td className="owner-num owner-num-warning" data-label="فاشلة">{d.failure.toLocaleString('ar-LY')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {loginData && loginData.topReasons.length > 0 && (
        <Card title="أسباب فشل تسجيل الدخول">
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th>السبب</th>
                  <th>العدد</th>
                </tr>
              </thead>
              <tbody>
                {loginData.topReasons.map((r) => (
                  <tr key={r.reason}>
                    <td data-label="السبب"><bdi>{r.reason}</bdi></td>
                    <td className="owner-num" data-label="العدد">{r.count.toLocaleString('ar-LY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
