/**
 * DB integration — r178 (multi-institution foundation): the EIGHT
 * contract scenarios of the institutions flow, against a REAL
 * disposable Postgres through the REAL app (createApp().listen(0)) and
 * the REAL PrismaClient singleton — no prisma mocks (the integration
 * canon). Every scenario asserts BOTH the HTTP envelope and the
 * database state (db() queries), because a 201 that persists nothing is
 * exactly the class of regression only a real DB can catch.
 *
 *   S1  OWNER creates an institution (persist + validation errors)
 *   S2  OWNER provisions a 'new' institutional ADMIN (+ mode=existing)
 *   S3  the ADMIN authenticates with institution context (login + /me)
 *   S4  the ADMIN creates a course inside their institution (+ list)
 *   S5  scoped uniqueness: same code / reg-number across institutions
 *   S6  cross-institution boundary (forged/stale inst claim → 403)
 *   S7  membership revoke + institution suspend/reactivate
 *   S8  reg-number ambiguous login (+ institutionSlug disambiguation)
 *
 * Login scenarios hash REAL argon2 passwords (the route verifies them);
 * every other caller is signed directly via helpers.bearer, which since
 * r178 takes the token's `inst` claim — signing is our own secret, so a
 * mismatched claim simulates a forged/stale token exactly (S6).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { hashPassword } from '../../src/lib/password.js';
import { bearer, db, seedInstitution, seedMembership, seedUser, truncateAll, uniqueSuffix } from './helpers.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(async () => {
  await truncateAll(db());
});

/** A password satisfying the shared 12+ policy (auth.dto passwordSchema). */
const strongPassword = () => `R178-${uniqueSuffix()}-pass`;

/** A faculty+department pair inside `institutionId` (no admin-facing
 * faculty-creation API exists in r178 — the fixtures seed directly). */
