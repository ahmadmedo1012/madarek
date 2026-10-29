/**
 * Environment — only 3 things are required: DATABASE_URL and the two JWT secrets.
 * Everything else has a sane default derived from NODE_ENV.
 *
 * Test mode: unit tests that only exercise pure schema/pattern exports
 * transitively pull `env.ts` via the module graph. We don't want those
 * tests to call `process.exit(1)` for missing secrets they don't use,
 * so in NODE_ENV=test we fall back to deterministic placeholder secrets.
 * (Integration tests that actually hit the DB must still set real env vars.)
 */
import 'dotenv/config';
import { z } from 'zod';

// Test mode is decided BEFORE the schema so the storage superRefine
// below can honor the same placeholder-secret pattern (s3 vars are
// optional in tests; a real boot with STORAGE_DRIVER=s3 fails closed).
const isTest = process.env.NODE_ENV === 'test';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
    // Optional: service-to-service token for internal endpoints
    // (012-design-graphics-uplift). When unset, every gated endpoint
    // refuses every request — fail-closed by default.
    INTERNAL_SERVICE_TOKEN: z.string().min(16).optional(),
    // Optional comma-separated CORS origin allow-list, e.g.
    // CORS_ORIGINS="https://madarek.onrender.com,https://staging.example.com".
    // Unset (or empty after trimming) → DEFAULT_CORS_ORIGINS below.
    // Wildcards are NOT supported on purpose: credentials are enabled,
    // so reflecting arbitrary origins would be a CSRF/CORS hole.
    CORS_ORIGINS: z.string().optional(),
    // ── Deployment identity (r184) ── Render injects the deployed
    // commit SHA as RENDER_GIT_COMMIT on every git-connected build;
    // GIT_SHA is the generic escape hatch for other providers. Both
    // optional: local dev simply reports 'local-dev' from
    // lib/build-id.ts — the health buildId is DERIVED, never a
    // hand-bumped constant that can silently rot (see the r184 note
    // in that file: production served r183 code while still reporting
    // an r180 buildId).
    RENDER_GIT_COMMIT: z.string().optional(),
    GIT_SHA: z.string().optional(),
    // ── File storage (uploads: backend/src/lib/storage.ts) ── All
    // optional individually; selecting s3 without its credentials
    // fails boot in the superRefine below (fail-closed). 'postgres'
    // (r175) stores uploaded PDFs as BYTEA rows in the application's
    // own PostgreSQL — the durable pilot choice for Render Free (no
    // persistent disks on that plan, no new infrastructure); it needs
    // NO extra vars (DATABASE_URL is already required).
    STORAGE_DRIVER: z.enum(['local', 's3', 'postgres']).default('local'),
    // Optional absolute override for the local driver root (defaults to
    // <backend>/storage — see storage.ts). Ignored when driver=s3.
    STORAGE_DIR: z.string().optional(),
    // S3-compatible endpoint (AWS S3, Cloudflare R2, MinIO), e.g.
    // https://<ACCOUNT_ID>.r2.cloudflarestorage.com — path-style addressing.
    S3_ENDPOINT: z.string().url().optional(),
    // 'auto' is the R2 convention and works on plain S3 too.
    S3_REGION: z.string().default('auto'),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    // ── Transactional mail (backend/src/lib/mail.ts) ── 'none' is the
    // honest default: sendMail logs and drops, every caller decides what
    // that means for ITS surface. Selecting resend/brevo without the
    // key (or from-address) fails boot in the superRefine below — the
    // same fail-closed ruling as STORAGE_DRIVER=s3.
    MAIL_PROVIDER: z.enum(['none', 'resend', 'brevo']).default('none'),
    MAIL_API_KEY: z.string().min(1).optional(),
    MAIL_FROM: z.string().min(3).optional(),
    // The app origin for email footer links (optional — templates omit
    // the footer link when unset).
    APP_ORIGIN: z.string().url().optional(),
    // ── AI provider (chat assistant: backend/src/lib/ai.ts) ── The
    // default 'local' mode composes replies in-process (zero cost,
    // zero external calls). Selecting 'openai' opts into a real
    // OpenAI-compatible LLM (OpenAI, Groq, OpenRouter, DeepSeek,
    // vLLM, Ollama…) — and fails closed without its key+model below.
    AI_PROVIDER: z.enum(['local', 'openai']).default('local'),
    // OpenAI-compatible base URL. Keep the /v1 (or provider
    // equivalent) suffix — the client appends /chat/completions.
    AI_BASE_URL: z.string().url().optional(),
    AI_API_KEY: z.string().min(1).optional(),
    AI_MODEL: z.string().min(1).optional(),
    // r176a: round-trip ceiling for one provider chat request (ms).
    // Optional — the default (45s, lib/ai.ts AI_TIMEOUT_MS) matches the
    // measured free-router behavior; the knob exists because free-model
    // latency varies by the routed model, and tuning it should not need
    // a code deploy. Bounds keep a typo from disabling the ceiling
    // entirely or pinning the route for minutes.
    AI_TIMEOUT_MS: z.coerce.number().int().min(5_000).max(90_000).optional(),
    // r176i (evidence-based routing): an optional ORDERED list of
    // OpenRouter free-model ids. The bare `openrouter/free` router
    // randomly lands on non-chat models (measured twice live: the
    // nemotron-3.5-content-safety CLASSIFIER answered «User Safety:
    // safe» as a chat reply). When set, the provider sends OpenRouter's
    // `models` array instead of the router id — routing stays strictly
    // within the listed FREE models in priority order. Live-measured
    // contract (2026-10-16, direct 400 probe): the array must hold
    // ≤3 ids — the bounds pin exactly that. Unset = the current
    // openrouter/free behavior (zero change). Each id ≤120 chars (a
    // fat-fingered paste must not become a request-body bomb).
    // r323 B2.3 — the speech-to-text provider (OpenAI-compatible
    // /audio/transcriptions: Groq Whisper, OpenAI, local Whisper servers).
    // Absent → the generation UI refuses with the honest Arabic message
    // and the manual SRT/VTT upload path remains.
    STT_API_URL: z.string().trim().url().optional(),
    STT_API_KEY: z.string().trim().min(1).optional(),
    STT_MODEL: z.string().trim().min(1).max(120).optional(),
    AI_MODELS: z
      .string()
      .trim()
      .max(400)
      .refine((v) => v.split(',').every((m) => m.trim().length > 0 && m.trim().length <= 120), {
        message: 'AI_MODELS must be a comma-separated list of model ids (≤3 entries, ≤120 chars each)',
      })
      .refine((v) => v.split(',').length <= 3, {
        message: 'AI_MODELS must list at most 3 models (OpenRouter live contract: the models array must have 3 items or fewer)',
      })
      .optional(),
  })
  .superRefine((cfg, ctx) => {
    // Fail-closed: a half-configured s3 driver must stop boot with a
    // message naming exactly which vars are missing. Test mode keeps the
    // placeholder-secret pattern and skips the check (vars stay optional
    // there — unit tests exercise buildDriver directly instead).
    if (cfg.STORAGE_DRIVER !== 's3' || isTest) return;
    const missing: string[] = [];
    if (!cfg.S3_ENDPOINT) missing.push('S3_ENDPOINT');
    if (!cfg.S3_BUCKET) missing.push('S3_BUCKET');
    if (!cfg.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
    if (!cfg.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `STORAGE_DRIVER=s3 requires: ${missing.join(', ')}`,
      });
    }
    // Same ruling for the AI provider: openai mode without key+model
    // would silently degrade to the local composer at request time
    // (getAiProvider's defensive branch) — the owner asked for a real
    // model, so boot must say what's missing instead.
    if (cfg.AI_PROVIDER === 'openai' && !isTest) {
      const aiMissing: string[] = [];
      if (!cfg.AI_API_KEY) aiMissing.push('AI_API_KEY');
      if (!cfg.AI_MODEL) aiMissing.push('AI_MODEL');
      if (aiMissing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `AI_PROVIDER=openai requires: ${aiMissing.join(', ')}`,
        });
      }
    }
    // Same ruling for mail: a selected provider without its credentials
    // would silently degrade to drop-everything at send time — boot
    // must name the missing vars instead (r323 B3.2).
    if (cfg.MAIL_PROVIDER !== 'none' && !isTest) {
      const mailMissing: string[] = [];
      if (!cfg.MAIL_API_KEY) mailMissing.push('MAIL_API_KEY');
      if (!cfg.MAIL_FROM) mailMissing.push('MAIL_FROM');
      if (mailMissing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `MAIL_PROVIDER=${cfg.MAIL_PROVIDER} requires: ${mailMissing.join(', ')}`,
        });
      }
    }
  });

