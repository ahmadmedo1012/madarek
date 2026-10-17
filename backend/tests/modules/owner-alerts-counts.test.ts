/**
 * Backend unit test — r165g: the owner console's alert COUNTS become
 * truthful (backend/src/http/routes/owner.routes.ts).
 *
 * [P2 defect] GET /owner/system computed `alerts.openCount` as
 * `openAlerts.length` — but openAlerts is the preview feed capped at
 * `take: 10`, so with 30 open alerts the payload reported 10. The
 * alerts board (GET /owner/alerts, `take: 50`) had the same defect
 * class: the frontend's «تنبيهات مفتوحة» KPI read the truncated
 * array length.
 *
 * The fix keeps both LIST caps exactly as they were (pagination
 * unchanged) and adds REAL `prisma.operationalAlert.count` queries:
 *  - /owner/system: openCount is now the true open total;
 *  - /owner/alerts: the response gains a `meta` block
 *    { total, critical, warning } with the true open totals (the
 *    critical pair critical+error mirrors lib/ownerLabels
 *    .isCriticalAlert and the /system criticalCount).
 *
 * DB-free (the project's canon): the REAL app on an ephemeral port
 * with prisma mocked and an OWNER JWT signed via signAccessToken —
 * the enrollments-scope.test.ts pattern.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    operationalAlert: { findMany: vi.fn(), count: vi.fn() },
    syncRun: { findMany: vi.fn() },
    auditLog: { count: vi.fn() },
    $transaction: vi.fn(),
  },
  // Defensive: other modules in the app graph import withRetry from db.js.
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

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

// ── Mocked delegates ─────────────────────────────────────────────

const alertFindMany = vi.mocked(prisma.operationalAlert.findMany);
const alertCount = vi.mocked(prisma.operationalAlert.count);
const syncRunFindMany = vi.mocked(prisma.syncRun.findMany);
const auditLogCount = vi.mocked(prisma.auditLog.count);

/** Prisma delegates return PrismaPromise — one cast, the zu-sync-run
 *  pattern (see enrollments-scope.test.ts). */
type CountImpl = NonNullable<Parameters<typeof alertCount.mockImplementation>[0]>;
type FindManyImpl = NonNullable<Parameters<typeof alertFindMany.mockImplementation>[0]>;

/** Severity-agnostic open-alert row (the /alerts route ships full rows). */
const openAlertRow = (i: number, severity: string) => ({
  id: `alert-${i}`,
  severity,
  category: 'db',
  title: `تنبيه ${i}`,
  message: `message ${i}`,
  metadata: null,
  resolvedAt: null,
  resolvedBy: null,
  createdAt: new Date(`2026-09-26T0${(i % 10)}:00:00.000Z`),
});

/* Count dispatch: the real count queries distinguish themselves only
 * by their `where` — total (resolvedAt only), the critical pair
 * (severity in [critical,error]), or warning. */
let openTotal = 0;
let criticalTotal = 0;
let warningTotal = 0;

alertCount.mockImplementation(
  (async (args?: { where?: { severity?: { in?: string[] } | string } }) => {
    const severity = args?.where?.severity;
    if (severity && typeof severity === 'object' && 'in' in severity) return criticalTotal;
    if (severity === 'warning') return warningTotal;
    return openTotal;
  }) as unknown as CountImpl,
);

let feedRows: ReturnType<typeof openAlertRow>[] = [];

alertFindMany.mockImplementation((async () => feedRows) as unknown as FindManyImpl);

beforeEach(() => {
  vi.clearAllMocks();
  openTotal = 0;
  criticalTotal = 0;
  warningTotal = 0;
  feedRows = [];
  syncRunFindMany.mockResolvedValue([] as never);
  auditLogCount.mockResolvedValue(0 as never);
});

// ── Helpers ──────────────────────────────────────────────────────

const OWNER_ID = 'owner-1';
const bearer = (userId: string, role: Role) => ({
  authorization: `Bearer ${signAccessToken(userId, role, null)}`,
});

const getOwner = (path: string) =>
  fetch(`${baseUrl}/api/v1${path}`, { headers: bearer(OWNER_ID, Role.OWNER) });

