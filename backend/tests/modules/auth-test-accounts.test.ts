/**
 * Backend unit test — R320 §C: the test-account table
 * (modules/auth/test-accounts.data.ts) + the idempotent
 * `ensureTestAccounts()` upsert (modules/auth/test-accounts.ts).
 *
 * DB-free: prisma is a plain vi.fn() delegate object (the function
 * under test takes the client as a parameter — no src/db.js mock
 * needed); argon2 is mocked (the auth-rotation pattern) with a
 * sentinel hash so the payload assertions stay deterministic.
 *
 * Pins:
 *  1. TABLE invariants — exactly the 10 documented jobs, unique
 *     @test.ly emails, ONE easy password, positions only on TEACHER
 *     rows, `scoped` only on the faculty registrar, the three panel
 *     groups with their documented members;
 *  2. isTestAccountEmail — the @test.ly demo marker (case/whitespace
 *     tolerant; look-alikes rejected);
 *  3. ensureTestAccounts — per-account heal payload (password hash
 *     reset, re-activate, lock state cleared, scope healed),
 *     membership for everyone EXCEPT the owner, positions written on
 *     teacher-profile create AND healed on drift, reg numbers only
 *     allocated when free (never stolen), enrolments best-effort
 *     (skipped on a bare skeleton), returns the job count.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'test-hash'),
}));

import {
  isTestAccountEmail,
  TEST_ACCOUNTS,
  TEST_ACCOUNT_GROUPS,
  TEST_PASSWORD,
} from '../../src/modules/auth/test-accounts.data';
import { ensureTestAccounts } from '../../src/modules/auth/test-accounts';

/* ── table invariants ─────────────────────────────────────────── */

describe('R320 §C — the test-account table', () => {
  it('carries exactly the 10 documented jobs with unique @test.ly emails', () => {
    expect(TEST_ACCOUNTS).toHaveLength(10);
    const emails = TEST_ACCOUNTS.map((a) => a.email);
    expect(new Set(emails).size).toBe(10);
    for (const email of emails) {
      expect(email.endsWith('@test.ly')).toBe(true);
    }
    // The easy documented set (one per job — the brief's table).
    expect(emails).toEqual([
      'student@test.ly',
      'student2@test.ly',
      'teacher@test.ly',
      'head@test.ly',
      'dean@test.ly',
      'vicedean@test.ly',
      'registrar@test.ly',
      'faculty@test.ly',
      'quality@test.ly',
      'owner@test.ly',
    ]);
  });

  it('uses ONE easy password for every account', () => {
    expect(TEST_PASSWORD).toBe('12345678');
    for (const account of TEST_ACCOUNTS) {
      expect(account.password).toBe(TEST_PASSWORD);
    }
  });

  it('positions ride TEACHER rows only, and scoped rides the ADMIN faculty row only', () => {
    const byJob = (job: string) => TEST_ACCOUNTS.find((a) => a.job === job)!;

    // رئيس قسم / عميد / نائب عميد = TEACHER + AcademicPosition.
    expect(byJob('رئيس قسم')).toMatchObject({ role: 'TEACHER', position: 'DEPARTMENT_HEAD' });
    expect(byJob('عميد')).toMatchObject({ role: 'TEACHER', position: 'DEAN' });
    expect(byJob('نائب عميد')).toMatchObject({ role: 'TEACHER', position: 'ASSOCIATE_DEAN' });

    for (const account of TEST_ACCOUNTS) {
      if (account.position) expect(account.role).toBe('TEACHER');
      if (account.scoped) expect(account.role).toBe('ADMIN');
    }
    // مسجل كلية = ADMIN with scopeFacultyId (the only scoped row).
    expect(byJob('مسجل كلية (نطاق كلية)')).toMatchObject({ role: 'ADMIN', scoped: true });
    expect(TEST_ACCOUNTS.filter((a) => a.scoped)).toHaveLength(1);
  });

  it('groups match the documented panel contract (التعليم 6 · الحوكمة 3 · النظام 1 — R321 §A7: the governance bucket is «الحوكمة»)', () => {
    expect(TEST_ACCOUNT_GROUPS).toEqual(['التعليم', 'الحوكمة', 'النظام']);
    const count = (group: string) => TEST_ACCOUNTS.filter((a) => a.group === group).length;
    expect(count('التعليم')).toBe(6);
    expect(count('الحوكمة')).toBe(3);
    expect(count('النظام')).toBe(1);
    // No pending@test.ly — the honest skip (no pending user state in
    // the schema); documented in the module header.
    expect(TEST_ACCOUNTS.find((a) => a.email === 'pending@test.ly')).toBeUndefined();
  });
});

