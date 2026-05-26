import { useState, useMemo } from 'react';
import {
  Calendar, Globe, MapPin, Users, Mic2, Video, Award, BellRing, CheckCircle2,
  ExternalLink, Sparkles, Languages,
} from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, Pill } from '../../components/primitives';
import { Icon } from '../../components/Icon';

interface Speaker { name: string; title: string; org: string; initials: string; color: string; }
interface Webinar {
  id: string;
  title: string;
  category: 'webinar' | 'workshop' | 'panel';
  scope: 'national' | 'arab' | 'international';
  date: string;          // ISO
  duration: string;
  language: string;
  speakers: Speaker[];
  abstract: string;
  registered?: number;
  capacity?: number;
  past?: boolean;
  recording?: boolean;
}

const ITEMS: Webinar[] = [
  {
    id: 'w-1',
    title: 'مستقبل الذكاء الاصطناعي التوليدي في التعليم العالي',
    category: 'webinar',
    scope: 'international',
    date: '2026-06-12T18:00:00Z',
    duration: '90 د',
    language: 'إنجليزي + ترجمة عربية مباشرة',
    speakers: [
      { name: 'Prof. Sarah Lin', title: 'AI Education Lead', org: 'Stanford HAI', initials: 'SL', color: '#8B5CF6' },
      { name: 'د. أحمد الجرّاحي', title: 'باحث رئيسي', org: 'KAUST', initials: 'AJ', color: '#2952C8' },
    ],
    abstract:
      'كيف ستعيد نماذج اللغة الكبيرة هندسة المناهج، وأدوار الأساتذة، وتقييم الطلاب — مع أمثلة من تجارب جامعات رائدة.',
    registered: 1284,
    capacity: 2000,
  },
  {
    id: 'w-2',
    title: 'ورشة عملية: بناء مشروع تخرّج بمساعدة الذكاء الاصطناعي',
    category: 'workshop',
    scope: 'national',
    date: '2026-05-30T16:00:00Z',
    duration: '3 ساعات',
    language: 'عربي',
    speakers: [
      { name: 'م. هدى العكروت', title: 'Senior ML Engineer', org: 'STC Pay', initials: 'هع', color: '#10B981' },
    ],
    abstract:
      'جلسة تطبيقية مباشرة لبناء مشروع تخرّج: تجميع البيانات، تدريب نموذج، توثيق علمي قابل للنشر.',
    registered: 412,
    capacity: 500,
  },
  {
    id: 'w-3',
    title: 'الندوة العربية الكبرى: الجامعة الذكية 2030',
    category: 'panel',
    scope: 'arab',
    date: '2026-07-04T17:30:00Z',
    duration: '2 ساعة',
    language: 'عربي',
    speakers: [
      { name: 'د. منيرة الكواري', title: 'وكيلة جامعة قطر', org: 'جامعة قطر', initials: 'مك', color: '#D4A537' },
      { name: 'د. عمر الصفدي', title: 'مدير التحول الرقمي', org: 'الأردنية', initials: 'عص', color: '#EF4444' },
      { name: 'أ.د. فاطمة الزروقي', title: 'رئيس جامعة الزاوية', org: 'جامعة الزاوية', initials: 'فز', color: '#2952C8' },
    ],
    abstract:
      'حوار مفتوح بين قيادات أكاديمية عربية حول تجارب التحول الرقمي والصف المعكوس وتوظيف الذكاء الاصطناعي في الحرم الجامعي.',
    registered: 2104,
    capacity: 5000,
  },
  {
    id: 'w-4',
    title: 'ورشة كتابة البحث العلمي بالإنجليزية',
    category: 'workshop',
    scope: 'international',
    date: '2026-06-20T15:00:00Z',
    duration: '4 ساعات',
    language: 'إنجليزي',
    speakers: [
      { name: 'Dr. Michael Chen', title: 'Editor', org: 'Springer Nature', initials: 'MC', color: '#3B82F6' },
    ],
    abstract:
      'ورشة منهجية لتحرير البحوث الجامعية وفق معايير المجلات المفهرسة: البنية، الاستشهادات، المعالجة اللغوية.',
    registered: 689,
    capacity: 800,
  },
  // Past
  {
    id: 'w-p1',
    title: 'تحليل البيانات التعليمية: من الأرقام إلى القرارات',
    category: 'webinar',
    scope: 'arab',
    date: '2026-04-18T17:00:00Z',
    duration: '90 د',
    language: 'عربي',
    speakers: [{ name: 'د. خالد الدباغ', title: 'Chief Data Officer', org: 'Riiid Korea', initials: 'خد', color: '#A855F7' }],
    abstract: 'كيف تستفيد إدارات الجودة من بيانات التعلّم لاتخاذ قرارات مؤسسية حقيقية.',
    past: true,
    recording: true,
  },
  {
    id: 'w-p2',
    title: 'استراتيجية الصف المعكوس: نتائج تجربة جامعة الزاوية',
    category: 'panel',
    scope: 'national',
    date: '2026-03-22T16:00:00Z',
    duration: '2 ساعة',
    language: 'عربي',
    speakers: [
      { name: 'د. سالم البوسيفي', title: 'أستاذ مشارك', org: 'جامعة الزاوية', initials: 'سب', color: '#10B981' },
      { name: 'م. أمين الزروق', title: 'مهندس المنصة الأكاديمية', org: 'جامعة الزاوية', initials: 'أز', color: '#D4A537' },
    ],
    abstract:
      'عرض تفصيلي للنتائج الميدانية: 40% تحسّن استيعاب، 70% تحسّن مشاركة، 90% تحقيق أهداف التعلّم في مادة اللغة الإنجليزية.',
    past: true,
    recording: true,
  },
];

