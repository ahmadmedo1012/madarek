/**
 * Backend unit test — Prisma error → HTTP mapping in
 * `backend/src/http/middleware/errorHandler.ts`.
 *
 * DB-free: constructs real `PrismaClientKnownRequestError` shapes and a
 * fake express response. Covers the P2003 (foreign-key violation) →
 * 400 BAD_REQUEST mapping (was a leaky 500) plus the pre-existing
 * P2002/P2025 mappings, and the 5xx → OperationalAlert feed.
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
import { resetOperationalAlertThrottle } from '../../src/lib/operational-alerts';

const flushMicrotasks = () => new Promise<void>((resolve) => setImmediate(resolve));

const makeRes = () => {
  const res = {
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
});
