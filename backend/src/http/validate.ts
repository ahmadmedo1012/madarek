import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * Returns a middleware that parses & replaces req[source] with the typed value.
 * Throws a 400 VALIDATION_ERROR if parsing fails.
 */
export const validate =
  <T>(schema: ZodSchema<T>, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        new AppError(
          'VALIDATION_ERROR',
          'Validation failed',
          400,
          result.error.flatten(),
        ),
      );
    }
    // Replace with parsed (e.g. coerced) value
    Object.assign(req, { [source]: result.data });
    next();
  };
