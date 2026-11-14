/**
 * Backend unit test — R353 C2: the CHAIN-mode /ai/chat route conversation
 * (backend/src/http/routes/ai.routes.ts) against LOCAL stub HTTP servers.
 *
 * This sandbox CANNOT reach Gemini or Groq (both geo-block 403 from
 * here), so the chain's two providers are tiny OpenAI-compatible
 * servers bound to 127.0.0.1 — the ai-chat-provider-path.test.ts
 * pattern, in the DB-free unit canon (prisma mocked at db.js, the real
 * app on an ephemeral port with a signed STUDENT JWT).
 *
 * The chain boots through the AI_PROVIDERS JSON grammar (the explicit,
 * owner-authored chain) with apiKeyEnv indirection — no key material
 * inside the JSON blob. What this proves at the ROUTE level:
 *  · cross-provider failover end-to-end: gemini 500 → groq answers,
 *    and the envelope + telemetry name WHO answered (engine label,
 *    provider id — the new AiTelemetry.provider column);
 *  · the chain's terminal fallback: every provider down → the LOCAL
 *    COMPOSER answers, honestly labeled (engine 'local', composer
 *    model, provider 'local', no citations), success telemetry;
 *  · /ai/config's chain summary (ids + model counts + the primary,
 *    never keys) and /status's aiMode='chain';
 *  · the SSE transport rides the same chain (done frame carries the
 *    answering provider; the fallback streams the composer's chunks).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createServer, type Server } from 'node:http';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    membership: { findFirst: vi.fn() },
    aiConversation: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    aiMessage: { findMany: vi.fn(), create: vi.fn() },
    aiTelemetry: { create: vi.fn() },
    studentMastery: { findMany: vi.fn() },
    enrollment: { findMany: vi.fn() },
    courseOffering: { findMany: vi.fn() },
    operationalAlert: { create: vi.fn() },
    // R353 C3: the exam-active guard's liveness probe (mocked → no
    // active attempt by default; the guard's own suite pins it).
    examAttempt: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

// Reserve BOTH stub ports before ANY src import: env.ts parses at
// import time and the AI_PROVIDERS JSON must carry the final URLs.
function reservePort(): number {
  const probe = createServer();
  probe.listen(0);
  const port = (probe.address() as AddressInfo).port;
  probe.close();
  return port;
}
const GEMINI_PORT = reservePort();
const GROQ_PORT = reservePort();

process.env.GEMINI_API_KEY = 'gem-stub-key';
process.env.GROQ_API_KEY = 'groq-stub-key';
process.env.AI_PROVIDERS = JSON.stringify({
  providers: [
    {
      id: 'gemini',
      baseUrl: `http://127.0.0.1:${GEMINI_PORT}/v1beta/openai/`,
      apiKeyEnv: 'GEMINI_API_KEY',
      models: ['gemini-stub-a'],
      timeoutMs: 5_000,
    },
    {
      id: 'groq',
      baseUrl: `http://127.0.0.1:${GROQ_PORT}/openai/v1`,
      apiKeyEnv: 'GROQ_API_KEY',
      models: ['groq-stub-b'],
      timeoutMs: 5_000,
    },
  ],
});

type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');
type ProvidersModule = typeof import('../../src/lib/ai/providers.js');

let appMod: AppModule;
let prisma: DbModule['prisma'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;
let geminiStub: Server;
let groqStub: Server;

/** Every wire request a stub provider saw. */
interface WireCall {
  url: string;
  auth: string | undefined;
  body: Record<string, unknown>;
}
const geminiCalls: WireCall[] = [];
const groqCalls: WireCall[] = [];

type StubMode = 'ok' | 'error5xx' | 'stream';

