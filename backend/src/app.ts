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
import { compression } from './lib/compression.js';
import { buildIdFromEnv } from './lib/build-id.js';

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
import statusRoutes from './http/routes/status.routes.js';
import ownerRoutes from './http/routes/owner.routes.js';
import collegesRoutes from './http/routes/colleges.routes.js';
import institutionRoutes from './http/routes/institution.routes.js';
import adminExtrasRoutes from './http/routes/admin-extras.routes.js';
import studentDashboardRoutes from './http/routes/student-dashboard.routes.js';
import teacherDashboardRoutes from './http/routes/teacher-dashboard.routes.js';
// Mounted by the submissions workstream (WS-B1). The router handles
// POST /offerings/:offeringId/assignments/:assignmentId/submit and
// POST /submissions/:id/grade under the /api/v1 prefix.
import submissionsRoutes from './http/routes/submissions.routes.js';
// Mounted by the curriculum workstream (WS-B4). TEACHER-oriented
// authoring endpoints for lectures / chapters / checkpoints under the
// /api/v1 prefix.
import curriculumRoutes from './http/routes/curriculum.routes.js';
// r323 B2.4 — live sessions (Jitsi default): schedule → in-page join →
// auto-attendance → recording link. Mounted under /api/v1 (see below).
import liveRoutes from './http/routes/live.routes.js';
// r323 B3.1 — invite codes: teacher/registrar codes + the public
// pre-submit validation + the post-registration redeem.
import inviteRoutes from './http/routes/invite.routes.js';
import { themeRouter } from './modules/theme/router.js';
import { onboardingRouter } from './modules/onboarding/router.js';
import { milestonesRouter } from './modules/milestones/router.js';
import { AppError } from './lib/errors.js';

// Resolve frontend build path from this file's location.
// Works from both backend/src/app.ts (dev) and backend/dist/app.js (prod).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, '..', '..', 'frontend', 'dist');

/**
 * CSP (decision D7) — conservative allow-list. The deliberate additions
 * to D7's raw directive list are sha256 pins for the TWO inline script
 * blocks in frontend/index.html:
 *   1. the theme bootstrap (the attribute-less <script> block): without
 *      its pin, script-src 'self' blocks the pre-paint theme resolver
 *      and dark-theme users get a light flash on every load;
 *   2. the JSON-LD structured-data block
 *      (<script type="application/ld+json">): browsers enforce
 *      script-src on it too, so without a pin the site silently loses
 *      its schema.org metadata.
 * Each hash covers the exact text between the opening and closing tag
 * (leading/trailing whitespace included — that is how browsers compute
 * it). If either block is ever edited, recompute the hash the same way:
 *
 *   const html = fs.readFileSync('frontend/index.html', 'utf8');
 *   const start = html.indexOf('<script>') + '<script>'.length;
 *   const end = html.indexOf('</script>', start);
 *   crypto.createHash('sha256').update(html.slice(start, end)).digest('base64');
 *
 * Drift guard (R3-W2-5): `bash scripts/check-csp-hash.sh` recomputes
 * both hashes from frontend/index.html and fails when either pin below
 * stops matching — after editing an inline script, refresh these pins.
 */
/* r163 (D1): pin refreshed after the theme bootstrap's persisted-session
 * probe moved from sessionStorage to localStorage — the substrate the
 * auth store actually writes (r162 pinned the sessionId-read variant).
 * r172a: pin refreshed again — the r162 (R1) landing-boot heuristic
 * (data-landing-boot + the #252A3E theme-color override) was retired
 * end-to-end with the landing's two-theme re-grounding; the bootstrap
 * now resolves the theme and syncs theme-color only.
 * r197: pin refreshed — syncThemeColor paints the r197 grounds
 * (dark #16140F / light #F3EEE4, BLUEPRINT §4); the metas moved with it.
 * r305: pin refreshed — syncThemeColor paints the Heron foundation
 * grounds (dark #282828 / light #F6F8FA, r305-heron-reference-spec);
 * the metas moved with it. */
