/**
 * r164-c — the dashboard's exam-agenda + training-resume pure pins.
 *
 * The agenda's fourth bucket (exams) and the resume hero's second arm
 * (training) both live as pure decision functions on DashboardPage —
 * the same DB-free contract classWhenMs/safeMs already hold
 * (DashboardPage-agenda.test.ts):
 *  · examAgendaRow — the wire row → agenda row mapping: whenAt is the
 *    chronology key (safeMs), the deep link enters the exam taker,
 *    unknown kinds fall back to the generic «اختبار» (D17-1), and the
 *    meta label tells «يفتح باب الاختبار» from «آخر موعد للتسليم»;
 *  · pickTrainingResume — /me/resume's null branch falls to the
 *    self-development surface: the most-advanced in-progress track
 *    wins, else the first unstarted enrolled track, else nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  examAgendaRow,
  pickTrainingResume,
  safeMs,
  type TrainingResumeTrack,
} from '../../src/pages/student/DashboardPage';

describe('examAgendaRow — the exam agenda mapping (r164-c)', () => {
  it('keys the row on whenAt and deep-links into the exam taker', () => {
    const row = examAgendaRow({
      id: 'ex1',
      title: 'قواعد البيانات',
      kind: 'FINAL',
      whenAt: '2026-01-18T20:00:00.000Z',
      phase: 'closes',
      courseCode: 'CS301',
    });
    expect(row.id).toBe('e-ex1');
    expect(row.whenMs).toBe(Date.parse('2026-01-18T20:00:00.000Z'));
    expect(row.to).toBe('/student/online-exams/ex1');
    expect(row.kindLabel).toBe('نهائي');
    expect(row.metaLabel).toBe('آخر موعد للتسليم');
  });

  it('a future window opens — the meta label says so', () => {
    const row = examAgendaRow({
      id: 'ex2', title: 't', kind: 'QUIZ',
      whenAt: '2026-01-16T08:00:00.000Z', phase: 'opens', courseCode: null,
    });
    expect(row.metaLabel).toBe('يفتح باب الاختبار');
    expect(row.kindLabel).toBe('اختبار قصير');
  });

  it('an unknown kind falls back to the generic «اختبار» — never a raw enum leak', () => {
    const row = examAgendaRow({
      id: 'ex3', title: 't', kind: 'SOMETHING_NEW',
      whenAt: '2026-01-16T08:00:00.000Z', phase: 'closes', courseCode: null,
    });
    expect(row.kindLabel).toBe('اختبار');
  });

  it('a malformed whenAt sorts LAST like every other agenda source (safeMs)', () => {
    const row = examAgendaRow({
      id: 'ex4', title: 't', kind: 'FINAL',
      whenAt: 'garbage', phase: 'closes', courseCode: null,
    });
    expect(row.whenMs).toBe(Number.MAX_SAFE_INTEGER);
    expect(safeMs('2027-01-01T00:00:00Z')).toBeLessThan(row.whenMs);
  });
});

describe('pickTrainingResume — the hero\'s training arm (r164-c)', () => {
  const track = (over: Partial<TrainingResumeTrack> = {}): TrainingResumeTrack => ({
    slug: 'study-skills',
    title: 'مهارات الدراسة',
    enrolled: true,
    isCompleted: false,
    completedLessons: 0,
    progressPct: 0,
    ...over,
  });

  it('the MOST-ADVANCED in-progress track wins — the nearest finish line', () => {
    const pick = pickTrainingResume([
      track({ slug: 'a', completedLessons: 1, progressPct: 10 }),
      track({ slug: 'b', completedLessons: 5, progressPct: 50 }),
      track({ slug: 'c', completedLessons: 3, progressPct: 30 }),
    ]);
    expect(pick).toMatchObject({ slug: 'b', started: true, progressPct: 50 });
  });

  it('with no progress anywhere, the FIRST enrolled unstarted track is a start nudge', () => {
    const pick = pickTrainingResume([
      track({ slug: 'a' }),
      track({ slug: 'b' }),
    ]);
    expect(pick).toMatchObject({ slug: 'a', started: false, progressPct: 0 });
  });

  it('in-progress beats unstarted regardless of catalog order', () => {
    const pick = pickTrainingResume([
      track({ slug: 'first-unstarted' }),
      track({ slug: 'started-later', completedLessons: 2, progressPct: 25 }),
    ]);
    expect(pick).toMatchObject({ slug: 'started-later', started: true });
  });

  it('completed tracks and un-enrolled tracks are never candidates', () => {
    expect(
      pickTrainingResume([
        track({ slug: 'done', isCompleted: true, completedLessons: 9, progressPct: 100 }),
        track({ slug: 'not-enrolled', enrolled: false, completedLessons: 4, progressPct: 40 }),
      ]),
    ).toBeNull();
  });

  it('no candidates at all → null → the hero renders nothing', () => {
    expect(pickTrainingResume([])).toBeNull();
  });
});
