/**
 * <Illustration> — the only sanctioned wrapper for bespoke scene
 * illustrations across the platform.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/illustration-system.md.
 *
 * Behaviour:
 *   - Reads `dir` from the document (or honours the `dir` prop if given)
 *     so directional scenes (search arm, error arrow) compose correctly
 *     in RTL.
 *   - When `decorative` is true, renders aria-hidden and skips alt text.
 *     When false (default), renders role="img" + aria-label.
 *   - On unregistered names: emits a within-family neutral fallback,
 *     never a broken image.
 *
 * Theme switching is handled by the CSS cascade — scenes consume only
 * --ill-* tokens, which redefine themselves under [data-theme="dark"]
 * and prefers-contrast: more. No JS theme listener required here.
 */
import { useTranslation } from 'react-i18next';
import {
  loadScene,
  SceneFallback,
  type IllustrationName,
} from '../lib/illustrations';
import type { AppRole } from '../stores/auth.store';
import { useMemo } from 'react';

export interface IllustrationProps {
  name: IllustrationName;
  /** Required when name === 'onboarding-role-intro'. */
  role?: AppRole;
  /** When true, the SVG is hidden from the accessibility tree. */
  decorative?: boolean;
  /** Required when decorative !== true. Resolved via i18n. */
  altKey?: string;
  /** Optional override for layout direction. Defaults to document.dir. */
  dir?: 'ltr' | 'rtl';
  className?: string;
}

function resolveDir(override: 'ltr' | 'rtl' | undefined): 'ltr' | 'rtl' {
  if (override) return override;
  if (typeof document === 'undefined') return 'ltr';
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
}

export function Illustration({
  name,
  role: _role,
  decorative = false,
  altKey,
  dir,
  className,
}: IllustrationProps) {
  const { t } = useTranslation();
  const Scene = useMemo(() => loadScene(name), [name]);
  const resolvedDir = resolveDir(dir);

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : {
        role: 'img' as const,
        'aria-label': altKey ? (t(altKey) as string) : undefined,
      };

  const Resolved = Scene ?? SceneFallback;

  return (
    <div
      className={['illustration', className].filter(Boolean).join(' ')}
      data-illustration={name}
      data-illustration-fallback={Scene ? undefined : 'true'}
      {...accessibilityProps}
    >
      <Resolved dir={resolvedDir} />
    </div>
  );
}
