/**
 * Backend unit test — the unscoped-template authoring decision exported
 * from `backend/src/http/routes/exams.routes.ts` (r155a — audit
 * finding 6).
 *
 * A template with BOTH offeringId and facultyId null is unscoped: the
 * student scoping on list/start/detail matches a published template on
 * either field, so an unscoped template reaches every student
 * platform-wide. Authoring one is reserved for EXAMS_MODERATE holders.
 * The handler mirrors the cross-faculty facultyId guard (same
 * getEffectiveCapabilities reach); the schema itself stays permissive
 * because capability context lives in the handler, not in zod — this
 * suite pins the pure decision matrix the handler consults.
 *
 * DB-free pure decision function (the exams-logic.test.ts style).
 */
import { describe, expect, it } from 'vitest';
import { createTemplateSchema, mayAuthorUnscopedTemplate } from '../../src/http/routes/exams.routes.js';

const CAPS_WITH_MODERATE = new Set(['EXAMS_AUTHOR', 'EXAMS_MODERATE']);
const CAPS_WITHOUT_MODERATE = new Set(['EXAMS_AUTHOR']);

describe('mayAuthorUnscopedTemplate (r155a — unscoped-template guard)', () => {
  it('offering-scoped template → allowed regardless of capabilities', () => {
    expect(mayAuthorUnscopedTemplate(true, false, CAPS_WITHOUT_MODERATE)).toBe(true);
    expect(mayAuthorUnscopedTemplate(true, true, new Set())).toBe(true);
  });

  it('faculty-scoped template → allowed regardless of capabilities (the facultyId guard polices the target)', () => {
    expect(mayAuthorUnscopedTemplate(false, true, CAPS_WITHOUT_MODERATE)).toBe(true);
    expect(mayAuthorUnscopedTemplate(false, true, new Set())).toBe(true);
  });

  it('NEITHER offering nor faculty → only EXAMS_MODERATE holders may author', () => {
    expect(mayAuthorUnscopedTemplate(false, false, CAPS_WITH_MODERATE)).toBe(true);
    expect(mayAuthorUnscopedTemplate(false, false, CAPS_WITHOUT_MODERATE)).toBe(false);
    expect(mayAuthorUnscopedTemplate(false, false, new Set())).toBe(false);
  });
});

describe('createTemplateSchema (unrelated regression guard — the schema stays permissive)', () => {
  const base = {
    title: 'اختبار قواعد البيانات',
    questionIds: ['c11111111'],
  };

  it('a minimal template with neither offeringId nor facultyId still parses (the capability check is the handler’s job)', () => {
    const parsed = createTemplateSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });

  it('an offering-scoped template parses', () => {
    expect(createTemplateSchema.safeParse({ ...base, offeringId: 'ckxxxxxxxxxxxxxxxxxxxxxx' }).success).toBe(true);
  });

  it('a faculty-scoped template parses', () => {
    expect(createTemplateSchema.safeParse({ ...base, facultyId: 'ckxxxxxxxxxxxxxxxxxxxxxx' }).success).toBe(true);
  });
});
