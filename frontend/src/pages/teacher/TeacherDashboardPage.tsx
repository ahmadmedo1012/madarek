import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle, MessageSquare, FileText, Upload, Bell,
  CheckCircle2, Filter, Sparkles, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { AnimatedCounter, Sparkline, TrendChip, TrendArea } from '../../lib/charts';

type FeedFilter = 'all' | 'submissions' | 'questions' | 'attendance' | 'research' | 'content';

interface FeedItem {
  id: string;
  kind: FeedFilter;
  iconKind: 'avatar' | 'icon';
  authorName: string;
  authorInitials?: string;
  iconCmp?: LucideIcon;
  iconTone?: 'amber' | 'red' | 'green' | 'purple' | 'gold';
  meta: string; // course / time
  time: string;
  body: React.ReactNode;
  actions: Array<{ label: string; primary?: boolean; to?: string; icon?: LucideIcon }>;
}

const FEED: FeedItem[] = [
  {
    id: '1',
    kind: 'submissions',
    iconKind: 'avatar',
    authorName: 'علي الفقيه',
    authorInitials: 'عف',
    meta: 'هندسة البرمجيات · SE301',
    time: 'منذ 5 دقائق',
    body: <span>سلّم <strong>مشروع UML للتصميم</strong> — ينتظر تقييمك.</span>,
    actions: [{ label: 'مراجعة الواجب', primary: true, to: '/teacher/grades', icon: FileText }],
  },
  {
    id: '2',
    kind: 'questions',
    iconKind: 'avatar',
    authorName: 'مريم الفاخري',
    authorInitials: 'مف',
    meta: 'نظم المعلومات',
    time: 'منذ 12 دقيقة',
    body: <span>«أستاذ، هل يمكن إعادة شرح موضوع <strong>Normalization</strong>؟ أنا محتارة في 3NF.»</span>,
    actions: [
      { label: 'الرد', primary: true, to: '/teacher/messages', icon: MessageSquare },
      { label: 'تجاهل' },
    ],
  },
  {
    id: '3',
    kind: 'attendance',
    iconKind: 'icon',
    authorName: 'تنبيه حضور',
    iconCmp: AlertTriangle,
    iconTone: 'red',
    meta: 'قواعد البيانات · CS302',
    time: 'منذ ساعة',
    body: <span>5 طلاب غابوا 3 محاضرات متتالية — يحتاجون متابعة قبل تجاوز الحد.</span>,
    actions: [
      { label: 'عرض الطلاب', primary: true, to: '/teacher/attendance', icon: Users },
      { label: 'إرسال تذكير' },
    ],
  },
  {
    id: '4',
    kind: 'research',
    iconKind: 'avatar',
    authorName: 'يوسف البركي',
    authorInitials: 'يب',
    meta: 'بحث جامعي · هندسة البرمجيات',
    time: 'منذ 3 ساعات',
    body: (
      <span>
        رفع بحث «تطبيق نمط <strong>Observer</strong> في تطبيقات Real-Time» — اجتاز الفحص الأوتوماتيكي
        (انتحال 6.4%، AI 11.2%) وينتظر تقييمك.
      </span>
    ),
    actions: [{ label: 'تقييم البحث', primary: true, to: '/teacher/research', icon: Sparkles }],
  },
  {
    id: '5',
    kind: 'submissions',
    iconKind: 'avatar',
    authorName: 'سارة المحجوب',
    authorInitials: 'سم',
    meta: 'هندسة البرمجيات · SE301',
    time: 'منذ 4 ساعات',
    body: <span>سلّمت <strong>تقرير دراسة حالة Design Patterns</strong>.</span>,
    actions: [{ label: 'مراجعة', primary: true, to: '/teacher/grades', icon: FileText }],
  },
  {
    id: '6',
    kind: 'content',
    iconKind: 'icon',
    authorName: 'تذكير محتوى',
    iconCmp: Upload,
    iconTone: 'amber',
    meta: 'شبكات الحاسوب',
    time: 'منذ 6 ساعات',
    body: <span>محاضرة الأسبوع القادم لم تُرفع بعد. الطلاب سيحتاجونها قبل الأحد.</span>,
    actions: [{ label: 'رفع المحتوى', primary: true, to: '/teacher/materials', icon: Upload }],
  },
  {
    id: '7',
    kind: 'questions',
    iconKind: 'avatar',
    authorName: 'خالد المزوغي',
    authorInitials: 'خم',
    meta: 'نظم المعلومات',
    time: 'منذ يوم',
    body: <span>«هل سيتم تغطية موضوع <strong>Indexing</strong> في الاختبار النهائي؟»</span>,
    actions: [{ label: 'الرد', primary: true, to: '/teacher/messages', icon: MessageSquare }],
  },
  {
    id: '8',
    kind: 'research',
    iconKind: 'icon',
    authorName: 'فحص أوتوماتيكي',
    iconCmp: AlertTriangle,
    iconTone: 'red',
    meta: 'بحث جامعي · CS302',
    time: 'منذ يوم',
    body: <span>3 بحوث رفضها فحص الانتحال — تجاوزت 25%. يحتاجون توجيهاً منك.</span>,
    actions: [{ label: 'مراجعة الحالات', primary: true, to: '/teacher/research', icon: AlertTriangle }],
  },
  {
    id: '9',
    kind: 'content',
    iconKind: 'icon',
    authorName: 'إنجاز',
    iconCmp: CheckCircle2,
    iconTone: 'green',
    meta: 'هندسة البرمجيات',
    time: 'منذ يومين',
    body: <span>اكتملت رقمنة 78% من محتوى المقرر — هدف الفصل 80% تقريباً.</span>,
    actions: [{ label: 'عرض التقرير', to: '/teacher/performance' }],
  },
];

