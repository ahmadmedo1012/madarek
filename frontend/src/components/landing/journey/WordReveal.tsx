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
import { Fragment, type ReactNode } from 'react';
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
  /**
   * R337 (A-intro): an optional explicit line split. The frozen Heron
   * spec records the intro title as one div per LINE (its own
   * split-text tween leaves the line boxes in the DOM); Arabic keeps
   * its natural wrapping, so the caller may author the line breaks and
   * receive each line's word run wrapped in its own element. The
   * words still split on spaces only (the joining law) and the scrub
   * indices stay GLOBAL across lines (one --wr-n run).
   */
  lines?: readonly string[];
  /** renders one line's word run (ScrubReveal's own word markup) */
  renderLine?: (line: ReactNode, key: string, index: number) => ReactNode;
  /**
   * R338 T-03c (intro word census): optional per-word data-spec hook —
   * receives the GLOBAL word index (scrub order across all lines) and
   * returns the data-spec key for the word's mask box (the inner text
   * span automatically carries the same key + "in"). Lets the caller
   * bind every word cell explicitly in the conformance mapping instead
   * of leaving the masks to the heuristic tag+tc fallback.
   */
  wordSpec?: (globalIndex: number) => string | undefined;
  /**
   * R338 T-03d (intro char census): the reference's split-text tween
   * nests one empty overflow box per CHARACTER inside every word cell
   * (its own census: 26 words, 127 tc-none char boxes, all text-empty —
   * pure tween scaffold). Arabic shaping must never split mid-word, so
   * the mirror keeps the grammar, not the split: charCounts[i] = how
   * many empty scaffold boxes global word i carries (aria-hidden,
   * non-visual — the shaped text stays whole in .wr-i), and charSpec
   * names each box for the conformance mapping. Boxes beyond the table
   * (our surplus words) simply do not render.
   */
  charCounts?: readonly number[];
  charSpec?: (globalWordIndex: number, charIndex: number) => string | undefined;
}

/**
 * The scrub-linked variant: pass a ref whose subtree carries the
 * `--wr-p` custom property (0..1); each word unmasks in sequence as
 * the progress passes its index.
 */
export function ScrubReveal({ text, className, lines, renderLine, wordSpec, charCounts, charSpec }: ScrubRevealProps) {
  const words = text.split(' ');
  const n = words.length;
  const run = (from: number, to: number) =>
    words.slice(from, to).map((w, i) => {
      const gi = from + i;
      const ds = wordSpec?.(gi);
      return (
        <Fragment key={`${w}-${gi}`}>
          <span
            className="wr-w"
            aria-hidden="true"
            data-spec={ds}
            style={{ ['--wr-i' as string]: gi }}
          >
            <span className="wr-i" data-spec={ds ? ds.replace('.word.', '.wordin.') : undefined}>{w}</span>
            {/* the reference's per-char tween scaffold, mirrored as empty
                boxes (the joining law: Arabic text never splits mid-word) */}
            {Array.from({ length: charCounts?.[gi] ?? 0 }, (_, m) => (
              <span key={`wr-c-${m}`} className="wr-c" aria-hidden="true" data-spec={charSpec?.(gi, m)} />
            ))}
          </span>
          {gi < words.length - 1 ? SPACE : null}
        </Fragment>
      );
    });
  /* the explicit line split (R337 A-intro): the word runs join the
   * authored lines; without `lines` the flat word run ships as before */
  let body: ReactNode;
  if (lines && renderLine) {
    let from = 0;
    body = lines.map((line, li) => {
      const count = line.trim() ? line.trim().split(/\s+/).length : 0;
      const to = Math.min(from + count, words.length);
      const node = renderLine(run(from, to), `st-line-${from}`, li);
      from = to;
      return node;
    });
  } else {
    body = run(0, words.length);
  }
  return (
    <span
      className={['wr wr-scrub', className].filter(Boolean).join(' ')}
      aria-label={text}
      style={{ ['--wr-n' as string]: n }}
    >
      {body}
    </span>
  );
}
