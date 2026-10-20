import type { ReactNode } from 'react';

/**
 * SectionHeader — ترويسة قسم داخل الصفحة (عقد Agent S — r210).
 *
 * h2 by default (the page's h1 belongs to PageHeader); pass as="h3"
 * for nested sections. Actions ride the block-end baseline so a lone
 * button aligns with the title instead of floating.
 */
export function SectionHeader({
  title,
  description,
  actions,
  as = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  const Tag = as;
  return (
    <div className="pf-section-header">
      <div className="pf-section-header-text">
        <Tag className="pf-section-title">{title}</Tag>
        {description !== undefined && <p className="pf-section-desc">{description}</p>}
      </div>
      {actions !== undefined && <div className="pf-section-actions">{actions}</div>}
    </div>
  );
}