async function seedFacultyChain(institutionId: string, label: string) {
  const prisma = db();
  const faculty = await prisma.faculty.create({
    data: { name: `كلية ${label}`, city: 'طرابلس', institutionId },
  });
  const department = await prisma.department.create({
    data: { name: `قسم ${label}`, facultyId: faculty.id },
  });
  return { faculty, department };
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

interface MembershipSummary {
  institutionId: string;
  role: Role;
  isActive: boolean;
}

interface SessionUser {
  id: string;
  email: string;
  role: Role;
  memberships: MembershipSummary[];
  currentInstitution: { id: string; name: string; slug: string } | null;
  membershipRole: Role | null;
}

interface AuthEnvelope {
  data: { user: SessionUser; accessToken: string };
}

const postJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const patchJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

// ── S1 — OWNER creates an institution ─────────────────────────────

describe('S1 — POST /api/v1/owner/institutions (OWNER)', () => {
  it('creates the institution: 201, row + audit persisted, slug derived from nameEn', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const slug = `r178-${uniqueSuffix()}`;

    const res = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'مؤسسة النور التعليمية', nameEn: 'Al-Noor Institute', slug },
      bearer(owner.id, Role.OWNER),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { institution: { slug: string; status: string } } };
    expect(body.data.institution.slug).toBe(slug);
    expect(body.data.institution.status).toBe('ACTIVE');

    // DB state: the row landed with both names.
    const row = await db().institution.findUniqueOrThrow({ where: { slug } });
    expect(row.name).toBe('مؤسسة النور التعليمية');
    expect(row.nameEn).toBe('Al-Noor Institute');

    // The audit row rides in the SAME transaction with institution scope.
    const audit = await db().auditLog.findFirstOrThrow({
      where: { action: 'institution.create', resourceId: row.id },
    });
    expect(audit.userId).toBe(owner.id);
    expect(audit.institutionId).toBe(row.id);

    // Slug derivation: omitted slug falls back to the slugified nameEn.
    const derived = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'مؤسسة الشرق', nameEn: `Eastern College ${uniqueSuffix()}` },
      bearer(owner.id, Role.OWNER),
    );
    expect(derived.status).toBe(201);
    const derivedBody = (await derived.json()) as { data: { institution: { slug: string } } };
    expect(derivedBody.data.institution.slug).toMatch(/^eastern-college-/);
  });

  it('GET /api/v1/institutions stays PUBLIC (mount-order regression): anon 200, ACTIVE only', async () => {
    const active = await seedInstitution();
    const suspended = await db().institution.create({
      data: { name: 'مؤسسة معلّقة', slug: `susp-${uniqueSuffix()}`, status: 'SUSPENDED' },
    });

    // Anonymous — no authMiddleware on the public listing (the router
    // ordering in app.ts keeps it reachable past the authed routers).
    const res = await fetch(`${baseUrl}/api/v1/institutions`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Array<{ id: string; slug: string }> };
    const ids = body.data.map((i) => i.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(suspended.id); // ACTIVE institutions only
  });

  it('validation errors: short name → 400, duplicate slug → 409, non-owner → 403, anonymous → 401', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const admin = await seedUser({ role: Role.ADMIN });
    const slug = `r178-${uniqueSuffix()}`;

    // A first creation the duplicate will collide with.
    const first = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'مؤسسة أولى', slug },
      bearer(owner.id, Role.OWNER),
    );
    expect(first.status).toBe(201);

    // Short name (min 2 chars) → 400 VALIDATION_ERROR.
    const shortName = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'م' },
      bearer(owner.id, Role.OWNER),
    );
    expect(shortName.status).toBe(400);
    expect(((await shortName.json()) as ErrorEnvelope).error.code).toBe('VALIDATION_ERROR');

    // Duplicate slug → 409 CONFLICT.
    const dupSlug = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'مؤسسة ثانية', slug },
      bearer(owner.id, Role.OWNER),
    );
    expect(dupSlug.status).toBe(409);
    expect(((await dupSlug.json()) as ErrorEnvelope).error.code).toBe('CONFLICT');

    // A non-OWNER token → 403 (router-level requireRole gate).
    const nonOwner = await postJson(
      `${baseUrl}/api/v1/owner/institutions`,
      { name: 'مؤسسة متسلل' },
      bearer(admin.id, Role.ADMIN),
    );
    expect(nonOwner.status).toBe(403);

    // Anonymous → 401 (authMiddleware rejects before the role gate).
    const anon = await postJson(`${baseUrl}/api/v1/owner/institutions`, { name: 'مؤسسة مجهولة' });
    expect(anon.status).toBe(401);
  });
});

// ── S2 — OWNER provisions the institutional ADMIN ─────────────────

