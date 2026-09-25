/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/submissions.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/theme-schema.test.ts`:
 * zod acceptance/rejection envelope + late-status computation +
 * fileUrl validation. Integration coverage (auth, enrollment guard,
 * transaction, notification, milestone fire) needs a DB harness that
 * the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { SubmissionStatus } from '@prisma/client';
import {
  RESUBMITTABLE_STATUSES,
  SUBMISSION_FILE_URL_PATTERN,
  buildSubmissionWrite,
  gradeBodySchema,
  submissionStatusFor,
  submitBodySchema,
} from '../../src/http/routes/submissions.routes';

describe('submitBodySchema', () => {
  it('accepts a text-only submission', () => {
    expect(submitBodySchema.safeParse({ textAnswer: 'My answer' }).success).toBe(true);
  });

  it('accepts a file-only submission with an https URL', () => {
    expect(submitBodySchema.safeParse({ fileUrl: 'https://cdn.example.com/paper.pdf' }).success).toBe(true);
  });

  it('accepts a file-only submission pointing at our papers API', () => {
    expect(submitBodySchema.safeParse({ fileUrl: '/api/v1/files/papers/abc123.pdf' }).success).toBe(true);
  });

  it('accepts both fields together', () => {
    expect(submitBodySchema.safeParse({ textAnswer: 'answer', fileUrl: 'https://x.example/a.pdf' }).success).toBe(true);
  });

  it('rejects an empty body (at least one field required)', () => {
    expect(submitBodySchema.safeParse({}).success).toBe(false);
  });

  it('rejects whitespace-only textAnswer as the sole field', () => {
    expect(submitBodySchema.safeParse({ textAnswer: '   ' }).success).toBe(false);
  });

  it('rejects empty-string textAnswer as the sole field', () => {
    expect(submitBodySchema.safeParse({ textAnswer: '' }).success).toBe(false);
  });

  it('rejects http:// fileUrl (https or internal path only)', () => {
    expect(submitBodySchema.safeParse({ fileUrl: 'http://cdn.example.com/paper.pdf' }).success).toBe(false);
  });

  it('rejects arbitrary relative fileUrl paths', () => {
    expect(submitBodySchema.safeParse({ fileUrl: '/uploads/paper.pdf' }).success).toBe(false);
    expect(submitBodySchema.safeParse({ fileUrl: 'ftp://x/y.pdf' }).success).toBe(false);
  });

  it('rejects fileUrl over 500 chars', () => {
    expect(submitBodySchema.safeParse({ fileUrl: `https://x.example/${'a'.repeat(500)}.pdf` }).success).toBe(false);
  });

  it('rejects textAnswer over 8000 chars', () => {
    expect(submitBodySchema.safeParse({ textAnswer: 'a'.repeat(8001) }).success).toBe(false);
    expect(submitBodySchema.safeParse({ textAnswer: 'a'.repeat(8000) }).success).toBe(true);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(submitBodySchema.safeParse({ textAnswer: 'x', grade: 5 }).success).toBe(false);
  });

  it('rejects wrong types', () => {
    expect(submitBodySchema.safeParse({ textAnswer: 42 }).success).toBe(false);
    expect(submitBodySchema.safeParse({ fileUrl: 42 }).success).toBe(false);
    expect(submitBodySchema.safeParse(null).success).toBe(false);
    expect(submitBodySchema.safeParse('text').success).toBe(false);
  });
});

describe('SUBMISSION_FILE_URL_PATTERN', () => {
  it('matches the two sanctioned prefixes', () => {
    expect(SUBMISSION_FILE_URL_PATTERN.test('https://example.com/a.pdf')).toBe(true);
    expect(SUBMISSION_FILE_URL_PATTERN.test('/api/v1/files/papers/a.pdf')).toBe(true);
  });

  it('rejects http, other schemes, and traversal-ish paths', () => {
    expect(SUBMISSION_FILE_URL_PATTERN.test('http://example.com/a.pdf')).toBe(false);
    expect(SUBMISSION_FILE_URL_PATTERN.test('/api/v1/files/../a.pdf')).toBe(false);
    expect(SUBMISSION_FILE_URL_PATTERN.test('javascript:alert(1)')).toBe(false);
  });
});

