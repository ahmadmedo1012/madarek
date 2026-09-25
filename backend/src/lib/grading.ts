/**
 * Shared exact-match grading semantics — decision D12 (wave 13).
 *
 * One strict core rule, three exports:
 *  - `exactAnswerMatches`  — the parameterized core (normalization mode).
 *  - `shortAnswerMatches`  — the exam short-answer gate: strict
 *                            normalization, pinned call signature from
 *                            wave 12.
 *  - `quizAnswerMatches`   — the training quiz gate: separator-tolerant
 *                            normalization, pinned call signature from
 *                            wave 12 (takes (submitted, expected), the
 *                            order the route has always used).
 *
 * The rule: an answer scores ONLY on full equality after normalization —
 * trim, case-fold, and (separator-tolerant mode only) collapsing
 * separator noise — NEVER substring containment in either direction.
 * A blank (empty / whitespace-only) key or answer never matches, and a
 * non-string model answer never matches (defensive for legacy rows).
 *
 * The two modes exist because the wave-12 gates pinned different
 * normalization depths and both pinning test files must keep passing
 * unmodified: exams treat internal punctuation and spacing as
 * significant, training collapses incidental separator noise. Everything
 * else — the exact-match requirement, the substring ban, the blank and
 * non-string rejections, trim and case-folding — is the shared strict
 * core unified here.
 *
 * History: the pre-wave-12 graders accepted bidirectional substring
 * `includes`, letting a one-character answer farm full marks against a
 * longer model answer (audit 11-d P0-2, exam and training halves).
 * Wave 12 (D8) replaced each with a per-file exact-match copy; wave 13
 * (D12) consolidates them here with byte-identical observable behavior.
 */

/** How much normalization is applied before the equality check. */
export type AnswerMatchNormalization =
  /**
   * Trim + case-fold only: internal punctuation and spacing stay
   * significant ('HTML5' ≠ 'HTML 5', 'a b' ≠ 'a  b'). The exam
   * short-answer grader uses this — its keys are precise terms.
   */
  | 'strict'
  /**
   * Additionally collapse separator noise — whitespace runs, commas
   * (Latin and Arabic '،'), dots, dashes, underscores, slashes and
   * quotes — into single spaces, so 'html, css' matches 'html css'
   * and 'machine-learning' matches 'machine learning'. The training
   * quiz gate uses this: its free-form lesson keys may carry
   * incidental punctuation. Strictly looser than 'strict' — it only
   * adds punctuation variants of the same words, never whole words.
   */
  | 'separator-tolerant';

export interface AnswerMatchOptions {
  /** Normalization applied to both sides before the equality check.
   *  @default 'strict' */
  normalization?: AnswerMatchNormalization;
}

/** Separator runs collapsed to a single space in 'separator-tolerant' mode. */
const SEPARATOR_NOISE = /[\s,،.\-_/'"]+/g;

function normalizeForMatch(value: string, normalization: AnswerMatchNormalization): string {
  if (normalization === 'separator-tolerant') {
    return value.replace(SEPARATOR_NOISE, ' ').trim().toLowerCase();
  }
  return value.trim().toLowerCase();
}

/**
 * The unified exact-match core. See the module doc for the rule and the
 * two normalization modes.
 */
export function exactAnswerMatches(
  expected: unknown,
  submitted: string | null | undefined,
  { normalization = 'strict' }: AnswerMatchOptions = {},
): boolean {
  if (typeof expected !== 'string') return false;
  const key = normalizeForMatch(expected, normalization);
  const answer = normalizeForMatch(submitted ?? '', normalization);
  if (key === '' || answer === '') return false;
  return answer === key;
}

/**
 * Exam short-answer gate (exams.routes.ts) — pinned call signature and
 * semantics from wave 12: strict normalization, exact equality after
 * trim + case-fold, never substring. A one-character answer must not
 * score against a longer model answer, and a model answer must not
 * match a single word of a verbose reply.
 */
export function shortAnswerMatches(expected: unknown, submitted: string | null | undefined): boolean {
  return exactAnswerMatches(expected, submitted);
}

/**
 * Training quiz gate (training.routes.ts) — pinned call signature and
 * semantics from wave 12: separator-tolerant normalization, exact
 * equality, never substring. A substring — e.g. a single character of
 * the model answer — must never pass, because points, badges,
 * certificates and leaderboard rank all sit behind this gate.
 */
export function quizAnswerMatches(submitted: string, expected: string): boolean {
  return exactAnswerMatches(expected, submitted, { normalization: 'separator-tolerant' });
}
