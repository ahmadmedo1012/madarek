/**
 * Backend unit test — r363 (Agent 7 backend hardening) regression belt
 * for the multi-tenancy governance fixes:
 *
 *  · B-2 — POST /admin/users/:id/role: an ADMIN can no longer change
 *    the platform role of a user outside their own institution (the
 *    capability-override sibling always had this guard; the role
 *    surface did not — cross-tenant privilege injection).
 *  · B-3 — POST /admin/users/:id/scope: institution binding on BOTH
 *    ends — the target must be a member of the caller's institution,
 *    and a non-null scopeFacultyId must belong to it (foreign-faculty
 *    scoping was a cross-tenant governance tamper).
 *  · B-4 — the ImportJob routes (get/commit/rollback/report) compare
 *    the caller's DB-verified scope against the job's institution: a
 *    foreign job is a 404 (the old guard resolved and DISCARDED).
 *  · D-5 — readUploadByKey binds a ticket to its minter (another
 *    registrar's key is not a read primitive over a foreign roster).
 *
 * Two institutions are modelled throughout: inst-a (the caller's) and
 * inst-b (foreign). DB-free (the project canon): prisma mocked at
 * db.js; the REAL app on an ephemeral port with signed role+inst JWTs.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    membership: { findFirst: vi.fn(), create: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    userPermission: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    rolePermission: { findMany: vi.fn() },
    faculty: { findUnique: vi.fn(), findFirst: vi.fn() },
    importUpload: { findUnique: vi.fn(), create: vi.fn() },
    importJob: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()) };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { readUploadByKey } from '../../src/http/routes/import.routes.js';

const ADMIN_A = 'admin-a';
const OWNER_ID = 'owner-x';
const TARGET_A = 'target-a'; // TEACHER member of inst-a
const TARGET_B = 'target-b'; // ADMIN member of inst-b ONLY

const here = dirname(fileURLToPath(import.meta.url));
const importRoutesSource = readFileSync(resolve(here, '../../src/http/routes/import.routes.ts'), 'utf8');

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
  // Capability resolution: no DB overrides — the ADMIN role defaults
  // carry ROLES_ASSIGN (lib/permissions.ts DEFAULT_ROLE_CAPABILITIES).
  (prisma.rolePermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  (prisma.userPermission.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  // The actor's own context read: ADMIN_A holds an ACTIVE membership in
  // inst-a. Target membership reads dispatch by userId below.
  (prisma.membership.findFirst as ReturnType<typeof vi.fn>).mockImplementation(
    async (args: { where: { userId: string; institutionId?: string } }) => {
      const w = args.where;
      if (w.userId === ADMIN_A && w.institutionId === 'inst-a') return { institutionId: 'inst-a' };
      if (w.userId === TARGET_A && w.institutionId === 'inst-a') return { institutionId: 'inst-a' };
      if (w.userId === TARGET_B) return null; // foreign target: no inst-a membership
      return null;
    },
  );
  // user.findUnique dispatcher across this belt's readers.
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockImplementation(
    async (args: { where: { id: string }; select: Record<string, unknown> }) => {
      const sel = args.select ?? {};
      const id = args.where.id;
      if ('staffRole' in sel) {
        // role-route target read
        if (id === TARGET_A) {
          return {
            id,
            role: 'TEACHER',
            scopeFacultyId: null,
            staffRole: null,
            studentProfiles: [],
            teacherProfiles: [{ id: 'tp-1', department: { facultyId: 'ca111111111111111111111a1' } }],
          };
        }
        return null;
      }
      if ('id' in sel && 'scopeFacultyId' in sel) {
        // scope-route target read
        if (id === TARGET_A || id === TARGET_B) return { id, role: 'ADMIN', scopeFacultyId: null };
        return null;
      }
      if ('scopeFacultyId' in sel) {
        // getGovernanceScope — the ACTOR is a university-wide ADMIN.
        return { role: 'ADMIN', scopeFacultyId: null };
      }
      return null;
    },
  );
});

const authAs = (userId: string, role: Role, inst: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, inst)}`,
  'content-type': 'application/json',
});

describe('r363 — B-2: POST /admin/users/:id/role institution guard', () => {
  it('an ADMIN cannot change the role of a foreign-institution user (403, no write)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${TARGET_B}/role`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
      body: JSON.stringify({ role: 'STUDENT' }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('هذا المستخدم ليس عضواً في مؤسستك');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('the same ADMIN CAN demote a member of their own institution (200 + tokenVersion bump)', async () => {
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: TARGET_A, role: 'STUDENT' });
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${TARGET_A}/role`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
      body: JSON.stringify({ role: 'STUDENT' }),
    });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_A },
        data: expect.objectContaining({ role: 'STUDENT', tokenVersion: { increment: 1 } }),
      }),
    );
  });
});

describe('r363 — B-3: POST /admin/users/:id/scope institution binding', () => {
  it('rejects a scopeFacultyId belonging to a foreign institution (400)', async () => {
    (prisma.faculty.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'cb222222222222222222222b2', institutionId: 'inst-b' });
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${TARGET_A}/scope`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
      body: JSON.stringify({ scopeFacultyId: 'cb222222222222222222222b2' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('الكلية المحددة لا تنتمي إلى مؤسستك');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a foreign-institution target (403, no write)', async () => {
    (prisma.faculty.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'ca111111111111111111111a1', institutionId: 'inst-a' });
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${TARGET_B}/scope`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
      body: JSON.stringify({ scopeFacultyId: 'ca111111111111111111111a1' }),
    });
    expect(res.status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('a same-institution faculty + member target succeeds (200, audited)', async () => {
    (prisma.faculty.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'ca111111111111111111111a1', institutionId: 'inst-a' });
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: TARGET_A, scopeFacultyId: 'ca111111111111111111111a1' });
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${TARGET_A}/scope`, {
      method: 'POST',
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
      body: JSON.stringify({ scopeFacultyId: 'ca111111111111111111111a1' }),
    });
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_A },
        data: { scopeFacultyId: 'ca111111111111111111111a1' },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});

describe('r363 — B-4: ImportJob routes scope comparison', () => {
  it('GET /import/jobs/:id answers 404 for a foreign-institution job (no existence leak)', async () => {
    (prisma.importJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'job-1',
      institutionId: 'inst-b',
      status: 'CREATED',
    });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1`, {
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
    });
    expect(res.status).toBe(404);
  });

  it('GET /import/jobs/:id answers 200 for the caller\u2019s own institution job', async () => {
    (prisma.importJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'job-2',
      institutionId: 'inst-a',
      status: 'CREATED',
    });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-2`, {
      headers: authAs(ADMIN_A, Role.ADMIN, 'inst-a'),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { id: string } };
    expect(body.data.id).toBe('job-2');
  });

  it('OWNER keeps the platform-wide read (200 for a foreign job)', async () => {
    (prisma.importJob.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'job-1',
      institutionId: 'inst-b',
      status: 'CREATED',
    });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1`, {
      headers: authAs(OWNER_ID, Role.OWNER, null),
    });
    expect(res.status).toBe(200);
  });

  it('the guard is the honest comparison — all four job routes use assertJobInCallerScope', () => {
    const guards = importRoutesSource.match(/await assertJobInCallerScope\(req, job\);/g) ?? [];
    expect(guards.length).toBe(4);
    expect(importRoutesSource).toContain('if (scope !== job.institutionId)');
    expect(importRoutesSource).not.toContain('await resolveInstitutionId(req, job.institutionId);');
  });
});

describe('r363 — D-5: readUploadByKey minter binding', () => {
  const KEY = 'imports/c0123456789abcdef0123456789abcdef.csv';

  it("rejects another registrar's ticket with the unknown-key envelope (400, before any storage read)", async () => {
    (prisma.importUpload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      key: KEY,
      consumedAt: null,
      mintedBy: 'other-admin',
    });
    await expect(readUploadByKey(KEY, { id: ADMIN_A, role: 'ADMIN' })).rejects.toMatchObject({
      status: 400,
      message: 'مفتاح الرفع غير معروف — ابدأ الرفع من جديد',
    });
  });

  it("passes the binding for the minter's own ticket (fails LATER at the storage stage, not at the gate)", async () => {
    (prisma.importUpload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      key: KEY,
      consumedAt: null,
      mintedBy: ADMIN_A,
    });
    // No file in local storage → the storage-miss error proves the
    // minter gate let the caller through.
    await expect(readUploadByKey(KEY, { id: ADMIN_A, role: 'ADMIN' })).rejects.toMatchObject({
      status: 400,
      message: 'الملف المرفوع لم يصل إلى التخزين — أعد المحاولة',
    });
  });

  it('OWNER reads any ticket (platform-wide path)', async () => {
    (prisma.importUpload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      key: KEY,
      consumedAt: null,
      mintedBy: 'other-admin',
    });
    await expect(readUploadByKey(KEY, { id: OWNER_ID, role: 'OWNER' })).rejects.toMatchObject({
      status: 400,
      message: 'الملف المرفوع لم يصل إلى التخزين — أعد المحاولة',
    });
  });

  it('the parse/preview/commit loaders thread the caller (source-scan)', () => {
    const wired = importRoutesSource.match(
      /loadFileBuffer\(req\.body as \{ fileBase64\?: string; storageKey\?: string \}, req\.user!\)/g,
    ) ?? [];
    expect(wired.length).toBe(3);
  });
});
