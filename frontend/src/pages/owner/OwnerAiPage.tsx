import { Bot, Zap, CheckCircle2, Clock } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
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
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { cartesianOptions , chartColors} from '../../lib/chartTheme';
import { useOwnerAiMetrics } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const FEATURE_LABELS: Record<string, string> = {
  chat: 'المحادثة',
  quiz_gen: 'توليد الاختبارات',
  research_assist: 'المساعد البحثي',
  translation: 'الترجمة',
};

export function OwnerAiPage() {
  const aiMetrics = useOwnerAiMetrics();
  const data = aiMetrics.data;
  const c = chartColors();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز الذكاء الاصطناعيّ</h1>
          <p className="page-subtitle">مراقبة استخدام وأداء خدمات الذكاء الاصطناعيّ</p>
        </div>
      </div>

      {aiMetrics.isPending ? (
        <LoadingState />
      ) : aiMetrics.isError || !data ? (
        <ErrorState error={aiMetrics.error} onRetry={() => aiMetrics.refetch()} />
      ) : data.totalRequests === 0 ? (
        <EmptyState
          icon={Bot}
          title="لا توجد طلبات AI بعد"
          description="ستظهر مؤشّرات الاستخدام هنا فور تشغيل أيّ خدمة ذكاء اصطناعيّ."
        />
      ) : (
        <>
          {/* Metric Cards — real values */}
          <div className="grid-4">
            <MetricCard icon={Bot} label="إجمالي الطلبات" value={data.totalRequests.toLocaleString('ar-LY')} color="brand" />
            <MetricCard
              icon={Zap}
              label="إجمالي التوكنات"
              value={data.totalTokens >= 1_000_000
                ? (data.totalTokens / 1_000_000).toFixed(1) + 'M'
                : data.totalTokens.toLocaleString('ar-LY')}
              color="purple"
            />
            <MetricCard icon={CheckCircle2} label="معدّل النجاح" value={data.successRate + '%'} color="green" />
            <MetricCard icon={Clock} label="متوسّط الاستجابة" value={data.avgLatencyMs + 'ms'} color="gold" />
          </div>

          <div className="owner-ai-chart-grid">
            <Card title="الطلبات حسب الميزة">
              {data.byFeature.length === 0 ? (
                <EmptyState title="لا توجد بيانات بعد" />
              ) : (
                <div className="owner-chart-container">
                  <Bar
                    data={{
                      labels: data.byFeature.map((f) => FEATURE_LABELS[f.feature] ?? f.feature),
                      datasets: [{
                        label: 'عدد الطلبات',
                        data: data.byFeature.map((f) => f.count),
                        backgroundColor: c.accent,
                        borderRadius: 6,
                      }],
                    }}
                    options={cartesianOptions()}
                  />
                </div>
              )}
            </Card>

            <Card title="اتّجاه الاستخدام (7 أيّام)">
              {data.trend.length === 0 ? (
                <EmptyState title="لا توجد بيانات بعد" />
              ) : (
                <div className="owner-chart-container">
                  <Line
                    data={{
                      labels: data.trend.map((t) => t.date.slice(5)),
                      datasets: [{
                        label: 'الطلبات اليوميّة',
                        data: data.trend.map((t) => t.count),
                        borderColor: c.success,
                        backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: c.success,
                      }],
                    }}
                    options={cartesianOptions()}
                  />
                </div>
              )}
            </Card>
          </div>

          {data.byFeature.length > 0 && (
            <Card title="تفاصيل الاستخدام حسب الميزة">
              <table className="owner-table">
                <thead>
                  <tr>
                    <th>الميزة</th>
                    <th>الطلبات</th>
                    <th>التوكنات</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byFeature.map((f) => (
                    <tr key={f.feature}>
                      <td>{FEATURE_LABELS[f.feature] ?? f.feature}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{f.count.toLocaleString('ar-LY')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{f.tokens.toLocaleString('ar-LY')}</td>
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
