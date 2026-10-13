/**
 * lib/ai.ts — the AI provider abstraction (P4: real LLM, opt-in).
 *
 * Two modes, ONE contract:
 *  · 'local' (default): the route composes replies locally (ai.routes.ts
 *    composeReply — mastery-aware templates, zero cost, zero calls).
 *    Everything about the current behavior stays untouched.
 *  · 'openai': an OpenAI-compatible chat-completions endpoint (OpenAI,
 *    Groq, OpenRouter, DeepSeek, Together, vLLM, Ollama…) is called with
 *    a mastery-aware Arabic system prompt + the conversation's recent
 *    turns. Selected by env: AI_PROVIDER=openai + AI_API_KEY + AI_MODEL
 *    (AI_BASE_URL defaults to https://api.openai.com/v1). A half
 *    configuration fails boot in env.ts (fail-closed, like the s3
 *    storage driver).
 *
 * Honesty rules (mirrors the storage canon):
 *  · NO silent fallback: when the provider is configured but the call
 *    fails, the route surfaces an honest Arabic error (the FE already
 *    renders a retry affordance) and writes failure telemetry with the
 *    model name that was attempted. A template reply wearing an LLM
 *    badge is a lie we don't ship.
 *  · Tokens are recorded from the provider's usage block ONLY; a
 *    missing usage block records 0 (never estimated, never fabricated)
 *    — same ruling as the r154c «عدّاد توكنات يبقى 0 بصدق».
 *  · The local composer keeps model='gap-aware-composer' and 0 tokens.
 *
 * Pure helpers are exported for DB-free test pins
 * (tests/modules/ai-provider.test.ts); the one impure piece is
 * callOpenAiCompatible (global fetch + AbortSignal.timeout — node ≥ 20,
 * no new npm dependencies, same shape as the S3 driver).
 */
import { env } from '../env.js';

/** The two reply engines the platform can run (see header). */
export type AiProviderMode = 'local' | 'openai';

/** Chat wire format — the OpenAI-compatible message shape. */
export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Completion outcome — content + the honest token counts. */
export interface AiCompletion {
  content: string;
  inputTokens: number;
  outputTokens: number;
}

/** Everything the impure client needs; resolved once per boot. */
export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Hard ceiling for the whole round trip. */
  timeoutMs: number;
}

/** Request ceiling — replies stay concise and the cost stays bounded. */
export const AI_MAX_OUTPUT_TOKENS = 800;
/** Deterministic-ish temperature: grounded study advice, not poetry. */
export const AI_TEMPERATURE = 0.4;
/** Provider round-trip ceiling (ms) — a slow model must not pin the
 * route (and its rate-limit window) for a minute. */
export const AI_TIMEOUT_MS = 45_000;

/** How many past turns ride the request (a user+assistant pair = 2). */
export const AI_HISTORY_TURNS = 12;

/* ────────────────────────────────────────────────────────────────
 *  Pure helpers (test-pinned)
 * ──────────────────────────────────────────────────────────────── */

/**
 * Keep the NEWEST `maxMessages` entries, restoring chronological order.
 * The DB read is newest-first (desc + take — the bounded-read house
 * pattern), so this both windows and re-orients. Non-mutating.
 */
export function windowHistory<T>(messages: readonly T[], maxMessages: number): T[] {
  if (maxMessages <= 0) return [];
  return messages.slice(0, maxMessages).reverse();
}

/**
 * Assemble the request messages: system first, then the (already
 * windowed, chronological) history, then the user's new message. The
 * system prompt is ALWAYS index 0 — providers treat it as the
 * instruction block, and tests pin that the user message is last so a
 * truncated history can never eat the thing being asked.
 */
export function buildChatMessages(
  system: string,
  history: readonly AiChatMessage[],
  user: string,
): AiChatMessage[] {
  return [{ role: 'system', content: system }, ...history, { role: 'user', content: user }];
}

/**
 * Parse a chat-completions response payload. Tolerates a missing
 * `usage` (0 tokens — the honest default) but NOT a missing/empty
 * choice content (an empty reply is a provider failure, not a chat
 * reply). Throws Error with a stable prefix the route can log.
 */
export function parseChatCompletion(payload: unknown): AiCompletion {
  const body = payload as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  };
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('parseChatCompletion: no message content in provider response');
  }
  const toInt = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
  return {
    content,
    inputTokens: toInt(body?.usage?.prompt_tokens),
    outputTokens: toInt(body?.usage?.completion_tokens),
  };
}

/** The mastery facts the student system prompt is built from — a plain
 * projection of the prisma rows (DB rows never cross this boundary). */
export interface MasteryFact {
  conceptName: string;
  courseName: string;
  /** 0..1 mastery level (Prisma Decimal coerces via Number()). */
  level: number;
  /** First chapter's lecture title, when the concept has one. */
  lectureTitle?: string;
}

/** Tier label for one fact — the SAME thresholds masteryTier() uses
 * (ai.routes.ts), single-worded here for the prompt lines. */
export function masteryFactTier(level: number): 'فجوة' | 'قيد التطوّر' | 'متقن' {
  if (level < 0.5) return 'فجوة';
  if (level < 0.8) return 'قيد التطوّر';
  return 'متقن';
}

/**
 * Render the mastery context block (one line per concept). Worst gaps
 * FIRST — the model should lead with what the student most needs.
 */
