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
 *   - Forwards `role` to the resolved scene — role-keyed scenes (the
 *     onboarding role-intro) pick their motif from it; symmetric scenes
 *     ignore it.
 *   - When `decorative` is true, renders aria-hidden and skips alt text.
 *     When false (default), renders role="img" + aria-label. The app is
 *     Arabic-only and ships no i18n runtime, so alt text is passed
 *     directly as an Arabic string via `alt` (the old altKey/i18n path
 *     resolved keys to themselves — raw keys leaked into aria-labels).
 *   - On unregistered names: emits a within-family neutral fallback,
 *     never a broken image.
 *
 * Theme switching is handled by the CSS cascade — scenes consume only
 * --ill-* tokens, which redefine themselves under [data-theme="dark"]
 * and prefers-contrast: more. No JS theme listener required here.
 */
import {
  loadScene,
  SceneFallback,
  type IllustrationName,
  type SceneComponent,
} from '../lib/illustrations';
import type { AppRole } from '../stores/auth.store';
import { useMemo } from 'react';

export interface IllustrationProps {
  name: IllustrationName;
  /** Required when name === 'onboarding-role-intro' (keys the role motif). */
  role?: AppRole;
  /** When true, the SVG is hidden from the accessibility tree. */
  decorative?: boolean;
  /** Arabic alt text; required when decorative !== true. */
  alt?: string;
  /** Optional override for layout direction. Defaults to document.dir. */
  dir?: 'ltr' | 'rtl';
  className?: string;
}

function resolveDir(override: 'ltr' | 'rtl' | undefined): 'ltr' | 'rtl' {
  if (override) return override;
  // The app is RTL-only (index.html hard-locks dir="rtl"); the rtl
  // default also covers non-DOM (SSR/test) renders.
  if (typeof document === 'undefined') return 'rtl';
  return document.documentElement.dir === 'ltr' ? 'ltr' : 'rtl';
}

export function Illustration({
  name,
  role,
  decorative = false,
  alt,
  dir,
  className,
}: IllustrationProps) {
  const Scene = useMemo(() => loadScene(name), [name]);
  const resolvedDir = resolveDir(dir);

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : {
        role: 'img' as const,
        'aria-label': alt,
      };

  // SceneFallback takes no props but is assignable to SceneComponent;
  // typing the union keeps JSX prop checking honest either way.
  const Resolved: SceneComponent = Scene ?? SceneFallback;

  return (
    <div
      className={['illustration', className].filter(Boolean).join(' ')}
      data-illustration={name}
      data-illustration-fallback={Scene ? undefined : 'true'}
      {...accessibilityProps}
    >
      <Resolved dir={resolvedDir} role={role} />
    </div>
  );
}