describe('submissionStatusFor', () => {
  const due = new Date('2026-01-10T23:59:00.000Z');

  it('returns SUBMITTED when submitting before the deadline', () => {
    expect(submissionStatusFor(due, new Date('2026-01-10T10:00:00.000Z'))).toBe(SubmissionStatus.SUBMITTED);
  });

  it('returns LATE when submitting after the deadline', () => {
    expect(submissionStatusFor(due, new Date('2026-01-11T00:00:01.000Z'))).toBe(SubmissionStatus.LATE);
  });

  it('returns SUBMITTED exactly at the deadline (not >)', () => {
    expect(submissionStatusFor(due, due)).toBe(SubmissionStatus.SUBMITTED);
  });

  it('defaults `at` to now (a past due date yields LATE)', () => {
    expect(submissionStatusFor(new Date('2000-01-01T00:00:00.000Z'))).toBe(SubmissionStatus.LATE);
  });
});

describe('gradeBodySchema', () => {
  it('accepts a whole-number grade with optional feedback', () => {
    expect(gradeBodySchema.safeParse({ grade: 85 }).success).toBe(true);
    expect(gradeBodySchema.safeParse({ grade: 85, feedback: 'عمل جيد' }).success).toBe(true);
  });

  it('accepts grades with up to 2 decimal places', () => {
    expect(gradeBodySchema.safeParse({ grade: 12.5 }).success).toBe(true);
    expect(gradeBodySchema.safeParse({ grade: 12.55 }).success).toBe(true);
  });

  it('rejects grades with more than 2 decimal places', () => {
    expect(gradeBodySchema.safeParse({ grade: 12.555 }).success).toBe(false);
  });

  it('rejects negative grades', () => {
    expect(gradeBodySchema.safeParse({ grade: -1 }).success).toBe(false);
  });

  it('rejects non-finite grades', () => {
    expect(gradeBodySchema.safeParse({ grade: Number.POSITIVE_INFINITY }).success).toBe(false);
    expect(gradeBodySchema.safeParse({ grade: Number.NaN }).success).toBe(false);
  });

  it('rejects non-number grades', () => {
    expect(gradeBodySchema.safeParse({ grade: '85' }).success).toBe(false);
  });

  it('rejects feedback over 2000 chars', () => {
    expect(gradeBodySchema.safeParse({ grade: 10, feedback: 'a'.repeat(2001) }).success).toBe(false);
    expect(gradeBodySchema.safeParse({ grade: 10, feedback: 'a'.repeat(2000) }).success).toBe(true);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(gradeBodySchema.safeParse({ grade: 10, studentId: 'x' }).success).toBe(false);
    expect(gradeBodySchema.safeParse({}).success).toBe(false);
  });
});

// ── Resubmit claim set + optimistic-version write (audits 15-b P2-4, 13-7) ──

describe('RESUBMITTABLE_STATUSES (the student-side claim set)', () => {
  it('contains exactly DRAFT, SUBMITTED and LATE', () => {
    expect([...RESUBMITTABLE_STATUSES].sort()).toEqual(['DRAFT', 'LATE', 'SUBMITTED']);
  });

  it('excludes GRADED and RETURNED — graded work is immutable student-side', () => {
    // The teacher grade claim's optimistic submittedAt guard is only
    // sound in both directions: if GRADED ever leaked into this set, a
    // resubmission could stomp a grade; if the write below ever stopped
    // bumping submittedAt, a resubmission would slip past the guard and
    // the grade would land on content the teacher never saw (P2-4).
    expect(RESUBMITTABLE_STATUSES).not.toContain(SubmissionStatus.GRADED);
    expect(RESUBMITTABLE_STATUSES).not.toContain(SubmissionStatus.RETURNED);
  });
});

describe('buildSubmissionWrite (the optimistic-version-carrying write)', () => {
  it('normalizes absent optional fields to null so a dropped dimension is cleared', () => {
    expect(buildSubmissionWrite({ textAnswer: 'جوابي' }, SubmissionStatus.SUBMITTED, new Date(0))).toEqual({
      textAnswer: 'جوابي',
      fileUrl: null,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(0),
    });
    expect(buildSubmissionWrite({ fileUrl: 'https://x.example/a.pdf' }, SubmissionStatus.LATE, new Date(0))).toEqual({
      textAnswer: null,
      fileUrl: 'https://x.example/a.pdf',
      status: SubmissionStatus.LATE,
      submittedAt: new Date(0),
    });
  });

  it('always stamps a fresh submittedAt — the token the teacher grade claim pins against', () => {
    const before = Date.now();
    const write = buildSubmissionWrite({ textAnswer: 'x' }, SubmissionStatus.SUBMITTED);
    expect(write.submittedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('uses the injected clock verbatim (deterministic writes)', () => {
    const at = new Date('2026-07-01T10:00:00.000Z');
    expect(buildSubmissionWrite({ textAnswer: 'x' }, SubmissionStatus.LATE, at).submittedAt).toBe(at);
  });
});
