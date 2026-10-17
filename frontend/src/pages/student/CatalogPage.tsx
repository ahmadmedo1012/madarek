import { useEffect, useState, type CSSProperties } from 'react';
import {
  Search, X, BookOpen, Info, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { courseIcon, courseTint } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { useAuthStore } from '../../stores/auth.store';
import { useCoursesCatalog, type CatalogCourseRow } from '../../hooks/useResources';

/**
 * r180-F4 — «دليل المقررات»: the student-facing catalogue of their
 * CURRENT institution (GET /courses?institutionSlug=…, q + pagination).
 *
 * Honest boundary, matching the CoursesPage empty-state contract:
 * enrollment in this product is ADMIN-MEDIATED — the cards render
 * catalogue info only (code, name, icon, department, credits) with NO
 * enroll button, and the banner above the grid names the real door
 * (إدارة الكلية). The grid reuses the enrolled-courses card grammar
 * (thumb-card + courseIcon tint well) so a course reads the same on
 * both surfaces; the search box is the LibraryPage GlobalSearch
 * grammar (aria-label + × clear) with its 250ms debounce, and the
 * pagination footer is the MessagesInbox convention (RTL chevrons,
 * countAr total).
 */

/* One server page of the catalogue — grid-3 × 4 rows keeps the page
 * an even 12-card grid on desktop. */
const CATALOG_PAGE_SIZE = 12;

const COURSE_UNIT: [string, string, string, string] = ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'];

const CREDITS_UNIT: [string, string, string, string] = ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'];

/** Shape-matched loading skeleton for the catalogue grid (the
 *  CourseGridSkeleton grammar from CoursesPage — thumb-card anatomy,
 *  never a bare spinner). */
function CatalogGridSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div className="thumb-card" key={i} aria-hidden>
          <div className="thumb-card-image">
            <Skeleton width={56} height={56} rounded="var(--r-lg)" />
          </div>
          <div className="thumb-card-body">
            <Skeleton width="40%" height={12} />
            <Skeleton width="85%" height={16} />
            <Skeleton width="55%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* The catalogue card — the enrolled CourseCard's read-only twin: the
 * same thumb-card anatomy, tint well and code-chip scent, but a plain
 * <div> (no anchor, no CTA): there is nothing a student can DO with a
 * catalogue row in this product — enrollment is admin-mediated, and a
 * link/button would promise an action the platform does not offer. */
function CatalogCard({ c, i }: { c: CatalogCourseRow; i: number }) {
  const Cmp = courseIcon(c.code ?? c.name);
  const tint = courseTint(c.themeColor);
  const department = c.department?.name;
  return (
    <div
      className="thumb-card"
      style={{ '--cc-i': i, '--course-tint': tint } as CSSProperties}
    >
      <div className="thumb-card-image">
        <span>
          <Icon icon={Cmp} size={28} strokeWidth={1.6} />
        </span>
      </div>
      <div className="thumb-card-body">
        <div className="thumb-card-meta">
          <Badge><bdi className="font-mono">{c.code}</bdi></Badge>
          <span className="thumb-card-count">
            {countAr(c.credits, CREDITS_UNIT)}
          </span>
        </div>
        <div className="thumb-card-title" title={c.name}>{c.name}</div>
        <div className="thumb-card-sub" title={department ?? undefined}>
          {department ?? 'قسم غير محدَّد'}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  // The institution context of the current session (the token's `inst`
  // claim, persisted by the auth store) — the catalogue is scoped to
  // it. Null = no context yet; the query stays disabled and the page
  // says so instead of rendering a fabricated list.
  const institutionName = useAuthStore((s) => s.currentInstitution?.name ?? null);
  const institutionSlug = useAuthStore((s) => s.currentInstitution?.slug ?? null);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search input — 250ms of idle typing before the query
  // fires (the LibraryPage convention; api.ts clamps q at the
  // transport boundary to the backend's 120-char contract). A changed
  // term restarts the browse from page 1 (the admin register's
  // filter-reset convention) — the clamp effect below only catches the
  // shrunken-tail race.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const catalog = useCoursesCatalog(institutionSlug, debouncedQ, page, CATALOG_PAGE_SIZE);
  const rows = catalog.data?.data ?? [];
  const meta = catalog.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  /* A shrunken result set (search narrowed while on page 3) can leave
   * the page pointer past the last real page — the server answers an
   * empty data array. Fold the pointer back to the last page instead
   * of showing a misleading "no results" wall; setState to the same
   * value is a no-op, so this cannot loop. */
  useEffect(() => {
    if (meta && page > Math.max(1, meta.totalPages)) {
      setPage(Math.max(1, meta.totalPages));
    }
  }, [meta, page]);

  const searching = debouncedQ.length > 0;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">دليل المقرّرات</h1>
          <p className="page-subtitle">
            {institutionName
              ? `فهرس مقرّرات ${institutionName} — للبحث والاطّلاع على الخطة الدراسية.`
              : 'فهرس مقرّرات مؤسستك — للبحث والاطّلاع على الخطة الدراسية.'}
          </p>
        </div>
      </header>

      {/* The honest-door banner (the CoursesPage empty-state contract,
          now on the surface that invites the question): enrollment is
          admin-mediated in this product — accent-soft wash + accent-ink
          (the SubmitAssignmentModal done-banner grammar, tokens only). */}
      <div
        role="note"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-2)',
          padding: 'var(--sp-3) var(--sp-4)',
          borderRadius: 'var(--r-md)',
          background: 'var(--accent-soft)',
          color: 'var(--accent-ink)',
          fontSize: 'var(--fs-sm)',
          lineHeight: 'var(--lh-base)',
        }}
      >
        <span style={{ flexShrink: 0, marginTop: 2 }}><Icon icon={Info} size={15} /></span>
        <span>التسجيل في المقررات تتم إدارته عبر إدارة الكلية — تواصل مع إدارة مؤسستك.</span>
      </div>

      {/* Search bar — the LibraryPage GlobalSearch grammar: aria-label,
          × clear while the field carries text. */}
      <Card compact>
        <div className={`topbar-search${q ? ' has-clear' : ''}`} style={{ width: '100%', maxWidth: 360 }}>
          <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
          <input
            type="text"
            placeholder="ابحث باسم المقرّر أو رمزه…"
            aria-label="ابحث في دليل المقرّرات"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              className="topbar-search-clear"
              onClick={() => setQ('')}
              aria-label="مسح البحث"
            >
              <Icon icon={X} size={12} />
            </button>
          )}
        </div>
      </Card>

      {catalog.isError ? (
        <Card><ErrorState error={catalog.error} onRetry={() => catalog.refetch()} /></Card>
      ) : !institutionSlug ? (
        /* First: the context gate — a disabled query stays pending
           forever (React Query never resolves it), so the honest
           no-context state must be checked BEFORE the skeleton. */
        <Card>
          <EmptyState
            icon={BookOpen}
            title="لم تُحدَّد مؤسستك بعد"
            description="اختر مؤسستك من مبدّل المؤسسة في الشريط الأعلى لعرض دليل مقرّراتها."
          />
        </Card>
      ) : catalog.isPending ? (
        <CatalogGridSkeleton />
      ) : !rows.length ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            illustration={searching ? 'empty-search' : undefined}
            title={searching ? 'لا توجد مقرّرات تطابق البحث' : 'لا توجد مقرّرات بعد'}
            description={searching
              ? `لم نجد مقرّراً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`
              : 'لم تُضف مقرّرات إلى دليل مؤسستك حتى الآن — ستظهر هنا فور إضافتها من الإدارة.'}
          />
        </Card>
      ) : (
        <>
          <p className="courses-summary">
            <bdi>{countAr(meta?.total ?? rows.length, COURSE_UNIT)}</bdi>
            {searching && <> · نتائج البحث عن «<bdi>{debouncedQ}</bdi>»</>}
          </p>
          <div className="grid-3 courses-grid">
            {rows.map((c, i) => (
              <CatalogCard key={c.id} c={c} i={i} />
            ))}
          </div>
          {meta && totalPages > 1 && (
            <div
              className="flex items-center justify-between flex-wrap gap-3"
              style={{ marginBlockStart: 'var(--sp-4)' }}
            >
              <span className="text-xs text-muted">
                الصفحة <bdi>{meta.page}</bdi> من <bdi>{totalPages}</bdi> ·{' '}
                {countAr(meta.total, COURSE_UNIT)}
              </span>
              <div className="flex gap-2">
                {/* RTL: "previous" points inline-start-ward = the right
                    chevron (the MessagesInbox pager convention). */}
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
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="الصفحة التالية"
                >
                  التالي <Icon icon={ChevronLeft} size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
