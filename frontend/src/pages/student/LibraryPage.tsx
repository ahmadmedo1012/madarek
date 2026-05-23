import { useState } from 'react';
import {
  Search, Library as LibraryIcon, BookOpen, Bookmark, Clock,
  Code, Network, Database, Bot, ShieldCheck, Star,
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

const categoryIcon = (cat: string): LucideIcon => {
  return CATEGORIES.find((c) => c.id === cat)?.icon ?? LibraryIcon;
};

const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

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

      <div className="grid-4">
        <MetricCard icon={LibraryIcon} label="إجمالي الكتب" value="1,247" color="brand" />
        <MetricCard icon={BookOpen} label="مستعارة منك" value="3" color="green" />
        <MetricCard icon={Clock} label="تنتهي قريباً" value="1" color="amber" />
        <MetricCard icon={Bookmark} label="محفوظة" value="12" color="purple" />
      </div>

      <Card compact>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="topbar-search" style={{ width: '100%', maxWidth: 320 }}>
            <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
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

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={LibraryIcon} title="لا توجد كتب تطابق البحث" description="جرّب كلمات بحث مختلفة أو إزالة التصنيفات." /></Card>
      ) : (
        <div className="grid-auto-200">
          {data.map((b) => {
            const Cmp = categoryIcon(b.category);
            const tint = b.themeColor ?? '#3D6BD6';
            return (
              <div className="thumb-card" key={b.id}>
                <div className="thumb-card-image" style={{ background: `${tint}10`, height: 100 }}>
                  <span style={{ color: tint }}>
                    <Icon icon={Cmp} size={32} strokeWidth={1.6} />
                  </span>
                </div>
                <div className="thumb-card-body">
                  <div className="thumb-card-title" style={{ minHeight: 36 }}>{b.title}</div>
                  <div className="thumb-card-sub">{b.author}</div>
                  <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-2)' }}>
                    <span className="text-xs text-subtle flex items-center gap-1 font-mono">
                      <Icon icon={Star} size={11} strokeWidth={2.2} />
                      {b.rating ?? '—'}
                    </span>
                    <Badge color={b.availableCopies > 0 ? 'green' : undefined}>
                      {b.availableCopies > 0 ? 'متاح' : 'مستعار'}
                    </Badge>
                  </div>
                  <div className="text-xxs text-subtle">{categoryLabel(b.category)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
