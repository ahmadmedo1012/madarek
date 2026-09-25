/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/learning.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/curriculum-logic.test.ts`:
 * zod acceptance/rejection envelopes + the watch-progress completion rule
 * (decision D9) + the high-water clamp + snippet building + decimal
 * conversion + quality-alert thresholds + the research-paper gradeable
 * state machine. Integration coverage (auth gate, the watch transaction
 * with its row lock, attendance upserts, ownership guards) needs a DB
 * harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_ALERT_MIN_RECORDS,
  GRADEABLE_PAPER_STATUSES,
  attendanceAlertSeverity,
  buildSnippet,
  clampWatchedSec,
  decToNum,
  gradePaperSchema,
  isPaperGradeable,
  stableSeed,
  watchProgressCompletes,
  watchSchema,
} from '../../src/http/routes/learning.routes';

describe('watchSchema', () => {
  it('accepts a well-formed progress tick', () => {
    expect(watchSchema.safeParse({ watchedSec: 120, totalSec: 600, completed: true }).success).toBe(true);
  });

  it('accepts progress without the completed flag', () => {
    expect(watchSchema.safeParse({ watchedSec: 120, totalSec: 600 }).success).toBe(true);
  });

  it('rejects negative or fractional seconds', () => {
    expect(watchSchema.safeParse({ watchedSec: -1, totalSec: 600 }).success).toBe(false);
    expect(watchSchema.safeParse({ watchedSec: 1.5, totalSec: 600 }).success).toBe(false);
    expect(watchSchema.safeParse({ watchedSec: 10, totalSec: 0.5 }).success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(watchSchema.safeParse({ watchedSec: 1, totalSec: 2, isAdmin: true }).success).toBe(false);
  });
});

describe('watchProgressCompletes (decision D9 — server decides completion)', () => {
  it('accepts exactly 90% of the effective length', () => {
    expect(watchProgressCompletes(900, 1000, 1000)).toBe(true);
  });

  it('rejects just under 90%', () => {
    expect(watchProgressCompletes(899, 1000, 1000)).toBe(false);
  });

  it('handles non-round boundaries without float drift', () => {
    // 90% of 599 is 539.1 — 539 must fail, 540 must pass.
    expect(watchProgressCompletes(539, 599, 599)).toBe(false);
    expect(watchProgressCompletes(540, 599, 599)).toBe(true);
  });

  it('rejects a zero-duration lecture (the client cannot claim completion)', () => {
    expect(watchProgressCompletes(600, 600, 0)).toBe(false);
  });

  it('rejects a zero totalSec report', () => {
    expect(watchProgressCompletes(600, 0, 600)).toBe(false);
  });

  it('uses min(totalSec, durationSec) as the effective length', () => {
    // Client under-reports the length: 90% of 800, not of 1000.
    expect(watchProgressCompletes(720, 800, 1000)).toBe(true);
    expect(watchProgressCompletes(719, 800, 1000)).toBe(false);
    // Client over-reports: the lecture's real duration caps it.
    expect(watchProgressCompletes(900, 1200, 1000)).toBe(true);
    expect(watchProgressCompletes(899, 1200, 1000)).toBe(false);
  });

  it('never completes on zero watched seconds (tiny-video fraud)', () => {
    expect(watchProgressCompletes(0, 1, 1)).toBe(false);
    expect(watchProgressCompletes(0, 100, 100)).toBe(false);
    // Watching the whole (tiny) video does complete it.
    expect(watchProgressCompletes(1, 1, 1)).toBe(true);
  });
});

describe('clampWatchedSec (high-water mark)', () => {
  it('keeps the higher of prior vs incoming progress', () => {
    expect(clampWatchedSec(500, 60, 600)).toBe(500);
    expect(clampWatchedSec(50, 100, 600)).toBe(100);
  });

  it('treats a missing prior as zero', () => {
    expect(clampWatchedSec(undefined, 100, 600)).toBe(100);
    expect(clampWatchedSec(undefined, 0, 600)).toBe(0);
  });

  it('bounds a single tick by the reported total length', () => {
    expect(clampWatchedSec(0, 700, 600)).toBe(600);
  });

  it('keeps the high-water mark even when the new total is smaller', () => {
    expect(clampWatchedSec(500, 100, 400)).toBe(500);
  });

  it('does not bound against an unknown total (totalSec 0)', () => {
    expect(clampWatchedSec(undefined, 300, 0)).toBe(300);
  });
});

describe('buildSnippet', () => {
  it('returns null when the term is not present', () => {
    expect(buildSnippet('لا يحتوي المصطلح', 'كلمة')).toBeNull();
  });

  it('wraps a mid-text hit with ellipses on both sides', () => {
    const text = `${'x'.repeat(200)}needle${'y'.repeat(200)}`;
    const s = buildSnippet(text, 'needle')!;
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s).toContain('<mark>needle</mark>');
  });

  it('omits the leading ellipsis when the hit is at the start', () => {
    const s = buildSnippet('needle at the very start of the text', 'needle')!;
    expect(s.startsWith('…')).toBe(false);
  });

  it('matches case-insensitively and keeps the original casing', () => {
    const s = buildSnippet('The Needle Here', 'needle')!;
    expect(s).toContain('<mark>Needle</mark>');
  });

  it('escapes regex metacharacters in the query', () => {
    // "a.b" must NOT match "axb" — the dot is literal.
    expect(buildSnippet('axb something', 'a.b')).toBeNull();
    const s = buildSnippet('value: a.b found here', 'a.b')!;
    expect(s).toContain('<mark>a.b</mark>');
  });

  it('highlights every occurrence inside the slice', () => {
    const s = buildSnippet('cat dog cat dog cat', 'cat')!;
    expect(s.match(/<mark>cat<\/mark>/g)?.length).toBe(3);
  });
});

describe('decToNum', () => {
  it('passes primitives and null/undefined through', () => {
    expect(decToNum(5)).toBe(5);
    expect(decToNum('x')).toBe('x');
    expect(decToNum(null)).toBeNull();
    expect(decToNum(undefined)).toBeUndefined();
  });

  it('passes Dates through untouched', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(decToNum(d)).toBe(d);
  });

  it('converts Decimal-shaped objects via toNumber', () => {
    expect(decToNum({ toNumber: () => 12.5 })).toBe(12.5);
  });

  it('maps arrays and traverses nested objects', () => {
    expect(decToNum([1, { toNumber: () => 3 }])).toEqual([1, 3]);
    expect(decToNum({ a: { toNumber: () => 1 }, b: 'keep' })).toEqual({ a: 1, b: 'keep' });
  });
});

describe('attendanceAlertSeverity', () => {
  it('stays silent below the minimum record count', () => {
    expect(attendanceAlertSeverity(1, ATTENDANCE_ALERT_MIN_RECORDS - 1)).toBeNull();
    expect(attendanceAlertSeverity(1, 0)).toBeNull();
  });

  it('flags critical at 40% absence or more', () => {
    expect(attendanceAlertSeverity(0.4, 10)).toBe('critical');
    expect(attendanceAlertSeverity(0.9, 100)).toBe('critical');
  });

  it('flags warning between 25% and 40%', () => {
    expect(attendanceAlertSeverity(0.25, 10)).toBe('warning');
    expect(attendanceAlertSeverity(0.39, 100)).toBe('warning');
  });

  it('stays silent below 25%', () => {
    expect(attendanceAlertSeverity(0.24, 100)).toBeNull();
    expect(attendanceAlertSeverity(0, 100)).toBeNull();
  });
});

describe('isPaperGradeable (research pipeline precondition)', () => {
  it('allows exactly the post-scan states (incl. re-grades)', () => {
    expect(GRADEABLE_PAPER_STATUSES).toEqual(['CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED']);
    for (const s of GRADEABLE_PAPER_STATUSES) {
      expect(isPaperGradeable(s)).toBe(true);
    }
  });

  it('blocks pre-scan and terminal states', () => {
    expect(isPaperGradeable('UPLOADED')).toBe(false);
    expect(isPaperGradeable('SCANNING')).toBe(false);
    expect(isPaperGradeable('PUBLISHED')).toBe(false);
  });
});

describe('gradePaperSchema', () => {
  it('accepts grades on the 0–20 scale with optional feedback', () => {
    expect(gradePaperSchema.safeParse({ grade: 18.5, feedback: 'عمل جيد' }).success).toBe(true);
    expect(gradePaperSchema.safeParse({ grade: 0 }).success).toBe(true);
    expect(gradePaperSchema.safeParse({ grade: 20 }).success).toBe(true);
  });

  it('rejects out-of-scale grades and unknown keys', () => {
    expect(gradePaperSchema.safeParse({ grade: 20.1 }).success).toBe(false);
    expect(gradePaperSchema.safeParse({ grade: -1 }).success).toBe(false);
    expect(gradePaperSchema.safeParse({ grade: 10, reviewerId: 'x' }).success).toBe(false);
  });
});

describe('stableSeed (estimated-metric determinism)', () => {
  it('is deterministic for the same id', () => {
    expect(stableSeed('cku5c2x9p0000abcd')).toBe(stableSeed('cku5c2x9p0000abcd'));
  });

  it('spreads across different ids', () => {
    const seeds = new Set(Array.from({ length: 50 }, (_, i) => stableSeed(`teacher-${i}`)));
    expect(seeds.size).toBeGreaterThan(40);
  });

  it('returns a non-negative integer', () => {
    for (const id of ['a', 'abc', 'z9f2k1']) {
      const s = stableSeed(id);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
    }
  });

  it('spreads across the estimated-metric ranges used by /quality/professors', () => {
    // 3.5 + (seed % 14) / 10 must stay within 3.5 – 4.8 and vary;
    // 2 + (seed % 23) must stay within 2 – 24 and vary.
    const satisfaction = new Set<number>();
    const responseHours = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const seed = stableSeed(`teacher-${i}`);
      const sat = 3.5 + (seed % 14) / 10;
      const hrs = 2 + (seed % 23);
      expect(sat).toBeGreaterThanOrEqual(3.5);
      expect(sat).toBeLessThanOrEqual(4.8);
      expect(hrs).toBeGreaterThanOrEqual(2);
      expect(hrs).toBeLessThanOrEqual(24);
      satisfaction.add(sat);
      responseHours.add(hrs);
    }
    expect(satisfaction.size).toBeGreaterThan(5);
    expect(responseHours.size).toBeGreaterThan(10);
  });
});
