/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/offerings.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/curriculum-logic.test.ts`
 * / `learning-logic.test.ts`: zod acceptance/rejection envelopes for the
 * offering resource schemas, headed by the Grade-table write gate (the
 * `score ≤ maxScore` superRefine — audit 15-i TOP-1; every
 * teacher-entered grade on the platform flows through it and a
 * regression silently stores 180% grades again) + the foreign-student
 * guard (TOP-11) + the material BigInt serialization (15-i P1-5 / 15-c
 * hand-off — the exact res.json 500 the materials GET used to throw)
 * + a tombstone pin that the dead roll-call twin POST /:id/attendance
 * (15-h P2-8) stays deleted. Integration coverage (auth gate,
 * assertOfferingAccess, the grade upsert transaction) needs a DB
 * harness the project does not have yet.
 */
import { describe, expect, it } from 'vitest';
import offeringsRouter, {
  assignmentCreateSchema,
  foreignStudentIds,
  gradeItemSchema,
  gradesUpsertSchema,
  materialCreateSchema,
  serializeMaterial,
} from '../../src/http/routes/offerings.routes';

// zod cuid(): a leading 'c' + at least 8 non-space, non-dash chars.
const STUDENT_ID = 'c1234567890123456';

const validGradeItem = {
  studentId: STUDENT_ID,
  kind: 'QUIZ_1' as const,
  score: 85,
  maxScore: 100,
  weight: 10,
  feedback: 'أداء جيد',
};

describe('gradeItemSchema (the Grade-table write gate — 15-i TOP-1)', () => {
  it('accepts a well-formed item and keeps every field', () => {
    const parsed = gradeItemSchema.safeParse(validGradeItem);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual(validGradeItem);
  });

  it('defaults maxScore to 100 and weight to 10 when omitted', () => {
    const parsed = gradeItemSchema.safeParse({
      studentId: STUDENT_ID,
      kind: 'HOMEWORK',
      score: 18,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.maxScore).toBe(100);
      expect(parsed.data.weight).toBe(10);
    }
  });

  it('rejects score > maxScore — the 180% grade regression (audit P2-15)', () => {
    const parsed = gradeItemSchema.safeParse({ ...validGradeItem, score: 90, maxScore: 50 });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues).toHaveLength(1);
      // The cross-field issue must point at `score`, not the whole item.
      expect(parsed.error.issues[0]?.path).toEqual(['score']);
    }
  });

  it('accepts score == maxScore (a perfect score is not an overflow)', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: 50, maxScore: 50 }).success).toBe(true);
  });

  it('accepts score 0 (floor) and rejects negative scores', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: 0 }).success).toBe(true);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: -1 }).success).toBe(false);
  });

  it('caps score at 100 independently of maxScore (per-field max vs cross-field rule)', () => {
    // maxScore itself has no upper bound; score still may not exceed 100.
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: 150, maxScore: 200 }).success).toBe(false);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: 100, maxScore: 200 }).success).toBe(true);
  });

  it('accepts fractional scores (Grade.score is Decimal(5,2))', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, score: 87.5 }).success).toBe(true);
  });

  it('rejects maxScore 0, negative and fractional values (positive int)', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, maxScore: 0 }).success).toBe(false);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, maxScore: -100 }).success).toBe(false);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, maxScore: 100.5 }).success).toBe(false);
  });

  it('weight bounds: 0 and 100 inclusive, integers only', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, weight: 0 }).success).toBe(true);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, weight: 100 }).success).toBe(true);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, weight: -1 }).success).toBe(false);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, weight: 101 }).success).toBe(false);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, weight: 2.5 }).success).toBe(false);
  });

  it('feedback is optional, capped at 2000 chars', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, feedback: undefined }).success).toBe(true);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, feedback: 'ج'.repeat(2000) }).success).toBe(true);
    expect(gradeItemSchema.safeParse({ ...validGradeItem, feedback: 'ج'.repeat(2001) }).success).toBe(false);
  });

  it('accepts every GradeKind value (enum completeness)', () => {
    for (const kind of ['HOMEWORK', 'QUIZ_1', 'QUIZ_2', 'MIDTERM', 'PROJECT', 'FINAL']) {
      expect(gradeItemSchema.safeParse({ ...validGradeItem, kind }).success).toBe(true);
    }
    expect(gradeItemSchema.safeParse({ ...validGradeItem, kind: 'FINAL_EXAM' }).success).toBe(false);
  });

  it('requires a cuid studentId', () => {
    expect(gradeItemSchema.safeParse({ ...validGradeItem, studentId: 'not-a-cuid' }).success).toBe(false);
  });

  it('strips unknown keys from the parsed output — no spoofed field reaches prisma.create', () => {
    // gradeItemSchema is not .strict(): zod DROPS unknown keys and the
    // handler spreads the PARSED output, so injected fields (id,
    // offeringId, …) can never reach the create/update payloads.
    // (Tightening to .strict() is a wave-17 schema-policy decision,
    // deliberately not made here — this pins the protective half.)
    const parsed = gradeItemSchema.safeParse({ ...validGradeItem, id: 'spoof', offeringId: 'spoof' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('id');
      expect(parsed.data).not.toHaveProperty('offeringId');
    }
  });
});

describe('gradesUpsertSchema (batch envelope)', () => {
  const items = (n: number) => Array.from({ length: n }, () => ({ ...validGradeItem }));

  it('accepts a single-item batch', () => {
    expect(gradesUpsertSchema.safeParse({ grades: items(1) }).success).toBe(true);
  });

  it('accepts exactly 200 items and rejects 201 (roster-sized cap)', () => {
    expect(gradesUpsertSchema.safeParse({ grades: items(200) }).success).toBe(true);
    expect(gradesUpsertSchema.safeParse({ grades: items(201) }).success).toBe(false);
  });

  it('rejects an empty batch (min 1)', () => {
    expect(gradesUpsertSchema.safeParse({ grades: [] }).success).toBe(false);
  });

  it('rejects the batch when any single item is invalid', () => {
    const batch = items(3);
    batch[1] = { ...validGradeItem, score: 90, maxScore: 50 };
    expect(gradesUpsertSchema.safeParse({ grades: batch }).success).toBe(false);
  });

  it('strict mode: rejects spoofed top-level fields next to grades', () => {
    expect(gradesUpsertSchema.safeParse({ grades: items(1), offeringId: 'spoof' }).success).toBe(false);
    expect(gradesUpsertSchema.safeParse({ grades: items(1), studentId: STUDENT_ID }).success).toBe(false);
  });
});

describe('materialCreateSchema', () => {
  const validMaterial = {
    name: 'محاضرة المقدمة',
    type: 'PDF' as const,
    sizeBytes: 1048576,
    url: 'https://files.example.edu/intro.pdf',
  };

  it('accepts a well-formed material and defaults sizeBytes to 0', () => {
    expect(materialCreateSchema.safeParse(validMaterial).success).toBe(true);
    const parsed = materialCreateSchema.safeParse({ ...validMaterial, sizeBytes: undefined });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.sizeBytes).toBe(0);
  });

  it('rejects negative or fractional sizeBytes (nonnegative int)', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, sizeBytes: -1 }).success).toBe(false);
    expect(materialCreateSchema.safeParse({ ...validMaterial, sizeBytes: 1.5 }).success).toBe(false);
  });

  it('name: 1..200 chars', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, name: '' }).success).toBe(false);
    expect(materialCreateSchema.safeParse({ ...validMaterial, name: 'م'.repeat(200) }).success).toBe(true);
    expect(materialCreateSchema.safeParse({ ...validMaterial, name: 'م'.repeat(201) }).success).toBe(false);
  });

  it('name trims before min/max (D17-4): whitespace-only rejected, padded input stored trimmed', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, name: '   ' }).success).toBe(false);
    const parsed = materialCreateSchema.safeParse({ ...validMaterial, name: '  محاضرة المقدمة  ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.name).toBe('محاضرة المقدمة');
  });

  it('description is optional, capped at 2000 chars', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, description: undefined }).success).toBe(true);
    expect(materialCreateSchema.safeParse({ ...validMaterial, description: 'د'.repeat(2001) }).success).toBe(false);
  });

  it('url must be a URL of at most 500 chars', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, url: 'not-a-url' }).success).toBe(false);
    // 18-char base + 490 padding = 508 chars.
    expect(materialCreateSchema.safeParse({ ...validMaterial, url: `https://x.example/${'a'.repeat(490)}` }).success).toBe(false);
  });

  it('accepts every MaterialType value (enum completeness)', () => {
    for (const type of ['PDF', 'PPT', 'VIDEO', 'DOC', 'ZIP', 'IMAGE', 'OTHER']) {
      expect(materialCreateSchema.safeParse({ ...validMaterial, type }).success).toBe(true);
    }
    expect(materialCreateSchema.safeParse({ ...validMaterial, type: 'BOOK' }).success).toBe(false);
  });

  it('strict mode: rejects unknown keys', () => {
    expect(materialCreateSchema.safeParse({ ...validMaterial, uploaderId: 'spoof' }).success).toBe(false);
  });
});

