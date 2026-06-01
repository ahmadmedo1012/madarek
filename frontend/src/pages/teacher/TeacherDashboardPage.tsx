import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle, FileText, Bell,
  CheckCircle2, Filter, Sparkles, Microscope,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { cartesianOptions } from '../../lib/chartTheme';
import { useTeacherDashboard, type TeacherDashboard } from '../../hooks/useResources';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type FeedFilter = 'all' | 'submissions' | 'research' | 'attendance';

const FILTER_OPTIONS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'submissions', label: 'تسليمات' },
  { value: 'research', label: 'بحوث' },
  { value: 'attendance', label: 'حضور' },
];

const KIND_ICON: Record<'submissions' | 'research' | 'attendance', LucideIcon> = {
  submissions: FileText,
  research: Microscope,
  attendance: AlertTriangle,
};
const KIND_TONE: Record<'submissions' | 'research' | 'attendance', 'amber' | 'red' | 'green' | 'purple' | 'gold'> = {
  submissions: 'amber',
  research: 'purple',
  attendance: 'red',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  const diffD = Math.round(diffHr / 24);
  if (diffD < 7) return `منذ ${diffD} يوم`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

export function TeacherDashboardPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const dash = useTeacherDashboard();

  const visible = useMemo(() => {
    if (!dash.data) return [];
    return filter === 'all' ? dash.data.feed : dash.data.feed.filter((f) => f.kind === filter);
  }, [dash.data, filter]);

  if (dash.isPending) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
            <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
          </div>
        </div>
        <LoadingState />
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
          </div>
        </div>
        <ErrorState
          message="تعذَّر تحميل لوحة الأستاذ"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </div>
    );
  }

  const d = dash.data;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الأستاذ</h1>
          <p className="page-subtitle">
            كل ما يحتاج تدخّلك اليوم — في تيار واحد، مرتّب حسب الأولوية.
          </p>
        </div>
        <Badge color="brand">
          {visible.length} عنصر يحتاج متابعة
        </Badge>
      </div>

      {/* Compact KPI strip — real values */}
      <div className="compact-kpis">
        <CompactKpi
          label="طلاب"
          value={d.kpi.studentCount.toLocaleString('ar-LY')}
          trend="عبر مقرّراتك"
          trendColor="neutral"
        />
        <CompactKpi
          label="متوسط الأداء"
          value={d.kpi.avgGradePct !== null ? `${d.kpi.avgGradePct}%` : '—'}
          trend={d.kpi.avgGradePct === null ? 'لا تقييمات بعد' : 'كل التقييمات المعتمدة'}
          trendColor={d.kpi.avgGradePct === null ? 'neutral' : d.kpi.avgGradePct >= 70 ? 'positive' : 'negative'}
        />
        <CompactKpi
          label="حضور"
          value={d.kpi.attendancePct !== null ? `${d.kpi.attendancePct}%` : '—'}
          trend={d.kpi.attendancePct === null ? 'لا جلسات حضور بعد' : 'كل الجلسات المسجَّلة'}
          trendColor={d.kpi.attendancePct === null ? 'neutral' : d.kpi.attendancePct >= 75 ? 'positive' : 'negative'}
        />
        <CompactKpi
          label="بحاجة تقييم"
          value={d.kpi.needsReview.toLocaleString('ar-LY')}
          trend="واجبات + بحوث"
          trendColor={d.kpi.needsReview === 0 ? 'positive' : d.kpi.needsReview > 10 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Performance + attendance trend — real 6-week data */}
      <Card title="اتجاه الأداء والحضور" icon={Sparkles} subtitle="متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية">
        <div style={{ height: 240 }}>
          <Line
            data={trendChartData(d.trend)}
            options={{
              ...cartesianOptions({ legend: true }),
              scales: {
                ...cartesianOptions().scales,
                y: { ...cartesianOptions().scales!.y, min: 0, max: 100 },
              },
            }}
          />
        </div>
      </Card>

      {/* Filter toolbar */}
      <div className="feed-toolbar">
        <div className="flex items-center gap-2">
          <Icon icon={Filter} size={14} className="text-subtle" />
          <span className="text-xs text-subtle">تصفية:</span>
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`pill${filter === o.value ? ' on' : ''}`}
              onClick={() => setFilter(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Link to="/teacher/alerts" className="btn ghost sm">
          <Icon icon={Bell} size={13} />
          الإشعارات الكاملة
        </Link>
      </div>

      {/* The feed */}
      <div className="feed">
        {visible.length === 0 ? (
          <Card>
            <div className="state">
              <div className="state-icon state-icon-success">
                <Icon icon={CheckCircle2} size={20} />
              </div>
              <div className="state-title">لا متطلبات الآن — أحسنت!</div>
              <div className="state-desc">سيظهر هنا أي عنصر جديد فور وصوله.</div>
            </div>
          </Card>
        ) : (
          visible.map((item) => <FeedRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function trendChartData(trend: TeacherDashboard['trend']) {
  return {
    labels: trend.map((t) => t.week),
    datasets: [
      {
        label: 'متوسط الأداء %',
        data: trend.map((t) => t.avgGradePct ?? null),
        borderColor: '#a3c9ff',
        backgroundColor: 'rgba(163, 201, 255, 0.10)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#a3c9ff',
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: 'الحضور %',
        data: trend.map((t) => t.attendancePct ?? null),
        borderColor: '#3DD68C',
        backgroundColor: 'rgba(61, 214, 140, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#3DD68C',
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };
}

function CompactKpi({ label, value, trend, trendColor }: {
  label: string; value: string; trend: string; trendColor: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="compact-kpi">
      <div className="compact-kpi-label">{label}</div>
      <div className="compact-kpi-value">{value}</div>
      <div className="compact-kpi-trend" data-trend={trendColor}>{trend}</div>
    </div>
  );
}

function FeedRow({ item }: { item: TeacherDashboard['feed'][number] }) {
  const Icon_ = KIND_ICON[item.kind];
  const tone = KIND_TONE[item.kind];
  return (
    <div className="feed-item">
      {item.author ? (
        <UserAvatar
          initials={item.author.avatarInitials ?? `${item.author.firstName[0]}${item.author.lastName[0]}`}
          color={item.author.avatarColor ?? undefined}
          size={40}
        />
      ) : (
        <div className={`feed-item-avatar ${tone}`}>
          <Icon icon={Icon_} size={18} />
        </div>
      )}
      <div className="feed-item-body">
        <div className="feed-item-head">
          <span className="feed-item-author">
            {item.author ? `${item.author.firstName} ${item.author.lastName}` : 'النظام'}
          </span>
          <span className="feed-item-meta">·</span>
          <span className="feed-item-meta">{item.meta}</span>
          <span className="feed-item-meta feed-item-time">{formatRelative(item.when)}</span>
        </div>
        <div className="feed-item-text">{item.title}</div>
        <div className="feed-item-actions">
          <Link to={item.actionTo} className="btn primary sm">
            <Icon icon={Icon_} size={13} />
            مراجعة
          </Link>
        </div>
      </div>
    </div>
  );
}