const getAs = (role: Role, path: string) =>
  fetch(`${baseUrl}/api/v1${path}`, { headers: bearer('other-1', role) });

// ── GET /owner/system — openCount is the REAL open total ─────────

describe('GET /api/v1/owner/system — alerts.openCount (r165g)', () => {
  it('reports the REAL open count (30), not the capped feed length (10)', async () => {
    // 30 open alerts in the DB; the preview feed still caps at take:10.
    openTotal = 30;
    criticalTotal = 4;
    feedRows = Array.from({ length: 10 }, (_, i) => openAlertRow(i, 'warning'));

    const res = await getOwner('/owner/system');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        alerts: { open: unknown[]; openCount: number; criticalCount: number };
      };
    };

    // The KPI numbers are counts, not array lengths.
    expect(body.data.alerts.openCount).toBe(30);
    expect(body.data.alerts.criticalCount).toBe(4);
    // The preview feed itself stays capped (pagination unchanged).
    expect(body.data.alerts.open).toHaveLength(10);
    // And 30 ≠ 10 proves the count is not derived from the feed.
    expect(body.data.alerts.openCount).not.toBe(body.data.alerts.open.length);
  });

  it('issues a real operationalAlert.count({ where: { resolvedAt: null } }) — not a length computation', async () => {
    openTotal = 17;
    const res = await getOwner('/owner/system');
    expect(res.status).toBe(200);

    // The exact count query the fix added…
    expect(alertCount).toHaveBeenCalledWith({ where: { resolvedAt: null } });
    // …and the capped preview read (take: 10) is unchanged.
    expect(alertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, where: { resolvedAt: null } }),
    );
    // The critical pair count keeps the /system rule (critical + error).
    expect(alertCount).toHaveBeenCalledWith({
      where: { resolvedAt: null, severity: { in: ['critical', 'error'] } },
    });
  });

  it('zero open alerts still reports openCount 0 with an empty feed (the honest quiet state)', async () => {
    const res = await getOwner('/owner/system');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { alerts: { openCount: number } } };
    expect(body.data.alerts.openCount).toBe(0);
    expect(alertCount).toHaveBeenCalledWith({ where: { resolvedAt: null } });
  });
});

// ── GET /owner/alerts — meta carries the REAL totals ─────────────

describe('GET /api/v1/owner/alerts — meta totals (r165g)', () => {
  it('ships the true totals in meta while the list stays capped at take:50', async () => {
    // 63 open alerts in the DB; the feed (capped at 50) returns 2 rows.
    openTotal = 63;
    criticalTotal = 5;
    warningTotal = 20;
    feedRows = [openAlertRow(1, 'critical'), openAlertRow(2, 'warning')];

    const res = await getOwner('/owner/alerts');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: unknown[];
      meta: { total: number; critical: number; warning: number };
    };

    // The list is the capped feed, unchanged.
    expect(body.data).toHaveLength(2);
    // The counts are the REAL totals — never the array length.
    expect(body.meta).toEqual({ total: 63, critical: 5, warning: 20 });
    expect(body.meta.total).not.toBe(body.data.length);

    // The list read keeps its exact capped shape (pagination unchanged).
    expect(alertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50, where: { resolvedAt: null } }),
    );
    // The three real count queries behind meta.
    expect(alertCount).toHaveBeenCalledWith({ where: { resolvedAt: null } });
    expect(alertCount).toHaveBeenCalledWith({
      where: { resolvedAt: null, severity: { in: ['critical', 'error'] } },
    });
    expect(alertCount).toHaveBeenCalledWith({
      where: { resolvedAt: null, severity: 'warning' },
    });
  });

  it('an all-clear board reports zeros in meta (not the feed length)', async () => {
    const res = await getOwner('/owner/alerts');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; meta: { total: number } };
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
  });
});

// ── The routes stay OWNER-gated (regression pin for the harness) ──

describe('owner alerts routes — role gate', () => {
  it('a non-OWNER token is refused (403) before any count query runs', async () => {
    const res = await getAs(Role.STUDENT, '/owner/alerts');
    expect(res.status).toBe(403);
    expect(alertCount).not.toHaveBeenCalled();
  });
});
