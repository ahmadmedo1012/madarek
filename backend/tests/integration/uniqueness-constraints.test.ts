/**
 * DB integration — r171b: unique constraints + $transaction ROLLBACK
 * against a REAL disposable Postgres. The rollback half is the
 * atomicity evidence the documented gap asked for (docs/16: منطق
 * المعاملات) — a mocked prisma can only assert the route CALLED
 * $transaction, never that the database actually discards the writes
 * when one statement fails.
 *
 * Three constraints with real product meaning (schema.prisma):
 *   1. User.email             @unique            — one identity per email
 *   2. StudentProfile.universityId @unique       — one university id per account
 *   3. TrainingEnrollment     @@unique([userId, trackId]) — one enrollment per user per track
 *
 * Each block proves the same two things:
 *   a) the duplicate insert surfaces Prisma P2002 naming the field(s);
 *   b) a $transaction that first writes a VALID row and then hits the
 *      duplicate rejects, and the VALID row is NOT persisted — full
 *      rollback, not partial damage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { Prisma, Role } from '@prisma/client';
import { db, seedUser, truncateAll, uniqueSuffix } from './helpers.js';

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

describe('StudentProfile.universityId @unique — one university id per account', () => {
  async function seedStudentWithProfile(universityId: string): Promise<void> {
    const prisma = db();
    const faculty = await prisma.faculty.create({ data: { name: `كلية ${uniqueSuffix()}` } });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    const student = await seedUser({ role: Role.STUDENT });
    await prisma.studentProfile.create({
      data: { userId: student.id, universityId, facultyId: faculty.id, departmentId: department.id },
    });
  }

  it('a second profile with the same universityId throws P2002 naming universityId', async () => {
    const prisma = db();
    const universityId = `INT-${uniqueSuffix()}`;
    await seedStudentWithProfile(universityId);

    const faculty = await prisma.faculty.create({ data: { name: `كلية ${uniqueSuffix()}` } });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });

    const err = await prisma.studentProfile
      .create({
        data: {
          userId: (await seedUser({ role: Role.STUDENT })).id,
          universityId, // the duplicate
          facultyId: faculty.id,
          departmentId: department.id,
        },
      })
      .catch((e: unknown) => e);

    const known = asP2002(err);
    expect(String(known.meta?.target)).toContain('universityId');
    expect(await prisma.studentProfile.count({ where: { universityId } })).toBe(1);
  });

  it('a transaction [fresh profile + duplicate profile] rolls back the fresh profile too', async () => {
    const prisma = db();
    const takenId = `TAKEN-${uniqueSuffix()}`;
    const freshId = `FRESH-${uniqueSuffix()}`;
    await seedStudentWithProfile(takenId);

    const faculty = await prisma.faculty.create({ data: { name: `كلية ${uniqueSuffix()}` } });
    const department = await prisma.department.create({
      data: { name: `قسم ${uniqueSuffix()}`, facultyId: faculty.id },
    });
    const studentA = await seedUser({ role: Role.STUDENT });
    const studentB = await seedUser({ role: Role.STUDENT });

    await expect(
      prisma.$transaction([
        // VALID: studentA gets the fresh universityId
        prisma.studentProfile.create({
          data: { userId: studentA.id, universityId: freshId, facultyId: faculty.id, departmentId: department.id },
        }),
        // duplicate: studentB claims the already-taken id
        prisma.studentProfile.create({
          data: { userId: studentB.id, universityId: takenId, facultyId: faculty.id, departmentId: department.id },
        }),
      ]),
    ).rejects.toMatchObject({ code: 'P2002' });

    // Rollback evidence: studentA's VALID profile is GONE.
    expect(await prisma.studentProfile.findUnique({ where: { universityId: freshId } })).toBeNull();
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
