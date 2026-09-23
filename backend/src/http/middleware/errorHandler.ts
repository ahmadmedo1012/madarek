import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../../logger.js';
import { prisma } from '../../db.js';
import { AppError } from '../../lib/errors.js';
import { raiseOperationalAlert } from '../../lib/operational-alerts.js';

/**
 * Final error middleware. Order matters: register LAST.
 * Maps known errors to HTTP codes; everything else is a 500 with no leak.
 *
 * 5xx paths additionally raise an OperationalAlert (best-effort,
 * throttled per code) so the OWNER System/Alerts telemetry pages have
 * a live feed instead of a permanently empty table.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    if (err.status >= 500) {
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
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten() },
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Duplicate value', details: { target: err.meta?.target } },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Record not found' } });
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
          message: 'Related record does not exist',
          details: { target: field ?? err.meta?.field_name },
        },
      });
      return;
    }
  }
  logger.error({ err }, 'Unhandled error');
  // Unhandled error → 500 → also feed the OWNER operational alert board.
  void raiseOperationalAlert(prisma, {
    severity: 'error',
    code: 'HTTP_500',
    message: 'Unhandled server error — check backend logs for the stack trace',
  });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Internal server error' } });
};
