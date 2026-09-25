/**
 * Backend unit test — the shared exact-match grading semantics in
 * `backend/src/lib/grading.ts` (decision D12, wave 13).
 *
 * The exam short-answer gate (exams.routes) and the training quiz gate
 * (training.routes) both delegate to this module. Pins:
 *   - exactAnswerMatches — the unified core: substring rejections in
 *     both directions, Arabic normalization, case-folding, trim, blank
 *     and non-string rejections, plus the two normalization modes
 *   - shortAnswerMatches / quizAnswerMatches — the pinned-signature
 *     route gates (strict vs separator-tolerant)
 *   - route wiring — both route modules re-export the SAME lib
 *     functions, so the consolidation cannot be silently undone by
 *     re-duplicating a matcher in a route file
 *
 * The wave-12 route tests (exams-logic / training-logic) remain the
 * authoritative per-route pins and must keep passing unmodified.
 */
import { describe, expect, it } from 'vitest';
import {
  exactAnswerMatches,
  quizAnswerMatches,
  shortAnswerMatches,
} from '../../src/lib/grading.js';
import { shortAnswerMatches as examRouteMatcher } from '../../src/http/routes/exams.routes.js';
import { quizAnswerMatches as trainingRouteMatcher } from '../../src/http/routes/training.routes.js';

/* ═══════════════ Shared strict core (default normalization) ═══════════════ */

