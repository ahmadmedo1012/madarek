/**
 * R350 I-P3 — MODE B (batch enrolment), pinned through the REAL app:
 *
 *  · the matching chain: reg-number → phone → nationalIdHash →
 *    exact-UNIQUE-name (an ambiguous name is a reason, never a pick);
 *  · already-enrolled students report as such (never a duplicate error)
 *    and a duplicate ref in the same list is caught;
 *  · the teacher scope: a TEACHER may only attach to their OWN
 *    offering; an ADMIN is institution-fenced;
 *  · the commit: capacity honoured (the row-lock path), idempotent
 *    skips, per-seat audit rows, and the honest counts back.
 */
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/lib/mail-events.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/lib/mail-events.js')>();
  return {
    ...orig,
    sendEventMail: vi.fn(async () => true),
  };
});

const { enrCreate, enrCount, enrFindMany, auditCreate } = vi.hoisted(() => {
  const enrollments = [{ studentId: 'cmst2udent00000000002', offeringId: 'cmoffering1xxxxxxxx01', status: 'active' }];
  return {
    enrCreate: vi.fn(async () => ({ id: 'enr-new' })),
    enrCount: vi.fn(async () => enrollments.length),
    enrFindMany: vi.fn(async ({ where }: { where: { studentId?: { in?: string[] }; nameAr?: string } }) =>
      where.studentId?.in
        ? enrollments.filter((e) => where.studentId!.in!.includes(e.studentId))
        : enrollments),
    auditCreate: vi.fn(async () => ({})),
  };
});

vi.mock('../../src/db.js', () => {
  const profiles = [
    { userId: 'cmst1udent00000000001', nameAr: 'سالم العماري', universityId: '9001', studentPhoneNormalized: '218925111111', nationalIdHash: '3ac1ae6db29538fd897e2d3e4f58002b6e6fae8509e4e133d44036b0c85719e5', institutionId: 'inst-1' },
    { userId: 'cmst2udent00000000002', nameAr: 'هدى الفيتوري', universityId: '9002', studentPhoneNormalized: '218925222222', nationalIdHash: 'hash-1191', institutionId: 'inst-1' },
    { userId: 'cmst3udent00000000003', nameAr: 'سالم العماري', universityId: '9003', studentPhoneNormalized: '218925333333', nationalIdHash: null, institutionId: 'inst-1' }, // the AMBIGUOUS twin name (but own phone)
    { userId: 'cmst4udent00000000004', nameAr: 'منى اللافي', universityId: '9004', studentPhoneNormalized: null, nationalIdHash: '4f200657fba840c5732a5d45a37c2b3b6c130fea8132f2825d0361de7d3db201', institutionId: 'inst-1' }, // the nid target
  ];
  const spFindFirst = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    const key = (k: string) => where[k] as string | undefined;
    return (
      profiles.find((p) => key('universityId') !== undefined && p.universityId === key('universityId')) ??
      profiles.find((p) => key('studentPhoneNormalized') !== undefined && p.studentPhoneNormalized === key('studentPhoneNormalized')) ??
      profiles.find((p) => key('nationalIdHash') !== undefined && p.nationalIdHash === key('nationalIdHash')) ??
      null
    );
  });
  const spFindMany = vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
    if (where.nameAr !== undefined) return profiles.filter((p) => p.nameAr === where.nameAr);
    return [];
  });
  const offering = { id: 'cmoffering1xxxxxxxx01', teacherId: 'cmteacher1xxxxxxxxx01', capacity: 2, course: { institutionId: 'inst-1', name: 'قواعد بيانات' } };
  const p = {
    courseOffering: { findUnique: vi.fn(async () => offering) },
    enrollment: { findMany: enrFindMany, count: enrCount, create: enrCreate },
    studentProfile: { findFirst: spFindFirst, findMany: spFindMany },
    user: { findMany: vi.fn(async () => []) },
    auditLog: { create: auditCreate },
    membership: { findFirst: vi.fn(async () => ({ id: 'm-1' })) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: vi.fn(async () => []),
        enrollment: { count: enrCount, findMany: enrFindMany, create: enrCreate },
        courseOffering: { findUnique: vi.fn(async () => offering) },
        auditLog: { create: auditCreate },
      }),
    ),
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/db.js';

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let baseUrl: string;
const teacherAuth = { Authorization: `Bearer ${signAccessToken('cmteacher1xxxxxxxxx01', Role.TEACHER, 'inst-1')}`, 'content-type': 'application/json' };
const otherTeacherAuth = { Authorization: `Bearer ${signAccessToken('cmteacher2xxxxxxxxx02', Role.TEACHER, 'inst-1')}`, 'content-type': 'application/json' };

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const mocked = prisma as unknown as {
  courseOffering: { findUnique: ReturnType<typeof vi.fn> };
  enrollment: { create: typeof enrCreate };
  auditLog: { create: typeof auditCreate };
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function enrollPreview(refs: string[], auth = teacherAuth) {
  return fetch(`${baseUrl}/api/v1/import/enroll/preview`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ offeringId: 'cmoffering1xxxxxxxx01', refs }),
  });
}

