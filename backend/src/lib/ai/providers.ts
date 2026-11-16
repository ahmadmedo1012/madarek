/**
 * lib/ai/providers.ts — R353 C2: the multi-PROVIDER chain configuration.
 *
 * The r323 chain walked MODELS within ONE boot-frozen provider
 * (lib/ai.ts resolveModelChain). This module upgrades the unit of
 * failover to the PROVIDER: an ordered chain of OpenAI-compatible
 * providers (Gemini's OpenAI-compat endpoint, Groq, OpenRouter, …)
 * walked by the chain runner (runProviderChain, below) through the
 * SAME single transport adapter the platform already has
 * (callOpenAiCompatible / streamOpenAiCompatible — no new wire code).
 *
 * Configuration sources, in priority order (both FAIL-OPEN — AI is an
 * optional feature, an empty chain is the honest local-composer mode
 * and NEVER a boot crash):
 *  1. AI_PROVIDERS — a JSON document (array of provider descriptors,
 *     or {"providers": [...], "totalBudgetMs": …}). The explicit,
 *     owner-authored chain; the individual provider keys are ignored
 *     when it parses.
 *  2. The individual-key fallback — GEMINI_API_KEY (+AI_GEMINI_MODELS),
 *     GROQ_API_KEY (+AI_GROQ_MODELS), OPENROUTER_API_KEY
 *     (+AI_OPENROUTER_MODELS), each contributing its provider when its
 *     key exists, in the DEFAULT CHAIN ORDER: gemini (long-context /
 *     quality primary) → groq (fast/cheap) → openrouter (if key) →
 *     the legacy AI_PROVIDER/AI_* single entry (if configured). The
 *     LOCAL COMPOSER is the implicit last resort of a ≥2-provider
 *     chain (the route's terminal fallback — zero budget, zero cost).
 *
 * Secrets NEVER live here: keys are read from the process environment
 * only (named env vars, or an apiKeyEnv indirection inside
 * AI_PROVIDERS so the JSON blob itself carries no key material).
 *
 * Routing policy is DATA, not ifs: every provider carries task tags
 * ('chat' for all today) and routeChainForTask() selects the ordered
 * slice for a task. A future fast/query-expansion task type routes
 * groq-first simply by tagging — no runner change.
 */
import {
  AI_CHAIN_MODEL_RETRIES,
  RETRYABLE_KINDS,
  AiProviderError,
  backoffDelayMs,
  callOpenAiCompatible,
  classifyProviderFailure,
  isOpenRouterBaseUrl,
  parseAiModelsList,
  providerLabelFromBaseUrl,
  streamOpenAiCompatible,
  type AiChatMessage,
  type AiCompletion,
  type AiProviderConfig,
  type AiRetrySleeper,
  type AiStreamResult,
} from '../ai.js';

/* ────────────────────────────────────────────────────────────────
 *  The chain shape
 * ──────────────────────────────────────────────────────────────── */

/** One provider in the ordered chain — a spec, not a live client. */
export interface AiProviderSpec {
  /** Stable id (breaker key + telemetry provider column). */
  id: string;
  /** OpenAI-compatible base URL (the client appends /chat/completions). */
  baseUrl: string;
  /** The provider API key — read from the ENVIRONMENT only. */
  apiKey: string;
  /** Ordered fallback models WITHIN this provider (≥1, bounded ≤3). */
  models: string[];
  /** Hard ceiling for one round trip against this provider. */
  timeoutMs: number;
  /** Routing tags — which task types may land on this provider. */
  tasks: string[];
  /** RESERVED (r323 supersede): send OpenRouter's `models` array
   * instead of a pinned `model`. The chain runner pins ONE model per
   * attempt (attributable failures, per-model budget accounting), so
   * this flag is parsed and exposed but not engaged by the runner. */
  openrouterModelsArray?: boolean;
}

/** The whole chain + the runner's cross-provider policy knobs. */
export interface AiChainConfig {
  /** Ordered providers — the FIRST is the primary. */
  providers: AiProviderSpec[];
  /** Total wall-clock budget for ONE chat turn across ALL providers
     (the Vercel Hobby function limit is 60s; the default leaves room
     for the turn's DB writes + the SSE tail). */
  totalBudgetMs: number;
  /** Per-provider circuit breaker: consecutive provider failures that
   * open a cooldown, and the base cooldown length (jittered ±25%). */
  breaker: { threshold: number; cooldownMs: number };
}