describe('S2 — POST /api/v1/owner/institutions/:id/administrators', () => {
  it("mode=new: user + ADMIN membership persisted in ONE transaction (+ audit)", async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const inst = await seedInstitution();
    const email = `admin-${uniqueSuffix()}@r178.test`;
    const password = strongPassword();

    const res = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'new', email, firstName: 'أمين', lastName: 'المؤسسة', password },
      bearer(owner.id, Role.OWNER),
    );
    expect(res.status).toBe(201);

    // DB state: the user exists with the ADMIN platform role…
    const user = await db().user.findUniqueOrThrow({ where: { email } });
    expect(user.role).toBe(Role.ADMIN);
    expect(user.firstName).toBe('أمين');
    // …and the ADMIN membership in exactly that institution.
    const membership = await db().membership.findUniqueOrThrow({
      where: { userId_institutionId: { userId: user.id, institutionId: inst.id } },
    });
    expect(membership.role).toBe(Role.ADMIN);
    expect(membership.isActive).toBe(true);
    expect(await db().membership.count({ where: { userId: user.id } })).toBe(1);

    // Audit row (institution-scoped, provisioning mode recorded).
    const audit = await db().auditLog.findFirstOrThrow({
      where: { action: 'institution.admin.provision', institutionId: inst.id },
    });
    expect(audit.userId).toBe(owner.id);
    const meta = audit.metadata as Record<string, unknown>;
    expect(meta.mode).toBe('new');
    expect(meta.email).toBe(email);
  });

  it('mode=new rejections: duplicate email → 409, weak password → 400', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const inst = await seedInstitution();
    const email = `admin-${uniqueSuffix()}@r178.test`;
    const password = strongPassword();

    // The account the duplicate will collide with.
    const first = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'new', email, firstName: 'أ', lastName: 'ب', password },
      bearer(owner.id, Role.OWNER),
    );
    expect(first.status).toBe(201);

    // Same email again → 409 CONFLICT.
    const dup = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'new', email, firstName: 'ج', lastName: 'د', password: strongPassword() },
      bearer(owner.id, Role.OWNER),
    );
    expect(dup.status).toBe(409);
    expect(((await dup.json()) as ErrorEnvelope).error.code).toBe('CONFLICT');
    // Still exactly ONE user with that email.
    expect(await db().user.count({ where: { email } })).toBe(1);

    // Weak password (shared 12+ policy) → 400.
    const weak = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'new', email: `admin-${uniqueSuffix()}@r178.test`, firstName: 'أ', lastName: 'ب', password: 'short' },
      bearer(owner.id, Role.OWNER),
    );
    expect(weak.status).toBe(400);
    expect(((await weak.json()) as ErrorEnvelope).error.code).toBe('VALIDATION_ERROR');
  });

  it("mode=existing: upgrades a known user's membership to ADMIN (+ previousRole in audit)", async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const inst = await seedInstitution();
    // A STUDENT member of the institution (the pre-existing state the
    // upsert heals) + a non-member user.
    const member = await seedUser({ role: Role.STUDENT });
    const priorMembership = await seedMembership(member.id, inst.id, Role.STUDENT);
    const outsider = await seedUser({ role: Role.TEACHER });

    // Upgrade the existing member: same membership row, role → ADMIN.
    const upgrade = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'existing', email: member.email },
      bearer(owner.id, Role.OWNER),
    );
    expect(upgrade.status).toBe(201);
    const row = await db().membership.findUniqueOrThrow({ where: { id: priorMembership.id } });
    expect(row.role).toBe(Role.ADMIN);
    expect(row.isActive).toBe(true);
    expect(await db().membership.count({ where: { userId: member.id, institutionId: inst.id } })).toBe(1);

    // A non-member gains a FRESH ADMIN membership.
    const attach = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'existing', email: outsider.email },
      bearer(owner.id, Role.OWNER),
    );
    expect(attach.status).toBe(201);
    const fresh = await db().membership.findUniqueOrThrow({
      where: { userId_institutionId: { userId: outsider.id, institutionId: inst.id } },
    });
    expect(fresh.role).toBe(Role.ADMIN);

    // The audit row records the honest previous role (filtered by the
    // provisioned email — this test provisions two different users).
    const audit = await db().auditLog.findFirstOrThrow({
      where: {
        action: 'institution.admin.provision',
        institutionId: inst.id,
        userId: owner.id,
        metadata: { path: ['email'], equals: member.email },
      },
    });
    const meta = audit.metadata as Record<string, unknown>;
    expect(meta.mode).toBe('existing');
    expect(meta.previousRole).toBe('STUDENT');

    // Unknown email → 404.
    const unknown = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'existing', email: `ghost-${uniqueSuffix()}@r178.test` },
      bearer(owner.id, Role.OWNER),
    );
    expect(unknown.status).toBe(404);
  });
});

// ── S3 — the admin authenticates with institution context ─────────

