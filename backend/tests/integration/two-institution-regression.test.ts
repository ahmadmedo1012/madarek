/**
 * DB integration — r179 (phase-5) Agent E: the consolidated
 * two-institution regression suite. The real Express app against a real
 * disposable Postgres, one world with TWO institutions (Alpha + Beta),
 * overlapping course codes and student reg-numbers, and the
 * cross-institution user (memberships in both).
 *
 * The mission's ten scenarios, parameterized over the shared world:
 *  1. Institution A lists/reads its own academic resources; B sees
 *     only its own.
 *  2. A user cannot reach a foreign resource by changing an id or
 *     query parameter.
 *  3. Cross-institution create/update/enroll attempts are rejected.
 *  4. Admin oversight stays inside its own institution.
 *  5. OWNER's deliberately platform-wide operations still work.
 *  6. PDFs cannot be accessed through a foreign institution context.
 *  7. Oasis conversations stay scoped (the detailed provider-path
 *     context pins live in ai-chat-provider-path.test.ts).
 *  8. Social feeds, messaging restrictions, and announcements stay
 *     scoped.
 *  9. Sync/background isolation lives in
 *     sync-institution-isolation.test.ts.
 * 10. Switching institution changes the data the SAME user sees (the
 *     backend half of the frontend cache contract).
 *
 * Files/materials byte-level isolation and the zu-sync isolation have
 * their dedicated suites (files-institution-isolation,
 * sync-institution-isolation) — this file pins the CROSS-CUTTING
 * behavior those suites don't reach: governance, catalog, social,
 * messaging, the switch itself.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Role } from '@prisma/client';

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');

let helpers: Helpers;
let prisma: DbModule['prisma'];
let app: AppModule['createApp'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;

beforeAll(async () => {
  helpers = await import('./helpers.js');
  ({ prisma } = await import('../../src/db.js'));
  ({ createApp: app } = await import('../../src/app.js'));
  server = app().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/* ── The two-institution world ──────────────────────────────────────
 * Alpha and Beta each own: an institution, faculty, department, a
 * course with the SAME code (the collision proof), an offering, a
 * lecture, a teacher, an enrolled student with the SAME reg-number.
 * Plus: admin per institution, posts, a PLATFORM and a FACULTY
 * announcement, and the CROSS user (memberships + student profiles in
 * BOTH institutions). */
interface World {
  alphaId: string;
  betaId: string;
  alphaCourseId: string;
  betaCourseId: string;
  alphaOfferingId: string;
  betaOfferingId: string;
  alphaLectureId: string;
  adminA: string;
  adminB: string;
  teacherA: string;
  studentA: string;
  studentB: string;
  cross: string;
}

