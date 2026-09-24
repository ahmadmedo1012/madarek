import { useState, useEffect } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Library as LibraryIcon, BookOpen, Clock,
  Code, Network, Database, Bot, ShieldCheck, Star, FileText, Award, GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Pill, Badge, UserAvatar } from '../../components/primitives';
import { Skeleton, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useBooks, usePublishedResearch, useResearchSearch, useMyLoans, type ResearchSearchHit } from '../../hooks/useResources';
import { courseTint } from '../../lib/courseMeta';

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

/** Escape every HTML-significant character. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Allowlist sanitizer for server-generated search snippets.
 *
 * The research-search endpoint returns a snippet with `<mark>` tags around
 * the matched term. Everything else — script tags, attributes, event
 * handlers, malformed tags — is neutralized: the ONLY tag that survives
 * is a bare `<mark>` / `</mark>`; every other `<` is escaped so it renders
 * as literal text. Safe to pass to dangerouslySetInnerHTML.
 */
export function sanitizeSnippetHtml(html: string): string {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += escapeHtml(html.slice(i));
      break;
    }
    out += escapeHtml(html.slice(i, lt));
    const rest = html.slice(lt);
    const markTag = /^<\/?mark>/i.exec(rest);
    if (markTag) {
      out += markTag[0].toLowerCase();
      i = lt + markTag[0].length;
    } else {
      out += '&lt;';
      i = lt + 1;
    }
  }
  return out;
}

type Tab = 'books' | 'research';

const LIB_TABS: Array<{ key: Tab; label: string; icon: LucideIcon }> = [
  { key: 'books', label: 'الكتب', icon: BookOpen },
  { key: 'research', label: 'بحوث الطلاب', icon: FileText },
];

/* Shape-matched loading skeletons (brief §4: never a bare spinner where
   a skeleton fits the settled shape). */
function BookGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div className="grid-auto-200" aria-busy="true" aria-live="polite">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="lib-skel-tile">
          <Skeleton width="100%" height={100} />
          <div style={{ padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <Skeleton width="75%" height={15} />
            <Skeleton width="50%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResearchListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex-col gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="lib-skel-row">
          <Skeleton width={40} height={40} rounded="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <Skeleton width="45%" height={15} />
            <Skeleton width="65%" height={11} />
            <Skeleton width="90%" height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>('books');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  // Debounce the search input — wait 250ms of idle typing before firing.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Both tabs share the debounced query — the books query must fire on the
  // debounced value too, not per keystroke (mirrors the research tab).
  const books = useBooks({ category: cat === 'all' ? undefined : cat, q: debouncedQ });
  const research = usePublishedResearch();
  const search = useResearchSearch(debouncedQ);
  const loans = useMyLoans();
  const isResearchTab = tab === 'research';

  // Loan-derived KPIs
  const activeLoans = loans.data?.filter((l) => l.status === 'ACTIVE') ?? [];
  const dueSoon = activeLoans.filter((l) => {
    const days = (new Date(l.dueAt).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  }).length;
  const totalBooks = books.data?.length ?? null;
  const booksFiltered = debouncedQ.length > 0 || cat !== 'all';

  // When the research tab is active and the user has typed >=2 chars, show
  // server-side search results (with snippets). Otherwise show the full archive.
  const researchInUse = isResearchTab && debouncedQ.length >= 2 && search.data;
  const visibleResearch = researchInUse
    ? search.data!.data
    : research.data ?? [];

  // Manual tabs ARIA pattern (icons are not supported by the string-only
  // Tabs primitive): roving tabindex + RTL arrow keys + aria-controls,
  // same grammar as the achievements tabs (§selfdev).
  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = LIB_TABS.findIndex((t) => t.key === tab);
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = (idx + 1) % LIB_TABS.length;
    else if (e.key === 'ArrowRight') next = (idx - 1 + LIB_TABS.length) % LIB_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = LIB_TABS.length - 1;
    if (next === null) return;
    const entry = LIB_TABS[next];
    if (!entry) return;
    e.preventDefault();
    setTab(entry.key);
    document.getElementById(`lib-tab-${entry.key}`)?.focus();
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المكتبة الإلكترونية</h1>
          <p className="page-subtitle">
            آلاف الكتب الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي.
          </p>
        </div>
      </header>

      {/* Tab switch */}
      <div className="tabs lib-tabs" role="tablist" aria-label="أقسام المكتبة" onKeyDown={onTabsKeyDown}>
        {LIB_TABS.map((t) => (
          <button
            key={t.key}
            id={`lib-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`lib-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={tab === t.key ? 'tab on' : 'tab'}
            onClick={() => setTab(t.key)}
          >
            <Icon icon={t.icon} size={14} />
            {t.label}
            {t.key === 'research' && (
              <span className="tab-count">{research.data?.length ?? '—'}</span>
            )}
          </button>
        ))}
      </div>

      {!isResearchTab ? (
        <div role="tabpanel" id="lib-panel-books" aria-labelledby="lib-tab-books">
          <div className="grid-3">
            <MetricCard
              icon={LibraryIcon}
              label="كتب الفئة الحاليّة"
              value={books.isPending ? <Skeleton width={48} height={24} /> : (totalBooks !== null ? totalBooks.toLocaleString('ar-LY') : '—')}
              change={cat === 'all' ? 'الكلّ' : categoryLabel(cat)}
              color="brand"
            />
            <MetricCard
              icon={BookOpen}
              label="استعارات نشطة"
              value={loans.isPending ? <Skeleton width={48} height={24} /> : activeLoans.length.toLocaleString('ar-LY')}
              change={loans.data ? `من أصل ${loans.data.length.toLocaleString('ar-LY')} استعارة` : '—'}
              color={activeLoans.length === 0 ? 'brand' : 'green'}
            />
            <MetricCard
              icon={Clock}
              label="تنتهي قريباً"
              value={loans.isPending ? <Skeleton width={48} height={24} /> : dueSoon.toLocaleString('ar-LY')}
              change={dueSoon > 0 ? 'خلال 3 أيام' : 'لا توجد إنذارات'}
              color={dueSoon > 0 ? 'amber' : 'green'}
            />
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
              <div className="filter-bar lib-filters">
                {CATEGORIES.map((c) => (
                  <Pill key={c.id} on={cat === c.id} icon={c.icon} onClick={() => setCat(c.id)}>
                    {c.label}
                  </Pill>
                ))}
              </div>
            </div>
          </Card>

          {books.isPending ? (
            <BookGridSkeleton />
          ) : books.isError ? (
            <Card><ErrorState error={books.error} onRetry={() => books.refetch()} /></Card>
          ) : !books.data?.length ? (
            <Card>
              <EmptyState
                icon={LibraryIcon}
                illustration={booksFiltered ? 'empty-search' : undefined}
                title={booksFiltered ? 'لا توجد كتب تطابق البحث' : 'لا توجد كتب بعد'}
                description={booksFiltered ? 'جرّب كلمات بحث مختلفة أو إزالة التصنيفات.' : 'ستظهر هنا كتب المكتبة فور توفرها.'}
              />
            </Card>
          ) : (
            <div className="grid-auto-200">
              {books.data.map((b) => {
                const Cmp = categoryIcon(b.category);
                // Shared default tint: lib/courseMeta.ts (wave 9-a).
                const tint = courseTint(b.themeColor);
                return (
                  <div className="thumb-card" key={b.id}>
                    <div
                      className="thumb-card-image"
                      style={{ background: `color-mix(in srgb, ${tint} 10%, transparent)`, height: 100 }}
                    >
                      <span style={{ color: `color-mix(in srgb, ${tint} 70%, var(--text))` }}>
                        <Icon icon={Cmp} size={32} strokeWidth={1.6} />
                      </span>
                    </div>
                    <div className="thumb-card-body">
                      <div className="thumb-card-title" style={{ minHeight: 36 }}>{b.title}</div>
                      <div className="thumb-card-sub">{b.author}</div>
                      <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-2)' }}>
                        <span className="text-xs text-subtle flex items-center gap-1 font-mono">
                          <Icon icon={Star} size={11} strokeWidth={2.2} />
                          <bdi>{b.rating ?? '—'}</bdi>
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
      ) : (
        <div role="tabpanel" id="lib-panel-research" aria-labelledby="lib-tab-research">
          <div className="grid-4">
            <MetricCard
              icon={FileText}
              label="إجمالي البحوث"
              value={research.isPending ? <Skeleton width={48} height={24} /> : (research.data?.length ?? '—')}
              color="brand"
            />
            <MetricCard
              icon={GraduationCap}
              label="مؤلفون طلابيون"
              value={research.isPending ? <Skeleton width={48} height={24} /> : (new Set(research.data?.map((p) => p.student.id)).size || '—')}
              color="purple"
            />
            <MetricCard
              icon={Award}
              label="متوسط التقييم"
              value={
                research.isPending ? <Skeleton width={48} height={24} /> :
                research.data && research.data.length
                  ? <bdi>{`${Math.round((research.data.reduce((s, p) => s + (p.grade ?? 0), 0) / research.data.length) * 10) / 10}/20`}</bdi>
                  : '—'
              }
              color="gold"
            />
            <MetricCard
              icon={BookOpen}
              label="منشورة هذا الفصل"
              value={
                research.isPending ? <Skeleton width={48} height={24} /> :
                (research.data?.filter((p) => p.publishedAt && new Date(p.publishedAt).getFullYear() >= new Date().getFullYear()).length ?? '—')
              }
              color="green"
            />
          </div>

          <Card compact>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="topbar-search" style={{ width: '100%', maxWidth: 360 }}>
                <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
                <input
                  type="text"
                  placeholder="ابحث في عنوان البحث، الملخص، أو محتوى البحث الكامل…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="lib-count" style={{ marginInlineStart: 'auto' }}>
                {researchInUse
                  ? <><bdi>{visibleResearch.length}</bdi> نتيجة لـ "{debouncedQ}"</>
                  : <><bdi>{visibleResearch.length}</bdi> بحث منشور</>}
              </div>
            </div>
          </Card>

          {(researchInUse ? search.isPending : research.isPending) ? (
            <ResearchListSkeleton />
          ) : (researchInUse ? search.isError : research.isError) ? (
            <Card><ErrorState
              error={researchInUse ? search.error : research.error}
              onRetry={() => (researchInUse ? search.refetch() : research.refetch())}
            /></Card>
          ) : !visibleResearch.length ? (
            <Card>
              <EmptyState
                icon={FileText}
                illustration={q ? 'empty-search' : undefined}
                title={q ? 'لا توجد نتائج للبحث' : 'لا توجد بحوث منشورة بعد'}
                description={q ? `لم نجد بحثاً يطابق "${q}" — جرّب كلمات أخرى.` : 'سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة.'}
              />
            </Card>
          ) : (
            <div className="flex-col gap-3">
              {visibleResearch.map((p, i) => {
                const hit = researchInUse ? (p as ResearchSearchHit) : null;
                return (
                <article
                  key={p.id}
                  className="research-card"
                  style={{ '--rs-i': i } as CSSProperties}
                >
                  <div className="research-card-head">
                    <UserAvatar
                      initials={p.student.avatarInitials ?? `${p.student.firstName[0]}${p.student.lastName[0]}`}
                      color={p.student.avatarColor ?? undefined}
                      size={40}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="research-card-title">
                        {p.title}
                      </h3>
                      <div className="research-card-meta">
                        <span>{p.student.firstName} {p.student.lastName}</span>
                        {p.offering?.course && (
                          <>
                            <span>•</span>
                            <span className="font-mono"><bdi>{p.offering.course.code}</bdi></span>
                            <span>·</span>
                            <span>{p.offering.course.name}</span>
                          </>
                        )}
                        {p.publishedAt && (
                          <>
                            <span>•</span>
                            <span className="font-mono"><bdi>{new Date(p.publishedAt).toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })}</bdi></span>
                          </>
                        )}
                      </div>
                    </div>
                    {hit && (
                      <Badge color={hit.matchedIn === 'title' ? 'green' : hit.matchedIn === 'abstract' ? 'gold' : 'purple'}>
                        {hit.matchedIn === 'title' ? 'تطابق في العنوان' : hit.matchedIn === 'abstract' ? 'تطابق في الملخص' : 'تطابق في المتن'}
                      </Badge>
                    )}
                    {!hit && p.grade != null && (
                      <Badge color={p.grade >= 17 ? 'green' : p.grade >= 14 ? 'gold' : 'amber'} icon={Award}>
                        <bdi>{p.grade}/20</bdi>
                      </Badge>
                    )}
                  </div>

                  {/* Show snippet when searching, abstract otherwise.
                      The server snippet is sanitized to a <mark>-only
                      allowlist before injection. */}
                  {hit && hit.snippet ? (
                    <p
                      className="text-sm text-muted research-snippet"
                      style={{ lineHeight: 'var(--lh-base)' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeSnippetHtml(hit.snippet) }}
                    />
                  ) : p.abstract ? (
                    <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-base)', marginBottom: 'var(--sp-2)' }}>
                      {p.abstract}
                    </p>
                  ) : null}
                  <div className="research-card-stats">
                    {p.plagiarismPct != null && (
                      <span className="font-mono">انتحال: <bdi>{p.plagiarismPct}%</bdi></span>
                    )}
                    {p.aiContentPct != null && (
                      <span className="font-mono">ذكاء اصطناعي: <bdi>{p.aiContentPct}%</bdi></span>
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
