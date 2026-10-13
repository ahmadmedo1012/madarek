/**
 * Backend unit test — the checkpoint-answer mastery guard exported from
 * `backend/src/http/routes/learning.routes.ts` (r155a — audit finding 3).
 *
 * The answer endpoint discloses correctIndex by design (that is the
 * pedagogical feedback), and every answer used to increment the
 * StudentMastery counters — a script could probe each option and then
 * drive level to 1.0 with unlimited correct-only retries. The guard:
 *  - a per-user route limiter (createRouteLimiter({ max: 20 }) —
 *    integration-level, not unit-testable here);
 *  - decideMasteryUpdate: only the first MASTERY_ATTEMPT_CAP answers
 *    per (student, concept) count into attempts / correct / level.
 *
 * DB-free pure decision function (the learning-logic.test.ts style);
 * the upsert/level-recompute plumbing is a thin Prisma wrapper.
 */
import { describe, expect, it } from 'vitest';
import {
  MASTERY_ATTEMPT_CAP,
  decideMasteryUpdate,
} from '../../src/http/routes/learning.routes.js';

describe('decideMasteryUpdate (r155a — mastery inflation guard)', () => {
  it('the cap is 4 attempts per (student, concept)', () => {
    expect(MASTERY_ATTEMPT_CAP).toBe(4);
  });

  it('no row yet (null) → attempt #1 counts, and seeds correct from this answer', () => {
    expect(decideMasteryUpdate(null, true)).toEqual({ counts: true, correctDelta: 1 });
    expect(decideMasteryUpdate(null, false)).toEqual({ counts: true, correctDelta: 0 });
  });

  it('attempts below the cap still count (0, 1, 2, 3 → attempts 1..4)', () => {
    for (const attempts of [0, 1, 2, 3]) {
      expect(decideMasteryUpdate(attempts, true).counts).toBe(true);
      expect(decideMasteryUpdate(attempts, false).counts).toBe(true);
    }
  });

  it('correctDelta mirrors the answer for every counting attempt', () => {
    // Narrow the discriminated union before touching correctDelta —
    // counting decisions always carry it, frozen ones never do.
    const first = decideMasteryUpdate(0, true);
    const last = decideMasteryUpdate(3, false);
    if (first.counts) expect(first.correctDelta).toBe(1);
    else throw new Error('attempt #1 must count');
    if (last.counts) expect(last.correctDelta).toBe(0);
    else throw new Error('attempt #4 must count');
  });

  it('the attempt exactly AT the cap is frozen (4 → counts: false)', () => {
    // Attempts 1..4 counted; the 5th answer (currentAttempts === 4) is
    // the first frozen one — feedback identical, counters untouched.
    expect(decideMasteryUpdate(MASTERY_ATTEMPT_CAP, true)).toEqual({ counts: false });
    expect(decideMasteryUpdate(MASTERY_ATTEMPT_CAP, false)).toEqual({ counts: false });
  });

  it('everything past the cap is frozen too (5, 100, …)', () => {
    expect(decideMasteryUpdate(5, true)).toEqual({ counts: false });
    expect(decideMasteryUpdate(100, true)).toEqual({ counts: false });
    expect(decideMasteryUpdate(100, false)).toEqual({ counts: false });
  });

  it('wrong answers burn the cap exactly like correct ones — no reset-by-failing', () => {
    // Four wrong answers freeze the row just as four correct ones do:
    // a learner must not be able to keep the counters live (or drive
    // level to 1.0 afterwards) by answering wrong on purpose.
    const wrongFour = [0, 1, 2, 3].every((a) => decideMasteryUpdate(a, false).counts);
    expect(wrongFour).toBe(true);
    expect(decideMasteryUpdate(4, false)).toEqual({ counts: false });
  });

  it('a frozen decision carries no correctDelta — the caller writes nothing', () => {
    const frozen = decideMasteryUpdate(9, true);
    expect(frozen.counts).toBe(false);
    if (!frozen.counts) {
      expect('correctDelta' in frozen).toBe(false);
    }
  });
});
