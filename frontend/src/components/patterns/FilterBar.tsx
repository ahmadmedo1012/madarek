import type { FormEvent, ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Icon } from '../Icon';

/**
 * FilterBar — شريط التصفية (عقد Agent S — r210).
 *
 * One calm control row above a list: search (pill input, Lucide glass),
 * filter controls (consumer passes Pill/Tabs/selects), sort, trailing
 * actions. `sticky` pins it to the top of the app's scroll container
 * (.content — the ONLY scroll container in the app) with an opaque
 * background; body never scrolls so plain `position: sticky` is enough.
 */
export type FilterBarSearch = {
  value: string;
  onChange(v: string): void;
  placeholder?: string;
};

export function FilterBar({
  search,
  filters,
  sort,
  trailing,
  sticky = false,
}: {
  search?: FilterBarSearch;
  filters?: ReactNode;
  sort?: ReactNode;
  trailing?: ReactNode;
  sticky?: boolean;
}) {
  if (search === undefined && filters === undefined && sort === undefined && trailing === undefined) {
    return null;
  }
  const onSearchSubmit = (e: FormEvent) => e.preventDefault();
  return (
    <div className={`pf-filterbar${sticky ? ' sticky' : ''}`}>
      {search !== undefined && (
        <form className="pf-filterbar-search" role="search" onSubmit={onSearchSubmit}>
          <span className="pf-filterbar-search-icon" aria-hidden="true">
            <Icon icon={Search} size={16} />
          </span>
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'بحث…'}
            aria-label={search.placeholder ?? 'بحث'}
          />
        </form>
      )}
      {filters !== undefined && <div className="pf-filterbar-filters">{filters}</div>}
      {sort !== undefined && <div className="pf-filterbar-sort">{sort}</div>}
      {trailing !== undefined && <div className="pf-filterbar-trailing">{trailing}</div>}
    </div>
  );
}