describe('R320 §C — isTestAccountEmail (the @test.ly demo marker)', () => {
  it('accepts demo emails case/whitespace-tolerantly', () => {
    expect(isTestAccountEmail('student@test.ly')).toBe(true);
    expect(isTestAccountEmail('  Faculty@Test.LY ')).toBe(true);
  });

  it('rejects look-alikes (the marker must be a SUFFIX match)', () => {
    expect(isTestAccountEmail('ahmed@zu.edu.ly')).toBe(false);
    expect(isTestAccountEmail('test.ly@example.com')).toBe(false); // domain as local part
    expect(isTestAccountEmail('student@test.ly.evil.com')).toBe(false); // demo-like infix
    expect(isTestAccountEmail('student@testly')).toBe(false); // missing the dot
    expect(isTestAccountEmail('')).toBe(false);
  });
});

/* ── ensureTestAccounts (mocked prisma) ───────────────────────── */

/** The canonical display names the two sources (ACCOUNT_PROFILES here +
 * the seed corpus in prisma/seed.ts) must agree on. Keyed by email —
 * RENAME-LEDGER.md row `prisma/seed.ts:342-356` is the authority. */
const CANONICAL_NAMES: Record<string, { first: string; last: string; initials: string }> = {
  'student@test.ly': { first: 'أحمد', last: 'الزروق', initials: 'أح' },
  'student2@test.ly': { first: 'ليلى', last: 'المهدي', initials: 'لم' },
  'teacher@test.ly': { first: 'سالم', last: 'البوسيفي', initials: 'سب' },
  'head@test.ly': { first: 'محمد', last: 'الشريف', initials: 'مش' },
  'dean@test.ly': { first: 'إبراهيم', last: 'الفيتوري', initials: 'إف' },
  'vicedean@test.ly': { first: 'آمال', last: 'بن عيسى', initials: 'آب' },
  'registrar@test.ly': { first: 'المسجل', last: 'العام', initials: 'مع' },
  'faculty@test.ly': { first: 'خديجة', last: 'المرابط', initials: 'خم' },
  'quality@test.ly': { first: 'ضمان', last: 'الجودة', initials: 'جو' },
  'owner@test.ly': { first: 'مالك', last: 'المنصة', initials: 'مل' },
};

/** A fresh delegate-mock PrismaClient whose upserts return the demo
 * skeleton rows (ids the corpus seed also uses, so the lockstep is
 * asserted on the exact same natural keys). */
function makePrisma(): PrismaClient & {
  // Typed spy accessors for the assertions (the delegates are vi.fn()).
  _spies: {
    userUpsert: ReturnType<typeof vi.fn>;
    membershipUpsert: ReturnType<typeof vi.fn>;
    studentProfileCreate: ReturnType<typeof vi.fn>;
    teacherProfileCreate: ReturnType<typeof vi.fn>;
    teacherProfileUpdate: ReturnType<typeof vi.fn>;
  };
} {
  const zawia = { id: 'inst-zawia-showcase' };
  const alandalus = { id: 'inst-alandalus-demo' };
  const zawiaIt = { id: 'fac-zawia-it' };
  const aaIt = { id: 'fac-aa-it' };
  const zawiaCs = { id: 'dep-zawia-cs' };
  const aaCs = { id: 'dep-aa-cs' };

  const userUpsert = vi.fn(async (args: { where: { email: string } }) => ({
    id: `u-${args.where.email}`,
    email: args.where.email,
  }));
  const membershipUpsert = vi.fn(async (args: {
    where: { userId_institutionId: { userId: string; institutionId: string } };
  }) => ({ id: `mem-${args.where.userId_institutionId.userId}-${args.where.userId_institutionId.institutionId}` }));
  const studentProfileCreate = vi.fn(async () => ({ id: 'sp-1' }));
  const teacherProfileCreate = vi.fn(async () => ({ id: 'tp-1' }));
  const teacherProfileUpdate = vi.fn(async () => ({ id: 'tp-1' }));

  const prisma = {
    institution: {
      upsert: vi.fn()
        .mockResolvedValueOnce(zawia)
        .mockResolvedValueOnce(alandalus),
    },
    faculty: {
      upsert: vi.fn()
        .mockResolvedValueOnce(zawiaIt)
        .mockResolvedValueOnce(aaIt),
    },
    department: {
      upsert: vi.fn()
        .mockResolvedValueOnce(zawiaCs)
        .mockResolvedValueOnce(aaCs),
    },
    user: {
      upsert: userUpsert,
      findUniqueOrThrow: vi.fn(async (args: { where: { email: string } }) => ({
        id: `u-${args.where.email}`,
      })),
    },
    membership: { upsert: membershipUpsert },
    studentProfile: {
      // No existing profiles (fresh pass) — overridden per-test.
      findFirst: vi.fn(async () => null),
      findUnique: vi.fn(async () => null),
      create: studentProfileCreate,
    },
    teacherProfile: {
      findFirst: vi.fn(async () => null),
      create: teacherProfileCreate,
      update: teacherProfileUpdate,
    },
    courseOffering: {
      // Bare skeleton — no offerings → enrolments skipped (logged).
      findMany: vi.fn(async () => []),
    },
    enrollment: { findUnique: vi.fn(async () => null), create: vi.fn(async () => ({})) },
  } as unknown as PrismaClient;

  return Object.assign(prisma, {
    _spies: { userUpsert, membershipUpsert, studentProfileCreate, teacherProfileCreate, teacherProfileUpdate },
  });
}