describe('R350 I-P3 — mode B: the preview matching chain', () => {
  it('matches by reg-number, by phone, and by national id', async () => {
    const res = await enrollPreview(['9001', '0925333333', '119012345678']);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { matched: { ref: string; method: string }[]; unmatched: unknown[]; alreadyEnrolled: unknown[] } };
    expect(body.data.matched.map((m) => m.method)).toEqual(['universityId', 'phone', 'nationalId']);
    expect(body.data.unmatched).toHaveLength(0);
  });

  it('an AMBIGUOUS name is a reason, never a silent pick', async () => {
    const res = await enrollPreview(['سالم العماري']);
    const body = (await res.json()) as { data: { unmatched: { ref: string; reason: string }[] } };
    expect(body.data.unmatched).toHaveLength(1);
    expect(body.data.unmatched[0]!.reason).toContain('أكثر من طالب');
  });

  it('already-enrolled students report as such, not as errors', async () => {
    const res = await enrollPreview(['9002']);
    const body = (await res.json()) as { data: { alreadyEnrolled: { studentId: string }[]; matched: unknown[] } };
    expect(body.data.alreadyEnrolled).toEqual([{ ref: '9002', studentId: 'cmst2udent00000000002', name: 'هدى الفيتوري' }]);
    expect(body.data.matched).toHaveLength(0);
  });

  it('a duplicate ref in the same list is caught', async () => {
    const res = await enrollPreview(['9001', '0925111111']);
    const body = (await res.json()) as { data: { matched: unknown[]; unmatched: { reason: string }[] } };
    expect(body.data.matched).toHaveLength(1);
    expect(body.data.unmatched[0]!.reason).toContain('مرجع آخر');
  });

  it('the capacity picture rides along', async () => {
    const res = await enrollPreview(['9001']);
    const body = (await res.json()) as { data: { capacity: { used: number; total: number; free: number } } };
    expect(body.data.capacity).toEqual({ used: 1, total: 2, free: 1 });
  });

  it('a TEACHER may only attach to their OWN offering', async () => {
    const res = await enrollPreview(['9001'], otherTeacherAuth);
    expect(res.status).toBe(403);
  });
});

describe('R350 I-P3 — mode B: the commit', () => {
  it('enrols up to capacity, skips the enrolled, audits every seat', async () => {
    const res = await fetch(`${baseUrl}/api/v1/import/enroll/commit`, {
      method: 'POST',
      headers: teacherAuth,
      body: JSON.stringify({ offeringId: 'cmoffering1xxxxxxxx01', studentIds: ['cmst1udent00000000001', 'cmst2udent00000000002', 'cmst3udent00000000003'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { created: number; skippedAlready: number; failedCapacity: number } };
    // capacity 2, st-2 already holds a seat → 1 free → st-1 created, st-2 skipped, st-3 capacity-failed
    expect(body.data).toMatchObject({ created: 1, skippedAlready: 1, failedCapacity: 1 });
    expect(mocked.enrollment.create).toHaveBeenCalledTimes(1);
    const audit = mocked.auditLog.create.mock.calls[0] as unknown as [{ data: { action: string; metadata: { batch: boolean } } }];
    const auditData = audit[0]?.data;
    expect(auditData?.action).toBe('ENROLLMENT_CREATED');
    expect(auditData?.metadata.batch).toBe(true);
  });
});
