import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle, FileText, Bell,
  CheckCircle2, Filter, Sparkles, Microscope,
  ArrowUpRight, ArrowDownRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar } from '../../components/primitives';
import { ErrorState, ChartSkeleton, ListSkeleton, Skeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
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
/* The action names what clicking actually does (mission H) — a generic
 * "مراجعة" on every row hides the destination. */
const KIND_ACTION: Record<'submissions' | 'research' | 'attendance', string> = {
  submissions: 'تقييم التسليم',
  research: 'مراجعة البحث',
  attendance: 'عرض السجل',
};

/** Proper Arabic counted nouns: [one, two, few (3–10), many (11+)]. */
function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${n} ${forms[2]}`;
  return `${n} ${forms[3]}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'الآن';
  if (diffMin < 60) return `منذ ${countAr(diffMin, ['دقيقة', 'دقيقتين', 'دقائق', 'دقيقة'])}`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `منذ ${countAr(diffHr, ['ساعة', 'ساعتين', 'ساعات', 'ساعة'])}`;
  const diffD = Math.round(diffHr / 24);
  if (diffD < 7) return `منذ ${countAr(diffD, ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

export function TeacherDashboardPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const dash = useTeacherDashboard();
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  const visible = useMemo(() => {
    if (!dash.data) return [];
    return filter === 'all' ? dash.data.feed : dash.data.feed.filter((f) => f.kind === filter);
  }, [dash.data, filter]);

  const filterCounts = useMemo(() => {
    const feed = dash.data?.feed ?? [];
    return {
      all: feed.length,
      submissions: feed.filter((f) => f.kind === 'submissions').length,
      research: feed.filter((f) => f.kind === 'research').length,
      attendance: feed.filter((f) => f.kind === 'attendance').length,
    } as Record<FeedFilter, number>;
  }, [dash.data]);

  if (dash.isPending) {
    return (
      <div className="page" aria-busy="true" aria-live="polite">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
            <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
          </div>
        </header>
        <div className="compact-kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="compact-kpi">
              <Skeleton width={70} height={11} />
              <div style={{ marginBlock: 'var(--sp-2)' }}>
                <Skeleton width={90} height={26} />
              </div>
              <Skeleton width={120} height={11} />
            </div>
          ))}
        </div>
        <Card title="اتجاه الأداء والحضور">
          <ChartSkeleton height={240} />
        </Card>
        <Card>
          <ListSkeleton rows={5} />
        </Card>
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
          </div>
        </header>
        <ErrorState
          message="تعذَّر تحميل لوحة الأستاذ"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </div>
    );
  }

  const d = dash.data;
  // Build the shared chart options ONCE per render (each cartesianOptions()
  // call resolves CSS custom properties — it is not free).
  const baseOpts = cartesianOptions({ legend: true });

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الأستاذ</h1>
          <p className="page-subtitle">
            كل ما يحتاج تدخّلك اليوم — في تيار واحد، مرتّب حسب الأولوية.
          </p>
        </div>
        <Badge color="brand">
          {visible.length === 0
            ? 'لا عناصر تحتاج متابعة'
            : countAr(visible.length, ['عنصر يحتاج متابعة', 'عنصران يحتاجان متابعة', 'عناصر تحتاج متابعة', 'عنصراً يحتاج متابعة'])}
        </Badge>
      </header>

      {/* Compact KPI strip — real values. The delta chip re-pulses whenever
          its value changes (keyed remount) — the page's authored moment. */}
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
          delta={d.kpi.avgGradePct === null ? undefined : d.kpi.avgGradePct >= 70 ? 'up' : 'dn'}
        />
        <CompactKpi
          label="حضور"
          value={d.kpi.attendancePct !== null ? `${d.kpi.attendancePct}%` : '—'}
          trend={d.kpi.attendancePct === null ? 'لا جلسات حضور بعد' : 'كل الجلسات المسجَّلة'}
          trendColor={d.kpi.attendancePct === null ? 'neutral' : d.kpi.attendancePct >= 75 ? 'positive' : 'negative'}
          delta={d.kpi.attendancePct === null ? undefined : d.kpi.attendancePct >= 75 ? 'up' : 'dn'}
        />
        <CompactKpi
          label="بحاجة تقييم"
          value={d.kpi.needsReview.toLocaleString('ar-LY')}
          trend="واجبات + بحوث"
          trendColor={d.kpi.needsReview === 0 ? 'positive' : d.kpi.needsReview > 10 ? 'negative' : 'neutral'}
          delta={d.kpi.needsReview === 0 ? 'up' : d.kpi.needsReview > 10 ? 'dn' : undefined}
        />
      </div>

      {/* Performance + attendance trend — real 6-week data, wrapped for
          screen readers (aria-label + sr-only data table, audit 0-f). */}
      <Card title="اتجاه الأداء والحضور" icon={Sparkles} subtitle="متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية">
        <ChartFrame
          ariaLabel="مخطط خطي لمتوسط الأداء ونسبة الحضور خلال الأسابيع الستة الماضية"
          summary={
            d.trend.length === 0
              ? 'لا توجد بيانات اتجاه بعد.'
              : 'مقارنة أسبوعية بين متوسط درجات الطلاب ونسبة الحضور.'
          }
          height={240}
          table={{
            caption: 'اتجاه الأداء والحضور — آخر ستة أسابيع',
            columns: ['الأسبوع', 'متوسط الأداء', 'الحضور'],
            rows: d.trend.map((t) => [
              t.week,
              t.avgGradePct === null ? '—' : `${t.avgGradePct}%`,
              t.attendancePct === null ? '—' : `${t.attendancePct}%`,
            ]),
          }}
        >
          <Line
            key={themeKey}
            data={trendChartData(d.trend)}
            options={{
              ...baseOpts,
              scales: {
                ...baseOpts.scales,
                y: { ...baseOpts.scales!.y, min: 0, max: 100 },
              },
            }}
          />
        </ChartFrame>
      </Card>

      {/* Filter toolbar */}
      <div className="feed-toolbar">
        <div className="flex items-center gap-2" role="group" aria-label="تصفية التيار">
          <Icon icon={Filter} size={14} className="text-subtle" />
          <span className="text-xs text-subtle">تصفية:</span>
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`pill${filter === o.value ? ' on' : ''}`}
              aria-pressed={filter === o.value}
              onClick={() => setFilter(o.value)}
            >
              {o.label}
              <span className="filter-pill-count">{filterCounts[o.value]}</span>
            </button>
          ))}
        </div>
        <Link to="/teacher/alerts" className="btn ghost sm">
          <Icon icon={Bell} size={13} />
          الإشعارات الكاملة
        </Link>
      </div>

      {/* The feed — rows stagger in from inline-start (wave 5-a CSS) */}
      <div className="feed">
        {visible.length === 0 ? (
          <Card>
            <div className="state">
              <div className="state-icon state-icon-success">
                <Icon icon={CheckCircle2} size={20} />
              </div>
              <div className="state-title">لا متطلبات الآن — أحسنت!</div>
              <div className="state-desc">سيظهر هنا أي عنصر جديد فور وصوله.</div>
              <div style={{ marginBlockStart: 'var(--sp-3)' }}>
                <Link to="/teacher/intelligence" className="btn outline sm">
                  <Icon icon={Users} size={13} />
                  استعرض أداء مقرّراتك
                </Link>
              </div>
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
  const c = chartColors();
  return {
    labels: trend.map((t) => t.week),
    datasets: [
      {
        label: 'متوسط الأداء %',
        data: trend.map((t) => t.avgGradePct ?? null),
        borderColor: c.accent,
        backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.accent,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: 'الحضور %',
        data: trend.map((t) => t.attendancePct ?? null),
        borderColor: c.success,
        backgroundColor: `color-mix(in srgb, ${c.success} 10%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.success,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };
}

function CompactKpi({ label, value, trend, trendColor, delta }: {
  label: string; value: string; trend: string; trendColor: 'positive' | 'negative' | 'neutral';
  delta?: 'up' | 'dn';
}) {
  return (
    <div className="compact-kpi">
      <div className="compact-kpi-label">{label}</div>
      <div className="compact-kpi-value">{value}</div>
      <div className="compact-kpi-trend" data-trend={trendColor}>
        {trend}
        {delta && (
          <span
            key={value}
            className="compact-kpi-delta"
            data-dir={delta}
            aria-hidden
          >
            <Icon icon={delta === 'up' ? ArrowUpRight : ArrowDownRight} size={12} />
          </span>
        )}
      </div>
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
          {/* meta carries a Latin course code — bdi keeps RTL punctuation order */}
          <bdi className="feed-item-meta">{item.meta}</bdi>
          <span className="feed-item-meta feed-item-time">{formatRelative(item.when)}</span>
        </div>
        <div className="feed-item-text">{item.title}</div>
        <div className="feed-item-actions">
          <Link to={item.actionTo} className="btn primary sm">
            <Icon icon={Icon_} size={13} />
            {KIND_ACTION[item.kind]}
          </Link>
        </div>
      </div>
    </div>
  );
}
