/**
 * Environment configuration — validated at boot.
 * If any required variable is missing or malformed, the process exits
 * before the HTTP server starts. This guarantees a known-good config.
 */
import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  // If your provider differentiates pooled vs direct connections (e.g. Neon),
  // set DIRECT_DATABASE_URL to the *direct* URL for migrations.
  // If absent, Prisma falls back to DATABASE_URL.
  DIRECT_DATABASE_URL: z.string().url().optional(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // Comma-separated list of origins allowed to call the API.
  // In single-service mode the frontend is same-origin, so this is mainly
  // a safety net for local Vite dev (5173) and any future external clients.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  COOKIE_DOMAIN: z.string().optional(),
  // Defaults: false in dev, true in production (requires HTTPS).
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((s) => (s === undefined ? undefined : s === 'true')),

  // Serve the built frontend (frontend/dist) from Express.
  // Defaults: true in production, false in dev (Vite serves it).
  SERVE_STATIC: z
    .string()
    .optional()
    .transform((s) => (s === undefined ? undefined : s === 'true')),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const isProd = parsed.data.NODE_ENV === 'production';

export const env = {
  ...parsed.data,
  COOKIE_SECURE: parsed.data.COOKIE_SECURE ?? isProd,
  SERVE_STATIC: parsed.data.SERVE_STATIC ?? isProd,
};
export type Env = typeof env;
