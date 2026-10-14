import type { ReactNode } from 'react';

/**
 * PageHeader — the ONE page-opening header of the app shell.
 *
 * r164-a: two page files already hand-rolled private copies of this exact
 * component (TeacherPages ×19 call sites, AdminPages ×8) and ~86 more
 * headers hand-wrote the same 6 lines of raw markup. The primitive is the
 * promoted shared form of that markup — byte-identical DOM, so adoption
 * is a pure fold (no visual change, no CSS change):
 *
 *   <PageHeader title="…" subtitle="…" actions={<Badge …>} />
 *   ─────────────────────────────────────────────────────────
 *   <header className="page-header">
 *     <div className="page-title-block">
 *       <h1 className="page-title">…</h1>
 *       <p className="page-subtitle">…</p>
 *     </div>
 *     {actions}
 *   </header>
 *
 * Contract (base.css §PAGE + polish.css §page-header rhythm):
 *   - `title` is the page's semantic <h1> — exactly one per route
 *     (the h1..h6 hierarchy below it stays the pages' own business).
 *   - `subtitle` is optional; omit it and nothing renders (the pending
 *     branches that say only «جارٍ جمع درجاتك…» still pass a string).
 *   - `actions` renders as a DIRECT flex child of .page-header (never a
 *     wrapper div — the .page-actions wrapper class was deleted in the
 *     13-17 dead-selector sweep for having zero consumers). The flex
 *     row + space-between + wrap of .page-header does the layout, so
 *     several actions should arrive as ONE flex row node from the page.
 *   - RTL correctness is inherited: the CSS family uses logical
 *     properties only; no direction-aware code belongs here.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  /** Page title — rendered as the route's single semantic h1. */
  title: ReactNode;
  /** Optional page subtitle (page-subtitle class, measure-capped 72ch). */
  subtitle?: ReactNode;
  /** Optional header actions — rendered as a direct flex child, as-is. */
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        {subtitle !== undefined && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}
