/**
 * Backend unit test — response-compression decision logic (wave 12-6,
 * decision D10) in `backend/src/lib/compression.ts`.
 *
 * DB-free and boot-free:
 *  - the pure predicate trio (shouldCompress / isCompressibleContentType /
 *    acceptsGzip) is exercised exhaustively;
 *  - the streaming middleware is verified against a minimal mock response
 *    (no server listen): a node:zlib gunzip round-trip proves the wiring
 *    (write → gzip → socket, end → gzip flush → response end), the
 *    Content-Length strip, Vary handling and the HEAD/passthrough paths.
 */
import { describe, expect, it, vi } from 'vitest';
import { gunzipSync } from 'node:zlib';
import type { Request, Response } from 'express';
import {
  COMPRESSION_THRESHOLD_BYTES,
  acceptsGzip,
  compression,
  isCompressibleContentType,
  shouldCompress,
} from '../../src/lib/compression';

// ── Pure predicate: shouldCompress ─────────────────────────────────
describe('shouldCompress — pure decision predicate', () => {
  it('compresses compressible MIME types with unknown length', () => {
    expect(shouldCompress({ contentType: 'text/html' })).toBe(true);
    expect(shouldCompress({ contentType: 'application/json' })).toBe(true);
    expect(
      shouldCompress({ contentType: 'application/javascript; charset=utf-8' }),
    ).toBe(true);
    expect(shouldCompress({ contentType: 'image/svg+xml' })).toBe(true);
  });

  it('treats 1 KB as the inclusive threshold (D10)', () => {
    expect(COMPRESSION_THRESHOLD_BYTES).toBe(1024);
    expect(shouldCompress({ contentType: 'application/json', contentLength: 1024 })).toBe(true);
    expect(shouldCompress({ contentType: 'application/json', contentLength: 1023 })).toBe(false);
  });

  it('skips incompressible MIME types and missing content types', () => {
    expect(shouldCompress({ contentType: 'image/png', contentLength: 50_000 })).toBe(false);
    expect(shouldCompress({ contentType: 'font/woff2', contentLength: 50_000 })).toBe(false);
    expect(shouldCompress({ contentType: 'application/pdf', contentLength: 50_000 })).toBe(false);
    expect(shouldCompress({ contentLength: 50_000 })).toBe(false);
    expect(shouldCompress({})).toBe(false);
  });

  it('never re-encodes an already-encoded response', () => {
    expect(
      shouldCompress({ contentType: 'text/html', contentEncoding: 'gzip', contentLength: 50_000 }),
    ).toBe(false);
    expect(
      shouldCompress({
        contentType: 'text/html',
        contentEncoding: 'identity',
        contentLength: 50_000,
      }),
    ).toBe(false);
  });

  it('keeps bodyless statuses bodyless (204/304/1xx)', () => {
    expect(shouldCompress({ contentType: 'text/html', statusCode: 204 })).toBe(false);
    expect(shouldCompress({ contentType: 'text/html', statusCode: 304 })).toBe(false);
    expect(shouldCompress({ contentType: 'text/html', statusCode: 199 })).toBe(false);
    expect(shouldCompress({ contentType: 'text/html', statusCode: 200 })).toBe(true);
    expect(
      shouldCompress({ contentType: 'application/json', statusCode: 404, contentLength: 5_000 }),
    ).toBe(true);
  });
});

// ── Pure predicate: MIME filter ────────────────────────────────────
describe('isCompressibleContentType — D10 MIME filter', () => {
  it.each([
    'text/html',
    'text/html; charset=utf-8',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/json; charset=utf-8',
    'image/svg+xml',
    'TEXT/PLAIN',
  ])('%s is compressible', (contentType) => {
    expect(isCompressibleContentType(contentType)).toBe(true);
  });

  it.each([
    'application/ld+json',
    'application/x-javascript',
    'application/octet-stream',
    'font/woff2',
    'image/png',
    '',
    undefined,
  ])('%s is not compressible', (contentType) => {
    expect(isCompressibleContentType(contentType)).toBe(false);
  });
});

