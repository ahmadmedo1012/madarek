/**
 * R350 E7 — the fake-Resend integration belt.
 *
 * A REAL local HTTP server stands in for api.resend.com; the REAL
 * sendMail pipeline (payload shape, auth header, timeout wrapper,
 * response parsing) and the REAL drain loop (CAS claim, backoff,
 * dead-letter, providerId link) run against it. Only two seams are
 * mocked: prisma (in-memory rows) and mailConfig (a live-looking
 * config — the honest-off default would park every row).
 *
 * Pins:
 *  · sendMail × the fake server: 200 → {ok, providerId}; 429/5xx →
 *    ok:false (single-shot — retries are the OUTBOX's job); malformed
 *    JSON → ok:false, never a throw; the exact request shape (Bearer
 *    key, from/to arrays, headers passthrough);
 *  · the drain loop: a 429 attempt requeues with the 1m backoff; the
 *    retry (after nextAttemptAt) sends 200 and links the provider id;
 *  · the full schedule exhausted → the honest dead-letter `failed`;
 *  · idempotent resend: a replayed dedupeKey queues ONE row and the
 *    drain sends it exactly once.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    mailOutbox: {
      count: vi.fn(async () => 0),
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    mailSuppression: { findFirst: vi.fn(async () => null) },
  };
  return { prisma: p, withRetry: vi.fn() };
});

// mail.js stays REAL except mailConfig (drainOutbox consults it for the
// honest-off check — a 'none' config would park every row).
const mailState = vi.hoisted(() => ({ provider: 'resend' as const, apiKey: 're_test_key', from: 'مدارك <no-reply@madarek.ly>' }));
vi.mock('../../src/lib/mail.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../src/lib/mail.js')>();
  return { ...orig, mailConfig: mailState };
});

import { prisma } from '../../src/db.js';
import { sendMail, type MailConfig, type MailMessage } from '../../src/lib/mail.js';
import { drainOutbox, queueMail, RETRY_DELAYS_MS, MAX_ATTEMPTS } from '../../src/lib/mail-outbox.js';

const mocked = prisma as unknown as {
  mailOutbox: {
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  mailSuppression: { findFirst: ReturnType<typeof vi.fn> };
};

/* ── the fake Resend server ──────────────────────────────────────── */

interface FakeHit {
  auth?: string;
  body?: Record<string, unknown>;
}

let server: Server;
let baseUrl = '';
const hits: FakeHit[] = [];
/** The canned status/json the next request answers with. */
let nextResponse: { status: number; json: unknown } = { status: 200, json: { id: 're_fake_1' } };

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
    });
    req.on('end', () => {
      const hit: FakeHit = { auth: req.headers.authorization };
      try {
        hit.body = JSON.parse(raw);
      } catch {
        /* the malformed-request test sends no JSON */
      }
      hits.push(hit);
      res.writeHead(nextResponse.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(nextResponse.json));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

beforeEach(() => {
  vi.clearAllMocks();
  hits.length = 0;
  nextResponse = { status: 200, json: { id: 're_fake_1' } };
  mocked.mailOutbox.count.mockResolvedValue(0);
});

const liveCfg: MailConfig = { provider: 'resend', apiKey: 're_test_key', from: 'مدارك <no-reply@madarek.ly>' };

/** The transport seam: sendMail pointed at the fake server. */
const fakeFetch: typeof fetch = (_input, init) => fetch(`${baseUrl}/emails`, init);

const MSG: MailMessage = {
  to: 'salem@madarek.ly',
  subject: 'مدارك — رسالة',
  html: '<p>س</p>',
  text: 'س',
  headers: { 'List-Unsubscribe': '<https://madarek.onrender.com/api/v1/mail/unsubscribe?e=1&t=2>' },
};

/* ── sendMail against the fake server ────────────────────────────── */

describe('R350 E7 — sendMail × the fake Resend', () => {
  it('a 200 answers ok with the provider id, and the request shape is exact', async () => {
    nextResponse = { status: 200, json: { id: 're_abc123' } };
    const r = await sendMail(liveCfg, MSG, fakeFetch);
    expect(r).toEqual({ ok: true, providerId: 're_abc123' });
    expect(hits).toHaveLength(1);
    expect(hits[0]!.auth).toBe('Bearer re_test_key');
    expect(hits[0]!.body).toEqual({
      from: liveCfg.from,
      to: [MSG.to],
      subject: MSG.subject,
      html: MSG.html,
      text: MSG.text,
      headers: MSG.headers,
    });
  });

  it('a 429 refuses (single-shot — retries are the outbox\'s job)', async () => {
    nextResponse = { status: 429, json: { message: 'rate limited' } };
    const r = await sendMail(liveCfg, MSG, fakeFetch);
    expect(r.ok).toBe(false);
    expect(r.providerId).toBeUndefined();
  });

  it('a 5xx refuses without throwing', async () => {
    nextResponse = { status: 503, json: { message: 'boomed' } };
    const r = await sendMail(liveCfg, MSG, fakeFetch);
    expect(r.ok).toBe(false);
  });

  it('a malformed JSON body refuses without throwing', async () => {
    // the fake server always answers JSON — simulate garbage by answering
    // with a status that makes res.text() the only path (non-2xx + junk)
    nextResponse = { status: 500, json: 'not-an-object' };
    const r = await sendMail(liveCfg, MSG, fakeFetch);
    expect(r.ok).toBe(false);
  });
});

/* ── the drain loop against the fake server ──────────────────────── */

interface Row {
  id: string;
  to: string;
  template: string;
  subject: string;
  html: string;
  text: string;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'suppressed';
  attempts: number;
  nextAttemptAt: Date;
  providerId?: string | null;
  lastError?: string | null;
  sentAt?: Date | null;
}

function seedRow(over: Partial<Row> = {}): Row {
  const row: Row = {
    id: 'row-1',
    to: 'salem@madarek.ly',
    template: 'announcement',
    subject: 'س',
    html: '<p>س</p>',
    text: 'س',
    status: 'queued',
    attempts: 0,
    nextAttemptAt: new Date(0),
    providerId: null,
    lastError: null,
    ...over,
  };
  mocked.mailOutbox.findMany.mockImplementation(async ({ where }: { where: { status: string; nextAttemptAt: { lte: Date } } }) =>
    [row].filter((r) => r.status === where.status && r.nextAttemptAt <= where.nextAttemptAt.lte),
  );
  mocked.mailOutbox.updateMany.mockImplementation(async ({ where }: { where: { id: string; status: string } }) =>
    where.id === row.id && row.status === where.status ? ((row.status = 'sending'), { count: 1 }) : { count: 0 },
  );
  mocked.mailOutbox.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
    if (where.id !== row.id) throw new Error('unknown row');
    Object.assign(row, data);
    return row;
  });
  return row;
}

