/**
 * Backend unit test — capability merge logic in
 * `backend/src/lib/permissions.ts` (pure part, injected rows).
 *
 * Verifies the three-layer merge:
 *   effective = DEFAULT_ROLE_CAPABILITIES[role]
 *             ∪ RolePermission rows for that role
 *             + UserPermission grants
 *             − UserPermission revokes
 *
 * DB-free: only the pure `mergeCapabilities` export is exercised.
 */
import { describe, expect, it } from 'vitest';
import { Capability, Role } from '@prisma/client';
import { DEFAULT_ROLE_CAPABILITIES, mergeCapabilities } from '../../src/lib/permissions';

const row = (role: Role, capability: Capability) => ({ role, capability });

describe('mergeCapabilities', () => {
  it('returns pure role defaults with no DB rows and no user overrides', () => {
    const caps = mergeCapabilities(Role.TEACHER, [], []);
    expect(Array.from(caps).sort()).toEqual([...DEFAULT_ROLE_CAPABILITIES.TEACHER].sort());
  });

  it('adds a RolePermission DB row granted for the role', () => {
    const caps = mergeCapabilities(Role.STUDENT, [row(Role.STUDENT, 'COMPETITIONS_RUN')], []);
    expect(caps.has('COMPETITIONS_RUN')).toBe(true);
    expect(caps.has('EXAMS_TAKE')).toBe(true); // default retained
  });

  it('ignores RolePermission rows belonging to other roles', () => {
    const caps = mergeCapabilities(Role.STUDENT, [row(Role.TEACHER, 'EXAMS_AUTHOR')], []);
    expect(caps.has('EXAMS_AUTHOR')).toBe(false);
  });

  it('applies a user grant on top of defaults + DB rows', () => {
    const caps = mergeCapabilities(
      Role.STUDENT,
      [row(Role.STUDENT, 'COMPETITIONS_RUN')],
      [{ capability: 'QUALITY_VIEW', grant: true }],
    );
    expect(caps.has('QUALITY_VIEW')).toBe(true);
    expect(caps.has('COMPETITIONS_RUN')).toBe(true);
    expect(caps.has('EXAMS_TAKE')).toBe(true);
  });

  it('a user revoke removes a default capability', () => {
    const caps = mergeCapabilities(Role.TEACHER, [], [
      { capability: 'EXAMS_AUTHOR', grant: false },
    ]);
    expect(caps.has('EXAMS_AUTHOR')).toBe(false);
    expect(caps.has('RESEARCH_PUBLISH')).toBe(true); // untouched siblings stay
  });

  it('a user revoke wins over a RolePermission DB grant (override precedence)', () => {
    const caps = mergeCapabilities(
      Role.QUALITY,
      [row(Role.QUALITY, 'USERS_MANAGE')],
      [{ capability: 'USERS_MANAGE', grant: false }],
    );
    expect(caps.has('USERS_MANAGE')).toBe(false);
  });

  it('a user grant can re-add a capability revoked nowhere else', () => {
    // STUDENT defaults don't include QUALITY_VIEW — a grant overrides that.
    const caps = mergeCapabilities(Role.STUDENT, [], [
      { capability: 'QUALITY_VIEW', grant: true },
    ]);
    expect(caps.has('QUALITY_VIEW')).toBe(true);
  });

  it('empty DB table keeps the pure hardcoded fallback (defaults only)', () => {
    // The documented fallback when RolePermission is empty/unreachable.
    const caps = mergeCapabilities(Role.ADMIN, [], []);
    expect(caps.has('USERS_MANAGE')).toBe(true);
    expect(caps.has('RESEARCH_GRADE_OWN')).toBe(false);
  });
});
