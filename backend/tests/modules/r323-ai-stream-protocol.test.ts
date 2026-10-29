/**
 * Backend unit test — r323 B1.1: the SSE streaming protocol pieces
 * (frame builder, the local composer's chunking, the provider stream
 * client) + wiring source-pins (the route IS the contract — the
 * ai-provider.test.ts technique).
 *
 * DB-free: fetch stubbed at the global with ReadableStream-backed
 * Response bodies (Node ≥20 built-ins).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  AI_LOCAL_STREAM_CHUNK_MAX,
  AiProviderError,
  chunkLocalReply,
  sseFrame,
  streamOpenAiCompatible,
  type AiChatMessage,
  type AiProviderConfig,
} from '../../src/lib/ai.js';

const aiRouteSource = readFileSync(new URL('../../src/http/routes/ai.routes.ts', import.meta.url), 'utf8');
const aiLibSource = readFileSync(new URL('../../src/lib/ai.ts', import.meta.url), 'utf8');
const schemaSource = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
const migrationSource = readFileSync(
  new URL('../../prisma/migrations/20261029013000_r323_ai_quota/migration.sql', import.meta.url),
  'utf8',
);
const envExampleSource = readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8');
const renderSource = readFileSync(new URL('../../../render.yaml', import.meta.url), 'utf8');

const CFG: AiProviderConfig = {
  baseUrl: 'https://provider.example/v1',
  apiKey: 'sk-test-placeholder',
  model: 'test-model',
  models: [],
  timeoutMs: 1000,
};

const MESSAGES: AiChatMessage[] = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'سؤال' },
];

const sseChunk = (delta: string): string =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;

function streamResponse(frames: string[]): Response {
  const encoder = new TextEncoder();
  let i = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < frames.length) controller.enqueue(encoder.encode(frames[i++]!));
      else controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

// ─── sseFrame (the wire grammar) ───────────────────────────────────

describe('sseFrame (the server → student event grammar)', () => {
  it('frames are exactly `event: <name>\\ndata: <json>\\n\\n`', () => {
    expect(sseFrame('token', { t: 'مرحبا' })).toBe('event: token\ndata: {"t":"مرحبا"}\n\n');
  });

  it('every protocol event name is representable and JSON-encodes the payload', () => {
    for (const event of ['token', 'done', 'error'] as const) {
      const frame = sseFrame(event, { x: 1 });
      expect(frame.startsWith(`event: ${event}\ndata: `)).toBe(true);
      expect(frame.endsWith('\n\n')).toBe(true);
      const data = JSON.parse(frame.slice(`event: ${event}\ndata: `.length, -2)) as { x: number };
      expect(data.x).toBe(1);
    }
  });
});

// ─── chunkLocalReply (the local engine's honest streaming) ─────────

describe('chunkLocalReply (local composer streaming)', () => {
  it('empty input → no chunks (nothing is invented)', () => {
    expect(chunkLocalReply('')).toEqual([]);
  });

  it('LOSSLESS: joining the chunks reconstructs the reply byte-for-byte', () => {
    const reply = 'سؤال جيد!\n\nسأفصّل لك الخطوات:\n- راجع المحاضرة الأولى\n- حلّ ثلاثة أسئلة';
    const chunks = chunkLocalReply(reply);
    expect(chunks.join('')).toBe(reply);
  });

  it('merged chunks stay within the cap (except single long words and line breaks)', () => {
    const reply = 'كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة';
    for (const chunk of chunkLocalReply(reply)) {
      expect(chunk.length).toBeLessThanOrEqual(AI_LOCAL_STREAM_CHUNK_MAX);
    }
    expect(chunkLocalReply(reply).length).toBeGreaterThan(1);
  });

  it('a newline closes the current chunk — lines stream as units', () => {
    const chunks = chunkLocalReply('السطر الأول\nالسطر الثاني');
    expect(chunks.some((c) => c.includes('\n'))).toBe(true);
    expect(chunks.join('')).toBe('السطر الأول\nالسطر الثاني');
  });

  it('a single long word passes whole (no word is ever split)', () => {
    const word = 'ا'.repeat(60);
    const chunks = chunkLocalReply(`${word} بعدها`);
    expect(chunks[0]).toBe(word);
    expect(chunks.join('')).toBe(`${word} بعدها`);
  });
});

// ─── streamOpenAiCompatible (the provider SSE client) ──────────────

describe('streamOpenAiCompatible (fetch stubbed, ReadableStream body)', () => {
  it('streams deltas in order, accumulates the full text, and reads the honest usage block', async () => {
    const deltas: string[] = [];
    vi.stubGlobal('fetch', async () =>
      streamResponse([
        sseChunk('الجواب'),
        sseChunk(' الت'),
        sseChunk('امم'),
        `data: ${JSON.stringify({ choices: [{ delta: {} }], model: 'echoed/model:free', usage: { prompt_tokens: 11, completion_tokens: 7 } })}\n\n`,
        'data: [DONE]\n\n',
      ]),
    );
    const out = await streamOpenAiCompatible(CFG, 'test-model', MESSAGES, (d) => deltas.push(d));
    expect(deltas).toEqual(['الجواب', ' الت', 'امم']);
    expect(out).toEqual({ content: 'الجواب التامم', inputTokens: 11, outputTokens: 7, model: 'echoed/model:free' });
  });

  it('sends stream:true with ONE pinned model and include_usage (the wire shape)', async () => {
    let captured: Record<string, unknown> | undefined;
    vi.stubGlobal('fetch', async (_url: string | URL, init: { body: string }) => {
      captured = JSON.parse(init.body) as Record<string, unknown>;
      return streamResponse([sseChunk('ج'), 'data: [DONE]\n\n']);
    });
    await streamOpenAiCompatible(CFG, 'pinned/model:free', MESSAGES, () => {});
    expect(captured).toMatchObject({
      model: 'pinned/model:free',
      stream: true,
      stream_options: { include_usage: true },
      temperature: expect.any(Number),
      max_tokens: expect.any(Number),
    });
  });

  it('a missing usage block records 0 tokens — never estimated (honesty canon)', async () => {
    vi.stubGlobal('fetch', async () => streamResponse([sseChunk('جواب'), 'data: [DONE]\n\n']));
    const out = await streamOpenAiCompatible(CFG, 'm', MESSAGES, () => {});
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
  });

  it('HTTP 429 before the stream is kind=rate_limited with the status attached', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"quota"}}', { status: 429 }));
    const err = await streamOpenAiCompatible(CFG, 'm', MESSAGES, () => {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('rate_limited');
    expect((err as AiProviderError).status).toBe(429);
  });

  it('keep-alive noise (comments, blank data lines) is skipped, never treated as content', async () => {
    vi.stubGlobal('fetch', async () =>
      streamResponse([': OPENROUTER PROCESSING\n\n', 'data: \n\n', sseChunk('جواب'), 'data: [DONE]\n\n']),
    );
    const out = await streamOpenAiCompatible(CFG, 'm', MESSAGES, () => {});
    expect(out.content).toBe('جواب');
  });

  it('a stream ending with NO content is invalid_response — a failure, not a reply', async () => {
    vi.stubGlobal('fetch', async () => streamResponse(['data: [DONE]\n\n']));
    const err = await streamOpenAiCompatible(CFG, 'm', MESSAGES, () => {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('invalid_response');
  });

  it('a mid-stream transport failure is classified (timeout name → kind=timeout)', async () => {
    vi.stubGlobal('fetch', async () => {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.enqueue(encoder.encode(sseChunk('جزء ')));
          const e = new Error('aborted');
          e.name = 'TimeoutError';
          controller.error(e);
        },
      });
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });
    const err = await streamOpenAiCompatible(CFG, 'm', MESSAGES, () => {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).kind).toBe('timeout');
  });
});

// ─── Source-scan wiring pins (the route is the contract) ───────────

describe('ai.routes.ts — the r323 SSE + quota wiring', () => {
  it('the chat endpoint serves BOTH transports on the same gates', () => {
    // Auth + limiter unchanged (router.use + aiLimiter on /chat).
    expect(aiRouteSource).toContain("router.post('/chat', aiLimiter, validate(chatSchema)");
    // The transport switch: stream param OR Accept header.
    expect(aiRouteSource).toContain("req.query.stream === '1'");
    expect(aiRouteSource).toContain("String(req.headers.accept ?? '').includes('text/event-stream')");
  });

  it('the SSE headers are stream-safe (no gzip buffering, no proxy buffering)', () => {
    expect(aiRouteSource).toContain("'text/event-stream; charset=utf-8'");
    expect(aiRouteSource).toContain("'Cache-Control': 'no-cache, no-transform'");
    expect(aiRouteSource).toContain("'X-Accel-Buffering': 'no'");
    // Content-Encoding: identity opts the stream OUT of the platform's
    // gzip middleware (shouldCompress skips pre-encoded bodies).
    expect(aiRouteSource).toContain("'Content-Encoding': 'identity'");
  });

  it('emits exactly the three protocol events, and done carries ids + attribution + citations + quota', () => {
    // writeEvent wraps res.write(sseFrame(event, data)) — the three
    // protocol event names, and only those, flow through it.
    expect(aiRouteSource).toContain("writeEvent('token'");
    expect(aiRouteSource).toContain("writeEvent('done'");
    expect(aiRouteSource).toContain("writeEvent('error'");
    expect(aiRouteSource).toContain('res.write(sseFrame(event, data))');
    for (const key of ['conversationId:', 'messageId:', 'engine: aiProviderLabel', 'citations: [] as unknown[]']) {
      expect(aiRouteSource).toContain(key);
    }
  });

  it('the error event is typed: UPPER_SNAKE code + Arabic message + retryable flag', () => {
    expect(aiRouteSource).toContain("code: failureKind === 'rate_limited' ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_FAILURE'");
    expect(aiRouteSource).toContain('message: providerFailureMessage(failureKind)');
    expect(aiRouteSource).toContain('retryable: failureKind !== \'invalid_response\'');
  });

  it('the daily quota guard runs BEFORE any provider call and rejects with the honest Arabic 429', () => {
    expect(aiRouteSource).toContain('const quota = await consumeQuotaBestEffort(userId);');
    expect(aiRouteSource).toContain('AppError.tooMany(dailyQuotaMessage(quota.limit))');
    // Fail-open on a quota-store outage (chat availability is the
    // pre-existing contract; the rate limiter stays the hard bound).
    expect(aiRouteSource).toContain('failing OPEN');
  });

  it('the JSON path keeps its envelope and gains only the additive quota header', () => {
    expect(aiRouteSource).toContain("res.setHeader('X-Ai-Quota-Remaining', String(quota.remaining))");
    expect(aiRouteSource).toContain('engine: aiProviderLabel');
    expect(aiRouteSource).toContain('model: engine.model');
  });

  it('stream turn writes stay ONE transaction after a complete reply, telemetry honest', () => {
    expect(aiRouteSource).toContain('model: engineModel');
    expect(aiRouteSource).toContain('tokens: outputTokens');
    // A client abort persists NOTHING and writes honest failure telemetry.
    expect(aiRouteSource).toContain("new AiProviderError('client aborted the stream', 'transport')");
  });

  it('the local mode streams its composed reply through chunkLocalReply (never an LLM pretense)', () => {
    expect(aiRouteSource).toContain('chunkLocalReply(reply)');
    expect(aiRouteSource).toContain('model: AI_CHAT_MODEL');
  });

  it('the feedback endpoint upserts ±1 with caller ownership verified', () => {
    expect(aiRouteSource).toContain("router.post('/feedback', validate(aiFeedbackSchema)");
    expect(aiRouteSource).toContain('where: { messageId_userId: { messageId: msg.id, userId } }');
    expect(aiRouteSource).toContain('where: { id: messageId, conversation: { userId } }');
  });
});

describe('schema + migration — the r323 cost-control tables', () => {
  it('schema.prisma declares AiQuota / AiBudget / AiFeedback additively', () => {
    expect(schemaSource).toContain('model AiQuota');
    expect(schemaSource).toContain('model AiBudget');
    expect(schemaSource).toContain('model AiFeedback');
    expect(schemaSource).toContain('rating    Int      @db.SmallInt');
    expect(schemaSource).toContain('@@unique([messageId, userId])');
  });

  it('the hand-written migration creates the exact tables + indexes', () => {
    expect(migrationSource).toContain('CREATE TABLE "AiQuota"');
    expect(migrationSource).toContain('CREATE UNIQUE INDEX "AiQuota_userId_key" ON "AiQuota"("userId");');
    expect(migrationSource).toContain('CREATE TABLE "AiBudget"');
    expect(migrationSource).toContain('CREATE UNIQUE INDEX "AiBudget_monthKey_key" ON "AiBudget"("monthKey");');
    expect(migrationSource).toContain('CREATE TABLE "AiFeedback"');
    expect(migrationSource).toContain('"rating" SMALLINT NOT NULL');
    expect(migrationSource).toContain('CREATE UNIQUE INDEX "AiFeedback_messageId_userId_key" ON "AiFeedback"("messageId", "userId");');
  });
});

describe('operator config — the r323 env vars are documented + optional', () => {
  it('.env.example documents the AI knobs', () => {
    for (const key of ['AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL', 'AI_MODELS', 'AI_TIMEOUT_MS', 'AI_DAILY_LIMIT_DEFAULT']) {
      expect(envExampleSource).toContain(key);
    }
  });

  it('render.yaml carries the new knobs as sync:false placeholders (never required)', () => {
    for (const key of ['AI_TIMEOUT_MS', 'AI_DAILY_LIMIT_DEFAULT']) {
      const i = renderSource.indexOf(`- key: ${key}`);
      expect(i).toBeGreaterThan(-1);
      expect(renderSource.slice(i, i + key.length + 45)).toContain('sync: false');
    }
  });
});

describe('lib/ai.ts — the r323 streaming exports exist (compile-level pins)', () => {
  it('the SSE client and the local chunker are exported for the route + tests', () => {
    expect(aiLibSource).toContain('export function sseFrame(');
    expect(aiLibSource).toContain('export function chunkLocalReply(');
    expect(aiLibSource).toContain('export async function streamOpenAiCompatible(');
    expect(aiLibSource).toContain('export async function streamProviderWithChain(');
    expect(aiLibSource).toContain('export function resolveModelChain(');
    expect(aiLibSource).toContain('export function backoffDelayMs(');
  });
});