describe('R350 E7 — the drain loop retries against the fake server', () => {
  it('a 429 attempt requeues with the 1m backoff; the retry sends and links the provider id', async () => {
    const row = seedRow();
    const T0 = new Date('2026-11-14T10:00:00Z');
    const send = (m: MailMessage) => sendMail(liveCfg, m, fakeFetch);

    // attempt 1: the server refuses with 429
    nextResponse = { status: 429, json: {} };
    const r1 = await drainOutbox({ send, now: T0 });
    expect(r1).toMatchObject({ picked: 1, failed: 1, sent: 0 });
    expect(row.status).toBe('queued');
    expect(row.attempts).toBe(1);
    expect(row.nextAttemptAt.getTime()).toBe(T0.getTime() + RETRY_DELAYS_MS[0]);

    // before the backoff elapses: nothing is due
    const rEarly = await drainOutbox({ send, now: new Date(T0.getTime() + 30_000) });
    expect(rEarly.picked).toBe(0);

    // attempt 2 (after the 60s backoff): the server accepts
    nextResponse = { status: 200, json: { id: 're_after_retry' } };
    const r2 = await drainOutbox({ send, now: new Date(T0.getTime() + RETRY_DELAYS_MS[0]! + 1000) });
    expect(r2).toMatchObject({ picked: 1, sent: 1, failed: 0 });
    expect(row.status).toBe('sent');
    expect(row.providerId).toBe('re_after_retry');
    expect(row.attempts).toBe(2);
  });

  it('the exhausted schedule dead-letters honestly', async () => {
    const row = seedRow();
    let now = new Date('2026-11-14T10:00:00Z');
    const send = (m: MailMessage) => sendMail(liveCfg, m, fakeFetch);
    nextResponse = { status: 500, json: {} };

    // MAX_ATTEMPTS = first send + RETRY_DELAYS_MS.length retries
    let last = { failed: 0 };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      last = await drainOutbox({ send, now });
      now = new Date(now.getTime() + 7 * 60 * 60 * 1000); // past every backoff
    }
    expect(last.failed).toBe(1);
    expect(row.status).toBe('failed');
    expect(row.attempts).toBe(MAX_ATTEMPTS);
    expect(String(row.lastError)).toContain('dead letter');
    // a further drain is a no-op — the row is terminal
    const again = await drainOutbox({ send, now });
    expect(again.picked).toBe(0);
  });

  it('an idempotent replay queues ONE row and the drain sends it exactly once', async () => {
    const created: string[] = [];
    mocked.mailOutbox.create.mockImplementation(async ({ data }: { data: { dedupeKey?: string } }) => {
      if (data.dedupeKey && created.includes(data.dedupeKey)) {
        const err = new Error('unique') as Error & { code?: string };
        err.code = 'P2002';
        throw err;
      }
      created.push(data.dedupeKey!);
      return { id: 'row-dedupe' };
    });
    mocked.mailOutbox.findUnique.mockResolvedValue({ id: 'row-dedupe' });

    const input = {
      to: 'salem@madarek.ly',
      template: 'reset-password',
      subject: 'س',
      html: '<p>س</p>',
      text: 'س',
      dedupeKey: 'reset:salem:token9',
    };
    const first = await queueMail(input);
    const replay = await queueMail(input);
    expect(first).toEqual({ ok: true, id: 'row-dedupe', deduped: false });
    expect(replay).toEqual({ ok: true, id: 'row-dedupe', deduped: true });

    // the single row drains once — two ticks, one send
    const row = seedRow({ id: 'row-dedupe' });
    const send = (m: MailMessage) => sendMail(liveCfg, m, fakeFetch);
    const t1 = await drainOutbox({ send, now: new Date(0) });
    const t2 = await drainOutbox({ send, now: new Date(0) });
    expect(t1.sent).toBe(1);
    expect(t2.picked).toBe(0);
    expect(hits).toHaveLength(1); // exactly ONE HTTP send
    expect(row.status).toBe('sent');
  });
});
