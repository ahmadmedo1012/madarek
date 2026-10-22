import { useState, useEffect } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIsNarrowLayout } from '../../hooks/useIsNarrowLayout';
import {
  Search, Library as LibraryIcon, BookOpen,
  Code, Network, Database, Bot, ShieldCheck, Star, FileText, X,
  SlidersHorizontal, Undo2, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { Pill, UserAvatar } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
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
  PageFrame, PageHeader, RowList, RowItem, FilterBar,
} from '../../components/patterns';
import '../../styles/research.css';
/* R305-A7 «Heron»: the scoped research/PDF/library sheet — loaded
 * DIRECTLY AFTER the family sheet so later source order inside
 * @layer pages wins the equal-specificity ties (§0 scoping contract). */
import '../../styles/r305-research-pdf-ai.css';

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

/* R305-A7: status chips — dot + Arabic label (state never rides color
 * alone). The chips vocabulary rides the shared §4 anatomy. */
type ChipTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
function StatusChip({ tone, label }: { tone?: ChipTone; label: ReactNode }) {
  return (
    <span className={`r305rp-chip${tone ? ` r305rp-chip--${tone}` : ''}`}>
      <span className="r305rp-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

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

/** The borrower's path to the document viewer for a paper — the same
 * deep link every research surface mints (title + back context). */
function paperReaderPath(fileUrl: string, title: string, back: string, paperId: string): string {
  return `/document/${encodeURIComponent(fileUrl.split('/').pop() ?? '')}` +
    `?title=${encodeURIComponent(title)}&back=${encodeURIComponent(back)}&paper=${encodeURIComponent(paperId)}`;
}

/* r199/r304: صفّ كتاب — RowItem داخل RowList: رقاقة هوية الكتاب (الفئة
 * على حقل بلون الكتاب — aria-hidden) | العنوان/المؤلف/الفئة | الحالة +
 * زر الاستعارة. الاسم والمؤلف والفئة تُقرأ من جسم الصف مرة واحدة،
 * وشارة النسخ تحمل العدد الحقيقي في عنوانها (r304: الوصف لا يكذب). */
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

  const availabilityHint = unavailable
    ? 'لا توجد نسخ متاحة للاستعارة حالياً'
    : countAr(book.availableCopies, ['نسخة متاحة واحدة', 'نسختان متاحتان', 'نسخ متاحة', 'نسخة متاحة']);

  return (
    <RowItem
      leading={
        /* final-research D: the identity chip at its true row scale —
         * deterministic jacket from the book's own data (category glyph
         * on the book's tint, spine strip on the leading edge).
         * Decorative by contract: aria-hidden keeps the accessible
         * title/author/category in the row body — the category name
         * reads ONCE, in the row meta. */
        <span
          className="lib-book-cover rs-book-cover"
          aria-hidden="true"
          style={{
            background: `color-mix(in srgb, ${tint} 12%, var(--surface))`,
            ['--book-tint' as never]: tint,
          }}
        >
          <span className="lib-cover-mark">
            <Icon icon={Cmp} size={20} strokeWidth={1.8} />
          </span>
        </span>
      }
      title={book.title}
      meta={
        <>
          <span>{book.author}</span>
          <span aria-hidden="true">·</span>
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
          <span title={book.totalCopies > 0 ? `${availabilityHint} من ${formatInt(book.totalCopies)}` : undefined}>
            <StatusChip
              tone={book.availableCopies > 0 ? 'success' : undefined}
              label={book.availableCopies > 0 ? 'متاح' : 'مستعار'}
            />
          </span>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => void onBorrow()}
            disabled={unavailable || borrow.isPending}
            aria-disabled={borrow.isPending || undefined}
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
      /* r307 (audit 1-D #1): the row detail — a student can inspect a
         book BEFORE borrowing. Honest data only (the model has no
         description field): the full availability math, the category's
         Arabic name, the rating, and the borrow term (14 days — the
         backend's own loan rule, catalog.routes.ts:173). Nothing
         invented, nothing decorated. */
      expandLabel={`تفاصيل ${book.title}`}
    >
      <div className="lib-book-detail">
        <div className="lib-book-detail-row">
          <span className="lib-book-detail-k">النسخ</span>
          <span className="lib-book-detail-v">
            <bdi>{formatInt(book.availableCopies)}</bdi> متاحة من <bdi>{formatInt(book.totalCopies)}</bdi>
            {' — '}
            {availabilityHint}
          </span>
        </div>
        <div className="lib-book-detail-row">
          <span className="lib-book-detail-k">الفئة</span>
          <span className="lib-book-detail-v">{categoryLabel(book.category)}</span>
        </div>
        {book.rating != null && (
          <div className="lib-book-detail-row">
            <span className="lib-book-detail-k">التقييم</span>
            <span className="lib-book-detail-v"><bdi>{book.rating}</bdi> من 5</span>
          </div>
        )}
        <div className="lib-book-detail-row">
          <span className="lib-book-detail-k">مدة الاستعارة</span>
          <span className="lib-book-detail-v">14 يوماً من موعد الاستعارة، ويصلك موعد الإرجاع في إشعار التأكيد.</span>
        </div>
        {unavailable && (
          <div className="lib-book-detail-row">
            <span className="lib-book-detail-k">الحالة</span>
            <span className="lib-book-detail-v">جميع النسخ مستعارة حالياً — جرّب لاحقاً أو استعرض البحوث في هذه الفئة.</span>
          </div>
        )}
      </div>
    </RowItem>
  );
}

/* ─── استعاراتي — سطح «واصل القراءة» ────────────────────────────────
   r304: الاستعارات النشطة ليست صفوفاً عادية — هي عملٌ غير منتهٍ: كل
   استعارة تحمل عدّاد الوقت المتبقي (نافذة الإرجاع 14 يوماً هي المقياس
   الصادق: التعبئة = ما تبقّى، وأحمر بعد الصفر)، وزر الإرجاع يبقى في
   نهاية الصف. الحالة تُقرأ مرة: الشارة (متأخرة/قريبة/نشطة) + التاريخ. */

/** Due-window meter — remaining time of the 14-day loan as a calm bar.
 *  Overdue renders an empty red track: nothing left, honestly. */
function LoanDue({ loan }: { loan: MyLoan }) {
  const LOAN_WINDOW_DAYS = 14;
  const daysLeft = (new Date(loan.dueAt).getTime() - Date.now()) / 86_400_000;
  const overdue = daysLeft < 0 || loan.status === 'OVERDUE';
  const dueSoon = !overdue && daysLeft <= 3;
  const remainingPct = overdue ? 0 : Math.max(0, Math.min(100, (daysLeft / LOAN_WINDOW_DAYS) * 100));
  const tier = overdue ? 'is-bad' : dueSoon ? 'is-warn' : '';
  const days = Math.abs(Math.round(daysLeft));
  const text = overdue
    ? `استحقّ منذ ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}`
    : dueSoon
      ? `ينتهي بعد ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}`
      : `متبقٍ ${countAr(days, ['يوم واحد', 'يومين', 'أيام', 'يوماً'])}`;
  return (
    <span className="rs-loan-due">
      <span className="rs-loan-due-track" role="img"
        aria-label={`الوقت المتبقي للاستعارة: ${text} من أصل ${LOAN_WINDOW_DAYS} يوماً`}>
        <span className={`rs-loan-due-fill ${tier}`} style={{ inlineSize: `${remainingPct}%` }} />
      </span>
      <span className="rs-loan-due-text font-mono"><bdi>{text}</bdi></span>
    </span>
  );
}

function LoanRow({ loan }: { loan: MyLoan }) {
  const returnLoan = useReturnLoan();
  const daysLeft = (new Date(loan.dueAt).getTime() - Date.now()) / 86_400_000;
  const overdue = daysLeft < 0 || loan.status === 'OVERDUE';
  const dueSoon = !overdue && daysLeft <= 3;
  /* R305-A7: the loan state rides the shared chip anatomy — dot + tone
   * + the Arabic label, never color alone. */
  const state = overdue
    ? { tone: 'danger' as const, label: 'متأخر الإرجاع' }
    : dueSoon
      ? { tone: 'warning' as const, label: 'ينتهي قريباً' }
      : { tone: 'success' as const, label: 'نشطة' };

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
          <span>{loan.book.author}</span>
          <span aria-hidden="true">·</span>
          {loan.book.category && (
            <>
              <span>{categoryLabel(loan.book.category)}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <StatusChip tone={state.tone} label={state.label} />
        </>
      }
      trailing={
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => void onReturn()}
          disabled={returnLoan.isPending}
          aria-disabled={returnLoan.isPending || undefined}
          aria-label={`إرجاع ${loan.book.title}`}
        >
          <Icon icon={Undo2} size={13} />
          {returnLoan.isPending ? 'جارٍ الإرجاع…' : 'إرجاع'}
        </button>
      }
      defaultExpanded
    >
      {/* The due surface: meter + the two real dates — the body owns
          the time story so the row line stays one calm read. Open by
          default: unfinished work shows its clock without a click. */}
      <div className="flex-col gap-2" style={{ width: '100%' }}>
        <LoanDue loan={loan} />
        <span className="rs-row-meta">
          <span>موعد الإرجاع: <bdi className="font-mono">{formatDateAr(loan.dueAt)}</bdi></span>
          <span aria-hidden="true">·</span>
          <span>استُعير: {formatDateAr(loan.borrowedAt)}</span>
        </span>
      </div>
    </RowItem>
  );
}