/** The AI task types the chain can route (data, not ifs — see header). */
export type AiTask = 'chat';

/** The default chain budget — 50s of the Vercel Hobby 60s ceiling. */
export const AI_CHAIN_TOTAL_BUDGET_MS = 50_000;
/** The hard cap for any configured total budget (a typo must not pin
 * the route past the serverless function limit). */
export const AI_CHAIN_TOTAL_BUDGET_HARD_CAP_MS = 55_000;
/** Breaker defaults: 3 consecutive provider failures open a 60s
 * (jittered) cooldown — a rate-limited free tier recovers in about a
 * minute, and the chain serves the NEXT provider meanwhile. */
export const AI_CHAIN_BREAKER_THRESHOLD = 3;
export const AI_CHAIN_BREAKER_COOLDOWN_MS = 60_000;

/** The per-provider timeout defaults (tuned per vendor latency class:
 * Gemini long-context quality, Groq fast/cheap, OpenRouter routed). */
export const AI_PROVIDER_TIMEOUT_MS: Readonly<Record<'gemini' | 'groq' | 'openrouter', number>> = {
  gemini: 25_000,
  groq: 15_000,
  openrouter: 20_000,
};

/** The built-in registry: known providers get their real base URL,
 * key/model env names, sane default models, and timeout class. */
const KNOWN_PROVIDERS = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    keyEnv: 'GEMINI_API_KEY',
    modelsEnv: 'AI_GEMINI_MODELS',
    defaultModels: ['gemini-2.5-flash'],
    timeoutMs: AI_PROVIDER_TIMEOUT_MS.gemini,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    keyEnv: 'GROQ_API_KEY',
    modelsEnv: 'AI_GROQ_MODELS',
    // R355 C — llama-3.3-70b-versatile was decommissioned by Groq (404,
    // selftest run 43702927621). The live catalogue (selftest samples)
    // now centers on the gpt-oss family. R355 live-eval routing order:
    // 120b first (92.6% golden pass @ 726ms avg) over 20b (84.0% @
    // 479ms) — the accuracy edge wins; both are far under the 15s
    // timeout class.
    defaultModels: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    timeoutMs: AI_PROVIDER_TIMEOUT_MS.groq,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnv: 'OPENROUTER_API_KEY',
    modelsEnv: 'AI_OPENROUTER_MODELS',
    defaultModels: ['openrouter/free'],
    timeoutMs: AI_PROVIDER_TIMEOUT_MS.openrouter,
  },
} as const;

type KnownProviderId = keyof typeof KNOWN_PROVIDERS;
const isKnownProviderId = (id: string): id is KnownProviderId =>
  id === 'gemini' || id === 'groq' || id === 'openrouter';

/** Fallback per-provider timeout for AI_PROVIDERS entries without one
 * (and for the legacy single entry) — the historical AI_TIMEOUT_MS. */
const DEFAULT_PROVIDER_TIMEOUT_MS = 45_000;

/* ────────────────────────────────────────────────────────────────
 *  Parsing (pure — env-shaped record in, chain + warnings out)
 * ──────────────────────────────────────────────────────────────── */

/** Minimal env surface this module reads (process.env satisfies it;
 * tests pass plain records — no Node coupling in the pure layer). */
export type AiChainEnv = Readonly<Record<string, string | undefined>>;

/** The empty chain — the honest local-composer mode. */
export function emptyChain(): AiChainConfig {
  return {
    providers: [],
    totalBudgetMs: AI_CHAIN_TOTAL_BUDGET_MS,
    breaker: { threshold: AI_CHAIN_BREAKER_THRESHOLD, cooldownMs: AI_CHAIN_BREAKER_COOLDOWN_MS },
  };
}

interface ParseOutcome {
  chain: AiChainConfig;
  /** Non-fatal configuration problems (logged by the boot consumer —
   * parsing itself NEVER throws: AI is optional, fail-open). */
  warnings: string[];
}

/** Clamp a configured per-provider timeout to sane bounds. */
function boundedTimeout(ms: unknown, fallback: number): number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 5_000 && ms <= 55_000
    ? Math.floor(ms)
    : fallback;
}

