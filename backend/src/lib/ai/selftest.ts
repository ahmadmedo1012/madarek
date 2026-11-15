/**
 * lib/ai/selftest.ts — R354 V2: the provider REALITY probe.
 *
 * WHY: this sandbox (and any single vantage point) cannot prove a
 * provider key works — Groq 403s from the sandbox geo, Gemini refuses
 * the region, and `aiMode: chain` only proves the CONFIG parsed, not
 * that a provider answers. The only honest vantage point is the
 * production Vercel function itself (fra1). This module is the engine
 * POST /api/v1/internal/ai-selftest runs IN that function: for every
 * provider in the resolved chain it probes
 *
 *   1. GET  {baseUrl}/models        — does the key list models?
 *   2. POST {baseUrl}/chat/completions (max_tokens: 1) — does a real
 *      1-token completion round-trip, on which model, at what latency?
 *
 * LAWS (mirrored from the route):
 *   · Keys NEVER leave the function: no key in any field of the report,
 *     errors are redacted (exact-match + shape patterns) and truncated.
 *   · PURE with an injectable fetch — tests drive fake transports, no
 *     network, ever (the parseAiChainEnv seam, not getAiChain's memo).
 *   · Bounded: every probe carries a 10 s AbortController deadline and
 *     providers are probed in PARALLEL — 3 providers ≈ worst case one
 *     deadline window, far inside the function's 60 s ceiling.
 *   · Fail-open reporting: a provider that refuses is a DATA POINT
 *     (ok:false + status + error), never a thrown error.
 */
import { parseAiChainEnv, type AiChainEnv } from './providers.js';

/** The per-provider probe outcome — the RESUME table's rows. */
export interface SelftestProbeResult {
  provider: string;
  /** The wire base URL (public knowledge — never carries the key). */
  baseUrl: string;
  /** Models attempted in order (the chain spec's list, ≤3). */
  modelsTried: string[];
  modelsList: {
    ok: boolean;
    status: number;
    latencyMs: number;
    /** How many model ids the provider listed (null = unparsable). */
    modelCount: number | null;
    /** First ≤10 live model ids (R354 C1: the evidence for picking a
     * live model when the configured one was decommissioned — e.g.
     * Groq's llama-3.3-70b-versatile 404). Model ids are public. */
    sample: string[];
  } | null;
  completion: {
    ok: boolean;
    status: number;
    latencyMs: number;
    /** The model that actually answered (null = none did). */
    model: string | null;
    /** Characters in the reply content (1-token ping ⇒ tiny). */
    replyChars: number | null;
  } | null;
  /** Redacted, ≤180 chars, key-free. */
  error: string | null;
}

/** The full report the route returns (inside the data envelope). */
export interface SelftestReport {
  ranAtIso: string;
  /** VERCEL_REGION when present (proof the probe ran on fra1). */
  region: string | null;
  aiMode: 'chain' | 'single' | 'local';
  providerCount: number;
  totalBudgetMs: number;
  /** The honest per-provider rows. */
  probes: SelftestProbeResult[];
  /** Non-fatal chain-parse warnings (key-free by construction). */
  configWarnings: string[];
}

/** The fetch seam: node's undici shape, mockable in tests. */
export type SelftestFetch = (url: string, init: RequestInit) => Promise<Response>;

/** One probe leg's raw observation (internal). */
interface LegResult {
  status: number;
  bodyText: string;
  latencyMs: number;
  timedOut: boolean;
  fetchError: string | null;
}

const PROBE_TIMEOUT_MS = 10_000;
const MAX_ERROR_CHARS = 180;

/** Redact key material from an error/text snippet before it can leave. */
export function redactSecrets(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const s of secrets) {
    if (s && s.length >= 8) {
      // split/join: replaceAll without the es2021 requirement
      out = out.split(s).join('***');
    }
  }
  // Shape patterns: anything token-shaped or any Bearer header.
  out = out.replace(/(?:sk|gsk|AQ)\b[A-Za-z0-9._-]{8,}/g, '***');
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer ***');
  out = out.replace(/key=[A-Za-z0-9._-]+/gi, 'key=***');
  return out.slice(0, MAX_ERROR_CHARS);
}

