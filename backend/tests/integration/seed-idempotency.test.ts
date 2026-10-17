/**
 * DB integration — r182 (stage 09-C): the deploy-time seed is
 * SAFE TO REPEAT. The root `npm run build` chains `db:deploy` →
 * `db:seed` on EVERY Render deploy (r180), so the seed's repeat
 * contract is a production safety property, not a dev convenience:
 * mission stage 09-C requires testing that repeat deployment/build
 * behavior "does not reset user credentials or modify established
 * user-managed data" beyond the deliberately documented demo-reset.
 *
 * The seed is executed here EXACTLY the way production executes it —
 * a real subprocess of `tsx prisma/seed.ts` with the suite's
 * DATABASE_URL — never an import (the deploy path is a child
 * process; importing would test a different code path).
 *
 * The pinned contract (seed.ts header + docs/12-deployment.md):
 *   1. Repeat runs never duplicate core entities (upserts by
 *      slug/email/code — institution/faculty/user counts stay
 *      stable across runs).
 *   2. User-managed academic progress SURVIVES repeat runs
 *      (WatchEvent rows, Grade rows — the r180 create-only
 *      rewrite; nothing is wiped).
 *   3. Only the documented demo accounts get their passwords reset
 *      to the published demo value; a NON-demo user's password is
 *      never touched by a redeploy.
 *
 *   what                 | run 1 (fresh) | run 2 (repeat)
 *   ---------------------+---------------+------------------------
 *   institutions         | created       | SAME rows (no dupes)
 *   demo users           | created       | SAME rows (no dupes)
 *   WatchEvent/Grade     | —             | PRESERVED (created by
 *   (user-managed)       |               |  the test between runs)
 *   demo password        | Madarek2026!  | RESET to Madarek2026!
 *   (student@zu.edu.ly)  |               |  (documented contract)
 *   real-user password   | —             | UNCHANGED (never reset)
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

/** Run the seed as a real subprocess — the production deploy path. */
function runSeed(): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, ['--import', 'tsx', seedPath], {
      cwd: backendRoot,
      env: process.env,
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
      expect(slugs).toContain('zawia-showcase');

      const student = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@zu.edu.ly' },
      });
      expect(student.role).toBe('STUDENT');
      // The documented demo credential actually verifies.
      await expect(verifyPassword(student.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);

      // Memberships: the multi-institution backbone (r178) — the demo
      // student belongs to zawia-showcase, and the OWNER deliberately
      // has NO membership (platform scope).
      const memberships = await prisma.membership.count();
      expect(memberships).toBeGreaterThanOrEqual(7);
      const owner = await prisma.user.findUniqueOrThrow({
        where: { email: 'owner@zu.edu.ly' },
      });
      const ownerMemberships = await prisma.membership.count({
        where: { userId: owner.id },
      });
      expect(ownerMemberships).toBe(0);
    },
  );

  it(
    'a REPEAT deploy preserves user-managed data, never touches non-demo credentials, and resets only the documented demo password',
    { timeout: 180_000 },
    async () => {
      await runSeed(); // deploy #1
      const prisma = db();

      // ── Simulate live usage between deploys ────────────────────────
      // (a) the operator rotated a demo account's password (r166c path
      //     documents this as a real production occurrence);
      const demo = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@zu.edu.ly' },
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

      // (3) The DEMO account's password is reset to the documented
      //     value (keeps the published demo credentials usable — the
      //     deliberate r180 contract; everything else is preserved).
      const demoAfter = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@zu.edu.ly' },
      });
      await expect(verifyPassword(demoAfter.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);
      await expect(verifyPassword(demoAfter.passwordHash, operatorPassword)).resolves.toBe(false);

      // (4) Repeat runs do not duplicate core entities (upserts).
      const facultyCountAfter = await prisma.faculty.count();
      expect(facultyCountAfter).toBe(facultyCountBefore);
      const userCountAfter = await prisma.user.count();
      expect(userCountAfter).toBe(userCountBefore); // realUser not duplicated, no new demo users
      const institutions = await prisma.institution.count();
      expect(institutions).toBe(2);
    },
  );
});