/** Build one spec from the built-in registry (individual-key path). */
function specFromRegistry(id: KnownProviderId, env: AiChainEnv): AiProviderSpec | null {
  const known = KNOWN_PROVIDERS[id];
  const apiKey = env[known.keyEnv];
  if (!apiKey || apiKey.trim() === '') return null; // no key → provider absent, honestly
  const models = parseAiModelsList(env[known.modelsEnv]);
  if (models.length === 0) {
    // Key without a model list → the vendor's current default model
    // (documented in docs/06-configuration.md; owner-tunable).
    models.push(known.defaultModels[0]);
  }
  return { id, baseUrl: known.baseUrl, apiKey, models, timeoutMs: known.timeoutMs, tasks: ['chat'] };
}

/** The AI_PROVIDERS JSON descriptor shape. */
interface ProviderDescriptor {
  id?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  apiKeyEnv?: unknown;
  models?: unknown;
  model?: unknown;
  timeoutMs?: unknown;
  tasks?: unknown;
  openrouterModelsArray?: unknown;
}

/** Coerce one descriptor into a spec; null = drop (with a warning). */
function specFromDescriptor(raw: unknown, env: AiChainEnv, warnings: string[]): AiProviderSpec | null {
  if (typeof raw !== 'object' || raw === null) {
    warnings.push('AI_PROVIDERS: a non-object entry was dropped');
    return null;
  }
  const d = raw as ProviderDescriptor;
  if (typeof d.id !== 'string' || d.id.trim() === '' || d.id.length > 40) {
    warnings.push('AI_PROVIDERS: an entry without a valid id (string, ≤40 chars) was dropped');
    return null;
  }
  const id = d.id.trim();
  const known = isKnownProviderId(id) ? KNOWN_PROVIDERS[id] : null;
  // Base URL: explicit, else the known registry's, else REQUIRED.
  let baseUrl: string | null = null;
  if (typeof d.baseUrl === 'string' && d.baseUrl.trim() !== '') baseUrl = d.baseUrl.trim();
  else if (known) baseUrl = known.baseUrl;
  if (baseUrl === null) {
    warnings.push(`AI_PROVIDERS: provider "${id}" has no baseUrl (required for unknown ids) — dropped`);
    return null;
  }
  // Key: explicit apiKey, else the named env var, else the registry's
  // key env — the JSON blob itself should carry NO key material.
  let apiKey: string | undefined;
  if (typeof d.apiKey === 'string' && d.apiKey.trim() !== '') apiKey = d.apiKey.trim();
  else if (typeof d.apiKeyEnv === 'string' && d.apiKeyEnv.trim() !== '') {
    const v = env[d.apiKeyEnv.trim()];
    if (typeof v === 'string' && v.trim() !== '') apiKey = v.trim();
  } else if (known) {
    const v = env[known.keyEnv];
    if (typeof v === 'string' && v.trim() !== '') apiKey = v.trim();
  }
  if (!apiKey) {
    warnings.push(`AI_PROVIDERS: provider "${id}" has no resolvable API key — dropped (AI is optional, fail-open)`);
    return null;
  }
  // Models: an ordered array (≤3) or a comma string; else the
  // registry default; else REQUIRED for unknown ids.
  let models: string[] = [];
  if (Array.isArray(d.models)) {
    const ids = d.models.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    models = [...new Set(ids.map((m) => m.trim()))].slice(0, 3);
  } else if (typeof d.models === 'string') {
    models = parseAiModelsList(d.models);
  } else if (typeof d.model === 'string' && d.model.trim() !== '') {
    models = [d.model.trim()];
  } else if (known) {
    models = [...known.defaultModels];
  }
  if (models.length === 0) {
    warnings.push(`AI_PROVIDERS: provider "${id}" lists no models — dropped`);
    return null;
  }
  const tasks =
    Array.isArray(d.tasks) && d.tasks.every((t) => typeof t === 'string' && t.trim() !== '')
      ? (d.tasks as string[]).map((t) => t.trim()).slice(0, 5)
      : ['chat'];
  return {
    id,
    baseUrl,
    apiKey,
    models,
    timeoutMs: boundedTimeout(d.timeoutMs, known ? known.timeoutMs : DEFAULT_PROVIDER_TIMEOUT_MS),
    tasks,
    ...(d.openrouterModelsArray === true ? { openrouterModelsArray: true } : {}),
  };
}

/**
 * Parse the chain from an env-shaped record (PURE — the test seam for
 * every configuration grammar; never throws, never boots-crashes).
 */
