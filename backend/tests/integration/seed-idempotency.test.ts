/**
 * DB integration — r183: the deploy-time seed NEVER touches an
 * established database, and the demo reset is an explicit
 * operator-only act. The root `npm run build` chains `db:deploy` →
 * `db:seed` on EVERY Render deploy (r180), so the seed's deploy-time
 * contract is a production safety property, not a dev convenience.
 *
 * r183 contract (supersedes the r182 repeat-reset pin; R320 §C
 * amends clause 2 — see the table below):
 *   1. A FRESH install (no users) self-bootstraps: the seed runs the
 *      full create-only body — institutions, test accounts (documented
 *      password), memberships, academic demo content.
 *   2. A NORMAL redeploy of an ESTABLISHED database (users exist)
 *      skips the corpus body — ZERO writes — with ONE deliberate,
 *      documented exception (R320 §C): ensureTestAccounts() re-ensures
 *      the @test.ly set (password/lock-state/scope reset on exactly
 *      those rows). A rotated TEST-account password is reset to the
 *      published value; a REAL user's rotated password still survives
 *      and user-managed data is not even read for update.
 *   3. The deliberate demo reset — `MADAREK_SEED_FORCE=1` (npm run
 *      db:seed:force) — re-runs the create-only body: test passwords
 *      are reset to the published value, demo freshness refreshes,
 *      and ALL user-managed records (progress, grades, non-demo
 *      users) still survive.
 *
 * The seed is executed here EXACTLY the way production executes it —
 * a real subprocess of `tsx prisma/seed.ts` with the suite's
 * DATABASE_URL — never an import (the deploy path is a child
 * process; importing would test a different code path).
 *
 *   what                  | fresh install  | normal redeploy   | FORCE reset
 *   ----------------------+----------------+-------------------+------------
 *   institutions          | created        | untouched         | SAME rows
 *   test users (@test.ly) | created        | healed (§C only)  | SAME rows
 *   WatchEvent/Grade      | —              | PRESERVED         | PRESERVED
 *   (user-managed)        |                |                   |
 *   test password         | 12345678       | RESET to 12345678 | RESET to
 *   (student@test.ly)     |                | (the §C exception)| 12345678
 *   real-user password    | —              | survives          | UNCHANGED
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
// R320 §C — the published TEST password comes from the single source of
// truth (physically backend/src/modules/auth/test-accounts.data.ts,
// re-exported at the repo root as shared/testAccounts.ts).
import { TEST_PASSWORD } from '../../src/modules/auth/test-accounts.data.js';
import { db, truncateAll } from './helpers.js';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const seedPath = resolve(backendRoot, 'prisma/seed.ts');

/** The published TEST password (test-accounts.data.ts + SECRETS-REFERENCE). */
const DEMO_PASSWORD = TEST_PASSWORD;

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
    'a fresh deploy seeds the two demo institutions and the test accounts verify with the documented password',
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

      // R320 §C: the documented STUDENT account lives on @test.ly.
      const student = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@test.ly' },
      });
      expect(student.role).toBe('STUDENT');
      // The documented test credential actually verifies.
      await expect(verifyPassword(student.passwordHash, DEMO_PASSWORD)).resolves.toBe(true);

      // Memberships: the multi-institution backbone (r178) — the demo
      // student belongs to madarek-demo, and the OWNER deliberately
      // has NO membership (platform scope).
      const memberships = await prisma.membership.count();
      expect(memberships).toBeGreaterThanOrEqual(7);
      const owner = await prisma.user.findUniqueOrThrow({
        where: { email: 'owner@test.ly' },
      });
      const ownerMemberships = await prisma.membership.count({
        where: { userId: owner.id },
      });
      expect(ownerMemberships).toBe(0);
    },
  );

  it(
    'a REPEAT deploy (r183) writes NOTHING but the @test.ly exception — real users and their data survive untouched',
    { timeout: 180_000 },
    async () => {
      await runSeed(); // deploy #1
      const prisma = db();

      // ── Simulate live usage between deploys ────────────────────────
      // (a) the operator rotated a TEST account's password (r166c path
      //     documents this as a real production occurrence);
      const demo = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@test.ly' },
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

      // (3) R320 §C override of the r183 pin: the TEST account's
      //     password IS reset by a normal redeploy — ensureTestAccounts()
      //     is the ONE deliberate, documented exception to the
      //     established-DB zero-writes rule, and it touches ONLY the
      //     @test.ly rows (the operator's rotated value does not survive
      //     for THIS account; a REAL user's does — see (2) above).
      const demoAfter = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@test.ly' },
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

  it(
    'the DELIBERATE force path (MADAREK_SEED_FORCE=1) resets only the demo credentials and still preserves everything else',
    { timeout: 180_000 },
    async () => {
      await runSeed(); // deploy #1 — fresh bootstrap
      const prisma = db();

      // Same live-usage simulation as the redeploy test.
      const demo = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@test.ly' },
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

      // (1) Test credential reset to the documented value — the ONE
      //     deliberate repeating write of the force path (the §C ensure
      //     pass resets the same rows on every path).
      const demoAfter = await prisma.user.findUniqueOrThrow({
        where: { email: 'student@test.ly' },
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
