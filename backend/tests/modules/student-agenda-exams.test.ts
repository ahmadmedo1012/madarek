/**
 * Backend unit test — r164-c: the agenda-exams decision pair of
 * `backend/src/http/routes/student-dashboard.routes.ts`.
 *
 * DB-free, mirroring tests/modules/dashboard-logic.test.ts: the
 * /me/dashboard agenda gained a fourth bucket (exams) — the pure
 * selector + attempt fold are pinned here directly:
 *  · examAttemptFinished — SUBMITTED / GRADED always finish the exam;
 *    EXPIRED only for non-PRACTICE kinds (a finished practice attempt
 *    is retakeable, an IN_PROGRESS one is resumable — the D5 start
 *    contract, so neither is finished).
 *  · selectAgendaExams — which still-actable PUBLISHED templates have a
 *    milestone (a future openAt, or the open window's closeAt) inside
 *    the week horizon; sort by milestone, id tiebreak, take cap.
 *
 * Integration coverage (the handler's findMany scoping, the /exams/me
 * parity, auth) needs a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import { AttemptStatus } from '@prisma/client';
import {
  examAttemptFinished,
  selectAgendaExams,
  type AgendaExamCandidate,
} from '../../src/http/routes/student-dashboard.routes';

// A fixed week: now = 2026-01-15 10:00 UTC, horizon = 2026-01-22 10:00.
const NOW = new Date('2026-01-15T10:00:00.000Z');
const HORIZON = new Date('2026-01-22T10:00:00.000Z');

function candidate(over: Partial<AgendaExamCandidate> = {}): AgendaExamCandidate {
  return {
    id: 'x1',
    title: 'اختبار الشبكات',
    kind: 'QUIZ',
    openAt: null,
    closeAt: new Date('2026-01-18T20:00:00.000Z'), // Friday, inside the week
    courseName: 'شبكات الحاسوب',
    courseCode: 'CS301',
    facultyName: null,
    finished: false,
    ...over,
  };
}

describe('examAttemptFinished — the attempt fold (r164-c)', () => {
  it('SUBMITTED and GRADED always finish the exam (the work is delivered)', () => {
    for (const status of [AttemptStatus.SUBMITTED, AttemptStatus.GRADED]) {
      expect(examAttemptFinished(status, 'QUIZ')).toBe(true);
      expect(examAttemptFinished(status, 'FINAL')).toBe(true);
      expect(examAttemptFinished(status, 'PRACTICE')).toBe(true);
    }
  });

  it('EXPIRED finishes a real exam but NOT a practice one (retakeable)', () => {
    expect(examAttemptFinished(AttemptStatus.EXPIRED, 'QUIZ')).toBe(true);
    expect(examAttemptFinished(AttemptStatus.EXPIRED, 'MIDTERM')).toBe(true);
    expect(examAttemptFinished(AttemptStatus.EXPIRED, 'FINAL')).toBe(true);
    // A finished PRACTICE attempt grants a freshStart (decideExamStart);
    // surfacing it as "still to do" is the retake affordance, not noise.
    expect(examAttemptFinished(AttemptStatus.EXPIRED, 'PRACTICE')).toBe(false);
  });

  it('IN_PROGRESS never finishes — the attempt is resumable (D5)', () => {
    expect(examAttemptFinished(AttemptStatus.IN_PROGRESS, 'QUIZ')).toBe(false);
    expect(examAttemptFinished(AttemptStatus.IN_PROGRESS, 'FINAL')).toBe(false);
  });
});

describe('selectAgendaExams — the week-window decision (r164-c)', () => {
  it('an open window closing inside the week surfaces with phase "closes"', () => {
    const rows = selectAgendaExams([candidate()], NOW, HORIZON);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.phase).toBe('closes');
    expect(rows[0]!.whenAt).toEqual(candidate().closeAt);
    expect(rows[0]!.id).toBe('x1');
    // Identity of the source fields rides the row — the FE deep-links to
    // /student/online-exams/:id and renders the course chip from them.
    expect(rows[0]!.courseCode).toBe('CS301');
    expect(rows[0]!.title).toBe('اختبار الشبكات');
  });

  it('a not-yet-open window surfaces with phase "opens" keyed on openAt', () => {
    const openAt = new Date('2026-01-19T08:00:00.000Z'); // tomorrow-ish
    const rows = selectAgendaExams(
      [candidate({ openAt, closeAt: new Date('2026-01-30T20:00:00.000Z') })],
      NOW,
      HORIZON,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.phase).toBe('opens');
    expect(rows[0]!.whenAt).toEqual(openAt);
  });

  it('a finished exam never surfaces — nothing left to act on', () => {
    const rows = selectAgendaExams([candidate({ finished: true })], NOW, HORIZON);
    expect(rows).toEqual([]);
  });

  it('a closed window (closeAt in the past) is skipped — the start route would refuse it', () => {
    const rows = selectAgendaExams(
      [candidate({ closeAt: new Date('2026-01-14T23:59:00.000Z') })], // yesterday
      NOW,
      HORIZON,
    );
    expect(rows).toEqual([]);
  });

  it('a window with NO closeAt and no future openAt is perpetually open — no deadline event', () => {
    const rows = selectAgendaExams([candidate({ closeAt: null, openAt: null })], NOW, HORIZON);
    expect(rows).toEqual([]);
  });

  it('an open window closing BEYOND the horizon is skipped — the agenda is a 7-day window', () => {
    // Mirrors the assignments bucket's dueAt ≤ horizon semantics.
    const rows = selectAgendaExams(
      [candidate({ closeAt: new Date('2026-02-10T20:00:00.000Z') })],
      NOW,
      HORIZON,
    );
    expect(rows).toEqual([]);
  });

  it('an exam opening BEYOND the horizon is skipped even though its closeAt is later', () => {
    const rows = selectAgendaExams(
      [candidate({ openAt: new Date('2026-02-01T08:00:00.000Z'), closeAt: new Date('2026-02-05T20:00:00.000Z') })],
      NOW,
      HORIZON,
    );
    expect(rows).toEqual([]);
  });

  it('boundary milestones are inclusive: closeAt == now and whenAt == horizon surface', () => {
    const closingRightNow = candidate({ closeAt: NOW });
    const closingAtHorizon = candidate({ id: 'x2', closeAt: HORIZON });
    const rows = selectAgendaExams([closingRightNow, closingAtHorizon], NOW, HORIZON);
    expect(rows.map((r) => r.id)).toEqual(['x1', 'x2']);
    expect(rows.every((r) => r.phase === 'closes')).toBe(true);
  });

  it('openAt == now is "already open" — the milestone is closeAt, not openAt', () => {
    const rows = selectAgendaExams(
      [candidate({ openAt: NOW, closeAt: new Date('2026-01-20T20:00:00.000Z') })],
      NOW,
      HORIZON,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.phase).toBe('closes');
    expect(rows[0]!.whenAt).toEqual(new Date('2026-01-20T20:00:00.000Z'));
  });

  it('rows sort by milestone ascending; id is the deterministic tiebreak', () => {
    const rows = selectAgendaExams(
      [
        candidate({ id: 'b', closeAt: new Date('2026-01-19T10:00:00.000Z') }),
        candidate({ id: 'a', closeAt: new Date('2026-01-16T10:00:00.000Z') }),
        // Same milestone as 'a' — the id decides, deterministically.
        candidate({ id: 'c', closeAt: new Date('2026-01-16T10:00:00.000Z') }),
        candidate({ id: 'd', openAt: new Date('2026-01-15T11:00:00.000Z'), closeAt: new Date('2026-01-30T20:00:00.000Z') }),
      ],
      NOW,
      HORIZON,
    );
    expect(rows.map((r) => r.id)).toEqual(['d', 'a', 'c', 'b']);
  });

  it('the take cap keeps the agenda bounded (default 4, like the other buckets)', () => {
    const many = [1, 2, 3, 4, 5, 6].map((i) =>
      candidate({ id: `x${i}`, closeAt: new Date(Date.UTC(2026, 0, 16 + i, 10)) }),
    );
    expect(selectAgendaExams(many, NOW, HORIZON)).toHaveLength(4);
    expect(selectAgendaExams(many, NOW, HORIZON, 2)).toHaveLength(2);
  });

  it('an empty candidate list yields an empty agenda (fresh student)', () => {
    expect(selectAgendaExams([], NOW, HORIZON)).toEqual([]);
  });
});