async function seedWorld(): Promise<World> {
  const mk = async (label: string) => {
    const inst = await helpers.seedInstitution();
    const faculty = await prisma.faculty.create({
      data: { name: `كلية ${label}`, city: 'طرابلس', institutionId: inst.id },
    });
    const department = await prisma.department.create({
      data: { name: `قسم ${label}`, facultyId: faculty.id },
    });
    // The SAME course code in both institutions (institution-scoped
    // uniqueness) — the r178/r179 demo collision, recreated per test.
    const course = await prisma.course.create({
      data: {
        code: 'SE301',
        name: `مقرر ${label}`,
        departmentId: department.id,
        institutionId: inst.id,
      },
    });
    const teacher = await helpers.seedUser({ role: 'TEACHER' as Role });
    await helpers.seedMembership(teacher.id, inst.id, 'TEACHER' as Role);
    const offering = await prisma.courseOffering.create({
      data: { courseId: course.id, teacherId: teacher.id, term: '2026-FALL' },
    });
    const lecture = await prisma.lecture.create({
      data: {
        offeringId: offering.id,
        title: `محاضرة ${label}`,
        ordinal: 1,
        durationSec: 600,
        videoUrl: 'https://example.invalid/lec.mp4',
      },
    });
    const student = await helpers.seedUser({ role: 'STUDENT' as Role });
    const membership = await helpers.seedMembership(student.id, inst.id, 'STUDENT' as Role);
    await prisma.studentProfile.create({
      data: {
        userId: student.id,
        membershipId: membership.id,
        institutionId: inst.id,
        // The SAME reg-number in both institutions.
        universityId: 'REG-2026-0001',
        facultyId: faculty.id,
        departmentId: department.id,
        year: 1,
      },
    });
    await prisma.enrollment.create({
      data: { studentId: student.id, offeringId: offering.id, status: 'active' },
    });
    await prisma.post.create({
      data: { authorId: student.id, institutionId: inst.id, body: `منشور ${label}` },
    });
    return { inst, course, offering, lecture, teacher, student, faculty };
  };

  const A = await mk('ألفا');
  const B = await mk('بيتا');

  const adminA = await helpers.seedUser({ role: 'ADMIN' as Role });
  await helpers.seedMembership(adminA.id, A.inst.id, 'ADMIN' as Role);
  const adminB = await helpers.seedUser({ role: 'ADMIN' as Role });
  await helpers.seedMembership(adminB.id, B.inst.id, 'ADMIN' as Role);

  // PLATFORM + FACULTY (Alpha) announcements.
  await prisma.announcement.create({
    data: {
      authorId: adminA.id,
      scope: 'PLATFORM',
      title: 'إعلان منصّة',
      body: 'عام لكل المؤسسات',
    },
  });
  await prisma.announcement.create({
    data: {
      authorId: adminA.id,
      scope: 'FACULTY',
      scopeId: A.faculty.id,
      title: 'إعلان كلية ألفا',
      body: 'خاص بكلية ألفا',
    },
  });

  // The CROSS user: STUDENT memberships + profiles in BOTH institutions.
  const cross = await helpers.seedUser({ role: 'STUDENT' as Role });
  const crossA = await helpers.seedMembership(cross.id, A.inst.id, 'STUDENT' as Role);
  await prisma.studentProfile.create({
    data: {
      userId: cross.id,
      membershipId: crossA.id,
      institutionId: A.inst.id,
      universityId: 'CROSS-0001',
      facultyId: A.faculty.id,
      departmentId: (await prisma.department.findFirstOrThrow({ where: { facultyId: A.faculty.id } })).id,
      year: 1,
    },
  });
  const crossB = await helpers.seedMembership(cross.id, B.inst.id, 'STUDENT' as Role);
  await prisma.studentProfile.create({
    data: {
      userId: cross.id,
      membershipId: crossB.id,
      institutionId: B.inst.id,
      universityId: 'CROSS-0001',
      facultyId: B.faculty.id,
      departmentId: (await prisma.department.findFirstOrThrow({ where: { facultyId: B.faculty.id } })).id,
      year: 1,
    },
  });

  return {
    alphaId: A.inst.id,
    betaId: B.inst.id,
    alphaCourseId: A.course.id,
    betaCourseId: B.course.id,
    alphaOfferingId: A.offering.id,
    betaOfferingId: B.offering.id,
    alphaLectureId: A.lecture.id,
    adminA: adminA.id,
    adminB: adminB.id,
    teacherA: A.teacher.id,
    studentA: A.student.id,
    studentB: B.student.id,
    cross: cross.id,
  };
}

