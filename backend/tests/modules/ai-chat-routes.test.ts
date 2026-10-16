/**
 * Backend unit test — r166d (WS-F): the real /ai/chat ROUTE conversation
 * (backend/src/http/routes/ai.routes.ts) in BOTH engine modes.
 *
 * ai-provider.test.ts pins the lib's pure helpers + the fetch-stubbed
 * client and source-scans the route's wiring; what had no coverage is
 * the route itself against the real app — the mode switch, the
 * transaction shape, the per-turn engine attribution envelope
 * (r166d: engine + model), and the failure path (Arabic 500 + failure
 * telemetry row + NOTHING written to the conversation).
 *
 * DB-free (the project canon): prisma mocked at db.js; the real app on
 * an ephemeral port with a signed STUDENT JWT (owner-alerts-counts
 * pattern). The OPENAI mode boots a SECOND module registry with the
 * AI_* env vars injected BEFORE import (env.ts is import-time; test
 * mode skips the fail-closed superRefine, so the fake key+model parse
 * fine — same synthetic placeholders ai-provider.test.ts uses) and the
 * provider wire stubbed at global fetch.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => {
  // Self-contained factory: every module registry (the local one AND the
  // vi.resetModules one below) gets a FRESH mock instance, so $transaction
  // hands the callback THIS instance as the tx client.
  const p: Record<string, unknown> = {
    aiConversation: { findFirst: vi.fn(), create: vi.fn() },
    aiMessage: { findMany: vi.fn(), create: vi.fn() },
    aiTelemetry: { create: vi.fn() },
    studentMastery: { findMany: vi.fn() },
    operationalAlert: { create: vi.fn() },
    $queryRaw: vi.fn(),
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

// ── Shared helpers ────────────────────────────────────────────────

const STUDENT_ID = 'student-1';
const bearer = () => ({ authorization: `Bearer ${signAccessToken(STUDENT_ID, Role.STUDENT)}` });

function startServer(app: ReturnType<typeof createApp>) {
  const server = app.listen(0);
  return {
    server,
    baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
  };
}

function closeServer(server: ReturnType<ReturnType<typeof createApp>['listen']>) {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

const chatBody = (message: string, conversationId?: string) =>
  JSON.stringify(conversationId ? { conversationId, message } : { message });

// ── LOCAL mode (the default test env — AI_* unset) ────────────────

describe('POST /api/v1/ai/chat — LOCAL mode (default test env)', () => {
  let baseUrl: string;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;

  const convCreate = vi.mocked(prisma.aiConversation.create);
  const msgCreate = vi.mocked(prisma.aiMessage.create);
  const telemetryCreate = vi.mocked(prisma.aiTelemetry.create);
  const masteryFindMany = vi.mocked(prisma.studentMastery.findMany);
  const transaction = vi.mocked(prisma.$transaction);

  beforeAll(() => {
    ({ server, baseUrl } = startServer(createApp()));
  });

  afterAll(async () => {
    await closeServer(server);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    masteryFindMany.mockResolvedValue([] as never); // no mastery rows → generic reply
    convCreate.mockResolvedValue({ id: 'conv-1', userId: STUDENT_ID, title: 'س', createdAt: new Date(0) } as never);
    msgCreate.mockResolvedValue({ id: 'msg-1', content: 'ردّ', tokens: 0 } as never);
    telemetryCreate.mockResolvedValue({} as never);
  });

  it('answers 200 with the reply AND the per-turn attribution: engine=local, model=gap-aware-composer', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('ما المفاهيم التي أحتاج إلى مراجعتها؟'),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { conversationId: string; reply: string; engine: string; model: string };
    };
    expect(body.data.conversationId).toBe('conv-1');
    expect(typeof body.data.reply).toBe('string');
    expect(body.data.reply.length).toBeGreaterThan(0);
    // r166d per-turn attribution — the local composer names itself
    // honestly (never a model claim).
    expect(body.data.engine).toBe('local');
    expect(body.data.model).toBe('gap-aware-composer');
  });

  it('writes the whole turn in ONE transaction: conversation + user msg + assistant msg (tokens 0) + telemetry (composer model, success)', async () => {
    await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال عن الخوارزميات'),
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    // The conversation row carries the 60-char title of the message.
    expect(convCreate).toHaveBeenCalledWith({
      data: { userId: STUDENT_ID, title: 'سؤال عن الخوارزميات' },
    });
    // Both messages ride the same conversation.
    expect(msgCreate).toHaveBeenCalledWith({
      data: { conversationId: 'conv-1', role: 'USER', content: 'سؤال عن الخوارزميات' },
    });
    expect(msgCreate).toHaveBeenCalledWith({
      data: { conversationId: 'conv-1', role: 'ASSISTANT', content: expect.any(String), tokens: 0 },
    });
    // Telemetry: the composer tag, honest zero tokens, success.
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: {
        userId: STUDENT_ID,
        feature: 'chat',
        model: 'gap-aware-composer',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: expect.any(Number),
        success: true,
        errorMessage: null,
      },
    });
  });

  it('GET /ai/config stays the boot-level honest surface: local + model null', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/config`, { headers: bearer() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { provider: string; model: string | null } };
    expect(body.data).toEqual({ provider: 'local', model: null });
  });
});

// ── OPENAI mode (second module registry, env injected pre-import) ──

describe('POST /api/v1/ai/chat — OPENAI mode (provider wire stubbed)', () => {
  // Fresh instances bound per registry — the resetModules re-import gives
  // db.js a NEW mock instance, captured in beforeAll below.
  let baseUrl: string;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;
  let convFindFirst: Mock;
  let convCreate: Mock;
  let msgCreate: Mock;
  let telemetryCreate: Mock;
  let masteryFindMany: Mock;
  let historyFindMany: Mock;
  let transaction: Mock;

  const AI_ENV = {
    AI_PROVIDER: 'openai',
    AI_API_KEY: 'sk-test-placeholder',
    AI_MODEL: 'test-model-name',
    AI_BASE_URL: 'https://api.openai.com/v1',
  } as const;

  beforeAll(async () => {
    // env.ts reads process.env at IMPORT time (and getAiProvider freezes
    // the provider at the route's module load), so the openai registry
    // needs the vars set BEFORE the re-import. NODE_ENV stays 'test'
    // (vitest env) — the fail-closed superRefine is skipped there, which
    // is exactly how ai-provider.test.ts's env ruling works.
    for (const [k, v] of Object.entries(AI_ENV)) process.env[k] = v;
    vi.resetModules();
    const appMod = await import('../../src/app.js');
    const dbMod = await import('../../src/db.js');

    convFindFirst = vi.mocked(dbMod.prisma.aiConversation.findFirst);
    convCreate = vi.mocked(dbMod.prisma.aiConversation.create);
    msgCreate = vi.mocked(dbMod.prisma.aiMessage.create);
    telemetryCreate = vi.mocked(dbMod.prisma.aiTelemetry.create);
    masteryFindMany = vi.mocked(dbMod.prisma.studentMastery.findMany);
    historyFindMany = vi.mocked(dbMod.prisma.aiMessage.findMany);
    transaction = vi.mocked(dbMod.prisma.$transaction);

    ({ server, baseUrl } = startServer(appMod.createApp()));
  });

  afterAll(async () => {
    await closeServer(server);
    for (const k of Object.keys(AI_ENV)) delete process.env[k];
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    masteryFindMany.mockResolvedValue([] as never);
    historyFindMany.mockResolvedValue([] as never);
    convCreate.mockResolvedValue({ id: 'conv-2', userId: STUDENT_ID, title: 'س', createdAt: new Date(0) } as never);
    // Faithful delegate: create echoes back the row it was asked to
    // persist — the route answers with the PERSISTED content, so the
    // mock must return what it received (not a fixed string).
    msgCreate.mockImplementation(
      async (args: { data: { content: string } }) =>
        ({ id: 'msg-2', content: args.data.content, tokens: 0 }) as never,
    );
    telemetryCreate.mockResolvedValue({} as never);
  });

  /* The stub must serve BOTH transports: the route's provider call is
   * answered by `responder`; the test's own call to the local server
   * delegates to the REAL fetch (vi.stubGlobal replaces the one global
   * both sides share — without this guard the test's own fetch would
   * hit the provider stub too). Captured fresh in every beforeEach
   * AFTER unstubAllGlobals, before any stub is installed. */
  let realFetch: typeof fetch;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });

  function stubProviderTransport(
    responder: (url: string, init: RequestInit) => Response | Promise<Response>,
    calls?: Array<{ url: string; init: RequestInit }>,
  ) {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const target = String(url);
      if (target.startsWith(baseUrl)) return realFetch(url, init);
      calls?.push({ url: target, init });
      return responder(target, init);
    });
  }

  function providerOk(content = 'جواب النموذج الحقيقيّ', model?: string) {
    // r175: the provider's own `model` echo rides the payload — the
    // per-RESPONSE attribution source. Absent when `model` is undefined.
    return new Response(
      JSON.stringify({
        choices: [{ message: { content } }],
        usage: { prompt_tokens: 42, completion_tokens: 17 },
        ...(model !== undefined ? { model } : {}),
      }),
      { status: 200 },
    );
  }

  it('answers 200 with the provider reply AND per-turn attribution: engine=openai (real OpenAI host), model=the provider-REPORTED id', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubProviderTransport(() => providerOk('جواب النموذج الحقيقيّ', 'gpt-test-echo'), calls);

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('اشرح لي الأشجار المتوازنة'),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: { conversationId: string; reply: string; engine: string; model: string };
    };
    expect(body.data.reply).toBe('جواب النموذج الحقيقيّ');
    expect(body.data.engine).toBe('openai');
    // r175: per-RESPONSE attribution is the provider's OWN echo, not
    // the configured alias.
    expect(body.data.model).toBe('gpt-test-echo');

    // The provider wire: the configured base URL + Bearer key.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/chat/completions');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-test-placeholder');
    // OpenRouter's attribution headers are OpenRouter-only — a REAL
    // OpenAI base URL must NOT carry them (no unrelated behavior change).
    expect(headers['HTTP-Referer']).toBeUndefined();
    expect(headers['X-Title']).toBeUndefined();
  });

  it('a provider response WITHOUT model metadata degrades to the configured id, clearly flagged (unattributed)', async () => {
    stubProviderTransport(() => providerOk('جواب بلا وسم نموذج'));

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { model: string } };
    expect(body.data.model).toBe('test-model-name (unattributed)');
  });

  it('telemetry records the provider-REPORTED model + token counts; the assistant message carries the output tokens', async () => {
    stubProviderTransport(() => providerOk('جواب النموذج الحقيقيّ', 'gpt-test-echo'));

    await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(msgCreate).toHaveBeenCalledWith({
      data: { conversationId: 'conv-2', role: 'ASSISTANT', content: 'جواب النموذج الحقيقيّ', tokens: 17 },
    });
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: {
        userId: STUDENT_ID,
        feature: 'chat',
        model: 'gpt-test-echo',
        inputTokens: 42,
        outputTokens: 17,
        latencyMs: expect.any(Number),
        success: true,
        errorMessage: null,
      },
    });
  });

  it('an existing conversation is continued: history rides the provider request, no new conversation row', async () => {
    const CONV_ID = 'conv2e2eroute0001'; // cuid-shaped (chatSchema rejects dashes)
    let wireMessages: Array<{ role: string }> = [];
    stubProviderTransport((_url, init) => {
      const parsed = JSON.parse((init as { body: string }).body) as { messages: Array<{ role: string }> };
      wireMessages = parsed.messages;
      return providerOk();
    });
    historyFindMany.mockResolvedValue([
      { id: 'h2', role: 'ASSISTANT', content: 'جواب أول', createdAt: new Date(0), conversationId: CONV_ID, tokens: 0 },
      { id: 'h1', role: 'USER', content: 'سؤال أول', createdAt: new Date(0), conversationId: CONV_ID, tokens: 0 },
    ] as never);
    convFindFirst.mockResolvedValue({
      id: CONV_ID,
      userId: STUDENT_ID,
      title: 'س',
      createdAt: new Date(0),
    } as never);

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال ثانٍ', CONV_ID),
    });
    expect(res.status).toBe(200);

    // Newest-first rows → chronological window → system, history, user.
    expect(wireMessages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    // Continued, not re-created.
    expect(convCreate).not.toHaveBeenCalled();
  });

  it('provider failure (transport TypeError): ONE classified Arabic 500, failure telemetry row written, NOTHING persisted to the conversation', async () => {
    stubProviderTransport(() => {
      throw new TypeError('fetch failed');
    });

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال سيفشل'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى');

    // Failure telemetry: attributed to the ATTEMPTED model, success
    // false, and — r176a — the classified KIND as the persisted
    // errorMessage (the provider detail stays in the server log).
    expect(telemetryCreate).toHaveBeenCalledTimes(1);
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: {
        userId: STUDENT_ID,
        feature: 'chat',
        model: 'test-model-name',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: expect.any(Number),
        success: false,
        errorMessage: 'transport',
      },
    });

    // NO silent fallback: the transaction never ran — no fake reply was
    // persisted wearing a model badge.
    expect(transaction).not.toHaveBeenCalled();
    expect(msgCreate).not.toHaveBeenCalled();
    expect(convCreate).not.toHaveBeenCalled();
  });

  /* r176a — the classified-failure matrix at the ROUTE level: each
   * provider failure class reaches the student as its own actionable
   * Arabic sentence (previously ALL classes collapsed into one generic
   * 500) and telemetry as its own greppable kind. */
  it('r176a: a 429 surfaces the WAIT-A-MINUTE Arabic message + rate_limited telemetry kind', async () => {
    stubProviderTransport(
      () => new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), { status: 429 }),
    );
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('تجاوزنا حدّ الاستخدام المجاني مؤقتًا — انتظر دقيقة ثم أعد المحاولة');
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false, errorMessage: 'rate_limited (HTTP 429)' }),
    });
  });

  it('r176a: a provider TIMEOUT surfaces the retry-inviting Arabic message; the telemetry kind is timeout', async () => {
    stubProviderTransport(() => {
      const e = new Error('The operation was aborted due to timeout');
      e.name = 'TimeoutError';
      throw e;
    });
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe(
      'استغرق النموذج وقتًا أطول من المتاح — أعد المحاولة الآن وسيُختار نموذج آخر غالبًا',
    );
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false, errorMessage: 'timeout' }),
    });
  });

  it('r176a: a 400 param rejection surfaces the provider_rejected message and is NOT retried', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubProviderTransport(
      (_url, _init) => new Response(JSON.stringify({ error: { message: 'temperature not supported' } }), { status: 400 }),
      calls,
    );
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('رفض مزوّد خدمة الذكاء الاصطناعي الطلب — جرّب تغيير صيغة السؤال');
    // Exactly one wire call — a non-transient 400 must never be retried.
    expect(calls).toHaveLength(1);
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false, errorMessage: 'provider_rejected (HTTP 400)' }),
    });
  });

  it('r176a: an empty-content 200 surfaces the invalid_response message (distinct from a timeout)', async () => {
    stubProviderTransport(
      () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }),
    );
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('وصل ردّ غير صالح من النموذج — أعد المحاولة');
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: false, errorMessage: 'invalid_response' }),
    });
  });

  it('r176a: a 429-then-200 sequence recovers on ONE bounded retry: 200 reply, TWO wire calls, ONE telemetry row (success)', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    let attempt = 0;
    stubProviderTransport(
      (_url, _init) => {
        attempt += 1;
        return attempt === 1
          ? new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), { status: 429 })
          : new Response(
              JSON.stringify({
                choices: [{ message: { content: 'جواب بعد إعادة المحاولة' } }],
                usage: { prompt_tokens: 9, completion_tokens: 4 },
                model: 'free-model-after-retry',
              }),
              { status: 200 },
            );
      },
      calls,
    );
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال بعد ضغط الاستخدام'),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { reply: string; model: string } };
    expect(body.data.reply).toBe('جواب بعد إعادة المحاولة');
    expect(body.data.model).toBe('free-model-after-retry');
    // TWO provider wire calls (1 + the single retry) …
    expect(calls).toHaveLength(2);
    // … but exactly ONE telemetry row — the recovered turn, success true.
    expect(telemetryCreate).toHaveBeenCalledTimes(1);
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ success: true, model: 'free-model-after-retry' }),
    });
    // And the conversation persisted exactly the recovered turn.
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(msgCreate).toHaveBeenCalledTimes(2);
  });

  it('r176a: a 429-twice sequence surfaces the honest rate_limited 500 after exactly ONE retry — no loop, nothing persisted', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubProviderTransport(
      () => new Response(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), { status: 429 }),
      calls,
    );
    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('تجاوزنا حدّ الاستخدام المجاني مؤقتًا — انتظر دقيقة ثم أعد المحاولة');
    expect(calls).toHaveLength(2); // one attempt + one retry — never more
    expect(telemetryCreate).toHaveBeenCalledTimes(1);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('GET /ai/config reports the openai mode + the configured model string (the ROUTE, not a per-response fact)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/config`, { headers: bearer() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { provider: string; model: string | null } };
    expect(body.data).toEqual({ provider: 'openai', model: 'test-model-name' });
  });
});

