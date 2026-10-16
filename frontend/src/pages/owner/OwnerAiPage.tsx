import type { CSSProperties } from 'react';
import { Bot, Zap, CheckCircle2, Clock, Sparkles } from 'lucide-react';
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
import { Card, MetricCard, Badge } from '../../components/primitives';
import {
  ErrorState, EmptyState, KpiSkeleton, ChartSkeleton, TableSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerAiMetrics } from '../../hooks/useOwner';
import { useAiConfig } from '../../hooks/useResources';
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
  /* r164-i: which engine answers — the r160 honest-surface badge
   * (GET /ai/config) landed on the student assistant page only; the
   * OWNER console that MONITORS the AI service never said whether a
   * real model or the local composer produced these numbers. The
   * endpoint is auth-only (any role), cached 5 min, and fail-soft
   * here: no answer (pending/error) renders NO badge rather than a
   * guessed one. */
  const aiConfig = useAiConfig();
  /* r175: any non-local label is a real external LLM (openrouter is a
   * real value now — the label stays honest, the check is «ليس محليًا»). */
  const isRealLlm = aiConfig.data?.provider != null && aiConfig.data.provider !== 'local';
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
        {/* The r160 honesty contract on the monitoring side too: the
            badge names the real model when one answers, and says
            «محليّ» — not an LLM name — when the local composer does. */}
        {aiConfig.data && (
          <Badge color="gold" icon={Sparkles}>
            {isRealLlm && aiConfig.data?.model ? <bdi>{aiConfig.data.model}</bdi> : 'محليّ'}
          </Badge>
        )}
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
      ) : (
        <>
          {/* Metric Cards — real values; Latin unit runs are bidi-isolated.
              22-b (4-A7 P2-6): a zero-request platform still gets its KPI
              strip — honest zeros are this console's own convention, and
              the page no longer collapses to a single dead-end EmptyState. */}
          <div className="grid-4">
            <MetricCard icon={Bot} label="إجمالي الطلبات" value={<bdi>{data.totalRequests.toLocaleString('ar-LY')}</bdi>} color="brand" />
            <MetricCard
              icon={Zap}
              label="إجمالي التوكنات"
              value={data.totalTokens >= 1_000_000
                ? <bdi>{(data.totalTokens / 1_000_000).toFixed(1)}M</bdi>
                : <bdi>{data.totalTokens.toLocaleString('ar-LY')}</bdi>}
              color="purple"
            />
            {/* 6A10-3: KPIs render whole numbers — 97.4% and 812.6ms
                carried false precision (the backend's aggregates are
                ratios/averages, not measured to the tenth); Math.round
                keeps the tiles honest: 97.4→97, 812.6→813. */}
            <MetricCard icon={CheckCircle2} label="معدّل النجاح" value={<bdi>{Math.round(data.successRate)}%</bdi>} color="green" />
            <MetricCard icon={Clock} label="متوسّط الاستجابة" value={<bdi>{Math.round(data.avgLatencyMs)}ms</bdi>} color="gold" />
          </div>

          <div className="owner-ai-chart-grid">
            <Card title="الطلبات حسب الميزة">
              {data.byFeature.length === 0 ? (
                <EmptyState illustration="empty-search"
                  icon={Bot}
                  title="لا توجد طلبات لعرضها"
                  /* r165g (truthfulness): the old copy claimed AI
                   * services are ENABLED «عبر أعلام الميزات وإعدادات
                   * المنصّة» and linked to /owner/system to do so — a
                   * claim nothing in the backend backs (no route reads
                   * FeatureFlag/PlatformSetting). The honest empty
                   * state: metrics arrive with the first recorded
                   * request; the service's availability is decided by
                   * the server's provider configuration. */
                  description="تظهر مؤشّرات الاستخدام هنا فور تسجيل أوّل طلب. جهوزيّة خدمة الذكاء الاصطناعيّ تحدّدها إعدادات المزوّد على الخادم — أعلام الميزات وإعدادات المنصّة تُسجَّل ولا يستهلكها أيّ مسار تشغيل بعد."
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
                <EmptyState illustration="empty-search" title="لا توجد بيانات بعد" description="يُرسم الاتّجاه فور تسجيل أوّل طلب." />
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
                      <th scope="col">الميزة</th>
                      <th scope="col">الطلبات</th>
                      <th scope="col">التوكنات</th>
                      <th scope="col">الحصة من التوكنات</th>
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