const CAT_LABELS: Record<Webinar['category'], string> = {
  webinar: 'ندوة',
  workshop: 'ورشة',
  panel: 'حلقة نقاش',
};
const SCOPE_LABELS: Record<Webinar['scope'], string> = {
  national: 'وطنية',
  arab: 'عربية',
  international: 'دولية',
};
const SCOPE_COLORS: Record<Webinar['scope'], 'green' | 'purple' | 'gold'> = {
  national: 'green',
  arab: 'purple',
  international: 'gold',
};

export default function WebinarsPage() {
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [scope, setScope] = useState<'all' | Webinar['scope']>('all');
  const [registered, setRegistered] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('mdrk-webinar-reg') ?? '[]')); }
    catch { return new Set(); }
  });

  const items = useMemo(() => {
    return ITEMS.filter((w) => (filter === 'upcoming' ? !w.past : w.past))
      .filter((w) => scope === 'all' || w.scope === scope)
      .sort((a, b) => (filter === 'upcoming' ? +new Date(a.date) - +new Date(b.date) : +new Date(b.date) - +new Date(a.date)));
  }, [filter, scope]);

  const upcoming = ITEMS.filter((w) => !w.past).length;
  const past = ITEMS.filter((w) => w.past).length;
  const totalSpeakers = new Set(ITEMS.flatMap((w) => w.speakers.map((s) => s.name))).size;

  const toggleRegister = (id: string) => {
    const next = new Set(registered);
    if (next.has(id)) next.delete(id); else next.add(id);
    setRegistered(next);
    localStorage.setItem('mdrk-webinar-reg', JSON.stringify([...next]));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الندوات وورش العمل</h1>
          <p className="page-subtitle">
            ندوات وورش وطنية وعربية ودولية مع خبراء من حول العالم — تابع التسجيلات السابقة وسجّل في القادمة.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={Calendar} label="القادمة" value={upcoming} color="brand" />
        <MetricCard icon={Mic2} label="متحدّثون مدعوّون" value={totalSpeakers} color="purple" />
        <MetricCard icon={Video} label="مسجّلة في الأرشيف" value={past} color="gold" />
        <MetricCard icon={CheckCircle2} label="مسجّلتَ فيها" value={registered.size} color="green" />
      </div>

      {/* Filters */}
      <Card compact>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="tabs" role="tablist">
            <button type="button" className={filter === 'upcoming' ? 'tab on' : 'tab'} onClick={() => setFilter('upcoming')}>
              <Icon icon={Calendar} size={14} />القادمة
            </button>
            <button type="button" className={filter === 'past' ? 'tab on' : 'tab'} onClick={() => setFilter('past')}>
              <Icon icon={Video} size={14} />الأرشيف
            </button>
          </div>
          <div className="filter-bar" style={{ marginInlineStart: 'auto' }}>
            <Pill on={scope === 'all'} icon={Globe} onClick={() => setScope('all')}>الكل</Pill>
            <Pill on={scope === 'national'} icon={MapPin} onClick={() => setScope('national')}>وطنية</Pill>
            <Pill on={scope === 'arab'} icon={MapPin} onClick={() => setScope('arab')}>عربية</Pill>
            <Pill on={scope === 'international'} icon={Globe} onClick={() => setScope('international')}>دولية</Pill>
          </div>
        </div>
      </Card>

      {/* Cards */}
      {!items.length ? (
        <Card>
          <div className="text-sm text-muted text-center" style={{ padding: 'var(--sp-6) 0' }}>
            لا توجد فعاليات في هذا التصنيف حالياً.
          </div>
        </Card>
      ) : (
        <div className="flex-col gap-3">
          {items.map((w) => {
            const isReg = registered.has(w.id);
            const date = new Date(w.date);
            const dateLabel = date.toLocaleDateString('ar-LY', { weekday: 'long', day: 'numeric', month: 'long' });
            const timeLabel = date.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
            const fillPct = w.capacity ? Math.round(((w.registered ?? 0) / w.capacity) * 100) : null;
            return (
              <article key={w.id} className="webinar-card">
                <div className="flex items-start gap-3" style={{ flexWrap: 'wrap' }}>
                  <div className="webinar-date">
                    <span className="webinar-date-day">{date.getDate()}</span>
                    <span className="webinar-date-month">{date.toLocaleDateString('ar-LY', { month: 'short' })}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 6 }}>
                      <Badge color="brand">{CAT_LABELS[w.category]}</Badge>
                      <Badge color={SCOPE_COLORS[w.scope]} icon={Globe}>{SCOPE_LABELS[w.scope]}</Badge>
                      {w.recording && <Badge color="purple" icon={Video}>تسجيل متاح</Badge>}
                    </div>
                    <h3 className="text-md font-semibold" style={{ color: 'var(--text)', fontSize: 'var(--fs-md)', lineHeight: 1.3, marginBottom: 6 }}>
                      {w.title}
                    </h3>
                    <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)', marginBottom: 'var(--sp-3)' }}>
                      {w.abstract}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-subtle flex-wrap" style={{ marginBottom: 'var(--sp-3)' }}>
                      <span className="flex items-center gap-1"><Icon icon={Calendar} size={12} />{dateLabel} • {timeLabel}</span>
                      <span className="flex items-center gap-1"><Icon icon={Mic2} size={12} />{w.duration}</span>
                      <span className="flex items-center gap-1"><Icon icon={Languages} size={12} />{w.language}</span>
                      {w.registered != null && (
                        <span className="flex items-center gap-1"><Icon icon={Users} size={12} />{w.registered.toLocaleString('ar-LY')} مسجَّل</span>
                      )}
                    </div>

                    {/* Speakers */}
                    <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: w.past ? 0 : 'var(--sp-3)' }}>
                      {w.speakers.map((s) => (
                        <div key={s.name} className="speaker-chip">
                          <UserAvatar initials={s.initials} color={s.color} size={28} />
                          <div style={{ minWidth: 0 }}>
                            <div className="speaker-name">{s.name}</div>
                            <div className="speaker-title">{s.title} · {s.org}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    {!w.past && (
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          className={isReg ? 'btn outline sm' : 'btn primary sm'}
                          onClick={() => toggleRegister(w.id)}
                        >
                          <Icon icon={isReg ? CheckCircle2 : BellRing} size={14} />
                          {isReg ? 'تم التسجيل — تذكير سيُرسل لك' : 'سجّل الآن'}
                        </button>
                        {fillPct != null && (
                          <span className="text-xxs text-subtle font-mono">
                            {fillPct}% من المقاعد مشغولة
                          </span>
                        )}
                      </div>
                    )}
                    {w.past && w.recording && (
                      <button type="button" className="btn outline sm" disabled>
                        <Icon icon={ExternalLink} size={14} />
                        مشاهدة التسجيل (قريباً)
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', width: 36, height: 36, borderRadius: 'var(--r-md)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon icon={Sparkles} size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              اقتراح فعالية أو دعوة متحدّث
            </div>
            <div className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 'var(--lh-base)' }}>
              لديك فكرة لورشة أو ندوة، أو تعرف خبيراً تودّ دعوته؟ راسل وحدة الفعاليات على{' '}
              <span className="font-mono" style={{ color: 'var(--accent)' }}>events@zu.edu.ly</span>.
            </div>
          </div>
          <Badge color="gold" icon={Award}>شهادة حضور رسمية</Badge>
        </div>
      </Card>
    </div>
  );
}
