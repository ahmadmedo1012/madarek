/**
 * DB integration — r183: the deploy-time seed NEVER touches an
 * established database, and the demo reset is an explicit
 * operator-only act. The root `npm run build` chains `db:deploy` →
 * `db:seed` on EVERY Render deploy (r180), so the seed's deploy-time
 * contract is a production safety property, not a dev convenience.
 *
 * r183 contract (supersedes the r182 repeat-reset pin):
 *   1. A FRESH install (no users) self-bootstraps: the seed runs the
 *      full create-only body — institutions, demo accounts (documented
 *      password), memberships, academic demo content.
 *   2. A NORMAL redeploy of an ESTABLISHED database (users exist)
 *      SKIPS the seed entirely — ZERO writes. A rotated demo password
 *      SURVIVES a redeploy (the r180 automatic reset is retired);
 *      user-managed data is not even read for update.
 *   3. The deliberate demo reset — `MADAREK_SEED_FORCE=1` (npm run
 *      db:seed:force) — re-runs the create-only body: demo passwords
 *      are reset to the published value, demo freshness refreshes,
 *      and ALL user-managed records (progress, grades, non-demo
 *      users) still survive.
 *
 * The seed is executed here EXACTLY the way production executes it —
 * a real subprocess of `tsx prisma/seed.ts` with the suite's
 * DATABASE_URL — never an import (the deploy path is a child
 * process; importing would test a different code path).
 *
 *   what                 | fresh install  | normal redeploy | FORCE reset
 *   ---------------------+----------------+-----------------+-------------
 *   institutions         | created        | untouched       | SAME rows
 *   demo users           | created        | untouched       | SAME rows
 *   WatchEvent/Grade     | —              | PRESERVED       | PRESERVED
 *   (user-managed)       |                |                 |
 *   demo password        | Madarek2026!   | NOT reset (an   | RESET to
 *   (student@demo.madarek.ly) |             | operator-       | Madarek2026!
 *   real-user password   | —              |  rotated value  | (documented)
 *                        |                |  survives)      | UNCHANGED
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { db, truncateAll } from './helpers.js';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const seedPath = resolve(backendRoot, 'prisma/seed.ts');

/** The published demo password (seed.ts header + docs/12). */
const DEMO_PASSWORD = 'Madarek2026!';

/**
 * Run the seed as a real subprocess — the production deploy path
 * (r183: pass force=true to run the MADAREK_SEED_FORCE=1 demo-reset
 * path exactly the way `npm run db:seed:force` runs it).
 */
function runSeed(force = false): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const env = { ...process.env };
    if (force) env.MADAREK_SEED_FORCE = '1';
    const child = spawn(process.execPath, ['--import', 'tsx', seedPath], {
      cwd: backendRoot,
      env,
      stdio: 'ignore',
    });
    child.on('error', rejectPromise);
    child.on('exit', (code) =>
      code === 0 ? resolvePromise() : rejectPromise(new Error(`seed subprocess exited ${code}`)),
    );
  });
}

