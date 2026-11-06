/* T-24 (deadcode ratchet): the pagination-footer family moved to its own
 * leaf module to sever the AdminPages ↔ AdminGovernancePages cycle
 * (AdminGovernancePages imported TablePaginationFooter from AdminPages
 * while AdminPages imported pageList from AdminGovernancePages — the
 * no-circular violation pinned in scripts/deadcode/baseline.json).
 * Implementation is byte-identical to the originals; AdminGovernancePages
 * re-exports pageList so its contract test's import site stays untouched. */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { countAr } from '../../lib/format';

/** Pages rendered either side of the current one before an ellipsis gap. */
const PAGE_NEIGHBORS = 2;

/**
 * Bounded page list for the roster's pagination footer — the wave-6-b
 * OwnerUsersPage helper (always page 1 and the last page, a window of
 * PAGE_NEIGHBORS around the current one, 'gap' markers where numbers
 * were elided; a 200-page result renders ≤ 2·PAGE_NEIGHBORS + 4 buttons).
 * Local twin, not a cross-page import (pages must not pull each other's
 * lazy chunks); tests pin it against the OwnerUsersPage original so the
 * two cannot drift before a shared-lib extraction.
 */
export function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  const include = new Set<number>([1, totalPages]);
  const from = Math.max(1, page - PAGE_NEIGHBORS);
  const to = Math.min(totalPages, page + PAGE_NEIGHBORS);
  for (let p = from; p <= to; p++) include.add(p);
  const out: Array<number | 'gap'> = [];
  let prev = 0;
  for (const p of [...include].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/** countAr forms for the papers register — the footer's birth noun,
 *  kept as the unit default (r157 / 6A9 #2). Exported: AdminPages'
 *  papers register passes it explicitly (T-24 leaf move). */
export const PAPER_UNIT: [string, string, string, string] = ['ورقة واحدة', 'ورقتان', 'أوراق', 'ورقة'];

/** The pagination footer convention (OwnerUsersPage): bounded windowed
 *  page list inside .table-wrap, RTL-correct chevrons.
 *
 *  r157 (6A9 #2): the counted-noun unit is a prop now — the countAr
 *  [one, two, few, many] forms every call site already uses — so the
 *  footer reads its roster's noun (papers «ورقة», courses «مقرّر»,
 *  students «طالب») instead of the hardcoded «ورقة» it shipped with
 *  back when the papers register was its only consumer. Exported: the
 *  students roster (AdminExtraPages) joined the family this round. */
export function TablePaginationFooter({
  page, totalPages, total, unit = PAPER_UNIT, onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** countAr forms — [one, two, few (3–10), many (11+)]. Defaults to
   *  the papers noun (the register this footer was born on). */
  unit?: [string, string, string, string];
  onPage: (p: number) => void;
}) {
  return (
    <div className="table-pagination">
      <span>
        الصفحة {page} من {totalPages} · {countAr(total, unit)}
      </span>
      <div className="table-pagination-actions">
        <button
          type="button"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="الصفحة السابقة"
        >
          <Icon icon={ChevronRight} size={14} />
          السابق
        </button>
        {pageList(page, totalPages).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden style={{ color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              aria-label={`الصفحة ${item}`}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="الصفحة التالية"
        >
          التالي
          <Icon icon={ChevronLeft} size={14} />
        </button>
      </div>
    </div>
  );
}
