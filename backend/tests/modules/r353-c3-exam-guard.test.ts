/**
 * Backend unit test — R353 C3: the exam-active guard (the exam-leak
 * prevention the r353 audit found).
 *
 * THE LEAK: POST /ai/knowledge/reindex indexes every lecture
 * checkpoint's `question + explanation` (ai.routes.ts) — the exact
 * facts a graded assessment tests. A student MID-EXAM could ask the
 * assistant and retrieve those chunks verbatim through RAG.
 *
 * THE GUARD (backend/src/http/routes/ai.routes.ts +
 * modules/ai/knowledge.ts), scoped to the CALLING student's turns:
 *  · retrieval: searchKnowledge EXCLUDES sourceType 'checkpoint' while
 *    the student has an in-progress (unexpired) ExamAttempt — pinned
 *    here on the bound SQL the route actually sends;
 *  · prompt: the provider system prompt carries the exam-integrity
 *    clause — pinned here on the WIRE (a localhost OpenAI-compatible
 *    stub provider captures the request body; this sandbox cannot
 *    reach any real provider).
 *
 * DB-free (house canon): prisma mocked at db.js, the real app on an
 * ephemeral port, a signed STUDENT JWT, the legacy single-provider
 * mode (the guard is engine-agnostic — chain mode rides the same
 * buildProviderSystemPrompt assembly).
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
    examAttempt: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
  };
  p.$transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(p));
  return { prisma: p, withRetry: vi.fn() };
});

// Reserve the stub provider port BEFORE any src import (env.ts parses
// at import time — the ai-chat-provider-path.test.ts pattern).
function reservePort(): number {
  const probe = createServer();
  probe.listen(0);
  const port = (probe.address() as AddressInfo).port;
  probe.close();
  return port;
}
const PROVIDER_PORT = reservePort();

process.env.AI_PROVIDER = 'openai';
process.env.AI_API_KEY = 'sk-exam-guard-stub';
process.env.AI_MODEL = 'exam-guard-model';
process.env.AI_BASE_URL = `http://127.0.0.1:${PROVIDER_PORT}/v1`;

type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');

let appMod: AppModule;
let prisma: DbModule['prisma'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;
let provider: Server;
/** The wire bodies the stub provider saw. */
const wireBodies: Array<{ system: string }> = [];
/** The captured $queryRaw tagged-template calls. */
const rawCalls: RawCall[] = [];

beforeAll(async () => {
  provider = await new Promise<Server>((resolve) => {
    const srv = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += String(chunk);
      });
      req.on('end', () => {
        const body = JSON.parse(raw) as { messages: Array<{ role: string; content: string }> };
        wireBodies.push({ system: body.messages[0]?.content ?? '' });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            model: 'exam-guard-model',
            choices: [{ message: { content: 'جواب عامّ لا يكشف الحلّ' } }],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
        );
      });
    });
    srv.listen(PROVIDER_PORT, '127.0.0.1', () => resolve(srv));
  });

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
  await new Promise<void>((resolve) => provider.close(() => resolve()));
  for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL']) delete process.env[k];
});

const STUDENT_ID = 'student-exam-1';
const TEACHER_ID = 'teacher-exam-1';
const INSTITUTION_ID = 'inst-exam-guard';