// ── Pure predicate: Accept-Encoding parsing ────────────────────────
describe('acceptsGzip — Accept-Encoding parsing', () => {
  it.each(['gzip', 'gzip, deflate, br', 'deflate, gzip', 'GZIP', 'gzip;q=1', 'gzip;q=0.5', 'gzip ; q=0.5'])(
    '%s accepts gzip',
    (header) => {
      expect(acceptsGzip(header)).toBe(true);
    },
  );

  it.each(['br', 'deflate', 'identity', '*', 'gzip;q=0', 'gzip;q=0.0', '', undefined])(
    '%s does not accept gzip',
    (header) => {
      expect(acceptsGzip(header)).toBe(false);
    },
  );
});

// ── Middleware wiring (mock response — no server boot) ─────────────
type Listener = (...args: unknown[]) => void;

interface MockRes {
  res: Response;
  body: () => Buffer;
  isEnded: () => boolean;
}

function makeMockRes(): MockRes {
  const headers = new Map<string, string>();
  const chunks: Buffer[] = [];
  let ended = false;

  const push = (chunk: unknown): void => {
    if (typeof chunk === 'string') chunks.push(Buffer.from(chunk, 'utf8'));
    else if (chunk instanceof Buffer) chunks.push(chunk);
    else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
  };

  const res = {
    statusCode: 200,
    headersSent: false,
    getHeader: (name: string) => headers.get(name.toLowerCase()),
    setHeader: (name: string, value: number | string | string[]) =>
      void headers.set(name.toLowerCase(), String(value)),
    removeHeader: (name: string) => void headers.delete(name.toLowerCase()),
    write: (chunk?: unknown) => {
      if (chunk !== undefined && chunk !== null) push(chunk);
      return true;
    },
    end: (...args: unknown[]) => {
      let cb: (() => void) | undefined;
      for (const arg of args) {
        if (typeof arg === 'function') {
          cb = arg as () => void;
          break;
        }
      }
      const chunk = args[0];
      if (chunk !== undefined && chunk !== null && typeof chunk !== 'function') push(chunk);
      ended = true;
      cb?.();
      return res;
    },
    writeHead: (statusCode: number) => {
      res.statusCode = statusCode;
      return res;
    },
    on: (event: string, cb: Listener) => {
      void event;
      void cb;
      return res;
    },
    destroy: vi.fn(),
  };

  return { res: res as unknown as Response, body: () => Buffer.concat(chunks), isEnded: () => ended };
}

const runMiddleware = (
  mock: MockRes,
  reqHeaders: Record<string, string | undefined> = { 'accept-encoding': 'gzip' },
  method = 'GET',
): void => {
  const req = { method, headers: reqHeaders } as unknown as Request;
  compression()(req, mock.res, () => {});
};

/** Wait (wall-clock, not event-loop turns — zlib completes on the libuv threadpool) until the gzip pipeline finishes. */
const untilEnded = async (mock: MockRes): Promise<void> => {
  await vi.waitFor(
    () => {
      if (!mock.isEnded()) throw new Error('response should have ended');
    },
    { timeout: 2_000, interval: 10 },
  );
};

