/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/exams.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/submissions-logic.test.ts`:
 * covers the short-answer matcher (exact-trim / case-insensitive exact —
 * never substring), the pure auto-grading rules, the exam-start
 * status-transition rules (resume / alreadyAttempted / retake), the
 * exam-start assembly (blocking statuses / maxScore / shuffle), the
 * answer-save dimension rules, the manual-grading payload
 * reconciliation, and the authoring zod schemas. Integration coverage
 * (auth, transactions, the FOR UPDATE start/submit races) needs a DB
 * harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { ExamKind } from '@prisma/client';
import {
  SUBMIT_GRACE_MS,
  answerPatchFor,
  attemptBlockingStatuses,
  createQuestionSchema,
  createTemplateSchema,
  decideExamStart,
  gradeExamAnswer,
  manualGradeSchema,
  reconcileManualGrades,
  shuffleQuestions,
  shortAnswerMatches,
  submitAnswerSchema,
  templateMaxScore,
} from '../../src/http/routes/exams.routes';

/* ═══════════════ Short-answer matcher (never substring) ═══════════════ */

describe('shortAnswerMatches', () => {
  it('matches exact answers', () => {
    expect(shortAnswerMatches('HTML', 'HTML')).toBe(true);
    expect(shortAnswerMatches('الزاوية', 'الزاوية')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(shortAnswerMatches('JavaScript', 'javascript')).toBe(true);
    expect(shortAnswerMatches('JavaScript', 'JAVASCRIPT')).toBe(true);
  });

  it('trims surrounding whitespace on both sides', () => {
    expect(shortAnswerMatches('  HTML ', 'HTML')).toBe(true);
    expect(shortAnswerMatches('HTML', '  HTML  ')).toBe(true);
    expect(shortAnswerMatches(' الجواب ', 'الجواب')).toBe(true);
  });

  it('NEVER matches by substring in either direction', () => {
    // The old both-ways `includes` grading let a one-character answer
    // score full marks against a longer model answer.
    expect(shortAnswerMatches('html', 'h')).toBe(false);
    expect(shortAnswerMatches('hypertext markup language', 'markup')).toBe(false);
    expect(shortAnswerMatches('JavaScript', 'Java')).toBe(false);
    expect(shortAnswerMatches('Java', 'JavaScript')).toBe(false);
  });

  it('rejects verbose answers that merely contain the model answer', () => {
    expect(shortAnswerMatches('HTML', 'the answer is HTML')).toBe(false);
    expect(shortAnswerMatches('HTML', 'HTML is a markup language')).toBe(false);
  });

  it('requires exact equality — punctuation and internal spacing are significant', () => {
    expect(shortAnswerMatches('HTML5', 'HTML 5')).toBe(false);
    expect(shortAnswerMatches('a b', 'a  b')).toBe(false);
    expect(shortAnswerMatches('الزاوية', 'az-zawiya')).toBe(false);
  });

  it('rejects empty, blank and missing answers', () => {
    expect(shortAnswerMatches('HTML', '')).toBe(false);
    expect(shortAnswerMatches('HTML', '   ')).toBe(false);
    expect(shortAnswerMatches('HTML', null)).toBe(false);
    expect(shortAnswerMatches('HTML', undefined)).toBe(false);
  });

  it('rejects non-string model answers', () => {
    expect(shortAnswerMatches(42, '42')).toBe(false);
    expect(shortAnswerMatches(true, 'true')).toBe(false);
    expect(shortAnswerMatches(null, 'anything')).toBe(false);
    expect(shortAnswerMatches('', 'anything')).toBe(false);
  });
});

/* ═══════════════ Pure auto-grading rules ═══════════════ */

describe('gradeExamAnswer', () => {
  const mcq = { type: 'MCQ' as const, correctAnswer: 2, choices: ['a', 'b', 'c', 'd'] };

  it('awards full points for the correct MCQ choice', () => {
    expect(gradeExamAnswer(mcq, { choiceIndex: 2, answerText: null }, 5)).toEqual({
      kind: 'auto',
      awarded: 5,
      isCorrect: true,
    });
  });

  it('awards zero for a wrong MCQ choice', () => {
    expect(gradeExamAnswer(mcq, { choiceIndex: 0, answerText: null }, 5)).toEqual({
      kind: 'auto',
      awarded: 0,
      isCorrect: false,
    });
  });

  it('treats an unanswered MCQ (null choiceIndex) as explicitly wrong, not pending', () => {
    expect(gradeExamAnswer(mcq, { choiceIndex: null, answerText: null }, 5)).toEqual({
      kind: 'auto',
      awarded: 0,
      isCorrect: false,
    });
  });

  it('coerces a legacy numeric-string MCQ key', () => {
    expect(gradeExamAnswer(
      { type: 'MCQ', correctAnswer: '2', choices: ['a', 'b', 'c', 'd'] },
      { choiceIndex: 2, answerText: null },
      5,
    )).toEqual({ kind: 'auto', awarded: 5, isCorrect: true });
  });

  it('parks a legacy letter MCQ key for manual review instead of grading everyone wrong', () => {
    const result = gradeExamAnswer(
      { type: 'MCQ', correctAnswer: 'B', choices: ['a', 'b', 'c', 'd'] },
      { choiceIndex: 1, answerText: null },
      5,
    );
    expect(result).toEqual({ kind: 'manual' });
  });

  it('parks missing, boolean and out-of-range MCQ keys for manual review', () => {
    expect(gradeExamAnswer({ type: 'MCQ', correctAnswer: null, choices: ['a', 'b'] }, { choiceIndex: 0, answerText: null }, 1)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'MCQ', correctAnswer: true, choices: ['a', 'b'] }, { choiceIndex: 1, answerText: null }, 1)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'MCQ', correctAnswer: 4, choices: ['a', 'b', 'c', 'd'] }, { choiceIndex: 0, answerText: null }, 1)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'MCQ', correctAnswer: -1, choices: ['a', 'b'] }, { choiceIndex: 0, answerText: null }, 1)).toEqual({ kind: 'manual' });
    // Broken content: choices missing entirely.
    expect(gradeExamAnswer({ type: 'MCQ', correctAnswer: 0, choices: null }, { choiceIndex: 0, answerText: null }, 1)).toEqual({ kind: 'manual' });
  });

  it('grades TRUE_FALSE as a two-choice MCQ', () => {
    const tf = { type: 'TRUE_FALSE' as const, correctAnswer: 1, choices: ['صحيح', 'خطأ'] };
    expect(gradeExamAnswer(tf, { choiceIndex: 1, answerText: null }, 2)).toEqual({ kind: 'auto', awarded: 2, isCorrect: true });
    expect(gradeExamAnswer(tf, { choiceIndex: 0, answerText: null }, 2)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
  });

  it('grades SHORT by exact/case-insensitive match with full or zero points', () => {
    const short = { type: 'SHORT' as const, correctAnswer: 'JavaScript', choices: null };
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: 'JavaScript' }, 3)).toEqual({ kind: 'auto', awarded: 3, isCorrect: true });
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: 'javascript' }, 3)).toEqual({ kind: 'auto', awarded: 3, isCorrect: true });
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: ' Java Script ' }, 3)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
    // Substring answers must not score.
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: 'Java' }, 3)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
  });

  it('treats a blank SHORT answer against a valid key as wrong, not pending', () => {
    const short = { type: 'SHORT' as const, correctAnswer: 'HTML', choices: null };
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: '' }, 3)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
    expect(gradeExamAnswer(short, { choiceIndex: null, answerText: null }, 3)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
  });

  it('parks keyless SHORT questions for manual review', () => {
    expect(gradeExamAnswer({ type: 'SHORT', correctAnswer: null, choices: null }, { choiceIndex: null, answerText: 'an honest attempt' }, 3)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'SHORT', correctAnswer: '', choices: null }, { choiceIndex: null, answerText: 'an honest attempt' }, 3)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'SHORT', correctAnswer: '   ', choices: null }, { choiceIndex: null, answerText: 'an honest attempt' }, 3)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'SHORT', correctAnswer: 42, choices: null }, { choiceIndex: null, answerText: '42' }, 3)).toEqual({ kind: 'manual' });
  });

  it('always parks ESSAY questions for manual review', () => {
    const essay = { type: 'ESSAY' as const, correctAnswer: 'rubric', choices: null };
    expect(gradeExamAnswer(essay, { choiceIndex: null, answerText: 'a long treatise' }, 5)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer(essay, { choiceIndex: null, answerText: '' }, 5)).toEqual({ kind: 'manual' });
    expect(gradeExamAnswer({ type: 'ESSAY', correctAnswer: null, choices: null }, { choiceIndex: null, answerText: null }, 5)).toEqual({ kind: 'manual' });
  });

  it('honors the effective points (pointsOverride) passed by the caller', () => {
    expect(gradeExamAnswer(mcq, { choiceIndex: 2, answerText: null }, 7)).toEqual({ kind: 'auto', awarded: 7, isCorrect: true });
    expect(gradeExamAnswer(mcq, { choiceIndex: 1, answerText: null }, 7)).toEqual({ kind: 'auto', awarded: 0, isCorrect: false });
  });
});

/* ═══════════════ Exam-start status transitions ═══════════════ */

describe('decideExamStart', () => {
  const now = new Date('2026-03-01T12:00:00.000Z');
  const inMinutes = (m: number) => new Date(now.getTime() + m * 60_000);

  it('starts fresh when no attempt exists', () => {
    expect(decideExamStart(null, ExamKind.QUIZ, now)).toBe('freshStart');
    expect(decideExamStart(null, ExamKind.PRACTICE, now)).toBe('freshStart');
  });

  it('resumes a live IN_PROGRESS attempt (any kind)', () => {
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: inMinutes(10) }, ExamKind.QUIZ, now)).toBe('resume');
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: inMinutes(10) }, ExamKind.PRACTICE, now)).toBe('resume');
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: inMinutes(10) }, ExamKind.FINAL, now)).toBe('resume');
  });

  it('still resumes inside the submit grace window (same deadline the submit route enforces)', () => {
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: inMinutes(-0.5) }, ExamKind.QUIZ, now)).toBe('resume');
  });

  it('keeps the attempt open exactly at the grace boundary (submit accepts at the same instant)', () => {
    const atDeadline = new Date(now.getTime() - SUBMIT_GRACE_MS);
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: atDeadline }, ExamKind.QUIZ, now)).toBe('resume');
  });

  it('treats a past-grace IN_PROGRESS attempt as done for graded kinds, but retakeable for PRACTICE', () => {
    const pastGrace = new Date(now.getTime() - SUBMIT_GRACE_MS - 1);
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: pastGrace }, ExamKind.QUIZ, now)).toBe('alreadyAttempted');
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: pastGrace }, ExamKind.MIDTERM, now)).toBe('alreadyAttempted');
    expect(decideExamStart({ status: 'IN_PROGRESS', expiresAt: pastGrace }, ExamKind.PRACTICE, now)).toBe('freshStart');
  });

  it('blocks retakes of closed attempts for graded kinds (EXPIRED included)', () => {
    for (const status of ['SUBMITTED', 'GRADED', 'EXPIRED'] as const) {
      expect(decideExamStart({ status, expiresAt: inMinutes(-30) }, ExamKind.QUIZ, now)).toBe('alreadyAttempted');
      expect(decideExamStart({ status, expiresAt: inMinutes(30) }, ExamKind.FINAL, now)).toBe('alreadyAttempted');
    }
  });

  it('allows PRACTICE retakes of closed attempts', () => {
    for (const status of ['SUBMITTED', 'GRADED', 'EXPIRED'] as const) {
      expect(decideExamStart({ status, expiresAt: inMinutes(-30) }, ExamKind.PRACTICE, now)).toBe('freshStart');
    }
  });

  it('pins the grace window at 60 seconds', () => {
    expect(SUBMIT_GRACE_MS).toBe(60_000);
  });
});

/* ═══════════════ Exam-start assembly (blocking statuses / maxScore / shuffle) ═══════════════ */

describe('attemptBlockingStatuses', () => {
  it('blocks PRACTICE retakes only while an attempt is live', () => {
    expect(attemptBlockingStatuses(ExamKind.PRACTICE)).toEqual(['IN_PROGRESS']);
  });

  it('blocks graded kinds on every closed status — EXPIRED included (no retake after seeing the board)', () => {
    for (const kind of [ExamKind.QUIZ, ExamKind.MIDTERM, ExamKind.FINAL]) {
      expect(attemptBlockingStatuses(kind)).toEqual(['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED']);
    }
  });

  it('returns a fresh array per call (callers build Prisma in-filters from it)', () => {
    const first = attemptBlockingStatuses(ExamKind.QUIZ);
    first.push('IN_PROGRESS');
    expect(attemptBlockingStatuses(ExamKind.QUIZ)).toEqual(['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED']);
  });
});

describe('templateMaxScore', () => {
  it('sums the question points across the template', () => {
    expect(templateMaxScore([
      { pointsOverride: null, question: { points: 3 } },
      { pointsOverride: null, question: { points: 5 } },
      { pointsOverride: null, question: { points: 2 } },
    ])).toBe(10);
  });

  it('gives pointsOverride precedence over the question default points', () => {
    expect(templateMaxScore([
      { pointsOverride: 10, question: { points: 3 } },
      { pointsOverride: null, question: { points: 5 } },
      { pointsOverride: 1, question: { points: 20 } },
    ])).toBe(16);
  });

  it('is 0 for an empty question set', () => {
    expect(templateMaxScore([])).toBe(0);
  });
});

describe('shuffleQuestions', () => {
  const rows = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }, { id: 'q4' }, { id: 'q5' }];
  const byId = (list: Array<{ id: string }>) => [...list].sort((a, b) => a.id.localeCompare(b.id));

  it('returns a permutation of the input — same length, same multiset, same references', () => {
    for (let i = 0; i < 20; i++) {
      const shuffled = shuffleQuestions(rows);
      expect(shuffled).toHaveLength(rows.length);
      expect(byId(shuffled)).toEqual(byId(rows));
      // References are moved, never cloned — the route's question payload
      // is built from the template rows themselves.
      expect(shuffled.every((r) => rows.includes(r))).toBe(true);
    }
  });

  it('never mutates the input array', () => {
    const before = rows.map((r) => r.id);
    shuffleQuestions(rows);
    expect(rows.map((r) => r.id)).toEqual(before);
  });

  it('is deterministic under an injected rng (rng 0 → rotate the tail to the front each step)', () => {
    expect(shuffleQuestions(rows, () => 0).map((r) => r.id)).toEqual(['q2', 'q3', 'q4', 'q5', 'q1']);
  });

  it('is deterministic under an injected rng (rng 0.999 → picks the current index, identity)', () => {
    expect(shuffleQuestions(rows, () => 0.999).map((r) => r.id)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
  });

  it('returns a copy, not the input reference (routes must not hand out template rows)', () => {
    expect(shuffleQuestions(rows)).not.toBe(rows);
  });

  it('handles empty and single-question boards (loop never runs)', () => {
    expect(shuffleQuestions([])).toEqual([]);
    expect(shuffleQuestions([{ id: 'only' }])).toEqual([{ id: 'only' }]);
    // The rng is never consulted — a throwing rng proves it.
    expect(shuffleQuestions([], () => { throw new Error('rng must not be called'); })).toEqual([]);
    expect(shuffleQuestions([{ id: 'only' }], () => { throw new Error('rng must not be called'); })).toEqual([{ id: 'only' }]);
  });
});

/* ═══════════════ Answer-save dimension rules ═══════════════ */

describe('answerPatchFor', () => {
  it('MCQ/TRUE_FALSE saves require the choiceIndex dimension', () => {
    expect(answerPatchFor('MCQ', { answerText: 'I insist on prose' })).toEqual({
      patch: {},
      error: 'This question is answered with choiceIndex',
    });
    expect(answerPatchFor('TRUE_FALSE', { answerText: 'true?' })).toEqual({
      patch: {},
      error: 'This question is answered with choiceIndex',
    });
  });

  it('SHORT/ESSAY saves require the answerText dimension', () => {
    expect(answerPatchFor('SHORT', { choiceIndex: 0 })).toEqual({
      patch: {},
      error: 'This question is answered with answerText',
    });
    expect(answerPatchFor('ESSAY', { choiceIndex: 1 })).toEqual({
      patch: {},
      error: 'This question is answered with answerText',
    });
  });

  it('a text-only retry keeps the patch free of choiceIndex — a previously saved choice survives', () => {
    const { patch, error } = answerPatchFor('ESSAY', { answerText: 'updated prose' });
    expect(error).toBe(null);
    expect(patch).toEqual({ answerText: 'updated prose' });
    expect('choiceIndex' in patch).toBe(false);
  });

  it('an index-only retry keeps the patch free of answerText — a previously saved text survives', () => {
    const { patch, error } = answerPatchFor('MCQ', { choiceIndex: 3 });
    expect(error).toBe(null);
    expect(patch).toEqual({ choiceIndex: 3 });
    expect('answerText' in patch).toBe(false);
  });

  it('a both-dimension save writes both fields', () => {
    const { patch, error } = answerPatchFor('SHORT', { answerText: 'HTML', choiceIndex: 1 });
    expect(error).toBe(null);
    expect(patch).toEqual({ answerText: 'HTML', choiceIndex: 1 });
  });

  it('treats an empty string as a provided dimension, not a missing one', () => {
    const { patch, error } = answerPatchFor('ESSAY', { answerText: '' });
    expect(error).toBe(null);
    expect(patch).toEqual({ answerText: '' });
    expect('choiceIndex' in patch).toBe(false);
  });

  it('MCQ/TRUE_FALSE with both dimensions is valid (index drives grading, text is saved)', () => {
    const { patch, error } = answerPatchFor('TRUE_FALSE', { answerText: 'لأنه صحيح', choiceIndex: 0 });
    expect(error).toBe(null);
    expect(patch).toEqual({ answerText: 'لأنه صحيح', choiceIndex: 0 });
  });
});

/* ═══════════════ Manual-grading payload reconciliation ═══════════════ */

describe('reconcileManualGrades', () => {
  it('accepts a payload covering exactly the pending answers (order-independent)', () => {
    expect(reconcileManualGrades(
      [{ answerId: 'a2' }, { answerId: 'a1' }],
      ['a1', 'a2'],
    )).toEqual({ ok: true });
  });

  it('accepts an empty payload when nothing is pending (finalize-only)', () => {
    expect(reconcileManualGrades([], [])).toEqual({ ok: true });
  });

  it('rejects duplicate answerIds', () => {
    const result = reconcileManualGrades(
      [{ answerId: 'a1' }, { answerId: 'a1' }],
      ['a1'],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.answerIds).toEqual(['a1']);
      expect(result.message).toContain('Duplicate');
    }
  });

  it('rejects answers that are not pending (already machine-graded or foreign)', () => {
    const result = reconcileManualGrades(
      [{ answerId: 'a1' }, { answerId: 'graded1' }],
      ['a1', 'a2'],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.answerIds).toEqual(['graded1']);
      expect(result.message).toContain('not awaiting');
    }
  });

  it('rejects a payload that leaves pending answers ungraded', () => {
    const result = reconcileManualGrades(
      [{ answerId: 'a1' }],
      ['a1', 'a2', 'a3'],
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.answerIds).toEqual(['a2', 'a3']);
      expect(result.message).toContain('All pending answers');
    }
  });
});

/* ═══════════════ Question authoring schema ═══════════════ */

describe('createQuestionSchema', () => {
  const base = { categoryId: 'c12345678', prompt: 'What is 2+2 in decimal?' };

  const mcq = {
    ...base,
    type: 'MCQ' as const,
    choices: ['1', '2', '4', '8'],
    correctAnswer: 2,
  };

  it('accepts a well-formed MCQ', () => {
    expect(createQuestionSchema.safeParse(mcq).success).toBe(true);
  });

  it('applies the documented defaults', () => {
    const parsed = createQuestionSchema.safeParse(mcq);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.difficulty).toBe('MEDIUM');
      expect(parsed.data.points).toBe(1);
      expect(parsed.data.tags).toEqual([]);
    }
  });

  it('rejects an MCQ without choices', () => {
    expect(createQuestionSchema.safeParse({ ...base, type: 'MCQ', correctAnswer: 0 }).success).toBe(false);
  });

  it('rejects fewer than 2 or more than 20 choices', () => {
    expect(createQuestionSchema.safeParse({ ...base, type: 'MCQ', choices: ['only'], correctAnswer: 0 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'MCQ', choices: Array.from({ length: 21 }, (_, i) => `c${i}`), correctAnswer: 0 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'MCQ', choices: Array.from({ length: 20 }, (_, i) => `c${i}`), correctAnswer: 19 }).success).toBe(true);
  });

  it('rejects an MCQ key that is not an integer index into choices', () => {
    // A letter key used to grade every student wrong, silently.
    expect(createQuestionSchema.safeParse({ ...mcq, correctAnswer: 'B' }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...mcq, correctAnswer: true }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...mcq, correctAnswer: 1.5 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...mcq, correctAnswer: -1 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...mcq, correctAnswer: 4 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'MCQ', choices: mcq.choices }).success).toBe(false);
  });

  it('requires exactly 2 choices and a 0|1 key for TRUE_FALSE', () => {
    expect(createQuestionSchema.safeParse({ ...base, type: 'TRUE_FALSE', choices: ['صحيح', 'خطأ'], correctAnswer: 1 }).success).toBe(true);
    expect(createQuestionSchema.safeParse({ ...base, type: 'TRUE_FALSE', choices: ['صحيح', 'خطأ', 'ربما'], correctAnswer: 0 }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'TRUE_FALSE', choices: ['صحيح', 'خطأ'], correctAnswer: 2 }).success).toBe(false);
  });

  it('requires a non-empty string model answer for SHORT', () => {
    expect(createQuestionSchema.safeParse({ ...base, type: 'SHORT', correctAnswer: 'HTML' }).success).toBe(true);
    expect(createQuestionSchema.safeParse({ ...base, type: 'SHORT' }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'SHORT', correctAnswer: '' }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'SHORT', correctAnswer: '   ' }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...base, type: 'SHORT', correctAnswer: 5 }).success).toBe(false);
  });

  it('accepts an optional string rubric for ESSAY and rejects non-strings', () => {
    expect(createQuestionSchema.safeParse({ ...base, type: 'ESSAY' }).success).toBe(true);
    expect(createQuestionSchema.safeParse({ ...base, type: 'ESSAY', correctAnswer: 'focus on trade-offs' }).success).toBe(true);
    expect(createQuestionSchema.safeParse({ ...base, type: 'ESSAY', correctAnswer: 7 }).success).toBe(false);
  });

  it('rejects short prompts and extra fields (strict mode)', () => {
    expect(createQuestionSchema.safeParse({ ...mcq, prompt: 'abc' }).success).toBe(false);
    expect(createQuestionSchema.safeParse({ ...mcq, sneaky: true }).success).toBe(false);
  });
});

/* ═══════════════ Template authoring schema ═══════════════ */

describe('createTemplateSchema', () => {
  const base = {
    title: 'اختبار قصير — أساسيات الويب',
    questionIds: ['c11111111', 'c22222222', 'c33333333'],
  };

  it('accepts a minimal template and applies the documented defaults', () => {
    const parsed = createTemplateSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.kind).toBe('QUIZ');
      expect(parsed.data.durationMin).toBe(45);
      expect(parsed.data.passingScore).toBe(50);
      expect(parsed.data.randomized).toBe(true);
    }
  });

  it('rejects an impossible open/close window', () => {
    expect(createTemplateSchema.safeParse({
      ...base,
      openAt: new Date('2026-06-02T09:00:00.000Z'),
      closeAt: new Date('2026-06-01T09:00:00.000Z'),
    }).success).toBe(false);
    expect(createTemplateSchema.safeParse({
      ...base,
      openAt: new Date('2026-06-01T09:00:00.000Z'),
      closeAt: new Date('2026-06-01T09:00:00.000Z'),
    }).success).toBe(false);
  });

  it('accepts a proper window, and a single-sided one', () => {
    expect(createTemplateSchema.safeParse({
      ...base,
      openAt: new Date('2026-06-01T09:00:00.000Z'),
      closeAt: new Date('2026-06-02T09:00:00.000Z'),
    }).success).toBe(true);
    expect(createTemplateSchema.safeParse({ ...base, closeAt: new Date('2026-06-02T09:00:00.000Z') }).success).toBe(true);
  });

  it('rejects duplicate questionIds', () => {
    expect(createTemplateSchema.safeParse({ ...base, questionIds: ['c11111111', 'c11111111'] }).success).toBe(false);
  });

  it('rejects empty or oversized question sets', () => {
    expect(createTemplateSchema.safeParse({ ...base, questionIds: [] }).success).toBe(false);
    expect(createTemplateSchema.safeParse({ ...base, questionIds: Array.from({ length: 61 }, (_, i) => `c${String(i).padStart(8, '0')}`) }).success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(createTemplateSchema.safeParse({ ...base, status: 'PUBLISHED' }).success).toBe(false);
  });
});

/* ═══════════════ Answer-save schema ═══════════════ */

describe('submitAnswerSchema', () => {
  it('accepts either dimension, or both', () => {
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', answerText: 'HTML' }).success).toBe(true);
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', choiceIndex: 3 }).success).toBe(true);
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', answerText: '', choiceIndex: 0 }).success).toBe(true);
  });

  it('caps choiceIndex at 19 (choices are capped at 20 at authoring time)', () => {
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', choiceIndex: 19 }).success).toBe(true);
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', choiceIndex: 20 }).success).toBe(false);
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', choiceIndex: -1 }).success).toBe(false);
  });

  it('bounds answerText length and requires a cuid questionId', () => {
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', answerText: 'a'.repeat(4000) }).success).toBe(true);
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', answerText: 'a'.repeat(4001) }).success).toBe(false);
    expect(submitAnswerSchema.safeParse({ questionId: 'not-a-cuid', answerText: 'x' }).success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(submitAnswerSchema.safeParse({ questionId: 'c12345678', answerText: 'x', isCorrect: true }).success).toBe(false);
  });
});

/* ═══════════════ Manual grading schema ═══════════════ */

describe('manualGradeSchema', () => {
  it('accepts per-answer verdicts with optional feedback', () => {
    expect(manualGradeSchema.safeParse({
      answers: [{ answerId: 'c12345678', isCorrect: true, feedback: 'إجابة وافية' }],
    }).success).toBe(true);
    expect(manualGradeSchema.safeParse({
      answers: [{ answerId: 'c12345678', isCorrect: false }],
    }).success).toBe(true);
  });

  it('accepts an empty answers array (finalize an attempt with nothing pending)', () => {
    expect(manualGradeSchema.safeParse({ answers: [] }).success).toBe(true);
  });

  it('requires isCorrect and a cuid answerId', () => {
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'c12345678' }] }).success).toBe(false);
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'nope', isCorrect: true }] }).success).toBe(false);
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'c12345678', isCorrect: 'yes' }] }).success).toBe(false);
  });

  it('bounds feedback length', () => {
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'c12345678', isCorrect: true, feedback: 'a'.repeat(2000) }] }).success).toBe(true);
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'c12345678', isCorrect: true, feedback: 'a'.repeat(2001) }] }).success).toBe(false);
  });

  it('rejects extra fields on both levels (strict mode)', () => {
    expect(manualGradeSchema.safeParse({ answers: [{ answerId: 'c12345678', isCorrect: true, awardedPoints: 5 }] }).success).toBe(false);
    expect(manualGradeSchema.safeParse({ answers: [], finalize: true }).success).toBe(false);
  });
});
