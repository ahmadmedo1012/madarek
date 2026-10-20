import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../Icon';

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
}) {
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
          {eyebrow !== undefined && <p className="pf-eyebrow">{eyebrow}</p>}
          <h1 className="pf-page-title">{title}</h1>
          {description !== undefined && <p className="pf-page-desc">{description}</p>}
          {meta !== undefined && <div className="pf-page-meta">{meta}</div>}
        </div>
        {actions !== undefined && <div className="pf-page-actions">{actions}</div>}
      </div>
      {tabs !== undefined && <div className="pf-page-tabs">{tabs}</div>}
    </header>
  );
}