export function parseAiChainEnv(env: AiChainEnv): ParseOutcome {
  const warnings: string[] = [];

  // 1. The explicit AI_PROVIDERS JSON wins entirely when it parses.
  const rawJson = env.AI_PROVIDERS?.trim();
  if (rawJson !== undefined && rawJson !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch (err) {
      warnings.push(`AI_PROVIDERS is not valid JSON (${(err as Error).message}) — ignored (fail-open)`);
      return { chain: emptyChain(), warnings };
    }
    const list: unknown = Array.isArray(parsed)
      ? parsed
      : (parsed as { providers?: unknown })?.providers;
    if (!Array.isArray(list)) {
      warnings.push('AI_PROVIDERS must be a JSON array (or {"providers": [...]}) — ignored (fail-open)');
      return { chain: emptyChain(), warnings };
    }
    const providers = list
      .map((entry) => specFromDescriptor(entry, env, warnings))
      .filter((s): s is AiProviderSpec => s !== null);
    if (providers.length === 0) {
      warnings.push('AI_PROVIDERS parsed to an EMPTY chain — the local composer mode is active');
    }
    let totalBudgetMs = AI_CHAIN_TOTAL_BUDGET_MS;
    if (!Array.isArray(parsed) && typeof (parsed as { totalBudgetMs?: unknown }).totalBudgetMs === 'number') {
      const raw = (parsed as { totalBudgetMs: number }).totalBudgetMs;
      if (Number.isFinite(raw) && raw >= 5_000) {
        totalBudgetMs = Math.min(Math.floor(raw), AI_CHAIN_TOTAL_BUDGET_HARD_CAP_MS);
      } else {
        warnings.push(
          `AI_PROVIDERS totalBudgetMs=${String(raw)} is out of bounds — the ${AI_CHAIN_TOTAL_BUDGET_MS}ms default applies`,
        );
      }
    }
    return { chain: { ...emptyChain(), providers, totalBudgetMs }, warnings };
  }

  // 2. The individual-key fallback: the default chain order is
  //    gemini → groq → openrouter → legacy; local composer implicit.
  const providers: AiProviderSpec[] = [];
  for (const id of ['gemini', 'groq', 'openrouter'] as const) {
    const spec = specFromRegistry(id, env);
    if (spec) providers.push(spec);
  }
  // The legacy single entry (AI_PROVIDER=openai + AI_*): today's
  // configuration rides the chain as its LAST provider, unchanged.
  if (env.AI_PROVIDER === 'openai' && env.AI_API_KEY && env.AI_MODEL) {
    const baseUrl = env.AI_BASE_URL ?? 'https://api.openai.com/v1';
    const legacyModels = parseAiModelsList(env.AI_MODELS);
    providers.push({
      id: providerLabelFromBaseUrl(baseUrl),
      baseUrl,
      apiKey: env.AI_API_KEY,
      models: legacyModels.length > 0 ? legacyModels : [env.AI_MODEL],
      timeoutMs: boundedTimeout(env.AI_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS),
      tasks: ['chat'],
    });
  }
  return { chain: { ...emptyChain(), providers }, warnings };
}

/* ────────────────────────────────────────────────────────────────
 *  Boot-time resolution (memoized — env is frozen at boot)
 * ──────────────────────────────────────────────────────────────── */

let cachedChain: AiChainConfig | undefined;
let cachedWarnings: string[] = [];

/** The memoized chain from the real process env (the route freezes it
 * at module load, exactly like getAiProvider). */
export function getAiChain(): AiChainConfig {
  if (cachedChain === undefined) {
    const outcome = parseAiChainEnv(process.env);
    cachedChain = outcome.chain;
    cachedWarnings = outcome.warnings;
  }
  return cachedChain;
}

/** The parse warnings from the last getAiChain() resolution (the boot
 * consumer logs them once; keys NEVER appear here). */
export function getAiChainWarnings(): string[] {
  return cachedWarnings;
}

/** ≥2 providers configured → the CHAIN mode (cross-provider failover
 * with the local composer as the terminal fallback). A single provider
 * keeps the historical single-provider contract (honest error on
 * failure — the owner asked for exactly that provider). */
export function isChainMode(chain: AiChainConfig): boolean {
  return chain.providers.length >= 2;
}

/** Test seam: reset the boot memo (mirrors the vi.resetModules
 * registry-fresh pattern the route tests use). */
