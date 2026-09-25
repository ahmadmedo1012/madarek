/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/training.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/submissions-logic.test.ts`.
 * Covers:
 *   - quizAnswerMatches: the D8 exact-match quiz gate (audit 11-d P0-2,
 *     training half — the old bidirectional `includes` let a one-character
 *     answer farm points/badges/certificates/leaderboard rank)
 *   - levelFor: the points → level/tier math (audit: points logic)
 *   - completeLessonSchema: the complete-lesson body envelope
 *   - buildLeaderboardRows: leaderboard row building incl. the orphaned-
 *     ledger-row null guard (audit 11-d P2-10) and contiguous ranks
 *
 * The isPublished gates (audit P1-7) and the awarding transaction are
 * DB-coupled and need a DB harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  buildLeaderboardRows,
  completeLessonSchema,
  levelFor,
  quizAnswerMatches,
} from '../../src/http/routes/training.routes';

describe('quizAnswerMatches (D8 exact-match quiz gate)', () => {
  it('accepts an exact match', () => {
    expect(quizAnswerMatches('html', 'html')).toBe(true);
  });

  it('is case-insensitive in both directions', () => {
    expect(quizAnswerMatches('HTML', 'html')).toBe(true);
    expect(quizAnswerMatches('Html', 'hTML')).toBe(true);
  });

  it('ignores surrounding whitespace', () => {
    expect(quizAnswerMatches('  html  ', ' html ')).toBe(true);
  });

  it('collapses separator noise (commas, Arabic comma, dots, dashes, quotes, slashes)', () => {
    expect(quizAnswerMatches('html, css', 'html css')).toBe(true);
    expect(quizAnswerMatches('html ، css', 'html css')).toBe(true);
    expect(quizAnswerMatches('html.css', 'html css')).toBe(true);
    expect(quizAnswerMatches('machine-learning', 'machine learning')).toBe(true);
    expect(quizAnswerMatches('machine_learning', 'machine learning')).toBe(true);
    expect(quizAnswerMatches('"html css"', 'html css')).toBe(true);
    expect(quizAnswerMatches('html/css', 'html css')).toBe(true);
  });

  it('treats repeated separators as one', () => {
    expect(quizAnswerMatches('html    css', 'html css')).toBe(true);
    expect(quizAnswerMatches('html ,  . css', 'html css')).toBe(true);
  });

  it('BLOCKS the one-character farming hole (substring of the key)', () => {
    // P0-2 regression: the old `norm(expected).includes(norm(submitted))`
    // arm accepted any substring of the model answer.
    expect(quizAnswerMatches('h', 'html')).toBe(false);
    expect(quizAnswerMatches('t', 'html')).toBe(false);
    expect(quizAnswerMatches('m', 'html')).toBe(false);
  });

  it('blocks a single word of a multi-word key', () => {
    expect(quizAnswerMatches('html', 'html css')).toBe(false);
    expect(quizAnswerMatches('css', 'html css')).toBe(false);
  });

  it('blocks a superset of the key (substring matching is gone in BOTH directions)', () => {
    // The old `norm(submitted).includes(norm(expected))` arm accepted
    // verbose answers containing the key — D8 forbids substring matches.
    expect(quizAnswerMatches('html css javascript', 'html css')).toBe(false);
    expect(quizAnswerMatches('i think it is html', 'html')).toBe(false);
  });

  it('rejects unrelated or empty submissions', () => {
    expect(quizAnswerMatches('css', 'html')).toBe(false);
    expect(quizAnswerMatches('', 'html')).toBe(false);
    expect(quizAnswerMatches('   ', 'html')).toBe(false);
  });

  it('never passes against a blank/whitespace-only key', () => {
    expect(quizAnswerMatches('', '   ')).toBe(false);
    expect(quizAnswerMatches('anything', '  ')).toBe(false);
    expect(quizAnswerMatches(' , ', ',')).toBe(false);
  });

  it('matches Arabic answers exactly (separator-tolerant, but never partial)', () => {
    expect(quizAnswerMatches('التعلم الآلي', 'التعلم الآلي')).toBe(true);
    expect(quizAnswerMatches('التعلم الآلي،', 'التعلم الآلي')).toBe(true);
    expect(quizAnswerMatches(' التعلم الآلي ', 'التعلم الآلي')).toBe(true);
    expect(quizAnswerMatches('الآلي', 'التعلم الآلي')).toBe(false);
    expect(quizAnswerMatches('تعلم', 'التعلم')).toBe(false);
    expect(quizAnswerMatches('التعلم الآلي التطبيقي', 'التعلم الآلي')).toBe(false);
  });
});

describe('levelFor (points → level/tier math, 500 points per level)', () => {
  it('starts at level 1 BRONZE with zero points', () => {
    expect(levelFor(0)).toEqual({ level: 1, tier: 'BRONZE', toNext: 500, pctIntoLevel: 0 });
  });

  it('top of level 1 (499 points): 1 point to next, rounds pct to 100', () => {
    expect(levelFor(499)).toEqual({ level: 1, tier: 'BRONZE', toNext: 1, pctIntoLevel: 100 });
  });

  it('wraps into the next level at exact multiples of 500', () => {
    expect(levelFor(500)).toEqual({ level: 2, tier: 'BRONZE', toNext: 500, pctIntoLevel: 0 });
  });

  it('computes into-level progress and rounds the percentage', () => {
    expect(levelFor(1234)).toEqual({ level: 3, tier: 'SILVER', toNext: 266, pctIntoLevel: 47 });
  });

  it('maps level boundaries to tiers', () => {
    expect(levelFor(999).tier).toBe('BRONZE'); // level 2
    expect(levelFor(1000).tier).toBe('SILVER'); // level 3
    expect(levelFor(1999).tier).toBe('SILVER'); // level 4
    expect(levelFor(2000).tier).toBe('GOLD'); // level 5
    expect(levelFor(3499).tier).toBe('GOLD'); // level 7
    expect(levelFor(3500).tier).toBe('PLATINUM'); // level 8
    expect(levelFor(5000).level).toBe(11);
  });
});

describe('completeLessonSchema', () => {
  it('accepts an empty body (lesson without a quiz)', () => {
    expect(completeLessonSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a quiz answer', () => {
    expect(completeLessonSchema.safeParse({ quizAnswer: 'html' }).success).toBe(true);
  });

  it('accepts an empty-string answer (the handler maps it to the "answer first" 400, not a validation error)', () => {
    expect(completeLessonSchema.safeParse({ quizAnswer: '' }).success).toBe(true);
  });

  it('caps the answer at 500 chars', () => {
    expect(completeLessonSchema.safeParse({ quizAnswer: 'a'.repeat(500) }).success).toBe(true);
    expect(completeLessonSchema.safeParse({ quizAnswer: 'a'.repeat(501) }).success).toBe(false);
  });

  it('rejects non-string answers', () => {
    expect(completeLessonSchema.safeParse({ quizAnswer: 42 }).success).toBe(false);
    expect(completeLessonSchema.safeParse({ quizAnswer: null }).success).toBe(false);
    expect(completeLessonSchema.safeParse({ quizAnswer: ['html'] }).success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(completeLessonSchema.safeParse({ quizAnswer: 'x', force: true }).success).toBe(false);
  });

  it('rejects non-object bodies', () => {
    expect(completeLessonSchema.safeParse('html').success).toBe(false);
    expect(completeLessonSchema.safeParse(null).success).toBe(false);
  });
});

describe('buildLeaderboardRows (P2-10 orphan guard + contiguous ranks)', () => {
  const users = [
    { id: 'u1', firstName: 'سارة', lastName: 'الأهداب', avatarColor: '#B57438', avatarInitials: 'سأ' },
    { id: 'u2', firstName: 'Ali', lastName: 'Hassan', avatarColor: null, avatarInitials: null },
    { id: 'u3', firstName: 'Nora', lastName: 'Salem', avatarColor: '#3B5BDB', avatarInitials: 'نس' },
  ];

  it('returns [] for no entries', () => {
    expect(buildLeaderboardRows([], users)).toEqual([]);
  });

  it('preserves the given (points-desc) order and assigns contiguous ranks', () => {
    const rows = buildLeaderboardRows(
      [
        { userId: 'u1', totalPoints: 1250 },
        { userId: 'u2', totalPoints: 500 },
        { userId: 'u3', totalPoints: 120 },
      ],
      users,
    );
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows.map((r) => r.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(rows[0]).toMatchObject({ userId: 'u1', name: 'سارة الأهداب', points: 1250, avatarColor: '#B57438' });
    expect(rows[0]!.level.level).toBe(3); // 1250 → level 3 (SILVER)
    expect(rows[1]!.level.level).toBe(2); // 500 → level 2 (BRONZE)
    expect(rows[2]!.points).toBe(120);
  });

  it('computes the level for each row from its points', () => {
    const rows = buildLeaderboardRows(
      [
        { userId: 'u3', totalPoints: 2000 },
        { userId: 'u1', totalPoints: 1000 },
      ],
      users,
    );
    expect(rows[0]!.level.tier).toBe('GOLD'); // 2000 → level 5
    expect(rows[1]!.level.tier).toBe('SILVER'); // 1000 → level 3
  });

  it('treats a null points sum as 0 (never crashes)', () => {
    const rows = buildLeaderboardRows([{ userId: 'u2', totalPoints: null }], users);
    expect(rows[0]!.points).toBe(0);
    expect(rows[0]!.level).toEqual({ level: 1, tier: 'BRONZE', toNext: 500, pctIntoLevel: 0 });
  });

  it('skips entries whose user no longer resolves instead of crashing (orphaned ledger row)', () => {
    const rows = buildLeaderboardRows(
      [
        { userId: 'u1', totalPoints: 900 },
        { userId: 'ghost', totalPoints: 5000 },
        { userId: 'u2', totalPoints: 300 },
      ],
      users,
    );
    expect(rows.map((r) => r.userId)).toEqual(['u1', 'u2']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2]); // contiguous after the skip
    expect(rows.map((r) => r.name)).toEqual(['سارة الأهداب', 'Ali Hassan']);
  });

  it('returns [] when every entry is orphaned', () => {
    expect(
      buildLeaderboardRows(
        [
          { userId: 'gone1', totalPoints: 10 },
          { userId: 'gone2', totalPoints: 20 },
        ],
        users,
      ),
    ).toEqual([]);
  });
});
