import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../../logger.js';
import { prisma } from '../../db.js';
import { AppError, type ErrorCode } from '../../lib/errors.js';
import { raiseOperationalAlert } from '../../lib/operational-alerts.js';

/**
 * Final error middleware. Order matters: register LAST.
 * Maps known errors to HTTP codes; everything else is a 500 with no leak.
 *
 * 5xx paths additionally raise an OperationalAlert (best-effort,
 * throttled per code) so the OWNER System/Alerts telemetry pages have
 * a live feed instead of a permanently empty table. 4xx client errors
 * (validation, body-parser rejects, Prisma constraint hits) NEVER
 * write alert rows — the feed must reflect server faults, not client
 * noise any user can mint at will.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Headers already flushed (e.g. a response stream crashed mid-write):
  // a JSON error status can no longer be sent — writing one would throw
  // into Express's default handler. Delegate instead; it logs the error
  // and destroys the socket.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err }, 'Unhandled AppError');
      void raiseOperationalAlert(prisma, {
        severity: 'error',
        code: `APP_${err.code}`,
        message: err.message,
      });
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }
  if (err instanceof ZodError) {
    // D17-3: envelope message Arabic; the zod issue details (field errors)
    // stay English — they are dev-internals the FE guard keeps out of the UI.
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'تحقّق من البيانات المُدخلة', details: err.flatten() },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        // target stays a raw Prisma field name (dev-internals, D17-3).
        error: { code: 'CONFLICT', message: 'هذه القيمة مستخدمة مسبقاً', details: { target: err.meta?.target } },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'العنصر المطلوب غير موجود' } });
      return;
    }
    // P2003 = foreign-key constraint violation. A missing related row is a
    // client-input problem (e.g. posting a message to a deleted user),
    // not a server fault — surface 400 naming the offending relation
    // instead of an opaque 500.
    if (err.code === 'P2003') {
      const field = Array.isArray(err.meta?.field_name)
        ? (err.meta?.field_name as string[]).join('.')
        : (err.meta?.field_name as string | undefined);
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'العنصر المرتبط غير موجود',
          details: { target: field ?? err.meta?.field_name },
        },
      });
      return;
    }
  }
  // Middleware-generated client rejects (body-parser & http-errors).
  // express.json() / express.urlencoded() fail malformed or oversized
  // bodies by next()ing http-errors objects — a numeric `status` plus
  // a machine `type` ('entity.parse.failed' → 400 for broken JSON,
  // 'entity.too.large' → 413 past the configured body limit). Before
  // this branch they fell through to the catch-all, so any client
  // could mint 500 responses AND fake HTTP_500 alert rows just by
  // posting `{`. Client faults get their own status back in OUR
  // envelope — never the error's own message, which embeds request
  // bytes — and never a telemetry row.
  const rejectStatus = clientRejectStatus(err);
  if (rejectStatus !== undefined) {
    const envelope = CLIENT_REJECT_ENVELOPE[rejectStatus] ?? GENERIC_CLIENT_REJECT;
    res.status(rejectStatus).json({ error: envelope });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  // Unhandled error → 500 → also feed the OWNER operational alert board.
  void raiseOperationalAlert(prisma, {
    severity: 'error',
    code: 'HTTP_500',
    message: 'Unhandled server error — check backend logs for the stack trace',
  });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'حدث خطأ غير متوقع — حاول مرة أخرى' } });
};

// ── Client-reject mapping (body-parser / http-errors) ─────────────

/**
 * Envelope text for middleware-generated 4xx rejects, keyed by status.
 * Body-parser produces 400 (parse / abort / size), 413 (too large, too
 * many urlencoded parameters) and 415 (charset / content-encoding);
 * the remaining entries keep any other http-errors-shaped 4xx honest.
 * Messages are Arabic per D17-3; codes stay UPPER_SNAKE English.
 */
const CLIENT_REJECT_ENVELOPE: Readonly<Record<number, { code: ErrorCode; message: string }>> = {
  400: { code: 'BAD_REQUEST', message: 'صيغة الطلب غير صالحة' },
  401: { code: 'UNAUTHENTICATED', message: 'يلزم تسجيل الدخول للمتابعة' },
  403: { code: 'FORBIDDEN', message: 'لا تملك صلاحية تنفيذ هذا الإجراء' },
  404: { code: 'NOT_FOUND', message: 'العنصر المطلوب غير موجود' },
  409: { code: 'CONFLICT', message: 'تعارض في البيانات — حدّث الصفحة ثم أعد المحاولة' },
  413: { code: 'PAYLOAD_TOO_LARGE', message: 'حجم الطلب يتجاوز الحد المسموح' },
  415: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'ترميز الطلب غير مدعوم' },
  429: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة' },
};

/** Fallback envelope for a 4xx status without a dedicated entry above. */
const GENERIC_CLIENT_REJECT: { code: ErrorCode; message: string } = {
  code: 'BAD_REQUEST',
  message: 'تم رفض الطلب',
};

/**
 * http-errors contract: middleware such as body-parser rejects with an
 * Error carrying a numeric `status` (mirrored as `statusCode`). Only a
 * 4xx integer counts as a client reject — 5xx-shaped objects stay on
 * the catch-all path so an arbitrary error can never dictate our 5xx
 * response text or mint alert codes.
 */
function clientRejectStatus(err: unknown): number | undefined {
  const candidate = (err as { status?: unknown }).status ?? (err as { statusCode?: unknown }).statusCode;
  return typeof candidate === 'number' &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 499
    ? candidate
    : undefined;
}
