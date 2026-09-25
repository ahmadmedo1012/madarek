/**
 * WS-F7 — curriculum authoring validation tests (pure logic).
 *
 * The zod schemas + time helpers in
 * src/components/curriculum/curriculumValidation.ts must mirror the
 * server contract (backend curriculum.routes.ts) so the teacher never
 * has to round-trip a 400 to discover the rules:
 *   - seconds parsing (mm:ss / h:mm:ss / plain seconds)
 *   - lecture videoUrl media pattern, duration & ordinal bounds
 *   - chapter window (end > start)
 *   - checkpoint options 2..6 and correctIndex bounds
 */
import { describe, expect, it } from 'vitest';
import {
  adjustCorrectIndexOnRemove,
  chapterFormSchema,
  checkpointFormOptions,
  checkpointFormSchema,
  CORRECT_INDEX_UNCHANGED,
  formatSec,
  lectureFormSchema,
  lectureFormToCreatePayload,
  lectureFormToPatchPayload,
  parseTimeToSec,
  withinDuration,
  MAX_CHECKPOINT_OPTIONS,
  MIN_CHECKPOINT_OPTIONS,
} from '../../src/components/curriculum/curriculumValidation';

/* ── Time helpers ─────────────────────────────────────────────── */

describe('formatSec — seconds → m:ss / h:mm:ss', () => {
  it('formats minutes:seconds under an hour', () => {
    expect(formatSec(0)).toBe('0:00');
    expect(formatSec(5)).toBe('0:05');
    expect(formatSec(615)).toBe('10:15');
    expect(formatSec(3300)).toBe('55:00');
  });
  it('switches to h:mm:ss at an hour', () => {
    expect(formatSec(3600)).toBe('1:00:00');
    expect(formatSec(3661)).toBe('1:01:01');
  });
  it('clamps negative input', () => {
    expect(formatSec(-30)).toBe('0:00');
  });
});

describe('parseTimeToSec — teacher input → whole seconds', () => {
  it('accepts plain seconds', () => {
    expect(parseTimeToSec('90')).toBe(90);
    expect(parseTimeToSec(' 750 ')).toBe(750);
    expect(parseTimeToSec('0')).toBe(0);
  });
  it('accepts m:ss and h:mm:ss', () => {
    expect(parseTimeToSec('1:30')).toBe(90);
    expect(parseTimeToSec('01:30')).toBe(90);
    expect(parseTimeToSec('1:02:03')).toBe(3723);
  });
  it('is lenient about parts ≥ 60 (1:99 = 159s, still a valid instant)', () => {
    expect(parseTimeToSec('1:99')).toBe(159);
  });
  it('rejects malformed input with null', () => {
    expect(parseTimeToSec('')).toBeNull();
    expect(parseTimeToSec('   ')).toBeNull();
    expect(parseTimeToSec('abc')).toBeNull();
    expect(parseTimeToSec('-5')).toBeNull();
    expect(parseTimeToSec('1:2:3:4')).toBeNull();
    expect(parseTimeToSec('m:ss')).toBeNull();
    expect(parseTimeToSec('1:m')).toBeNull();
  });
  it('round-trips through formatSec', () => {
    expect(parseTimeToSec(formatSec(7385))).toBe(7385);
  });
});

describe('withinDuration — mirror of the server guard', () => {
  it('treats durationSec ≤ 0 as unbounded', () => {
    expect(withinDuration(999_999, 0)).toBe(true);
    expect(withinDuration(60, -1)).toBe(true);
  });
  it('bounds against the real duration', () => {
    expect(withinDuration(300, 600)).toBe(true);
    expect(withinDuration(600, 600)).toBe(true);
    expect(withinDuration(601, 600)).toBe(false);
  });
});

/* ── Lecture form ─────────────────────────────────────────────── */

const VALID_LECTURE = {
  title: 'المحاضرة الأولى: مدخل إلى الشبكات',
  description: 'نظرة عامة على طبقات النموذج OSI',
  videoUrl: 'https://cdn.madarek.example/lec1.mp4',
  duration: '55:00',
  ordinal: '1',
};

