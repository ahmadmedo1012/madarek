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
 * Plus the documented governance invariants of the role defaults
 * themselves (admin isolation, quality oversight-not-control, owner
 * completeness) and the override-ordering edge cases.
 *
 * DB-free: only the pure `mergeCapabilities` export and the static
 * DEFAULT_ROLE_CAPABILITIES table are exercised.
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

  it('duplicate overrides for one capability: the last one wins', () => {
    const revokedThenGranted = mergeCapabilities(Role.TEACHER, [], [
      { capability: 'EXAMS_AUTHOR', grant: false },
      { capability: 'EXAMS_AUTHOR', grant: true },
    ]);
    expect(revokedThenGranted.has('EXAMS_AUTHOR')).toBe(true);

    const grantedThenRevoked = mergeCapabilities(Role.TEACHER, [], [
      { capability: 'EXAMS_AUTHOR', grant: true },
      { capability: 'EXAMS_AUTHOR', grant: false },
    ]);
    expect(grantedThenRevoked.has('EXAMS_AUTHOR')).toBe(false);
  });

  it('revoking a capability the user does not have is a no-op', () => {
    const caps = mergeCapabilities(Role.STUDENT, [], [
      { capability: 'USERS_MANAGE', grant: false },
    ]);
    expect(caps.has('USERS_MANAGE')).toBe(false);
    expect(caps.has('EXAMS_TAKE')).toBe(true); // sibling default untouched
  });

  it('a RolePermission row duplicating a role default is idempotent', () => {
    const caps = mergeCapabilities(Role.TEACHER, [row(Role.TEACHER, 'EXAMS_AUTHOR')], []);
    expect(caps.has('EXAMS_AUTHOR')).toBe(true);
    expect(caps.size).toBe(new Set(DEFAULT_ROLE_CAPABILITIES.TEACHER).size);
  });
});

describe('DEFAULT_ROLE_CAPABILITIES — documented governance invariants', () => {
  it('every role default list is duplicate-free', () => {
    // A duplicated entry would silently mask real coverage of the table.
    for (const caps of Object.values(DEFAULT_ROLE_CAPABILITIES)) {
      expect(new Set(caps).size).toBe(caps.length);
    }
  });

  it('STUDENT defaults are minimal (EXAMS_TAKE only)', () => {
    expect(DEFAULT_ROLE_CAPABILITIES.STUDENT).toEqual(['EXAMS_TAKE']);
  });

  it('ADMIN does not auto-inherit teacher-only or quality-only capabilities', () => {
    // Documented rule: governance ≠ grading/moderating/quality-viewing.
    const caps = new Set(DEFAULT_ROLE_CAPABILITIES.ADMIN);
    for (const offLimits of [
      'RESEARCH_GRADE_OWN',
      'RESEARCH_GRADE_ANY',
      'EXAMS_AUTHOR',
      'EXAMS_MODERATE',
      'QUALITY_VIEW',
    ] as const) {
      expect(caps.has(offLimits)).toBe(false);
    }
  });

  it('QUALITY is oversight, not control — no USERS_MANAGE / ROLES_ASSIGN', () => {
    const caps = new Set(DEFAULT_ROLE_CAPABILITIES.QUALITY);
    expect(caps.has('USERS_MANAGE')).toBe(false);
    expect(caps.has('ROLES_ASSIGN')).toBe(false);
  });

  it('OWNER holds the full capability set (master control panel role)', () => {
    expect(new Set(DEFAULT_ROLE_CAPABILITIES.OWNER)).toEqual(new Set(Object.values(Capability)));
  });
});
