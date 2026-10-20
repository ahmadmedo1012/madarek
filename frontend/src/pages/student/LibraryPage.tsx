import { useState, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIsNarrowLayout } from '../../hooks/useIsNarrowLayout';
import {
  Search, Library as LibraryIcon, BookOpen,
  Code, Network, Database, Bot, ShieldCheck, Star, FileText, Award, X,
  SlidersHorizontal, Undo2, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Pill, Badge, UserAvatar } from '../../components/primitives';
import { ErrorState, EmptyState } from '../../components/primitives/States';
import { Sheet } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import {
  useBooks, usePublishedResearch, useResearchSearch, useMyLoans,
  useBorrowBook, useReturnLoan,
  type ResearchSearchHit, type Book, type MyLoan,
} from '../../hooks/useResources';
import { courseTint } from '../../lib/courseMeta';
import { countAr, formatPct, apiErrorMessage, formatDateAr } from '../../lib/format';
import { toast } from '../../lib/toast';
import { formatDate, formatInt, formatNum } from '../../utils/numbers';
import {
  PageFrame, PageHeader, RowList, RowItem, StatLine, SectionHeader, FilterBar,
} from '../../components/patterns';
import type { StatLineItem } from '../../components/patterns';
import '../../styles/research.css';

const CATEGORIES: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'الكل', icon: LibraryIcon },
  { id: 'prog', label: 'برمجة', icon: Code },
  { id: 'net', label: 'شبكات', icon: Network },
  { id: 'db', label: 'قواعد بيانات', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: Bot },
  { id: 'sec', label: 'أمن', icon: ShieldCheck },
];

/* r184: Arabic plural noun for the pager's honest total — the
 * CatalogPage COURSE_UNIT convention (countAr four-form). */
const BOOK_UNIT: [string, string, string, string] = ['كتاب واحد', 'كتابان', 'كتب', 'كتاباً'];
/* r184: page size for the books list — a paginated envelope, never a
 * silent truncation. */
const BOOKS_PAGE_SIZE = 24;

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

/* r199: صفّ كتاب — RowItem داخل RowList: رقاقة هوية الكتاب (الفئة على
 * حقل بلون الكتاب — aria-hidden) | العنوان/المؤلف/الفئة | الحالة + زر
 * الاستعارة. الاسم والمؤلف والفئة تُقرأ من جسم الصف مرة واحدة. */
function BookRow({ book }: { book: Book }) {
  const borrow = useBorrowBook();
  const unavailable = book.availableCopies === 0;
  const Cmp = categoryIcon(book.category);
  // Shared default tint: lib/courseMeta.ts (wave 9-a).
  const tint = courseTint(book.themeColor);

  const onBorrow = async () => {
    try {
      const loan = await borrow.mutateAsync(book.id);
      // موعد الإرجاع يصل من الخلفية (14 يوماً) — نقوله للطالب فوراً.
      toast.success(`موعد إرجاع «${book.title}»: ${formatDateAr(loan.dueAt)}.`, {
        title: 'تمّت الاستعارة',
      });
    } catch (e) {
      // 409ات الخلفية عربية (ازدواج الاستعارة/نفاد النسخ) — تُعرض كما هي.
      toast.error(apiErrorMessage(e, 'تعذَّرت الاستعارة — تحقّق من اتصالك وحاول مرة أخرى.'));
    }
  };

  return (
    <RowItem
      leading={
        /* r186: typographic jacket (identity chip at row scale) —
         * deterministic cover from the book's own data (category icon +
         * band on the book's tint). Decorative by contract: aria-hidden
         * keeps the accessible title/author in the row body. */
        <span
          className="lib-book-cover rs-book-cover"
          aria-hidden="true"
          style={{
            background: `color-mix(in srgb, ${tint} 12%, var(--surface))`,
            ['--book-tint' as never]: tint,
          }}
        >
          <span className="lib-cover-mark">
            <Icon icon={Cmp} size={22} strokeWidth={1.6} />
          </span>
          <span className="lib-cover-band">
            <Icon icon={Cmp} size={11} strokeWidth={2.2} />
            <span>{categoryLabel(book.category)}</span>
          </span>
        </span>
      }
      title={book.title}
      meta={
        <>
          <span>{book.author}</span>
          <span>·</span>
          <span>{categoryLabel(book.category)}</span>
          {book.rating != null && (
            <span className="flex items-center gap-1 font-mono">
              <Icon icon={Star} size={11} strokeWidth={2.2} />
              <bdi>{book.rating}</bdi>
            </span>
          )}
        </>
      }
      trailing={
        <span className="rs-book-tail">
          <Badge color={book.availableCopies > 0 ? 'green' : undefined}>
            {book.availableCopies > 0 ? 'متاح' : 'مستعار'}
          </Badge>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => void onBorrow()}
            disabled={unavailable || borrow.isPending}
            title={unavailable ? 'لا توجد نسخ متاحة للاستعارة حالياً' : undefined}
            aria-label={
              unavailable
                ? `استعارة ${book.title} — لا توجد نسخ متاحة حالياً`
                : `استعارة ${book.title}`
            }
          >
            {borrow.isPending ? 'جارٍ الاستعارة…' : 'استعارة'}
          </button>
        </span>
      }
    />
  );
}

