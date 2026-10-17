/**
 * DB integration — r171b: unique constraints + $transaction ROLLBACK
 * against a REAL disposable Postgres. The rollback half is the
 * atomicity evidence the documented gap asked for (docs/16: منطق
 * المعاملات) — a mocked prisma can only assert the route CALLED
 * $transaction, never that the database actually discards the writes
 * when one statement fails.
 *
 * Three constraints with real product meaning (schema.prisma):
 *   1. User.email                  @unique — one identity per email
 *   2. StudentProfile              @@unique([institutionId, universityId])
 *                                  — one reg-number per institution (r178:
 *                                  the same number may exist in several
 *                                  institutions; scope, not the bare column)
 *   3. TrainingEnrollment          @@unique([userId, trackId]) — one enrollment per user per track
 *
 * Each block proves the same two things:
 *   a) the duplicate insert surfaces Prisma P2002 naming the field(s);
 *   b) a $transaction that first writes a VALID row and then hits the
 *      duplicate rejects, and the VALID row is NOT persisted — full
 *      rollback, not partial damage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Prisma, Role } from '@prisma/client';
import { db, seedInstitution, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';
import type { Institution } from '@prisma/client';

beforeEach(async () => {
  await truncateAll(db());
});

/** Narrow the unknown catch to Prisma's typed known-error shape. */
function asP2002(err: unknown): Prisma.PrismaClientKnownRequestError {
  expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
  const known = err as Prisma.PrismaClientKnownRequestError;
  expect(known.code).toBe('P2002');
  return known;
}

describe('User.email @unique — identity integrity', () => {
  it('duplicate email insert throws P2002 naming the email field', async () => {
    const prisma = db();
    const email = `dupe-${uniqueSuffix()}@inttest.local`;
    await prisma.user.create({
      data: {
        email,
        passwordHash: 'x',
        role: Role.STUDENT,
        firstName: 'أ',
        lastName: 'ب',
      },
    });

    const err = await prisma.user
      .create({
        data: {
          email, // same email — the duplicate
          passwordHash: 'x',
          role: Role.STUDENT,
          firstName: 'ج',
          lastName: 'د',
        },
      })
      .catch((e: unknown) => e);

    const known = asP2002(err);
    expect(String(known.meta?.target)).toContain('email');
    // Only the first user exists — the duplicate never landed.
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });

  it('a transaction [valid user + duplicate user] rolls back the VALID user too', async () => {
    const prisma = db();
    const existingEmail = `base-${uniqueSuffix()}@inttest.local`;
    const freshEmail = `fresh-${uniqueSuffix()}@inttest.local`;
    await prisma.user.create({
      data: { email: existingEmail, passwordHash: 'x', role: Role.STUDENT, firstName: 'أ', lastName: 'ب' },
    });

    await expect(
      prisma.$transaction([
        // VALID write — would persist on its own:
        prisma.user.create({
          data: { email: freshEmail, passwordHash: 'x', role: Role.TEACHER, firstName: 'هـ', lastName: 'و' },
        }),
        // duplicate — dooms the batch:
        prisma.user.create({
          data: { email: existingEmail, passwordHash: 'x', role: Role.STUDENT, firstName: 'ز', lastName: 'ح' },
        }),
      ]),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Rollback evidence: the VALID first write is GONE.
    expect(await prisma.user.findUnique({ where: { email: freshEmail } })).toBeNull();
    expect(await prisma.user.count()).toBe(1);
  });
});

describe('StudentProfile @@unique([institutionId, universityId]) — one reg-number per institution (r178)', () => {
  /** A student + membership + profile claiming `universityId` inside
   * `inst` (r178: profiles hang off a membership and the uniqueness is
   * institution-scoped). */
  async function seedStudentWithProfile(universityId: string, inst: Institution): Promise<void> {
    const prisma = db();
    const faculty = await prisma.faculty.create({
      data: { name: `كلية ${uniqueSuffix()}`, city: 'طرابلس', institutionId: inst.id },
    });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    const student = await seedUser({ role: Role.STUDENT });
    const membership = await seedMembership(student.id, inst.id, Role.STUDENT);
    await prisma.studentProfile.create({
      data: {
        userId: student.id,
        membershipId: membership.id,
        institutionId: inst.id,
        universityId,
        facultyId: faculty.id,
        departmentId: department.id,
      },
    });
  }

  it('a second profile with the same universityId IN THE SAME institution throws P2002', async () => {
    const prisma = db();
    const universityId = `INT-${uniqueSuffix()}`;
    const inst = await seedInstitution();
    await seedStudentWithProfile(universityId, inst);

    const student = await seedUser({ role: Role.STUDENT });
    const membership = await seedMembership(student.id, inst.id, Role.STUDENT);
    const faculty = await prisma.faculty.create({
      data: { name: `كلية ${uniqueSuffix()}`, city: 'طرابلس', institutionId: inst.id },
    });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });

    const err = await prisma.studentProfile
      .create({
        data: {
          userId: student.id,
          membershipId: membership.id,
          institutionId: inst.id,
          universityId, // the duplicate within the SAME institution
          facultyId: faculty.id,
          departmentId: department.id,
        },
      })
      .catch((e: unknown) => e);

    const known = asP2002(err);
    const target = String(known.meta?.target);
    expect(target).toContain('universityId');
    expect(target).toContain('institutionId');
    expect(await prisma.studentProfile.count({ where: { universityId, institutionId: inst.id } })).toBe(1);
  });

  it('the SAME universityId in a SECOND institution lands — the r178 scoped-uniqueness proof', async () => {
    const prisma = db();
    const universityId = `SHARED-${uniqueSuffix()}`;
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    await seedStudentWithProfile(universityId, instA);
    // The same reg-number in institution B is NOT a duplicate anymore:
    // uniqueness is (institutionId, universityId) since r178.
    await seedStudentWithProfile(universityId, instB);

    expect(await prisma.studentProfile.count({ where: { universityId } })).toBe(2);
    expect(await prisma.studentProfile.count({ where: { universityId, institutionId: instA.id } })).toBe(1);
    expect(await prisma.studentProfile.count({ where: { universityId, institutionId: instB.id } })).toBe(1);
  });

  it('a transaction [fresh profile + duplicate profile] rolls back the fresh profile too', async () => {
    const prisma = db();
    const takenId = `TAKEN-${uniqueSuffix()}`;
    const freshId = `FRESH-${uniqueSuffix()}`;
    const inst = await seedInstitution();
    await seedStudentWithProfile(takenId, inst);

    const faculty = await prisma.faculty.create({
      data: { name: `كلية ${uniqueSuffix()}`, city: 'طرابلس', institutionId: inst.id },
    });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    const studentA = await seedUser({ role: Role.STUDENT });
    const studentB = await seedUser({ role: Role.STUDENT });
    const membershipA = await seedMembership(studentA.id, inst.id, Role.STUDENT);
    const membershipB = await seedMembership(studentB.id, inst.id, Role.STUDENT);

    await expect(
      prisma.$transaction([
        // VALID: studentA gets the fresh universityId
        prisma.studentProfile.create({
          data: {
            userId: studentA.id,
            membershipId: membershipA.id,
            institutionId: inst.id,
            universityId: freshId,
            facultyId: faculty.id,
            departmentId: department.id,
          },
        }),
        // duplicate: studentB claims the already-taken id in the SAME
        // institution (a second institution would NOT conflict — r178)
        prisma.studentProfile.create({
          data: {
            userId: studentB.id,
            membershipId: membershipB.id,
            institutionId: inst.id,
            universityId: takenId,
            facultyId: faculty.id,
            departmentId: department.id,
          },
        }),
      ]),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Rollback evidence: studentA's VALID profile is GONE.
    expect(await prisma.studentProfile.findFirst({ where: { universityId: freshId } })).toBeNull();
    expect(await prisma.studentProfile.count({ where: { userId: studentA.id } })).toBe(0);
  });
});

