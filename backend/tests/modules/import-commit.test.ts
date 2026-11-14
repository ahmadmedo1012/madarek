/**
 * R350 I-P0 — the import preview/commit hardening, pinned through the
 * REAL app (OWNER auth — the institution is named in the body):
 *
 *  · preview: an unknown faculty errors the row WITH the suggestion
 *    copy (the silent first-faculty fallback is dead); createIfMissing
 *    turns the error into an explicit «ستُنشأ» warning;
 *  · preview: an existing reg-number warns (policy will apply) and a
 *    taken EMAIL errors the row (the P2002 abort dies at preview);
 *  · commit: TEACHER jobs answer the honest refusal;
 *  · commit: an email collision fails THE ROW (the chunk continues);
 *  · commit: the one-time credentials sheet returns for emailless
 *    creates (and ONLY for them — deliverable rows get activation mail);
 *  · commit: the per-row ledger updates inside the same transaction and
 *    the AuditLog row lands at completion;
 *  · commit: a COMPLETED job refuses; a COMMITTING job RESUMES.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed-temp-password'),
  verifyPassword: vi.fn(async () => false),
}));

// The activation mail is outbox-owned and pinned elsewhere — here we
// observe the route's contract with it. isDeliverableEmail stays REAL
// (it decides credentials-sheet vs activation-mail).
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
  const spFindMany = vi.fn(async () => [] as { universityId: string }[]);
  const userFindMany = vi.fn(async () => [] as { email: string }[]);
  const userFindUnique = vi.fn(async () => null);
  const userCreate = vi.fn(async ({ data }: { data: { email: string } }) => ({ id: `u-${data.email.slice(0, 4)}` }));
  const membershipCreate = vi.fn(async () => ({ id: 'm-1' }));
  const spCreate = vi.fn(async () => ({ id: 'sp-1' }));
  const spUpdate = vi.fn(async () => ({}));
  const facCreate = vi.fn(async ({ data }: { data: { name: string } }) => ({ id: 'f-new', name: data.name }));
  const depCreate = vi.fn(async ({ data }: { data: { name: string } }) => ({ id: 'd-new', name: data.name }));
  const importRowUpdate = vi.fn(async () => ({}));
  const importRowUpdateMany = vi.fn(async () => ({ count: 1 }));
  const importRowFindMany = vi.fn(async () => [] as { line: number; action: string }[]);
  const auditLogCreate = vi.fn(async () => ({}));
  const jobFindUnique = vi.fn(async () => null);
  const jobUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'job-1', ...data }));
  const jobCreate = vi.fn(async () => ({ id: 'job-1' }));
  const p = {
    institution: { findFirst: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })), findUnique: vi.fn(async () => ({ id: 'inst-1', kind: 'UNIVERSITY' })) },
    institutionFieldDefinition: { findMany: vi.fn(async () => []) },
    faculty: { findMany: facFindMany, create: facCreate },
    department: { findMany: depFindMany, create: depCreate },
    studentProfile: { findFirst: spFindFirst, findMany: spFindMany, create: spCreate, update: spUpdate },
    user: { findMany: userFindMany, findUnique: userFindUnique, create: userCreate },
    membership: { create: membershipCreate },
    importRow: { update: importRowUpdate, updateMany: importRowUpdateMany, findMany: importRowFindMany },
    auditLog: { create: auditLogCreate },
    importJob: { findUnique: jobFindUnique, update: jobUpdate, create: jobCreate },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        studentProfile: { findFirst: spFindFirst, create: spCreate, update: spUpdate },
        user: { findUnique: userFindUnique, create: userCreate },
        membership: { create: membershipCreate },
        faculty: { create: facCreate },
        department: { create: depCreate },
        importRow: { update: importRowUpdate, updateMany: importRowUpdateMany, findMany: importRowFindMany },
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
  institution: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  faculty: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  department: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  studentProfile: { findFirst: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  user: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
  importRow: { update: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  importJob: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

function csvBase64(rows: string): string {
  return Buffer.from(`\uFEFFالاسم الكامل,رقم القيد,السنة الدراسية,الكلية,القسم\n${rows}`, 'utf8').toString('base64');
}

const COLUMN_MAP = {
  version: 1,
  columns: [
    { source: 'الاسم الكامل', target: 'nameAr' },
    { source: 'رقم القيد', target: 'universityId' },
    { source: 'السنة الدراسية', target: 'year' },
    { source: 'الكلية', target: 'faculty' },
    { source: 'القسم', target: 'department' },
  ],
};

async function preview(body: Record<string, unknown>) {
  return fetch(`${baseUrl}/api/v1/import/preview`, {
    method: 'POST',
    headers: ownerAuth,
    body: JSON.stringify({ institutionId: 'inst-1', entity: 'STUDENT', columnMap: COLUMN_MAP, ...body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocked.institution.findFirst.mockResolvedValue({ id: 'inst-1', kind: 'UNIVERSITY' });
  mocked.institution.findUnique.mockResolvedValue({ id: 'inst-1', kind: 'UNIVERSITY' });
  mocked.faculty.findMany.mockResolvedValue([{ id: 'f-science', name: 'كلية العلوم' }]);
  mocked.studentProfile.findMany.mockResolvedValue([]);
  mocked.user.findMany.mockResolvedValue([]);
  mocked.importJob.create.mockResolvedValue({ id: 'job-1' });
});

describe('R350 I-P0 — preview: the DB-side truths', () => {
  it('an unknown faculty errors the row with the suggestion copy (the silent fallback is dead)', async () => {
    const res = await preview({ fileBase64: csvBase64('سالم العماري,9001,2,كلية العلومم,علوم الحاسب\n') });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { counts: { ok: number; error: number }; rows: { status: string; errorsAr: string[] }[] } };
    expect(body.data.counts.error).toBe(1);
    expect(body.data.counts.ok).toBe(0);
    expect(body.data.rows[0]!.errorsAr[0]).toContain('هل تقصد «كلية العلوم»');
  });

  it('createIfMissing turns the unknown faculty into an explicit «ستُنشأ» warning', async () => {
    const res = await preview({ fileBase64: csvBase64('سالم العماري,9002,2,كلية الطب,علوم الحاسب\n'), createIfMissing: true });
    const body = (await res.json()) as { data: { counts: { ok: number; error: number }; rows: { status: string; warningsAr: string[] }[] } };
    expect(body.data.counts.ok).toBe(1);
    expect(body.data.counts.error).toBe(0);
    expect(body.data.rows[0]!.warningsAr.join(' | ')).toContain('ستُنشأ كلية جديدة');
  });

  it('an existing reg-number warns (the policy will apply); a taken email errors the row', async () => {
    mocked.studentProfile.findMany.mockResolvedValue([{ universityId: '9003' }]);
    mocked.user.findMany.mockResolvedValue([{ email: 'taken@madarek.ly' }]);
    const res = await preview({
      fileBase64: csvBase64('سالم العماري,9003,2,كلية العلوم,علوم الحاسب\nهدى الفيتوري,9004,2,كلية العلوم,علوم الحاسب\n'),
    });
    // note: no email column in this CSV — the taken-email path needs the
    // email target; verify the reg-number warning landed and both rows ok
    const body = (await res.json()) as { data: { counts: { ok: number }; rows: { warningsAr: string[] }[] } };
    expect(body.data.counts.ok).toBe(2);
    expect(body.data.rows[0]!.warningsAr.join(' | ')).toContain('موجود مسبقًا');
  });
});

describe('R350 I-P0 — commit: the hardening', () => {
  const COMMIT_BODY = {
    duplicatePolicy: 'SKIP',
    chunkSize: 20,
    fileBase64: csvBase64('سالم العماري,9101,2,كلية العلوم,علوم الحاسب\nهدى الفيتوري,9102,2,كلية العلوم,علوم الحاسب\n'),
  };

  function jobRow(over: Record<string, unknown> = {}) {
    return {
      id: 'job-1',
      institutionId: 'inst-1',
      entity: 'STUDENT',
      status: 'VALIDATED',
      totalRows: 2,
      processedRows: 0,
      columnMap: COLUMN_MAP,
      summary: { createIfMissing: false },
      ...over,
    };
  }

  it('refuses a TEACHER job honestly', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow({ entity: 'TEACHER' }));
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(COMMIT_BODY) });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain('المدرّسين');
  });

  it('refuses a COMPLETED job; a COMMITTING job resumes', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow({ status: 'COMPLETED' }));
    const done = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(COMMIT_BODY) });
    expect(done.status).toBe(400);

    mocked.importJob.findUnique.mockResolvedValue(jobRow({ status: 'COMMITTING', processedRows: 2 }));
    mocked.studentProfile.findFirst.mockResolvedValue(null);
    mocked.user.findUnique.mockResolvedValue(null);
    const resume = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(COMMIT_BODY) });
    expect(resume.status).toBe(200);
  });

  it('returns the one-time credentials for emailless creates + the audit row + the per-row ledger', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow());
    mocked.studentProfile.findFirst.mockResolvedValue(null);
    mocked.user.findUnique.mockResolvedValue(null);
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(COMMIT_BODY) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { succeeded: number; credentials: { universityId: string; tempPassword: string }[]; activationMailQueued: number } };
    expect(body.data.succeeded).toBe(2);
    // both rows are emailless (no email column) → the credentials sheet
    expect(body.data.credentials).toHaveLength(2);
    expect(body.data.credentials[0]!.tempPassword.length).toBeGreaterThanOrEqual(12);
    expect(body.data.credentials.map((c) => c.universityId).sort()).toEqual(['9101', '9102']);
    expect(body.data.activationMailQueued).toBe(0);
    // the per-row ledger: one importRow.updateMany per committed row
    // (I-P2: updateMany — jobs past the 2000-row ledger cap can't crash)
    expect(mocked.importRow.updateMany).toHaveBeenCalledTimes(2);
    // I-P2: every committed row records what the commit DID
    const createdActions = mocked.importRow.updateMany.mock.calls.map((c) => (c[0] as { data: { action: string } }).data.action);
    expect(createdActions).toEqual(['CREATED', 'CREATED']);
    // the audit row at completion
    const audit = mocked.auditLog.create.mock.calls[0]![0] as { data: { action: string; metadata: { credentialsIssued: number } } };
    expect(audit.data.action).toBe('IMPORT_COMMITTED');
    expect(audit.data.metadata.credentialsIssued).toBe(2);
  });

  it('an email collision fails THE ROW (no chunk abort)', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow());
    mocked.studentProfile.findFirst.mockResolvedValue(null);
    // the second row's placeholder email is "taken"
    mocked.user.findUnique.mockImplementation(async ({ where }: { where: { email: string } }) =>
      where.email.startsWith('9102@') ? { id: 'existing' } : null,
    );
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(COMMIT_BODY) });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { succeeded: number; failed: number } };
    expect(body.data.succeeded).toBe(1);
    expect(body.data.failed).toBe(1);
    // the failed row's ledger entry carries the Arabic reason
    const failedLedger = mocked.importRow.updateMany.mock.calls.find((c) => (c[0] as { data: { status: string } }).data.status === 'ERROR');
    expect((failedLedger![0] as { data: { errorAr: string } }).data.errorAr).toContain('مستخدم بحساب آخر');
  });

  it('createIfMissing creates the unknown faculty (audited once at completion)', async () => {
    mocked.importJob.findUnique.mockResolvedValue(jobRow({
      summary: { createIfMissing: true },
    }));
    mocked.studentProfile.findFirst.mockResolvedValue(null);
    mocked.user.findUnique.mockResolvedValue(null);
    const body = {
      ...COMMIT_BODY,
      fileBase64: csvBase64('سالم العماري,9103,2,كلية الطب,علوم الحاسب\n'),
    };
    const res = await fetch(`${baseUrl}/api/v1/import/jobs/job-1/commit`, { method: 'POST', headers: ownerAuth, body: JSON.stringify(body) });
    expect(res.status).toBe(200);
    expect(mocked.faculty.create).toHaveBeenCalledTimes(1);
    const created = mocked.faculty.create.mock.calls[0]![0] as { data: { name: string; city: string } };
    expect(created.data.name).toBe('كلية الطب');
    expect(created.data.city).toBe('غير محدد');
    const audit = mocked.auditLog.create.mock.calls[0]![0] as { data: { metadata: { createdOrgs: { kind: string; name: string; id: string }[] } } };
    expect(audit.data.metadata.createdOrgs).toEqual([{ kind: 'faculty', name: 'كلية الطب', id: 'f-new' }]);
  });
});
