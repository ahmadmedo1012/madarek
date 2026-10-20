import { useId, useState } from 'react';
import { Children } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Icon } from '../Icon';
import { EmptyState, ListSkeleton } from '../primitives/States';

/**
 * RowList + RowItem — لغة القوائم الموحّدة (عقد Agent S — r210).
 *
 * Superlist's core move: the LIST is the product. RowList renders a calm
 * bordered surface of rows; RowItem is its canonical child (leading /
 * title / meta / trailing slots + an expandable body). While 1B's
 * RowItem primitive is pending, this local RowItem IS the contract —
 * when 1B lands, RowList's internals re-point to it behind the same
 * props (see CONTRACT.md).
 *
 * States: `loading` renders the shared ListSkeleton; zero children
 * renders `empty` or the honest default EmptyState. The 44px row floor
 * is CSS-enforced (.pf-row min-block-size).
 */
export type RowListProps = {
  children?: ReactNode;
  density?: 'comfortable' | 'compact';
  'aria-label'?: string;
  loading?: boolean;
  empty?: ReactNode;
};

export function RowList({
  children,
  density = 'comfortable',
  'aria-label': ariaLabel,
  loading = false,
  empty,
}: RowListProps) {
  if (loading) return <ListSkeleton rows={6} />;
  const items = Children.toArray(children);
  if (items.length === 0) {
    return <>{empty ?? <EmptyState />}</>;
  }
  return (
    <div
      className={`pf-rowlist${density === 'compact' ? ' compact' : ''}`}
      role={ariaLabel !== undefined ? 'group' : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export type RowItemProps = {
  /** Leading slot: icon, avatar, checkbox — 24px-ish, never a color well. */
  leading?: ReactNode;
  title: ReactNode;
  /** Secondary line under the title (13px muted). */
  meta?: ReactNode;
  /** Block-end slot: badges, counts, small actions. */
  trailing?: ReactNode;
  /** Expandable body — presence of children arms the disclosure button. */
  children?: ReactNode;
  defaultExpanded?: boolean;
  /** Accessible name for the disclosure control (defaults to «التفاصيل»). */
  expandLabel?: string;
};

export function RowItem({
  leading,
  title,
  meta,
  trailing,
  children,
  defaultExpanded = false,
  expandLabel = 'التفاصيل',
}: RowItemProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const bodyId = useId();
  const expandable = children !== undefined && children !== null;
  return (
    <div className={`pf-row${open ? ' open' : ''}`}>
      <div className="pf-row-line">
        {leading !== undefined && <span className="pf-row-leading">{leading}</span>}
        <span className="pf-row-main">
          <span className="pf-row-title">{title}</span>
          {meta !== undefined && <span className="pf-row-meta">{meta}</span>}
        </span>
        {trailing !== undefined && <span className="pf-row-trailing">{trailing}</span>}
        {expandable && (
          <button
            type="button"
            className="pf-row-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={expandLabel}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon icon={ChevronDown} size={16} />
          </button>
        )}
      </div>
      {expandable && open && (
        <div className="pf-row-body" id={bodyId}>
          {children}
        </div>
      )}
    </div>
  );
}
