/**
 * mk-ill <Illustration> — the state-graphics kit dispatcher.
 *
 * Usage (the ONLY sanctioned public API of this kit):
 *
 *   import { Illustration } from '../../components/illustrations/Illustration';
 *
 *   <Illustration name="empty-library" />                       // decorative (aria-hidden)
 *   <Illustration name="not-found" size={180} />                // explicit square edge, 120–220 recommended
 *   <Illustration name="server-waking" title="الخادم يستيقظ" />  // labelled → role="img"
 *
 * Contract:
 *   - Pieces are the original two-colour scenes in `./pieces/` — ink +
 *     signal via CSS custom properties ONLY (`--ill-*`, `--accent*`,
 *     `--gold*`), so light/dark/`prefers-contrast: more` adaptation is
 *     pure token cascade; there is no JS theme listener and no raw
 *     colour anywhere in the kit.
 *   - Decorative BY DEFAULT (`aria-hidden`). Passing `title` promotes
 *     the piece to `role="img"` with that Arabic string as its
 *     accessible name. Passing `decorative={false}` without a `title`
 *     is a TYPE ERROR on purpose — a `role="img"` without an
 *     accessible name is a contract violation (audit 11-e P2-18).
 *   - Pieces load lazily, one Vite chunk per piece, so a page that
 *     mounts one illustration downloads exactly one ~1–2 KB chunk and
 *     the entry bundle pays only for this dispatcher. `Suspense`
 *     fallback is null: scenes are decorative reveals, not content.
 *   - The wrapper carries BOTH `mk-ill` (this kit's own class) and the
 *     legacy `illustration` class, so the token-system adaptations
 *     that target `.illustration svg` keep applying (the
 *     `prefers-contrast: more` stroke lift in tokens.css, and the
 *     `.state-illustration` slot sizing in components.css). It is
 *     safe to drop the legacy class at integration — `mk-ill` styles
 *     are self-sufficient (see styles/illustrations.css).
 *   - RTL: every piece in the kit is composed direction-neutral
 *     (centred / mirror-symmetric), so there is no `dir` prop and no
 *     mirroring logic anywhere. Documented per piece in its header.
 */
import { Suspense, lazy } from 'react';
import type { CSSProperties, ComponentType, LazyExoticComponent } from 'react';
import type { MkIllustrationName } from './names';
import '../../styles/illustrations.css';

/**
 * One lazy chunk per piece — the tree-shaking/lazy-loading guarantee
 * of the kit: a name never rendered is never downloaded.
 */
const REGISTRY: Record<
  MkIllustrationName,
  LazyExoticComponent<ComponentType>
> = {
  'empty-list': lazy(() => import('./pieces/empty-list')),
  'empty-search': lazy(() => import('./pieces/empty-search')),
  'empty-notifications': lazy(() => import('./pieces/empty-notifications')),
  'empty-library': lazy(() => import('./pieces/empty-library')),
  'empty-research': lazy(() => import('./pieces/empty-research')),
  'empty-courses': lazy(() => import('./pieces/empty-courses')),
  'empty-community': lazy(() => import('./pieces/empty-community')),
  'error-generic': lazy(() => import('./pieces/error-generic')),
  offline: lazy(() => import('./pieces/offline')),
  forbidden: lazy(() => import('./pieces/forbidden')),
  'not-found': lazy(() => import('./pieces/not-found')),
  'success-submitted': lazy(() => import('./pieces/success-submitted')),
  'exam-complete': lazy(() => import('./pieces/exam-complete')),
  achievement: lazy(() => import('./pieces/achievement')),
  'welcome-first-run': lazy(() => import('./pieces/welcome-first-run')),
  'server-waking': lazy(() => import('./pieces/server-waking')),
};

interface IllustrationBaseProps {
  name: MkIllustrationName;
  /**
   * Square edge in px, set as the `--mk-ill-size` CSS variable on the
   * wrapper (see styles/illustrations.css). The kit is authored to
   * read at 120–220 px (the `.state-illustration` slot is 160 desktop
   * / 120 mobile); without `size` the piece fills its container up to
   * the kit's 220 px cap.
   */
  size?: number;
  className?: string;
}

/**
 * Discriminated by `title`: a titled piece is labelled content
 * (role="img"); everything else is decoration (aria-hidden).
 */
export type IllustrationProps =
  | (IllustrationBaseProps & { decorative?: true; title?: undefined })
  | (IllustrationBaseProps & { decorative: false; title: string })
  | (IllustrationBaseProps & { title: string; decorative?: undefined });

export function Illustration(props: IllustrationProps) {
  const { name, size, className } = props;
  const decorative = props.decorative !== false && props.title === undefined;
  const title = decorative ? undefined : props.title;

  const Piece = REGISTRY[name];
  // `mk-ill illustration` — see the class-coexistence note above.
  const classes = ['mk-ill', 'illustration'];
  if (className) classes.push(className);

  // Defensive: the discriminated union already makes an unlabeled
  // non-decorative render impossible in TS; this guard keeps JS
  // callers honest instead of shipping an unnamed role="img".
  const accessibilityProps =
    decorative || !title
      ? { 'aria-hidden': true as const }
      : { role: 'img' as const, 'aria-label': title };

  const style =
    size === undefined
      ? undefined
      : ({ '--mk-ill-size': `${size}px` } as CSSProperties);

  return (
    <div className={classes.join(' ')} data-mk-ill={name} style={style} {...accessibilityProps}>
      <Suspense fallback={null}>
        <Piece />
      </Suspense>
    </div>
  );
}