export function resetAiChainCacheForTests(): void {
  cachedChain = undefined;
  cachedWarnings = [];
}

/** The ordered providers that may serve one task type (the routing
 * POLICY — data, not ifs; a future 'fast' task tags groq and routes
 * it first without touching the runner). */
export function routeChainForTask(chain: AiChainConfig, task: AiTask): AiProviderSpec[] {
  return chain.providers.filter((p) => p.tasks.includes(task));
}

/* ────────────────────────────────────────────────────────────────
 *  The per-provider circuit breaker (pure state, injectable clock)
 * ──────────────────────────────────────────────────────────────── */

/** One provider's breaker state — monotonic timestamps ONLY (no
 * timers: a cooldown is a fact about the clock, not a wakeup). */
interface BreakerState {
  consecutiveFailures: number;
  openedAt: number | null;
  cooldownMs: number;
}

/** The tri-state answer every consult returns. */
export type BreakerVerdict = 'closed' | 'open' | 'half-open';

/**
 * In-process per-provider circuit breaker. A provider whose chain
 * walk failed `threshold` times CONSECUTIVELY (across requests — a
 * provider failure = its whole model walk failing in one turn) is
 * OPEN for a jittered cooldown: the chain skips it without burning
 * the turn's budget on a provider that just refused 3 times. After
 * the cooldown the verdict is HALF-OPEN — one probe attempt; success
 * closes the breaker, failure re-opens it with a fresh cooldown.
 */
export class AiProviderBreakers {
  private readonly states = new Map<string, BreakerState>();

  constructor(
    private readonly config: { threshold: number; cooldownMs: number },
    private readonly rand: () => number = Math.random,
  ) {}

  /** Jittered cooldown: base ±25% (a synchronized fleet of students
   * tripping the same 429 must not re-probe in the same millisecond). */
  private jitteredCooldown(): number {
    const factor = 0.75 + this.rand() * 0.5;
    return Math.max(1, Math.floor(this.config.cooldownMs * factor));
  }

  consult(id: string, now: number): BreakerVerdict {
    const s = this.states.get(id);
    if (s === undefined || s.openedAt === null) return 'closed';
    return now - s.openedAt < s.cooldownMs ? 'open' : 'half-open';
  }

  /** A provider failure — opens the breaker at the threshold. r357 L5:
   * a failure carrying the provider's own Retry-After (a 429) opens
   * with cooldown = max(jittered default, Retry-After) — the chain
   * skips the provider until the SERVER said it may be asked again. */
  recordFailure(id: string, now: number, retryAfterMs?: number): void {
    const s =
      this.states.get(id) ??
      ({ consecutiveFailures: 0, openedAt: null, cooldownMs: this.config.cooldownMs } satisfies BreakerState);
    s.consecutiveFailures += 1;
    if (s.consecutiveFailures >= this.config.threshold) {
      s.openedAt = now;
      const base = this.jitteredCooldown();
      s.cooldownMs = retryAfterMs !== undefined ? Math.max(base, retryAfterMs) : base;
    }
    this.states.set(id, s);
  }

  /** r357 L5 — the in-process quota/health view /status exposes (NO
   * secrets: ids, verdicts, and the remaining cooldown only). */
  snapshot(now: number = Date.now()): Record<string, { verdict: BreakerVerdict; cooldownRemainingMs: number }> {
    const out: Record<string, { verdict: BreakerVerdict; cooldownRemainingMs: number }> = {};
    for (const [id, s] of this.states) {
      const verdict = this.consult(id, now);
      out[id] = { verdict, cooldownRemainingMs: s.openedAt === null ? 0 : Math.max(0, s.cooldownMs - (now - s.openedAt)) };
    }
    return out;
  }

  /** A provider success — the provider is healthy again (closed). */
  recordSuccess(id: string): void {
    this.states.delete(id);
  }

  /** Test seam: a clean slate between cases. */
  reset(): void {
    this.states.clear();
  }
}

/** The process-wide breaker the route's chain walks share. */
export const aiProviderBreakers = new AiProviderBreakers({
  threshold: AI_CHAIN_BREAKER_THRESHOLD,
  cooldownMs: AI_CHAIN_BREAKER_COOLDOWN_MS,
});

/* ────────────────────────────────────────────────────────────────
 *  The chain runner — (provider, model) pairs across providers
 * ──────────────────────────────────────────────────────────────── */