describe('lectureFormSchema — mirrors the API rules', () => {
  it('accepts a complete valid draft', () => {
    expect(lectureFormSchema.safeParse(VALID_LECTURE).success).toBe(true);
  });
  it('accepts an internal papers path as the video URL', () => {
    const r = lectureFormSchema.safeParse({ ...VALID_LECTURE, videoUrl: '/api/v1/files/papers/lec1.mp4' });
    expect(r.success).toBe(true);
  });
  it('rejects http:// (only https or the internal papers path)', () => {
    const r = lectureFormSchema.safeParse({ ...VALID_LECTURE, videoUrl: 'http://cdn.example/lec1.mp4' });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.message).toContain('https');
  });
  it('requires a title within 200 chars', () => {
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, title: '' }).success).toBe(false);
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, title: 'x'.repeat(201) }).success).toBe(false);
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, title: 'x'.repeat(200) }).success).toBe(true);
  });
  it('allows an empty duration/ordinal (optional) but bounds them when set', () => {
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, duration: '', ordinal: '' }).success).toBe(true);
    // durationSec must be ≥ 1 second — "0" means unset on the model.
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, duration: '0' }).success).toBe(false);
    // > 24h rejected (MAX_MEDIA_SEC = 86_400).
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, duration: '24:00:01' }).success).toBe(false);
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, duration: '86400' }).success).toBe(true);
    // ordinal 0..500.
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, ordinal: '501' }).success).toBe(false);
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, ordinal: '-1' }).success).toBe(false);
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, ordinal: '500' }).success).toBe(true);
  });
  it('bounds the description at 4000 chars', () => {
    expect(lectureFormSchema.safeParse({ ...VALID_LECTURE, description: 'x'.repeat(4001) }).success).toBe(false);
  });
});

describe('lecture form → API payloads', () => {
  it('create payload carries parsed seconds and omits empty optionals', () => {
    const payload = lectureFormToCreatePayload({ ...VALID_LECTURE, duration: '', ordinal: '', description: '' });
    expect(payload).toEqual({
      title: VALID_LECTURE.title,
      description: undefined,
      videoUrl: VALID_LECTURE.videoUrl,
      durationSec: undefined,
      ordinal: undefined,
    });
    expect(lectureFormToCreatePayload(VALID_LECTURE).durationSec).toBe(3300);
    expect(lectureFormToCreatePayload(VALID_LECTURE).ordinal).toBe(1);
  });
  it('edit patch only carries changed fields (PATCH semantics)', () => {
    const existing = {
      id: 'lec-1',
      title: 'المحاضرة الأولى: مدخل إلى الشبكات',
      description: 'نظرة عامة على طبقات النموذج OSI',
      videoUrl: 'https://cdn.madarek.example/lec1.mp4',
      durationSec: 3300,
      ordinal: 1,
    };
    // Only the title changed.
    const patch = lectureFormToPatchPayload(
      { ...VALID_LECTURE, title: 'عنوان جديد' },
      existing,
    );
    expect(patch).toEqual({ lectureId: 'lec-1', title: 'عنوان جديد' });
    // A cleared description is sent as '' (blank it), not omitted.
    const cleared = lectureFormToPatchPayload({ ...VALID_LECTURE, description: '' }, existing);
    expect(cleared.description).toBe('');
  });
});

/* ── Chapter form ─────────────────────────────────────────────── */

describe('chapterFormSchema — start/end window', () => {
  const base = { title: 'الفصل الأول: المقدمة', start: '00:30', end: '12:00' };
  it('accepts end > start', () => {
    expect(chapterFormSchema.safeParse(base).success).toBe(true);
  });
  it('rejects end ≤ start with an Arabic message on end', () => {
    const r = chapterFormSchema.safeParse({ ...base, end: '00:30' });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.path).toContain('end');
    expect(!r.success && r.error.issues[0]?.message).toContain('بدايته');
    expect(chapterFormSchema.safeParse({ ...base, end: '00:29' }).success).toBe(false);
  });
  it('requires both times and a title', () => {
    expect(chapterFormSchema.safeParse({ ...base, start: '' }).success).toBe(false);
    expect(chapterFormSchema.safeParse({ ...base, end: '' }).success).toBe(false);
    expect(chapterFormSchema.safeParse({ ...base, title: '' }).success).toBe(false);
  });
  it('rejects non-time strings', () => {
    expect(chapterFormSchema.safeParse({ ...base, start: 'قبل قليل' }).success).toBe(false);
  });
});

/* ── Checkpoint form ──────────────────────────────────────────── */

const VALID_CHECKPOINT = {
  question: 'أي طبقة مسؤولة عن التوجيه المنطقي للعناوين؟',
  trigger: '08:30',
  options: [{ value: 'طبقة الشبكة' }, { value: 'طبقة النقل' }],
  correctIndex: 0,
};

