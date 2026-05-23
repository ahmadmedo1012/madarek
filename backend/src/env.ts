/**
 * Environment — only 3 things are required: DATABASE_URL and the two JWT secrets.
 * Everything else has a sane default derived from NODE_ENV.
 */
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const isProd = parsed.data.NODE_ENV === 'production';

export const env = {
  ...parsed.data,
  isProd,
  // In production we serve the built frontend from Express and require HTTPS cookies.
  serveStatic: isProd,
  cookieSecure: isProd,
  // CORS allow-list — production is same-origin so this is mostly for local Vite dev.
  corsOrigins: ['https://madarek.onrender.com', 'http://localhost:5173'],
  jwtAccessTtl: '15m' as const,
  jwtRefreshTtl: '7d' as const,
};

export type Env = typeof env;