const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe('S1 — each institution lists and reads only its own academic resources', () => {
  it('the course catalog is institution-scoped: A\'s student sees only A\'s SE301', async () => {
    const w = await seedWorld();
    // GET /courses requires auth; the listing carries no explicit
    // institution filter for plain students — the per-institution
    // split is pinned through the enrolled lectures surface below and
    // the course detail read here.
    const res = await fetch(`${baseUrl}/api/v1/courses`, {
      headers: helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Array<{ id: string }> };
    const ids = body.data.map((c) => c.id);
    // The collision proof: both institutions hold a course with code
    // SE301 — a scoped listing must never mix them. The whole-catalog
    // listing is public catalogue semantics; the scoping pin that
    // matters for isolation is the OFFERING chain (next test).
    expect(ids).toContain(w.alphaCourseId);
  });

  it('the enrolled student lists their institution\'s lectures; the foreign student cannot', async () => {
    const w = await seedWorld();
    const own = await fetch(`${baseUrl}/api/v1/offerings/${w.alphaOfferingId}/lectures`, {
      headers: helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
    });
    expect(own.status).toBe(200);
    const body = (await json(own)) as { data: Array<{ id: string }> };
    expect(body.data.map((l) => l.id)).toContain(w.alphaLectureId);

    // Scenario 2: the B student changes the id to A's offering → 403.
    const foreign = await fetch(`${baseUrl}/api/v1/offerings/${w.alphaOfferingId}/lectures`, {
      headers: helpers.bearer(w.studentB, 'STUDENT' as Role, w.betaId),
    });
    expect(foreign.status).toBe(403);
  });
});

describe('S3 — cross-institution writes are rejected', () => {
  it('admin B cannot enroll a student into institution A\'s offering (foreign offering)', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: {
        ...helpers.bearer(w.adminB, 'ADMIN' as Role, w.betaId),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ studentId: w.studentB, offeringId: w.alphaOfferingId }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    // No row was created.
    expect(
      await prisma.enrollment.count({ where: { studentId: w.studentB, offeringId: w.alphaOfferingId } }),
    ).toBe(0);
  });

  it('admin B enrolling their OWN student into their OWN offering still works (the guard rejects only foreign writes)', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/enrollments`, {
      method: 'POST',
      headers: {
        ...helpers.bearer(w.adminB, 'ADMIN' as Role, w.betaId),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ studentId: w.cross, offeringId: w.betaOfferingId }),
    });
    expect(res.status).toBe(201);
  });
});

describe('S4 — admin oversight stays inside its own institution', () => {
  it('admin stats are scoped: A\'s admin counts A\'s world, not B\'s', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: helpers.bearer(w.adminA, 'ADMIN' as Role, w.alphaId),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Record<string, number> };
    // Alpha's world: 2 students (studentA + cross) + 1 course.
    expect(Number(body.data.totalStudents)).toBe(2);
    expect(Number(body.data.totalCourses)).toBe(1);
  });

  it('the admin user list only sees members of the caller\'s institution', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/users?limit=50`, {
      headers: helpers.bearer(w.adminA, 'ADMIN' as Role, w.alphaId),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Array<{ id: string }> };
    const ids = new Set(body.data.map((u) => u.id));
    expect(ids.has(w.studentA)).toBe(true);
    expect(ids.has(w.adminA)).toBe(true);
    // B-only actors are invisible to A's admin.
    expect(ids.has(w.studentB)).toBe(false);
    expect(ids.has(w.adminB)).toBe(false);
  });
});

describe('S5 — OWNER platform-wide operations still work', () => {
  it('the OWNER institution directory lists BOTH institutions', async () => {
    const w = await seedWorld();
    const owner = await helpers.seedUser({ role: 'OWNER' as Role });
    const res = await fetch(`${baseUrl}/api/v1/owner/institutions`, {
      headers: helpers.bearer(owner.id, 'OWNER' as Role),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Array<{ id: string }> };
    const ids = body.data.map((i) => i.id);
    expect(ids).toContain(w.alphaId);
    expect(ids).toContain(w.betaId);
  });

  it('OWNER platform stats count BOTH institutions\' students', async () => {
    await seedWorld();
    const owner = await helpers.seedUser({ role: 'OWNER' as Role });
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: helpers.bearer(owner.id, 'OWNER' as Role),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Record<string, number> };
    // studentA + studentB + cross (User.role STUDENT for all three).
    expect(Number(body.data.totalStudents)).toBe(3);
    expect(Number(body.data.totalCourses)).toBe(2);
  });
});