describe('r182 — deploy-time seed repeat safety (stage 09-C)', () => {
  beforeEach(async () => {
    await truncateAll(db());
  });

  it(
    'a fresh deploy seeds the two demo institutions and the demo accounts verify with the documented password',
    { timeout: 90_000 },
    async () => {
      await runSeed();
      const prisma = db();

      const institutions = await prisma.institution.findMany({
        select: { slug: true },
      });
      const slugs = institutions.map((i) => i.slug).sort();
      expect(slugs).toContain('alandalus-demo');
      expect(slugs).toContain('madarek-demo');

      const student = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@demo.madarek.ly' },
      });
      expect(student.role).toBe('STUDENT');
      // The documented demo credential actually verifies.
      await expect(verifyPassword(student.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);

      // Memberships: the multi-institution backbone (r178) — the demo
      // student belongs to madarek-demo, and the OWNER deliberately
      // has NO membership (platform scope).
      const memberships = await prisma.membership.count();
      expect(memberships).toBeGreaterThanOrEqual(7);
      const owner = await prisma.user.findUniqueOrThrow({
        where: { email: 'owner@demo.madarek.ly' },
      });
      const ownerMemberships = await prisma.membership.count({
        where: { userId: owner.id },
      });
      expect(ownerMemberships).toBe(0);
    },
  );

  it(
    'a REPEAT deploy (r183) SKIPS the seed entirely — even a rotated demo password survives; zero writes',
    { timeout: 180_000 },
    async () => {
      await runSeed(); // deploy #1
      const prisma = db();

      // ── Simulate live usage between deploys ────────────────────────
      // (a) the operator rotated a demo account's password (r166c path
      //     documents this as a real production occurrence);
      const demo = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@demo.madarek.ly' },
      });
      const operatorPassword = `OpRotated-${Date.now()}-pw`;
      await prisma.user.update({
        where: { id: demo.id },
        data: { passwordHash: await hashPassword(operatorPassword) },
      });

      // (b) a REAL (non-demo) user exists with their own password —
      //     provisioned by the owner, invisible to the seed;
      const realPassword = `RealUser-${Date.now()}-pw`;
      const realUser = await prisma.user.create({
        data: {
          email: 'real-user@institution.test',
          firstName: 'مستخدم',
          lastName: 'خارج البذرة',
          role: 'STUDENT',
          passwordHash: await hashPassword(realPassword),
        },
      });

      // (c) user-managed academic progress exists (the exact class the
      //     pre-r180 seed used to wipe): a watch event + a grade.
      const lecture = await prisma.lecture.findFirstOrThrow();
      const watchEvent = await prisma.watchEvent.create({
        data: {
          studentId: demo.id,
          lectureId: lecture.id,
          watchedSec: 429,
          totalSec: 718,
        },
      });
      const offering = await prisma.courseOffering.findFirstOrThrow();
      const grade = await prisma.grade.create({
        data: {
          studentId: demo.id,
          offeringId: offering.id,
          kind: 'FINAL',
          score: 18,
          maxScore: 20,
        },
      });

      const facultyCountBefore = await prisma.faculty.count();
      const userCountBefore = await prisma.user.count();

      // ── Deploy #2: the build chain runs the seed AGAIN ────────────
      await runSeed();

      // (1) User-managed progress SURVIVED the redeploy.
      const watchAfter = await prisma.watchEvent.findUnique({
        where: { lectureId_studentId: { lectureId: watchEvent.lectureId, studentId: watchEvent.studentId } },
      });
      expect(watchAfter?.watchedSec).toBe(429);
      expect(watchAfter?.totalSec).toBe(718);
      const gradeAfter = await prisma.grade.findUnique({
        where: {
          offeringId_studentId_kind: {
            offeringId: grade.offeringId,
            studentId: grade.studentId,
            kind: 'FINAL',
          },
        },
      });
      expect(gradeAfter?.score?.toNumber()).toBe(18);

      // (2) The NON-demo user's credential is untouched by the redeploy.
      const realAfter = await prisma.user.findUniqueOrThrow({
        where: { email: realUser.email },
      });
      await expect(verifyPassword(realAfter.passwordHash, realPassword)).resolves.toBe(true);
      await expect(verifyPassword(realAfter.passwordHash, DEMO_PASSWORD)).resolves.toBe(false);

      // (3) r183: the DEMO account's password is NOT reset by a normal
      //     redeploy — the operator's rotated value survives (the r180
      //     automatic reset is retired; the reset is FORCE-only below).
      const demoAfter = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@demo.madarek.ly' },
      });
      await expect(verifyPassword(demoAfter.passwordHash, operatorPassword)).resolves.toBe(true);
      await expect(verifyPassword(demoAfter.passwordHash, DEMO_PASSWORD)).resolves.toBe(false);

      // (4) Repeat runs do not duplicate core entities (upserts).
      const facultyCountAfter = await prisma.faculty.count();
      expect(facultyCountAfter).toBe(facultyCountBefore);
      const userCountAfter = await prisma.user.count();
      expect(userCountAfter).toBe(userCountBefore); // realUser not duplicated, no new demo users
      const institutions = await prisma.institution.count();
      expect(institutions).toBe(2);
    },
  );

  it(
    'the DELIBERATE force path (MADAREK_SEED_FORCE=1) resets only the demo credentials and still preserves everything else',
    { timeout: 180_000 },
    async () => {
      await runSeed(); // deploy #1 — fresh bootstrap
      const prisma = db();

      // Same live-usage simulation as the redeploy test.
      const demo = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@demo.madarek.ly' },
      });
      const operatorPassword = `OpRotated-${Date.now()}-pw`;
      await prisma.user.update({
        where: { id: demo.id },
        data: { passwordHash: await hashPassword(operatorPassword) },
      });
      const realPassword = `RealUser-${Date.now()}-pw`;
      const realUser = await prisma.user.create({
        data: {
          email: 'real-user-force@institution.test',
          firstName: 'مستخدم',
          lastName: 'خارج البذرة',
          role: 'STUDENT',
          passwordHash: await hashPassword(realPassword),
        },
      });
      const lecture = await prisma.lecture.findFirstOrThrow();
      const watchEvent = await prisma.watchEvent.create({
        data: {
          studentId: demo.id,
          lectureId: lecture.id,
          watchedSec: 431,
          totalSec: 718,
        },
      });
      const offering = await prisma.courseOffering.findFirstOrThrow();
      const grade = await prisma.grade.create({
        data: {
          studentId: demo.id,
          offeringId: offering.id,
          kind: 'FINAL',
          score: 19,
          maxScore: 20,
        },
      });
      const userCountBefore = await prisma.user.count();
      const facultyCountBefore = await prisma.faculty.count();

      // The operator-invoked demo reset (npm run db:seed:force).
      await runSeed(true);

      // (1) Demo credential reset to the documented value — the ONE
      //     deliberate repeating write of the force path.
      const demoAfter = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@demo.madarek.ly' },
      });
      await expect(verifyPassword(demoAfter.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);
      await expect(verifyPassword(demoAfter.passwordHash, operatorPassword)).resolves.toBe(false);

      // (2) The NON-demo user's credential is untouched even by force.
      const realAfter = await prisma.user.findUniqueOrThrow({
        where: { email: realUser.email },
      });
      await expect(verifyPassword(realAfter.passwordHash, realPassword)).resolves.toBe(true);

      // (3) User-managed progress SURVIVED the force reset.
      const watchAfter = await prisma.watchEvent.findUnique({
        where: { lectureId_studentId: { lectureId: watchEvent.lectureId, studentId: watchEvent.studentId } },
      });
      expect(watchAfter?.watchedSec).toBe(431);
      const gradeAfter = await prisma.grade.findUnique({
        where: {
          offeringId_studentId_kind: {
            offeringId: grade.offeringId,
            studentId: grade.studentId,
            kind: 'FINAL',
          },
        },
      });
      expect(gradeAfter?.score?.toNumber()).toBe(19);

      // (4) No duplicate core entities.
      expect(await prisma.user.count()).toBe(userCountBefore);
      expect(await prisma.faculty.count()).toBe(facultyCountBefore);
      expect(await prisma.institution.count()).toBe(2);
    },
  );
});
