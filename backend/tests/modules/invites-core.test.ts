/**
 * r323 B3.1 — invite codes pure layer — the grammar tests.
 */
import { describe, expect, it } from 'vitest';
import { evaluateInvite, generateInviteCode, inviteScopeOf } from '../../src/modules/invites/core.js';

function row(overrides: Partial<Parameters<typeof evaluateInvite>[0]> = {}) {
  return {
    id: 'code-1',
    code: 'ABCD2345',
    role: 'STUDENT' as const,
    offeringId: null,
    departmentId: null,
    facultyId: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxUses: 1,
    usedCount: 0,
    ...overrides,
  };
}

describe('generateInviteCode', () => {
  it('emits 8 chars from the unambiguous alphabet only', () => {
    for (let i = 0; i < 40; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
    }
  });

  it('honours the injected rand (deterministic for tests)', () => {
    expect(generateInviteCode(() => 0)).toBe('22222222');
    expect(generateInviteCode(() => 0.999)).toBe('ZZZZZZZZ');
  });
});

describe('evaluateInvite', () => {
  it('accepts a fresh, matching, under-cap code', () => {
    expect(evaluateInvite(row(), 'STUDENT')).toEqual({ ok: true });
  });

  it('rejects with Arabic reasons: unknown / role mismatch / expired / exhausted', () => {
    // toEqual (not .reason access) — the ok:false narrowing stays inside
    // the matcher, so the union never trips the test typecheck.
    expect(evaluateInvite(null, 'STUDENT')).toEqual({ ok: false, reason: expect.stringContaining('غير صحيح') });
    expect(evaluateInvite(row(), 'TEACHER')).toEqual({ ok: false, reason: expect.stringContaining('نوع حساب آخر') });
    expect(evaluateInvite(row({ expiresAt: new Date(Date.now() - 1000) }), 'STUDENT'))
      .toEqual({ ok: false, reason: expect.stringContaining('منتهي الصلاحية') });
    expect(evaluateInvite(row({ usedCount: 1, maxUses: 1 }), 'STUDENT'))
      .toEqual({ ok: false, reason: expect.stringContaining('استُنفد') });
  });
});

describe('inviteScopeOf', () => {
  it('picks the single scope in priority order and admits none when unscoped', () => {
    expect(inviteScopeOf({ offeringId: 'o1', departmentId: null, facultyId: null })).toEqual({ kind: 'offering', id: 'o1' });
    expect(inviteScopeOf({ offeringId: null, departmentId: 'd1', facultyId: null })).toEqual({ kind: 'department', id: 'd1' });
    expect(inviteScopeOf({ offeringId: null, departmentId: null, facultyId: 'f1' })).toEqual({ kind: 'faculty', id: 'f1' });
    expect(inviteScopeOf({ offeringId: null, departmentId: null, facultyId: null })).toBeNull();
  });
});
