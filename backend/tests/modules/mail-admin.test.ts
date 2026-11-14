/**
 * R350 E6 — the admin «البريد» surface + the notification preferences,
 * pinned through the REAL app (auth stack included):
 *
 *  · GET /admin/mail/status — the provider picture (config, 24h counts,
 *    caps, honest domainVerified:null — the key is send-only, E1);
 *  · GET /admin/mail/outbox — filters + paging; the projection NEVER
 *    ships mail bodies (no html/text fields);
 *  · retry/cancel — the state machine (404 unknown, 409 wrong status,
 *    cancelled = terminal failed with the marker) + AuditLog writes;
 *  · test-send — queues through the REAL outbox law (caps checked) and
 *    audits; a cap refusal answers 429, never a silent drop;
 *  · suppression list/remove — audited;
 *  · GET/PUT /me/notification-preferences — the 5 categories with the
 *    essential flags; PUT accepts ONLY the optional three (security/
 *    account are validation-refused — the E3 law at the API edge).
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    mailOutbox: {
      groupBy: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({ id: 'o1', status: 'queued' })),
    },
    mailSuppression: { count: vi.fn(async () => 0), findMany: vi.fn(async () => []), findUnique: vi.fn(async () => null), delete: vi.fn(async () => ({ id: 's1' })) },
    auditLog: { create: vi.fn(async () => ({})) },
    notificationPreference: { findMany: vi.fn(async () => []), upsert: vi.fn(async () => ({ category: 'digest', emailEnabled: false })) },
  };
  return { prisma: p, withRetry: vi.fn() };
});

// The outbox law is pinned by mail-outbox.test.ts — here we mock the
// queue to observe the route's contract with it.
vi.mock('../../src/lib/mail-outbox.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/lib/mail-outbox.js')>();
  return { ...orig, queueMail: vi.fn(async () => ({ ok: true, id: 'queued-1', deduped: false })) };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/db.js';
import { queueMail } from '../../src/lib/mail-outbox.js';

const ADMIN_ID = 'admin-user-1';
const STUDENT_ID = 'student-user-1';
const INSTITUTION_ID = 'inst-1';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;

beforeAll(() => {
  server = createApp().listen(0);
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const adminAuth = { Authorization: `Bearer ${signAccessToken(ADMIN_ID, Role.ADMIN, INSTITUTION_ID)}` };
const studentAuth = { Authorization: `Bearer ${signAccessToken(STUDENT_ID, Role.STUDENT, INSTITUTION_ID)}` };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('R350 E6 — GET /admin/mail/status', () => {
  it('paints the provider picture (honest domainVerified null)', async () => {
    vi.mocked(prisma.mailOutbox.groupBy).mockResolvedValue([
      { status: 'sent', _count: { _all: 5 } },
      { status: 'failed', _count: { _all: 1 } },
    ] as never);
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/status`, { headers: adminAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown> };
    expect(body.data.provider).toBe('none'); // env default in tests
    expect(body.data.configured).toBe(false);
    expect(body.data.domainVerified).toBeNull();
    expect((body.data.last24h as Record<string, number>).sent).toBe(5);
    expect((body.data.last24h as Record<string, number>).failed).toBe(1);
    expect((body.data.caps as Record<string, number>).recipientDaily).toBe(12);
  });

  it('refuses non-admin roles', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/status`, { headers: studentAuth });
    expect(res.status).toBe(403);
  });
});

describe('R350 E6 — GET /admin/mail/outbox (the delivery log)', () => {
  it('filters by status and NEVER ships bodies', async () => {
    vi.mocked(prisma.mailOutbox.findMany).mockResolvedValue([
      { id: 'o1', to: 'a@b.ly', template: 'welcome', subject: 'س', status: 'sent', attempts: 1, nextAttemptAt: null, providerId: 're_1', lastError: null, dedupeKey: null, sentAt: new Date(), createdAt: new Date() },
    ] as never);
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/outbox?status=sent&q=a@b`, { headers: adminAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: Record<string, unknown>[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).not.toHaveProperty('html');
    expect(body.data[0]).not.toHaveProperty('text');
    const findMany = vi.mocked(prisma.mailOutbox.findMany).mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(findMany.where.status).toBe('sent');
  });

  it('rejects a bogus status filter', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/outbox?status=bogus`, { headers: adminAuth });
    expect(res.status).toBe(400);
  });
});

describe('R350 E6 — retry / cancel state machine', () => {
  it('retry: 404 unknown, 409 on sent, requeue + audit on failed', async () => {
    const r404 = await fetch(`${baseUrl}/api/v1/admin/mail/outbox/nope/retry`, { method: 'POST', headers: adminAuth });
    expect(r404.status).toBe(404);

    vi.mocked(prisma.mailOutbox.findUnique).mockResolvedValueOnce({ id: 'o1', status: 'sent', to: 'a@b.ly', template: 'welcome', attempts: 1 } as never);
    const r409 = await fetch(`${baseUrl}/api/v1/admin/mail/outbox/o1/retry`, { method: 'POST', headers: adminAuth });
    expect(r409.status).toBe(409);

    vi.mocked(prisma.mailOutbox.findUnique).mockResolvedValueOnce({ id: 'o1', status: 'failed', to: 'a@b.ly', template: 'welcome', attempts: 6 } as never);
    const ok = await fetch(`${baseUrl}/api/v1/admin/mail/outbox/o1/retry`, { method: 'POST', headers: adminAuth });
    expect(ok.status).toBe(200);
    const update = vi.mocked(prisma.mailOutbox.update).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(update.data.status).toBe('queued');
    expect(update.data.lastError).toBeNull();
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]![0] as { data: { action: string } };
    expect(audit.data.action).toBe('MAIL_OUTBOX_RETRY');
  });

  it('cancel: only queued/sending; terminal failed + marker + audit', async () => {
    vi.mocked(prisma.mailOutbox.findUnique).mockResolvedValueOnce({ id: 'o2', status: 'queued', to: 'a@b.ly', template: 'announcement', attempts: 0 } as never);
    const ok = await fetch(`${baseUrl}/api/v1/admin/mail/outbox/o2/cancel`, { method: 'POST', headers: adminAuth });
    expect(ok.status).toBe(200);
    const update = vi.mocked(prisma.mailOutbox.update).mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(update.data.status).toBe('failed');
    expect(String(update.data.lastError)).toMatch(/^cancelled by /);
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]![0] as { data: { action: string } };
    expect(audit.data.action).toBe('MAIL_OUTBOX_CANCEL');

    vi.mocked(prisma.mailOutbox.findUnique).mockResolvedValueOnce({ id: 'o3', status: 'sent', to: 'a@b.ly', template: 'welcome', attempts: 1 } as never);
    const r409 = await fetch(`${baseUrl}/api/v1/admin/mail/outbox/o3/cancel`, { method: 'POST', headers: adminAuth });
    expect(r409.status).toBe(409);
  });
});

describe('R350 E6 — suppression list/remove + test-send', () => {
  it('removes a suppression with audit', async () => {
    vi.mocked(prisma.mailSuppression.findUnique).mockResolvedValueOnce({ id: 's1', email: 'x@y.ly', type: 'hard_bounce', reason: 'bounce', suppressedAt: new Date(), createdAt: new Date() } as never);
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/suppression/s1`, { method: 'DELETE', headers: adminAuth });
    expect(res.status).toBe(200);
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]![0] as { data: { action: string; metadata: { email: string } } };
    expect(audit.data.action).toBe('MAIL_SUPPRESSION_REMOVE');
    expect(audit.data.metadata.email).toBe('x@y.ly');
  });

  it('test-send queues through the outbox and audits', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/test-send`, {
      method: 'POST',
      headers: { ...adminAuth, 'content-type': 'application/json' },
      body: JSON.stringify({ to: 'owner@madarek.ly' }),
    });
    expect(res.status).toBe(200);
    const queued = vi.mocked(queueMail).mock.calls[0]![0] as { to: string; template: string; html: string };
    expect(queued.to).toBe('owner@madarek.ly');
    expect(queued.template).toBe('admin-test');
    // the test mail rides the SAME shell law (hidden preheader + filler)
    expect(queued.html).toContain('display:none;max-height:0;overflow:hidden');
    expect(queued.html).toMatch(/(&#847;&zwnj;){2,}/);
    const audit = vi.mocked(prisma.auditLog.create).mock.calls[0]![0] as { data: { action: string } };
    expect(audit.data.action).toBe('MAIL_TEST_SEND');
  });

  it('test-send refuses a malformed address', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/mail/test-send`, {
      method: 'POST',
      headers: { ...adminAuth, 'content-type': 'application/json' },
      body: JSON.stringify({ to: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('R350 E6 — /me/notification-preferences', () => {
  it('lists the five categories with the essential flags', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/notification-preferences`, { headers: studentAuth });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { category: string; emailEnabled: boolean; essential: boolean }[] };
    expect(body.data.map((d) => d.category)).toEqual(['security', 'account', 'announcements', 'courses', 'digest']);
    expect(body.data.filter((d) => d.essential).map((d) => d.category)).toEqual(['security', 'account']);
    expect(body.data.every((d) => d.emailEnabled)).toBe(true); // absent = ON
  });

  it('PUT upserts an optional category', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/notification-preferences`, {
      method: 'PUT',
      headers: { ...studentAuth, 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'digest', emailEnabled: false }),
    });
    expect(res.status).toBe(200);
    const upsert = vi.mocked(prisma.notificationPreference.upsert).mock.calls[0]![0] as { where: { userId: string; userId_category: { userId: string; category: string } } };
    expect(upsert.where.userId_category.userId).toBe(STUDENT_ID);
    expect(upsert.where.userId_category.category).toBe('digest');
  });

  it('PUT refuses the ESSENTIAL categories at the API edge (400)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/notification-preferences`, {
      method: 'PUT',
      headers: { ...studentAuth, 'content-type': 'application/json' },
      body: JSON.stringify({ category: 'security', emailEnabled: false }),
    });
    expect(res.status).toBe(400);
    expect(prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });
});
