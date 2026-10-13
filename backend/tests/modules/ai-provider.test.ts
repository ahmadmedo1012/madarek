/**
 * Backend unit test — the P4 AI provider layer (lib/ai.ts) + wiring
 * pins for the real-LLM chat path (ai.routes.ts).
 *
 * Two layers, both DB-free (house pattern):
 *  1. Pure helpers: history windowing (newest-first DB read →
 *     chronological request window), message assembly (system FIRST,
 *     user LAST), completion parsing (honest 0 tokens without a usage
 *     block; empty content is a failure, not a reply), mastery
 *     context lines (worst gaps first, same thresholds as
 *     masteryTier), and both system prompts (the anti-fabrication
 *     guardrails are the point).
 *  2. callOpenAiCompatible with fetch STUBBED (vi.stubGlobal): the
 *     exact request shape (URL join, Bearer, model/messages/
 *     temperature/max_tokens) and every failure mapping (HTTP
 *     non-2xx with status, transport, timeout name, non-JSON,
 *     unparseable payload) → always AiProviderError.
 *  3. Source-scan wiring pins (learning-logic technique — the file
 *     is the contract): the route must keep the mode switch
 *     (provider vs composer), the windowed history read, the REAL
 *     model + token counts in telemetry, and the NO-SILENT-FALLBACK
 *     catch (provider failure → one Arabic AppError, never a
 *     template reply wearing an LLM badge). env.ts keeps the
 *     openai-mode fail-closed superRefine.
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_HISTORY_TURNS,
  AI_MAX_OUTPUT_TOKENS,
  AI_TEMPERATURE,
  AI_TIMEOUT_MS,
  AiProviderError,
  buildChatMessages,
  buildGenericSystemPrompt,
  buildStudentSystemPrompt,
  callOpenAiCompatible,
  getAiProvider,
  masteryContextLines,
  masteryFactTier,
  parseChatCompletion,
  windowHistory,
  type AiChatMessage,
  type MasteryFact,
} from '../../src/lib/ai.js';

const aiRouteSource = readFileSync(new URL('../../src/http/routes/ai.routes.ts', import.meta.url), 'utf8');
const aiLibSource = readFileSync(new URL('../../src/lib/ai.ts', import.meta.url), 'utf8');
const envSource = readFileSync(new URL('../../src/env.ts', import.meta.url), 'utf8');
const renderSource = readFileSync(new URL('../../../render.yaml', import.meta.url), 'utf8');

// ─── Constants (the contract's ceilings) ──────────────────────────

describe('provider constants', () => {
  it('pins the request ceilings — concise replies, bounded cost, 45s max wait', () => {
    expect(AI_MAX_OUTPUT_TOKENS).toBe(800);
    expect(AI_TEMPERATURE).toBe(0.4);
    expect(AI_TIMEOUT_MS).toBe(45_000);
  });

  it('pins the history window at 12 messages (6 user+assistant pairs)', () => {
    expect(AI_HISTORY_TURNS).toBe(12);
  });
});

// ─── Pure: history windowing + message assembly ───────────────────

describe('windowHistory (newest-first DB read → chronological window)', () => {
  it('keeps the NEWEST maxMessages entries and restores chronological order', () => {
    // The bounded read arrives newest-first: [5,4,3,2,1,0] for a
    // conversation whose chronological order is 0..5. The newest 3 are
    // [5,4,3]; windowed chronologically that is [3,4,5].
    const rows = [5, 4, 3, 2, 1, 0];
    expect(windowHistory(rows, 3)).toEqual([3, 4, 5]);
  });

  it('keeps everything (re-oriented) when the conversation is shorter than the window', () => {
    expect(windowHistory([2, 1, 0], 12)).toEqual([0, 1, 2]);
  });

  it('maxMessages 0 → empty (the window is off, not everything)', () => {
    expect(windowHistory([1, 0], 0)).toEqual([]);
  });

  it('does not mutate the input (the DB array belongs to the caller)', () => {
    const rows = [3, 2, 1, 0];
    windowHistory(rows, 2);
    expect(rows).toEqual([3, 2, 1, 0]);
  });
});

describe('buildChatMessages (system first, user last)', () => {
  const history: AiChatMessage[] = [
    { role: 'user', content: 'سؤال أول' },
    { role: 'assistant', content: 'جواب أول' },
  ];

  it('assembles system → history → user, in that order', () => {
    const msgs = buildChatMessages('النظام', history, 'سؤال جديد');
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(msgs[0]).toEqual({ role: 'system', content: 'النظام' });
    expect(msgs.at(-1)).toEqual({ role: 'user', content: 'سؤال جديد' });
  });

  it('the user message is LAST even with a long history — truncation can never eat the ask', () => {
    const long: AiChatMessage[] = Array.from({ length: 40 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as AiChatMessage['role'],
      content: `turn ${i}`,
    }));
    const msgs = buildChatMessages('sys', long, 'the ask');
    expect(msgs.at(-1)!.content).toBe('the ask');
    expect(msgs[0]!.role).toBe('system');
  });
});

// ─── Pure: completion parsing (the honesty boundary) ──────────────

describe('parseChatCompletion', () => {
  it('parses content + usage verbatim', () => {
    const out = parseChatCompletion({
      choices: [{ message: { content: 'جواب النموذج' } }],
      usage: { prompt_tokens: 210, completion_tokens: 95 },
    });
    expect(out).toEqual({ content: 'جواب النموذج', inputTokens: 210, outputTokens: 95 });
  });

  it('a missing usage block records 0 tokens — never estimated, never fabricated', () => {
    const out = parseChatCompletion({ choices: [{ message: { content: 'جواب' } }] });
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
  });

  it('non-numeric or negative token values degrade to 0 (floor on valid numbers)', () => {
    const out = parseChatCompletion({
      choices: [{ message: { content: 'جواب' } }],
      usage: { prompt_tokens: '210', completion_tokens: -5 },
    });
    expect(out.inputTokens).toBe(0);
    expect(out.outputTokens).toBe(0);
    expect(parseChatCompletion({
      choices: [{ message: { content: 'جواب' } }],
      usage: { prompt_tokens: 3.7, completion_tokens: 2 },
    })).toEqual({ content: 'جواب', inputTokens: 3, outputTokens: 2 });
  });

  it('empty / whitespace / missing content is a provider failure, not a reply', () => {
    expect(() => parseChatCompletion({ choices: [{ message: { content: '   ' } }] })).toThrow();
    expect(() => parseChatCompletion({ choices: [{ message: { content: '' } }] })).toThrow();
    expect(() => parseChatCompletion({ choices: [] })).toThrow();
    expect(() => parseChatCompletion({})).toThrow();
  });
});

// ─── Pure: mastery context + system prompts ───────────────────────

describe('masteryFactTier (same thresholds as ai.routes masteryTier)', () => {
  it('<0.5 gap, <0.8 developing, else strong', () => {
    expect(masteryFactTier(0)).toBe('فجوة');
    expect(masteryFactTier(0.49)).toBe('فجوة');
    expect(masteryFactTier(0.5)).toBe('قيد التطوّر');
    expect(masteryFactTier(0.79)).toBe('قيد التطوّر');
    expect(masteryFactTier(0.8)).toBe('متقن');
    expect(masteryFactTier(1)).toBe('متقن');
  });
});

describe('masteryContextLines (worst gaps first)', () => {
  const facts: MasteryFact[] = [
    { conceptName: 'الاستدعاء الذاتي', courseName: 'بنية المعطيات', level: 0.83 },
    { conceptName: 'الأشجار المتوازنة', courseName: 'بنية المعطيات', level: 0.31, lectureTitle: 'محاضرة الأشجار' },
    { conceptName: 'الجداول المبعثرة', courseName: 'الخوارزميات', level: 0.62 },
  ];

  it('sorts ascending by level — the model leads with what the student most needs', () => {
    const lines = masteryContextLines(facts);
    expect(lines[0]).toContain('الأشجار المتوازنة');
    expect(lines.at(-1)).toContain('الاستدعاء الذاتي');
  });

  it('each line carries concept, course, Math.round percent, and the tier', () => {
    const line = masteryContextLines([facts[0]!])[0]!;
    expect(line).toBe('- الاستدعاء الذاتي (بنية المعطيات): 83% — متقن');
  });

  it('a lecture title appends the pointer; its absence keeps the line bare', () => {
    expect(masteryContextLines([facts[1]!])[0]).toContain('محاضرة ذات صلة: «محاضرة الأشجار»');
    expect(masteryContextLines([facts[2]!])[0]).not.toContain('محاضرة ذات صلة');
  });

  it('0.499 renders as 50% while its tier stays فجوة (Math.round, pinned)', () => {
    expect(masteryContextLines([{ conceptName: 'س', courseName: 'ج', level: 0.499 }])[0]).toContain('50% — فجوة');
  });
});

describe('buildStudentSystemPrompt', () => {
  it('carries the persona, the gap-first focus, and the anti-fabrication guardrails', () => {
    const p = buildStudentSystemPrompt(['- مفهوم (مقرر): 40% — فجوة']);
    expect(p).toContain('مساعد مدارك الدراسيّ');
    expect(p).toContain('لا تختلق');
    expect(p).toContain('ركّز على فجوات الطالب');
    expect(p).toContain('- مفهوم (مقرر): 40% — فجوة');
  });

  it('no mastery rows → the prompt says so honestly instead of an empty context block', () => {
    expect(buildStudentSystemPrompt([])).toContain('لا توجد بيانات إتقان مسجّلة');
  });
});

describe('buildGenericSystemPrompt', () => {
  it('has the guardrails but NO mastery block (roles other than students have none)', () => {
    const p = buildGenericSystemPrompt();
    expect(p).toContain('لا تختلق');
    expect(p).not.toContain('إتقان');
  });
});

// ─── getAiProvider resolution (default test env) ──────────────────

describe('getAiProvider (boot-frozen resolution)', () => {
  it('the default (unset) test env resolves to the LOCAL composer mode', () => {
    // env.AI_PROVIDER defaults to 'local' — the route's mode switch
    // reads null and composeReply answers.
    expect(getAiProvider()).toBeNull();
  });

  it('the defensive branch requires provider AND key AND model (source pin)', () => {
    // A future env regression must degrade to the local composer, never
    // crash requests — this is that branch.
    expect(aiLibSource).toContain("env.AI_PROVIDER === 'openai' && env.AI_API_KEY && env.AI_MODEL");
  });
});

// ─── callOpenAiCompatible (fetch stubbed — the wire contract) ─────

const CFG = {
  baseUrl: 'https://provider.example/v1/',
  apiKey: 'sk-test-placeholder',
  model: 'test-model',
  timeoutMs: 1000,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('callOpenAiCompatible — request shape', () => {
  it('joins the URL (trailing slash stripped), Bearer-auths, and sends the pinned body', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(
        JSON.stringify({ choices: [{ message: { content: 'جواب' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
        { status: 200 },
      );
    });
    const out = await callOpenAiCompatible(CFG, buildChatMessages('sys', [], 'سؤال'));
    expect(out).toEqual({ content: 'جواب', inputTokens: 10, outputTokens: 5 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://provider.example/v1/chat/completions');
    const init = calls[0]!.init as { headers: Record<string, string>; body: string; signal: AbortSignal };
    expect(init.headers.Authorization).toBe('Bearer sk-test-placeholder');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body.model).toBe('test-model');
    expect(body.temperature).toBe(AI_TEMPERATURE);
    expect(body.max_tokens).toBe(AI_MAX_OUTPUT_TOKENS);
    expect(body.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'سؤال' },
    ]);
    // The timeout rides as an abort signal (AbortSignal.timeout).
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('callOpenAiCompatible — every failure is an AiProviderError', () => {
  it('HTTP non-2xx carries the status and a body excerpt (for the LOG, not the client)', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"quota exceeded"}}', { status: 429 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).status).toBe(429);
    expect((err as AiProviderError).message).toContain('HTTP 429');
    expect((err as AiProviderError).message).toContain('quota exceeded');
  });

  it('transport failure (fetch TypeError) maps to the transport message', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).message).toContain('transport failure');
  });

  it('a TimeoutError name maps to the timeout message (DOMException is not Error on every runtime)', async () => {
    vi.stubGlobal('fetch', async () => {
      const e = new Error('The operation was aborted due to timeout');
      e.name = 'TimeoutError';
      throw e;
    });
    const err = await callOpenAiCompatible({ ...CFG, timeoutMs: 45_000 }, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).message).toBe('provider timeout after 45000ms');
  });

  it('a 200 with a non-JSON body is a provider error', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>gateway hijack</html>', { status: 200 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).message).toContain('non-JSON');
  });

  it('a 200 with an empty choice content is a provider error (not an empty reply)', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 }));
    const err = await callOpenAiCompatible(CFG, []).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).message).toContain('no message content');
  });
});

// ─── Source-scan wiring pins (the route is the contract) ──────────

describe('ai.routes.ts — the P4 mode switch', () => {
  it('resolves the provider once at boot (module level) and switches on it', () => {
    expect(aiRouteSource).toContain('const aiProvider = getAiProvider();');
    expect(aiRouteSource).toContain('aiProvider\n      ? await composeReplyWithProvider(');
    expect(aiRouteSource).toContain(': { reply: await composeReply(');
  });

  it('the real path builds messages and calls the provider through the lib helpers', () => {
    expect(aiRouteSource).toContain('await callOpenAiCompatible(');
    expect(aiRouteSource).toContain('buildChatMessages(system, history, message)');
    expect(aiRouteSource).toContain('buildStudentSystemPrompt(masteryContextLines(');
    expect(aiRouteSource).toContain('buildGenericSystemPrompt()');
    expect(aiRouteSource).toContain('isMasteryAwareRole(role)');
  });

  it('loads the conversation history windowed + chronological, and drops stored system rows', () => {
    expect(aiRouteSource).toContain('take: AI_HISTORY_TURNS');
    expect(aiRouteSource).toContain('windowHistory(rows, AI_HISTORY_TURNS)');
    expect(aiRouteSource).toContain(".filter((m) => m.role !== 'system')");
  });

  it('telemetry records the REAL model and token counts; the assistant message carries output tokens', () => {
    expect(aiRouteSource).toContain('model: engine.model');
    expect(aiRouteSource).toContain('inputTokens: engine.inputTokens');
    expect(aiRouteSource).toContain('outputTokens: engine.outputTokens');
    expect(aiRouteSource).toContain('tokens: engine.outputTokens');
  });

  it('NO silent fallback: a provider failure maps to ONE Arabic AppError — composeReply never runs in the catch', () => {
    expect(aiRouteSource).toContain("e.name === 'AiProviderError'");
    expect(aiRouteSource).toContain("'تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى'");
    const catchStart = aiRouteSource.indexOf('} catch (e) {');
    const catchEnd = aiRouteSource.indexOf('next(e);', catchStart);
    const catchBlock = aiRouteSource.slice(catchStart, catchEnd);
    expect(catchBlock).not.toContain('composeReply(');
    // Failure telemetry is attributed to the attempted model.
    expect(catchBlock).toContain('model: aiProvider?.model');
  });

  it('GET /config exposes the honest surface (mode + real model, null in local mode)', () => {
    expect(aiRouteSource).toContain("router.get('/config'");
    expect(aiRouteSource).toContain("provider: aiProvider ? 'openai' : 'local'");
    expect(aiRouteSource).toContain('model: aiProvider?.model ?? null');
  });

  it('the local composer path and its transaction shape are untouched', () => {
    // composeReply keeps its own query and template branches.
    expect(aiRouteSource).toContain('const GENERIC_RESPONSES = [');
    expect(aiRouteSource).toContain('export function worstGapMastery');
    expect(aiRouteSource).toContain('conversationTitle(message)');
  });
});

describe('env.ts — the openai fail-closed superRefine', () => {
  it('names the missing AI vars at boot (skipped in test mode, like the s3 ruling)', () => {
    expect(envSource).toContain("AI_PROVIDER: z.enum(['local', 'openai']).default('local')");
    expect(envSource).toContain("cfg.AI_PROVIDER === 'openai' && !isTest");
    expect(envSource).toContain("aiMissing.push('AI_API_KEY')");
    expect(envSource).toContain("aiMissing.push('AI_MODEL')");
    expect(envSource).toContain('AI_PROVIDER=openai requires: ');
  });
});

describe('render.yaml — the AI vars are opt-in on Render', () => {
  it('all four AI vars are sync:false (never required by the dashboard)', () => {
    for (const key of ['AI_PROVIDER', 'AI_BASE_URL', 'AI_API_KEY', 'AI_MODEL']) {
      const i = renderSource.indexOf(`- key: ${key}`);
      expect(i).toBeGreaterThan(-1);
      expect(renderSource.slice(i, i + key.length + 45)).toContain('sync: false');
    }
  });
});