/* صفّ استعارة نشطة — الطفرة (الإرجاع) خاصة بالصف، وحالة الاستحقاق
 * تعيد استعمال منطق dueSoon نفسه (≤3 أيام) وتضيف المتأخر. */
function LoanRow({ loan }: { loan: MyLoan }) {
  const returnLoan = useReturnLoan();
  const daysLeft = (new Date(loan.dueAt).getTime() - Date.now()) / 86_400_000;
  const overdue = daysLeft < 0 || loan.status === 'OVERDUE';
  const dueSoon = !overdue && daysLeft <= 3;
  const state = overdue
    ? { color: 'red' as const, label: 'متأخر الإرجاع' }
    : dueSoon
      ? { color: 'amber' as const, label: 'ينتهي قريباً' }
      : { color: 'green' as const, label: 'نشطة' };

  const onReturn = async () => {
    try {
      await returnLoan.mutateAsync(loan.id);
      toast.success(`أُعيد «${loan.book.title}» إلى المكتبة.`, { title: 'تمّ الإرجاع' });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'تعذَّر الإرجاع — تحقّق من اتصالك وحاول مرة أخرى.'));
    }
  };

  return (
    <RowItem
      title={loan.book.title}
      meta={
        <>
          <Badge color={state.color}>{state.label}</Badge>
          <span>موعد الإرجاع: <bdi className="font-mono">{formatDateAr(loan.dueAt)}</bdi></span>
          <span>·</span>
          <span>استُعير: {formatDateAr(loan.borrowedAt)}</span>
        </>
      }
      trailing={
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => void onReturn()}
          disabled={returnLoan.isPending}
          aria-label={`إرجاع ${loan.book.title}`}
        >
          <Icon icon={Undo2} size={13} />
          {returnLoan.isPending ? 'جارٍ الإرجاع…' : 'إرجاع'}
        </button>
      }
    />
  );
}

