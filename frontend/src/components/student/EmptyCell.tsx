import type { ReactNode } from 'react';

/**
 * EmptyCell — R319 §B2 · the hatched empty state.
 *
 * The dashboard's empties («راحة», «لا شيء بعد», «لا حصص أو مهام…»)
 * were bare text on paper. On a drawing sheet an empty region is
 * HATCHED — a diagonal 45° hatch cell in the line color (the landing's
 * bp-hatch / the reference's stipple-and-hatch textures, done in CSS
 * here), a quiet label under it, an optional explanatory note, and ONE
 * action where the empty is actionable (empty courses → the catalog).
 */
export function EmptyCell({
  label,
  note,
  action,
}: {
  /** The short honest label («راحة», «لا مقرّرات بعد»). */
  label: string;
  /** Optional explanation line (the old bare-text prose, kept honest). */
  note?: ReactNode;
  /** Optional single action — a quiet link, never an accent button. */
  action?: ReactNode;
}) {
  return (
    <div className="r319s-empty">
      <span className="r319s-empty-hatch" aria-hidden="true" />
      <div className="r319s-empty-body">
        <span className="r319s-empty-label">{label}</span>
        {note !== undefined && <span className="r319s-empty-note">{note}</span>}
        {action !== undefined && <span className="r319s-empty-action">{action}</span>}
      </div>
    </div>
  );
}
