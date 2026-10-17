/**
 * Backend unit test — r178 (multi-institution foundation) session
 * context semantics in `modules/auth/auth.service.ts` +
 * `http/middleware/institution.ts` + `lib/permissions.ts`.
 *
 * DB-free: prisma and argon2 are mocked (the auth-rotation /
 * auth-login-timing patterns); jsonwebtoken runs REAL sign/verify
 * against the deterministic test-mode secrets so the `inst` claim is
 * asserted on genuine tokens.
 *
 * Pins:
 *  1. login context resolution — exactly ONE active membership →
 *     auto-selected (inst claim + currentInstitution + membershipRole);
 *     several → inst null + full membership list; zero → inst null;
 *  2. reg-number login is institution-scoped: >1 hit → 400
 *     REG_NUMBER_AMBIGUOUS; institutionSlug narrows the lookup;
 *  3. selectInstitution only mints tokens for a VERIFIED active
 *     membership — non-members get 403 INSTITUTION_CONTEXT_INVALID;
 *  4. registerUser enforces the academic chain INSIDE the institution
 *     (faculty→institution, department→faculty) before creating the
 *     Membership + profile; the minted token carries the institution;
 *  5. requireInstitution: 403 INSTITUTION_CONTEXT_REQUIRED without a
 *     context, 403 INSTITUTION_CONTEXT_INVALID without a DB-confirmed
 *     membership, attaches req.membership/institution/profiles when
 *     confirmed;
 *  6. getEffectiveCapabilities: institution context widens the
 *     UserPermission filter to scoped + global rows; contextless
 *     sessions see global grants only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Membership, Role, User } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed'),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findMany: vi.fn(), create: vi.fn() },
    teacherProfile: { create: vi.fn() },
    membership: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    institution: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    faculty: { findUnique: vi.fn() },
    department: { findUnique: vi.fn() },
    userPermission: { findMany: vi.fn() },
    rolePermission: { findMany: vi.fn() },
    loginEvent: { create: vi.fn(async () => ({})) },
    // Interactive-transaction caller: hand the mock prisma itself as tx
    // so tx.institution.findUnique etc. hit the same spied delegates.
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  },
  withRetry: vi.fn(),
}));

import { prisma } from '../../src/db.js';
import { verifyAccessToken } from '../../src/lib/jwt.js';
import {
  loginUser,
  registerUser,
  selectInstitution,
  getCurrentUser,
} from '../../src/modules/auth/auth.service';
import { requireInstitution } from '../../src/http/middleware/institution';
import { getEffectiveCapabilities } from '../../src/lib/permissions';

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'student@zu.edu.ly',
    passwordHash: 'real-hash',
    role: 'STUDENT',
    firstName: 'أحمد',
    lastName: 'المستخدم',
    avatarColor: '#4F8EF7',
    avatarInitials: 'أم',
    isActive: true,
    failedLoginCount: 0,
    lockedUntil: null,
    tokenVersion: 0,
    scopeFacultyId: null,
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: null,
    onboardingCompletedAt: null,
    firedMilestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as User;

const makeMembership = (overrides: {
  institutionId: string;
  role?: Role;
  userId?: string;
}) =>
  ({
    id: `mem-${overrides.institutionId}`,
    userId: overrides.userId ?? 'user-1',
    institutionId: overrides.institutionId,
    role: overrides.role ?? 'STUDENT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    institution: {
      id: overrides.institutionId,
      name: 'جامعة الزاوية',
      nameEn: 'University of Zawia',
      slug: 'zawia-showcase',
      status: 'ACTIVE',
    },
  }) as unknown as Membership & { institution: { slug: string; name: string } };

beforeEach(() => {
  // clearAllMocks clears call history (implementations persist), so
  // every per-test value is re-armed here or inside the test itself —
  // the auth-rotation.test.ts house pattern.
  vi.clearAllMocks();
  vi.mocked(prisma.membership.findMany).mockResolvedValue([]);
  vi.mocked(prisma.rolePermission.findMany).mockResolvedValue([]);
  vi.mocked(prisma.userPermission.findMany).mockResolvedValue([]);
  vi.mocked(prisma.user.update).mockResolvedValue(makeUser());
});

// ─────────────────────────────────────────────────────────────────────
// loginUser — institution context resolution
// ─────────────────────────────────────────────────────────────────────
describe('loginUser — session institution context', () => {
  it('auto-selects the ONLY active membership (inst claim + currentInstitution + membershipRole)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      makeMembership({ institutionId: 'inst-zawia-showcase' }),
    ]);

    const { user, accessToken } = await loginUser('student@zu.edu.ly', 'Madarek2026!');

    expect(verifyAccessToken(accessToken).inst).toBe('inst-zawia-showcase');
    expect(user.memberships).toEqual([
      {
        institutionId: 'inst-zawia-showcase',
        name: 'جامعة الزاوية',
        nameEn: 'University of Zawia',
        slug: 'zawia-showcase',
        role: 'STUDENT',
        isActive: true,
      },
    ]);
    expect(user.currentInstitution).toMatchObject({ id: 'inst-zawia-showcase', slug: 'zawia-showcase' });
    expect(user.membershipRole).toBe('STUDENT');
  });

  it('multiple memberships → NO context (inst null, client must select-institution)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      makeMembership({ institutionId: 'inst-zawia-showcase' }),
      makeMembership({ institutionId: 'inst-alandalus-demo', role: 'TEACHER' }),
    ]);

    const { user, accessToken } = await loginUser('student@zu.edu.ly', 'Madarek2026!');

    expect(verifyAccessToken(accessToken).inst).toBeNull();
    expect(user.currentInstitution).toBeNull();
    expect(user.membershipRole).toBeNull();
    // Both options are listed so the client can render the picker.
    expect(user.memberships).toHaveLength(2);
  });

  it('zero memberships (platform-only user) → inst null + empty list', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser({ role: 'OWNER' }));
    vi.mocked(prisma.membership.findMany).mockResolvedValue([]);

    const { user, accessToken } = await loginUser('owner@zu.edu.ly', 'Madarek2026!');

    expect(verifyAccessToken(accessToken).inst).toBeNull();
    expect(user.memberships).toEqual([]);
    expect(user.currentInstitution).toBeNull();
    expect(user.membershipRole).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// loginUser — reg-number disambiguation (institution-scoped uniqueness)
// ─────────────────────────────────────────────────────────────────────
describe('loginUser — reg-number across institutions', () => {
  const zawiaStudent = makeUser({ id: 'zawia-user', email: 'student@zu.edu.ly' });
  const alandalusStudent = makeUser({ id: 'alandalus-user', email: 'student2@demo.madarek.ly' });
  const profile = (user: User, institutionId: string) => ({
    id: `sp-${user.id}`,
    userId: user.id,
    membershipId: `mem-${user.id}`,
    institutionId,
    universityId: 'UZ-2024-00001',
    facultyId: 'fac-1',
    departmentId: 'dept-1',
    user,
  });

  it('the same reg-number in 2 institutions → 400 REG_NUMBER_AMBIGUOUS with the Arabic guidance', async () => {
    vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([
      profile(zawiaStudent, 'inst-zawia-showcase') as never,
      profile(alandalusStudent, 'inst-alandalus-demo') as never,
    ]);

    await expect(loginUser('UZ-2024-00001', 'Madarek2026!')).rejects.toMatchObject({
      code: 'REG_NUMBER_AMBIGUOUS',
      status: 400,
      message: 'الرقم الجامعي مسجّل في أكثر من مؤسسة — سجّل الدخول بالبريد الإلكتروني أو حدّد المؤسسة',
    });
    // The ambiguity is telemetry-visible too.
    expect(prisma.loginEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ success: false, reason: 'REG_NUMBER_AMBIGUOUS' }),
      }),
    );
  });

  it('institutionSlug narrows the lookup to one profile → login succeeds for that user', async () => {
    vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([
      profile(zawiaStudent, 'inst-zawia-showcase') as never,
    ]);

    const { user, accessToken } = await loginUser(
      'UZ-2024-00001',
      'Madarek2026!',
      {},
      'zawia-showcase',
    );

    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          universityId: 'UZ-2024-00001',
          institution: { slug: 'zawia-showcase' },
        }),
      }),
    );
    expect(user.id).toBe('zawia-user');
    expect(verifyAccessToken(accessToken).sub).toBe('zawia-user');
  });

  it('a reg-number with zero hits keeps the not-found path (INVALID_CREDENTIALS)', async () => {
    vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([]);

    await expect(loginUser('UZ-9999-99999', 'Madarek2026!')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      status: 401,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// selectInstitution — server-side membership verification
// ─────────────────────────────────────────────────────────────────────
describe('selectInstitution', () => {
  it('rejects a non-member (403 INSTITUTION_CONTEXT_INVALID) — the token never grants what the DB denies', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      makeMembership({ institutionId: 'inst-zawia-showcase' }),
    ]);

    await expect(selectInstitution('user-1', 'inst-alandalus-demo')).rejects.toMatchObject({
      code: 'INSTITUTION_CONTEXT_INVALID',
      status: 403,
      message: 'عضوية المؤسسة غير نشطة أو غير صالحة',
    });
  });

  it('mints a session carrying the selected institution (same membershipRole)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(makeUser());
    vi.mocked(prisma.membership.findMany).mockResolvedValue([
      makeMembership({ institutionId: 'inst-zawia-showcase' }),
      makeMembership({ institutionId: 'inst-alandalus-demo', role: 'TEACHER' }),
    ]);

    const { user, accessToken } = await selectInstitution('user-1', 'inst-alandalus-demo');

    expect(verifyAccessToken(accessToken).inst).toBe('inst-alandalus-demo');
    expect(user.currentInstitution).toMatchObject({ id: 'inst-alandalus-demo' });
    expect(user.membershipRole).toBe('TEACHER');
  });
});

// ─────────────────────────────────────────────────────────────────────
// registerUser — academic chain must resolve INSIDE the institution
// ─────────────────────────────────────────────────────────────────────
describe('registerUser — institution chain consistency', () => {
  const BASE = {
    email: 'new.student@zu.edu.ly',
    password: 'Madarek2026!',
    firstName: 'سالم',
    lastName: 'الفيتوري',
    role: 'STUDENT' as const,
    institutionId: 'inst-zawia-showcase',
    facultyId: 'fac-1',
    departmentId: 'dept-1',
    universityId: 'UZ-2024-00999',
  };

  const armHappyChain = () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({
      id: 'inst-zawia-showcase',
      name: 'جامعة الزاوية',
      nameEn: 'University of Zawia',
      slug: 'zawia-showcase',
      status: 'ACTIVE',
    } as never);
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
      id: 'fac-1',
      institutionId: 'inst-zawia-showcase',
    } as never);
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: 'dept-1',
      facultyId: 'fac-1',
    } as never);
    vi.mocked(prisma.user.create).mockResolvedValue(makeUser({ id: 'new-user' }));
    vi.mocked(prisma.membership.create).mockResolvedValue(
      makeMembership({ institutionId: 'inst-zawia-showcase', userId: 'new-user' }),
    );
  };

  it('creates Membership + StudentProfile linked to the membership and mints an institution-scoped token', async () => {
    armHappyChain();

    const { user, accessToken } = await registerUser(BASE);

    expect(verifyAccessToken(accessToken).inst).toBe('inst-zawia-showcase');
    expect(user.memberships).toHaveLength(1);
    expect(user.memberships[0]).toMatchObject({
      institutionId: 'inst-zawia-showcase',
      role: 'STUDENT',
    });
    expect(user.currentInstitution).toMatchObject({ id: 'inst-zawia-showcase' });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: {
        userId: 'new-user',
        institutionId: 'inst-zawia-showcase',
        role: 'STUDENT',
        isActive: true,
      },
    });
    expect(prisma.studentProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'new-user',
        membershipId: 'mem-inst-zawia-showcase',
        institutionId: 'inst-zawia-showcase',
        universityId: 'UZ-2024-00999',
        facultyId: 'fac-1',
        departmentId: 'dept-1',
      }),
    });
  });

  it('rejects a faculty belonging to ANOTHER institution (400)', async () => {
    armHappyChain();
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
      id: 'fac-1',
      institutionId: 'inst-alandalus-demo',
    } as never);

    await expect(registerUser(BASE)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'الكلّيّة المحددة لا تنتمي إلى هذه المؤسسة',
    });
    expect(prisma.membership.create).not.toHaveBeenCalled();
  });

  it('rejects a department belonging to ANOTHER faculty (400 — the r152b guard survives)', async () => {
    armHappyChain();
    vi.mocked(prisma.department.findUnique).mockResolvedValue({
      id: 'dept-1',
      facultyId: 'fac-2',
    } as never);

    await expect(registerUser(BASE)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      status: 400,
      message: 'القسم المختار لا ينتمي إلى الكلّيّة المحددة',
    });
  });

  it('rejects unknown or SUSPENDED institutions (400)', async () => {
    armHappyChain();
    vi.mocked(prisma.institution.findUnique).mockResolvedValue({
      id: 'inst-x',
      status: 'SUSPENDED',
    } as never);
    await expect(registerUser(BASE)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'المؤسسة غير موجودة أو غير مفعّلة — تحقّق من اختيار المؤسسة',
    });

    vi.mocked(prisma.institution.findUnique).mockResolvedValue(null);
    await expect(registerUser(BASE)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('TEACHER chain: department→faculty must land in the registered institution', async () => {
    armHappyChain();
    vi.mocked(prisma.faculty.findUnique).mockResolvedValue({
      id: 'fac-9',
      institutionId: 'inst-alandalus-demo',
    } as never);

    await expect(
      registerUser({
        ...BASE,
        role: 'TEACHER',
        specialty: 'هندسة البرمجيات',
        departmentId: 'dept-1',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'قسم التخصص لا ينتمي إلى هذه المؤسسة',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// getCurrentUser — membership-scoped profiles
// ─────────────────────────────────────────────────────────────────────
describe('getCurrentUser — profiles scoped to the CURRENT membership', () => {
  it('returns the current membership\'s studentProfile + context fields', async () => {
    const studentProfile = { id: 'sp-1', universityId: 'UZ-2024-00001', year: 2 };
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...makeUser(),
      scopeFaculty: null,
      memberships: [
        {
          ...makeMembership({ institutionId: 'inst-zawia-showcase' }),
          studentProfiles: [studentProfile],
          teacherProfiles: [],
        },
      ],
    } as never);

    const me = await getCurrentUser('user-1', 'inst-zawia-showcase');

    expect(me.memberships).toHaveLength(1);
    expect(me.currentInstitution).toMatchObject({ id: 'inst-zawia-showcase' });
    expect(me.membershipRole).toBe('STUDENT');
    expect(me.studentProfile).toMatchObject({ id: 'sp-1', universityId: 'UZ-2024-00001' });
    expect(me.teacherProfile).toBeNull();
  });

  it('no context (inst null) → no profiles, currentInstitution null', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...makeUser(),
      scopeFaculty: null,
      memberships: [
        {
          ...makeMembership({ institutionId: 'inst-zawia-showcase' }),
          studentProfiles: [{ id: 'sp-1' }],
          teacherProfiles: [],
        },
      ],
    } as never);

    const me = await getCurrentUser('user-1', null);

    expect(me.studentProfile).toBeNull();
    expect(me.teacherProfile).toBeNull();
    expect(me.currentInstitution).toBeNull();
    expect(me.membershipRole).toBeNull();
    // The selectable list is still there.
    expect(me.memberships).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// requireInstitution — DB-resolved institution context gate
// ─────────────────────────────────────────────────────────────────────
describe('requireInstitution middleware', () => {
  const run = (req: Record<string, unknown>) => {
    const next = vi.fn();
    requireInstitution(req as never, {} as never, next);
    return { next, req };
  };

  it('403 INSTITUTION_CONTEXT_REQUIRED when the session has no institution context', () => {
    const { next } = run({ user: { id: 'user-1', role: 'STUDENT', institutionId: null } });
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0] as { code: string; status: number; message: string };
    expect(err.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(err.status).toBe(403);
    expect(err.message).toBe('حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة');
  });

  it('403 INSTITUTION_CONTEXT_INVALID when the DB finds no active membership (forged/stale inst claim)', async () => {
    vi.mocked(prisma.membership.findFirst).mockResolvedValue(null);
    const { next } = run({ user: { id: 'user-1', role: 'STUDENT', institutionId: 'inst-evil' } });
    // The middleware is async — let the DB promise settle.
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));
    const err = next.mock.calls[0]?.[0] as { code: string; status: number };
    expect(err.code).toBe('INSTITUTION_CONTEXT_INVALID');
    expect(err.status).toBe(403);
  });

  it('attaches req.membership / req.institution / membership-scoped profiles when confirmed', async () => {
    const institution = { id: 'inst-zawia-showcase', name: 'جامعة الزاوية', status: 'ACTIVE' };
    const studentProfile = { id: 'sp-1', universityId: 'UZ-2024-00001' };
    vi.mocked(prisma.membership.findFirst).mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      institutionId: 'inst-zawia-showcase',
      role: 'STUDENT',
      isActive: true,
      institution,
      studentProfiles: [studentProfile],
      teacherProfiles: [],
    } as never);

    const req = { user: { id: 'user-1', role: 'STUDENT', institutionId: 'inst-zawia-showcase' } };
    const { next } = run(req);
    await vi.waitFor(() => expect(next).toHaveBeenCalledTimes(1));

    expect(next).toHaveBeenCalledWith(); // plain pass-through, no error
    // NEVER trust the token role: the attached membership comes from the DB.
    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        institutionId: 'inst-zawia-showcase',
        isActive: true,
        institution: { status: 'ACTIVE' },
      },
      include: { institution: true, studentProfiles: true, teacherProfiles: true },
    });
    expect((req as { membership?: { id: string } }).membership?.id).toBe('mem-1');
    expect((req as { institution?: { id: string } }).institution?.id).toBe('inst-zawia-showcase');
    expect((req as { studentProfile?: { id: string } }).studentProfile?.id).toBe('sp-1');
    expect((req as { teacherProfile?: unknown }).teacherProfile).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// getEffectiveCapabilities — institution-scoped + global grants
// ─────────────────────────────────────────────────────────────────────
describe('getEffectiveCapabilities — UserPermission scope filter (r178)', () => {
  it('with an institution context: scoped + global grants both load (OR filter)', async () => {
    vi.mocked(prisma.userPermission.findMany).mockResolvedValue([
      { capability: 'QUALITY_VIEW', grant: true },
    ] as never);

    const caps = await getEffectiveCapabilities('user-1', 'ADMIN', 'inst-zawia-showcase');

    expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [{ institutionId: null }, { institutionId: 'inst-zawia-showcase' }],
      },
      select: { capability: true, grant: true },
    });
    expect(caps.has('QUALITY_VIEW')).toBe(true); // grant applied
  });

  it('contextless session: global grants ONLY (institutionId: null)', async () => {
    await getEffectiveCapabilities('user-1', 'ADMIN');

    expect(prisma.userPermission.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', institutionId: null },
      select: { capability: true, grant: true },
    });
  });
});