/** What the chain transports return: the payload + WHO answered. */
export interface AiChainOutcome<T> {
  result: T;
  /** The answering provider's stable id (telemetry `provider`). */
  providerId: string;
  /** The answering provider's honest label (the envelope `engine`). */
  providerLabel: string;
  /** The PINNED model that answered — the honest attribution fallback
   * when the provider's payload omitted its own model metadata. */
  model: string;
}

/** Runner injections — tests pin ordering without wall-clock waits. */
export interface AiChainRunOptions {
  log: (obj: Record<string, unknown>, msg: string) => void;
  sleep?: AiRetrySleeper;
  /** Monotonic clock (Date.now by default). */
  now?: () => number;
  breakers?: AiProviderBreakers;
  /** Budget override (defaults to the chain's totalBudgetMs). */
  totalBudgetMs?: number;
  /** Client abort — short-circuits retries AND fall-through. */
  isAborted?: () => boolean;
}

const defaultChainSleeper: AiRetrySleeper = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The honest label for a spec (r175 ruling — a spec's id is
 * owner-chosen, the LABEL stays vendor-honest from the base URL). */
export function providerLabel(spec: AiProviderSpec): string {
  return providerLabelFromBaseUrl(spec.baseUrl);
}

/** One spec → the wire config the existing adapter consumes. */
function wireConfig(spec: AiProviderSpec): AiProviderConfig {
  return {
    baseUrl: spec.baseUrl,
    apiKey: spec.apiKey,
    model: spec.models[0]!,
    // The chain pins ONE model per attempt (modelOverride), so this
    // list rides the wire only in a future router-side mode.
    models:
      spec.openrouterModelsArray === true && isOpenRouterBaseUrl(spec.baseUrl) ? [...spec.models] : [],
    timeoutMs: spec.timeoutMs,
  };
}

/**
 * Walk the (provider, model) pairs of the routed chain IN ORDER:
 *  · per model, the r176a/r323 retry grammar unchanged (ONE bounded
 *    jittered retry for fast-fail transients — rate_limited/transport/
 *    provider_error — never a same-model timeout retry);
 *  · per provider, the breaker is consulted BEFORE its first attempt
 *    (open → skip entirely; half-open → ONE probe attempt for the
 *    whole provider);
 *  · a budget check precedes every attempt: an attempt whose worst
 *    case (the provider's timeoutMs) cannot fit the REMAINING
 *    totalBudgetMs is pre-empted — the Vercel Hobby function dies at
 *    60s, and a doomed attempt must not eat the local fallback's
 *    share of the turn;
 *  · a client abort short-circuits everything (no retries, no
 *    fall-through) — the student already left.
 *
 * Throws the LAST classified AiProviderError when the whole chain is
 * exhausted (the route decides what that means per mode: honest error
 * for a single provider, local-composer terminal fallback in chain
 * mode). A provider skipped by the breaker or by the budget was never
 * attempted — its breaker state stays untouched (the BUDGET refusing
 * is not the provider failing).
 */
