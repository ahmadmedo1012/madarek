/**
 * DB integration — r175d: the real-PROVIDER chat path
 * (backend/src/http/routes/ai.routes.ts) against a REAL disposable
 * Postgres — the regression suite for the production 500 this round
 * fixed (loadMasteryFacts mixed `select`+`include` at the same level —
 * Prisma 5.22 rejects it at validation time; the unit suite mocks
 * prisma so the validation never ran there, and local mode never
 * executes the loader at all).
 *
 * No prisma mocks (the integration canon): the ONLY stub is the
 * PROVIDER — a tiny OpenAI-compatible HTTP server on an ephemeral
 * localhost port wired through AI_BASE_URL. The provider is a network
 * boundary; the DB queries, the route transaction, and the persistence
 * all run for real. What this proves:
 *  · the mastery-facts query validates and returns real rows;
 *  · the seeded mastery line reaches the provider's system prompt;
 *  · the full turn (conversation + both messages + telemetry) lands in
 *    the REAL database in ONE transaction, with per-response model
 *    attribution (provider-echoed id) and honest token counts.
 *
 * Import discipline: AI_* env vars are set BEFORE any src module is
 * loaded (env.ts is import-time; NODE_ENV stays 'test' so the
 * fail-closed superRefine is skipped, same as the unit suite).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:http';
import { Role } from '@prisma/client';

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');

// The stub provider rides an ephemeral port; its URL is patched into
// the env BEFORE env.ts parses (the deferred assignment below keeps
// the URL a module constant set in beforeAll... which is too late for
// env.ts — so the server boots on a FIXED pre-reserved port first).
let providerPort: number;
{
  // Reserve the port before ANY src import: bind once synchronously.
  const probe = createServer();
  probe.listen(0);
  providerPort = (probe.address() as AddressInfo).port;
  probe.close();
}

process.env.AI_PROVIDER = 'openai';
process.env.AI_API_KEY = 'sk-integration-stub-placeholder';
process.env.AI_MODEL = 'stub-test-model';
process.env.AI_BASE_URL = `http://127.0.0.1:${providerPort}/v1`;

let helpers: Helpers;
let prisma: DbModule['prisma'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;
/** Every provider request the stub saw (for prompt-content pins). */
const wireCalls: Array<{ body: unknown }> = [];
let provider: ReturnType<typeof createServer>;

beforeAll(async () => {
  // The OpenAI-compatible stub: echoes a fixed completion carrying the
  // model id + usage block (the honest-attribution inputs).
  provider = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += String(chunk);
    });
    req.on('end', () => {
      wireCalls.push({ body: JSON.parse(raw) });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          model: 'stub/echoed-free-model:free',
          choices: [{ message: { content: 'جواب حقيقيّ من الحزب المزيّف عبر HTTP' } }],
          usage: { prompt_tokens: 55, completion_tokens: 21 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => provider.listen(providerPort, '127.0.0.1', resolve));

  helpers = await import('./helpers.js');
  const appModule: AppModule = await import('../../src/app.js');
  const dbModule: DbModule = await import('../../src/db.js');
  prisma = dbModule.prisma;
  server = appModule.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  await new Promise<void>((resolve) => provider.close(() => resolve()));
  for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL']) delete process.env[k];
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
  wireCalls.length = 0;
});

/** The seed chain the mastery loader walks:
 *  student → StudentMastery → KnowledgeConcept → course + chapter → lecture. */
async function seedMasteryRow(studentId: string, level: number) {
  const faculty = await prisma.faculty.create({ data: { name: 'كلية r175d' } });
  const department = await prisma.department.create({ data: { name: 'قسم r175d', facultyId: faculty.id } });
  const course = await prisma.course.create({
    data: { code: `CS-${helpers.uniqueSuffix()}`, name: 'بنية المعطيات r175d', departmentId: department.id },
  });
  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, teacherId: (await helpers.seedUser({ role: Role.TEACHER })).id, term: '2026-FALL' },
  });
  const lecture = await prisma.lecture.create({
    data: { offeringId: offering.id, title: 'محاضرة الأشجار المتوازنة r175d', ordinal: 1, durationSec: 600, videoUrl: 'https://example.invalid/r175d.mp4' },
  });
  const concept = await prisma.knowledgeConcept.create({
    data: { courseId: course.id, name: 'الأشجار المتوازنة', ordinal: 1 },
  });
  await prisma.lectureChapter.create({
    // The chapter↔concept link rides the chapter's FK (conceptId) —
    // the exact join the mastery loader's chapters take-1 walks.
    data: { lectureId: lecture.id, title: 'فصل الأشجار', startSec: 0, endSec: 600, ordinal: 1, conceptId: concept.id },
  });
  await prisma.studentMastery.create({
    data: { studentId, conceptId: concept.id, level },
  });
  return { conceptName: 'الأشجار المتوازنة', courseName: 'بنية المعطيات r175d' };
}

