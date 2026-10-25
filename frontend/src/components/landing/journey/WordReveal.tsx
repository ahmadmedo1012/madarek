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
 *  · Words are joined by REAL space text nodes (R318 §A1): the DOM
 *    sibling spans used to glue («هذامسطح…») — inline-block siblings
 *    with no whitespace between them render AND extract with zero
 *    inter-word gaps. A real ' ' node between consecutive masks keeps
 *    textContent, copy, search and screen reading correct while each
 *    word still rides its own overflow-hidden mask.
 *  · A11y contract (R318 §A1): the wrapper carries aria-label={text}
 *    (one clean string for AT); every .wr-w mask is aria-hidden so the
 *    split words are never announced twice. No tracking/letter-spacing
 *    is ever added — Arabic display keeps its natural metrics.
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
import { Fragment } from 'react';
import { RevealCssClass } from '../../../hooks/useReveal';

const MAX_STAGGER = 14;

/**
 * The inter-word joinery (R318 §A1): a real ' ' TEXT NODE between the
 * mask spans — never a margin, never a ::before, never font-size tricks
 * (a text node keeps textContent correct and renders at the font's own
 * space advance; nothing can collapse it except white-space:none, which
 * no .wr context uses). Appended after every word but the last.
 */
const SPACE = ' ';

export interface WordRevealProps {
  text: string;
  className?: string;
}

/** The once-only word reveal (IO belt triggered). */
export function WordReveal({ text, className }: WordRevealProps) {
  const words = text.split(' ');
  return (
    <RevealCssClass
      as="span"
      className={['wr', className].filter(Boolean).join(' ')}
      aria-label={text}
    >
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span
            className="wr-w"
            aria-hidden="true"
            style={{ ['--wr-i' as string]: Math.min(i, MAX_STAGGER) }}
          >
            <span className="wr-i">{w}</span>
          </span>
          {i < words.length - 1 ? SPACE : null}
        </Fragment>
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
      aria-label={text}
      style={{ ['--wr-n' as string]: n }}
    >
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span
            className="wr-w"
            aria-hidden="true"
            style={{ ['--wr-i' as string]: i }}
          >
            <span className="wr-i">{w}</span>
          </span>
          {i < words.length - 1 ? SPACE : null}
        </Fragment>
      ))}
    </span>
  );
}
