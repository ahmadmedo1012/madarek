import type { RequestHandler } from 'express';
import type { ZodError, ZodSchema } from 'zod';
import { AppError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/**
 * r165f (D17-3): when a failure is exactly ONE field with exactly ONE
 * authored message AND that message is Arabic — user-facing copy the
 * schema author wrote deliberately (e.g. the register/change-password
 * password blocklist refine) — that message IS the envelope: the
 * visitor can act on it instead of retrying blind behind
 * «تحقّق من البيانات المُدخلة».
 *
 * Everything else keeps the generic envelope byte-identically: zod's
 * built-in English defaults, the dev-internal English refine messages
 * across the routes («fileUrl must start with…», «endsAt must be after…»),
 * form-level errors, and any multi-field failure. No zod message in the
 * backend carries Arabic script today except the password refine, so
 * only the auth register/change-password paths can take the new branch.
 * The zod detail still rides in `details` unchanged either way.
 */
function userFacingFieldMessage<T>(error: ZodError<T>): string | undefined {
  const { formErrors, fieldErrors } = error.flatten();
  const entries = Object.values(fieldErrors) as (string[] | undefined)[];
  if (formErrors.length > 0 || entries.length !== 1) return undefined;
  const [messages] = entries;
  if (!messages || messages.length !== 1) return undefined;
  const [message] = messages;
  if (!message) return undefined;
  return /[\u0600-\u06FF]/.test(message) ? message : undefined;
}

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
          userFacingFieldMessage(result.error) ??
            // D17-3: Arabic envelope message; the zod field errors ride in
            // `details` and stay English (dev-internals the FE guard hides).
            'تحقّق من البيانات المُدخلة',
          400,
          result.error.flatten(),
        ),
      );
    }
    // Replace with parsed (e.g. coerced) value
    Object.assign(req, { [source]: result.data });
    next();
  };