/* r309 (§4.2): pin refreshed — the bootstrap DEFAULT flipped 'dark' → 'light',
 * aligning with the theme store's actual default (r302): the stale 'dark'
 * default painted a first-visit dark blank viewport that flashed to light
 * once React mounted (the production audit's «initially dark blank interval»). */
/* R313: pin refreshed — syncThemeColor paints the FULL-parity grounds
 * (dark #282828 / light #F6F6EE — the warm vintage paper, owner
 * decision; audits/evidence/r313/reference/digest.json); the metas and
 * the boot plate moved with it. */
const THEME_BOOTSTRAP_SHA256 = 'jEZ9yPBzXBwMFxHwFlLFqiKKy+HtK9TOGA7FRviqIMc=';
/* r188: pin refreshed — the JSON-LD block now describes the INDEPENDENT
 * Madarek platform alone (WebSite node; the retired University-of-Zawia
 * `about` node is gone — the only demo-data story is the explicitly
 * fictional «جامعة مدارك التجريبية», named in the description as
 * synthetic data, never as affiliation). Verified by check-csp-hash.sh. */
// r191: pin refreshed — the JSON-LD description dropped the rejected
// provenance slogan with the meta copy fix.
const JSON_LD_SHA256 = 'IRTvs2lj91QMTupUETl0okZh8+Bgoccsoy/MNlneYDI=';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        // useDefaults: false → the policy below is the COMPLETE policy
        // (helmet's own defaults — upgrade-insecure-requests, form-action,
        // frame-ancestors, script-src-attr — are intentionally opted out
        // of so the emitted header matches D7 verbatim and stays
        // smoke-testable).
        useDefaults: false,
        directives: {
          'default-src': ["'self'"],
          'script-src': [
            "'self'",
            `'sha256-${THEME_BOOTSTRAP_SHA256}'`,
            `'sha256-${JSON_LD_SHA256}'`,
          ],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'"],
          'connect-src': ["'self'"],
          'worker-src': ["'self'", 'blob:'],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          /* r307: the landing's official-university documentaries embed
             via the privacy-enhanced youtube-nocookie mechanism, mounted
             ONLY after an explicit user click (the facade contract — see
             frontend/src/components/landing/VideoCard.tsx). frame-src
             admits exactly the two embed hosts; media-src stays unset
             (falls back to 'self' — all landing video bytes stay local
             until the visitor opts in), and img-src stays self-only: no
             third-party thumbnail hosts, posters are composed in CSS. */
          'frame-src': [
            "'self'",
            'https://www.youtube-nocookie.com',
            'https://www.youtube.com',
          ],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => {
        // Reject with cb(null, false) — passing an Error to cb makes the
        // cors middleware THROW, which the error handler turns into a 500
        // (leaky + noisy). cb(null, false) answers without CORS headers,
        // which the browser reports as a normal blocked cross-origin call.
        if (!origin || env.corsOrigins.includes(origin)) cb(null, true);
        else cb(null, false);
      },
      credentials: true,
    }),
  );
  // Response compression (D10) — mounted before every body-producing
  // middleware and route (static assets + API JSON). Applies
  // `Vary: Accept-Encoding` to all responses and gzips compressible
  // MIME types ≥ 1 KB; HEAD and already-encoded responses pass through.
  app.use(compression());

  // 1 MB request-body cap for JSON + urlencoded. Body-parser rejections
  // (entity.parse.failed / entity.too.large) are mapped to 400/413 by the
  // error handler (wave 12-5) — coordinate here if the limit ever changes.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // ── Health (no rate limit, no auth) ──────────────────────────
  // buildId is DERIVED from the platform's deployed-commit env var
  // (Render injects RENDER_GIT_COMMIT on every git-connected build) —
  // never a hand-bumped constant. Curl /api/v1/health and compare the
  // sha with `git rev-parse origin/main` to know exactly which commit
  // is serving. (r184: the old constant said 'r180-product-completion'
  // while production was actually serving r183 — a rot the derived id
  // makes structurally impossible. See lib/build-id.ts.)
  const BUILD_ID = buildIdFromEnv(env.RENDER_GIT_COMMIT ?? env.GIT_SHA);
  app.get('/api/v1/health', async (_req, res) => {
    const start = Date.now();
    // Race the DB ping against a 5s timeout so a sleepy Neon
    // (cold-start wake-up can take 2-4s) doesn't cause Render to
    // mark the service unhealthy and forcibly restart it. If the
    // DB doesn't respond within 5s we surface 503 — but Render's
    // healthcheck default is 60s with 5 retries, so a 5s blip is
    // absorbed without restart.
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('healthcheck timeout')), 5_000);
        }),
      ]);
      res.json({
        ok: true,
        dbLatencyMs: Date.now() - start,
        env: env.NODE_ENV,
        buildId: BUILD_ID,
      });
    } catch (err) {
      logger.error({ err, latencyMs: Date.now() - start }, 'Healthcheck DB failure');
      // Use the global error shape so clients can parse uniformly.
      // Render will retry before restarting the service.
      res.status(503).json({
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'Database unavailable',
          details: { latencyMs: Date.now() - start },
        },
      });
    } finally {
      // Clear the race timer whichever side won — otherwise every fast
      // healthcheck leaks a pending 5s timer (keeps the event loop hot
      // and skews any timer-based metrics).
      if (timer) clearTimeout(timer);
    }
  });

  // ── Global rate limit on the API surface ─────────────────
  app.use('/api/v1', globalRateLimiter);

  // r323 B5/B6 — the public status surface BEFORE the auth routers:
  // keep-warm pings and the pilot's «حالة المنصة» card must answer
  // regardless of rate-limit pressure on the API (it is a tiny,
  // secret-free SELECT 1 + mode names).
  app.use('/api/v1', statusRoutes);

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/courses', coursesRoutes);
  app.use('/api/v1/enrollments', enrollmentsRoutes);
  app.use('/api/v1/offerings', offeringsRoutes);
  // r323 B2.4 — live sessions: /live/sessions (list/create), lifecycle,
  // and the student join hook (auto-attendance).
  app.use('/api/v1', liveRoutes);
  // r323 B3.1 — invite codes.
  app.use('/api/v1', inviteRoutes);
  // ── PUBLIC routers — must be registered BEFORE any router that
  //    uses `router.use(authMiddleware)` and mounts at the broad
  //    `/api/v1` prefix. Otherwise their global middleware fires
  //    for /api/v1/colleges and 401s the request before reaching
  //    the (now-public) GET /colleges handler. ────────────────
  app.use('/api/v1', collegesRoutes);
  // r178 (multi-institution): public GET /institutions + the OWNER
  // institution console (/owner/institutions*). MUST sit BEFORE
  // catalogRoutes: catalog's router-level authMiddleware gate would
  // otherwise 401 anonymous /institutions requests that fall through
  // it (router.use fires for unmatched paths too — the same ordering
  // lesson as the public /faculties route above). Also registered
  // BEFORE ownerRoutes so the /owner/institutions* subpaths match
  // here first — ownerRoutes (at /api/v1/owner) declares no
  // /institutions children, so nothing collides (boot-verified). The
  // /owner/* paths carry their own requireRole(OWNER) gate.
  app.use('/api/v1', institutionRoutes);
  // r179d (phase-5): syncRoutes mounts here (before catalogRoutes) for
  // the same ordering reason as institutionRoutes: its GET
  // /university/facts is a PUBLIC route (the landing's facts feed),
  // and sync's own auth gate is PATH-SCOPED to /admin — so anonymous
  // requests for other routers' paths pass through untouched, while
  // any earlier broad-mount router-level gate (catalog's) would 401
  // anonymous /university/facts before syncRoutes ever runs. No
  // syncRoutes path collides with a colleges/institution/catalog path.
  app.use('/api/v1', syncRoutes);   // /admin/sync, /university/facts (public)
  // catalogRoutes mounts here (before meRoutes) for the same reason:
  // its GET /faculties is a PUBLIC route declared above the router's
  // own auth gate (audit 4-A13 P0-1 — the register funnel). Any
  // broad-mount authed router mounted earlier (meRoutes) would 401
  // anonymous /faculties requests before catalogRoutes ever runs.
  // Catalog's remaining routes sit below its internal gate, so their
  // auth semantics are unchanged by this position; no catalog path
  // collides with a meRoutes path.
  app.use('/api/v1', catalogRoutes);
  app.use('/api/v1', meRoutes);
  app.use('/api/v1', learningRoutes); // /lectures, /me/matrix, /me/gaps, /research, /quality
  app.use('/api/v1', trainingRoutes); // /training/* (catalog, lessons, badges, certificates, leaderboard)
  app.use('/api/v1', teacherRoutes);  // /teacher/* (offerings, students, risks, attendance, curriculum)
  app.use('/api/v1', examsRoutes);    // /exams/*, /question-bank/*
  app.use('/api/v1', socialRoutes);   // /announcements/*, /competitions/*, /events/*
  app.use('/api/v1', permissionsRoutes); // /me/permissions, /admin/users/*
  app.use('/api/v1', searchRoutes);   // /search/global
  app.use('/api/v1', teacherProfileRoutes); // /me/teacher-profile, /live/sessions/*
  app.use('/api/v1/ai', aiRoutes);
  app.use('/api/v1/files', filesRoutes);
  app.use('/api/v1/owner', ownerRoutes);
  app.use('/api/v1/admin', adminExtrasRoutes);
  app.use('/api/v1', studentDashboardRoutes);
  app.use('/api/v1/teacher', teacherDashboardRoutes);
  app.use('/api/v1', submissionsRoutes); // /offerings/:id/assignments/:id/submit, /submissions/:id/grade (WS-B1)
  app.use('/api/v1', curriculumRoutes); // /offerings/:id/lectures, /lectures/:id[/chapters|/checkpoints], /chapters/:id, /checkpoints/:id (WS-B4)
  app.use('/api/v1/me/theme', themeRouter);
  app.use('/api/v1/me/onboarding', onboardingRouter);
  app.use('/api/v1/me/milestones', milestonesRouter);

  // 404 for unknown API paths — ANY /api/* path that fell through the
  // routers (including /api/v2/… and /api/ghost) gets the standard JSON
  // error envelope, never Express's default HTML error page (11-a P2-12).
  app.use('/api', (_req, _res, next) => next(AppError.notFound('المسار المطلوب غير موجود')));

  // ── Static frontend + SPA fallback (single-service mode) ──
  if (env.serveStatic) {
    if (!existsSync(FRONTEND_DIST)) {
      logger.warn({ FRONTEND_DIST }, 'Frontend build missing — did you run `npm run build`?');
    } else {
      logger.info({ FRONTEND_DIST }, 'Serving frontend');
      // Cache policy (11-a P1-1 / 11-g P0-1):
      //  (1) /assets/** — Vite content-hashes these filenames, so a
      //      content change always means a new URL → safe for the
      //      full year-long immutable treatment.
      app.use(
        '/assets',
        express.static(path.join(FRONTEND_DIST, 'assets'), {
          index: false,
          maxAge: '1y',
          immutable: true,
        }),
      );
      //  (2) Everything else in dist/ is NOT hashed (fonts, pdfjs cmaps
      //      + standard fonts, brand imagery, favicon, hero photo).
      //      `immutable, 1y` here would hide any update from returning
      //      visitors for up to a year — serve with ETag revalidation
      //      and a short max-age so changes reach users within an hour.
      //      setHeaders runs after send()'s own defaults, so these
      //      values are final.
      app.use(
        express.static(FRONTEND_DIST, {
          index: false,
          etag: true,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('index.html')) {
              // The SPA entry document must always revalidate: it
              // references hashed chunks that are DELETED on every
              // deploy — a stale copy renders a white screen.
              res.setHeader('Cache-Control', 'no-cache');
            } else {
              res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
            }
          },
        }),
      );
      //  (3) SPA fallback — the canonical entry (GET / and every client
      //      route) must never be served stale after a deploy. send()
      //      only writes Cache-Control when none is set, so the explicit
      //      header below survives sendFile. `no-cache` (revalidate,
      //      ETag 304 on no-change) beats `no-store` because unchanged
      //      deploys cost a 304 instead of a full document refetch.
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
      });
    }
  }

  app.use(errorHandler);
  return app;
}
