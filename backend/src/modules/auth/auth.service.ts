import { Role, type User } from '@prisma/client';
import { prisma } from '../../db.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const arabicInitials = (firstName: string, lastName: string) => {
  const f = firstName.trim()[0] ?? '';
  const l = lastName.trim()[0] ?? '';
  return (f + l).slice(0, 2);
};

const sanitize = (u: User) => ({
  id: u.id,
  email: u.email,
  role: u.role,
  firstName: u.firstName,
  lastName: u.lastName,
  avatarColor: u.avatarColor,
  avatarInitials: u.avatarInitials,
  scopeFacultyId: u.scopeFacultyId ?? null,
  // 012-design-graphics-uplift — presentation preferences (no PII).
  themePreference: u.themePreference,
  themePreferenceUpdatedAt: u.themePreferenceUpdatedAt,
  onboardingCompletedAt: u.onboardingCompletedAt,
  firedMilestones: u.firedMilestones,
  createdAt: u.createdAt,
});

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  // Profile fields:
  facultyId?: string;
  departmentId?: string;
  universityId?: string;
  year?: number;
  specialty?: string;
  rank?: string;
}

export const registerUser = async (input: RegisterInput) => {
  // Defensive guard: even if the DTO drifted, never let public registration mint
  // ADMIN / QUALITY / OWNER accounts. Those are invitation-only.
  if (input.role !== Role.STUDENT && input.role !== Role.TEACHER) {
    throw AppError.forbidden('This role is invitation-only. Contact an administrator.');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('Email already registered');

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarInitials: arabicInitials(input.firstName, input.lastName),
        avatarColor: '#4F8EF7',
      },
    });

    if (input.role === Role.STUDENT) {
      if (!input.facultyId || !input.departmentId || !input.universityId) {
        throw AppError.badRequest('Student profile requires facultyId, departmentId, universityId');
      }
      await tx.studentProfile.create({
        data: {
          userId: created.id,
          universityId: input.universityId,
          facultyId: input.facultyId,
          departmentId: input.departmentId,
          year: input.year ?? 1,
        },
      });
    }
    if (input.role === Role.TEACHER) {
      if (!input.departmentId || !input.specialty) {
        throw AppError.badRequest('Teacher profile requires departmentId and specialty');
      }
      // Note: `position` (Dean / Dept Head / Associate Dean) is intentionally
      // NOT settable via self-serve registration. Appointments are made by an
      // administrator, never claimed at signup.
      await tx.teacherProfile.create({
        data: {
          userId: created.id,
          specialty: input.specialty,
          rank: (input.rank as never) ?? 'LECTURER',
          departmentId: input.departmentId,
        },
      });
    }
    return created;
  });

  return issueTokens(user);
};

export const loginUser = async (email: string, password: string) => {
  // Identifier may be an email OR a university registration number.
  // We discriminate by '@' presence — emails always contain it, reg-numbers don't.
  const identifier = email.trim();
  let user;
  if (identifier.includes('@')) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    // Reg-number path: look up StudentProfile.universityId, return its parent User.
    const profile = await prisma.studentProfile.findUnique({
      where: { universityId: identifier },
      include: { user: true },
    });
    user = profile?.user ?? null;
  }
  if (!user) throw AppError.invalidCredentials();

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw AppError.tooMany('Account temporarily locked. Try again later.');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const failed = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failed,
        lockedUntil:
          failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    throw AppError.invalidCredentials();
  }

  if (!user.isActive) throw AppError.forbidden('Account disabled');

  // Reset failure counters
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  return issueTokens(user);
};

export const refreshTokens = async (refreshToken: string) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthenticated('Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw AppError.unauthenticated();
  if (user.tokenVersion !== payload.ver) throw AppError.unauthenticated('Refresh token revoked');

  // Rotate: bump tokenVersion so the old refresh becomes invalid.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });
  return issueTokens(updated);
};

export const logoutUser = async (userId: string) => {
  // Revoke all refresh tokens by bumping the version.
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
};

export const getCurrentUser = async (userId: string) => {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: { include: { faculty: true, department: true } },
      teacherProfile: {
        include: {
          department: true,
          positionFaculty: true,
          positionDepartment: true,
        },
      },
      scopeFaculty: true,
    },
  });
  if (!u) throw AppError.notFound('User not found');
  return {
    ...sanitize(u),
    scopeFaculty: u.scopeFaculty
      ? { id: u.scopeFaculty.id, name: u.scopeFaculty.name }
      : null,
    studentProfile: u.studentProfile,
    teacherProfile: u.teacherProfile,
  };
};

const issueTokens = (user: User) => {
  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);
  return { user: sanitize(user), accessToken, refreshToken };
};