describe('compression middleware — streaming wiring (mock response)', () => {
  it('gzips a JSON body above the threshold and strips Content-Length', async () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const payload = JSON.stringify({ data: 'x'.repeat(4096) });
    mock.res.setHeader('Content-Type', 'application/json; charset=utf-8');
    mock.res.setHeader('Content-Length', String(payload.length));
    mock.res.end(payload, 'utf8');

    await untilEnded(mock);

    expect(mock.res.getHeader('Content-Encoding')).toBe('gzip');
    expect(mock.res.getHeader('Content-Length')).toBeUndefined();
    expect(mock.res.getHeader('Vary')).toBe('Accept-Encoding');
    expect(JSON.parse(gunzipSync(mock.body()).toString('utf8'))).toEqual({
      data: 'x'.repeat(4096),
    });
  });

  it('passes small bodies through untouched (below threshold, synchronous)', () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const payload = '{"ok":true}';
    mock.res.setHeader('Content-Type', 'application/json');
    mock.res.setHeader('Content-Length', String(payload.length));
    mock.res.end(payload);

    expect(mock.isEnded()).toBe(true);
    expect(mock.res.getHeader('Content-Encoding')).toBeUndefined();
    expect(mock.body().toString('utf8')).toBe(payload);
    expect(mock.res.getHeader('Vary')).toBe('Accept-Encoding');
  });

  it('compresses streamed writes (sendFile-style pipe) and reassembles them', async () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const partA = 'a'.repeat(4096);
    const partB = 'b'.repeat(4096);
    mock.res.setHeader('Content-Type', 'text/css');
    mock.res.setHeader('Content-Length', String(partA.length + partB.length));
    mock.res.write(partA);
    mock.res.write(Buffer.from(partB, 'utf8'));
    mock.res.end();

    await untilEnded(mock);

    expect(mock.res.getHeader('Content-Encoding')).toBe('gzip');
    expect(gunzipSync(mock.body()).toString('utf8')).toBe(partA + partB);
  });

  it('decides from headers passed to writeHead(status, headers)', async () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const payload = 'y'.repeat(2048);
    mock.res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': String(payload.length),
    });
    mock.res.end(payload);

    await untilEnded(mock);

    expect(mock.res.getHeader('Content-Encoding')).toBe('gzip');
    expect(gunzipSync(mock.body()).toString('utf8')).toBe(payload);
  });

  it('fires the end() callback after the gzip stream finishes', async () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const cb = vi.fn();
    const payload = 'q'.repeat(2048);
    mock.res.setHeader('Content-Type', 'application/json');
    mock.res.end(payload, 'utf8', cb);

    await untilEnded(mock);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(gunzipSync(mock.body()).toString('utf8')).toBe(payload);
  });

  it('HEAD requests pass through untouched (Vary still set)', () => {
    const mock = makeMockRes();
    const next = vi.fn();
    const req = { method: 'HEAD', headers: { 'accept-encoding': 'gzip' } } as unknown as Request;
    compression()(req, mock.res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mock.res.getHeader('Vary')).toBe('Accept-Encoding');
    // Unpatched: the mock's own write semantics survive verbatim.
    expect(mock.res.write('raw')).toBe(true);
    expect(mock.body().toString('utf8')).toBe('raw');
  });

  it('does not compress when the client does not accept gzip', () => {
    const mock = makeMockRes();
    runMiddleware(mock, { 'accept-encoding': 'br' });
    const payload = 'z'.repeat(4096);
    mock.res.setHeader('Content-Type', 'text/html');
    mock.res.end(payload);

    expect(mock.res.getHeader('Content-Encoding')).toBeUndefined();
    expect(mock.body().toString('utf8')).toBe(payload);
  });

  it('does not touch responses that already have a Content-Encoding', () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    const payload = 'w'.repeat(4096);
    mock.res.setHeader('Content-Type', 'application/javascript');
    mock.res.setHeader('Content-Encoding', 'br');
    mock.res.end(payload);

    expect(mock.res.getHeader('Content-Encoding')).toBe('br');
    expect(mock.body().toString('utf8')).toBe(payload);
  });

  it('keeps 304 Not Modified responses body-free', () => {
    const mock = makeMockRes();
    runMiddleware(mock);
    mock.res.statusCode = 304;
    mock.res.setHeader('Content-Type', 'text/css');
    mock.res.end();

    expect(mock.isEnded()).toBe(true);
    expect(mock.res.getHeader('Content-Encoding')).toBeUndefined();
    expect(mock.body().length).toBe(0);
  });

  it('merges into an existing Vary header instead of clobbering it', () => {
    const mock = makeMockRes();
    mock.res.setHeader('Vary', 'Origin');
    runMiddleware(mock, { 'accept-encoding': 'br' });

    expect(mock.res.getHeader('Vary')).toBe('Origin, Accept-Encoding');
  });
});
