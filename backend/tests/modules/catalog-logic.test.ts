/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/catalog.routes.ts` (audits 15-b P2-3, 15-i TOP-8).
 *
 * Covers the /admin/reports aggregation folds extracted for DB-free
 * testing — the OWNER/ADMIN headline metrics already survived two
 * honesty bugs (per-offering undercount, mislabeled metric) so the
 * bucket boundaries and fold/sort/cap semantics are pinned exactly —
 * plus the catalog write-path body schemas (15-i §5 item 9).
 *
 * DB-free: everything here is pure. The loan claim/dedupe transaction,
 * the pagination wiring and the guarded inventory writes need a DB
 * harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  borrowBookSchema,
  buildPaperTrend,
  createPostSchema,
  reactSchema,
  topCoursesByEnrollments,
} from '../../src/http/routes/catalog.routes';
import type { PaperTrendInput, TopCourseOfferingInput } from '../../src/http/routes/catalog.routes';

// ── buildPaperTrend ────────────────────────────────────────────────

describe('buildPaperTrend (admin reports — paper publishing trend)', () => {
  // Deterministic calendar: "now" lives in July 2026, so the 6 buckets
  // span February → July 2026, oldest first.
  const monthStart = (n: number) => new Date(2026, 6 - n, 1);
  const trend = (papers: PaperTrendInput[]) => buildPaperTrend(papers, monthStart);

  it('returns 6 empty buckets for empty input', () => {
    const buckets = trend([]);
    expect(buckets).toHaveLength(6);
    expect(buckets.every((b) => b.submitted === 0 && b.graded === 0 && b.published === 0)).toBe(true);
  });

  it('labels every bucket with a non-empty short month name, distinct across the window', () => {
    const labels = trend([]).map((b) => b.month);
    expect(labels.every((l) => l.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(6);
  });

  it('counts a paper timestamped exactly at a bucket start inside that bucket', () => {
    // Feb 1, 2026 00:00 — the first instant of the oldest bucket.
    const buckets = trend([{ uploadedAt: new Date(2026, 1, 1), gradedAt: null, publishedAt: null }]);
    expect(buckets[0]!.submitted).toBe(1);
  });

  it('treats a bucket end as the next bucket start (half-open [start, end))', () => {
    // Mar 1 is the END of the Feb bucket and the START of the Mar bucket.
    const buckets = trend([{ uploadedAt: new Date(2026, 2, 1), gradedAt: null, publishedAt: null }]);
    expect(buckets[0]!.submitted).toBe(0);
    expect(buckets[1]!.submitted).toBe(1);
  });

  it('sums multiple papers landing in the same bucket', () => {
    const buckets = trend([
      { uploadedAt: new Date(2026, 1, 5), gradedAt: null, publishedAt: null },
      { uploadedAt: new Date(2026, 1, 20), gradedAt: null, publishedAt: null },
    ]);
    expect(buckets[0]!.submitted).toBe(2);
  });

  it('never counts null gradedAt/publishedAt rows in those dimensions', () => {
    const buckets = trend([{ uploadedAt: new Date(2026, 3, 15), gradedAt: null, publishedAt: null }]);
    expect(buckets[2]!.submitted).toBe(1);
    expect(buckets[2]!.graded).toBe(0);
    expect(buckets[2]!.published).toBe(0);
  });

  it('buckets the three timestamps of one paper independently', () => {
    const buckets = trend([
      {
        uploadedAt: new Date(2026, 1, 10),
        gradedAt: new Date(2026, 2, 10),
        publishedAt: new Date(2026, 3, 10),
      },
    ]);
    expect(buckets[0]!.submitted).toBe(1);
    expect(buckets[1]!.graded).toBe(1);
    expect(buckets[2]!.published).toBe(1);
    // …and each dimension counts only its own event.
    expect(buckets[0]!.graded).toBe(0);
    expect(buckets[1]!.published).toBe(0);
  });

  it('drops rows outside the whole window (they land in no bucket)', () => {
    const buckets = trend([
      { uploadedAt: new Date(2026, 0, 15), gradedAt: null, publishedAt: null }, // January — before the window
      { uploadedAt: new Date(2026, 7, 15), gradedAt: null, publishedAt: null }, // August — after the newest bucket
    ]);
    expect(buckets.every((b) => b.submitted === 0)).toBe(true);
  });

  it('honours a custom bucket count', () => {
    expect(buildPaperTrend([], monthStart, 3)).toHaveLength(3);
    expect(buildPaperTrend([], monthStart, 3)[2]!.month).toBe(
      new Date(2026, 6, 1).toLocaleDateString('ar-LY', { month: 'short' }),
    );
  });
});

// ── topCoursesByEnrollments ────────────────────────────────────────

describe('topCoursesByEnrollments (admin reports — top courses fold)', () => {
  const offering = (
    courseId: string,
    code: string,
    name: string,
    enrollments: number,
    lectures = 0,
  ): TopCourseOfferingInput => ({
    courseId,
    course: { code, name },
    _count: { enrollments, lectures },
  });

  it('returns [] for empty input', () => {
    expect(topCoursesByEnrollments([])).toEqual([]);
  });

  it('folds every offering of a course into one row (sums enrollments and lectures)', () => {
    const rows = topCoursesByEnrollments([
      offering('c1', 'CS101', 'مقدمة في الحاسوب', 10, 4),
      offering('c1', 'CS101', 'مقدمة في الحاسوب', 5, 2),
    ]);
    expect(rows).toEqual([
      { code: 'CS101', name: 'مقدمة في الحاسوب', enrollments: 15, lectures: 6 },
    ]);
  });

  it('keeps the first seen code/name when a courseId repeats with drifted labels', () => {
    const rows = topCoursesByEnrollments([
      offering('c1', 'CS101', 'الأول', 1),
      offering('c1', 'CS101-B', 'الثاني', 2),
    ]);
    expect(rows).toEqual([{ code: 'CS101', name: 'الأول', enrollments: 3, lectures: 0 }]);
  });

  it('ranks by total enrollments (descending)', () => {
    const rows = topCoursesByEnrollments([
      offering('a', 'AA100', 'أ', 5),
      offering('b', 'BB200', 'ب', 30),
      offering('c', 'CC300', 'ج', 10),
    ]);
    expect(rows.map((r) => r.code)).toEqual(['BB200', 'CC300', 'AA100']);
  });

  it('breaks enrollment ties by course code (stable order)', () => {
    const rows = topCoursesByEnrollments([
      offering('c', 'CC300', 'ج', 7),
      offering('a', 'AA100', 'أ', 7),
      offering('b', 'BB200', 'ب', 7),
    ]);
    expect(rows.map((r) => r.code)).toEqual(['AA100', 'BB200', 'CC300']);
  });

  it('caps the list at 8 courses by default (weakest courses are cut)', () => {
    const rows = topCoursesByEnrollments(
      Array.from({ length: 10 }, (_, i) => offering(`c${i}`, `C${String(i).padStart(3, '0')}`, `مقرر ${i}`, 10 - i)),
    );
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.code)).toEqual([
      'C000', 'C001', 'C002', 'C003', 'C004', 'C005', 'C006', 'C007',
    ]);
  });

  it('accepts a custom cap', () => {
    const rows = topCoursesByEnrollments(
      Array.from({ length: 5 }, (_, i) => offering(`c${i}`, `C${i}`, `مقرر ${i}`, i)),
      3,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.enrollments)).toEqual([4, 3, 2]);
  });
});

// ── createPostSchema ───────────────────────────────────────────────

describe('createPostSchema', () => {
  it('accepts a minimal post and defaults hashtags to []', () => {
    const parsed = createPostSchema.safeParse({ body: 'منشور تجريبي' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.hashtags).toEqual([]);
  });

  it('accepts up to 10 hashtags of up to 40 chars each', () => {
    expect(
      createPostSchema.safeParse({ body: 'x', hashtags: Array.from({ length: 10 }, () => 'ت'.repeat(40)) }).success,
    ).toBe(true);
  });

  it('rejects 11 hashtags', () => {
    expect(
      createPostSchema.safeParse({ body: 'x', hashtags: Array.from({ length: 11 }, () => 'وسم') }).success,
    ).toBe(false);
  });

  it('rejects a 41-char hashtag and an empty one', () => {
    expect(createPostSchema.safeParse({ body: 'x', hashtags: ['ت'.repeat(41)] }).success).toBe(false);
    expect(createPostSchema.safeParse({ body: 'x', hashtags: [''] }).success).toBe(false);
  });

  it('accepts a valid imageUrl and rejects a non-url one', () => {
    expect(createPostSchema.safeParse({ body: 'x', imageUrl: 'https://cdn.example.com/a.png' }).success).toBe(true);
    expect(createPostSchema.safeParse({ body: 'x', imageUrl: 'ليس-رابطاً' }).success).toBe(false);
  });

  it('bounds the body between 1 and 2000 chars', () => {
    expect(createPostSchema.safeParse({ body: '' }).success).toBe(false);
    expect(createPostSchema.safeParse({ body: 'a'.repeat(2000) }).success).toBe(true);
    expect(createPostSchema.safeParse({ body: 'a'.repeat(2001) }).success).toBe(false);
  });

  it('rejects extra fields (strict mode — authorId is server-set)', () => {
    expect(createPostSchema.safeParse({ body: 'x', authorId: 'spoof' }).success).toBe(false);
  });
});

// ── reactSchema ────────────────────────────────────────────────────

describe('reactSchema', () => {
  it('accepts exactly like and save', () => {
    expect(reactSchema.safeParse({ kind: 'like' }).success).toBe(true);
    expect(reactSchema.safeParse({ kind: 'save' }).success).toBe(true);
    expect(reactSchema.safeParse({ kind: 'upvote' }).success).toBe(false);
  });

  it('requires kind and rejects extras (strict mode)', () => {
    expect(reactSchema.safeParse({}).success).toBe(false);
    expect(reactSchema.safeParse({ kind: 'like', postId: 'spoof' }).success).toBe(false);
  });
});

// ── borrowBookSchema ───────────────────────────────────────────────

describe('borrowBookSchema', () => {
  it('accepts a cuid bookId', () => {
    expect(borrowBookSchema.safeParse({ bookId: `c${'x'.repeat(24)}` }).success).toBe(true);
  });

  it('rejects non-cuid ids, a missing id, and extra fields', () => {
    expect(borrowBookSchema.safeParse({ bookId: 'not-a-cuid' }).success).toBe(false);
    expect(borrowBookSchema.safeParse({}).success).toBe(false);
    expect(borrowBookSchema.safeParse({ bookId: `c${'x'.repeat(24)}`, userId: 'spoof' }).success).toBe(false);
  });
});