describe('R320 §C — ensureTestAccounts (idempotent upsert)', () => {
  it('heals EVERY account: password hash reset, re-activated, lock state cleared', async () => {
    const prisma = makePrisma();
    const ensured = await ensureTestAccounts(prisma);

    expect(ensured).toBe(10);
    const calls = prisma._spies.userUpsert.mock.calls as unknown as Array<
      [{ where: { email: string }; update: Record<string, unknown>; create: Record<string, unknown> }]
    >;
    expect(calls).toHaveLength(10);
    for (const [args] of calls) {
      // One easy password for all — the SAME hash everywhere.
      expect(args.update.passwordHash).toBe('test-hash');
      expect(args.update.isActive).toBe(true);
      expect(args.update.failedLoginCount).toBe(0);
      expect(args.update.lockedUntil).toBeNull();
      // The create branch carries the documented role + email.
      expect(args.create.email).toBe(args.where.email);
      expect(args.create.passwordHash).toBe('test-hash');
    }
  });

  it('heals the governance scope: scopeFacultyId ONLY for the faculty registrar', async () => {
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const byEmail = (email: string) =>
      (prisma._spies.userUpsert.mock.calls as unknown as Array<
        [{ where: { email: string }; update: { scopeFacultyId: string | null } }]
      >).find(([args]) => args.where.email === email)!;

    expect(byEmail('faculty@test.ly')[0].update.scopeFacultyId).toBe('fac-zawia-it');
    expect(byEmail('registrar@test.ly')[0].update.scopeFacultyId).toBeNull();
    expect(byEmail('student@test.ly')[0].update.scopeFacultyId).toBeNull();
  });

  it('heals the DISPLAY NAME too (a row created by an older table self-converges)', async () => {
    /* The production drift this pins: registrar@test.ly was created
     * 2026-10-26 by the first ensure pass while ACCOUNT_PROFILES still
     * carried the pre-rename «إدارة الجامعة»; the update branch then
     * touched only the password, so the dead name lived on in the
     * topbar forever. The heal branch must converge BOTH branches on
     * the canonical profile — name included. */
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const calls = prisma._spies.userUpsert.mock.calls as unknown as Array<
      [
        {
          where: { email: string };
          update: { firstName?: string; lastName?: string; avatarInitials?: string };
          create: { firstName?: string; lastName?: string; avatarInitials?: string };
        },
      ]
    >;
    expect(calls).toHaveLength(10);
    for (const [args] of calls) {
      const canonical = CANONICAL_NAMES[args.where.email]!;
      // The heal branch converges the row on the canonical name.
      expect(args.update).toMatchObject({
        firstName: canonical.first,
        lastName: canonical.last,
        avatarInitials: canonical.initials,
      });
      // …and the create branch never disagrees (ONE canonical profile).
      expect(args.create).toMatchObject({
        firstName: canonical.first,
        lastName: canonical.last,
        avatarInitials: canonical.initials,
      });
    }
  });

  it('renders the registrar as «المسجل العام» — no «إدارة» in ANY test-account name', async () => {
    /* RENAME-LEDGER row prisma/seed.ts:342-356 (c1-RENAME) prescribed
     * «المسجل العام» for the demo ADMIN; this twin table must agree.
     * The rename mission: «إدارة» never appears as a role-ish label a
     * human reads — the topbar greeting included. */
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const calls = prisma._spies.userUpsert.mock.calls as unknown as Array<
      [{ where: { email: string }; update: { firstName: string; lastName: string } }]
    >;
    const byEmail = (email: string) => calls.find(([a]) => a.where.email === email)![0];

    expect(byEmail('registrar@test.ly').update).toMatchObject({
      firstName: 'المسجل',
      lastName: 'العام',
    });
    for (const [args] of calls) {
      expect(`${args.update.firstName} ${args.update.lastName}`).not.toContain('إدارة');
      expect(`${args.update.firstName} ${args.update.lastName}`).not.toContain('الادارة');
    }
  });

  it('creates a membership for everyone EXCEPT the platform owner', async () => {
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const memberEmails = (prisma._spies.membershipUpsert.mock.calls as unknown as Array<
      [{ where: { userId_institutionId: { userId: string } } }]
    >).map(([args]) => args.where.userId_institutionId.userId.replace(/^u-/, ''));
    expect(memberEmails).toHaveLength(9);
    expect(memberEmails).not.toContain('owner@test.ly');
    expect(memberEmails).toContain('student2@test.ly'); // the second institution
  });

  it('writes the academic position on teacher-profile create (head/dean/vice-dean)', async () => {
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const created = (prisma._spies.teacherProfileCreate.mock.calls as unknown as Array<
      [{ data: { position?: string } }]
    >).map(([args]) => args.data.position);
    expect(created).toEqual(
      expect.arrayContaining(['DEPARTMENT_HEAD', 'DEAN', 'ASSOCIATE_DEAN']),
    );
    // The plain teacher has NO position.
    expect(created.filter(Boolean)).toHaveLength(3);
  });

  it('heals positional drift on re-runs (the job table is the truth)', async () => {
    const prisma = makePrisma();
    // Existing teacher profiles for every TEACHER account → the heal path.
    (prisma.teacherProfile as unknown as { findFirst: ReturnType<typeof vi.fn> }).findFirst =
      vi.fn(async () => ({ id: 'tp-existing' }));
    await ensureTestAccounts(prisma);

    const healed = (prisma._spies.teacherProfileUpdate.mock.calls as unknown as Array<
      [{ where: { id: string }; data: { position?: string } }]
    >).map(([args]) => args.data.position);
    expect(healed).toEqual(
      expect.arrayContaining(['DEPARTMENT_HEAD', 'DEAN', 'ASSOCIATE_DEAN']),
    );
    // Plain teacher: no update with a position (create path never ran).
    expect(prisma._spies.teacherProfileCreate).not.toHaveBeenCalled();
  });

  it('allocates a FREE reg number only (never steals an existing one)', async () => {
    const prisma = makePrisma();
    await ensureTestAccounts(prisma);

    const created = (prisma._spies.studentProfileCreate.mock.calls as unknown as Array<
      [{ data: { universityId: string; institutionId: string } }]
    >).map(([args]) => args.data);
    expect(created).toHaveLength(2); // student + student2

    // First candidate free → allocated.
    expect(created).toContainEqual(
      expect.objectContaining({ universityId: 'UZ-2024-00001', institutionId: 'inst-zawia-showcase' }),
    );
    // student2's first candidate (UZ-2024-00001) is taken in the OTHER
    // institution — institution-scoped uniqueness means it is free for
    // مؤسسة الأندلس (the corpus seed relies on exactly this).
    expect(created).toContainEqual(
      expect.objectContaining({ universityId: 'UZ-2024-00001', institutionId: 'inst-alandalus-demo' }),
    );

    // Both candidates taken → NO profile is created (never renumbers).
    const taken = makePrisma();
    (taken.studentProfile as unknown as { findUnique: ReturnType<typeof vi.fn> }).findUnique =
      vi.fn(async () => ({ id: 'someone-elses' }));
    await ensureTestAccounts(taken);
    expect(taken._spies.studentProfileCreate).not.toHaveBeenCalled();
  });
});

/* Fresh-mock hygiene: ensureTestAccounts is invoked in several tests;
 * the per-test makePrisma() delegates are always fresh instances. */
beforeEach(() => {
  vi.clearAllMocks();
});
