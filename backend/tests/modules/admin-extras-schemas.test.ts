/**
 * Backend unit test — the GET /admin/students query envelope from
 * `backend/src/http/routes/admin-extras.routes.ts` (audit 11-c P1-1).
 *
 * Locks the zod contract that replaced manual Number() coercion:
 *  - `?page=abc` (and any other malformed value) is rejected by the
 *    schema → clean 400 from the validate() middleware, instead of the
 *    old NaN → skip/take: NaN → PrismaClientValidationError → 500,
 *  - the surface keeps its 50-row limit cap (previously a silent clamp),
 *  - facultyId must be a well-formed cuid,
 *  - page/limit defaults match the frontend's requests (page 1, limit 20).
 *
 * 5-B1 addition (audit 5-A8 §5 row 8): the GET /admin/papers envelope —
 * the admin research-list drill-down. `status` must be a real
 * ResearchPaperStatus lifecycle value (the FE lands pre-filtered on
 * e.g. PUBLISHED); pagination rides the shared schema so the list is
 * never another fixed silent cap (the 5-A8 P2-1 bug class).
 *
 * DB-free: only the schema is exercised. The governance-scope filter
 * applied on top of it (getGovernanceScope + buildScopedUserWhere) is
 * covered by tests/modules/governance.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { ResearchPaperStatus } from '@prisma/client';
import { papersQuerySchema, studentsQuerySchema } from '../../src/http/routes/admin-extras.routes';

describe('studentsQuerySchema (audit 11-c P1-1 — ?page=abc no longer 500s)', () => {
  it('accepts an empty query with the platform defaults (page 1, limit 20)', () => {
    const r = studentsQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(20);
      expect(r.data.q).toBeUndefined();
      expect(r.data.facultyId).toBeUndefined();
    }
  });

  it('coerces numeric strings exactly like the shared pagination schema', () => {
    const r = studentsQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(3);
      expect(r.data.limit).toBe(50);
    }
  });

  it('rejects a non-numeric page (was NaN → skip NaN → Prisma 500)', () => {
    expect(studentsQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ page: '' }).success).toBe(false);
  });

  it('rejects a non-numeric limit', () => {
    expect(studentsQuerySchema.safeParse({ limit: 'abc' }).success).toBe(false);
  });

  it('rejects non-positive or fractional pages', () => {
    expect(studentsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ page: -1 }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
  });

  it('enforces the 50-row cap (previously Math.min silently clamped)', () => {
    expect(studentsQuerySchema.safeParse({ limit: 50 }).success).toBe(true);
    expect(studentsQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ limit: -5 }).success).toBe(false);
  });

  it('rejects a malformed or empty facultyId (cuid)', () => {
    expect(studentsQuerySchema.safeParse({ facultyId: 'not-a-cuid' }).success).toBe(false);
    expect(studentsQuerySchema.safeParse({ facultyId: '' }).success).toBe(false);
  });

  it('accepts a cuid facultyId together with a search term', () => {
    const r = studentsQuerySchema.safeParse({
      facultyId: 'clx7z0h5e0000abcdefghij',
      q: 'أحمد',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.facultyId).toBe('clx7z0h5e0000abcdefghij');
  });

  it('trims the search term and keeps the shared 120-char cap', () => {
    const r = studentsQuerySchema.safeParse({ q: '  أحمد  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.q).toBe('أحمد');

    expect(studentsQuerySchema.safeParse({ q: 'a'.repeat(120) }).success).toBe(true);
    expect(studentsQuerySchema.safeParse({ q: 'a'.repeat(121) }).success).toBe(false);
  });
});

describe('papersQuerySchema (5-A8 §5 row 8 — admin research-list drill-down)', () => {
  it('accepts an empty query with the platform defaults (page 1, limit 20)', () => {
    const r = papersQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(20);
      expect(r.data.status).toBeUndefined();
      expect(r.data.q).toBeUndefined();
    }
  });

  it('accepts every ResearchPaperStatus lifecycle value', () => {
    for (const status of Object.values(ResearchPaperStatus)) {
      expect(papersQuerySchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('rejects unknown statuses (no silent fall-through to the unfiltered list)', () => {
    expect(papersQuerySchema.safeParse({ status: 'published' }).success).toBe(false);
    expect(papersQuerySchema.safeParse({ status: 'ARCHIVED' }).success).toBe(false);
    expect(papersQuerySchema.safeParse({ status: '' }).success).toBe(false);
  });

  it('keeps the shared pagination caps — the list is paginated, never a fixed silent cap', () => {
    expect(papersQuerySchema.safeParse({ page: '2', limit: '100' }).success).toBe(true);
    expect(papersQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
    expect(papersQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('status + q + pagination compose', () => {
    const r = papersQuerySchema.safeParse({ status: 'PUBLISHED', q: 'ذكاء', page: '1', limit: '50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toMatchObject({ status: ResearchPaperStatus.PUBLISHED, q: 'ذكاء', page: 1, limit: 50 });
    }
  });
});
