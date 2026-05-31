import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from './env.js';
import { logger } from './logger.js';
import { prisma } from './db.js';

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
import learningRoutes from './http/routes/learning.routes.js';
import trainingRoutes from './http/routes/training.routes.js';
import teacherRoutes from './http/routes/teacher.routes.js';
import examsRoutes from './http/routes/exams.routes.js';
import socialRoutes from './http/routes/social.routes.js';
import permissionsRoutes from './http/routes/permissions.routes.js';
import searchRoutes from './http/routes/search.routes.js';
import syncRoutes from './http/routes/sync.routes.js';
import teacherProfileRoutes from './http/routes/teacher-profile.routes.js';
import filesRoutes from './http/routes/files.routes.js';
import ownerRoutes from './http/routes/owner.routes.js';
import collegesRoutes from './http/routes/colleges.routes.js';
import adminExtrasRoutes from './http/routes/admin-extras.routes.js';
import studentDashboardRoutes from './http/routes/student-dashboard.routes.js';
import teacherDashboardRoutes from './http/routes/teacher-dashboard.routes.js';
import { AppError } from './lib/errors.js';

// Resolve frontend build path from this file's location.
// Works from both backend/src/app.ts (dev) and backend/dist/app.js (prod).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin)) cb(null, true);
        else cb(new Error(`Origin ${origin} not allowed`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ── Health (no rate limit, no auth) ──────────────────────
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

  // ── Global rate limit on the API surface ─────────────────
  app.use('/api/v1', globalRateLimiter);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/courses', coursesRoutes);
  app.use('/api/v1/enrollments', enrollmentsRoutes);
  app.use('/api/v1/offerings', offeringsRoutes);
  app.use('/api/v1', meRoutes);
  app.use('/api/v1', catalogRoutes);
  app.use('/api/v1', learningRoutes); // /lectures, /me/matrix, /me/gaps, /research, /quality
  app.use('/api/v1', trainingRoutes); // /training/* (catalog, lessons, badges, certificates, leaderboard)
  app.use('/api/v1', teacherRoutes);  // /teacher/* (offerings, students, risks, attendance, curriculum)
  app.use('/api/v1', examsRoutes);    // /exams/*, /question-bank/*
  app.use('/api/v1', socialRoutes);   // /announcements/*, /competitions/*, /events/*
  app.use('/api/v1', permissionsRoutes); // /me/permissions, /admin/users/*
  app.use('/api/v1', searchRoutes);   // /search/global
  app.use('/api/v1', syncRoutes);     // /admin/sync, /university/facts
  app.use('/api/v1', teacherProfileRoutes); // /me/teacher-profile, /live/sessions/*
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/files', filesRoutes);
  app.use('/api/v1', ownerRoutes);
  app.use('/api/v1', collegesRoutes);
  app.use('/api/v1', adminExtrasRoutes);
  app.use('/api/v1', studentDashboardRoutes);
  app.use('/api/v1', teacherDashboardRoutes);

  // 404 for unknown API paths
  app.use('/api/v1', (_req, _res, next) => next(AppError.notFound('Route not found')));

  // ── Static frontend + SPA fallback (single-service mode) ──
  if (env.serveStatic) {
    if (!existsSync(FRONTEND_DIST)) {
      logger.warn({ FRONTEND_DIST }, 'Frontend build missing — did you run `npm run build`?');
    } else {
      logger.info({ FRONTEND_DIST }, 'Serving frontend');
      app.use(
        express.static(FRONTEND_DIST, {
          index: false,
          maxAge: '1y',
          immutable: true,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
          },
        }),
      );
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
      });
    }
  }

  app.use(errorHandler);
  return app;
}
