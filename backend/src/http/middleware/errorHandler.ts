import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../../logger.js';
import { AppError } from '../../lib/errors.js';

/**
 * Final error middleware. Order matters: register LAST.
 * Maps known errors to HTTP codes; everything else is a 500 with no leak.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Known app error
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
      requestId: req.id,
    });
    return;
  }

  // Zod (defensive — usually caught by validate middleware first)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.flatten() },
      requestId: req.id,
    });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Duplicate value',
          details: { target: err.meta?.target },
        },
        requestId: req.id,
      });
      return;
    }
    if (err.code === 'P2025') {
      res
        .status(404)
        .json({ error: { code: 'NOT_FOUND', message: 'Record not found' }, requestId: req.id });
      return;
    }
  }

  // Unknown — log and respond generically
  logger.error({ err, requestId: req.id }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Internal server error' },
    requestId: req.id,
  });
};
