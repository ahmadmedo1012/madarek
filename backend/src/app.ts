import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

import { requestIdMiddleware } from './http/middleware/requestId.js';
import { errorHandler } from './http/middleware/errorHandler.js';
import { globalRateLimiter } from './http/middleware/rateLimit.js';

import authRoutes from './http/routes/auth.routes.js';
import usersRoutes from './http/routes/users.routes.js';
import coursesRoutes from './http/routes/courses.routes.js';
import enrollmentsRoutes from './http/routes/enrollments.routes.js';
import offeringsRoutes from './http/routes/offerings.routes.js';
import meRoutes from './http/routes/me.routes.js';
import catalogRoutes from './http/routes/catalog.routes.js';
import aiRoutes from './http/routes/ai.routes.js';
import { AppError } from './lib/errors.js';

// Resolve the frontend build path relative to this file.
// Works for both:
//   • dev (tsx)   → backend/src/app.ts → ../../frontend/dist
//   • build (tsc) → backend/dist/app.js → ../../frontend/dist
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render runs behind a proxy

  // ── Security headers ──────────────────────────────────────────
  app.use(
    helmet({
      // CSP is intentionally disabled here; the frontend's index.html sets
      // its own CSP via meta tags if needed. Helmet's defaults break the
      // Vite-built bundle because of inline runtime modulepreload directives.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // CORS still applied — needed for local Vite dev (different port) and
  // any external API consumers. Same-origin production requests pass without
  // preflights so this is essentially a no-op there.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true);
        else callback(new Error(`Origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);

  app.use(
    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.info(msg.trim()) },
      skip: (req) => req.path === '/api/v1/health',
    }),
  );

  // ── Health check (no rate limit, no auth) ────────────────────
  app.get('/api/v1/health', async (_req, res) => {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, dbLatencyMs: Date.now() - start, env: env.NODE_ENV });
    } catch (err) {
      logger.error({ err }, 'Healthcheck DB failure');
      res.status(503).json({ ok: false, error: 'db_unavailable' });
    }
  });

  // ── Global rate limit on the API surface ─────────────────────
  app.use('/api/v1', globalRateLimiter);

  // ── API v1 routes ────────────────────────────────────────────
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/courses', coursesRoutes);
  app.use('/api/v1/enrollments', enrollmentsRoutes);
  app.use('/api/v1/offerings', offeringsRoutes);
  app.use('/api/v1', meRoutes); // mounts /me/* and /messages
  app.use('/api/v1', catalogRoutes); // library/mooc/jobs/posts/skills/...
  app.use('/api/v1/ai', aiRoutes);

  // 404 for unknown API routes
  app.use('/api/v1', (_req, _res, next) => next(AppError.notFound('Route not found')));

  // ── Static frontend + SPA fallback ───────────────────────────
  // In production (or when SERVE_STATIC=true) we serve the React build
  // alongside the API from the same Express instance. This is the
  // single-Render-service deployment model.
  if (env.SERVE_STATIC) {
    if (!existsSync(FRONTEND_DIST)) {
      logger.warn(
        { FRONTEND_DIST },
        'SERVE_STATIC=true but frontend build folder is missing — did you run `npm run build:frontend`?',
      );
    } else {
      logger.info({ FRONTEND_DIST }, 'Serving frontend static build');

      // Hashed assets get long-cache; index.html stays no-cache so updates
      // ship immediately on next request.
      app.use(
        express.static(FRONTEND_DIST, {
          index: false,
          maxAge: '1y',
          immutable: true,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
              res.setHeader('Cache-Control', 'no-cache');
            }
          },
        }),
      );

      // SPA fallback — anything that isn't /api/* and isn't a real file
      // returns index.html so React Router takes over.
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
      });
    }
  }

  // Final error handler (must be last)
  app.use(errorHandler);

  return app;
}
