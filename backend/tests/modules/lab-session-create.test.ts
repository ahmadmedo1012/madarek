/**
 * Backend unit test — pure logic from
 * `backend/src/http/routes/student-dashboard.routes.ts`.
 *
 * Mirrors the DB-free style of `tests/modules/curriculum-logic.test.ts`:
 * zod acceptance/rejection for the POST /me/lab-sessions body schema.
 * Integration coverage (lab-not-found, prisma.create, rate limiter) needs
 * a DB harness the project does not have yet — the route's findUnique +
 * create are thin wrappers over Prisma and are not unit-tested here.
 *
 * r154d: the LabsPage runner used to call setDone(true) on the last step
 * without ever writing a row — the «تجارب مكتملة» KPI stayed at 0. This
 * test pins the body contract the new POST endpoint accepts, so a
 * regression that loosens or tightens the schema breaks CI instead of
 * silently breaking the lab-completion flow again.
 */
import { describe, expect, it } from 'vitest';
import { createLabSessionSchema } from '../../src/http/routes/student-dashboard.routes';

const VALID_CUID = 'ck' + 'x'.repeat(22); // 24-char cuid
const VALID_NAME = 'إعداد شبكة LAN مع VLAN';

describe('createLabSessionSchema (r154d)', () => {
  it('accepts a valid labId + experimentName', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
      experimentName: VALID_NAME,
    });
    expect(result.success).toBe(true);
  });

  it('trims the experimentName before length checks', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
      experimentName: `  ${VALID_NAME}  `,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experimentName).toBe(VALID_NAME);
    }
  });

  it('rejects a missing labId', () => {
    const result = createLabSessionSchema.safeParse({
      experimentName: VALID_NAME,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-cuid labId (the lab must resolve to a real VirtualLab)', () => {
    const result = createLabSessionSchema.safeParse({
      labId: 'not-a-cuid',
      experimentName: VALID_NAME,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing experimentName', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an experimentName shorter than 3 chars', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
      experimentName: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an experimentName longer than 200 chars', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
      experimentName: 'x'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects extra fields (.strict — the contract is closed)', () => {
    const result = createLabSessionSchema.safeParse({
      labId: VALID_CUID,
      experimentName: VALID_NAME,
      score: 100, // a client must not inject its own score
    });
    expect(result.success).toBe(false);
  });
});