describe('checkpointFormSchema — options bounds + correctIndex', () => {
  it('accepts a valid draft (field is `question`, trigger required)', () => {
    expect(checkpointFormSchema.safeParse(VALID_CHECKPOINT).success).toBe(true);
  });
  it(`requires at least ${MIN_CHECKPOINT_OPTIONS} options`, () => {
    const r = checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, options: [{ value: 'واحد فقط' }] });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues.some((i) => i.message === 'خياران على الأقل')).toBe(true);
  });
  it(`allows at most ${MAX_CHECKPOINT_OPTIONS} options`, () => {
    const options = Array.from({ length: 7 }, (_, i) => ({ value: `خيار ${i + 1}` }));
    const r = checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, options });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues.some((i) => i.message === 'ستة خيارات كحد أقصى')).toBe(true);
    const six = Array.from({ length: 6 }, (_, i) => ({ value: `خيار ${i + 1}` }));
    expect(checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, options: six, correctIndex: 5 }).success).toBe(true);
  });
  it('rejects empty option text', () => {
    const r = checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, options: [{ value: '' }, { value: 'ب' }] });
    expect(r.success).toBe(false);
  });
  it('bounds correctIndex against the option list', () => {
    // index 2 with only 2 options → invalid pair.
    const r = checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, correctIndex: 2 });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.path).toContain('correctIndex');
    // sentinel -1 (edit mode "بدون تغيير") is allowed.
    expect(
      checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, correctIndex: CORRECT_INDEX_UNCHANGED }).success,
    ).toBe(true);
  });
  it('requires the question text and trigger time', () => {
    expect(checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, question: '' }).success).toBe(false);
    expect(checkpointFormSchema.safeParse({ ...VALID_CHECKPOINT, trigger: '' }).success).toBe(false);
  });
  it('flattens the object rows into the API string[]', () => {
    expect(checkpointFormOptions(VALID_CHECKPOINT)).toEqual(['طبقة الشبكة', 'طبقة النقل']);
  });
});

/* ── Option removal → correctIndex adjustment (11-f P1-7) ────── */

describe('adjustCorrectIndexOnRemove — keeps the marked answer honest', () => {
  it('shifts the mark down when an earlier option is removed', () => {
    expect(adjustCorrectIndexOnRemove(2, 0)).toBe(1);
    expect(adjustCorrectIndexOnRemove(5, 2)).toBe(4);
    // create-mode default: option 1 is marked, a draft option above it is removed
    expect(adjustCorrectIndexOnRemove(0, 0)).toBe(CORRECT_INDEX_UNCHANGED);
  });
  it('resets the mark when the marked option itself is removed', () => {
    expect(adjustCorrectIndexOnRemove(0, 0)).toBe(CORRECT_INDEX_UNCHANGED);
    expect(adjustCorrectIndexOnRemove(3, 3)).toBe(CORRECT_INDEX_UNCHANGED);
    expect(adjustCorrectIndexOnRemove(MAX_CHECKPOINT_OPTIONS - 1, MAX_CHECKPOINT_OPTIONS - 1)).toBe(
      CORRECT_INDEX_UNCHANGED,
    );
  });
  it('keeps the mark when a later option is removed', () => {
    expect(adjustCorrectIndexOnRemove(1, 3)).toBe(1);
    expect(adjustCorrectIndexOnRemove(0, MAX_CHECKPOINT_OPTIONS - 1)).toBe(0);
  });
  it('leaves the edit-mode sentinel untouched (nothing is marked)', () => {
    expect(adjustCorrectIndexOnRemove(CORRECT_INDEX_UNCHANGED, 0)).toBe(CORRECT_INDEX_UNCHANGED);
    expect(adjustCorrectIndexOnRemove(CORRECT_INDEX_UNCHANGED, 5)).toBe(CORRECT_INDEX_UNCHANGED);
  });
  it('a reset mark is the schema-valid sentinel — the create-mode submit guard owns the re-pick', () => {
    const values = {
      ...VALID_CHECKPOINT,
      correctIndex: adjustCorrectIndexOnRemove(VALID_CHECKPOINT.correctIndex, VALID_CHECKPOINT.correctIndex),
      options: [{ value: 'أ' }, { value: 'ب' }],
    };
    // The sentinel itself is schema-valid (edit mode relies on it); what
    // matters is that removal NEVER silently re-points the mark at a
    // shifted option — it goes to -1 and the create-mode guard blocks.
    expect(values.correctIndex).toBe(CORRECT_INDEX_UNCHANGED);
    expect(checkpointFormSchema.safeParse(values).success).toBe(true);
  });
});