describe('S3 — POST /api/v1/auth/login with an institutional admin', () => {
  it('single active membership → context auto-selected; /auth/me returns the same context', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const inst = await seedInstitution();
    const email = `admin-${uniqueSuffix()}@r178.test`;
    const password = strongPassword();

    // Provisioned through the REAL route → real argon2 hash.
    const provisioned = await postJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/administrators`,
      { mode: 'new', email, firstName: 'أمين', lastName: 'المؤسسة', password },
      bearer(owner.id, Role.OWNER),
    );
    expect(provisioned.status).toBe(201);

    // Login through the REAL route (real argon2 verification).
    const login = await postJson(`${baseUrl}/api/v1/auth/login`, { email, password });
    expect(login.status).toBe(200);
    const body = (await login.json()) as AuthEnvelope;
    expect(body.data.user.email).toBe(email);
    // Exactly one active membership → auto-selected context.
    expect(body.data.user.memberships).toHaveLength(1);
    expect(body.data.user.currentInstitution).toMatchObject({ id: inst.id, slug: inst.slug });
    expect(body.data.user.membershipRole).toBe(Role.ADMIN);

    // /auth/me with the minted access token returns the SAME context.
    const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${body.data.accessToken}` },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { data: SessionUser };
    expect(meBody.data.id).toBe(body.data.user.id);
    expect(meBody.data.currentInstitution).toMatchObject({ id: inst.id, slug: inst.slug });
    expect(meBody.data.membershipRole).toBe(Role.ADMIN);

    // DB state: the successful login telemetry row.
    expect(
      await db().loginEvent.count({ where: { email, success: true } }),
    ).toBe(1);
  });

  it('the EFFECTIVE role is the membership role — the platform role can differ', async () => {
    // The r178 contract: "Effective institution role ALWAYS comes from
    // Membership" — pin it with a deliberately mismatched fixture
    // (platform STUDENT + ADMIN membership).
    const inst = await seedInstitution();
    const student = await seedUser({ role: Role.STUDENT });
    await seedMembership(student.id, inst.id, Role.ADMIN);
    const password = strongPassword();
    await db().user.update({
      where: { id: student.id },
      data: { passwordHash: await hashPassword(password) },
    });

    const login = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: student.email,
      password,
    });
    expect(login.status).toBe(200);
    const body = (await login.json()) as AuthEnvelope;
    expect(body.data.user.role).toBe(Role.STUDENT); // platform role unchanged
    expect(body.data.user.membershipRole).toBe(Role.ADMIN); // …from the membership
    expect(body.data.user.currentInstitution?.id).toBe(inst.id);
  });
});

// ── S4 — the admin creates a course within their institution ──────

describe('S4 — POST /api/v1/courses with an institutional admin context', () => {
  it('creates the course scoped to the caller institution (+ public list carries it, cross-institution dept → 403)', async () => {
    const inst = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, inst.id, Role.ADMIN);
    const { department } = await seedFacultyChain(inst.id, 'r178-س4');
    // A second institution's department (the cross-institution payload).
    const other = await seedInstitution();
    const { department: foreignDepartment } = await seedFacultyChain(other.id, 'r178-أجنبية');

    // The real create route: institutionId comes from the verified
    // membership context, never the payload.
    const res = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code: 'R178-101', name: 'مقرر المؤسسة', departmentId: department.id },
      bearer(admin.id, Role.ADMIN, inst.id),
    );
    expect(res.status).toBe(201);
    const created = (await res.json()) as { data: { id: string; institutionId: string } };
    expect(created.data.institutionId).toBe(inst.id);

    // DB state: the row + the audited institution scope.
    const course = await db().course.findFirstOrThrow({ where: { code: 'R178-101' } });
    expect(course.institutionId).toBe(inst.id);
    const audit = await db().auditLog.findFirstOrThrow({
      where: { action: 'COURSE_CREATED', resourceId: course.id },
    });
    expect(audit.institutionId).toBe(inst.id);

    // The per-institution listing (authed router — Bearer, like every
    // /courses read) carries the institution row on every course.
    const list = await fetch(`${baseUrl}/api/v1/courses?institutionSlug=${inst.slug}`, {
      headers: bearer(admin.id, Role.ADMIN, inst.id),
    });
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as {
      data: Array<{ code: string; institution: { id: string; slug: string } }>;
    };
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]!.code).toBe('R178-101');
    expect(listBody.data[0]!.institution).toMatchObject({ id: inst.id, slug: inst.slug });

    // A foreign-institution departmentId in the payload → 403 (the
    // department→faculty→institution chain guard) — a silent
    // cross-institution write must be impossible.
    const cross = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code: 'R178-102', name: 'مقرر متسلل', departmentId: foreignDepartment.id },
      bearer(admin.id, Role.ADMIN, inst.id),
    );
    expect(cross.status).toBe(403);
    expect(((await cross.json()) as ErrorEnvelope).error.message).toBe(
      'القسم الأكاديمي المحدد لا ينتمي إلى مؤسستك',
    );
    expect(await db().course.count({ where: { code: 'R178-102' } })).toBe(0);
  });
});

