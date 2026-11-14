/**
 * R350 E4 — the mail webhook + one-click unsubscribe, pinned.
 *
 * The law (backend/src/http/routes/mail.routes.ts):
 *  · svix verification: HMAC-SHA256(secret, `${id}.${ts}.${body}`) —
 *    good signature passes, bad/missing fails, unset secret refuses
 *    (fail-closed);
 *  · email.bounced / email.complained → MailSuppression upserts;
 *  · the signed unsubscribe token round-trips; a wrong token is
 *    rejected with timing-safe comparison.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';

// env.ts is import-time evaluated; NODE_ENV=test gives deterministic
// placeholder secrets. The webhook secret is ours to set — vi.hoisted so
// it lands before any import runs.
vi.hoisted(() => {
  process.env.RESEND_WEBHOOK_SECRET = 'whsec_test_secret_0123456789';
});

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    mailSuppression: { upsert: vi.fn(), findFirst: vi.fn() },
    mailOutbox: { updateMany: vi.fn() },
  };
  return { prisma: p, withRetry: vi.fn() };
});

import type { AddressInfo } from 'node:net';
import { prisma } from '../../src/db.js';
import { verifySvixSignature, unsubscribeToken, verifyUnsubscribeToken } from '../../src/http/routes/mail.routes.js';
import { createApp } from '../../src/app.js';

const mocked = prisma as unknown as {
  mailSuppression: { upsert: ReturnType<typeof vi.fn> };
  mailOutbox: { updateMany: ReturnType<typeof vi.fn> };
};

const SECRET = 'whsec_test_secret_0123456789';

function signedHeaders(body: string, secret = SECRET, id = 'msg_test', ts = '1794600000') {
  const sig = createHmac('sha256', secret).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` };
}

describe('R350 E4 — verifySvixSignature (pure)', () => {
  const body = JSON.stringify({ type: 'email.bounced', data: { email: 'x@y.z' } });
  it('accepts a correctly signed payload', () => {
    expect(verifySvixSignature(body, signedHeaders(body), SECRET)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifySvixSignature(body + 'x', signedHeaders(body), SECRET)).toBe(false);
  });
  it('rejects the wrong secret', () => {
    expect(verifySvixSignature(body, signedHeaders(body, 'whsec_OTHER'), SECRET)).toBe(false);
  });
  it('rejects missing headers', () => {
    expect(verifySvixSignature(body, {}, SECRET)).toBe(false);
  });
});

describe('R350 E4 — the unsubscribe token (pure)', () => {
  it('round-trips for the right email and rejects the wrong one', () => {
    const t = unsubscribeToken('user@x.ly');
    expect(verifyUnsubscribeToken('user@x.ly', t)).toBe(true);
    expect(verifyUnsubscribeToken('other@x.ly', t)).toBe(false);
  });
  it('rejects garbage tokens safely', () => {
    expect(verifyUnsubscribeToken('user@x.ly', 'garbage')).toBe(false);
  });
});

describe('R350 E4 — the webhook route (http)', () => {
  let baseUrl: string;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocked.mailSuppression.upsert.mockResolvedValue({});
    server = createApp().listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('a hard bounce upserts the suppression list', async () => {
    const body = JSON.stringify({ type: 'email.bounced', data: { email: 'Bounced@x.ly', email_id: 'em_1' } });
    const res = await fetch(`${baseUrl}/api/v1/mail/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signedHeaders(body) },
      body,
    });
    expect(res.status).toBe(200);
    expect(mocked.mailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email_type: { email: 'bounced@x.ly', type: 'hard_bounce' } },
      }),
    );
  });

  it('a complaint upserts the suppression list', async () => {
    const body = JSON.stringify({ type: 'email.complained', data: { email: 'angry@x.ly' } });
    const res = await fetch(`${baseUrl}/api/v1/mail/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signedHeaders(body) },
      body,
    });
    expect(res.status).toBe(200);
    expect(mocked.mailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email_type: { email: 'angry@x.ly', type: 'complaint' } } }),
    );
  });

  it('a bad signature is refused 401 and nothing is written', async () => {
    const body = JSON.stringify({ type: 'email.bounced', data: { email: 'x@y.z' } });
    const res = await fetch(`${baseUrl}/api/v1/mail/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'svix-id': 'a', 'svix-timestamp': '1', 'svix-signature': 'v1,AAAA' },
      body,
    });
    expect(res.status).toBe(401);
    expect(mocked.mailSuppression.upsert).not.toHaveBeenCalled();
  });

  it('unknown events are acknowledged without writes', async () => {
    const body = JSON.stringify({ type: 'email.sent', data: { email: 'x@y.z' } });
    const res = await fetch(`${baseUrl}/api/v1/mail/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signedHeaders(body) },
      body,
    });
    expect(res.status).toBe(200);
    expect(mocked.mailSuppression.upsert).not.toHaveBeenCalled();
  });
});

describe('R350 E4 — the public unsubscribe (http)', () => {
  let baseUrl: string;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocked.mailSuppression.upsert.mockResolvedValue({});
    server = createApp().listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET with a valid token suppresses and serves the Arabic page', async () => {
    const token = unsubscribeToken('user@x.ly');
    const res = await fetch(`${baseUrl}/api/v1/mail/unsubscribe?email=user@x.ly&token=${encodeURIComponent(token)}`);
    expect(res.status).toBe(200);
    expect(mocked.mailSuppression.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email_type: { email: 'user@x.ly', type: 'unsubscribe' } } }),
    );
    const html = await res.text();
    expect(html).toContain('تم إلغاء اشتراك');
    expect(html).toContain('dir="rtl"');
  });

  it('an invalid token serves the refusal page and writes nothing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/mail/unsubscribe?email=user@x.ly&token=wrong`);
    expect(res.status).toBe(400);
    expect(mocked.mailSuppression.upsert).not.toHaveBeenCalled();
  });

  it('POST (RFC 8058 one-click) behaves like GET', async () => {
    const token = unsubscribeToken('user@x.ly');
    const res = await fetch(`${baseUrl}/api/v1/mail/unsubscribe?email=user@x.ly&token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    expect(mocked.mailSuppression.upsert).toHaveBeenCalledOnce();
  });
});
