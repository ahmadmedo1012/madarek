/**
 * Backend unit test — r363 (Agent 7 backend hardening) regression belt
 * for the P0 authentication fixes:
 *
 *  · B-1 — POST /users/:id/reset-link gains the same institution +
 *    governance guard family as PATCH /users/:id: an ADMIN of
 *    institution A can no longer mint a one-time takeover link for an
 *    account of institution B (or the platform OWNER); OWNER keeps the
 *    platform-wide path; self-mint stays free.
 *  · E-1 — the bulk-import commit hashes the temp passwords BEFORE the
 *    transaction (argon2 inside the 5 s interactive-transaction budget
 *    aborted real imports with P2028).
 *  · C-9 — the bulk-import sheet response (plaintext one-time temp
 *    passwords) carries Cache-Control: no-store.
 *  · A-1/A-2/A-3 — the production gates (seed demo-content gate,
 *    devInbox reset-token gate, APP_ORIGIN-only production reset URLs)
 *    are pinned by source-scan the same way permissions-access.test.ts
 *    pins guard wiring — the branches only fire under
 *    NODE_ENV=production, which the unit suite never runs.
 *
 * DB-free (the project canon): prisma mocked at db.js; the REAL app on
 * an ephemeral port with signed role+inst JWTs (the
 * study-rooms-routes pattern).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Role } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  // E-1 pin: the route must consume the PRE-hashed value — a stable
  // marker makes the wiring assertion exact.
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw.slice(0, 4)}`),
  verifyPassword: vi.fn(async () => true),
}));

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    // resolveCallerInstitutionScope + the reset-link target-membership
    // read (both go through membership.findFirst).
    membership: { findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    studentProfile: { findMany: vi.fn(), create: vi.fn() },
    faculty: { findFirst: vi.fn() },
    department: { findFirst: vi.fn() },
    institution: { findFirst: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    // The non-blocking activation mail queues through the outbox.
    mailOutbox: { count: vi.fn(async () => 0), create: vi.fn(async () => ({})) },
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const ADMIN_A = 'admin-a';
const OWNER_ID = 'owner-x';
const STUDENT_A1 = 'student-a1'; // member of inst-a (same institution as ADMIN_A)
const VICTIM_B = 'victim-b'; // member of inst-b ONLY

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) =>
  readFileSync(resolve(here, rel), 'utf8');
const usersRoutesSource = read('../../src/http/routes/users.routes.ts');
const authRoutesSource = read('../../src/http/routes/auth.routes.ts');
const seedSource = read('../../prisma/seed.ts');

let server: import('http').Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((done) => server.close(() => done()));
});

beforeEach(() => {
  vi.clearAllMocks();
});

const authAs = (userId: string, role: Role, inst: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, inst)}`,
  'content-type': 'application/json',
});

/** membership.findFirst dispatcher: the actor's own context read vs the
 * reset-link target-membership read. */
function mockMemberships(opts: { actorScope?: string | null; targetInstitution?: string | null }) {
  (prisma.membership.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
    async (args: { where: { userId: string; institutionId?: string } }) => {
      const w = args.where;
      if (w.userId === ADMIN_A && w.institutionId === 'inst-a') {
        return opts.actorScope === null ? null : { institutionId: 'inst-a' };
      }
      if (w.userId === VICTIM_B && w.institutionId === 'inst-a') {
        return opts.targetInstitution === 'inst-a' ? { institutionId: 'inst-a' } : null;
      }
      if (w.userId === STUDENT_A1 && w.institutionId === 'inst-a') {
        return opts.targetInstitution === 'inst-a' ? { institutionId: 'inst-a' } : null;
      }
      return null;
    },
  );
}

/** user.findUnique dispatcher across the three readers on the path:
 * getGovernanceScope (role/scope), loadGovernanceTarget (full tuple),
 * mintResetTokenForUser (id/isActive). */
function mockUsers(opts: { active?: boolean } = {}) {
  const active = opts.active ?? true;
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
    async (args: { where: { id: string }; select: Record<string, unknown> }) => {
      const id = args.where.id;
      if (args.select && 'scopeFacultyId' in args.select) {
        return id === ADMIN_A ? { role: 'ADMIN', scopeFacultyId: null } : { role: 'STUDENT', scopeFacultyId: null };
      }
      if (args.select && 'isActive' in args.select && args.select.studentProfiles) {
        // loadGovernanceTarget — an in-scope STUDENT of inst-a.
        return {
          id,
          role: 'STUDENT',
          isActive: true,
          studentProfiles: [{ facultyId: 'fac-a1' }],
          teacherProfiles: [],
        };
      }
      return { id, isActive: active };
    },
  );
}