export async function runProviderChain<T>(
  chain: AiChainConfig,
  task: AiTask,
  attempt: (spec: AiProviderSpec, model: string) => Promise<T>,
  opts: AiChainRunOptions,
): Promise<AiChainOutcome<T>> {
  const log = opts.log;
  const sleep = opts.sleep ?? defaultChainSleeper;
  const now = opts.now ?? Date.now;
  const breakers = opts.breakers ?? aiProviderBreakers;
  const totalBudgetMs = opts.totalBudgetMs ?? chain.totalBudgetMs;
  const startedAt = now();
  let lastError: unknown;

  for (const spec of routeChainForTask(chain, task)) {
    // Breaker consult — BEFORE the provider's first attempt.
    const verdict = breakers.consult(spec.id, now());
    if (verdict === 'open') {
      log(
        { provider: spec.id, cooldownBaseMs: chain.breaker.cooldownMs },
        'AI chain: provider circuit OPEN — skipping to the next provider',
      );
      continue;
    }

    const modelList = spec.models;
    let attempted = false;
    let answered: AiChainOutcome<T> | null = null;
    let preempted = false;

    for (let mi = 0; mi < modelList.length && answered === null && !preempted; mi += 1) {
      const model = modelList[mi]!;
      for (let attemptNo = 0; attemptNo <= AI_CHAIN_MODEL_RETRIES; attemptNo += 1) {
        // Budget pre-emption: the WORST case of this attempt is the
        // provider's own timeout ceiling — if it cannot fit what
        // remains of the turn's total budget, do not start it.
        const elapsed = now() - startedAt;
        if (elapsed + spec.timeoutMs > totalBudgetMs) {
          log(
            {
              provider: spec.id,
              model,
              elapsedMs: elapsed,
              remainingMs: totalBudgetMs - elapsed,
              attemptCeilingMs: spec.timeoutMs,
            },
            'AI chain: budget pre-emption — the attempt cannot fit the remaining turn budget, skipping provider',
          );
          preempted = true;
          break;
        }
        // Half-open probe: exactly ONE attempt for the provider.
        if (verdict === 'half-open' && attemptNo > 0) break;
        attempted = true;
        try {
          const result = await attempt(spec, model);
          breakers.recordSuccess(spec.id);
          answered = { result, providerId: spec.id, providerLabel: providerLabel(spec), model };
          break;
        } catch (err) {
          lastError = err;
          // A client-side abort is NEVER a provider fault.
          if (opts.isAborted?.()) throw err;
          const kind = classifyProviderFailure(err);
          const sameModelRetryable = kind !== 'timeout' && RETRYABLE_KINDS.has(kind);
          if (attemptNo < AI_CHAIN_MODEL_RETRIES && sameModelRetryable && verdict !== 'half-open') {
            const delay = backoffDelayMs(attemptNo);
            log(
              { err, kind, provider: spec.id, model, retryInMs: delay },
              'AI chain: provider transient failure — retrying once on the same model',
            );
            await sleep(delay);
            continue;
          }
          break; // exhausted (or non-transient / probe) → next model
        }
      }
      // A half-open provider gets ONE probe — never its later models.
      if (verdict === 'half-open') break;
    }

    if (answered !== null) return answered;
    // The provider was ATTEMPTED and did not answer → a breaker
    // failure. (Pre-empted-before-attempt and breaker-skipped are
    // NOT provider failures — see the runner header.) r357 L5: a
    // 429's Retry-After rides the failure — the breaker honors the
    // provider's own word over the generic cooldown.
    if (attempted) {
      const retryAfter = lastError instanceof AiProviderError ? lastError.retryAfterMs : undefined;
      if (retryAfter !== undefined) {
        log(
          { provider: spec.id, retryAfterMs: retryAfter },
          'AI chain: rate-limited with Retry-After — breaker cooldown honors the provider',
        );
      }
      breakers.recordFailure(spec.id, now(), retryAfter);
    }
  }

  if (lastError !== undefined) throw lastError;
  // Nothing was ever attempted (every provider skipped by the breaker
  // or pre-empted by the budget): an honest classified timeout.
  throw new AiProviderError(
    `AI chain exhausted without an attempt (total budget ${totalBudgetMs}ms)`,
    'timeout',
  );
}

/* ────────────────────────────────────────────────────────────────
 *  The two transports on the chain (mirrors callProviderWithRetry /
 *  streamProviderWithChain — the runner is the only difference)
 * ──────────────────────────────────────────────────────────────── */

/** The JSON transport over the chain (route: POST /ai/chat). */
export async function callProviderChain(
  chain: AiChainConfig,
  messages: readonly AiChatMessage[],
  opts: AiChainRunOptions,
): Promise<AiChainOutcome<AiCompletion>> {
  return runProviderChain(
    chain,
    'chat',
    (spec, model) => callOpenAiCompatible(wireConfig(spec), messages, model),
    opts,
  );
}

/** The SSE transport over the chain (route: ?stream=1). Deltas flow
 * only from the model that ultimately answers — a provider that
 * fails before any token fell through silently; once tokens reached
 * the student a failure surfaces (no mid-stream stitching of two
 * providers' prose into one lie of a reply). */
export async function streamProviderChain(
  chain: AiChainConfig,
  messages: readonly AiChatMessage[],
  onDelta: (delta: string) => void,
  opts: AiChainRunOptions & { externalSignal?: AbortSignal },
): Promise<AiChainOutcome<AiStreamResult>> {
  return runProviderChain(
    chain,
    'chat',
    (spec, model) =>
      streamOpenAiCompatible(wireConfig(spec), model, messages, onDelta, opts.externalSignal),
    { ...opts, isAborted: () => opts.externalSignal?.aborted ?? false },
  );
}