// ── S5 — scoped uniqueness across institutions ─────────────────────

describe('S5 — institution-scoped uniqueness (course code + student reg-number)', () => {
  it("the SAME code and reg-number land in TWO institutions; duplicates WITHIN one → 409", async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const adminA = await seedUser({ role: Role.ADMIN });
    await seedMembership(adminA.id, instA.id, Role.ADMIN);
    const chainA = await seedFacultyChain(instA.id, 'ر178-أ');
    const chainB = await seedFacultyChain(instB.id, 'ر178-ب');
    const code = `CS101-${uniqueSuffix()}`;

    // Course 'CS101-…' in institution A through the REAL route…
    const resA = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code, name: 'مقرر المؤسسة أ', departmentId: chainA.department.id },
      bearer(adminA.id, Role.ADMIN, instA.id),
    );
    expect(resA.status).toBe(201);
    // …and the SAME code in institution B directly (B has no admin here) —
    // both rows coexist: uniqueness is (institutionId, code) since r178.
    await db().course.create({
      data: { code, name: 'مقرر المؤسسة ب', departmentId: chainB.department.id, institutionId: instB.id },
    });
    expect(await db().course.count({ where: { code } })).toBe(2);

    // The same reg-number as a student profile in BOTH institutions.
    const regNumber = `REG-${uniqueSuffix()}`;
    for (const [inst, chain] of [
      [instA, chainA],
      [instB, chainB],
    ] as const) {
      const student = await seedUser({ role: Role.STUDENT });
      const membership = await seedMembership(student.id, inst.id, Role.STUDENT);
      await db().studentProfile.create({
        data: {
          userId: student.id,
          membershipId: membership.id,
          institutionId: inst.id,
          universityId: regNumber,
          facultyId: chain.faculty.id,
          departmentId: chain.department.id,
        },
      });
    }
    expect(await db().studentProfile.count({ where: { universityId: regNumber } })).toBe(2);

    // Duplicate WITHIN one institution → 409 envelope (P2002 surfaced).
    const dup = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code, name: 'مقرر مكرر', departmentId: chainA.department.id },
      bearer(adminA.id, Role.ADMIN, instA.id),
    );
    expect(dup.status).toBe(409);
    const dupBody = (await dup.json()) as ErrorEnvelope & { error: { details: { target: string[] } } };
    expect(dupBody.error.code).toBe('CONFLICT');
    expect(dupBody.error.details.target).toEqual(
      expect.arrayContaining(['institutionId', 'code']),
    );
    // No third row: still exactly 2.
    expect(await db().course.count({ where: { code } })).toBe(2);
  });
});

// ── S6 — cross-institution boundary ────────────────────────────────