const FILTER_OPTIONS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'submissions', label: 'تسليمات' },
  { value: 'questions', label: 'أسئلة الطلاب' },
  { value: 'attendance', label: 'حضور' },
  { value: 'research', label: 'بحوث' },
  { value: 'content', label: 'محتوى' },
];

export function TeacherDashboardPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const visible = filter === 'all' ? FEED : FEED.filter((f) => f.kind === filter);

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

      {/* Compact KPI strip with sparklines */}
      <div className="dash-intel-grid">
        <StatTrendKpi
          label="طلاب"
          value={143}
          delta={4}
          deltaSuffix="%"
          data={[128, 132, 134, 136, 138, 141, 143]}
          color="primary"
          icon={Users}
        />
        <StatTrendKpi
          label="متوسط الأداء"
          value={71}
          valueSuffix="%"
          delta={5}
          deltaSuffix="%"
          data={[64, 65, 67, 68, 70, 71, 71]}
          color="action"
          icon={TrendingUp}
        />
        <StatTrendKpi
          label="حضور"
          value={78}
          valueSuffix="%"
          delta={-3}
          deltaSuffix="%"
          data={[82, 81, 80, 79, 79, 78, 78]}
          color="warning"
          icon={CheckCircle2}
        />
        <StatTrendKpi
          label="بحاجة تقييم"
          value={12}
          delta={2}
          deltaSuffix=""
          data={[6, 8, 9, 10, 11, 11, 12]}
          color="gold"
          icon={FileText}
        />
      </div>

      {/* Class performance trend */}
      <Card title="أداء فصولك · آخر 8 أسابيع" icon={TrendingUp} subtitle="متوسط نتائج الواجبات الأسبوعية">
        <TrendArea
          data={[64, 66, 65, 68, 67, 69, 70, 71]}
          labels={['أ1', 'أ2', 'أ3', 'أ4', 'أ5', 'أ6', 'أ7', 'أ8']}
          color="primary"
          height={200}
        />
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

/** Premium KPI tile: label · animated value · trend chip · sparkline. */
function StatTrendKpi({
  label, value, valueSuffix = '', delta, deltaSuffix, data, color, icon,
}: {
  label: string;
  value: number;
  valueSuffix?: string;
  delta: number;
  deltaSuffix: string;
  data: number[];
  color: 'primary' | 'action' | 'ai' | 'success' | 'warning' | 'danger' | 'gold';
  icon: LucideIcon;
}) {
  return (
    <div className="stat-trend">
      <div className="stat-trend-head">
        <span className="stat-trend-icon">
          <Icon icon={icon} size={13} />
        </span>
        <span className="stat-trend-label">{label}</span>
      </div>
      <div className="stat-trend-value-row">
        <span className="stat-trend-value">
          <AnimatedCounter to={value} suffix={valueSuffix} />
        </span>
        <TrendChip delta={delta} suffix={deltaSuffix} size="sm" />
      </div>
      <div className="stat-trend-spark">
        <Sparkline data={data} color={color} height={28} />
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <div className="feed-item">
      {item.iconKind === 'avatar' && item.authorInitials ? (
        <UserAvatar initials={item.authorInitials} size={40} />
      ) : (
        <div className={`feed-item-avatar ${item.iconTone ?? ''}`}>
          {item.iconCmp ? <Icon icon={item.iconCmp} size={18} /> : null}
        </div>
      )}
      <div className="feed-item-body">
        <div className="feed-item-head">
          <span className="feed-item-author">{item.authorName}</span>
          <span className="feed-item-meta">·</span>
          <span className="feed-item-meta">{item.meta}</span>
          <span className="feed-item-meta feed-item-time">{item.time}</span>
        </div>
        <div className="feed-item-text">{item.body}</div>
        {item.actions.length > 0 && (
          <div className="feed-item-actions">
            {item.actions.map((a, i) => (
              a.to ? (
                <Link key={i} to={a.to} className={`btn ${a.primary ? 'primary' : ''} sm`}>
                  {a.icon && <Icon icon={a.icon} size={13} />}
                  {a.label}
                </Link>
              ) : (
                <button key={i} type="button" className={`btn ${a.primary ? 'primary' : ''} sm`}>
                  {a.icon && <Icon icon={a.icon} size={13} />}
                  {a.label}
                </button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
