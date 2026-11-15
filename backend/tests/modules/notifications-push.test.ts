/**
 * R327 C3 + R353 N — the Expo push fan-out (push.ts), pinned with the
 * prisma + expo-server-sdk layers mocked (the r326-client-errors-push
 * pattern — vi.hoisted state, one live env gate):
 *
 *  · receipts (R353 N): ok tickets → receipt ids fetched (chunked); a
 *    DeviceNotRegistered RECEIPT prunes the device; other receipt
 *    errors log without pruning; a receipts FAILURE never throws and
 *    never undoes the ticket-stage pruning;
 *  · ticket errors (r327 law): DeviceNotRegistered pruned on sight,
 *    everything else logged;
 *  · preferences (R353 N): pushEnabled=false and a live quiet window
 *    drop that user's devices BEFORE the send (one batched
 *    NotificationPreference query; absent row = ON); all-muted → no
 *    send at all;
 *  · the message contract: subtitle = payload type, collapseId =
 *    type:link, priority high only for URGENT;
 *  · PUSH_ENABLED=false → a no-op (not even the device query);
 *  · the never-throws law (best-effort, always resolves).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Live env gate: push.ts reads env.PUSH_ENABLED per call — the getter
// keeps the toggle honest per test (vi.hoisted: the factory is hoisted
// above every import, the mail-outbox precedent).
const envState = vi.hoisted(() => ({ pushEnabled: true }));
vi.mock('../../src/env.js', () => ({
  env: {
    get PUSH_ENABLED() {
      return envState.pushEnabled;
    },
  },
}));

vi.mock('../../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../src/db.js', () => ({
  prisma: {
    pushDevice: { findMany: vi.fn(), deleteMany: vi.fn() },
    notificationPreference: { findMany: vi.fn() },
  },
  withRetry: vi.fn(),
}));

// expo-server-sdk: exactly the classic-API surface push.ts touches.
// The send/receipt spies live outside the class so tests reach them.
const expoSpies = vi.hoisted(() => ({ send: vi.fn(), receipts: vi.fn() }));
vi.mock('expo-server-sdk', () => ({
  Expo: class {
    chunkPushNotifications = vi.fn((messages: unknown[]) => [messages]);
    chunkPushNotificationReceiptIds = vi.fn((ids: string[]) => [ids]);
    sendPushNotificationsAsync = expoSpies.send;
    getPushNotificationReceiptsAsync = expoSpies.receipts;
  },
}));

import { prisma } from '../../src/db.js';
import { fanOutPush } from '../../src/modules/notifications/push.js';
import { materialCreatedPayload } from '../../src/modules/notifications/core.js';

const mocked = prisma as unknown as {
  pushDevice: { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  notificationPreference: { findMany: ReturnType<typeof vi.fn> };
};

const PAYLOAD = materialCreatedPayload('CS201', 'محاضرة الأشجار الثنائية');

const DEVICES = [
  { id: 'd1', userId: 'u1', expoToken: 'ExponentPushToken[tok-1]' },
  { id: 'd2', userId: 'u2', expoToken: 'ExponentPushToken[tok-2]' },
];

beforeEach(() => {
  vi.clearAllMocks();
  envState.pushEnabled = true;
  mocked.pushDevice.findMany.mockResolvedValue(DEVICES);
  mocked.notificationPreference.findMany.mockResolvedValue([]);
  mocked.pushDevice.deleteMany.mockResolvedValue({ count: 0 });
  expoSpies.send.mockResolvedValue([]);
  expoSpies.receipts.mockResolvedValue({});
});

describe('R353 N — receipts processing', () => {
  it('fetches the ok tickets’ receipt ids (chunked) and prunes a DeviceNotRegistered RECEIPT', async () => {
    expoSpies.send.mockResolvedValue([
      { status: 'ok', id: 'r1' },
      { status: 'ok', id: 'r2' },
    ]);
    expoSpies.receipts.mockResolvedValue({
      r1: { status: 'ok' },
      r2: { status: 'error', message: 'The device is not registered', details: { error: 'DeviceNotRegistered' } },
    });
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    // the ok tickets — and only those — ride the receipt pass
    expect(expoSpies.receipts).toHaveBeenCalledWith(['r1', 'r2']);
    expect(mocked.pushDevice.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d2'] } } });
  });

  it('logs a non-DeviceNotRegistered receipt error without pruning', async () => {
    expoSpies.send.mockResolvedValue([{ status: 'ok', id: 'r1' }]);
    expoSpies.receipts.mockResolvedValue({
      r1: { status: 'error', message: 'Too many messages', details: { error: 'MessageRateExceeded' } },
    });
    await fanOutPush(['u1'], PAYLOAD);
    expect(mocked.pushDevice.deleteMany).not.toHaveBeenCalled();
  });

  it('a receipts FAILURE never throws and never undoes the ticket-stage pruning', async () => {
    expoSpies.send.mockResolvedValue([
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 'r1' },
    ]);
    expoSpies.receipts.mockRejectedValue(new Error('expo receipts down'));
    await expect(fanOutPush(['u1', 'u2'], PAYLOAD)).resolves.toBeUndefined();
    expect(mocked.pushDevice.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d1'] } } });
  });
});

describe('r327 C3 — ticket errors (the original law, kept)', () => {
  it('prunes DeviceNotRegistered on sight and skips it in the receipt pass', async () => {
    expoSpies.send.mockResolvedValue([
      { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 'r2' },
    ]);
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    expect(mocked.pushDevice.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['d1'] } } });
    expect(expoSpies.receipts).toHaveBeenCalledWith(['r2']);
  });

  it('logs other ticket errors without pruning', async () => {
    expoSpies.send.mockResolvedValue([
      { status: 'error', message: 'too big', details: { error: 'MessageTooBig' } },
    ]);
    await fanOutPush(['u1'], PAYLOAD);
    expect(mocked.pushDevice.deleteMany).not.toHaveBeenCalled();
    expect(expoSpies.receipts).not.toHaveBeenCalled();
  });
});

describe('R353 N — per-user push preferences + quiet hours', () => {
  it('reads the audience’s rows in ONE batched query keyed by the payload type', async () => {
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    expect(mocked.notificationPreference.findMany).toHaveBeenCalledTimes(1);
    expect(mocked.notificationPreference.findMany.mock.calls[0]![0]).toEqual({
      where: { userId: { in: ['u1', 'u2'] }, category: 'ACADEMIC' },
      select: { userId: true, pushEnabled: true, quietStart: true, quietEnd: true },
    });
  });

  it('skips a pushEnabled=false user (absent row = ON)', async () => {
    mocked.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', pushEnabled: false, quietStart: null, quietEnd: null },
    ]);
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    const sent = expoSpies.send.mock.calls[0]![0] as { to: string }[];
    expect(sent.map((m) => m.to)).toEqual(['ExponentPushToken[tok-2]']);
  });

  it('skips a user inside their quiet window (UTC hour, wrap-around-safe by construction)', async () => {
    const h = new Date().getUTCHours();
    // u1: [h, h+1) — always contains the current hour (wraps at 23).
    // u2: [h+1, h+2) — never contains it (the not-quiet control).
    mocked.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', pushEnabled: true, quietStart: h, quietEnd: (h + 1) % 24 },
      { userId: 'u2', pushEnabled: true, quietStart: (h + 1) % 24, quietEnd: (h + 2) % 24 },
    ]);
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    const sent = expoSpies.send.mock.calls[0]![0] as { to: string }[];
    expect(sent.map((m) => m.to)).toEqual(['ExponentPushToken[tok-2]']);
  });

  it('a half-set window (one end null) is NOT quiet — the fan-out’s law', async () => {
    const h = new Date().getUTCHours();
    mocked.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', pushEnabled: true, quietStart: h, quietEnd: null },
    ]);
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    expect(expoSpies.send).toHaveBeenCalledTimes(1); // both devices went out
  });

  it('every recipient muted → the send is skipped entirely', async () => {
    mocked.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', pushEnabled: false, quietStart: null, quietEnd: null },
      { userId: 'u2', pushEnabled: false, quietStart: null, quietEnd: null },
    ]);
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    expect(expoSpies.send).not.toHaveBeenCalled();
    expect(mocked.pushDevice.deleteMany).not.toHaveBeenCalled();
  });
});

describe('R353 N — the message contract (collapse/dedupe, honestly)', () => {
  it('subtitle = type, collapseId = type:link, priority high only for URGENT', async () => {
    await fanOutPush(['u1'], PAYLOAD);
    const msg = (expoSpies.send.mock.calls[0]![0] as Record<string, unknown>[])[0]!;
    expect(msg.subtitle).toBe('ACADEMIC');
    expect(msg.collapseId).toBe('ACADEMIC:/student/materials');
    expect(msg.priority).toBe('default');
    expect(msg.data).toEqual({ link: '/student/materials', type: 'ACADEMIC' });

    expoSpies.send.mockClear();
    const urgent = { ...PAYLOAD, type: 'URGENT' as const };
    await fanOutPush(['u1'], urgent);
    const urgentMsg = (expoSpies.send.mock.calls[0]![0] as Record<string, unknown>[])[0]!;
    expect(urgentMsg.priority).toBe('high');
    expect(urgentMsg.sound).toBe('default');
  });
});

describe('the gate + the never-throws law', () => {
  it('PUSH_ENABLED=false → a no-op: not even the device query', async () => {
    envState.pushEnabled = false;
    await fanOutPush(['u1', 'u2'], PAYLOAD);
    expect(mocked.pushDevice.findMany).not.toHaveBeenCalled();
    expect(expoSpies.send).not.toHaveBeenCalled();
  });

  it('empty audience → a no-op', async () => {
    await fanOutPush([], PAYLOAD);
    expect(mocked.pushDevice.findMany).not.toHaveBeenCalled();
  });

  it('a send failure resolves (best-effort, never throws into the caller)', async () => {
    expoSpies.send.mockRejectedValue(new Error('expo send down'));
    await expect(fanOutPush(['u1'], PAYLOAD)).resolves.toBeUndefined();
  });

  it('no registered devices → nothing to send, nothing to fetch receipts for', async () => {
    mocked.pushDevice.findMany.mockResolvedValue([]);
    await fanOutPush(['u1'], PAYLOAD);
    expect(expoSpies.send).not.toHaveBeenCalled();
    expect(expoSpies.receipts).not.toHaveBeenCalled();
  });
});
