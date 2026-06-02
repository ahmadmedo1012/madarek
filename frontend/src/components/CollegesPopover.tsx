import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, GraduationCap, Search, X, ArrowLeft } from 'lucide-react';
import { Icon } from './Icon';
import { api, unwrap } from '../lib/api';
import { filterColleges, type FilterableCollege } from '../pages/colleges/filter-colleges';

/**
 * CollegesPopover — a native <dialog> showing all UoZ colleges grouped
 * by campus, with an inline search and a footer link to the full
 * gallery. Used by the homepage "explore colleges" trigger.
 *
 * Native <dialog>.showModal() gives focus-trap, ESC-to-close, and
 * backdrop styling for free; no library needed.
 */

type CollegeListItem = FilterableCollege & {
  id: string;
  iconEmoji?: string | null;
};

export function CollegesPopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');

  // Fetch colleges only when the popover has been opened at least once.
  // After that, the query stays cached for the rest of the session.
  const [hasOpened, setHasOpened] = useState(false);
  const q = useQuery({
    queryKey: ['colleges'],
    queryFn: () => unwrap<CollegeListItem[]>(api.get('/colleges')),
    staleTime: 5 * 60_000,
    enabled: hasOpened,
  });

  // Sync open prop with the native dialog imperative API.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open) {
      setHasOpened(true);
      if (!node.open) {
        try {
          node.showModal();
        } catch {
          // Some browsers throw if showModal is called on an already-open dialog.
        }
      }
    } else if (node.open) {
      node.close();
      setQuery('');
    }
  }, [open]);

  // Native ESC + backdrop click both fire the dialog's "close" event.
  // We listen once and propagate up so the parent's `open` state stays in sync.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const handleClose = () => onClose();
    node.addEventListener('close', handleClose);
    return () => node.removeEventListener('close', handleClose);
  }, [onClose]);

  // Backdrop-click closes (native <dialog> doesn't do this by default).
  const handleClickOutside = (e: React.MouseEvent<HTMLDialogElement>) => {
    const node = dialogRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const inside =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;
    if (!inside) onClose();
  };

  const data = q.data ?? [];
  const result = useMemo(
    () => filterColleges(data, { query, campus: null }),
    [data, query],
  );

  return (
    <dialog
      ref={dialogRef}
      className="colleges-popover"
      onClick={handleClickOutside}
      aria-labelledby="colleges-popover-title"
    >
      <div className="colleges-popover-inner">
        <header className="colleges-popover-head">
          <div className="colleges-popover-titles">
            <h2 className="colleges-popover-title" id="colleges-popover-title">
              كلّيّات جامعة الزاوية
            </h2>
            <p className="colleges-popover-sub">
              {data.length > 0 ? (
                <>
                  <strong>{data.length}</strong> كلّيّة · {result.byCampus.size} حُرم جامعيّة
                </>
              ) : (
                'تصفّح كلّيّات الجامعة على اختلافها'
              )}
            </p>
          </div>
          <button
            type="button"
            className="colleges-popover-close"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <Icon icon={X} size={18} />
          </button>
        </header>

        <div className="colleges-popover-search">
          <Icon icon={Search} size={16} aria-hidden />
          <input
            type="search"
            placeholder="ابحث عن كلية…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="ابحث عن كلية"
          />
        </div>

        <div className="colleges-popover-body" role="list" aria-busy={q.isLoading}>
          {q.isLoading && (
            <div className="colleges-popover-state">جارٍ تحميل الكلّيّات…</div>
          )}
          {q.isError && (
            <div className="colleges-popover-state colleges-popover-state-err">
              تعذّر تحميل الكلّيّات.{' '}
              <button type="button" className="text-link" onClick={() => q.refetch()}>
                إعادة المحاولة
              </button>
            </div>
          )}
          {q.data && result.total === 0 && query.trim() !== '' && (
            <div className="colleges-popover-state">
              لم نعثر على نتائج لـ <strong>{query}</strong>.
            </div>
          )}
          {q.data && Array.from(result.byCampus.entries()).map(([city, list]) => (
            <section key={city} className="colleges-popover-group" role="listitem">
              <header className="colleges-popover-group-head">
                <span className="colleges-popover-group-icon" aria-hidden>
                  <Icon icon={Building2} size={14} />
                </span>
                <h3 className="colleges-popover-group-title">{city}</h3>
                <span className="colleges-popover-group-count">{list.length}</span>
              </header>
              <ul className="colleges-popover-list">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/colleges/${c.id}`}
                      className="colleges-popover-row"
                      onClick={onClose}
                    >
                      <span className="colleges-popover-row-icon" aria-hidden>
                        <Icon icon={GraduationCap} size={14} />
                      </span>
                      <span className="colleges-popover-row-name">{c.name}</span>
                      {c.nameEn && (
                        <span className="colleges-popover-row-sub">{c.nameEn}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="colleges-popover-foot">
          <Link to="/colleges" className="colleges-popover-foot-link" onClick={onClose}>
            <span>اعرض المعرض الكامل</span>
            <Icon icon={ArrowLeft} size={14} />
          </Link>
        </footer>
      </div>
    </dialog>
  );
}
