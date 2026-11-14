/**
 * R350 I-P2 — the diff view + per-row policies + the rollback, pinned
 * through the REAL app (OWNER auth — the institution is named in the
 * job/body):
 *
 *  · preview: a row whose reg-number exists carries the field-level
 *    DIFF (from → to) and the FILL_EMPTY fillable list — the registrar
 *    judges duplicates with evidence;
 *  · commit FILL_EMPTY: only empty profile fields are filled, the
 *    before-image rides the ledger, a nothing-to-fill row reports
 *    SKIPPED (never a hollow success);
 *  · commit rowPolicies: the per-row verdict beats the global policy;
 *  · rollback: CREATED rows with a never-activated account are deleted
 *    (profile + membership + user), UPDATED rows restore their
 *    before-image, an account that LOGGED IN is KEPT and counted,
 *    the window/double-rollback guards refuse honestly, and the act is
 *    audited (IMPORT_ROLLED_BACK);
 *  · rollback sweeps orgs the job created only when they are now empty.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed-temp-password'),
  verifyPassword: vi.fn(async () => false),
}));

vi.mock('../../src/lib/mail-events.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/lib/mail-events.js')>();
  return {
    ...orig,
    sendEventMail: vi.fn(async () => true),
    renderActivationInvite: vi.fn(() => ({ subject: 'س', bodyHtml: '<p>س</p>', bodyText: 'س', preheader: 'س', ctaLabel: 'س' })),
    loginUrl: vi.fn(() => 'https://madarek.onrender.com/auth/login'),
  };
});

vi.mock('../../src/db.js', () => {
  const facFindMany = vi.fn(async () => [{ id: 'f-science', name: 'كلية العلوم' }]);
  const depFindMany = vi.fn(async () => [{ id: 'd-cs', name: 'علوم الحاسب', facultyId: 'f-science' }]);
  const spFindFirst = vi.fn(async () => null);
  const spFindMany = vi.fn(async () => [] as unknown[]);
  const spFindUnique = vi.fn(async () => null);
  const spCreate = vi.fn(async () => ({ id: 'sp-1' }));
  const spUpdate = vi.fn(async () => ({}));
  const spDelete = vi.fn(async () => ({}));
  const spCount = vi.fn(async () => 0);
  const userFindMany = vi.fn(async () => [] as { email: string }[]);
  const userFindUnique = vi.fn(async () => null);
  const userCreate = vi.fn(async ({ data }: { data: { email: string } }) => ({ id: `u-${data.email.slice(0, 4)}` }));
  const userDelete = vi.fn(async () => ({}));
  const membershipCreate = vi.fn(async () => ({ id: 'm-1' }));
  const membershipDelete = vi.fn(async () => ({}));
  const facCreate = vi.fn(async ({ data }: { data: { name: string } }) => ({ id: 'f-new', name: data.name }));
  const facDelete = vi.fn(async () => ({}));
  const depCreate = vi.fn(async ({ data }: { data: { name: string } }) => ({ id: 'd-new', name: data.name }));
  const depDelete = vi.fn(async () => ({}));
  const depCount = vi.fn(async () => 0);
  const importRowUpdateMany = vi.fn(async () => ({ count: 1 }));
  const importRowFindMany = vi.fn(async () => [] as unknown[]);
  const loginEventFindFirst = vi.fn(async () => null);
  const enrollmentCount = vi.fn(async () => 0);
  const submissionCount = vi.fn(async () => 0);
  const auditLogCreate = vi.fn(async () => ({}));
  const jobFindUnique = vi.fn(async () => null);
  const jobUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'job-1', ...data }));
  const jobCreate = vi.fn(async () => ({ id: 'job-1' }));
  const p = {
    institution: { findFirst: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })), findUnique: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })) },
    institutionFieldDefinition: { findMany: vi.fn(async () => []) },
    faculty: { findMany: facFindMany, create: facCreate, delete: facDelete },
    department: { findMany: depFindMany, create: depCreate, delete: depDelete, count: depCount },
    studentProfile: { findFirst: spFindFirst, findMany: spFindMany, findUnique: spFindUnique, create: spCreate, update: spUpdate, delete: spDelete, count: spCount },
    user: { findMany: userFindMany, findUnique: userFindUnique, create: userCreate, delete: userDelete },
    membership: { create: membershipCreate, delete: membershipDelete },
    loginEvent: { findFirst: loginEventFindFirst },
    enrollment: { count: enrollmentCount },
    submission: { count: submissionCount },
    importRow: { updateMany: importRowUpdateMany, findMany: importRowFindMany },
    auditLog: { create: auditLogCreate },
    importJob: { findUnique: jobFindUnique, update: jobUpdate, create: jobCreate },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        studentProfile: { findFirst: spFindFirst, create: spCreate, update: spUpdate },
        user: { findUnique: userFindUnique, create: userCreate },
        membership: { create: membershipCreate },
        faculty: { create: facCreate },
        department: { create: depCreate },
        importRow: { updateMany: importRowUpdateMany },
      }),
    ),
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/db.js';

const OWNER_ID = 'owner-1';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;
const ownerAuth = { Authorization: `Bearer ${signAccessToken(OWNER_ID, Role.OWNER, 'inst-1')}`, 'content-type': 'application/json' };

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const mocked = prisma as unknown as {
  institution: { findFirst: ReturnType<typeof vi.fn> };
  studentProfile: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  user: { findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  membership: { delete: ReturnType<typeof vi.fn> };
  loginEvent: { findFirst: ReturnType<typeof vi.fn> };
  enrollment: { count: ReturnType<typeof vi.fn> };
  submission: { count: ReturnType<typeof vi.fn> };
  importRow: { updateMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  importJob: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  faculty: { delete: ReturnType<typeof vi.fn> };
  department: { delete: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
};

function csvBase64(rows: string): string {
  return Buffer.from(`\uFEFFالاسم الكامل,رقم القيد,السنة الدراسية,الكلية,القسم,اسم ولي الأمر\n${rows}`, 'utf8').toString('base64');
}

const COLUMN_MAP = {
  version: 1,
  columns: [
    { source: 'الاسم الكامل', target: 'nameAr' },
    { source: 'رقم القيد', target: 'universityId' },
    { source: 'السنة الدراسية', target: 'year' },
    { source: 'الكلية', target: 'faculty' },
    { source: 'القسم', target: 'department' },
    { source: 'اسم ولي الأمر', target: 'guardianName' },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.institution.findFirst.mockResolvedValue({ id: 'inst-1', kind: 'UNIVERSITY' });
  mocked.studentProfile.findMany.mockResolvedValue([]);
  mocked.studentProfile.findFirst.mockResolvedValue(null);
  mocked.studentProfile.findUnique.mockResolvedValue(null);
  mocked.studentProfile.count.mockResolvedValue(0);
  mocked.user.findUnique.mockResolvedValue(null);
  mocked.importRow.findMany.mockResolvedValue([]);
  mocked.importJob.findUnique.mockResolvedValue(null);
  mocked.loginEvent.findFirst.mockResolvedValue(null);
  mocked.enrollment.count.mockResolvedValue(0);
  mocked.submission.count.mockResolvedValue(0);
  mocked.department.count.mockResolvedValue(0);
});

describe('R350 I-P2 — preview: the duplicate DIFF', () => {
  it('a row whose reg-number exists carries the field-level from→to diff + the fillable list', async () => {
    // the DB-side existing-profile read (second findMany call)
    mocked.studentProfile.findMany.mockImplementation(async ({ where }: { where: { universityId?: { in: string[] } } }) => {
      if (where?.universityId?.in?.includes('9003')) {
        return [{
          id: 'sp-9003', universityId: '9003', nameAr: 'سالم الطاهر العماري', stage: null, grade: null, section: null,
          studentPhone: null, guardianName: null, guardianPhone: null,
        }];
      }
      return [{ universityId: '9003' }];
    });
    const res = await fetch(`${baseUrl}/api/v1/import/preview`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        institutionId: 'inst-1', entity: 'STUDENT', columnMap: COLUMN_MAP, createIfMissing: false,
        fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب,الطاهر المبروك\n'),
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { counts: { ok: number }; rows: { line: number; warningsAr: string[]; existing?: { universityId: string; nameAr: string }; diff?: { field: string; fieldAr: string; from: string; to: string }[]; fillable?: string[] }[] };
    };
    expect(body.data.counts.ok).toBe(1);
    const row = body.data.rows[0]!;
    expect(row.existing).toEqual({ universityId: '9003', nameAr: 'سالم الطاهر العماري' });
    // the name differs (from → to) and the guardian is fillable (empty → value)
    const nameDiff = row.diff!.find((d) => d.field === 'nameAr')!;
    expect(nameDiff.from).toBe('سالم الطاهر العماري');
    expect(nameDiff.to).toBe('سالم العماري');
    expect(row.diff!.find((d) => d.field === 'guardianName')!.to).toBe('الطاهر المبروك');
    expect(row.fillable).toContain('اسم ولي الأمر');
    expect(row.fillable).not.toContain('الاسم'); // the name is NOT fillable — it exists
  });
});

describe('R350 I-P2 — commit: FILL_EMPTY + per-row policies', () => {
  const EXISTING = {
    id: 'sp-9003', nameAr: 'سالم الطاهر العماري', stage: null, grade: null, section: null,
    studentPhone: null, studentPhoneNormalized: null, guardianName: null, guardianPhone: null, guardianPhoneNormalized: null,
  };

  function jobRow(over: Record<string, unknown> = {}) {
    return {
      id: 'job-1', institutionId: 'inst-1', entity: 'STUDENT', status: 'VALIDATED', totalRows: 1,
      columnMap: COLUMN_MAP, summary: { createIfMissing: false }, ...over,
    };
  }

  it('FILL_EMPTY fills only the empty fields; the before-image rides the ledger', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow());
    mocked.studentProfile.findFirst.mockResolvedValue(EXISTING);
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        duplicatePolicy: 'FILL_EMPTY', chunkSize: 20,
        fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب,الطاهر المبروك\n'),
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { succeeded: number; skipped: number } };
    expect(body.data.succeeded).toBe(1);
    // ONLY guardianName was written — the existing name is untouchable
    const update = mocked.studentProfile.update.mock.calls[0]![0] as { data: Record<string, string> };
    expect(Object.keys(update.data)).toEqual(['guardianName']);
    expect(update.data.guardianName).toBe('الطاهر المبروك');
    // the ledger carries action UPDATED + the before-image of exactly what changed
    const ledger = mocked.importRow.updateMany.mock.calls[0]![0] as { data: { action: string; before: Record<string, unknown> } };
    expect(ledger.data.action).toBe('UPDATED');
    expect(ledger.data.before).toEqual({ guardianName: null });
  });

  it('a nothing-to-fill FILL_EMPTY row reports SKIPPED, never a hollow success', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow());
    mocked.studentProfile.findFirst.mockResolvedValue({ ...EXISTING, guardianName: 'الطاهر المبروك' });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        duplicatePolicy: 'FILL_EMPTY', chunkSize: 20,
        fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب,الطاهر المبروك\n'),
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { succeeded: number; skipped: number } };
    expect(body.data.succeeded).toBe(0);
    expect(body.data.skipped).toBe(1);
    expect(mocked.studentProfile.update).not.toHaveBeenCalled();
  });

  it('the per-row verdict beats the global policy (row 1 SKIPs under a global UPDATE)', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow({ totalRows: 2 }));
    mocked.studentProfile.findFirst.mockImplementation(async ({ where }: { where: { universityId: string } }) =>
      where.universityId === '9003' ? EXISTING : null,
    );
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        duplicatePolicy: 'UPDATE', chunkSize: 20, rowPolicies: { '1': 'SKIP' },
        fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب,الطاهر المبروك\nهدى الفيتوري,9004,2,كلية العلوم,علوم الحاسب,\n'),
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { succeeded: number; skipped: number } };
    // row 1 (9003, existing) SKIPs by its own verdict; row 2 (9004, new) creates
    expect(body.data.skipped).toBe(1);
    expect(body.data.succeeded).toBe(1);
    expect(mocked.studentProfile.update).not.toHaveBeenCalled(); // the SKIPped row never writes
  });

  it('UPDATE captures the full before-image for the rollback to restore', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow());
    mocked.studentProfile.findFirst.mockResolvedValue({ ...EXISTING, guardianName: 'القديم' });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, {
      method: 'POST',
      headers: ownerAuth,
      body: JSON.stringify({
        duplicatePolicy: 'UPDATE', chunkSize: 20,
        fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب,الطاهر المبروك\n'),
      }),
    });
    expect(res.status).toBe(200);
    const ledger = mocked.importRow.updateMany.mock.calls[0]![0] as { data: { action: string; before: Record<string, unknown> } };
    expect(ledger.data.action).toBe('UPDATED');
    expect(ledger.data.before).toEqual({
      nameAr: 'سالم الطاهر العماري', stage: null, grade: null, section: null,
      studentPhone: null, studentPhoneNormalized: null, guardianName: 'القديم', guardianPhone: null, guardianPhoneNormalized: null,
    });
  });
});

describe('R350 I-P2 — the rollback', () => {
  function completedJob(over: Record<string, unknown> = {}) {
    return {
      id: 'job-1', institutionId: 'inst-1', entity: 'STUDENT', status: 'COMPLETED',
      fileName: 'upload.csv', totalRows: 3, rolledBackAt: null,
      updatedAt: new Date(Date.now() - 60 * 60 * 1000), // 1h ago — inside the 72h window
      summary: { createdOrgs: [] }, ...over,
    };
  }

  const LEDGER_ROWS = [
    { line: 1, action: 'CREATED', resultRef: 'sp-created', before: null },
    { line: 2, action: 'UPDATED', resultRef: 'sp-updated', before: { guardianName: null, nameAr: 'الاسم القديم' } },
    { line: 3, action: 'SKIPPED', resultRef: 'sp-skipped', before: null },
  ];

  it('deletes never-activated CREATED accounts, restores UPDATED before-images, audits the act', async () => {
    mocked.importJob.findUnique.mockResolvedValue(completedJob());
    mocked.importRow.findMany.mockResolvedValue(LEDGER_ROWS);
    mocked.studentProfile.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) =>
      where.id === 'sp-created' ? { id: 'sp-created', userId: 'u-created', membershipId: 'm-created' } : null,
    );
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { deletedUsers: number; restoredUpdates: number; keptActive: number; removedEmptyOrgs: number } };
    expect(body.data.deletedUsers).toBe(1);
    expect(body.data.restoredUpdates).toBe(1);
    expect(body.data.keptActive).toBe(0);
    // the CREATED account is fully deleted
    expect(mocked.studentProfile.delete).toHaveBeenCalledWith({ where: { id: 'sp-created' } });
    expect(mocked.membership.delete).toHaveBeenCalledWith({ where: { id: 'm-created' } });
    expect(mocked.user.delete).toHaveBeenCalledWith({ where: { id: 'u-created' } });
    // the UPDATED row restores its before-image VERBATIM
    expect(mocked.studentProfile.update).toHaveBeenCalledWith({
      where: { id: 'sp-updated' },
      data: { guardianName: null, nameAr: 'الاسم القديم' },
    });
    // the job is marked + the act is audited
    const jobUpdate = mocked.importJob.update.mock.calls[0]![0] as { data: { rolledBackAt: Date } };
    expect(jobUpdate.data.rolledBackAt).toBeInstanceOf(Date);
    const audit = mocked.auditLog.create.mock.calls[0]![0] as { data: { action: string; metadata: { deletedUsers: number } } };
    expect(audit.data.action).toBe('IMPORT_ROLLED_BACK');
    expect(audit.data.metadata.deletedUsers).toBe(1);
  });

  it('KEEPS an account that logged in (never destroy a real life to undo a spreadsheet)', async () => {
    mocked.importJob.findUnique.mockResolvedValue(completedJob());
    mocked.importRow.findMany.mockResolvedValue([{ line: 1, action: 'CREATED', resultRef: 'sp-created', before: null }]);
    mocked.studentProfile.findUnique.mockResolvedValue({ id: 'sp-created', userId: 'u-created', membershipId: 'm-created' });
    mocked.loginEvent.findFirst.mockResolvedValue({ id: 'le-1' });
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { keptActive: number; deletedUsers: number } };
    expect(body.data.keptActive).toBe(1);
    expect(body.data.deletedUsers).toBe(0);
    expect(mocked.user.delete).not.toHaveBeenCalled();
  });

  it('sweeps orgs the job created only when they are now empty', async () => {
    mocked.importJob.findUnique.mockResolvedValue(completedJob({
      summary: { createdOrgs: [
        { kind: 'faculty', name: 'كلية الطب', id: 'f-empty' },
        { kind: 'department', name: 'قسم الجراحة', id: 'd-full' },
        { kind: 'faculty', name: 'كلية قديمة' }, // pre-I-P2 summary: no id, skipped
      ] },
    }));
    mocked.importRow.findMany.mockResolvedValue([]);
    mocked.studentProfile.count.mockImplementation(async ({ where }: { where: { departmentId?: string } }) =>
      where?.departmentId === 'd-full' ? 5 : 0,
    );
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { removedEmptyOrgs: number } };
    expect(body.data.removedEmptyOrgs).toBe(1); // only the empty faculty
    expect(mocked.faculty.delete).toHaveBeenCalledWith({ where: { id: 'f-empty' } });
    expect(mocked.department.delete).not.toHaveBeenCalled();
  });

  it('refuses: not COMPLETED, already rolled back, and past the 72h window', async () => {
    mocked.importJob.findUnique.mockResolvedValue(completedJob({ status: 'COMMITTING' }));
    const committing = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(committing.status).toBe(400);
    expect(((await committing.json()) as { error: { message: string } }).error.message).toContain('المكتملة فقط');

    mocked.importJob.findUnique.mockResolvedValue(completedJob({ rolledBackAt: new Date() }));
    const twice = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(twice.status).toBe(400);
    expect(((await twice.json()) as { error: { message: string } }).error.message).toContain('مرتين');

    mocked.importJob.findUnique.mockResolvedValue(completedJob({ updatedAt: new Date(Date.now() - 73 * 60 * 60 * 1000) }));
    const expired = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/rollback`, { method: 'POST', headers: ownerAuth });
    expect(expired.status).toBe(400);
    expect(((await expired.json()) as { error: { message: string } }).error.message).toContain('نافذة التراجع');
  });
});
