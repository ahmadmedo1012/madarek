/**
 * Backend unit test — body-parser error → HTTP mapping in
 * `backend/src/http/middleware/errorHandler.ts`.
 *
 * DB-free: constructs the exact http-errors shapes express.json() /
 * express.urlencoded() (body-parser 1.20.x) hand to next() and drives
 * the handler with a fake express response — no server boot needed.
 *
 * Pins the P0 fix: malformed JSON (entity.parse.failed) and oversized
 * payloads (entity.too.large) used to fall through to the catch-all,
 * giving any client a user-triggerable 500 plus a fake HTTP_500
 * OperationalAlert row poisoning the OWNER telemetry feed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/db.js', () => ({
  prisma: {
    operationalAlert: { create: vi.fn(async () => ({})) },
    // Defensive: other graph modules import withRetry from db.js.
    withRetry: vi.fn(),
  },
}));

import { prisma } from '../../src/db.js';
import { errorHandler } from '../../src/http/middleware/errorHandler';
import { resetOperationalAlertThrottle } from '../../src/lib/operational-alerts';

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as unknown as Response;
};

const makeReq = () => ({}) as unknown as Request;
const next = vi.fn() as unknown as NextFunction;

/**
 * Mirror of what body-parser next()s — http-errors objects built by
 * `createError(status, message, props)`: numeric `status`/`statusCode`,
 * `expose: true`, a machine `type`, and (for JSON parse failures) a
 * SyntaxError whose message embeds the offending request bytes.
 */
const httpError = (
  status: number,
  message: string,
  props: Record<string, unknown>,
  BaseClass: new (message: string) => Error = Error,
) => {
  const error = new BaseClass(message);
  Object.assign(error, { status, statusCode: status, expose: true }, props);
  return error;
};

/** express.json() on a body of `{ "title": }` — read.js:130 parse failure. */
const entityParseError = () =>
  httpError(
    400,
    'Unexpected token } in JSON at position 12',
    { type: 'entity.parse.failed', body: '{ "title": }' },
    SyntaxError,
  );

/** raw-body rejects an over-limit body up front (content-length known). */
const tooLargeError = () =>
  httpError(413, 'request entity too large', {
    expected: 2_097_152,
    length: 2_097_152,
    limit: 1_048_576,
    type: 'entity.too.large',
  });

/** raw-body rejects an over-limit streaming body (no content-length). */
const tooLargeStreamingError = () =>
  httpError(413, 'request entity too large', {
    limit: 1_048_576,
    received: 1_048_697,
    type: 'entity.too.large',
  });

/** urlencoded extended parser past its parameter limit. */
const urlencodedTooManyParamsError = () =>
  httpError(413, 'too many parameters', { type: 'parameters.too.many' });

/** json/urlencoded with an unknown charset. */
const charsetUnsupportedError = () =>
  httpError(415, 'unsupported charset "UTF-32"', { charset: 'utf-32', type: 'charset.unsupported' });

/** Client hung up mid-body. */
const requestAbortedError = () =>
  httpError(400, 'request aborted', {
    code: 'ECONNABORTED',
    expected: 512,
    length: 512,
    received: 128,
    type: 'request.aborted',
  });

beforeEach(() => {
  vi.clearAllMocks();
  resetOperationalAlertThrottle();
});

describe('errorHandler — body-parser rejects (P0: no user-triggerable 500s)', () => {
  it('maps entity.parse.failed (malformed JSON) to 400 BAD_REQUEST with our envelope', () => {
    const res = makeRes();
    errorHandler(entityParseError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: 'Malformed request body' },
    });
  });

  it('never echoes the raw parser output (its message/body embed request bytes)', () => {
    const res = makeRes();
    errorHandler(entityParseError(), makeReq(), res, next);

    const sent = JSON.stringify(vi.mocked(res.json).mock.calls[0]?.[0]);
    expect(sent).not.toContain('Unexpected token');
    expect(sent).not.toContain('title');
  });

  it('maps entity.too.large (content-length known) to 413 PAYLOAD_TOO_LARGE', () => {
    const res = makeRes();
    errorHandler(tooLargeError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size limit' },
    });
  });

  it('maps entity.too.large (streaming body) to 413 PAYLOAD_TOO_LARGE', () => {
    const res = makeRes();
    errorHandler(tooLargeStreamingError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size limit' },
    });
  });

  it('maps parameters.too.many (urlencoded) to 413 PAYLOAD_TOO_LARGE', () => {
    const res = makeRes();
    errorHandler(urlencodedTooManyParamsError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size limit' },
    });
  });

  it('maps charset.unsupported to 415 UNSUPPORTED_MEDIA_TYPE', () => {
    const res = makeRes();
    errorHandler(charsetUnsupportedError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Unsupported request body encoding' },
    });
  });

  it('maps request.aborted to 400 BAD_REQUEST', () => {
    const res = makeRes();
    errorHandler(requestAbortedError(), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: 'Malformed request body' },
    });
  });

  it('also reads statusCode when status is absent (http-errors sets both)', () => {
    const res = makeRes();
    const err = Object.assign(new Error('request entity too large'), {
      statusCode: 413,
      expose: true,
      type: 'entity.too.large',
    });
    errorHandler(err, makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size limit' },
    });
  });

  it('never writes OperationalAlert rows for any body-parser reject', async () => {
    const rejects = [
      entityParseError(),
      tooLargeError(),
      tooLargeStreamingError(),
      urlencodedTooManyParamsError(),
      charsetUnsupportedError(),
      requestAbortedError(),
    ];
    for (const err of rejects) {
      errorHandler(err, makeReq(), makeRes(), next);
    }
    await flushMicrotasks();

    expect(prisma.operationalAlert.create).not.toHaveBeenCalled();
  });
});

describe('errorHandler — reject detection is shape-guarded', () => {
  it('routes 5xx-shaped http-errors to the catch-all: generic 500 + alert, never their own text', async () => {
    const res = makeRes();
    // body-parser's stream.encoding.set is a server-side bug → 500-shaped.
    errorHandler(
      httpError(500, 'stream encoding should not be set', { type: 'stream.encoding.set' }),
      makeReq(),
      res,
      next,
    );
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
    expect(prisma.operationalAlert.create).toHaveBeenCalledTimes(1);
  });

  it('ignores non-numeric status props — only a 4xx integer counts as a client reject', async () => {
    const res = makeRes();
    const err = Object.assign(new Error('garbage status'), {
      status: '400',
      type: 'entity.parse.failed',
    });
    errorHandler(err, makeReq(), res, next);
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(prisma.operationalAlert.create).toHaveBeenCalledTimes(1);
  });

  it('keeps routing a bare ZodError to 400 VALIDATION_ERROR (audit gap: untested branch)', () => {
    const res = makeRes();
    const zodErr = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['title'],
        message: 'Expected string, received number',
      },
    ]);
    errorHandler(zodErr, makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { formErrors: [], fieldErrors: { title: ['Expected string, received number'] } },
      },
    });
    expect(prisma.operationalAlert.create).not.toHaveBeenCalled();
  });
});