export default function LibraryPage() {
  // r155b: ‎?tab=research|books يفتح التبويب المقصود مباشرة (رجوع عارض
  // المستندات وأي رابط عميق) — يُقرأ مرة عند الوصل فقط (دلالة
  // Deep-link، نمط AdminStudentsPage) حتى لا تُنازع نقرات المستخدم
  // لاحقاً؛ أي قيمة خارج اتحاد Tab تسقط إلى 'books'.
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return t === 'research' || t === 'books' ? t : 'books';
  });
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  /* r184: page pointer for the paginated books envelope. A changed
   * category/search restarts the browse from page 1 (the CatalogPage
   * filter-reset convention) — the fold-back effect below only
   * catches the shrunken-tail race. */
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [cat, debouncedQ]);
  // Mobile category-filter Sheet (21-b hand-off): draft-then-apply —
  // the chips edit `draftCat`; «تطبيق» commits it to the live query,
  // «مسح» resets to 'all', Esc/overlay-close discards the draft.
  const isNarrow = useIsNarrowLayout(640);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [draftCat, setDraftCat] = useState('all');

  const openFilterSheet = () => {
    setDraftCat(cat);
    setFilterSheetOpen(true);
  };
  const applyFilters = () => {
    setCat(draftCat);
    setFilterSheetOpen(false);
  };
  const clearFilters = () => {
    setDraftCat('all');
    setCat('all');
    setFilterSheetOpen(false);
  };

  // Debounce the search input — wait 250ms of idle typing before firing.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Both tabs share the debounced query — the books query must fire on the
  // debounced value too, not per keystroke (mirrors the research tab).
  const books = useBooks({
    category: cat === 'all' ? undefined : cat,
    q: debouncedQ,
    page,
    limit: BOOKS_PAGE_SIZE,
  });
  /* r184: the envelope owns the truth — rows and meta are separate
   * (meta.total is the SERVER's filtered total, never data.length). */
  const bookRows = books.data?.data ?? [];
  const booksMeta = books.data?.meta;
  const booksTotalPages = Math.max(1, booksMeta?.totalPages ?? 1);
  /* A shrunken result set (search narrowed while on page 3) can leave
   * the pointer past the last real page — the server answers an empty
   * data array. Fold the pointer back to the last page instead of
   * showing a misleading "no results" wall; setState to the same value
   * is a no-op, so this cannot loop. (CatalogPage's exact guard.) */
  useEffect(() => {
    if (booksMeta && page > Math.max(1, booksMeta.totalPages)) {
      setPage(Math.max(1, booksMeta.totalPages));
    }
  }, [booksMeta, page]);
  const research = usePublishedResearch();
  const search = useResearchSearch(debouncedQ);
  const loans = useMyLoans();
  const isResearchTab = tab === 'research';

  // Loan facts
  const activeLoans = loans.data?.filter((l) => l.status === 'ACTIVE') ?? [];
  /* r155b: الاستعارات «الفتوحة» للقائمة — ACTIVE و OVERDUE معاً. */
  const openLoans = loans.data?.filter((l) => l.status !== 'RETURNED') ?? [];
  const dueSoon = activeLoans.filter((l) => {
    const days = (new Date(l.dueAt).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 3;
  }).length;
  /* r184: the honest total reads the server's meta.total — never the
   * (possibly truncated) array length. */
  const totalBooks = booksMeta?.total ?? null;
  const booksFiltered = debouncedQ.length > 0 || cat !== 'all';

  // When the research tab is active and the user has typed >=2 chars, show
  // server-side search results (with snippets). Otherwise show the full archive.
  const researchInUse = isResearchTab && debouncedQ.length >= 2 && search.data;
  const visibleResearch = researchInUse
    ? search.data!.data
    : research.data ?? [];

  // Research-tab facts — one StatLine, no card wall.
  const researchCells: StatLineItem[] = [
    {
      label: 'بحوث منشورة',
      value: research.data?.length != null ? formatInt(research.data.length) : '—',
    },
    {
      label: 'مؤلفون طلابيون',
      value: research.data ? formatInt(new Set(research.data.map((p) => p.student.id)).size) : '—',
    },
    {
      label: 'متوسط التقييم',
      value: research.data && research.data.length
        ? <bdi>{`${formatNum(Math.round((research.data.reduce((s, p) => s + (p.grade ?? 0), 0) / research.data.length) * 10) / 10, { maximumFractionDigits: 1 })}/20`}</bdi>
        : '—',
    },
    {
      label: 'منشورة هذا العام',
      value: research.data ? formatInt(research.data.filter((p) => p.publishedAt && new Date(p.publishedAt).getFullYear() >= new Date().getFullYear()).length) : '—',
    },
  ];

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

  const tabsStrip = (
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
  );

  return (
    <PageFrame width="default">
      <PageHeader
        title="المكتبة الإلكترونية"
        description={
          /* 22-c (A3 P3-10): honest scope — no «آلاف الكتب» overclaim. */
          'كتب المكتبة الأكاديمية وبحوث طلاب الجامعة المنشورة — متاحة للاستعارة الفورية والاطّلاع المرجعي.'
        }
        tabs={tabsStrip}
      />

      {/* Search-first: the page opens with the field, not a KPI wall.
          Both tabs share one debounced query; the placeholder names the
          searched scope so the pill never lies about what it covers. */}
      <div className="rs-search" role="search">
        <span className="rs-search-icon"><Icon icon={Search} size={18} /></span>
        <input
          type="text"
          placeholder={isResearchTab
            ? 'ابحث في عنوان البحث، الملخص، أو محتوى البحث الكامل…'
            : 'ابحث عن كتاب أو مؤلف…'}
          aria-label={isResearchTab ? 'ابحث في البحوث المنشورة' : 'ابحث في الكتب'}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            type="button"
            className="rs-search-clear"
            onClick={() => setQ('')}
            aria-label="مسح البحث"
          >
            <Icon icon={X} size={14} />
          </button>
        )}
      </div>

      {!isResearchTab ? (
        <div role="tabpanel" id="lib-panel-books" aria-labelledby="lib-tab-books" className="flex-col gap-4">
          {/* استعاراتي النشطة — rows when open loans exist, one honest
              line when they don't (no empty-state wall on every visit). */}
          <section className="flex-col gap-2" aria-label="استعاراتي النشطة">
            <div className="flex items-baseline gap-2 flex-wrap">
              <SectionHeader title="استعاراتي النشطة" as="h2" />
              {!loans.isPending && !loans.isError && (
                <span className="rs-row-meta">
                  {countAr(openLoans.length, ['استعارة واحدة', 'استعارتان', 'استعارات', 'استعارة'])}
                  {dueSoon > 0 ? ` · ${formatInt(dueSoon)} تنتهي قريباً` : ''}
                </span>
              )}
            </div>
            {loans.isPending ? (
              <RowList aria-label="استعاراتي" loading density="compact" />
            ) : loans.isError ? (
              <ErrorState error={loans.error} onRetry={() => loans.refetch()} />
            ) : openLoans.length === 0 ? (
              <p className="rs-loans-empty">
                <strong>لا استعارات نشطة</strong> — اضغط «استعارة» على أي كتاب متاح ليظهر هنا مع موعد إرجاعه خلال 14 يوماً.
              </p>
            ) : (
              <RowList aria-label="استعاراتي" density="compact">
                {openLoans.map((l) => (
                  <LoanRow key={l.id} loan={l} />
                ))}
              </RowList>
            )}
          </section>

          {/* Filter row — pills inline on wide screens, one «تصفية»
              trigger + bottom Sheet on phones (draft-then-apply; the
              trigger names the active category so the collapsed state
              never hides what the list is filtered by). */}
          <FilterBar
            filters={isNarrow ? (
              <button
                type="button"
                className="btn outline sm"
                onClick={openFilterSheet}
                aria-haspopup="dialog"
                aria-expanded={filterSheetOpen}
              >
                <Icon icon={SlidersHorizontal} size={14} />
                تصفية{cat !== 'all' ? ` · ${categoryLabel(cat)}` : ''}
              </button>
            ) : (
              /* A bare fragment: FilterBar's own .pf-filterbar-filters is
                 the flex row — the legacy .filter-bar wrapper (a
                 container-type element that collapses as a nested flex
                 child) would stack the pills vertically here. */
              <>
                {CATEGORIES.map((c) => (
                  <Pill key={c.id} on={cat === c.id} icon={c.icon} onClick={() => setCat(c.id)}>
                    {c.label}
                  </Pill>
                ))}
              </>
            )}
            trailing={
              <span className="rs-count">
                {books.isPending
                  ? '…'
                  : totalBooks !== null
                    ? countAr(totalBooks, booksFiltered ? ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'] : BOOK_UNIT)
                    : '—'}
              </span>
            }
          />

          {/* Rendered unconditionally so a viewport resize while open
              never tears the exit animation; Sheet paints null when
              closed. The .lib-filters class keeps the ≤640px 44px pill
              floor (student.css) inside the sheet. */}
          <Sheet
            open={filterSheetOpen}
            onClose={() => setFilterSheetOpen(false)}
            side="bottom"
            ariaLabel="تصفية الكتب"
            title="تصفية الكتب"
            footer={
              <div className="flex gap-2 flex-1">
                <button type="button" className="btn primary sm" style={{ flex: 1 }} onClick={applyFilters}>
                  تطبيق
                </button>
                <button type="button" className="btn ghost sm" style={{ flex: 1 }} onClick={clearFilters}>
                  مسح
                </button>
              </div>
            }
          >
            <div className="filter-bar lib-filters" role="group" aria-label="فئات الكتب">
              {CATEGORIES.map((c) => (
                <Pill
                  key={c.id}
                  on={draftCat === c.id}
                  icon={c.icon}
                  onClick={() => setDraftCat(c.id)}
                >
                  {c.label}
                </Pill>
              ))}
            </div>
          </Sheet>

          <RowList
            aria-label="قائمة الكتب"
            loading={books.isPending}
            empty={
              <EmptyState
                icon={LibraryIcon}
                illustration={booksFiltered ? 'empty-search' : 'empty-library'}
                title={booksFiltered ? 'لا توجد كتب تطابق البحث' : 'لا توجد كتب بعد'}
                description={booksFiltered ? 'جرّب كلمات بحث مختلفة أو إزالة التصنيفات.' : 'ستظهر هنا كتب المكتبة فور توفرها.'}
              />
            }
          >
            {!books.isError && bookRows.map((b) => (
              <BookRow key={b.id} book={b} />
            ))}
          </RowList>
          {books.isError && (
            <ErrorState error={books.error} onRetry={() => books.refetch()} />
          )}
          {/* r184: the honest pager — replaces the silent `limit: 100`
              truncation. RTL: "previous" points inline-start-ward = the
              right chevron (the MessagesInbox / CatalogPage pager
              convention). Hidden when a single page holds everything. */}
          {booksMeta && booksTotalPages > 1 && (
            <div
              className="flex items-center justify-between flex-wrap gap-3"
              style={{ marginBlockStart: 'var(--sp-4)' }}
            >
              <span className="text-xs text-muted">
                الصفحة <bdi>{booksMeta.page}</bdi> من <bdi>{booksTotalPages}</bdi> ·{' '}
                {countAr(booksMeta.total, BOOK_UNIT)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="الصفحة السابقة"
                >
                  <Icon icon={ChevronRight} size={14} /> السابق
                </button>
                <button
                  type="button"
                  className="btn ghost sm"
                  disabled={page >= booksTotalPages}
                  onClick={() => setPage((p) => Math.min(booksTotalPages, p + 1))}
                  aria-label="الصفحة التالية"
                >
                  التالي <Icon icon={ChevronLeft} size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div role="tabpanel" id="lib-panel-research" aria-labelledby="lib-tab-research" className="flex-col gap-4">
          <StatLine items={researchCells} />

          <p className="rs-count" style={{ margin: 0 }}>
            {researchInUse
              ? <><bdi>{visibleResearch.length}</bdi> نتيجة لـ «<bdi>{debouncedQ}</bdi>»</>
              : <><bdi>{visibleResearch.length}</bdi> بحث منشور</>}
          </p>

          <RowList
            aria-label="قائمة البحوث المنشورة"
            loading={researchInUse ? search.isPending : research.isPending}
            empty={
              <EmptyState
                icon={FileText}
                illustration={q ? 'empty-search' : 'empty-research'}
                title={q ? 'لا توجد نتائج للبحث' : 'لا توجد بحوث منشورة بعد'}
                description={q ? `لم نجد بحثاً يطابق "${q}" — جرّب كلمات أخرى.` : 'سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة.'}
              />
            }
          >
            {!(researchInUse ? search.isError : research.isError) && visibleResearch.map((p) => {
              const hit = researchInUse ? (p as ResearchSearchHit) : null;
              return (
                <ResearchHitRow key={p.id} paper={p} hit={hit} />
              );
            })}
          </RowList>
          {(researchInUse ? search.isError : research.isError) && (
            <ErrorState
              error={researchInUse ? search.error : research.error}
              onRetry={() => (researchInUse ? search.refetch() : research.refetch())}
            />
          )}
        </div>
      )}
    </PageFrame>
  );
}

/* صف نتيجة بحث — المقتطف مع إبراز المطابقة هو جسم الصف (مفتوح
 * افتراضياً؛ القابلة للطيّ لمن يريد قائمة أهدأ). */
function ResearchHitRow({ paper, hit }: {
  paper: {
    id: string;
    title: string;
    abstract?: string | null;
    fileUrl?: string | null;
    grade?: number | null;
    plagiarismPct?: number | null;
    aiContentPct?: number | null;
    publishedAt?: string | null;
    student: { id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null };
    offering?: { course: { code: string; name: string } } | null;
  };
  hit: ResearchSearchHit | null;
}) {
  return (
    <RowItem
      leading={
        <UserAvatar
          initials={paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`}
          color={paper.student.avatarColor ?? undefined}
          size={40}
        />
      }
      title={paper.title}
      meta={
        <>
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering?.course && (
            <span className="font-mono"><bdi>{paper.offering.course.code}</bdi></span>
          )}
          {paper.offering?.course && <span>{paper.offering.course.name}</span>}
          {paper.publishedAt && (
            <span className="font-mono"><bdi>{formatDate(paper.publishedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</bdi></span>
          )}
        </>
      }
      trailing={
        hit ? (
          <Badge color={hit.matchedIn === 'title' ? 'green' : hit.matchedIn === 'abstract' ? 'gold' : 'purple'}>
            {hit.matchedIn === 'title' ? 'تطابق في العنوان' : hit.matchedIn === 'abstract' ? 'تطابق في الملخص' : 'تطابق في المتن'}
          </Badge>
        ) : paper.grade != null ? (
          <Badge color={paper.grade >= 17 ? 'green' : paper.grade >= 14 ? 'gold' : 'amber'} icon={Award}>
            <bdi>{paper.grade}/20</bdi>
          </Badge>
        ) : undefined
      }
      defaultExpanded
      expandLabel={`تفاصيل البحث: ${paper.title}`}
    >
      <div className="flex-col gap-2">
        {/* Snippet when searching (server-sanitized to a <mark>-only
            allowlist before injection); abstract otherwise. The
            highlight is the signal's soft ground — the matched term is
            the row's data. */}
        {hit && hit.snippet ? (
          <p
            className="rs-row-snippet rs-hit-row"
            dangerouslySetInnerHTML={{ __html: sanitizeSnippetHtml(hit.snippet) }}
          />
        ) : paper.abstract ? (
          <p className="rs-row-snippet">{paper.abstract}</p>
        ) : null}

        <div className="rs-row-meta">
          {paper.plagiarismPct != null && (
            <span>انتحال: <bdi className="font-mono">{formatPct(paper.plagiarismPct)}%</bdi></span>
          )}
          {paper.aiContentPct != null && (
            <span>ذكاء اصطناعي: <bdi className="font-mono">{formatPct(paper.aiContentPct)}%</bdi></span>
          )}
          {(paper.plagiarismPct != null || paper.aiContentPct != null) && (
            <span>محاكاة</span>
          )}
          <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)' }}>
            <Icon icon={ShieldCheck} size={11} strokeWidth={2} />
            تم التحقق من النشر
          </span>
        </div>

        {paper.fileUrl && (
          <div className="rs-row-actions">
            <Link
              to={`/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent('/student/library?tab=research')}&paper=${encodeURIComponent(paper.id)}`}
              className="btn primary sm"
            >
              <Icon icon={FileText} size={13} />
              اقرأ البحث كاملاً
            </Link>
          </div>
        )}
      </div>
    </RowItem>
  );
}
