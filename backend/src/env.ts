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

const schema = z.object({
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
});

const isTest = process.env.NODE_ENV === 'test';

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
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
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