// ── OPENROUTER mode (r175 — the free router through openrouter.ai) ──

describe('POST /api/v1/ai/chat — OPENROUTER mode (free router)', () => {
  let baseUrl: string;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;
  let convCreate: Mock;
  let msgCreate: Mock;
  let telemetryCreate: Mock;
  let masteryFindMany: Mock;
  let historyFindMany: Mock;
  let transaction: Mock;

  /* The production r175 configuration verbatim: openai TRANSPORT mode,
   * OpenRouter's OpenAI-compatible base URL, and the free ROUTER id as
   * the configured model. The label + attribution rules under test:
   *  · the engine/config label is `openrouter` — NEVER `openai` merely
   *    because the transport speaks the OpenAI-compatible protocol;
   *  · the per-turn model is the provider-REPORTED id (the free router
   *    may switch underlying models between responses);
   *  · OpenRouter's optional HTTP-Referer/X-Title attribution headers
   *    ride the wire (and only the wire). */
  const AI_ENV = {
    AI_PROVIDER: 'openai',
    AI_API_KEY: 'sk-or-test-placeholder',
    AI_MODEL: 'openrouter/free',
    AI_BASE_URL: 'https://openrouter.ai/api/v1',
  } as const;

  beforeAll(async () => {
    for (const [k, v] of Object.entries(AI_ENV)) process.env[k] = v;
    vi.resetModules();
    const appMod = await import('../../src/app.js');
    const dbMod = await import('../../src/db.js');

    convCreate = vi.mocked(dbMod.prisma.aiConversation.create);
    msgCreate = vi.mocked(dbMod.prisma.aiMessage.create);
    telemetryCreate = vi.mocked(dbMod.prisma.aiTelemetry.create);
    masteryFindMany = vi.mocked(dbMod.prisma.studentMastery.findMany);
    historyFindMany = vi.mocked(dbMod.prisma.aiMessage.findMany);
    transaction = vi.mocked(dbMod.prisma.$transaction);

    ({ server, baseUrl } = startServer(appMod.createApp()));
  });

  afterAll(async () => {
    await closeServer(server);
    for (const k of Object.keys(AI_ENV)) delete process.env[k];
  });

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    masteryFindMany.mockResolvedValue([] as never);
    historyFindMany.mockResolvedValue([] as never);
    convCreate.mockResolvedValue({ id: 'conv-or', userId: STUDENT_ID, title: 'س', createdAt: new Date(0) } as never);
    msgCreate.mockImplementation(
      async (args: { data: { content: string } }) =>
        ({ id: 'msg-or', content: args.data.content, tokens: 0 }) as never,
    );
    telemetryCreate.mockResolvedValue({} as never);
  });

  let realFetch: typeof fetch;
  beforeEach(() => {
    realFetch = globalThis.fetch;
  });

  function stubProviderTransport(
    responder: (url: string, init: RequestInit) => Response | Promise<Response>,
    calls?: Array<{ url: string; init: RequestInit }>,
  ) {
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const target = String(url);
      if (target.startsWith(baseUrl)) return realFetch(url, init);
      calls?.push({ url: target, init });
      return responder(target, init);
    });
  }

  it('labels the engine openrouter (never openai) and attributes the provider-reported model', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    stubProviderTransport(
      () =>
        new Response(
          JSON.stringify({
            model: 'deepseek/deepseek-chat-v3-0324:free',
            choices: [{ message: { content: 'جواب عبر موجّه OpenRouter المجاني' } }],
            usage: { prompt_tokens: 30, completion_tokens: 12 },
          }),
          { status: 200 },
        ),
      calls,
    );

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال عبر الموجّه المجاني'),
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { reply: string; engine: string; model: string } };
    expect(body.data.reply).toBe('جواب عبر موجّه OpenRouter المجاني');
    // The honesty pin: OpenRouter is OpenRouter — the transport being
    // OpenAI-compatible never relabels the vendor.
    expect(body.data.engine).toBe('openrouter');
    expect(body.data.model).toBe('deepseek/deepseek-chat-v3-0324:free');

    // The wire: OpenRouter URL + Bearer + the optional attribution
    // headers (HTTP-Referer / X-Title) OpenRouter's docs suggest.
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer sk-or-test-placeholder');
    expect(headers['HTTP-Referer']).toBe('https://madarek.onrender.com');
    expect(headers['X-Title']).toBe('Madarek');

    // Success telemetry carries the per-RESPONSE model.
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ model: 'deepseek/deepseek-chat-v3-0324:free', success: true }),
    });
  });

  it('two responses may carry DIFFERENT reported models — each turn keeps its own attribution', async () => {
    const models = ['meta-llama/llama-3.1-8b-instruct:free', 'qwen/qwen-2.5-7b-instruct:free'];
    let i = 0;
    stubProviderTransport(() => {
      const model = models[i++ % models.length]!;
      return new Response(
        JSON.stringify({
          model,
          choices: [{ message: { content: `جواب من ${model}` } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    });

    const first = (await (
      await fetch(`${baseUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { ...bearer(), 'content-type': 'application/json' },
        body: chatBody('سؤال أول'),
      })
    ).json()) as { data: { model: string } };
    const second = (await (
      await fetch(`${baseUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { ...bearer(), 'content-type': 'application/json' },
        body: chatBody('سؤال ثانٍ'),
      })
    ).json()) as { data: { model: string } };

    expect(first.data.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    expect(second.data.model).toBe('qwen/qwen-2.5-7b-instruct:free');
  });

  it('a router response WITHOUT model metadata falls back to openrouter/free, clearly flagged (unattributed)', async () => {
    stubProviderTransport(
      () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: 'جواب بلا وسم نموذج' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
          { status: 200 },
        ),
    );

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال'),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { engine: string; model: string } };
    expect(body.data.engine).toBe('openrouter');
    expect(body.data.model).toBe('openrouter/free (unattributed)');
  });

  it('GET /ai/config labels the provider openrouter and names the configured ROUTE id', async () => {
    const res = await fetch(`${baseUrl}/api/v1/ai/config`, { headers: bearer() });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { provider: string; model: string | null } };
    expect(body.data).toEqual({ provider: 'openrouter', model: 'openrouter/free' });
  });

  it('a free-router failure surfaces the honest classified Arabic 500 with failure telemetry — no local-composer fallback', async () => {
    stubProviderTransport(
      () =>
        new Response(JSON.stringify({ error: { message: 'Rate limit exceeded: free tier' } }), {
          status: 429,
        }),
    );

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...bearer(), 'content-type': 'application/json' },
      body: chatBody('سؤال سيفشل'),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { message: string } };
    // r176a: a free-tier 429 now says WAIT, not the generic line.
    expect(body.error.message).toBe('تجاوزنا حدّ الاستخدام المجاني مؤقتًا — انتظر دقيقة ثم أعد المحاولة');

    // Failure telemetry: attributed to the ATTEMPTED (configured) route
    // with the classified kind (r176a — greppable, no body excerpts).
    expect(telemetryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ model: 'openrouter/free', success: false, errorMessage: 'rate_limited (HTTP 429)' }),
    });
    // NO silent fallback: nothing persisted.
    expect(transaction).not.toHaveBeenCalled();
    expect(msgCreate).not.toHaveBeenCalled();
  });
});