describe('TrainingEnrollment @@unique([userId, trackId]) — one enrollment per user per track', () => {
  async function seedTrack(): Promise<{ userId: string; trackId: string }> {
    const prisma = db();
    const student = await seedUser({ role: Role.STUDENT });
    const track = await prisma.trainingTrack.create({
      data: {
        slug: `track-${uniqueSuffix()}`,
        title: 'مسار اختبار',
        summary: 'ملخص',
        category: 'STUDY_SKILLS',
      },
    });
    await prisma.trainingEnrollment.create({ data: { userId: student.id, trackId: track.id } });
    return { userId: student.id, trackId: track.id };
  }

  it('re-enrolling the same user in the same track throws P2002 naming both composite fields', async () => {
    const prisma = db();
    const { userId, trackId } = await seedTrack();

    const err = await prisma.trainingEnrollment
      .create({ data: { userId, trackId } })
      .catch((e: unknown) => e);

    const known = asP2002(err);
    const target = String(known.meta?.target);
    expect(target).toContain('userId');
    expect(target).toContain('trackId');
    expect(await prisma.trainingEnrollment.count({ where: { userId, trackId } })).toBe(1);
  });

  it('a transaction [new user enrollment + duplicate enrollment] rolls back the new enrollment too', async () => {
    const prisma = db();
    const { userId, trackId } = await seedTrack();
    const otherStudent = await seedUser({ role: Role.STUDENT });

    await expect(
      prisma.$transaction([
        // VALID: a different user joins the track
        prisma.trainingEnrollment.create({ data: { userId: otherStudent.id, trackId } }),
        // duplicate: the original user re-enrolls
        prisma.trainingEnrollment.create({ data: { userId, trackId } }),
      ]),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Rollback evidence: the other student's VALID enrollment is GONE.
    expect(
      await prisma.trainingEnrollment.findFirst({ where: { userId: otherStudent.id, trackId } }),
    ).toBeNull();
    expect(await prisma.trainingEnrollment.count({ where: { trackId } })).toBe(1);
  });
});