async function chatAs(userId: string, role: Role): Promise<Response> {
  const { signAccessToken } = await import('../../src/lib/jwt.js');
  return fetch(`${baseUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${signAccessToken(userId, role, INSTITUTION_ID)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ message: 'ما حلّ سؤال نقطة التفقّد في المحاضرة الثالثة؟' }),
  });
}

/** A captured $queryRaw TAGGED-TEMPLATE call: args = [strings, ...values]
 * — the JS runtime hands the raw interpolations to the function, so a
 * nested Prisma.sql fragment (the exclusion/token clauses) rides as
 * an Sql OBJECT among the values (flattening is the real client's
 * job — the probe pins what the query actually binds). */
type RawCall = unknown[];

function callValues(call: RawCall): unknown[] {
  return call.slice(1);
}

/** The full SQL text: the template's literal pieces + every nested
 * Prisma.sql fragment's pieces. */
function sqlTextOf(call: RawCall): string {
  const parts: string[] = [];
  const [head, ...rest] = call;
  if (Array.isArray(head)) parts.push(...(head as string[]));
  for (const v of rest) {
    const nested = (v as { strings?: unknown } | null)?.strings;
    if (Array.isArray(nested)) parts.push(...(nested as string[]));
  }
  return parts.join('');
}

/** Does a captured query carry the checkpoint-exclusion bound array
 * (top-level or inside a nested Prisma.sql fragment)? */
function excludesCheckpoints(call: RawCall): boolean {
  const carries = (arr: unknown[]): boolean =>
    arr.some((v) => Array.isArray(v) && (v as unknown[]).includes('checkpoint'));
  return callValues(call).some((v) => {
    if (Array.isArray(v)) return (v as unknown[]).includes('checkpoint');
    const nested = (v as { values?: unknown } | null)?.values;
    return Array.isArray(nested) && carries(nested as unknown[]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  wireBodies.length = 0;
  rawCalls.length = 0;
  vi.mocked(prisma.studentMastery.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.membership.findFirst).mockResolvedValue({ institutionId: INSTITUTION_ID } as never);
  vi.mocked(prisma.aiConversation.create).mockResolvedValue({
    id: 'conv-exam',
    userId: STUDENT_ID,
    title: 'س',
    createdAt: new Date(0),
  } as never);
  vi.mocked(prisma.aiMessage.create).mockImplementation(
    // The `as never` cast is the house prisma-mock idiom (the file's
    // value casts): the delegate's SHAPE is deliberately not the real
    // Prisma client type — mockImplementation's parameter is the full
    // client method signature, which a plain async lambda can never
    // satisfy (the PrismaPromise brand); the runtime behavior is what
    // the tests pin.
    (async (args: { data: { content: string } }) =>
      ({ id: 'msg-exam', content: args.data.content, tokens: 0 })) as never,
  );
  vi.mocked(prisma.aiTelemetry.create).mockResolvedValue({} as never);
  // The retrieval: capture the tagged-template call, return no
  // candidates (the guard's exclusion is pinned on the QUERY, not on
  // fixture rows).
  vi.mocked(prisma.$queryRaw).mockImplementation(
    // Same idiom as the create mock above: $queryRaw's real signature
    // returns the branded PrismaPromise — the loose mock must cast.
    (async (...args: unknown[]) => {
      rawCalls.push(args);
      return [];
    }) as never,
  );
});

describe('R353 C3 — the exam-active guard', () => {
  it('a student MID-EXAM: checkpoint chunks are EXCLUDED from retrieval and the prompt carries the integrity clause', async () => {
    vi.mocked(prisma.examAttempt.findFirst).mockResolvedValue({ id: 'attempt-1' } as never);

    const res = await chatAs(STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(200);

    // The retrieval query carries the exclusion array.
    expect(rawCalls).toHaveLength(1);
    expect(excludesCheckpoints(rawCalls[0]!)).toBe(true);

    // The wire: the system prompt states the exam-integrity rule.
    expect(wireBodies).toHaveLength(1);
    expect(wireBodies[0]!.system).toContain('تنبيه نزاهة فترة الاختبار');
    expect(wireBodies[0]!.system).toContain('لا تُقدِّم إجابات أسئلة الاختبار');
  });

  it('a student NOT mid-exam: no exclusion, no clause (the historical behavior)', async () => {
    vi.mocked(prisma.examAttempt.findFirst).mockResolvedValue(null as never);

    const res = await chatAs(STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(200);
    expect(rawCalls).toHaveLength(1);
    expect(excludesCheckpoints(rawCalls[0]!)).toBe(false);
    expect(wireBodies).toHaveLength(1);
    expect(wireBodies[0]!.system).not.toContain('تنبيه نزاهة فترة الاختبار');
  });

  it('the liveness rule: IN_PROGRESS inside the late-submit grace window (the exam routes\' resume semantics)', async () => {
    vi.mocked(prisma.examAttempt.findFirst).mockResolvedValue(null as never);
    await chatAs(STUDENT_ID, Role.STUDENT);
    const call = vi.mocked(prisma.examAttempt.findFirst).mock.calls[0]![0] as {
      where: { studentId: string; status: string; expiresAt: { gte: Date } };
    };
    expect(call.where.studentId).toBe(STUDENT_ID);
    expect(call.where.status).toBe('IN_PROGRESS');
    // expiresAt >= now − 60s grace (SUBMIT_GRACE_MS): an expired-but-
    // unflipped attempt is NOT an active exam.
    expect(call.where.expiresAt.gte.getTime()).toBeGreaterThan(Date.now() - 61_000);
    expect(call.where.expiresAt.gte.getTime()).toBeLessThan(Date.now() - 59_000);
  });

  it('a TEACHER is never checked (no examAttempt query, no clause)', async () => {
    const res = await chatAs(TEACHER_ID, Role.TEACHER);
    expect(res.status).toBe(200);
    expect(prisma.examAttempt.findFirst).not.toHaveBeenCalled();
    expect(wireBodies).toHaveLength(1);
    expect(wireBodies[0]!.system).not.toContain('تنبيه نزاهة فترة الاختبار');
  });

  it('integrity fails CLOSED: a broken examAttempt check still applies the guard', async () => {
    vi.mocked(prisma.examAttempt.findFirst).mockRejectedValue(new Error('db glitch') as never);

    const res = await chatAs(STUDENT_ID, Role.STUDENT);
    expect(res.status).toBe(200);
    expect(rawCalls).toHaveLength(1);
    expect(excludesCheckpoints(rawCalls[0]!)).toBe(true);
    expect(wireBodies[0]!.system).toContain('تنبيه نزاهة فترة الاختبار');
  });
});

describe('searchKnowledge — the exclusion clause (pure SQL-shape pin)', () => {
  it('excludeSourceTypes rides the query as a bound array the prefilter ANDs in', async () => {
    const { searchKnowledge } = await import('../../src/modules/ai/knowledge.js');
    const captured: RawCall[] = [];
    const fakePrisma = {
      aiKnowledgeChunk: {},
      $queryRaw: async (...args: unknown[]) => {
        captured.push(args as RawCall);
        return [];
      },
    } as unknown as Parameters<typeof searchKnowledge>[0];

    await searchKnowledge(fakePrisma, 'inst-1', 'سؤال عن الخوارزميات', {
      excludeSourceTypes: ['checkpoint'],
    });
    await searchKnowledge(fakePrisma, 'inst-1', 'سؤال عن الخوارزميات');

    expect(captured).toHaveLength(2);
    expect(excludesCheckpoints(captured[0]!)).toBe(true);
    expect(excludesCheckpoints(captured[1]!)).toBe(false);
    // The SQL text itself carries the != ALL exclusion fragment.
    expect(sqlTextOf(captured[0]!)).toContain('"sourceType" != ALL(');
    expect(sqlTextOf(captured[1]!)).not.toContain('"sourceType" != ALL(');
  });
});