// In test mode, supply deterministic placeholder secrets so importing
// `env.ts` from a unit test doesn't crash the runner.
const envInput: Record<string, string | undefined> = { ...process.env };
if (isTest) {
  if (!envInput.DATABASE_URL || !z.string().url().safeParse(envInput.DATABASE_URL).success) {
    envInput.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  }
  if (!envInput.JWT_ACCESS_SECRET || envInput.JWT_ACCESS_SECRET.length < 32) {
    envInput.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-min-padding';
  }
  if (!envInput.JWT_REFRESH_SECRET || envInput.JWT_REFRESH_SECRET.length < 32) {
    envInput.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-min-padding';
  }
}

const parsed = schema.safeParse(envInput);
if (!parsed.success) {
  // flatten() carries BOTH per-field errors and the superRefine form
  // errors (the storage fail-closed message lives in formErrors).
  console.error('❌ Invalid environment:', parsed.error.flatten());
  process.exit(1);
}

const isProd = parsed.data.NODE_ENV === 'production';

/** CORS allow-list fallback — production is same-origin, so this mostly serves local Vite dev. */
const DEFAULT_CORS_ORIGINS = ['https://madarek.onrender.com', 'http://localhost:5173'];

/**
 * Parse CORS_ORIGINS (comma-separated) into a normalized allow-list.
 * Trailing slashes are stripped because the Origin header never has
 * one ("https://x.com/" would silently never match "https://x.com").
 */
function parseCorsOrigins(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_CORS_ORIGINS;
  const origins = raw
    .split(',')
    .map((entry) => entry.trim().replace(/\/+$/, ''))
    .filter((entry) => entry.length > 0);
  return origins.length > 0 ? origins : DEFAULT_CORS_ORIGINS;
}

export const env = {
  ...parsed.data,
  isProd,
  // In production we serve the built frontend from Express and require HTTPS cookies.
  serveStatic: isProd,
  cookieSecure: isProd,
  // CORS allow-list — env-driven (CORS_ORIGINS), hardcoded default kept
  // for backward compatibility (11-a P2-11).
  corsOrigins: parseCorsOrigins(parsed.data.CORS_ORIGINS),
  jwtAccessTtl: '15m' as const,
  jwtRefreshTtl: '7d' as const,
};