describe('assignmentCreateSchema', () => {
  const validAssignment = {
    title: 'واجب الوحدة الأولى',
    type: 'HOMEWORK' as const,
    dueAt: '2026-10-01T23:59:00.000Z',
    weight: 10,
    maxScore: 100,
  };

  it('accepts a well-formed assignment and coerces dueAt to a Date', () => {
    const parsed = assignmentCreateSchema.safeParse(validAssignment);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.dueAt).toBeInstanceOf(Date);
      expect(parsed.data.dueAt.toISOString()).toBe('2026-10-01T23:59:00.000Z');
    }
  });

  it('defaults weight to 10 and maxScore to 100', () => {
    const parsed = assignmentCreateSchema.safeParse({
      title: validAssignment.title,
      type: 'PROJECT',
      dueAt: validAssignment.dueAt,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.weight).toBe(10);
      expect(parsed.data.maxScore).toBe(100);
    }
  });

  it('title: 2..200 chars', () => {
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, title: 'م' }).success).toBe(false);
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, title: 'م'.repeat(200) }).success).toBe(true);
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, title: 'م'.repeat(201) }).success).toBe(false);
  });

  it('accepts every AssignmentType value (enum completeness)', () => {
    for (const type of ['HOMEWORK', 'QUIZ', 'PROJECT', 'EXAM']) {
      expect(assignmentCreateSchema.safeParse({ ...validAssignment, type }).success).toBe(true);
    }
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, type: 'LAB' }).success).toBe(false);
  });

  it('rejects an unparseable dueAt', () => {
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, dueAt: 'not-a-date' }).success).toBe(false);
  });

  it('weight 0..100 int; maxScore positive int', () => {
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, weight: 0 }).success).toBe(true);
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, weight: 101 }).success).toBe(false);
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, maxScore: 0 }).success).toBe(false);
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, maxScore: -5 }).success).toBe(false);
  });

  it('strict mode: rejects unknown keys', () => {
    expect(assignmentCreateSchema.safeParse({ ...validAssignment, offeringId: 'spoof' }).success).toBe(false);
  });
});

