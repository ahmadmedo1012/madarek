import { Router } from 'express';
import { env } from '../../env.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import {
  forgotPasswordEmailRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  changePasswordRateLimiter,
  authRateLimiter,
} from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  selectInstitutionSchema,
} from '../../modules/auth/auth.dto.js';
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
  selectInstitution,
} from '../../modules/auth/auth.service.js';
import { requestPasswordReset, resetPassword, TOKEN_TTL_MS } from '../../modules/auth/password-reset.service.js';
import { isTestAccountEmail } from '../../modules/auth/test-accounts.data.js';
import { mailConfig, renderResetEmail, sendMail } from '../../lib/mail.js';
import { parseDurationMs, verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';

/** The reset email's stated lifetime in minutes (mirrors TOKEN_TTL_MS). */
const MAIL_TTL_MINUTES = Math.round(TOKEN_TTL_MS / 60_000);

const router = Router();
const REFRESH_COOKIE = 'mdrk_refresh';

// Derived from the SAME string jsonwebtoken signs the refresh token with
// (env.jwtRefreshTtl) — the cookie must die with its token, not before
// (stranded valid tokens) or after (client keeps shipping dead tokens).
// Previously a second, hardcoded 7d copy lived here (audit 11-a P2-10).
const REFRESH_COOKIE_MAX_AGE_MS = parseDurationMs(env.jwtRefreshTtl);

const setRefreshCookie = (res: import('express').Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
};

router.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {

    // IP + UA feed the LoginEvent telemetry rows (/owner/login-analytics).
    // institutionSlug (optional) disambiguates reg-numbers registered in
    // several institutions (r178).
    const { user, accessToken, refreshToken } = await loginUser(
      req.body.email,
      req.body.password,
      { ip: req.ip, userAgent: req.header('user-agent') },
      req.body.institutionSlug,
    );

    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

/**
 * r178: pick the institution context for the session (multi-membership
 * users). Verifies an ACTIVE membership in an ACTIVE institution
 * server-side, then mints fresh tokens carrying the `inst` claim + the
 * full user payload (same shape as login). Same refresh version —
 * selecting an institution is not a revocation event (D3 untouched).
 */
router.post(
  '/select-institution',
  authMiddleware,
  authRateLimiter,
  validate(selectInstitutionSchema),
  async (req, res, next) => {
    try {
      const { user, accessToken, refreshToken } = await selectInstitution(
        req.user!.id,
        req.body.institutionId,
      );
      setRefreshCookie(res, refreshToken);
      res.json({ data: { user, accessToken } });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * Password change for the authenticated user.
 *
 * - argon2-verifies the CURRENT password first (never trust a live
 *   session alone — shared machines),
 * - enforces the shared password policy (same schema as register),
 * - updates the hash and bumps tokenVersion in ONE atomic conditional
 *   write (D3 revocation event): every OTHER device's refresh cookie
 *   dies, while this device seamlessly continues on the fresh tokens
 *   issued below (cookie rotated + new access token returned).
 *
 * Brute-force guard (r170c): changePasswordRateLimiter — 10 FAILED
 * attempts / 15 min keyed per USER (authMiddleware runs first, so the
 * key is the token identity). It replaces the IP-keyed authRateLimiter
 * here: this route's brute-force scenario is a stolen access token
 * guessing the current password, and a per-IP cap is the weaker bound
 * (fan-out / shared edge IPs) — see middleware/rateLimit.ts. The login
 * lockout counters intentionally stay untouched (auth.service.ts).
 */
router.post(
  '/change-password',
  authMiddleware,
  changePasswordRateLimiter,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { user, accessToken, refreshToken } = await changePassword(
        req.user!.id,
        req.body.currentPassword,
        req.body.newPassword,
      );
      setRefreshCookie(res, refreshToken);
      res.json({ data: { user, accessToken } });
    } catch (e) {
      next(e);
    }
  },
);

// Refresh gets the same strict limiter as login/register (audit 11-c
// P2-4): legitimate clients refresh at most once per access-TTL per
// device and successful refreshes are skipped by the limiter, so only
// replay/brute-force attempts against the cookie are ever counted.
router.post('/refresh', authRateLimiter, async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] ?? '';
    if (!token) throw AppError.unauthenticated('جلسة غير صالحة — سجّل الدخول من جديد');
    const { user, accessToken, refreshToken } = await refreshTokens(token);
    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

/**
 * Logout must work with EITHER credential:
 *  - a valid access token (normal case), or
 *  - just the refresh cookie (access token expired — the exact moment a
 *    user is most likely to click "logout"). The old hard authMiddleware
 *    401'd them and left the refresh cookie live for up to 7 more days.
 *
 * We clear the cookie unconditionally and revoke the refresh token
 * whenever it is parseable; unparseable tokens are ignored (the cookie
 * is being cleared anyway).
 */
router.post('/logout', optionalAuthMiddleware, async (req, res, _next) => {
  // Revoke via access-token identity if present...
  if (req.user) {
    try {
      await logoutUser(req.user.id);
    } catch {
      // Revoke is best-effort — the cookie clear below is the guarantee.
    }
  } else {
    // ...otherwise try to revoke via the refresh cookie.
    const token = req.cookies?.[REFRESH_COOKIE] ?? '';
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await logoutUser(payload.sub);
      } catch {
        // Expired / tampered / rotated refresh token — nothing to revoke.
      }
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).end();
});

/**
 * R320 §D (PAGES-GAP §5) — step 1 of the forgot-password flow.
 *
 * NO USER ENUMERATION: the 200 envelope is byte-identical whether the
 * email is registered or not (the service burns equal crypto + a
 * same-shape DB visit on the unknown path; the generic Arabic copy
 * never wavers). The dev-inbox link below is the ONE deliberate,
 * documented exception-shape — and it can only ever confirm what the
 * login panel already publishes.
 *
 * Delivery reality (verified: zero mail-provider code/dependencies in
 * the repo — see LEGAL-TODO.md rows 7/8): NO email is sent, by anyone,
 * today. Rather than pretend otherwise:
 *  - @test.ly addresses (the BOARD §C documented demo accounts,
 *    test-accounts.data.ts — their emails are ALREADY public in the
 *    login panel's demo list) AND ONLY when the account actually
 *    exists: the response carries `devInbox: { mode: 'test', url }` —
 *    the reset link itself, honestly labelled as test-mode. The @test.ly
 *    gate means this can never leak a real user's reset link; the
 *    exists-gate means an unknown @test.ly address answers link-less,
 *    same as every unknown address.
 *  - every other domain (known or unknown): generic 200, event logged
 *    server-side, and the PAGE copy states plainly that email delivery
 *    is not configured yet ([يُستكمل قبل الإطلاق] — LEGAL-TODO rows
 *    7/8). No code path silently fakes a send.
 *
 * Limiter stack: forgotPasswordRateLimiter (10/15min per IP, counts
 * EVERY request — the endpoint has no failure signal to skip on) THEN
 * forgotPasswordEmailRateLimiter (3/15min per submitted email — bounds
 * inbox-flooding per address across all source IPs).
 */
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  forgotPasswordEmailRateLimiter,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const email = req.body.email as string;
      const token = await requestPasswordReset(email);

      const data: { message: string; devInbox?: { mode: 'test'; url: string } } = {
        message: 'إذا كان البريد مسجلًا فستصلك رسالة خلال دقائق',
      };
      if (token && isTestAccountEmail(email)) {
        // Test-mode link — @test.ly demo accounts only (reasoning in the
        // route docblock above). Origin comes from the requesting web
        // app itself (the browser always sends Origin on cross-origin
        // POSTs — dev Vite → API), validated to http(s) shape so a
        // garbage header can never reach the URL; the default is the
        // Vite dev port for direct curl-style callers.
        const rawOrigin =
          typeof req.headers.origin === 'string' && /^https?:\/\/[^/]+/.test(req.headers.origin)
            ? req.headers.origin
            : 'http://localhost:5173';
        const origin = rawOrigin.replace(/\/+$/, '');
        data.devInbox = {
          mode: 'test',
          url: `${origin}/auth/reset-password?token=${encodeURIComponent(token)}`,
        };
      }
      /* r323 B3.2 — the REAL delivery path: when a mail provider is
       * configured (MAIL_PROVIDER=resend|brevo + MAIL_API_KEY), the
       * token emails to ANY registered address through the brand RTL
       * template. none-mode (the default) stays exactly as documented
       * above — a provider refusal lands in the server log and the
       * response stays the SAME generic 200 (never a leaky error). */
      if (token !== null && mailConfig.provider !== 'none') {
        const rawOrigin =
          typeof req.headers.origin === 'string' && /^https?:\/\/[^/]+/.test(req.headers.origin)
            ? req.headers.origin
            : (env.APP_ORIGIN ?? 'http://localhost:5173');
        const resetUrl = `${rawOrigin.replace(/\/+$/, '')}/auth/reset-password?token=${encodeURIComponent(token)}`;
        const mail = renderResetEmail(resetUrl, MAIL_TTL_MINUTES);
        const sent = await sendMail(mailConfig, { to: email, ...mail });
        if (!sent) logger.warn({ email }, 'forgot-password: mail send failed — generic response kept');
      }
      res.json({ data });
    } catch (e) {
      next(e);
    }
  },
);

/**
 * R320 §D (PAGES-GAP §5) — step 2: consume the token, set the new
 * password. Unknown / expired / used tokens all answer the SAME generic
 * Arabic refusal (no token-oracle — an attacker cannot distinguish a
 * once-valid-now-spent link from a never-existed one), and the service
 * does the rest atomically (single-use CAS claim, real password policy,
 * argon2 + tokenVersion bump + lockout counters in ONE conditional
 * write — see password-reset.service.ts). failed-only per-IP limiter:
 * the brute-force shape here is token guessing, so misses count and a
 * successful reset is free.
 */
router.post(
  '/reset-password',
  resetPasswordRateLimiter,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      await resetPassword(req.body.token, req.body.password);
      res.json({ data: { ok: true } });
    } catch (e) {
      next(e);
    }
  },
);

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    // r178: /me resolves the membership context for the token's `inst`
    // claim (null = no context yet — client must select-institution).
    const user = await getCurrentUser(req.user!.id, req.user!.institutionId);
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