async function fetchLeg(
  url: string,
  init: RequestInit,
  fetchImpl: SelftestFetch,
): Promise<LegResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    const bodyText = await res.text();
    return { status: res.status, bodyText, latencyMs: Date.now() - startedAt, timedOut: false, fetchError: null };
  } catch (err) {
    const e = err as Error & { name?: string };
    const timedOut = e.name === 'AbortError';
    return {
      status: 0,
      bodyText: '',
      latencyMs: Date.now() - startedAt,
      timedOut,
      fetchError: timedOut ? `timeout after ${PROBE_TIMEOUT_MS}ms` : e.message ?? 'fetch failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract a short, key-free error message from a failed leg. */
function legError(leg: LegResult, secrets: readonly string[]): string {
  if (leg.fetchError) return redactSecrets(leg.fetchError, secrets);
  // Prefer the provider's own error JSON `message` when present.
  try {
    const parsed = JSON.parse(leg.bodyText) as { error?: { message?: unknown } | string };
    const em = typeof parsed.error === 'string' ? parsed.error : parsed.error?.message;
    if (typeof em === 'string' && em.trim() !== '') return redactSecrets(em, secrets);
  } catch {
    /* not JSON — fall through to raw text */
  }
  return redactSecrets(leg.bodyText.trim() || `HTTP ${leg.status}`, secrets);
}

/** Extract model ids from an OpenAI-compatible /models response. */
function parseModelIds(bodyText: string): { count: number | null; sample: string[] } {
  try {
    const parsed = JSON.parse(bodyText) as { data?: unknown };
    if (Array.isArray(parsed.data)) {
      const ids = parsed.data
        .filter((m): m is { id: unknown } => typeof m === 'object' && m !== null && 'id' in m)
        .map((m) => (typeof m.id === 'string' ? m.id : null))
        .filter((id): id is string => id !== null);
      return { count: ids.length, sample: ids.slice(0, 10) };
    }
  } catch {
    /* unparsable → null count, empty sample */
  }
  return { count: null, sample: [] };
}

/** Extract reply text length from a chat completion response. */
function replyChars(bodyText: string): number | null {
  try {
    const parsed = JSON.parse(bodyText) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const c = parsed.choices?.[0]?.message?.content;
    if (typeof c === 'string') return c.length;
    if (Array.isArray(c)) return c.length;
  } catch {
    /* unparsable → null */
  }
  return null;
}

/** Probe ONE provider spec (models list + 1-token completion). */
export async function probeProvider(
  spec: { id: string; baseUrl: string; apiKey: string; models: string[] },
  fetchImpl: SelftestFetch,
): Promise<SelftestProbeResult> {
  const secrets = [spec.apiKey];
  const base = spec.baseUrl.replace(/\/+$/, '');
  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${spec.apiKey}`,
    'Content-Type': 'application/json',
  };

  const result: SelftestProbeResult = {
    provider: spec.id,
    baseUrl: spec.baseUrl,
    modelsTried: [...spec.models],
    modelsList: null,
    completion: null,
    error: null,
  };

  // Leg 1 — the models list.
  const modelsLeg = await fetchLeg(`${base}/models`, { method: 'GET', headers: authHeaders }, fetchImpl);
  const modelsParsed = modelsLeg.status >= 200 && modelsLeg.status < 300 ? parseModelIds(modelsLeg.bodyText) : { count: null, sample: [] };
  result.modelsList = {
    ok: modelsLeg.status >= 200 && modelsLeg.status < 300,
    status: modelsLeg.status,
    latencyMs: modelsLeg.latencyMs,
    modelCount: modelsParsed.count,
    sample: modelsParsed.sample,
  };
  if (!result.modelsList.ok) {
    result.error = legError(modelsLeg, secrets);
  }

  // Leg 2 — the 1-token completion, walking the spec's models in order
  // (a 404 "model not found" for model[0] tries model[1] — the chain's
  // own within-provider fallback, one round trip deeper at most).
  for (const model of spec.models) {
    const leg = await fetchLeg(
      `${base}/chat/completions`,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      },
      fetchImpl,
    );
    const ok = leg.status >= 200 && leg.status < 300;
    if (ok) {
      result.completion = {
        ok: true,
        status: leg.status,
        latencyMs: leg.latencyMs,
        model,
        replyChars: replyChars(leg.bodyText),
      };
      return result; // first success wins — done probing this provider
    }
    // 404/400 with "model" in the body = wrong model id → try the next.
    const wrongModel = (leg.status === 404 || leg.status === 400) && /model/i.test(leg.bodyText);
    result.completion = {
      ok: false,
      status: leg.status,
      latencyMs: leg.latencyMs,
      model,
      replyChars: null,
    };
    result.error = legError(leg, secrets);
    if (!wrongModel) return result; // a real refusal (401/403/429/5xx) — stop here
  }
  return result; // every model refused
}

/**
 * Run the full self-test against an env-shaped record (PURE except the
 * injected fetch + the wall clock). Mirrors getAiChain()'s parse via
 * parseAiChainEnv so the report reflects EXACTLY what production
 * resolved from the same env.
 */
export async function runAiSelftest(
  env: AiChainEnv,
  fetchImpl: SelftestFetch = (url, init) => fetch(url, init),
): Promise<SelftestReport> {
  const { chain, warnings } = parseAiChainEnv(env);
  const probes = await Promise.all(chain.providers.map((p) => probeProvider(p, fetchImpl)));
  const providerCount = chain.providers.length;
  return {
    ranAtIso: new Date().toISOString(),
    region: typeof env.VERCEL_REGION === 'string' && env.VERCEL_REGION !== '' ? env.VERCEL_REGION : null,
    aiMode: providerCount >= 2 ? 'chain' : providerCount === 1 ? 'single' : 'local',
    providerCount,
    totalBudgetMs: chain.totalBudgetMs,
    probes,
    configWarnings: warnings,
  };
}