describe('foreignStudentIds (enrollment guard — 15-i TOP-11)', () => {
  it('returns [] when every requested id is enrolled', () => {
    expect(foreignStudentIds(['a', 'b'], ['a', 'b', 'c'])).toEqual([]);
  });

  it('returns the non-enrolled subset', () => {
    expect(foreignStudentIds(['a', 'b', 'x'], ['a', 'b'])).toEqual(['x']);
  });

  it('empty roster + non-empty request → every distinct id is foreign', () => {
    expect(foreignStudentIds(['a', 'b'], [])).toEqual(['a', 'b']);
  });

  it('deduplicates the requested list (double-entered students)', () => {
    expect(foreignStudentIds(['a', 'a', 'x', 'x'], ['a'])).toEqual(['x']);
  });

  it('keeps first-seen order for determinism', () => {
    expect(foreignStudentIds(['x', 'a', 'y'], ['a'])).toEqual(['x', 'y']);
  });

  it('empty input → []', () => {
    expect(foreignStudentIds([], ['a'])).toEqual([]);
    expect(foreignStudentIds([], [])).toEqual([]);
  });
});

describe('serializeMaterial (BigInt wire fix — 15-i P1-5 / 15-c hand-off)', () => {
  const row = {
    id: 'm1234567890123456',
    name: 'ملف المحاضرة الأولى',
    sizeBytes: 1048576n,
    uploader: { id: 'u1234567890123456', firstName: 'سالم' },
  };

  it('stringifies sizeBytes and preserves every other field (nested rows included)', () => {
    const out = serializeMaterial(row);
    expect(out.sizeBytes).toBe('1048576');
    expect(out.id).toBe(row.id);
    expect(out.name).toBe(row.name);
    expect(out.uploader).toBe(row.uploader); // shallow copy keeps the include intact
  });

  it('makes the row JSON-serializable — the exact 500 the GET used to throw', () => {
    expect(() => JSON.stringify(row)).toThrow(); // raw BigInt crashes res.json
    expect(() => JSON.stringify(serializeMaterial(row))).not.toThrow();
    expect(JSON.parse(JSON.stringify(serializeMaterial(row))).sizeBytes).toBe('1048576');
  });

  it('stays exact beyond Number.MAX_SAFE_INTEGER (why string, not Number())', () => {
    // 2**63 - 1 survives as a string…
    const max = serializeMaterial({ ...row, sizeBytes: 9223372036854775807n });
    expect(max.sizeBytes).toBe('9223372036854775807');
    // …while 2**53 + 1 already loses precision through Number() — the
    // string keeps exactly what a numeric conversion would silently round.
    const justUnsafe = serializeMaterial({ ...row, sizeBytes: 9007199254740993n });
    expect(justUnsafe.sizeBytes).toBe('9007199254740993');
    expect(Number('9007199254740993')).toBe(9007199254740992);
  });
});

