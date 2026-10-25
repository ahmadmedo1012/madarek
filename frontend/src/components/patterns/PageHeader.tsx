import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../Icon';
import { useSheetCode } from '../../lib/sheet-code';

/**
 * PageHeader (patterns) — ترويسة الصفحة الكاملة (عقد Agent S — r210).
 *
 * The one page-opening header: optional breadcrumbs → eyebrow → the
 * route's single semantic <h1> → description → meta → actions → tabs.
 * Supersedes primitives/PageHeader for new pages (that one stays for
 * pages other families still own; Agent Z folds the migration).
 *
 * RTL notes: the breadcrumb separator is ChevronLeft because the app is
 * Arabic-first RTL — the forward direction IS left; Icon renders
 * aria-hidden. Breadcrumb links keep a 44px block target via padding.
 *
 * R319 (C2-G2 · the Heron title bar, additive — same contract as the
 * primitives family): `index` renders the mono `[01]` gutter label
 * inside the h1 (aria-hidden); `sheetCode` renders the sheet's mono
 * identity line above the eyebrow, defaulting to the AMBIENT
 * SheetCodeContext value AppShell provides for the signed-in role —
 * every page gets `SHEET S-01 · STUDENT` (its role's code) with zero
 * page-file changes; an explicit prop overrides, '' opts out.
 */
export type PageBreadcrumb = {
  label: string;
  to?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  breadcrumbs,
  tabs,
  index,
  sheetCode,
}: {
  /** Page title — rendered as the route's single semantic h1. */
  title: string;
  description?: ReactNode;
  /** Small pre-title line (13px, accent-ink). A real classification, never decoration. */
  eyebrow?: string;
  /** Data line under the description (dates, counts — real data only). */
  meta?: ReactNode;
  /** Header actions row — pass one flex node with the page's buttons. */
  actions?: ReactNode;
  /** Breadcrumb trail; the LAST item renders as aria-current="page" (link ignored). */
  breadcrumbs?: PageBreadcrumb[];
  /** Tab strip under the header block — rendered as-is (consumer owns styling via .tabs). */
  tabs?: ReactNode;
  /** R319: optional mono gutter index (`01` renders as `[01]` inside the
   *  h1, aria-hidden). */
  index?: string;
  /** R319: optional sheet identity code — overrides the ambient
   *  SheetCodeContext value (`S-01 · STUDENT`); '' opts the line out. */
  sheetCode?: string;
}) {
  const ambientCode = useSheetCode();
  const code = sheetCode ?? ambientCode;
  const showCode = code !== undefined && code !== '';
  return (
    <header className="pf-page-header">
      {breadcrumbs !== undefined && breadcrumbs.length > 0 && (
        <nav className="pf-breadcrumbs" aria-label="مسار التنقل">
          <ol>
            {breadcrumbs.map((crumb, i) => {
              const last = i === breadcrumbs.length - 1;
              return (
                <li key={`${crumb.label}-${i}`}>
                  {crumb.to !== undefined && !last ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span aria-current={last ? 'page' : undefined}>{crumb.label}</span>
                  )}
                  {!last && (
                    <span className="pf-crumb-sep" aria-hidden="true">
                      <Icon icon={ChevronLeft} size={12} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="pf-page-header-main">
        <div className="pf-page-header-text">
          {showCode && (
            <p className="page-sheet-code" aria-hidden="true">
              <span dir="ltr">{`SHEET ${code}`}</span>
            </p>
          )}
          {eyebrow !== undefined && <p className="pf-eyebrow">{eyebrow}</p>}
          <h1 className="pf-page-title">
            {index !== undefined && index !== '' && (
              <span className="page-index" aria-hidden="true" dir="ltr">{`[${index}]`}</span>
            )}
            {title}
          </h1>
          {description !== undefined && <p className="pf-page-desc">{description}</p>}
          {meta !== undefined && <div className="pf-page-meta">{meta}</div>}
        </div>
        {actions !== undefined && <div className="pf-page-actions">{actions}</div>}
      </div>
      {tabs !== undefined && <div className="pf-page-tabs">{tabs}</div>}
    </header>
  );
}
