/**
 * WordReveal — R308 — Arabic-safe per-word masked text reveals.
 *
 * The reference reveals text word-by-word behind line masks (§11).
 * Per-LINE splits break Arabic joining; per-WORD splits never do
 * (joining is intra-word), so this is the Arabic-first translation of
 * that grammar — an explicit amendment to DESIGN.md §4's «block-level
 * reveals only» rule, scoped and documented there.
 *
 *  · Words split on SPACES only (never mid-word) — shaping is intact.
 *  · Each word rides an overflow-hidden mask; the shared IO belt
 *    (RevealCssClass) triggers the reveal — the same once-only,
 *    fling-hardened contract as the block reveals.
 *  · The stagger is capped (--motion-stagger-cap lineage): long
 *    paragraphs reveal as a couple of waves, never a slow drip.
 *  · Reduced motion: the words stand complete (the base.css belt
 *    collapses the transition; this component also carries its own
 *    RM clause so it never depends on cascade order).
 *
 * The `scrub` variant does NOT use the IO belt: it maps a 0..1
 * progress CSS var (--wr-p, written imperatively by a scroll driver)
 * onto the words one by one — reversible, scrub-linked, the
 * reference's intro-title behaviour.
 */
import { RevealCssClass } from '../../../hooks/useReveal';

const MAX_STAGGER = 14;

export interface WordRevealProps {
  text: string;
  className?: string;
}

/** The once-only word reveal (IO belt triggered). */
export function WordReveal({ text, className }: WordRevealProps) {
  const words = text.split(' ');
  return (
    <RevealCssClass as="span" className={['wr', className].filter(Boolean).join(' ')}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="wr-w"
          style={{ ['--wr-i' as string]: Math.min(i, MAX_STAGGER) }}
        >
          <span className="wr-i">{w}</span>
        </span>
      ))}
    </RevealCssClass>
  );
}

export interface ScrubRevealProps {
  text: string;
  className?: string;
  /** the element carrying --wr-p (defaults to self) */
  progressRef?: React.RefObject<HTMLElement | null>;
}

/**
 * The scrub-linked variant: pass a ref whose subtree carries the
 * `--wr-p` custom property (0..1); each word unmasks in sequence as
 * the progress passes its index.
 */
export function ScrubReveal({ text, className }: ScrubRevealProps) {
  const words = text.split(' ');
  const n = words.length;
  return (
    <span
      className={['wr wr-scrub', className].filter(Boolean).join(' ')}
      style={{ ['--wr-n' as string]: n }}
    >
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="wr-w"
          style={{ ['--wr-i' as string]: i }}
        >
          <span className="wr-i">{w}</span>
        </span>
      ))}
    </span>
  );
}
