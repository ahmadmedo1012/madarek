import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Library as LibraryIcon, BookOpen, Bookmark, Clock,
  Code, Network, Database, Bot, ShieldCheck, Star, FileText, Award, GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Pill, Badge, UserAvatar } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useBooks, usePublishedResearch } from '../../hooks/useResources';

const CATEGORIES: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'الكل', icon: LibraryIcon },
  { id: 'prog', label: 'برمجة', icon: Code },
  { id: 'net', label: 'شبكات', icon: Network },
  { id: 'db', label: 'قواعد بيانات', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: Bot },
  { id: 'sec', label: 'أمن', icon: ShieldCheck },
];

const categoryIcon = (cat: string): LucideIcon =>
  CATEGORIES.find((c) => c.id === cat)?.icon ?? LibraryIcon;
const categoryLabel = (cat: string) => CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

type Tab = 'books' | 'research';

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('books');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const books = useBooks({ category: cat === 'all' ? undefined : cat, q });
  const research = usePublishedResearch();
  const isResearchTab = tab === 'research';

  // research filtered by query (client-side)
  const filteredResearch =
    research.data?.filter((p) => {
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        p.title.toLowerCase().includes(needle) ||
        (p.abstract ?? '').toLowerCase().includes(needle) ||
        `${p.student.firstName} ${p.student.lastName}`.toLowerCase().includes(needle)
      );
    }) ?? [];

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المكتبة الإلكترونية</h1>
          <p className="page-subtitle">
            آلاف الكتب الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي.
          </p>
        </div>
      </div>

      {/* Tab switch */}
      <div className="tabs" role="tablist" aria-label="Library section">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'books'}
          className={tab === 'books' ? 'tab on' : 'tab'}
          onClick={() => setTab('books')}
        >
          <Icon icon={BookOpen} size={14} />
          الكتب
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'research'}
          className={tab === 'research' ? 'tab on' : 'tab'}
          onClick={() => setTab('research')}
        >
          <Icon icon={FileText} size={14} />
          بحوث الطلاب
          <span className="tab-count">{research.data?.length ?? '—'}</span>
        </button>
      </div>

      {!isResearchTab ? (
        <>
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

          {books.isPending ? (
            <Card><LoadingState /></Card>
          ) : books.isError ? (
            <Card><ErrorState /></Card>
          ) : !books.data?.length ? (
            <Card><EmptyState icon={LibraryIcon} title="لا توجد كتب تطابق البحث" description="جرّب كلمات بحث مختلفة أو إزالة التصنيفات." /></Card>
          ) : (
            <div className="grid-auto-200">
              {books.data.map((b) => {
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
        </>
      ) : (
        <>
          <div className="grid-4">
            <MetricCard icon={FileText} label="إجمالي البحوث" value={research.data?.length ?? '—'} color="brand" />
            <MetricCard icon={GraduationCap} label="مؤلفون طلابيون" value={new Set(research.data?.map((p) => p.student.id)).size || '—'} color="purple" />
            <MetricCard
              icon={Award}
              label="متوسط التقييم"
              value={
                research.data && research.data.length
                  ? `${Math.round((research.data.reduce((s, p) => s + (p.grade ?? 0), 0) / research.data.length) * 10) / 10}/20`
                  : '—'
              }
              color="gold"
            />
            <MetricCard icon={BookOpen} label="منشورة هذا الفصل" value={research.data?.filter((p) => p.publishedAt && new Date(p.publishedAt).getFullYear() >= new Date().getFullYear()).length ?? '—'} color="green" />
          </div>

          <Card compact>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="topbar-search" style={{ width: '100%', maxWidth: 360 }}>
                <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
                <input
                  type="text"
                  placeholder="ابحث في عنوان البحث، المؤلف، أو الملخص…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="text-xs text-subtle" style={{ marginInlineStart: 'auto' }}>
                {filteredResearch.length} بحث منشور
              </div>
            </div>
          </Card>

          {research.isPending ? (
            <Card><LoadingState /></Card>
          ) : research.isError ? (
            <Card><ErrorState /></Card>
          ) : !filteredResearch.length ? (
            <Card>
              <EmptyState
                icon={FileText}
                title={q ? 'لا توجد نتائج للبحث' : 'لا توجد بحوث منشورة بعد'}
                description={q ? 'جرّب كلمات أخرى.' : 'سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة.'}
              />
            </Card>
          ) : (
            <div className="flex-col gap-3">
              {filteredResearch.map((p) => (
                <article
                  key={p.id}
                  style={{
                    padding: 'var(--sp-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    background: 'var(--surface-1)',
                    transition: 'var(--t-base)',
                  }}
                  className="research-card"
                >
                  <div className="flex items-start gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
                    <UserAvatar
                      initials={p.student.avatarInitials ?? `${p.student.firstName[0]}${p.student.lastName[0]}`}
                      color={p.student.avatarColor ?? undefined}
                      size={40}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="text-md font-semibold" style={{ color: 'var(--text)', fontSize: 'var(--fs-md)', lineHeight: 1.3 }}>
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-subtle" style={{ marginTop: 4, flexWrap: 'wrap' }}>
                        <span>{p.student.firstName} {p.student.lastName}</span>
                        {p.offering?.course && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{p.offering.course.code}</span>
                            <span>·</span>
                            <span>{p.offering.course.name}</span>
                          </>
                        )}
                        {p.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{new Date(p.publishedAt).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {p.grade != null && (
                      <Badge color={p.grade >= 17 ? 'green' : p.grade >= 14 ? 'gold' : 'amber'} icon={Award}>
                        {p.grade}/20
                      </Badge>
                    )}
                  </div>
                  {p.abstract && (
                    <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)', marginBottom: 'var(--sp-2)' }}>
                      {p.abstract}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xxs text-subtle" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-3)' }}>
                    {p.plagiarismPct != null && (
                      <span className="font-mono">انتحال: {p.plagiarismPct}%</span>
                    )}
                    {p.aiContentPct != null && (
                      <span className="font-mono">ذكاء اصطناعي: {p.aiContentPct}%</span>
                    )}
                    <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon icon={ShieldCheck} size={11} strokeWidth={2} />
                      تم التحقق من النشر
                    </span>
                  </div>
                  {p.fileUrl && (
                    <Link
                      to={`/document/${encodeURIComponent(p.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(p.title)}&back=${encodeURIComponent('/student/library')}&paper=${encodeURIComponent(p.id)}`}
                      className="btn primary sm"
                    >
                      <Icon icon={FileText} size={13} />
                      اقرأ البحث كاملاً
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