describe('POST /api/v1/ai/chat — the REAL-PROVIDER path against a real database', () => {
  it('answers 200 (the r175d regression: the mastery query validates under real Prisma)', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await seedMasteryRow(student.id, 0.31);

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'سؤال عن الأشجار المتوازنة' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { reply: string; engine: string; model: string; conversationId: string } };
    expect(body.data.reply).toBe('جواب حقيقيّ من الحزب المزيّف عبر HTTP');
    // The honest provider label for a 127.0.0.1 stub is its hostname.
    expect(body.data.engine).toBe('127.0.0.1');
    // Per-RESPONSE attribution: the provider-echoed id, not the configured alias.
    expect(body.data.model).toBe('stub/echoed-free-model:free');
  });

  it('the student\'s REAL mastery line rides the provider system prompt (worst gap first)', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await seedMasteryRow(student.id, 0.31);

    await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'سؤال' }),
    });

    expect(wireCalls).toHaveLength(1);
    const messages = (wireCalls[0]!.body as { messages: Array<{ role: string; content: string }> }).messages;
    expect(messages[0]!.role).toBe('system');
    expect(messages.at(-1)!.role).toBe('user');
    // The seeded row reached the prompt as a mastery line with its tier.
    expect(messages[0]!.content).toContain('الأشجار المتوازنة (بنية المعطيات r175d): 31% — فجوة');
    expect(messages[0]!.content).toContain('محاضرة ذات صلة: «محاضرة الأشجار المتوازنة r175d»');
  });

  it('a student WITHOUT mastery rows still chats (the honest empty-context branch)', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'سؤال بلا بيانات إتقان' }),
    });
    expect(res.status).toBe(200);
    expect(wireCalls).toHaveLength(1);
    const messages = (wireCalls[0]!.body as { messages: Array<{ role: string; content: string }> }).messages;
    expect(messages[0]!.content).toContain('لا توجد بيانات إتقان مسجّلة لهذا الطالب بعد');
  });

  it('the whole turn persists in ONE transaction with real rows: conversation + 2 messages + telemetry', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await seedMasteryRow(student.id, 0.6);

    const res = await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'سؤال المعاملة' }),
    });
    const body = (await res.json()) as { data: { conversationId: string } };
    const convId = body.data.conversationId;

    const conv = await prisma.aiConversation.findUniqueOrThrow({ where: { id: convId } });
    expect(conv.userId).toBe(student.id);
    expect(conv.title).toBe('سؤال المعاملة');
    const msgs = await prisma.aiMessage.findMany({ where: { conversationId: convId }, orderBy: { createdAt: 'asc' } });
    expect(msgs.map((m) => m.role)).toEqual(['USER', 'ASSISTANT']);
    expect(msgs[1]!.content).toBe('جواب حقيقيّ من الحزب المزيّف عبر HTTP');
    // Honest token accounting from the provider's usage block only.
    expect(msgs[1]!.tokens).toBe(21);

    const telemetry = await prisma.aiTelemetry.findMany({ where: { userId: student.id } });
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0]!.model).toBe('stub/echoed-free-model:free');
    expect(telemetry[0]!.inputTokens).toBe(55);
    expect(telemetry[0]!.outputTokens).toBe(21);
    expect(telemetry[0]!.success).toBe(true);
    expect(telemetry[0]!.feature).toBe('chat');
  });

  it('conversation continuity: the second turn carries the first exchange as history', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    const first = (await (
      await fetch(`${baseUrl}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'السؤال الأول' }),
      })
    ).json()) as { data: { conversationId: string } };

    await fetch(`${baseUrl}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId: first.data.conversationId, message: 'السؤال الثاني' }),
    });

    expect(wireCalls).toHaveLength(2);
    const secondMessages = (wireCalls[1]!.body as { messages: Array<{ role: string; content: string }> }).messages;
    // system → (history: user1, assistant1) → user2.
    expect(secondMessages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(secondMessages[1]!.content).toBe('السؤال الأول');
    expect(secondMessages.at(-1)!.content).toBe('السؤال الثاني');
  });

  it('a provider failure writes failure telemetry + persists NOTHING (no silent local fallback)', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    // Point the provider at a dead port: connection refused → AiProviderError.
    const bad = createServer();
    const deadPort = await new Promise<number>((resolve) => {
      bad.listen(0, '127.0.0.1', () => resolve((bad.address() as AddressInfo).port));
    });
    await new Promise<void>((resolve) => bad.close(() => resolve()));
    process.env.AI_BASE_URL = `http://127.0.0.1:${deadPort}/v1`;

    // Fresh registry so getAiProvider re-resolves with the dead URL.
    const { vi } = await import('vitest');
    vi.resetModules();
    const appMod: AppModule = await import('../../src/app.js');
    const dbMod: DbModule = await import('../../src/db.js');
    const prisma2 = dbMod.prisma;
    const server2 = appMod.createApp().listen(0);
    const baseUrl2 = `http://127.0.0.1:${(server2.address() as AddressInfo).port}`;
    try {
      const res = await fetch(`${baseUrl2}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'سؤال سيفشل' }),
      });
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: { message: string } };
      expect(body.error.message).toBe('تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى');
      // Failure telemetry: attributed to the ATTEMPTED (configured) model.
      const telemetry = await prisma2.aiTelemetry.findMany({ where: { userId: student.id } });
      expect(telemetry).toHaveLength(1);
      expect(telemetry[0]!.model).toBe('stub-test-model');
      expect(telemetry[0]!.success).toBe(false);
      // NOTHING persisted — no fake reply wearing a model badge.
      expect(await prisma2.aiConversation.count()).toBe(0);
      expect(await prisma2.aiMessage.count()).toBe(0);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server2.close((err) => (err ? reject(err) : resolve()));
      });
      // Restore the live stub URL for any later file in the suite.
      process.env.AI_BASE_URL = `http://127.0.0.1:${providerPort}/v1`;
    }
  });
});
