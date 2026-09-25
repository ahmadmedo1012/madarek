import type { CSSProperties } from 'react';
import { Bot, Zap, CheckCircle2, Clock } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, MetricCard } from '../../components/primitives';
import {
  ErrorState, EmptyState, KpiSkeleton, ChartSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerAiMetrics } from '../../hooks/useOwner';
import { useReducedMotion } from '../../components/motion';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const FEATURE_LABELS: Record<string, string> = {
  chat: 'المحادثة',
  quiz_gen: 'توليد الاختبارات',
  research_assist: 'المساعد البحثي',
  translation: 'الترجمة',
};

/** Arabic label for a feature key, bidi-isolated when unknown (raw enum). */
function featureLabel(feature: string) {
  return FEATURE_LABELS[feature] ?? <bdi>{feature}</bdi>;
}

export function OwnerAiPage() {
  const aiMetrics = useOwnerAiMetrics();
  const data = aiMetrics.data;
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();

  // Chart data/options are memoized (audit 11-f P2-2 — same treatment as
  // the other owner chart pages): react-chartjs-2 re-applies any
  // identity-changed prop with an animated chart.update(), so both charts
  // used to churn on every unrelated re-render. themeKey participates
  // because chartColors()/cartesianOptions() resolve CSS custom properties
  // at call time — the remounted canvas must re-resolve them.
  const c = useMemo(() => chartColors(), [themeKey]);

  const barData = useMemo(() => ({
    labels: (data?.byFeature ?? []).map((f) => FEATURE_LABELS[f.feature] ?? f.feature),
    datasets: [{
      label: 'عدد الطلبات',
      data: (data?.byFeature ?? []).map((f) => f.count),
      backgroundColor: c.accent,
      borderRadius: 6,
    }],
  }), [data, c]);

  const lineData = useMemo(() => ({
    labels: (data?.trend ?? []).map((t) => t.date.slice(5)),
    datasets: [{
      label: 'الطلبات اليوميّة',
      data: (data?.trend ?? []).map((t) => t.count),
      borderColor: c.success,
      backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: c.success,
    }],
  }), [data, c]);

  const chartOptions = useMemo(() => cartesianOptions(), [themeKey, reducedMotion]);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز الذكاء الاصطناعيّ</h1>
          <p className="page-subtitle">مراقبة استخدام وأداء خدمات الذكاء الاصطناعيّ</p>
        </div>
      </header>

      {aiMetrics.isPending ? (
        <>
          {/* Shape-matched skeletons — one per card the data will fill. */}
          <KpiSkeleton />
          <div className="owner-ai-chart-grid">
            <Card title="الطلبات حسب الميزة"><ChartSkeleton height={240} /></Card>
            <Card title="اتّجاه الاستخدام (7 أيّام)"><ChartSkeleton height={240} /></Card>
          </div>
          <Card title="تفاصيل الاستخدام حسب الميزة"><TableSkeleton rows={4} cols={4} /></Card>
        </>
      ) : aiMetrics.isError || !data ? (
        <Card>
          <ErrorState error={aiMetrics.error} onRetry={() => aiMetrics.refetch()} />
        </Card>
      ) : data.totalRequests === 0 ? (
        <EmptyState
          icon={Bot}
          title="لا توجد طلبات ذكاء اصطناعيّ بعد"
          description="ستظهر مؤشّرات الاستخدام هنا فور تشغيل أيّ خدمة ذكاء اصطناعيّ على المنصّة."
        />
      ) : (
        <>
          {/* Metric Cards — real values; Latin unit runs are bidi-isolated. */}
          <div className="grid-4">
            <MetricCard icon={Bot} label="إجمالي الطلبات" value={data.totalRequests.toLocaleString('ar-LY')} color="brand" />
            <MetricCard
              icon={Zap}
              label="إجمالي التوكنات"
              value={data.totalTokens >= 1_000_000
                ? <bdi>{(data.totalTokens / 1_000_000).toFixed(1)}M</bdi>
                : data.totalTokens.toLocaleString('ar-LY')}
              color="purple"
            />
            <MetricCard icon={CheckCircle2} label="معدّل النجاح" value={<bdi>{data.successRate}%</bdi>} color="green" />
            <MetricCard icon={Clock} label="متوسّط الاستجابة" value={<bdi>{data.avgLatencyMs}ms</bdi>} color="gold" />
          </div>

          <div className="owner-ai-chart-grid">
            <Card title="الطلبات حسب الميزة">
              {data.byFeature.length === 0 ? (
                <EmptyState
                  title="لا توجد طلبات لعرضها"
                  description="ستظهر بيانات الاستخدام هنا فور تسجيل أوّل طلب ذكاء اصطناعيّ."
                />
              ) : (
                <ChartFrame
                  ariaLabel="مخطط أعمدة — عدد طلبات الذكاء الاصطناعيّ لكل ميزة"
                  summary={`أكثر الميزات استخداماً: ${FEATURE_LABELS[data.byFeature.reduce((a, b) => (b.count > a.count ? b : a)).feature] ?? '—'}.`}
                  table={{
                    caption: 'الطلبات حسب الميزة',
                    columns: ['الميزة', 'الطلبات'],
                    rows: data.byFeature.map((f) => [FEATURE_LABELS[f.feature] ?? f.feature, f.count]),
                  }}
                  height={240}
                >
                  <Bar key={themeKey} data={barData} options={chartOptions} />
                </ChartFrame>
              )}
            </Card>

            <Card title="اتّجاه الاستخدام (7 أيّام)">
              {data.trend.length === 0 ? (
                <EmptyState title="لا توجد بيانات بعد" description="يُرسم الاتّجاه فور تسجيل أوّل طلب." />
              ) : (
                <ChartFrame
                  ariaLabel="مخطط خطّي لاتّجاه الاستخدام — الطلبات اليوميّة على مدى 7 أيّام"
                  summary={`ذروة الاستخدام ${Math.max(...data.trend.map((t) => t.count)).toLocaleString('ar-LY')} طلب في يوم واحد.`}
                  table={{
                    caption: 'اتّجاه الاستخدام اليومي',
                    columns: ['اليوم', 'الطلبات'],
                    rows: data.trend.map((t) => [t.date, t.count]),
                  }}
                  height={240}
                >
                  <Line key={themeKey} data={lineData} options={chartOptions} />
                </ChartFrame>
              )}
            </Card>
          </div>

          {data.byFeature.length > 0 && (
            <Card title="تفاصيل الاستخدام حسب الميزة">
              <div className="table-wrap">
                <table className="table tbl-stack">
                  <thead>
                    <tr>
                      <th>الميزة</th>
                      <th>الطلبات</th>
                      <th>التوكنات</th>
                      <th>الحصة من التوكنات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* The authored moment: each share meter fills from its
                        inline-start edge on load, staggered per row
                        (owner.css §6-b) — tabular numerals keep the
                        columns optically aligned. */}
                    {data.byFeature.map((f, i) => {
                      const share = data.totalTokens > 0 ? (f.tokens / data.totalTokens) * 100 : 0;
                      return (
                        <tr key={f.feature} style={{ '--meter-i': i } as CSSProperties}>
                          <td className="tbl-strong" data-label="الميزة">{featureLabel(f.feature)}</td>
                          <td className="owner-num" data-label="الطلبات">{f.count.toLocaleString('ar-LY')}</td>
                          <td className="owner-num" data-label="التوكنات">{f.tokens.toLocaleString('ar-LY')}</td>
                          <td data-label="الحصة من التوكنات">
                            <span className="owner-share" title={`${f.tokens.toLocaleString('ar-LY')} من ${data.totalTokens.toLocaleString('ar-LY')} توكن`}>
                              <span className="owner-share-track" aria-hidden>
                                <span className="owner-share-fill" style={{ inlineSize: `${share}%` }} />
                              </span>
                              <bdi className="owner-num">{Math.round(share)}%</bdi>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
