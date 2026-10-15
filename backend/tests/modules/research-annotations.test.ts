/**
 * Backend unit test — annotation access gates of
 * `backend/src/http/routes/learning.routes.ts` (r169a).
 *
 * The old inline gates admitted the paper student, the assigned
 * reviewer, and oversight roles — so the offering teacher (the exact
 * scope `researchQueueWhere` hands the review queue to, and the same
 * per-row ownership `assertOwnsResearchPaper` enforces for grading)
 * got a guaranteed 403 on every fresh queue paper: the teacher review
 * modal and the document-viewer annotations panel both fetch the
 * annotation thread BEFORE the first grade assigns reviewerId, and
 * writing annotations was equally impossible pre-grade.
 *
 * The r169a fix extracts the decisions as pure functions and admits
 * the offering teacher (queue scope) for both read and write. These
 * pins cover every branch, including the still-denied cases.
 */
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  canReadPaperAnnotations,
  canWritePaperAnnotations,
} from '../../src/http/routes/learning.routes';

const T = 'teacher-1';
const S = 'student-1';
const OT = 'other-teacher';

describe('canReadPaperAnnotations (r169a)', () => {
  it('admits the offering teacher on an UNASSIGNED queue paper — the 403 regression', () => {
    // Fresh queue paper: reviewerId null, the offering teacher opens
    // the review modal → previously a guaranteed 403.
    expect(
      canReadPaperAnnotations({ role: Role.TEACHER, userId: T, studentId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(true);
  });

  it('admits the offering teacher AFTER grading assigned reviewerId elsewhere', () => {
    // Re-graded by ADMIN: reviewerId is the admin, the offering teacher
    // still reviews their student's thread.
    expect(
      canReadPaperAnnotations({ role: Role.TEACHER, userId: T, studentId: S, reviewerId: 'admin-9', offeringTeacherId: T }),
    ).toBe(true);
  });

  it('keeps the legacy allowed branches: student, assigned reviewer, oversight roles', () => {
    expect(
      canReadPaperAnnotations({ role: Role.STUDENT, userId: S, studentId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(true);
    expect(
      canReadPaperAnnotations({ role: Role.TEACHER, userId: T, studentId: S, reviewerId: T, offeringTeacherId: OT }),
    ).toBe(true);
    expect(
      canReadPaperAnnotations({ role: Role.ADMIN, userId: 'a', studentId: S, reviewerId: null, offeringTeacherId: null }),
    ).toBe(true);
    expect(
      canReadPaperAnnotations({ role: Role.OWNER, userId: 'o', studentId: S, reviewerId: null, offeringTeacherId: null }),
    ).toBe(true);
    expect(
      canReadPaperAnnotations({ role: Role.QUALITY, userId: 'q', studentId: S, reviewerId: null, offeringTeacherId: null }),
    ).toBe(true);
  });

  it('still denies: a teacher with no relation to the paper, a foreign student, orphaned paper', () => {
    // Teacher neither reviewer nor offering teacher.
    expect(
      canReadPaperAnnotations({ role: Role.TEACHER, userId: OT, studentId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(false);
    // Foreign student.
    expect(
      canReadPaperAnnotations({ role: Role.STUDENT, userId: 'student-2', studentId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(false);
    // Orphaned paper (no offering) — only oversight/student/reviewer.
    expect(
      canReadPaperAnnotations({ role: Role.TEACHER, userId: T, studentId: S, reviewerId: null, offeringTeacherId: null }),
    ).toBe(false);
  });

  it('TEACHER-only branch: a non-teacher cannot ride the offeringTeacherId match', () => {
    // e.g. a STUDENT whose id collided with the teacher id — the branch
    // requires Role.TEACHER explicitly.
    expect(
      canReadPaperAnnotations({ role: Role.STUDENT, userId: T, studentId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(false);
  });
});

describe('canWritePaperAnnotations (r169a)', () => {
  it('admits the offering teacher BEFORE the first grade (queue-review scope)', () => {
    expect(
      canWritePaperAnnotations({ role: Role.TEACHER, userId: T, reviewerId: null, offeringTeacherId: T }),
    ).toBe(true);
  });

  it('admits the assigned reviewer and oversight bypasses', () => {
    expect(
      canWritePaperAnnotations({ role: Role.TEACHER, userId: T, reviewerId: T, offeringTeacherId: OT }),
    ).toBe(true);
    expect(
      canWritePaperAnnotations({ role: Role.ADMIN, userId: 'a', reviewerId: null, offeringTeacherId: null }),
    ).toBe(true);
    expect(
      canWritePaperAnnotations({ role: Role.OWNER, userId: 'o', reviewerId: null, offeringTeacherId: null }),
    ).toBe(true);
  });

  it('denies an unrelated teacher, a foreign offering teacher, and every non-teacher/student', () => {
    expect(
      canWritePaperAnnotations({ role: Role.TEACHER, userId: OT, reviewerId: null, offeringTeacherId: T }),
    ).toBe(false);
    expect(
      canWritePaperAnnotations({ role: Role.STUDENT, userId: S, reviewerId: null, offeringTeacherId: T }),
    ).toBe(false);
    expect(
      canWritePaperAnnotations({ role: Role.QUALITY, userId: 'q', reviewerId: 'q', offeringTeacherId: T }),
    ).toBe(false);
  });
});
