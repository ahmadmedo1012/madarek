/**
 * Backend unit test — error routing in
 * `backend/src/http/middleware/errorHandler.ts`.
 *
 * DB-free: constructs real `PrismaClientKnownRequestError` shapes and a
 * fake express response. Covers the P2003 (foreign-key violation) →
 * 400 BAD_REQUEST mapping (was a leaky 500) plus the pre-existing
 * P2002/P2025 mappings, the 5xx → OperationalAlert feed policy
 * (AppError.internal() alerts, 4xx never does), and the headersSent
 * delegation guard.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
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
import { AppError } from '../../src/lib/errors';
import { resetOperationalAlertThrottle } from '../../src/lib/operational-alerts';

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = (headersSent = false) => {
  const res = {
    headersSent,
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as unknown as Response;
};

const makeReq = () => ({}) as unknown as Request;
const next = vi.fn() as unknown as NextFunction;

const prismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('db rejected this', {
    code,
    clientVersion: '5.22.0',
    ...(meta ? { meta } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  resetOperationalAlertThrottle();
});

describe('errorHandler — Prisma known-request-error mapping', () => {
  it('maps P2003 (foreign key violation) to 400 with the offending relation', () => {
    const res = makeRes();
    errorHandler(prismaError('P2003', { field_name: 'toUserId' }), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Related record does not exist',
        details: { target: 'toUserId' },
      },
    });
  });

  it('joins array-shaped P2003 field names into a dotted path', () => {
    const res = makeRes();
    errorHandler(
      prismaError('P2003', { field_name: ['Message_toUserId_fkey', 'toUserId'] }),
      makeReq(),
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'BAD_REQUEST',
          details: { target: 'Message_toUserId_fkey.toUserId' },
        }),
      }),
    );
  });

  it('keeps P2002 as 409 CONFLICT', () => {
    const res = makeRes();
    errorHandler(prismaError('P2002', { target: ['User', 'email'] }), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'CONFLICT' }) }),
    );
  });

  it('keeps P2025 as 404 NOT_FOUND', () => {
    const res = makeRes();
    errorHandler(prismaError('P2025'), makeReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'NOT_FOUND' }) }),
    );
  });
});

describe('errorHandler — 5xx OperationalAlert feed', () => {
  it('raises one throttled alert for an unhandled error and answers 500', async () => {
    const res = makeRes();
    errorHandler(new Error('boom'), makeReq(), res, next);
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
    expect(prisma.operationalAlert.create).toHaveBeenCalledTimes(1);
    expect(prisma.operationalAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        severity: 'error',
        category: 'http',
        title: 'HTTP_500',
      }),
    });
  });

  it('throttles repeat 500s of the same code to a single alert row', async () => {
    const resA = makeRes();
    const resB = makeRes();
    errorHandler(new Error('boom'), makeReq(), resA, next);
    errorHandler(new Error('boom again'), makeReq(), resB, next);
    await flushMicrotasks();

    expect(resA.status).toHaveBeenCalledWith(500);
    expect(resB.status).toHaveBeenCalledWith(500);
    expect(prisma.operationalAlert.create).toHaveBeenCalledTimes(1);
  });

  it('still answers 500 when the alert write itself fails', async () => {
    vi.mocked(prisma.operationalAlert.create).mockRejectedValueOnce(new Error('alerts table gone'));
    const res = makeRes();
    errorHandler(new Error('boom'), makeReq(), res, next);
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
  });

  it('alerts (APP_INTERNAL) for an intentional AppError.internal() — 5xx AppError branch is reachable', async () => {
    const res = makeRes();
    errorHandler(AppError.internal(), makeReq(), res, next);
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'Internal server error', details: undefined },
    });
    expect(prisma.operationalAlert.create).toHaveBeenCalledTimes(1);
    expect(prisma.operationalAlert.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        severity: 'error',
        category: 'app',
        title: 'APP_INTERNAL',
      }),
    });
  });

  it('never writes alert rows for 4xx AppErrors (client faults are not telemetry)', async () => {
    const res = makeRes();
    errorHandler(AppError.badRequest('nope'), makeReq(), res, next);
    await flushMicrotasks();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: 'nope', details: undefined },
    });
    expect(prisma.operationalAlert.create).not.toHaveBeenCalled();
  });
});

describe('errorHandler — dispatch hardening', () => {
  it('delegates to the express default handler when headers are already sent', async () => {
    const res = makeRes(true);
    const err = new Error('stream crashed mid-write');
    errorHandler(err, makeReq(), res, next);
    await flushMicrotasks();

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    // No alert either — writing a status is impossible, so the 500 path
    // (log + alert + response) must not half-fire.
    expect(prisma.operationalAlert.create).not.toHaveBeenCalled();
  });
});
