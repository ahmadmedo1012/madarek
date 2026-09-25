/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/curriculum.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/submissions-logic.test.ts`:
 * zod acceptance/rejection envelopes + ordinal/window/option invariant
 * logic. Integration coverage (auth role gate, assertOwnsOffering,
 * transactions, FK-cascade lecture delete) needs a DB harness the
 * project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_MEDIA_URL_PATTERN,
  chapterWindowValid,
  createChapterBodySchema,
  createCheckpointBodySchema,
  createLectureBodySchema,
  nextOrdinal,
  resolveCorrectIndex,
  updateChapterBodySchema,
  updateCheckpointBodySchema,
  updateLectureBodySchema,
  withinLectureDuration,
} from '../../src/http/routes/curriculum.routes';

const VALID_LECTURE = {
  title: 'المحاضرة الأولى — مقدمة',
  videoUrl: 'https://cdn.example.com/lecture-1.mp4',
};

const VALID_CHAPTER = { title: 'مقدمة', startSec: 0, endSec: 300 };

const VALID_CHECKPOINT = {
  triggerSec: 120,
  question: 'ما هو المفهوم الصحيح؟',
  options: ['أ', 'ب'],
  correctIndex: 0,
};

describe('createLectureBodySchema', () => {
  it('accepts a minimal create (title + videoUrl only)', () => {
    expect(createLectureBodySchema.safeParse(VALID_LECTURE).success).toBe(true);
  });

  it('accepts the full field set', () => {
    expect(
      createLectureBodySchema.safeParse({
        ...VALID_LECTURE,
        description: 'وصف المحاضرة',
        durationSec: 5400,
        ordinal: 7,
      }).success,
    ).toBe(true);
  });

  it('accepts a video served by our own files API', () => {
    expect(
      createLectureBodySchema.safeParse({ ...VALID_LECTURE, videoUrl: '/api/v1/files/papers/abc.mp4' }).success,
    ).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(createLectureBodySchema.safeParse({}).success).toBe(false);
  });

  it('rejects a missing/empty title and over-length titles', () => {
    expect(createLectureBodySchema.safeParse({ videoUrl: 'https://x.example/a.mp4' }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, title: '' }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, title: 'a'.repeat(201) }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, title: 'a'.repeat(200) }).success).toBe(true);
  });

  it('rejects description over 4000 chars', () => {
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, description: 'a'.repeat(4001) }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, description: 'a'.repeat(4000) }).success).toBe(true);
  });

  it('rejects http:// and arbitrary-path videoUrls (https or internal only)', () => {
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, videoUrl: 'http://cdn.example.com/a.mp4' }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, videoUrl: '/uploads/a.mp4' }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, videoUrl: 'ftp://x/a.mp4' }).success).toBe(false);
  });

  it('rejects durationSec out of bounds or non-integer', () => {
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, durationSec: 0 }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, durationSec: 86_401 }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, durationSec: 1.5 }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, durationSec: 86_400 }).success).toBe(true);
  });

  it('rejects ordinal out of bounds', () => {
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, ordinal: -1 }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, ordinal: 501 }).success).toBe(false);
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, ordinal: 500 }).success).toBe(true);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(createLectureBodySchema.safeParse({ ...VALID_LECTURE, isPublished: true }).success).toBe(false);
    expect(createLectureBodySchema.safeParse(null).success).toBe(false);
  });
});

describe('updateLectureBodySchema', () => {
  it('accepts partial updates and an empty no-op patch', () => {
    expect(updateLectureBodySchema.safeParse({ title: 'عنوان جديد' }).success).toBe(true);
    expect(updateLectureBodySchema.safeParse({}).success).toBe(true);
  });

  it('applies the same field validation as create', () => {
    expect(updateLectureBodySchema.safeParse({ videoUrl: 'http://x.example/a.mp4' }).success).toBe(false);
    expect(updateLectureBodySchema.safeParse({ durationSec: 0 }).success).toBe(false);
    expect(updateLectureBodySchema.safeParse({ title: 42 }).success).toBe(false);
    expect(updateLectureBodySchema.safeParse({ bogus: 'x' }).success).toBe(false);
  });
});

describe('CURRICULUM_MEDIA_URL_PATTERN', () => {
  it('matches the two sanctioned prefixes', () => {
    expect(CURRICULUM_MEDIA_URL_PATTERN.test('https://example.com/a.mp4')).toBe(true);
    expect(CURRICULUM_MEDIA_URL_PATTERN.test('/api/v1/files/papers/a.mp4')).toBe(true);
  });

  it('rejects http, other schemes, and traversal-ish paths', () => {
    expect(CURRICULUM_MEDIA_URL_PATTERN.test('http://example.com/a.mp4')).toBe(false);
    expect(CURRICULUM_MEDIA_URL_PATTERN.test('/api/v1/files/../a.mp4')).toBe(false);
    expect(CURRICULUM_MEDIA_URL_PATTERN.test('javascript:alert(1)')).toBe(false);
  });
});

describe('nextOrdinal', () => {
  it('appends after the current max', () => {
    expect(nextOrdinal(3)).toBe(4);
    expect(nextOrdinal(0)).toBe(1);
  });

  it('starts at 1 for an empty set (seed convention)', () => {
    expect(nextOrdinal(null)).toBe(1);
  });
});

describe('withinLectureDuration', () => {
  it('bounds a timestamp by the lecture duration when known', () => {
    expect(withinLectureDuration(0, 600)).toBe(true);
    expect(withinLectureDuration(600, 600)).toBe(true);
    expect(withinLectureDuration(601, 600)).toBe(false);
  });

  it('skips the bound when duration is unknown (0 or negative)', () => {
    expect(withinLectureDuration(9_999, 0)).toBe(true);
    expect(withinLectureDuration(9_999, -1)).toBe(true);
  });
});

describe('createChapterBodySchema', () => {
  it('accepts a valid chapter', () => {
    expect(createChapterBodySchema.safeParse(VALID_CHAPTER).success).toBe(true);
    expect(
      createChapterBodySchema.safeParse({ ...VALID_CHAPTER, conceptId: 'ckConcept01' }).success,
    ).toBe(true);
  });

  it('rejects an empty body and a missing endSec (model requires it)', () => {
    expect(createChapterBodySchema.safeParse({}).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ title: 'مقدمة', startSec: 0 }).success).toBe(false);
  });

  it('rejects endSec <= startSec', () => {
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, startSec: 300, endSec: 300 }).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, startSec: 400, endSec: 300 }).success).toBe(false);
  });

  it('rejects negative, non-integer or oversized bounds', () => {
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, startSec: -1 }).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, startSec: 0.5 }).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, endSec: 86_401 }).success).toBe(false);
  });

  it('rejects over-length titles and extra fields (strict mode)', () => {
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, title: 'a'.repeat(201) }).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, bogus: 1 }).success).toBe(false);
  });
});

describe('chapterWindowValid', () => {
  const existing = { startSec: 100, endSec: 300 };

  it('keeps an already-coherent window valid with no patch', () => {
    expect(chapterWindowValid(existing, {})).toBe(true);
  });

  it('validates the MERGED window after a partial patch', () => {
    // startSec moves past the untouched endSec → invalid.
    expect(chapterWindowValid(existing, { startSec: 350 })).toBe(false);
    // endSec moves before the untouched startSec → invalid.
    expect(chapterWindowValid(existing, { endSec: 50 })).toBe(false);
    // coherent move of both bounds → valid.
    expect(chapterWindowValid(existing, { startSec: 400, endSec: 500 })).toBe(true);
    // widening only the end → valid.
    expect(chapterWindowValid(existing, { endSec: 900 })).toBe(true);
    // equal bounds are not a window.
    expect(chapterWindowValid(existing, { startSec: 300, endSec: 300 })).toBe(false);
  });
});

describe('updateChapterBodySchema', () => {
  it('accepts partial updates (cross-field window checked in the handler)', () => {
    expect(updateChapterBodySchema.safeParse({ title: 'فصل معدّل' }).success).toBe(true);
    expect(updateChapterBodySchema.safeParse({ startSec: 10 }).success).toBe(true);
    expect(updateChapterBodySchema.safeParse({}).success).toBe(true);
  });

  it('applies the same field validation as create', () => {
    expect(updateChapterBodySchema.safeParse({ startSec: -5 }).success).toBe(false);
    expect(updateChapterBodySchema.safeParse({ conceptId: '' }).success).toBe(false);
    expect(updateChapterBodySchema.safeParse({ bogus: 'x' }).success).toBe(false);
  });

  it('accepts conceptId: null to CLEAR the concept tag (P2-23)', () => {
    expect(updateChapterBodySchema.safeParse({ conceptId: null }).success).toBe(true);
    expect(updateChapterBodySchema.safeParse({ title: 'فصل', startSec: 0, endSec: 10, conceptId: null }).success).toBe(true);
  });

  it('still rejects empty/over-length conceptId strings (null or a real id only)', () => {
    expect(updateChapterBodySchema.safeParse({ conceptId: '' }).success).toBe(false);
    expect(updateChapterBodySchema.safeParse({ conceptId: 'a'.repeat(101) }).success).toBe(false);
    expect(updateChapterBodySchema.safeParse({ conceptId: 'ckConcept01' }).success).toBe(true);
  });

  it('keeps the create schema non-nullable (null means nothing at create)', () => {
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, conceptId: null }).success).toBe(false);
    expect(createChapterBodySchema.safeParse({ ...VALID_CHAPTER, conceptId: 'ckConcept01' }).success).toBe(true);
  });
});

describe('createCheckpointBodySchema', () => {
  it('accepts a valid checkpoint (2..6 options, index in range)', () => {
    expect(createCheckpointBodySchema.safeParse(VALID_CHECKPOINT).success).toBe(true);
    expect(
      createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ', 'ب', 'ج', 'د', 'هـ', 'و'], correctIndex: 5 }).success,
    ).toBe(true);
  });

  it('rejects option lists outside 2..6', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ'] }).success).toBe(false);
    expect(
      createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['1', '2', '3', '4', '5', '6', '7'] }).success,
    ).toBe(false);
  });

  it('rejects empty or over-length options', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ', ''] }).success).toBe(false);
    expect(
      createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ', 'b'.repeat(301)] }).success,
    ).toBe(false);
    expect(
      createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ', 'b'.repeat(300)] }).success,
    ).toBe(true);
  });

  it('trims options before min (D17-4): whitespace-only option rejected, padded option stored trimmed', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, options: ['أ', '   '] }).success).toBe(false);
    const parsed = createCheckpointBodySchema.parse({ ...VALID_CHECKPOINT, options: ['  خيار  ', 'ب'] });
    expect(parsed.options[0]).toBe('خيار');
  });

  it('rejects correctIndex outside the option list', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, correctIndex: 2 }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, correctIndex: -1 }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, correctIndex: 1 }).success).toBe(true);
  });

  it('rejects bad questions, triggerSec bounds and extra fields', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, question: '' }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, question: 'a'.repeat(1001) }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, triggerSec: 86_401 }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, triggerSec: -1 }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, chapterId: 'x' }).success).toBe(false);
  });
});

describe('updateCheckpointBodySchema', () => {
  it('accepts partial updates (index-vs-options checked in the handler)', () => {
    expect(updateCheckpointBodySchema.safeParse({ question: 'سؤال معدّل' }).success).toBe(true);
    expect(updateCheckpointBodySchema.safeParse({ triggerSec: 60 }).success).toBe(true);
    expect(updateCheckpointBodySchema.safeParse({}).success).toBe(true);
  });

  it('applies the same field validation as create', () => {
    expect(updateCheckpointBodySchema.safeParse({ options: ['أ'] }).success).toBe(false);
    expect(updateCheckpointBodySchema.safeParse({ correctIndex: -1 }).success).toBe(false);
    expect(updateCheckpointBodySchema.safeParse({ bogus: 'x' }).success).toBe(false);
  });

  it('accepts conceptId: null to CLEAR the concept tag (P2-23)', () => {
    expect(updateCheckpointBodySchema.safeParse({ conceptId: null }).success).toBe(true);
    expect(
      updateCheckpointBodySchema.safeParse({ question: 'سؤال', conceptId: null, correctIndex: 0 }).success,
    ).toBe(true);
    // Empty string is still rejected — null or a real id only.
    expect(updateCheckpointBodySchema.safeParse({ conceptId: '' }).success).toBe(false);
    expect(updateCheckpointBodySchema.safeParse({ conceptId: 'ckConcept01' }).success).toBe(true);
  });

  it('keeps the create schema non-nullable (null means nothing at create)', () => {
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, conceptId: null }).success).toBe(false);
    expect(createCheckpointBodySchema.safeParse({ ...VALID_CHECKPOINT, conceptId: 'ckConcept01' }).success).toBe(true);
  });
});

describe('resolveCorrectIndex', () => {
  const existing = { options: ['أ', 'ب', 'ج'], correctIndex: 2 };

  it('keeps the existing index when nothing relevant is patched', () => {
    expect(resolveCorrectIndex(existing, {})).toBe(2);
  });

  it('takes the patched index when provided', () => {
    expect(resolveCorrectIndex(existing, { correctIndex: 0 })).toBe(0);
  });

  it('re-validates the existing index against NEW options (shrink case)', () => {
    // Options shrink to 2 — the untouched index 2 now points outside.
    expect(resolveCorrectIndex(existing, { options: ['أ', 'ب'] })).toBeNull();
    // Still valid when the list stays long enough.
    expect(resolveCorrectIndex(existing, { options: ['أ', 'ب', 'ج', 'د'] })).toBe(2);
  });

  it('validates a patched index against patched options', () => {
    expect(resolveCorrectIndex(existing, { options: ['أ', 'ب'], correctIndex: 1 })).toBe(1);
    expect(resolveCorrectIndex(existing, { options: ['أ', 'ب'], correctIndex: 2 })).toBeNull();
  });

  it('validates a patched index against the existing options', () => {
    expect(resolveCorrectIndex(existing, { correctIndex: 3 })).toBeNull();
    expect(resolveCorrectIndex(existing, { correctIndex: 2 })).toBe(2);
  });

  it('returns null when existing options are corrupt (empty)', () => {
    expect(resolveCorrectIndex({ options: [], correctIndex: 0 }, {})).toBeNull();
  });
});
