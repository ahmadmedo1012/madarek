/**
 * R354 V2 — POST /api/v1/internal/ai-selftest, the route belt.
 *
 * Pins (app-level, through the real Express pipeline, selftest engine
 * MOCKED — the engine itself is covered by ai-selftest.test.ts):
 *  · no CRON_SECRET configured → 503 fail-closed;
 *  · wrong secret → 401, uniform body;
 *  · right secret (Bearer AND ?key=) → 200 with the report envelope
 *    ({data:{ok,report:{aiMode,probes,…}}}) and NO key material;
 *  · the report is EXACTLY the engine's (the route adds nothing).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

// CRON_SECRET must exist BEFORE the env module (and the app) parse it.
process.env.CRON_SECRET = 'selftest_secret_0123456789abcdef';

vi.mock('../../src/db.js', () => ({
  prisma: {
    tickRun: {
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
      update: vi.fn(async () => ({})),
    },
    withRetry: vi.fn(),
  },
}));

vi.mock('../../src/lib/ai/selftest.js', () => ({
  runAiSelftest: vi.fn(async () => ({
    ranAtIso: '2026-11-15T00:00:00.000Z',
    region: 'fra1',
    aiMode: 'chain',
    providerCount: 2,
    totalBudgetMs: 50000,
    probes: [
      {
        provider: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        modelsTried: ['gemini-2.5-flash'],
        modelsList: { ok: true, status: 200, latencyMs: 210, modelCount: 42, sample: ['gemini-2.5-flash', 'gemini-2.5-pro'] },
        completion: { ok: true, status: 200, latencyMs: 640, model: 'gemini-2.5-flash', replyChars: 1 },
        error: null,
      },
      {
        provider: 'groq',
        baseUrl: 'https://api.groq.com/openai/v1',
        modelsTried: ['llama-3.3-70b-versatile'],
        modelsList: { ok: false, status: 403, latencyMs: 95, modelCount: null },
        completion: { ok: false, status: 403, latencyMs: 88, model: 'llama-3.3-70b-versatile', replyChars: null },
        error: 'API key not authorized',
      },
    ],
    configWarnings: [],
  })),
}));

let baseUrl: string;
let server: ReturnType<ReturnType<typeof import('../../src/app.js')['createApp']>['listen']>;

beforeAll(async () => {
  const { createApp } = await import('../../src/app.js');
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const post = (path: string, headers: Record<string, string> = {}) =>
  fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers } });

describe('POST /api/v1/internal/ai-selftest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('answers 200 with the report for the right Bearer secret', async () => {
    const res = await post('/api/v1/internal/ai-selftest', {
      authorization: 'Bearer selftest_secret_0123456789abcdef',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { ok: boolean; report: { aiMode: string; region: string | null; probes: Array<{ provider: string }> } };
    };
    expect(body.data.ok).toBe(true);
    expect(body.data.report.aiMode).toBe('chain');
    expect(body.data.report.region).toBe('fra1');
    expect(body.data.report.probes.map((p) => p.provider)).toEqual(['gemini', 'groq']);
  });

  it('accepts the ?key= form', async () => {
    const res = await post('/api/v1/internal/ai-selftest?key=selftest_secret_0123456789abcdef');
    expect(res.status).toBe(200);
  });

  it('401s the wrong secret without probing anything', async () => {
    const res = await post('/api/v1/internal/ai-selftest', { authorization: 'Bearer wrong-secret' });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('401s a missing secret', async () => {
    const res = await post('/api/v1/internal/ai-selftest');
    expect(res.status).toBe(401);
  });

  it('503s fail-closed when CRON_SECRET is not configured', async () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    vi.resetModules();
    try {
      const { createApp: freshCreateApp } = await import('../../src/app.js');
      const freshServer = freshCreateApp().listen(0);
      const freshUrl = `http://127.0.0.1:${(freshServer.address() as AddressInfo).port}`;
      const res = await fetch(`${freshUrl}/api/v1/internal/ai-selftest`, { method: 'POST' });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error: { code: string } };
      expect(body.error.code).toBe('SELFTEST_DISABLED');
      await new Promise<void>((resolve) => freshServer.close(() => resolve()));
    } finally {
      process.env.CRON_SECRET = previous;
      vi.resetModules();
    }
  });
});
