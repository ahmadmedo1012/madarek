import type { ReactNode } from 'react';
import { Sheet } from '../overlays';
import { EmptyState } from '../primitives/States';
import { useIsNarrowLayout } from '../../hooks/useIsNarrowLayout';

/**
 * SplitView — قائمة + تفاصيل ملتصقة (عقد Agent S — r210).
 *
 * The Superlist list→detail model: list at the inline-start, the selected
 * item's detail attached at the inline-end. Desktop (≥921px): the detail
 * pane is position:sticky with its own scroll — the page keeps scrolling
 * the list naturally. Mobile (≤920px): the detail is a full-screen Sheet
 * (the house overlay, focus-trapped) and the list fills the viewport;
 * `onDetailClose` returns to the list.
 *
 * `detailOpen` + `detail` are the single source of truth in BOTH bands:
 * on desktop `!detailOpen || !detail` renders `emptyDetail` (or the
 * default honest empty); on mobile the Sheet opens only when both are
 * set. Pass listWidth="narrow" when the list is a lean index (IDs +
 * titles) and the detail deserves the wider share.
 */
export function SplitView({
  list,
  detail,
  detailOpen,
  onDetailClose,
  detailTitle,
  listWidth = 'default',
  emptyDetail,
}: {
  list: ReactNode;
  detail: ReactNode | null;
  detailOpen: boolean;
  onDetailClose(): void;
  /** Names the detail region (desktop aria-label + mobile Sheet title). */
  detailTitle?: string;
  listWidth?: 'narrow' | 'default';
  emptyDetail?: ReactNode;
}) {
  const narrow = useIsNarrowLayout(920);
  const hasDetail = detail !== null && detail !== undefined;
  const desktopDetail = detailOpen && hasDetail
    ? detail
    : emptyDetail ?? (
        <EmptyState
          title="لم يتم تحديد عنصر بعد"
          description="اختر عنصرًا من القائمة لتظهر تفاصيله هنا."
        />
      );
  return (
    <div className={`pf-split${listWidth === 'narrow' ? ' narrow' : ''}`}>
      <div className="pf-split-list">{list}</div>
      <div className="pf-split-detail" aria-label={detailTitle}>
        {desktopDetail}
      </div>
      {narrow && (
        <Sheet
          open={detailOpen && hasDetail}
          onClose={onDetailClose}
          side="end"
          size="full"
          title={detailTitle}
          ariaLabel={detailTitle ?? 'تفاصيل العنصر'}
        >
          {detail}
        </Sheet>
      )}
    </div>
  );
}