/** Shape-matched loans placeholder — mirrors a loan row (title bar +
 * meter line), the loading-closure craft floor. */
function LoansSkeleton() {
  return (
    <div className="rs-loans" aria-busy="true" aria-live="polite">
      {[0, 1].map((i) => (
        <div key={i} className="flex-col gap-2" aria-hidden>
          <Skeleton width="45%" height={14} />
          <Skeleton width="70%" height={8} />
        </div>
      ))}
    </div>
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
  // r307 (audit 1-D #9): a ONE-character research query silently listed the
  // full archive — the server floor is 2 chars (its meta says too_short).
  // Now the honest floor state: the list stays empty and the empty-state
  // explains the rule instead of pretending the query ran.
  const researchFloorShort = isResearchTab && !researchInUse && debouncedQ.length === 1;
  const visibleResearch = researchInUse
    ? search.data!.data
    : researchFloorShort
      ? []
      : research.data ?? [];

  // r304 — sensible grouping: the archive reads by course when browsing
  // (two or more distinct courses present); search results stay flat so
  // the match order (title → abstract → body) is never scattered.
  const researchGroups = (() => {
    if (researchInUse || visibleResearch.length === 0) return null;
    const byCourse = new Map<string, { label: string; code: string | null; papers: typeof visibleResearch }>();
    for (const p of visibleResearch) {
      const course = p.offering?.course;
      const key = course ? course.code : '—';
      const entry = byCourse.get(key);
      if (entry) {
        entry.papers.push(p);
      } else {
        byCourse.set(key, {
          label: course ? course.name : 'بحوث عامة',
          code: course ? course.code : null,
          papers: [p],
        });
      }
    }
    if (byCourse.size < 2) return null;
    return [...byCourse.values()];
  })();

  // Research-tab facts — the ONE deep band on the page: the archive
  // summary reads as a metric register (mono numerals over labels).
  const researchCells: Array<{ label: string; value: ReactNode }> = [
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

  /* The toolbar's trailing count — each tab names its own scope
     honestly (the pill never lies about what it covers). */
  const toolbarCount = isResearchTab
    ? (researchInUse
      ? <><bdi>{visibleResearch.length}</bdi> نتيجة لـ «<bdi>{debouncedQ}</bdi>»</>
      : researchFloorShort
        ? <>حرف واحد — البحث يبدأ من حرفين</>
        : <><bdi>{visibleResearch.length}</bdi> بحث منشور</>)
    : (books.isPending
      ? '…'
      : totalBooks !== null
        ? countAr(totalBooks, booksFiltered ? ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'] : BOOK_UNIT)
        : '—');

  /* The active filter chip — books tab only; the collapsed filter
     state names itself (matches the Sheet trigger's text). */
  const filterChip = !isResearchTab && cat !== 'all' && (
    <button
      type="button"
      className="rs-filter-chip"
      onClick={() => setCat('all')}
      aria-label={`إزالة تصفية ${categoryLabel(cat)}`}
    >
      <Icon icon={SlidersHorizontal} size={12} />
      {categoryLabel(cat)}
      <Icon icon={X} size={12} />
    </button>
  );

  // The research empty-state names the search that ACTUALLY ran: a
  // no-hits answer only when the debounced server search resolved
  // empty; an unfinished or short query falls back to the honest
  // archive-empty (the old pin keyed this off the RAW q, mislabeling
  // an empty archive as a failed search).
  const researchSearchActive = researchInUse && visibleResearch.length === 0;
  const researchEmpty = (
    <EmptyState
      icon={FileText}
      illustration={researchSearchActive ? 'empty-search' : 'empty-research'}
      title={researchFloorShort
        ? 'أكمل البحث'
        : researchSearchActive ? 'لا توجد نتائج للبحث' : 'لا توجد بحوث منشورة بعد'}
      description={researchFloorShort
        ? 'البحث في البحوث يبدأ من حرفين على الأقل — أضف حرفًا ثانيًا وسيبدأ البحث فورًا.'
        : researchSearchActive
          ? `لم نجد بحثاً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`
          : 'سيظهر هنا أرشيف بحوث الطلاب فور إجازتها من الأساتذة.'}
    />
  );

  return (
    /* R305-A7 marker root — every Heron rule in the scoped sheet hangs
     * off .r305rp; portals (the filter Sheet) reach through §9's
     * body:has(.r305rp). The patterns PageFrame rides INSIDE. */
    <div className="r305rp">
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
          Both tabs share one debounced query; the count at the bar's
          trailing edge names the searched scope so it never lies about
          what it covers. The field sits in the Heron well; the eyebrow
          classifies the block. */}
      <div className="rs-toolbar" role="search">
        <span className="r305rp-eyebrow r305rp-lib-searcheyebrow">
          {isResearchTab ? 'بحث البحوث' : 'بحث المكتبة'}
        </span>
        <div className="rs-search">
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
        <div className="rs-toolbar-side">
          {filterChip}
          {/* r305-a7 a11y: the count is the async answer (debounced search,
           * envelope totals, paging) — a polite live region so the resolved
           * state is announced, not just painted. */}
          <span className="rs-count" aria-live="polite">{toolbarCount}</span>
        </div>
      </div>

      {!isResearchTab ? (
        <div role="tabpanel" id="lib-panel-books" aria-labelledby="lib-tab-books" className="flex-col gap-4">
          {/* استعاراتي — the continue surface: rows when open loans
              exist, one honest technical empty line when they don't.
              R305-A7: a framed panel; the kicker carries the heading +
              the honest count with the hairline filling the remainder. */}
          <section className="r305rp-panel r305rp-lib-loans" aria-label="استعاراتي النشطة">
            <div className="r305rp-kicker">
              <h2 className="r305rp-kicker-title">استعاراتي</h2>
              {!loans.isPending && !loans.isError && openLoans.length > 0 && (
                <span className="r305rp-meta-row r305rp-lib-loanscount">
                  {countAr(openLoans.length, ['استعارة واحدة', 'استعارتان', 'استعارات', 'استعارة'])}
                  {dueSoon > 0 ? ` · ${formatInt(dueSoon)} تنتهي قريباً` : ''}
                </span>
              )}
            </div>
            {loans.isPending ? (
              <LoansSkeleton />
            ) : loans.isError ? (
              <ErrorState error={loans.error} onRetry={() => loans.refetch()} />
            ) : openLoans.length === 0 ? (
              <div className="r305rp-empty">
                <span className="r305rp-eyebrow">الحالة</span>
                <p className="r305rp-lib-loansempty-line">
                  <strong>لا استعارات نشطة</strong> — اضغط «استعارة» على أي كتاب متاح ليظهر هنا مع موعد إرجاعه خلال 14 يوماً.
                </p>
              </div>
            ) : (
              <div className="rs-loans">
                {openLoans.map((l) => (
                  <LoanRow key={l.id} loan={l} />
                ))}
              </div>
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
          {/* R305-A7: the page's ONE deep band — the archive summary as
              a metric register (label over mono value). */}
          <section className="r305rp-band r305rp-band--deep r305rp-lib-band" aria-label="ملخص أرشيف البحوث">
            <span className="r305rp-eyebrow">ملخص الأرشيف</span>
            <dl className="r305rp-lib-metrics">
              {researchCells.map((c) => (
                <div key={c.label}>
                  <dt className="r305rp-metric-label">{c.label}</dt>
                  <dd className="r305rp-metric">{c.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Grouped when browsing ≥2 courses; flat while searching or
              when everything lives in one course (no decorative group
              headers around a single entry). */}
          {(!researchInUse && !research.isPending && !research.isError && researchGroups) ? (
            researchGroups.map((g) => (
              <section key={g.code ?? 'general'} className="rs-group" aria-label={`${g.code ? g.code + ' — ' : ''}${g.label}`}>
                <div className="rs-group-head">
                  <h3 className="rs-group-title">
                    {g.code && <bdi className="font-mono">{g.code}</bdi>}
                    {g.code ? ' — ' : ''}{g.label}
                  </h3>
                  <span className="rs-group-count">{countAr(g.papers.length, ['بحث واحد', 'بحثان', 'بحوث', 'بحوثاً'])}</span>
                </div>
                <RowList aria-label={`بحوث ${g.label}`}>
                  {g.papers.map((p) => <ResearchHitRow key={p.id} paper={p} hit={null} />)}
                </RowList>
              </section>
            ))
          ) : (
            <RowList
              aria-label="قائمة البحوث المنشورة"
              loading={researchInUse ? search.isPending : research.isPending}
              empty={researchEmpty}
            >
              {!(researchInUse ? search.isError : research.isError) && visibleResearch.map((p) => {
                const hit = researchInUse ? (p as ResearchSearchHit) : null;
                return (
                  <ResearchHitRow key={p.id} paper={p} hit={hit} />
                );
              })}
            </RowList>
          )}
          {(researchInUse ? search.isError : research.isError) && (
            <ErrorState
              error={researchInUse ? search.error : research.error}
              onRetry={() => (researchInUse ? search.refetch() : research.refetch())}
            />
          )}
        </div>
      )}
    </PageFrame>
    </div>
  );
}

/* صف نتيجة بحث — المقتطف مع إبراز المطابقة هو جسم الصف (مفتوح
 * افتراضياً؛ القابلة للطيّ لمن يريد قائمة أهدأ). r304: العنوان نفسه
 * هو الطريق إلى المستند (وصلة حقيقية بوصلة رجوع صحيحة) — «افتح»
 * واضحة قبل أي توسيع. */
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
  const titleInner = paper.title;
  return (
    <RowItem
      leading={
        <UserAvatar
          initials={paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`}
          color={paper.student.avatarColor ?? undefined}
          size={40}
        />
      }
      title={
        paper.fileUrl ? (
          <Link
            to={paperReaderPath(paper.fileUrl, paper.title, '/student/library?tab=research', paper.id)}
            className="rs-doc-link"
            aria-label={`اقرأ البحث: ${paper.title}`}
          >
            {titleInner}
          </Link>
        ) : titleInner
      }
      meta={
        <>
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering?.course && (
            <>
              <span aria-hidden="true">·</span>
              <span><bdi className="font-mono">{paper.offering.course.code}</bdi> — {paper.offering.course.name}</span>
            </>
          )}
          {paper.publishedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono"><bdi>{formatDate(paper.publishedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</bdi></span>
            </>
          )}
        </>
      }
      trailing={
        hit ? (
          <StatusChip
            tone={hit.matchedIn === 'title' ? 'success' : hit.matchedIn === 'abstract' ? 'gold' : 'info'}
            label={hit.matchedIn === 'title' ? 'تطابق في العنوان' : hit.matchedIn === 'abstract' ? 'تطابق في الملخص' : 'تطابق في المتن'}
          />
        ) : paper.grade != null ? (
          <StatusChip
            tone={paper.grade >= 17 ? 'success' : paper.grade >= 14 ? 'gold' : 'warning'}
            label={<bdi>{paper.grade}/20</bdi>}
          />
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
              to={paperReaderPath(paper.fileUrl, paper.title, '/student/library?tab=research', paper.id)}
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
