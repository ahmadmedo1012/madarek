/**
 * SectionAccent — wrapper component for the useSectionAccent hook.
 *
 * Contract: specs/012-design-graphics-uplift/spec.md US5.
 *
 * Renders any tag (defaults to <section>), attaches the
 * useSectionAccent ref, and applies a `data-accent-kind` attribute
 * + `is-fired` modifier class so CSS can drive the per-kind cascade.
 *
 * Per the contract:
 *   - one-shot per element per page load
 *   - idle-paused via the hook's visibilitychange handler
 *   - reduced-motion-safe — fires immediately, no cascade
 *
 * Per-kind CSS lives in landing.css (added in subsequent slices).
 * This component is the structural anchor; the visual cascade is
 * driven by the dataset markers + the .is-fired class.
 */
import type { ElementType, ReactNode } from 'react';
import { useSectionAccent, type AccentKind } from './useSectionAccent';

export interface SectionAccentProps {
  kind: AccentKind;
  /** HTML tag to render. Defaults to 'section'. */
  as?: ElementType;
  /** IntersectionObserver threshold. Default 0.4. */
  threshold?: number;
  className?: string;
  children?: ReactNode;
}

export function SectionAccent({
  kind,
  as: Tag = 'section',
  threshold,
  className,
  children,
}: SectionAccentProps) {
  const { ref, fired } = useSectionAccent<HTMLElement>(kind, { threshold });
  const cls = [
    'section-accent',
    `section-accent-${kind}`,
    fired ? 'is-fired' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Tag ref={ref as React.Ref<HTMLElement>} className={cls} data-accent-kind={kind}>
      {children}
    </Tag>
  );
}
