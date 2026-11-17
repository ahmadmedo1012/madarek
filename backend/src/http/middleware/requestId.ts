import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';

/**
 * R364 — request-id forensics (R363 operations audit, finding R363-06).
 *
 * Serverless logs are ephemeral and the 5xx path had no correlator: an
 * incident could not be tied to the request that produced it. This
 * middleware stamps every request with an id, echoes it back in the
 * `x-request-id` response header (so a user, a browser devtools session
 * or the Vercel log can name the same request), and exposes it on the
 * request for the error handler's log line.
 *
 * Inbound `x-request-id` is honoured only when it is a bounded, boring
 * token — an attacker-controlled header must never become a log-injection
 * vector or an unbounded string. Anything else gets a fresh UUID.
 */

const SAFE_INCOMING = /^[A-Za-z0-9._-]{8,128}$/;

export const REQUEST_ID_HEADER = 'x-request-id';

/** The id this request is being served under (set by `requestId`). */
export function requestIdOf(req: Request): string | undefined {
  return (req as Request & { requestId?: string }).requestId;
}

export const requestId: RequestHandler = (req: Request, res: Response, next) => {
  const incoming = req.get(REQUEST_ID_HEADER);
  const id = incoming && SAFE_INCOMING.test(incoming) ? incoming : randomUUID();
  (req as Request & { requestId?: string }).requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
