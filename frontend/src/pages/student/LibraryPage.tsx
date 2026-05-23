import { useState } from 'react';
import {
  Search, Library as LibraryIcon, BookOpen, Bookmark, Clock,
  Code, Network, Database, Bot, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Pill, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useBooks } from '../../hooks/useResources';

const CATEGORIES: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'الكل', icon: LibraryIcon },
  { id: 'prog', label: 'برمجة', icon: Code },
  { id: 'net', label: 'شبكات', icon: Network },
  { id: 'db', label: 'قواعد بيانات', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: Bot },
  { id: 'sec', label: 'أمن', icon: ShieldCheck },
];

export default function LibraryPage() {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const { data, isPending, isError } = useBooks({ category: cat === 'all' ? undefined : cat, q });

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المكتبة الإلكترونية</h1>
          <p className="page-subtitle">آلاف الكتب الأكاديمية الرقمية المتاحة للاستعارة الفورية.</p>
        </div>
      </div>

      <Card compact>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="topbar-search" style={{ width: '100%', maxWidth: 320 }}>
            <span className="topbar-search-icon"><Icon icon={Search} size={15} /></span>
            <input
              type="text"
              placeholder="ابحث عن كتاب أو مؤلف…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="filter-bar">
            {CATEGORIES.map((c) => (
              <Pill key={c.id} on={cat === c.id} icon={c.icon} onClick={() => setCat(c.id)}>
                {c.label}
              </Pill>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid-4">
        <MetricCard icon={LibraryIcon} label="إجمالي الكتب" value={data?.length ?? '—'} color="blue" />
        <MetricCard icon={BookOpen} label="مستعارة منك" value="3" color="green" />
        <MetricCard icon={Clock} label="تنتهي قريباً" value="1" color="amber" />
        <MetricCard icon={Bookmark} label="محفوظة" value="12" color="purple" />
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={LibraryIcon} title="لا توجد كتب تطابق البحث" description="جرّب كلمات بحث مختلفة أو إزالة التصنيفات." /></Card>
      ) : (
        <div className="grid-auto-200">
          {data.map((b) => (
            <div className="thumb-card" key={b.id}>
              <div
                className="thumb-card-image"
                style={{
                  background: b.themeColor
                    ? `linear-gradient(135deg, ${b.themeColor}30 0%, ${b.themeColor}08 100%)`
                    : 'linear-gradient(135deg, rgba(90,156,255,.18), rgba(155,111,232,.08))',
                  height: 110,
                }}
              >
                {b.iconEmoji ?? '📕'}
              </div>
              <div className="thumb-card-body">
                <div className="thumb-card-title" style={{ minHeight: 36 }}>{b.title}</div>
                <div className="thumb-card-sub">{b.author}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-amber font-mono text-xs">★ {b.rating ?? '—'}</span>
                  {b.availableCopies > 0
                    ? <Badge color="green">متاح</Badge>
                    : <Badge color="red">مستعار</Badge>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
