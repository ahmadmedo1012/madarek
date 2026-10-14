/**
 * r164d (course flow) — the next-lecture selection logic, pinned as the
 * pure functions it is (hooks/resources/learning.ts). The pages
 * (CourseDetailPage hero CTA + highlighted row, the player's
 * continuation banner) are thin renderers over these rules:
 *
 *  1. A lecture is FINISHED only when BOTH loops are closed: watch
 *     completed AND every checkpoint answered (r155a caps attempts
 *     precisely because an unanswered checkpoint is an open loop).
 *  2. «التالي» = the FIRST unfinished lecture in the server-ordered
 *     list — watch open OR checkpoints pending.
 *  3. Unknown answered-count (staff reads / older payloads) degrades
 *     to watch-only completion instead of flagging every checkpointed
 *     lecture as pending.
 */
import { describe, expect, it } from 'vitest';
import {
  isLectureFinished,
  pendingCheckpoints,
  selectNextLecture,
  type NextLectureInput,
} from '../../src/hooks/resources/learning';

const lec = (over: Partial<NextLectureInput> & { id: string }): NextLectureInput => ({
  title: `محاضرة ${over.id}`,
  watchEvents: [],
  _count: { checkpoints: 0 },
  ...over,
});

describe('pendingCheckpoints', () => {
  it('counts the checkpoints still open on a lecture', () => {
    expect(pendingCheckpoints(lec({ id: 'a', _count: { checkpoints: 4 }, answeredCheckpoints: 1 }))).toBe(3);
    expect(pendingCheckpoints(lec({ id: 'b', _count: { checkpoints: 3 }, answeredCheckpoints: 3 }))).toBe(0);
  });

  it('unknown answered-count degrades to 0 (watch-only), never flags everything pending', () => {
    expect(pendingCheckpoints(lec({ id: 'a', _count: { checkpoints: 5 } }))).toBe(0);
  });

  it('no checkpoints → 0 pending regardless of the answered count', () => {
    expect(pendingCheckpoints(lec({ id: 'a', _count: { checkpoints: 0 }, answeredCheckpoints: 0 }))).toBe(0);
    expect(pendingCheckpoints(lec({ id: 'b' }))).toBe(0);
  });

  it('schema drift (answered > total) clamps to 0, never negative', () => {
    expect(pendingCheckpoints(lec({ id: 'a', _count: { checkpoints: 2 }, answeredCheckpoints: 7 }))).toBe(0);
  });
});

describe('isLectureFinished', () => {
  it('watch completed AND all checkpoints answered', () => {
    expect(isLectureFinished(lec({
      id: 'a',
      watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
      _count: { checkpoints: 2 },
      answeredCheckpoints: 2,
    }))).toBe(true);
  });

  it('watch-only lecture finishes with the watch event alone', () => {
    expect(isLectureFinished(lec({
      id: 'a',
      watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
    }))).toBe(true);
  });

  it('watch completed but checkpoints pending → NOT finished (the r164d rule)', () => {
    expect(isLectureFinished(lec({
      id: 'a',
      watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
      _count: { checkpoints: 3 },
      answeredCheckpoints: 1,
    }))).toBe(false);
  });

  it('unwatched is never finished, even with all checkpoints answered', () => {
    expect(isLectureFinished(lec({
      id: 'a',
      watchEvents: [{ watchedSec: 120, totalSec: 600, completed: false }],
      _count: { checkpoints: 2 },
      answeredCheckpoints: 2,
    }))).toBe(false);
    expect(isLectureFinished(lec({ id: 'b', watchEvents: [] }))).toBe(false);
  });
});

describe('selectNextLecture', () => {
  it('returns the FIRST unfinished lecture in the given (server) order', () => {
    const list = [
      lec({ id: 'l1', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lec({ id: 'l2', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lec({ id: 'l3' }),
    ];
    expect(selectNextLecture(list)?.id).toBe('l3');
  });

  it('a completed-watch lecture with pending checkpoints wins over later unwatched ones', () => {
    const list = [
      lec({ id: 'l1', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      // watched to the end but 1 of 3 checkpoints unanswered — the open loop.
      lec({
        id: 'l2',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { checkpoints: 3 },
        answeredCheckpoints: 1,
      }),
      lec({ id: 'l3' }),
    ];
    expect(selectNextLecture(list)?.id).toBe('l2');
  });

  it('returns null when the whole curriculum is finished (honest done state)', () => {
    const list = [
      lec({ id: 'l1', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lec({
        id: 'l2',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { checkpoints: 2 },
        answeredCheckpoints: 2,
      }),
    ];
    expect(selectNextLecture(list)).toBeNull();
  });

  it('empty curriculum → null (no dead CTA on an empty course)', () => {
    expect(selectNextLecture([])).toBeNull();
  });

  it('unknown answered-count (staff/older payload) degrades to watch-only selection', () => {
    const list = [
      lec({ id: 'l1', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lec({ id: 'l2' }),
    ];
    expect(selectNextLecture(list)?.id).toBe('l2');
  });
});
