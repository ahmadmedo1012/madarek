/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/learning.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/curriculum-logic.test.ts`:
 * zod acceptance/rejection envelopes + the watch-progress completion rule
 * (decision D9) + the high-water clamp + snippet building + decimal
 * conversion + quality-alert thresholds + the research-paper state machine
 * (gradeable / scannable / publishable claim sets — audit 15-b P1-3 —
 * plus the deterministic scan values and the upload dedupe lookup, 15-b
 * P2-5). Integration coverage (auth gate, the watch transaction with its
 * row lock, attendance upserts, ownership guards, the conditional
 * updateMany claims themselves) needs a DB harness the project does not
 * have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  ATTENDANCE_ALERT_MIN_RECORDS,
  GRADEABLE_PAPER_STATUSES,
  PUBLISHABLE_PAPER_STATUSES,
  RESEARCH_DEDUPE_WINDOW_MS,
  SCANNABLE_PAPER_STATUSES,
  attendanceAlertSeverity,
  buildSnippet,
  clampWatchedSec,
  decToNum,
  gradePaperSchema,
  isPaperGradeable,
  isPaperPublishable,
  isPaperScannable,
  recentDuplicatePaperWhere,
  scanResultsFor,
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

describe('isPaperScannable (scan-step claim set — 15-b P1-3)', () => {
  it('claims exactly UPLOADED and the CHECKS_* states (re-scan stays allowed)', () => {
    expect([...SCANNABLE_PAPER_STATUSES]).toEqual(['UPLOADED', 'CHECKS_PASSED', 'CHECKS_FAILED']);
    expect(isPaperScannable('UPLOADED')).toBe(true);
    expect(isPaperScannable('CHECKS_PASSED')).toBe(true);
    expect(isPaperScannable('CHECKS_FAILED')).toBe(true);
  });

  it('never claims GRADED or PUBLISHED — a scan cannot revert them to CHECKS_*', () => {
    expect(isPaperScannable('GRADED')).toBe(false);
    expect(isPaperScannable('PUBLISHED')).toBe(false);
  });

  it('excludes the never-written SCANNING value (a mid-flight paper must not re-scan)', () => {
    // Verified by rg: no code path ever writes SCANNING — excluding it is
    // behaviorally identical to the old "not GRADED/PUBLISHED" check.
    expect(isPaperScannable('SCANNING')).toBe(false);
  });
});

describe('isPaperPublishable (publish-step claim set — 15-b P1-3)', () => {
  it('claims exactly GRADED', () => {
    expect([...PUBLISHABLE_PAPER_STATUSES]).toEqual(['GRADED']);
    expect(isPaperPublishable('GRADED')).toBe(true);
  });

  it('rejects every other state — publishing is one-way, PUBLISHED is terminal', () => {
    for (const s of ['UPLOADED', 'SCANNING', 'CHECKS_PASSED', 'CHECKS_FAILED', 'PUBLISHED']) {
      expect(isPaperPublishable(s)).toBe(false);
    }
  });
});

describe('research pipeline step × status acceptance matrix (terminal-state regression pins)', () => {
  // The single table the conditional updateMany claims enforce. The 15-b
  // P1-3 regressions are impossible by construction: a scan finishing
  // after a grade/publish can never match GRADED/PUBLISHED (no
  // PUBLISHED → CHECKS_* revert), a re-grade can never match PUBLISHED
  // (no un-publish), a re-publish can never match PUBLISHED (publishedAt
  // is immutable once set).
  const ALL = ['UPLOADED', 'SCANNING', 'CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED', 'PUBLISHED'] as const;

  it('pins which steps accept which status — PUBLISHED is accepted by none', () => {
    for (const s of ALL) {
      expect(isPaperScannable(s)).toBe(s === 'UPLOADED' || s === 'CHECKS_PASSED' || s === 'CHECKS_FAILED');
      expect(isPaperGradeable(s)).toBe(s === 'CHECKS_PASSED' || s === 'CHECKS_FAILED' || s === 'GRADED');
      expect(isPaperPublishable(s)).toBe(s === 'GRADED');
    }
  });

  it('no step dead-ends the pipeline — CHECKS_* and GRADED stay gradeable, GRADED publishable', () => {
    expect(isPaperGradeable('CHECKS_PASSED')).toBe(true);
    expect(isPaperGradeable('CHECKS_FAILED')).toBe(true);
    expect(isPaperGradeable('GRADED')).toBe(true); // re-grade before publish
    expect(isPaperPublishable('GRADED')).toBe(true);
  });
});

describe('scanResultsFor (deterministic simulated scan values)', () => {
  it('is deterministic for the same paper id', () => {
    expect(scanResultsFor('cku5c2x9p0000abcd')).toEqual(scanResultsFor('cku5c2x9p0000abcd'));
  });

  it('pins the hash-derived values for concrete ids (seed = charCodeAt(0) + charCodeAt(2))', () => {
    expect(scanResultsFor('cku5c2x9p0000abcd')).toEqual({ plagiarismPct: 3, aiContentPct: 4, passed: true });
    expect(scanResultsFor('cm3xq7z2w0001paper')).toEqual({ plagiarismPct: 9, aiContentPct: 4, passed: true });
    // plagiarism 15 fails the < 15 rule → not passed.
    expect(scanResultsFor('cz9a1b8d0002univ')).toEqual({ plagiarismPct: 15, aiContentPct: 4, passed: false });
  });

  it('keeps plagiarism within 3–20 and AI content within 4–25, at most one decimal', () => {
    for (let i = 0; i < 300; i++) {
      // Vary the chars at index 0 and 2 — the only positions the hash reads.
      const id = `${String.fromCharCode(33 + (i % 90))}x${String.fromCharCode(33 + ((i * 37) % 90))}cuid-tail-${i}`;
      const r = scanResultsFor(id);
      expect(r.plagiarismPct).toBeGreaterThanOrEqual(3);
      expect(r.plagiarismPct).toBeLessThanOrEqual(20);
      expect(r.aiContentPct).toBeGreaterThanOrEqual(4);
      expect(r.aiContentPct).toBeLessThanOrEqual(25);
      expect(r.plagiarismPct).toBe(Math.round(r.plagiarismPct * 10) / 10);
      expect(r.aiContentPct).toBe(Math.round(r.aiContentPct * 10) / 10);
    }
  });

  it('passed is exactly plagiarism < 15 AND aiContent < 25', () => {
    for (let i = 0; i < 300; i++) {
      const id = `${String.fromCharCode(33 + (i % 90))}x${String.fromCharCode(33 + ((i * 37) % 90))}cuid-${i}`;
      const r = scanResultsFor(id);
      expect(r.passed).toBe(r.plagiarismPct < 15 && r.aiContentPct < 25);
    }
  });
});

describe('recentDuplicatePaperWhere (upload double-submit dedupe — 15-b P2-5)', () => {
  it('matches the identical (student, title, fileUrl) triple inside the window', () => {
    const now = new Date('2026-03-01T12:00:00Z');
    expect(recentDuplicatePaperWhere('stu1', 'بحث مشترك', '/api/v1/files/papers/a.pdf', now)).toEqual({
      studentId: 'stu1',
      title: 'بحث مشترك',
      fileUrl: '/api/v1/files/papers/a.pdf',
      uploadedAt: { gte: new Date('2026-03-01T11:55:00.000Z') },
    });
  });

  it('maps a missing file to null so Prisma matches file-less rows (IS NULL) — never undefined', () => {
    // An undefined fileUrl would silently drop the filter and dedupe the
    // student's entire recent upload history.
    const where = recentDuplicatePaperWhere('stu1', 'title', null, new Date('2026-03-01T12:00:00Z'));
    expect(where.fileUrl).toBeNull();
    expect(where.fileUrl).not.toBeUndefined();
  });

  it('pins the 5-minute window', () => {
    expect(RESEARCH_DEDUPE_WINDOW_MS).toBe(5 * 60 * 1000);
    const now = new Date('2026-03-01T12:00:00Z');
    const where = recentDuplicatePaperWhere('s', 't', null, now);
    expect((where.uploadedAt as { gte: Date }).gte).toEqual(new Date(now.getTime() - RESEARCH_DEDUPE_WINDOW_MS));
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