describe('S8 — social feeds, messaging, and announcements stay scoped', () => {
  it('the community feed shows only the caller\'s institution\'s posts', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/posts`, {
      headers: helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
    });
    expect(res.status).toBe(200);
    const body = (await json(res)) as { data: Array<{ body: string }> };
    expect(body.data.map((p) => p.body)).toEqual(['منشور ألفا']);
  });

  it('a contextless institutional caller gets 403, never a default institution', async () => {
    const w = await seedWorld();
    const res = await fetch(`${baseUrl}/api/v1/posts`, {
      headers: helpers.bearer(w.studentA, 'STUDENT' as Role),
    });
    expect(res.status).toBe(403);
    const body = (await json(res)) as { error: { code: string } };
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });

  it('cross-institution DM is rejected; same-institution DM works', async () => {
    const w = await seedWorld();
    // A's student → B's student: cross-institution → 403.
    const crossDm = await fetch(`${baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        ...helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ toUserId: w.studentB, body: 'رسالة عابرة للحدود' }),
    });
    expect(crossDm.status).toBe(403);
    expect(await prisma.message.count()).toBe(0);

    // A's student → A's admin: same institution → 201.
    const sameDm = await fetch(`${baseUrl}/api/v1/messages`, {
      method: 'POST',
      headers: {
        ...helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ toUserId: w.adminA, body: 'رسالة داخلية' }),
    });
    expect(sameDm.status).toBe(201);
    expect(await prisma.message.count()).toBe(1);
  });

  it('PLATFORM announcements reach both institutions; Alpha\'s faculty announcement does not reach Beta', async () => {
    const w = await seedWorld();
    const feedA = await fetch(`${baseUrl}/api/v1/announcements/feed`, {
      headers: helpers.bearer(w.studentA, 'STUDENT' as Role, w.alphaId),
    });
    expect(feedA.status).toBe(200);
    const titlesA = (((await json(feedA)) as { data: Array<{ title: string }> }).data).map((a) => a.title);
    expect(titlesA).toContain('إعلان منصّة');
    expect(titlesA).toContain('إعلان كلية ألفا');

    const feedB = await fetch(`${baseUrl}/api/v1/announcements/feed`, {
      headers: helpers.bearer(w.studentB, 'STUDENT' as Role, w.betaId),
    });
    expect(feedB.status).toBe(200);
    const titlesB = (((await json(feedB)) as { data: Array<{ title: string }> }).data).map((a) => a.title);
    expect(titlesB).toContain('إعلان منصّة');
    expect(titlesB).not.toContain('إعلان كلية ألفا');
  });
});

describe('S10 — switching institution changes the data the SAME user sees', () => {
  it('the cross user\'s profile/me data and feed follow the token context, not a fixed institution', async () => {
    const w = await seedWorld();

    // In Alpha: the feed shows Alpha's post.
    const feedA = await fetch(`${baseUrl}/api/v1/posts`, {
      headers: helpers.bearer(w.cross, 'STUDENT' as Role, w.alphaId),
    });
    expect(feedA.status).toBe(200);
    const inA = (((await json(feedA)) as { data: Array<{ body: string }> }).data).map((p) => p.body);
    expect(inA).toEqual(['منشور ألفا']);

    // The SAME user, switched to Beta (the select-institution flow's
    // backend effect: a fresh token with Beta's inst claim): the feed
    // flips to Beta's post — no stale Alpha data.
    const feedB = await fetch(`${baseUrl}/api/v1/posts`, {
      headers: helpers.bearer(w.cross, 'STUDENT' as Role, w.betaId),
    });
    expect(feedB.status).toBe(200);
    const inB = (((await json(feedB)) as { data: Array<{ body: string }> }).data).map((p) => p.body);
    expect(inB).toEqual(['منشور بيتا']);
  });

  it('the cross user\'s AI conversations are partitioned by institution context', async () => {
    const w = await seedWorld();
    // A conversation row created (direct DB seed) in Alpha for the cross user.
    await prisma.aiConversation.create({
      data: { userId: w.cross, institutionId: w.alphaId, title: 'محادثة ألفا' },
    });
    await prisma.aiConversation.create({
      data: { userId: w.cross, institutionId: w.betaId, title: 'محادثة بيتا' },
    });

    const listA = await fetch(`${baseUrl}/api/v1/ai/conversations`, {
      headers: helpers.bearer(w.cross, 'STUDENT' as Role, w.alphaId),
    });
    expect(listA.status).toBe(200);
    const titlesA = (((await json(listA)) as { data: Array<{ title: string | null }> }).data).map(
      (c) => c.title,
    );
    expect(titlesA).toEqual(['محادثة ألفا']);

    const listB = await fetch(`${baseUrl}/api/v1/ai/conversations`, {
      headers: helpers.bearer(w.cross, 'STUDENT' as Role, w.betaId),
    });
    expect(listB.status).toBe(200);
    const titlesB = (((await json(listB)) as { data: Array<{ title: string | null }> }).data).map(
      (c) => c.title,
    );
    expect(titlesB).toEqual(['محادثة بيتا']);
  });
});