describe('route inventory (the dead roll-call twin stays deleted — 15-h P2-8)', () => {
  // Express 4 keeps registered routes on `router.stack` — not part of
  // the public typings, hence this narrow structural read (paths +
  // methods only). Middleware layers carry no `route` and are filtered
  // out by the type guard.
  interface RouteInfo {
    path: string;
    methods: Record<string, boolean>;
  }
  const routes = ((offeringsRouter as unknown as { stack: Array<{ route?: RouteInfo }> }).stack)
    .map((layer) => layer.route)
    .filter((r): r is RouteInfo => Boolean(r));

  it('/:id/attendance is GET-only — the diverging POST twin is gone', () => {
    const attendance = routes.filter((r) => r.path === '/:id/attendance');
    expect(attendance).toHaveLength(1);
    expect(attendance[0]?.methods.get).toBe(true);
    expect(attendance[0]?.methods.post).toBeFalsy();
  });

  it('the material/assignment/grade writes are untouched by the deletion', () => {
    // Express registers GET and POST on the same path as SEPARATE
    // layers — probe for the method, don't grab the first layer by path.
    const has = (path: string, method: string) =>
      routes.some((r) => r.path === path && r.methods[method] === true);
    expect(has('/:id/materials', 'post')).toBe(true);
    expect(has('/:id/assignments', 'post')).toBe(true);
    expect(has('/:id/grades', 'post')).toBe(true);
  });
});