describe('S6 — cross-institution boundary (forged/stale inst claim)', () => {
  it('a token claiming institution B for a member of A → 403 INSTITUTION_CONTEXT_INVALID', async () => {
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    await seedMembership(admin.id, instA.id, Role.ADMIN); // member of A ONLY
    const chainA = await seedFacultyChain(instA.id, 'ر178-س6-أ');
    const chainB = await seedFacultyChain(instB.id, 'ر178-س6-ب');

    // Our own signing simulates a forged/stale claim: the token says B.
    const forged = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code: 'R178-601', name: 'مقرر مزيف', departmentId: chainB.department.id },
      bearer(admin.id, Role.ADMIN, instB.id),
    );
    expect(forged.status).toBe(403);
    const forgedBody = (await forged.json()) as ErrorEnvelope;
    expect(forgedBody.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
    expect(forgedBody.error.message).toBe('عضوية المؤسسة غير نشطة أو غير صالحة');
    expect(await db().course.count({ where: { code: 'R178-601' } })).toBe(0);

    // select-institution to B is rejected the same way (DB-side
    // verification — the token never grants what the DB denies).
    const select = await postJson(
      `${baseUrl}/api/v1/auth/select-institution`,
      { institutionId: instB.id },
      bearer(admin.id, Role.ADMIN, instA.id),
    );
    expect(select.status).toBe(403);
    expect(((await select.json()) as ErrorEnvelope).error.code).toBe('INSTITUTION_CONTEXT_INVALID');

    // Control: the same user against their OWN institution still works.
    const own = await postJson(
      `${baseUrl}/api/v1/courses`,
      { code: 'R178-602', name: 'مقرر أصلي', departmentId: chainA.department.id },
      bearer(admin.id, Role.ADMIN, instA.id),
    );
    expect(own.status).toBe(201);
  });
});

// ── S7 — membership revoke + institution suspend ───────────────────

