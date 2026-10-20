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
import { Card } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import {
  ErrorState, EmptyState, Skeleton, ChartSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, radialOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerGovernance, useOwnerLoginAnalytics } from '../../hooks/useOwner';
import { countAr } from '../../lib/format';
import { useReducedMotion } from '../../components/motion';
import { formatNum } from '../../utils/numbers';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Filler, Title, Tooltip, Legend);

/** The StatStrip's shape-matched pending placeholder (R190 D4 —
 *  three cells, one per governance fact; replaces the old .metric
 *  box trio the KPI band used to resolve into). */
function GovStripSkeleton() {
  return (
    <div className="stat-strip" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="stat-cell">
          <Skeleton width={90} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={70} height={26} />
          </div>
          <Skeleton width={130} height={11} />
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
        // A lone point draws with more presence — a 2px-radius dot
        // alone on an integer axis reads as "one week of data", not
        // "broken chart" (4-A7 P1-4). Still inside the memo so the
        // prop identity stays stable across unrelated re-renders
        // (audit 11-f P2-2 — the pinned contract).
        pointRadius: govData.weeklyGrowth.length === 1 ? 5 : 4,
        pointHoverRadius: 7,
        pointBackgroundColor: c.accent,
      },
    ],
  } : null, [govData, c]);

  /* 22-b (4-A7 P1-4): a COUNT series — weekly signups — must never
   * render fractional y-ticks (4.75→5.25 step 0.05 signalled false
   * precision around a single point). Extends the shared theme's
   * cartesianOptions exactly like the Education page's 0–100 y-clamp:
   * beginAtZero + ticks.precision 0 keeps the axis integer and
   * anchored at zero. (chartTheme's cartesianOptions itself stays
   * 4-A9-owned; this is a page-local scale override.) */
  const growthOptions = useMemo(() => {
    const base = cartesianOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: {
          ...base.scales!.y,
          beginAtZero: true,
          ticks: { ...base.scales!.y?.ticks, precision: 0 },
        },
      },
      // Same cast idiom the theme factory itself uses — the spread of
      // the line|bar union scale needs narrowing back to the base type.
    } as typeof base;
  }, [themeKey, reducedMotion]);

  /* 22-b (4-A7 P3-6): the legend carries its counts («ناجحة · 156») so
   * the small legend text stops reading as empty labels next to the
   * ring's big center figure. */
  const doughnutData = useMemo(() => loginData ? {
    labels: [
      `ناجحة · ${formatNum(loginData.successCount)}`,
      `فاشلة · ${formatNum(loginData.failureCount)}`,
    ],
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
      ? { value: formatNum(loginData.total), label: 'إجمالي المحاولات' }
      : undefined,
  }), [loginData, themeKey, reducedMotion]);

  /* 22-b (4-A7 P1-4): one week of signups is not a trend — the card
   * title drops its window claim until a second week exists, the lone
   * point draws larger, and the summary states exactly how much data
   * there is.
   *
   * 6A10-8: the window is COMPUTED from weeklyGrowth.length for both
   * the visible title and the chart's aria-label — the old hard-coded
   * «(8 أسابيع)» claimed 8 weeks even when the API returned fewer
   * (a young platform, or a quiet log); a single week claims no
   * window at all on either surface. */
  const growthWeeks = govData?.weeklyGrowth.length ?? 0;
  const WEEK_WINDOW_FORMS: [string, string, string, string] = [
    'أسبوع واحد', 'أسبوعين', 'أسابيع', 'أسبوعاً',
  ];
  const growthWindow = growthWeeks > 1
    ? `آخر ${countAr(growthWeeks, WEEK_WINDOW_FORMS)}`
    : null;
  const growthTitle = growthWindow ? `نموّ المستخدمين (${growthWindow})` : 'نموّ المستخدمين';
  const growthAriaLabel = growthWindow
    ? `مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً على مدى ${growthWindow}`
    : 'مخطط خطّي لنموّ المستخدمين — مستخدمون جدد أسبوعياً';

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
        <GovStripSkeleton />
      ) : governance.isError || !govData ? (
        <Card>
          <ErrorState
            error={governance.error}
            message="تعذّر تحميل بيانات الحوكمة"
            onRetry={() => governance.refetch()}
          />
        </Card>
      ) : (
        /* R190 (D4): the typographic stat strip — was the grid-3 icon
         * tiles; each area still owns its pending/error state above. */
        <StatStrip
          ariaLabel="مؤشرات الحوكمة"
          cells={[
            {
              label: 'تغييرات الصلاحيات',
              value: formatNum(govData.permissionChanges),
              trend: 'تجاوزات موثّقة في السجلّ',
              trendTone: 'flat',
            },
            {
              label: 'تغييرات الأدوار',
              value: formatNum(govData.roleChanges),
              trend: 'تعيينات وتحويلات',
              trendTone: 'flat',
            },
            {
              label: 'مستخدمون جدد هذا الشهر',
              value: formatNum(govData.newUsersThisMonth),
              trend: 'من باب التسجيل',
              trendTone: 'up',
            },
          ]}
        />
      )}

      <div className="owner-ai-chart-grid">
        <Card title={growthTitle}>
          {governance.isPending ? (
            <ChartSkeleton height={236} />
          ) : governance.isError || !govData ? (
            <ErrorState
              error={governance.error}
              message="تعذّر تحميل بيانات النموّ"
              onRetry={() => governance.refetch()}
            />
          ) : govData.weeklyGrowth.length === 0 ? (
            <EmptyState illustration="empty-search" title="لا توجد بيانات نموّ بعد" description="سيُرسم المنحنى فور تسجيل أوّل مستخدم." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel={growthAriaLabel}
              summary={govData.weeklyGrowth.length === 1
                ? `أسبوع واحد من البيانات حتى الآن — ${countAr(govData.weeklyGrowth[0]!.count, ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوعه الأول، ويُرسم المنحنى فور تسجيل الأسبوع القادم.`
                : `أعلى نموّ ${countAr(Math.max(...govData.weeklyGrowth.map((w) => w.count)), ['مستخدم جديد واحد', 'مستخدمان جديدان', 'مستخدمين جدد', 'مستخدماً جديداً'])} في أسبوع واحد.`}
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

        {/* r134 فشل→تعذّر family canon: the title pairs the adjectives the
            doughnut legend and the daily table already use (ناجحة/فاشلة). */}
        <Card title="تسجيلات الدخول: ناجحة / فاشلة">
          {loginAnalytics.isPending ? (
            <ChartSkeleton height={236} />
          ) : loginAnalytics.isError || !loginData ? (
            <ErrorState
              error={loginAnalytics.error}
              message="تعذّر تحميل تحليلات تسجيل الدخول"
              onRetry={() => loginAnalytics.refetch()}
            />
          ) : loginData.total === 0 ? (
            <EmptyState illustration="empty-search" title="لا توجد محاولات دخول بعد" description="سيظهر التوزيع فور أوّل محاولة تسجيل دخول." />
          ) : (
            <ChartFrame
              className="owner-chart-container"
              ariaLabel={`توزيع محاولات تسجيل الدخول: ${countAr(loginData.successCount, ['محاولة ناجحة واحدة', 'محاولتان ناجحتان', 'محاولات ناجحة', 'محاولة ناجحة'])} و${countAr(loginData.failureCount, ['محاولة فاشلة واحدة', 'محاولتان فاشلتان', 'محاولات فاشلة', 'محاولة فاشلة'])}`}
              summary={`نجحت ${countAr(loginData.successCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])} وتعذّرت ${countAr(loginData.failureCount, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}.`}
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
            <EmptyState illustration="empty-search" title="لا توجد بيانات يوميّة" description="تُسجَّل المحاولات يوماً بيوم فور حدوثها." />
          ) : (
            <div className="table-wrap">
              <table className="table tbl-stack">
                <thead>
                  <tr>
                    <th scope="col">التاريخ</th>
                    <th scope="col">ناجحة</th>
                    <th scope="col">فاشلة</th>
                  </tr>
                </thead>
                <tbody>
                  {loginData.daily.map((d) => (
                    <tr key={d.date}>
                      <td data-label="التاريخ"><bdi className="owner-num" dir="ltr">{d.date}</bdi></td>
                      <td className="owner-num owner-num-success" data-label="ناجحة">{formatNum(d.success)}</td>
                      <td className="owner-num owner-num-warning" data-label="فاشلة">{formatNum(d.failure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {loginData && loginData.topReasons.length > 0 && (
        <Card title="أسباب تعذّر تسجيل الدخول">
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">السبب</th>
                  <th scope="col">العدد</th>
                </tr>
              </thead>
              <tbody>
                {loginData.topReasons.map((r) => (
                  <tr key={r.reason}>
                    <td data-label="السبب"><bdi>{r.reason}</bdi></td>
                    <td className="owner-num" data-label="العدد">{formatNum(r.count)}</td>
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