describe('r363 — B-1: POST /users/:id/reset-link institution guard', () => {
  it('an ADMIN of institution A cannot mint a reset link for an institution-B account (403, no token minted)', async () => {
    mockMemberships({ actorScope: 'inst-a', targetInstitution: null });
    mockUsers();
    const res = await fetch(`${baseUrl}/api/v1/users/${VICTIM_B}/reset-link`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('هذا المستخدم ليس عضواً في مؤسستك');
    // The takeover primitive was never reached.
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('the same ADMIN CAN mint a link for an active member of their own institution (201)', async () => {
    mockMemberships({ actorScope: 'inst-a', targetInstitution: 'inst-a' });
    mockUsers();
    (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await fetch(`${baseUrl}/api/v1/users/${STUDENT_A1}/reset-link`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { url: string; expiresInMinutes: number } };
    expect(body.data.url).toMatch(/\/auth\/reset-password\?token=/);
    expect(body.data.expiresInMinutes).toBe(30);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
  });

  it('a deactivated target is refused (mintResetTokenForUser 404) — failure states stay honest', async () => {
    mockMemberships({ actorScope: 'inst-a', targetInstitution: 'inst-a' });
    mockUsers({ active: false });
    const res = await fetch(`${baseUrl}/api/v1/users/${STUDENT_A1}/reset-link`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
    });
    expect(res.status).toBe(404);
  });

  it('OWNER keeps the platform-wide path (201 for a foreign-institution account, no membership read)', async () => {
    mockMemberships({ actorScope: null, targetInstitution: null });
    mockUsers();
    (prisma.passwordResetToken.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });
    (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await fetch(`${baseUrl}/api/v1/users/${VICTIM_B}/reset-link`, {
      method: 'POST',
      headers: authAs(OWNER_ID, Role.OWNER, null),
    });
    expect(res.status).toBe(201);
    // OWNER path never consults the caller's memberships.
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  it('an ADMIN without an institution context claim is refused (fail-closed)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/${STUDENT_A1}/reset-link`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, null),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });
});

describe('r363 — E-1 + C-9: bulk-import commit (hashing outside the tx, no-store sheet)', () => {
  const CSV = [
    'الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة',
    'أحمد,المبروك,a.student@example.com,2026001,كلية الهندسة,قسم الحاسب,1',
  ].join('\n');

  beforeEach(() => {
    (prisma.institution.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'inst-a' });
    (prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.studentProfile.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.faculty.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'fac-a1', name: 'كلية الهندسة' });
    (prisma.department.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'dep-a1' });
    (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-new-1' });
    (prisma.membership.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'mem-new-1' });
    (prisma.studentProfile.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it('creates the cohort with PRE-hashed passwords and answers no-store with the sheet', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/bulk-import/commit`, {
      method: 'POST',
      headers: authAs(OWNER_ID, Role.OWNER, null),
      body: JSON.stringify({ csv: CSV, institutionId: 'inst-a' }),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = (await res.json()) as {
      data: { created: number; sheet: { email: string; tempPassword: string }[]; skipped: number };
    };
    expect(body.data.created).toBe(1);
    expect(body.data.skipped).toBe(0);
    expect(body.data.sheet[0]!.email).toBe('a.student@example.com');
    expect(typeof body.data.sheet[0]!.tempPassword).toBe('string');
    // E-1: the row write consumed the PRE-computed hash from the mocked
    // hasher — hashing happens before the transaction opens.
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'a.student@example.com',
          passwordHash: expect.stringMatching(/^hashed:/),
        }),
      }),
    );
  });
});

describe('r363 — production-gate wiring (source-scan pins)', () => {
  it('A-1: the seed refuses demo content in production unless MADAREK_TEST_ACCOUNTS=1', () => {
    expect(seedSource).toContain("const isProd = process.env.NODE_ENV === 'production'");
    expect(seedSource).toContain("process.env.MADAREK_TEST_ACCOUNTS === '1'");
    // The gate runs BEFORE the established-database branch (a production
    // redeploy never even reaches the @test.ly heal).
    const gate = seedSource.indexOf('const allowDemoContent');
    const established = seedSource.indexOf('const existingUsers = await prisma.user.count()');
    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(established);
  });

  it('A-2: the devInbox raw-token branch is gated out of production', () => {
    expect(authRoutesSource).toContain(
      'if (token && isTestAccountEmail(email) && env.NODE_ENV !== \'production\') {',
    );
  });

  it('A-3: the emailed reset URL is APP_ORIGIN-only in production (auth + users routes)', () => {
    for (const source of [authRoutesSource, usersRoutesSource]) {
      expect(source).toContain('env.NODE_ENV !== \'production\' &&');
      expect(source).toContain("env.APP_ORIGIN ?? 'http://localhost:5173'");
    }
  });

  it('B-1: the reset-link guard runs BEFORE the token mint and mirrors the PATCH family', () => {
    const guard = usersRoutesSource.indexOf("if (actor.id !== id && actor.role === Role.ADMIN) {");
    const mint = usersRoutesSource.indexOf('const token = await mintResetTokenForUser(id, actor.id)');
    expect(guard).toBeGreaterThan(-1);
    expect(mint).toBeGreaterThan(guard);
    expect(usersRoutesSource).toContain(
      "throw AppError.forbidden('هذا المستخدم ليس عضواً في مؤسستك');",
    );
  });
});