export function masteryContextLines(facts: readonly MasteryFact[]): string[] {
  return [...facts]
    .sort((a, b) => a.level - b.level)
    .map((f) => {
      const pct = Math.round(f.level * 100);
      const line = `- ${f.conceptName} (${f.courseName}): ${pct}% — ${masteryFactTier(f.level)}`;
      return f.lectureTitle ? `${line} — محاضرة ذات صلة: «${f.lectureTitle}»` : line;
    });
}

/**
 * The student system prompt: platform persona + the student's real
 * mastery context + guardrails against inventing data. Bilingual keys
 * are deliberately NOT used — the assistant speaks Arabic (the
 * platform's language policy, D17-3).
 */
export function buildStudentSystemPrompt(contextLines: readonly string[]): string {
  const context =
    contextLines.length > 0
      ? `بيانات إتقان الطالب الحقيقية (من المنصّة):\n${contextLines.join('\n')}`
      : 'لا توجد بيانات إتقان مسجّلة لهذا الطالب بعد.';
  return [
    'أنت «مساعد مدارك الدراسيّ» — مساعد تعليميّ لطلبة الجامعة على منصّة مدارك.',
    'تحدّث بالعربية الفصحى المبسّطة، بإيجاز ووضوح، وتوجّه إجاباتك نحو خطوة دراسيّة تالية قابلة للتنفيذ.',
    'ركّز على فجوات الطالب المعرفيّة (الإتقان تحت 50%) قبل المفاهيم المتقنة، واستشهد بأرقام الإتقان كما وردت لا غير.',
    'لا تختلق درجات أو محاضرات أو بيانات غير موجودة في السياق؛ إن لم تتوفّر معلومة فقل ذلك بصدق.',
    context,
  ].join('\n');
}

/** The non-student system prompt — no mastery rows exist for teachers
 * and other roles, so the prompt stays honestly generic. */
export function buildGenericSystemPrompt(): string {
  return [
    'أنت «مساعد مدارك» — مساعد تحليليّ لأعضاء هيئة التدريس والإدارة على منصّة مدارك.',
    'تحدّث بالعربية الفصحى المبسّطة، بإيجاز ووضوح.',
    'لا تختلق بيانات أو صلاحيات أو إحصاءات غير موجودة؛ إن لم تتوفّر معلومة فقل ذلك بصدق.',
    'أسئلتك غالبًا تدور حول التدريس والتقييم وتنظيم المقرّرات — أجِب عمليًا.',
  ].join('\n');
}

/* ────────────────────────────────────────────────────────────────
 *  Impure: the OpenAI-compatible client + boot-time resolution
 * ──────────────────────────────────────────────────────────────── */

/** Provider transport failure — carries the HTTP status when there was
 * one (4xx/5xx) so the log line answers "was it auth, quota, or net?". */
export class AiProviderError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AiProviderError';
    this.status = status;
  }
}

/**
 * POST {baseUrl}/chat/completions with the OpenAI-compatible contract.
 * Errors are ALWAYS AiProviderError (timeout, non-2xx, transport, or
 * unparseable payload) — the route maps them to one honest Arabic
 * AppError and failure telemetry. No retries: a slow/failing provider
 * must surface, not silently retry against a paid quota.
 */
export async function callOpenAiCompatible(
  cfg: AiProviderConfig,
  messages: readonly AiChatMessage[],
): Promise<AiCompletion> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: AI_TEMPERATURE,
        max_tokens: AI_MAX_OUTPUT_TOKENS,
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (err) {
    // AbortSignal.timeout throws TimeoutError (a DOMException — NOT an
    // Error instanceof on every runtime); plain fetch throws TypeError
    // on network faults. Name-check only, so both map to transport.
    const name = (err as { name?: string })?.name;
    throw new AiProviderError(
      name === 'TimeoutError'
        ? `provider timeout after ${cfg.timeoutMs}ms`
        : `provider transport failure: ${(err as Error).message}`,
    );
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    // Body excerpt goes to the LOG only (client-safe rule, AppError.internal).
    throw new AiProviderError(`provider HTTP ${res.status}: ${bodyText.slice(0, 300)}`, res.status);
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new AiProviderError('provider returned non-JSON body');
  }

  try {
    return parseChatCompletion(payload);
  } catch (err) {
    throw new AiProviderError((err as Error).message);
  }
}

/**
 * Boot-time provider resolution (memoized — env is frozen at boot).
 * Returns null when AI_PROVIDER !== 'openai' (the local composer mode),
 * so the route's `if (provider)` reads as the mode switch. The env
 * schema guarantees key+model exist in openai mode (fail-closed); this
 * function still defensive-checks so a future env regression degrades
 * to the LOCAL composer rather than crashing requests.
 */
let cachedProvider: AiProviderConfig | null | undefined;
export function getAiProvider(): AiProviderConfig | null {
  if (cachedProvider !== undefined) return cachedProvider;
  cachedProvider =
    env.AI_PROVIDER === 'openai' && env.AI_API_KEY && env.AI_MODEL
      ? {
          baseUrl: env.AI_BASE_URL ?? 'https://api.openai.com/v1',
          apiKey: env.AI_API_KEY,
          model: env.AI_MODEL,
          timeoutMs: AI_TIMEOUT_MS,
        }
      : null;
  return cachedProvider;
}