describe('S7 — membership revoke and institution suspension', () => {
  it('revoke → scoped routes 403; restore + suspend + reactivate cycle', async () => {
    const owner = await seedUser({ role: Role.OWNER });
    const inst = await seedInstitution();
    const admin = await seedUser({ role: Role.ADMIN });
    const membership = await seedMembership(admin.id, inst.id, Role.ADMIN);
    const { department } = await seedFacultyChain(inst.id, 'ر178-س7');

    const createCourse = (code: string) =>
      postJson(
        `${baseUrl}/api/v1/courses`,
        { code, name: `مقرر ${code}`, departmentId: department.id },
        bearer(admin.id, Role.ADMIN, inst.id),
      );

    // Control: the context works before any revocation.
    expect((await createCourse('R178-701')).status).toBe(201);

    // Revoke the membership through the OWNER API.
    const revoke = await fetch(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/memberships/${membership.id}/revoke`,
      { method: 'POST', headers: bearer(owner.id, Role.OWNER) },
    );
    expect(revoke.status).toBe(200);
    expect(
      await db().membership.findUniqueOrThrow({ where: { id: membership.id } }),
    ).toMatchObject({ isActive: false, role: Role.ADMIN });

    // The access token still VERIFIES (JWT is intact) — but the scoped
    // route re-resolves from the DB and rejects 403.
    const afterRevoke = await createCourse('R178-702');
    expect(afterRevoke.status).toBe(403);
    expect(((await afterRevoke.json()) as ErrorEnvelope).error.code).toBe('INSTITUTION_CONTEXT_INVALID');
    expect(await db().course.count({ where: { code: 'R178-702' } })).toBe(0);

    // select-institution is equally rejected (revoked membership).
    const select = await postJson(
      `${baseUrl}/api/v1/auth/select-institution`,
      { institutionId: inst.id },
      bearer(admin.id, Role.ADMIN, inst.id),
    );
    expect(select.status).toBe(403);

    // Restore → access returns.
    const restore = await fetch(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}/memberships/${membership.id}/restore`,
      { method: 'POST', headers: bearer(owner.id, Role.OWNER) },
    );
    expect(restore.status).toBe(200);
    expect((await createCourse('R178-703')).status).toBe(201);

    // Suspend the whole INSTITUTION → every member's scoped route 403s
    // (requireInstitution/resolveCallerInstitutionScope check the status).
    const suspend = await patchJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}`,
      { status: 'SUSPENDED' },
      bearer(owner.id, Role.OWNER),
    );
    expect(suspend.status).toBe(200);
    const afterSuspend = await createCourse('R178-704');
    expect(afterSuspend.status).toBe(403);
    expect(((await afterSuspend.json()) as ErrorEnvelope).error.code).toBe('INSTITUTION_CONTEXT_INVALID');

    // Reactivate → access returns (the full lifecycle is reversible).
    const reactivate = await patchJson(
      `${baseUrl}/api/v1/owner/institutions/${inst.id}`,
      { status: 'ACTIVE' },
      bearer(owner.id, Role.OWNER),
    );
    expect(reactivate.status).toBe(200);
    expect((await createCourse('R178-705')).status).toBe(201);

    // The suspension lifecycle is audited.
    const suspendAudit = await db().auditLog.findFirstOrThrow({
      where: { action: 'institution.update', institutionId: inst.id },
    });
    const meta = suspendAudit.metadata as Record<string, unknown>;
    expect((meta.changes as Record<string, unknown>).status).toBe('SUSPENDED');
  });
});

// ── S8 — reg-number ambiguous login ────────────────────────────────

describe('S8 — POST /api/v1/auth/login with a shared reg-number', () => {
  it('ambiguous → 400 REG_NUMBER_AMBIGUOUS; institutionSlug → 200 + the right user + context', async () => {
    const regNumber = `REG-${uniqueSuffix()}`;
    const password = strongPassword();
    const instA = await seedInstitution();
    const instB = await seedInstitution();
    const chainA = await seedFacultyChain(instA.id, 'ر178-س8-أ');
    const chainB = await seedFacultyChain(instB.id, 'ر178-س8-ب');

    // Two students, SAME reg-number, one per institution — real argon2
    // hashes so the login route can actually verify the password.
    const studentA = await seedUser({ role: Role.STUDENT, firstName: 'طالب-أ' });
    const membershipA = await seedMembership(studentA.id, instA.id, Role.STUDENT);
    await db().studentProfile.create({
      data: {
        userId: studentA.id,
        membershipId: membershipA.id,
        institutionId: instA.id,
        universityId: regNumber,
        facultyId: chainA.faculty.id,
        departmentId: chainA.department.id,
      },
    });
    const studentB = await seedUser({ role: Role.STUDENT, firstName: 'طالب-ب' });
    const membershipB = await seedMembership(studentB.id, instB.id, Role.STUDENT);
    await db().studentProfile.create({
      data: {
        userId: studentB.id,
        membershipId: membershipB.id,
        institutionId: instB.id,
        universityId: regNumber,
        facultyId: chainB.faculty.id,
        departmentId: chainB.department.id,
      },
    });
    await Promise.all([
      db().user.update({
        where: { id: studentA.id },
        data: { passwordHash: await hashPassword(password) },
      }),
      db().user.update({
        where: { id: studentB.id },
        data: { passwordHash: await hashPassword(password) },
      }),
    ]);

    // The ambiguous login: the reg-number exists in 2 institutions.
    const ambiguous = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: regNumber,
      password,
    });
    expect(ambiguous.status).toBe(400);
    const ambBody = (await ambiguous.json()) as ErrorEnvelope;
    expect(ambBody.error.code).toBe('REG_NUMBER_AMBIGUOUS');
    expect(ambBody.error.message).toContain('أكثر من مؤسسة');
    // DB state: the telemetry row for the ambiguous attempt.
    expect(
      await db().loginEvent.count({ where: { email: regNumber, reason: 'REG_NUMBER_AMBIGUOUS' } }),
    ).toBe(1);

    // Disambiguated by slug → the RIGHT user + their context.
    const ok = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: regNumber,
      password,
      institutionSlug: instB.slug,
    });
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as AuthEnvelope;
    expect(okBody.data.user.id).toBe(studentB.id);
    expect(okBody.data.user.currentInstitution).toMatchObject({ id: instB.id, slug: instB.slug });
    expect(okBody.data.user.membershipRole).toBe(Role.STUDENT);
    expect(okBody.data.user.memberships).toHaveLength(1);
  });
});
