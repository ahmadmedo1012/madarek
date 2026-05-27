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
import { useOwnerAiMetrics } from '../../hooks/useOwner';
import type { AiMetrics } from '../../hooks/useOwner';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const FALLBACK_DATA: AiMetrics = {
  totalRequests: 12480,
  totalTokens: 4_230_000,
  successRate: 97.3,
  avgLatencyMs: 820,
  byFeature: [
    { feature: 'chat', count: 5200, tokens: 1_800_000 },
    { feature: 'quiz_gen', count: 3100, tokens: 1_200_000 },
    { feature: 'research_assist', count: 2400, tokens: 800_000 },
    { feature: 'translation', count: 1780, tokens: 430_000 },
  ],
  trend: [
    { date: '2024-12-21', count: 1600 },
    { date: '2024-12-22', count: 1850 },
    { date: '2024-12-23', count: 1720 },
    { date: '2024-12-24', count: 1900 },
    { date: '2024-12-25', count: 2100 },
    { date: '2024-12-26', count: 1950 },
    { date: '2024-12-27', count: 2200 },
  ],
};

const FEATURE_LABELS: Record<string, string> = {
  chat: 'المحادثة',
  quiz_gen: 'توليد الاختبارات',
  research_assist: 'المساعد البحثي',
  translation: 'الترجمة',
};

export function OwnerAiPage() {
  const aiMetrics = useOwnerAiMetrics();
  const data = aiMetrics.data ?? FALLBACK_DATA;

  const barData = {
    labels: data.byFeature.map((f) => FEATURE_LABELS[f.feature] ?? f.feature),
    datasets: [
      {
        label: 'عدد الطلبات',
        data: data.byFeature.map((f) => f.count),
        backgroundColor: '#a3c9ff',
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic', size: 11 } } },
      y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { font: { family: 'IBM Plex Sans Arabic', size: 11 } } },
    },
  };

  const lineData = {
    labels: data.trend.map((t) => t.date.slice(5)),
    datasets: [
      {
        label: 'الطلبات اليومية',
        data: data.trend.map((t) => t.count),
        borderColor: '#3DD68C',
        backgroundColor: 'rgba(61, 214, 140, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#3DD68C',
      },
    ],
  };

  const lineOptions = {
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز الذكاء الاصطناعي</h1>
          <p className="page-subtitle">مراقبة استخدام وأداء خدمات الذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid-4">
        <MetricCard icon={Bot} label="إجمالي الطلبات" value={data.totalRequests.toLocaleString('ar-LY')} color="brand" />
        <MetricCard icon={Zap} label="إجمالي التوكنات" value={(data.totalTokens / 1_000_000).toFixed(1) + 'M'} color="purple" />
        <MetricCard icon={CheckCircle2} label="معدل النجاح" value={data.successRate + '%'} color="green" />
        <MetricCard icon={Clock} label="متوسط الاستجابة" value={data.avgLatencyMs + 'ms'} color="gold" />
      </div>

      {/* Charts */}
      <div className="owner-ai-chart-grid">
        <Card title="الطلبات حسب الميزة">
          <div className="owner-chart-container">
            <Bar data={barData} options={barOptions} />
          </div>
        </Card>

        <Card title="اتجاه الاستخدام (7 أيام)">
          <div className="owner-chart-container">
            <Line data={lineData} options={lineOptions} />
          </div>
        </Card>
      </div>

      {/* Feature Breakdown Table */}
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
    </div>
  );
}