function startStub(
  port: number,
  mode: () => StubMode,
  calls: WireCall[],
  okModel: string,
  okContent: string,
): Promise<Server> {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += String(chunk);
      });
      req.on('end', () => {
        calls.push({
          url: req.url ?? '',
          auth: req.headers.authorization,
          body: JSON.parse(raw) as Record<string, unknown>,
        });
        if (mode() === 'error5xx') {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'stub outage' } }));
          return;
        }
        if (mode() === 'stream') {
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'بثّ ' } }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'من groq' } }] })}\n\n`);
          res.write(
            `data: ${JSON.stringify({ model: okModel, usage: { prompt_tokens: 7, completion_tokens: 5 } })}\n\n`,
          );
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            model: okModel,
            choices: [{ message: { content: okContent } }],
            usage: { prompt_tokens: 40, completion_tokens: 12 },
          }),
        );
      });
    });
    srv.listen(port, '127.0.0.1', () => resolve(srv));
  });
}

let geminiMode: StubMode = 'ok';
let groqMode: StubMode = 'ok';

const STUDENT_ID = 'student-chain-1';
const INSTITUTION_ID = 'inst-chain-test';

beforeAll(async () => {
  geminiStub = await startStub(GEMINI_PORT, () => geminiMode, geminiCalls, 'gemini-stub-a', 'جواب من gemini المزيّف عبر HTTP');
  groqStub = await startStub(GROQ_PORT, () => groqMode, groqCalls, 'groq-stub-b', 'جواب حقيقيّ من مزوّد groq المزيّف عبر HTTP');

  appMod = await import('../../src/app.js');
  const dbMod: DbModule = await import('../../src/db.js');
  prisma = dbMod.prisma;
  server = appMod.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await Promise.all([
    new Promise<void>((resolve) => geminiStub.close(() => resolve())),
    new Promise<void>((resolve) => groqStub.close(() => resolve())),
  ]);
  for (const k of ['GEMINI_API_KEY', 'GROQ_API_KEY', 'AI_PROVIDERS']) delete process.env[k];
});

async function authHeaders(): Promise<Record<string, string>> {
  const { signAccessToken } = await import('../../src/lib/jwt.js');
  return {
    authorization: `Bearer ${signAccessToken(STUDENT_ID, Role.STUDENT, INSTITUTION_ID)}`,
    'content-type': 'application/json',
  };
}

async function chat(message: string, opts: { stream?: boolean } = {}): Promise<Response> {
  return fetch(`${baseUrl}/api/v1/ai/chat${opts.stream ? '?stream=1' : ''}`, {
    method: 'POST',
    headers: { ...(await authHeaders()), accept: opts.stream ? 'text/event-stream' : 'application/json' },
    body: JSON.stringify({ message }),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  geminiMode = 'ok';
  groqMode = 'ok';
  geminiCalls.length = 0;
  groqCalls.length = 0;
  vi.mocked(prisma.studentMastery.findMany).mockResolvedValue([] as never);
  // R353 C3: no active exam attempt by default (the guard's own suite
  // pins the mid-exam behavior).
  vi.mocked(prisma.examAttempt.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.membership.findFirst).mockResolvedValue({ institutionId: INSTITUTION_ID } as never);
  vi.mocked(prisma.aiConversation.create).mockResolvedValue({
    id: 'conv-chain',
    userId: STUDENT_ID,
    title: 'س',
    createdAt: new Date(0),
  } as never);
  vi.mocked(prisma.aiMessage.create).mockImplementation(
    async (args: { data: { content: string } }) =>
      ({ id: 'msg-chain', content: args.data.content, tokens: 0 }) as never,
  );
  vi.mocked(prisma.aiTelemetry.create).mockResolvedValue({} as never);
  // The process-wide breaker starts each case clean (the route and
  // this test share ONE module registry — the same instance).
  const providersMod: ProvidersModule = await import('../../src/lib/ai/providers.js');
  providersMod.aiProviderBreakers.reset();
});

describe('POST /api/v1/ai/chat — CHAIN mode (AI_PROVIDERS JSON, localhost stub providers)', () => {
  it('cross-provider failover: gemini 500s → groq answers; envelope + telemetry name groq', async () => {
    geminiMode = 'error5xx';

    const res = await chat('سؤال عبر السلسلة');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { reply: string; engine: string; model: string; provider?: string };
    };
    expect(body.data.reply).toBe('جواب حقيقيّ من مزوّد groq المزيّف عبر HTTP');
    // WHO answered: the stable chain provider id + the honest LABEL.
    // The label stays URL-derived (r175): a localhost stub is labeled
    // by its hostname — never a vendor name it did not earn — while
    // `provider` carries the chain's stable id (telemetry key).
    expect(body.data.engine).toBe('127.0.0.1');
    expect(body.data.provider).toBe('groq');
    expect(body.data.model).toBe('groq-stub-b');

    // The wire: gemini burned attempt + its one retry (5xx retryable),
    // then the groq fall-through — each with its OWN key.
    expect(geminiCalls).toHaveLength(2);
    expect(geminiCalls[0]!.auth).toBe('Bearer gem-stub-key');
    expect(groqCalls).toHaveLength(1);
    expect(groqCalls[0]!.auth).toBe('Bearer groq-stub-key');
    expect(groqCalls[0]!.url).toBe('/openai/v1/chat/completions');
    // The chain pins ONE model per attempt — a plain model field only.
    expect(groqCalls[0]!.body.model).toBe('groq-stub-b');
    expect(groqCalls[0]!.body.models).toBeUndefined();

    // Telemetry records WHO answered (the new provider column).
    expect(prisma.aiTelemetry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ model: 'groq-stub-b', provider: 'groq', success: true }),
    });
  });

  it('the chain is honest when gemini answers: engine/provider gemini, its own key on the wire', async () => {
    const res = await chat('سؤال');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { engine: string; provider?: string; model: string } };
    // The URL-derived honest label (the stub's hostname) + the chain id.
    expect(body.data.engine).toBe('127.0.0.1');
    expect(body.data.provider).toBe('gemini');
    expect(body.data.model).toBe('gemini-stub-a');
    expect(geminiCalls).toHaveLength(1);
    expect(groqCalls).toHaveLength(0);
    expect(prisma.aiTelemetry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ provider: 'gemini', success: true }),
    });
  });

  it('every provider down → the LOCAL COMPOSER terminal fallback, honestly labeled (no citations, provider local)', async () => {
    geminiMode = 'error5xx';
    groqMode = 'error5xx';

    const res = await chat('سؤال بعد سقوط السلسلة');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { reply: string; engine: string; model: string; provider?: string; citations: unknown[] };
    };
    // A real reply (the mastery-aware composer with no rows → the
    // generic template), wearing its OWN honest labels.
    expect(typeof body.data.reply).toBe('string');
    expect(body.data.reply.length).toBeGreaterThan(0);
    expect(body.data.engine).toBe('local');
    expect(body.data.model).toBe('gap-aware-composer');
    expect(body.data.provider).toBe('local');
    // The composer never read the retrieved sources — no citations.
    expect(body.data.citations).toEqual([]);

    // Both providers were walked (attempt + retry each) before the
    // fallback: 2 + 2 wire calls.
    expect(geminiCalls).toHaveLength(2);
    expect(groqCalls).toHaveLength(2);

    // ONE success telemetry row for the local turn — the provider
    // failures were logged by the runner (per fall-through), and the
    // row honestly names the composer + 'local'.
    expect(prisma.aiTelemetry.create).toHaveBeenCalledTimes(1);
    expect(prisma.aiTelemetry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        model: 'gap-aware-composer',
        provider: 'local',
        success: true,
      }),
    });
  });

  it('GET /ai/config reports the chain summary (ids + model counts + the primary) WITHOUT keys', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/config`, { headers: await authHeaders() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        provider: string;
        model: string;
        chain: { primary: string; providers: Array<{ id: string; models: number }> };
      };
    };
    expect(body.data.provider).toBe('chain');
    expect(body.data.model).toBe('gemini-stub-a +1');
    expect(body.data.chain).toEqual({
      primary: 'gemini',
      providers: [
        { id: 'gemini', models: 1, tasks: ['chat'] },
        { id: 'groq', models: 1, tasks: ['chat'] },
      ],
    });
    // NEVER keys: the raw payload must not leak any key material.
    const raw = JSON.stringify(body);
    expect(raw).not.toContain('gem-stub-key');
    expect(raw).not.toContain('groq-stub-key');
  });

  it('GET /api/v1/status reports aiMode=chain (≥2 providers configured)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { aiMode: string } };
    expect(body.data.aiMode).toBe('chain');
  });

  it('the SSE transport rides the same chain: gemini 500 → groq streams; the done frame names groq', async () => {
    geminiMode = 'error5xx';
    groqMode = 'stream';

    const res = await chat('سؤال البثّ', { stream: true });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const raw = await res.text();
    // Tokens streamed from groq only, then the done frame.
    expect(raw).toContain('event: token');
    expect(raw).toContain('بثّ من groq');
    expect(raw).toContain('event: done');
    const doneFrame = /event: done\ndata: (.+)\n\n/.exec(raw);
    expect(doneFrame).not.toBeNull();
    const done = JSON.parse(doneFrame![1]!) as {
      reply: string;
      engine: string;
      model: string;
      provider?: string;
    };
    expect(done.reply).toBe('بثّ من groq');
    expect(done.engine).toBe('127.0.0.1'); // the URL-derived honest label
    expect(done.provider).toBe('groq'); // the chain's stable id
    expect(done.model).toBe('groq-stub-b');
    // Telemetry: WHO streamed the answer.
    expect(prisma.aiTelemetry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ model: 'groq-stub-b', provider: 'groq', success: true }),
    });
  });

  it('the SSE fallback: every provider down before any token → the composer streams, honestly labeled', async () => {
    geminiMode = 'error5xx';
    groqMode = 'error5xx';

    const res = await chat('سؤال بثّ بعد السقوط', { stream: true });
    expect(res.status).toBe(200);
    const raw = await res.text();
    expect(raw).toContain('event: token');
    const doneFrame = /event: done\ndata: (.+)\n\n/.exec(raw);
    expect(doneFrame).not.toBeNull();
    const done = JSON.parse(doneFrame![1]!) as {
      engine: string;
      model: string;
      provider?: string;
      citations: unknown[];
    };
    expect(done.engine).toBe('local');
    expect(done.model).toBe('gap-aware-composer');
    expect(done.provider).toBe('local');
    expect(done.citations).toEqual([]);
    expect(prisma.aiTelemetry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ provider: 'local', success: true }),
    });
  });

  it('a failure storm opens the gemini breaker at the ROUTE level: the next turn skips gemini (0 wire calls)', async () => {
    geminiMode = 'error5xx';
    for (let turn = 0; turn < 3; turn += 1) {
      const res = await chat(`سؤال العاصفة ${turn}`);
      expect(res.status).toBe(200); // groq carried every turn
    }
    expect(geminiCalls).toHaveLength(6); // 3 turns × (attempt + retry)

    // The 4th turn: gemini's breaker is OPEN — skipped entirely.
    geminiCalls.length = 0;
    groqCalls.length = 0;
    const res = await chat('سؤال بعد فتح القاطع');
    expect(res.status).toBe(200);
    expect(geminiCalls).toHaveLength(0);
    expect(groqCalls).toHaveLength(1);
    const body = (await res.json()) as { data: { provider?: string } };
    expect(body.data.provider).toBe('groq');
  });
});