describe('exactAnswerMatches — shared strict core', () => {
  it('matches exact answers, in Latin and Arabic', () => {
    expect(exactAnswerMatches('HTML', 'HTML')).toBe(true);
    expect(exactAnswerMatches('الزاوية', 'الزاوية')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(exactAnswerMatches('JavaScript', 'javascript')).toBe(true);
    expect(exactAnswerMatches('JavaScript', 'JAVASCRIPT')).toBe(true);
  });

  it('trims surrounding whitespace on both sides', () => {
    expect(exactAnswerMatches('  HTML ', 'HTML')).toBe(true);
    expect(exactAnswerMatches('HTML', '  HTML  ')).toBe(true);
    expect(exactAnswerMatches(' الجواب ', 'الجواب')).toBe(true);
  });

  it('NEVER matches by substring in either direction', () => {
    // The pre-wave-12 both-ways `includes` graders let a one-character
    // answer score full marks against a longer model answer.
    expect(exactAnswerMatches('html', 'h')).toBe(false);
    expect(exactAnswerMatches('hypertext markup language', 'markup')).toBe(false);
    expect(exactAnswerMatches('JavaScript', 'Java')).toBe(false);
    expect(exactAnswerMatches('Java', 'JavaScript')).toBe(false);
  });

  it('rejects verbose answers that merely contain the model answer', () => {
    expect(exactAnswerMatches('HTML', 'the answer is HTML')).toBe(false);
    expect(exactAnswerMatches('HTML', 'HTML is a markup language')).toBe(false);
  });

  it('rejects empty, blank and missing answers', () => {
    expect(exactAnswerMatches('HTML', '')).toBe(false);
    expect(exactAnswerMatches('HTML', '   ')).toBe(false);
    expect(exactAnswerMatches('HTML', null)).toBe(false);
    expect(exactAnswerMatches('HTML', undefined)).toBe(false);
  });

  it('rejects non-string model answers', () => {
    expect(exactAnswerMatches(42, '42')).toBe(false);
    expect(exactAnswerMatches(true, 'true')).toBe(false);
    expect(exactAnswerMatches(null, 'anything')).toBe(false);
  });

  it('never passes against a blank key, in either mode', () => {
    expect(exactAnswerMatches('', 'anything')).toBe(false);
    expect(exactAnswerMatches('   ', 'anything')).toBe(false);
    expect(exactAnswerMatches(' , ', ',', { normalization: 'separator-tolerant' })).toBe(false);
  });
});

/* ═══════════════ Strict mode (exam gate normalization) ═══════════════ */

describe('exactAnswerMatches — strict mode', () => {
  it('treats internal punctuation and spacing as significant', () => {
    expect(exactAnswerMatches('HTML5', 'HTML 5')).toBe(false);
    expect(exactAnswerMatches('a b', 'a  b')).toBe(false);
    expect(exactAnswerMatches('html, css', 'html css')).toBe(false);
    expect(exactAnswerMatches('machine-learning', 'machine learning')).toBe(false);
  });

  it('rejects Arabic answers that differ by a word or a translation', () => {
    expect(exactAnswerMatches('الزاوية', 'az-zawiya')).toBe(false);
    expect(exactAnswerMatches('تعلم', 'التعلم')).toBe(false);
  });
});

/* ═══════════════ Separator-tolerant mode (training gate normalization) ═══════════════ */

describe('exactAnswerMatches — separator-tolerant mode', () => {
  const tolerant = { normalization: 'separator-tolerant' } as const;

  it('collapses separator noise (commas, Arabic comma, dots, dashes, quotes, slashes)', () => {
    expect(exactAnswerMatches('html, css', 'html css', tolerant)).toBe(true);
    expect(exactAnswerMatches('html ، css', 'html css', tolerant)).toBe(true);
    expect(exactAnswerMatches('html.css', 'html css', tolerant)).toBe(true);
    expect(exactAnswerMatches('machine-learning', 'machine learning', tolerant)).toBe(true);
    expect(exactAnswerMatches('machine_learning', 'machine learning', tolerant)).toBe(true);
    expect(exactAnswerMatches('"html css"', 'html css', tolerant)).toBe(true);
    expect(exactAnswerMatches('html/css', 'html css', tolerant)).toBe(true);
  });

  it('treats repeated separators as one', () => {
    expect(exactAnswerMatches('html    css', 'html css', tolerant)).toBe(true);
    expect(exactAnswerMatches('html ,  . css', 'html css', tolerant)).toBe(true);
  });

  it('still trims and case-folds', () => {
    expect(exactAnswerMatches('  HTML  ', ' html ', tolerant)).toBe(true);
    expect(exactAnswerMatches('Html', 'hTML', tolerant)).toBe(true);
  });

  it('still NEVER matches by substring in either direction', () => {
    expect(exactAnswerMatches('h', 'html', tolerant)).toBe(false);
    expect(exactAnswerMatches('html', 'html css', tolerant)).toBe(false);
    expect(exactAnswerMatches('css', 'html css', tolerant)).toBe(false);
    expect(exactAnswerMatches('html css javascript', 'html css', tolerant)).toBe(false);
  });

  it('matches Arabic answers separator-tolerantly, but never partially', () => {
    expect(exactAnswerMatches('التعلم الآلي', 'التعلم الآلي', tolerant)).toBe(true);
    expect(exactAnswerMatches('التعلم الآلي،', 'التعلم الآلي', tolerant)).toBe(true);
    expect(exactAnswerMatches(' التعلم الآلي ', 'التعلم الآلي', tolerant)).toBe(true);
    expect(exactAnswerMatches('الآلي', 'التعلم الآلي', tolerant)).toBe(false);
    expect(exactAnswerMatches('تعلم', 'التعلم', tolerant)).toBe(false);
    expect(exactAnswerMatches('التعلم الآلي التطبيقي', 'التعلم الآلي', tolerant)).toBe(false);
  });
});

/* ═══════════════ Mode relation (the only D12 semantic difference) ═══════════════ */

describe('mode relation (D12)', () => {
  it('separator-tolerant accepts everything strict accepts — it only adds separator tolerance', () => {
    // Collapse is a function of the trimmed, case-folded string, so the
    // tolerant mode can never reject a pair the strict mode accepts.
    const bothAccept: ReadonlyArray<[string, string]> = [
      ['HTML', 'HTML'],
      ['JavaScript', 'javascript'],
      ['  HTML ', 'html'],
      ['الزاوية', 'الزاوية'],
      ['a b', 'a b'],
    ];
    for (const [expected, submitted] of bothAccept) {
      expect(exactAnswerMatches(expected, submitted)).toBe(true);
      expect(exactAnswerMatches(expected, submitted, { normalization: 'separator-tolerant' })).toBe(true);
    }
  });

  it('the modes differ only on separator noise (incl. whitespace runs)', () => {
    const separatorsOnly: ReadonlyArray<[string, string]> = [
      ['html, css', 'html css'],
      ['machine-learning', 'machine learning'],
      ['a  b', 'a b'],
    ];
    for (const [expected, submitted] of separatorsOnly) {
      expect(exactAnswerMatches(expected, submitted)).toBe(false);
      expect(exactAnswerMatches(expected, submitted, { normalization: 'separator-tolerant' })).toBe(true);
    }
  });
});

/* ═══════════════ Pinned-signature route gates ═══════════════ */

describe('shortAnswerMatches — exam gate (strict, pinned signature)', () => {
  it('accepts exact, case-insensitive and trimmed matches', () => {
    expect(shortAnswerMatches('HTML', 'HTML')).toBe(true);
    expect(shortAnswerMatches('JavaScript', 'javascript')).toBe(true);
    expect(shortAnswerMatches('HTML', '  HTML  ')).toBe(true);
  });

  it('keeps exam strictness: punctuation, internal spacing, substrings, blanks, non-strings', () => {
    expect(shortAnswerMatches('HTML5', 'HTML 5')).toBe(false);
    expect(shortAnswerMatches('a b', 'a  b')).toBe(false);
    expect(shortAnswerMatches('html', 'h')).toBe(false);
    expect(shortAnswerMatches('Java', 'JavaScript')).toBe(false);
    expect(shortAnswerMatches('HTML', null)).toBe(false);
    expect(shortAnswerMatches(42, '42')).toBe(false);
  });
});

describe('quizAnswerMatches — training gate (separator-tolerant, pinned (submitted, expected) order)', () => {
  it('accepts separator-noise variants of the key', () => {
    expect(quizAnswerMatches('html, css', 'html css')).toBe(true);
    expect(quizAnswerMatches('machine-learning', 'machine learning')).toBe(true);
    expect(quizAnswerMatches('  HTML  ', ' html ')).toBe(true);
  });

  it('still blocks substrings, supersets and blank keys', () => {
    expect(quizAnswerMatches('h', 'html')).toBe(false);
    expect(quizAnswerMatches('html', 'html css')).toBe(false);
    expect(quizAnswerMatches('html css javascript', 'html css')).toBe(false);
    expect(quizAnswerMatches('anything', '  ')).toBe(false);
    expect(quizAnswerMatches('', 'html')).toBe(false);
  });
});

/* ═══════════════ Route wiring (the consolidation itself) ═══════════════ */

describe('route wiring (D12)', () => {
  it('exams.routes re-exports the lib shortAnswerMatches — no local duplicate', () => {
    expect(examRouteMatcher).toBe(shortAnswerMatches);
    expect(examRouteMatcher('HTML', 'HTML')).toBe(true);
    expect(examRouteMatcher('HTML5', 'HTML 5')).toBe(false);
  });

  it('training.routes re-exports the lib quizAnswerMatches — no local duplicate', () => {
    expect(trainingRouteMatcher).toBe(quizAnswerMatches);
    expect(trainingRouteMatcher('html, css', 'html css')).toBe(true);
    expect(trainingRouteMatcher('h', 'html')).toBe(false);
  });
});
