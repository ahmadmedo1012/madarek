/**
 * shell — the mk-ill kit's ONE shared <svg> wrapper + token bindings.
 *
 * r341 bundle gate: all 16 pieces are separate lazy chunks, and each
 * used to inline this identical <svg> attribute block AND the kit's
 * `var(--ill-*)` / `var(--accent*)` / `var(--gold*)` string literals,
 * so every tiny piece chunk paid the whole wrapper + its first-use of
 * each literal in compressed bytes (gzip works per chunk — repetition
 * across chunks never dedupes). Through this module the wrapper and
 * the literals ship ONCE in a single shared chunk and each piece
 * references the binding.
 *
 * The rendered DOM is byte-identical to the previous inline literals:
 * same attributes, same order, same values (the bindings hold the
 * token NAMES, unchanged).
 */
import type { ReactElement, ReactNode } from 'react';

/* ── the kit's CSS custom-property bindings ─────────────────────────
 * Ink + paper (the two-tone base), the paper step, the signal accent,
 * the gold family (achievement only, r197 gold discipline) and the
 * on-accent ink. These are the ONLY colour tokens the pieces use. */
export const ILL_STROKE = 'var(--ill-stroke)';
export const ILL_PAPER = 'var(--ill-paper)';
export const ACCENT = 'var(--accent)';
export const NEUTRAL_100 = 'var(--neutral-100)';
export const GOLD = 'var(--gold)';
export const GOLD_INK = 'var(--gold-ink)';
export const GOLD_SOFT = 'var(--gold-soft)';
export const TEXT_ON_ACCENT = 'var(--text-on-accent)';

/* ── the shared 200×200 decorative shell ──────────────────────────── */
export function IllSvg({ children }: { children: ReactNode }): ReactElement {
  return (
    <svg // allow-emoji: bespoke illustration scene (mk-ill state-graphics kit) — not UI iconography
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* ── the kit's dotted-echo stroke ────────────────────────────────────
 * Ink (or gold, on the achievement rosette), 1.5px, round caps and
 * the tight 0.1-unit dot dash — the shared "quiet echo / ghost"
 * treatment eleven pieces draw. Callers spread it AFTER any geometry
 * and fill attributes so the rendered attribute order is unchanged. */
export const dotted = (
  stroke: string,
  strokeOpacity: string,
  strokeDasharray = '0.1 7',
) => ({
  stroke,
  strokeWidth: '1.5',
  strokeLinecap: 'round' as const,
  strokeDasharray,
  strokeOpacity,
});
