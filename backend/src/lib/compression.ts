/**
 * Response compression middleware (wave 12-6, orchestrator decision D10).
 *
 * The platform deliberately avoids the `compression` npm package: gzip is
 * the only encoding needed and `node:zlib` is built in. Contract (D10):
 *   - gzip only (no br/deflate negotiation)
 *   - 1 KB threshold — smaller bodies skip the CPU + header overhead
 *   - MIME filter: text/*, application/javascript, application/json,
 *     image/svg+xml
 *   - `Vary: Accept-Encoding` on EVERY response passing through (even
 *     uncompressed ones), so shared caches never serve a gzip
 *     representation to a client that did not ask for one
 *   - skip responses that already carry a Content-Encoding
 *   - HEAD requests pass through untouched
 *   - streaming-safe: works with `res.sendFile` / `stream.pipe(res)`
 *     because the decision is made lazily at the first
 *     write()/end()/writeHead(), when Content-Type / Content-Length
 *     are already known
 *
 * `shouldCompress`, `isCompressibleContentType` and `acceptsGzip` are
 * pure functions so the decision logic is unit-testable without booting
 * a server (see tests/modules/compression.test.ts).
 */
import type { OutgoingHttpHeader, OutgoingHttpHeaders } from 'node:http';
import { createGzip, type Gzip } from 'node:zlib';
import type { RequestHandler, Response } from 'express';
import { logger } from '../logger.js';

/** Bodies smaller than this are not worth the gzip overhead (D10: 1 KB). */
export const COMPRESSION_THRESHOLD_BYTES = 1024;

/**
 * Header snapshot fed to {@link shouldCompress} — mirrors the subset of
 * response state the decision depends on, so the predicate can be
 * exercised as a pure function.
 */
export interface CompressionHeaders {
  /** Raw Content-Type value (parameters such as charset are tolerated). */
  contentType?: string;
  /** Raw Content-Encoding value — any pre-existing encoding means "skip". */
  contentEncoding?: string;
  /** Parsed Content-Length, when the body size is known up front. */
  contentLength?: number;
  /** Response status code — defaults to 200 when omitted. */
  statusCode?: number;
}

/** MIME filter per D10: text/*, JavaScript, JSON, SVG — nothing else. */
export function isCompressibleContentType(contentType?: string): boolean {
  if (!contentType) return false;
  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();
  if (!mediaType) return false;
  return (
    mediaType.startsWith('text/') ||
    mediaType === 'application/javascript' ||
    mediaType === 'application/json' ||
    mediaType === 'image/svg+xml'
  );
}

/**
 * Pure decision predicate: may this response be gzipped?
 * Order matters — pre-existing encoding wins, then status, then MIME,
 * then the size threshold (only applicable when the length is known:
 * streaming responses without Content-Length are assumed compressible).
 */
export function shouldCompress(headers: CompressionHeaders): boolean {
  // Already-encoded bodies (precompressed assets, ranged slices, …)
  // must not be re-wrapped.
  if (headers.contentEncoding) return false;
  const status = headers.statusCode ?? 200;
  // Bodyless statuses must stay bodyless: a gzip stream would emit a
  // ~20-byte empty archive and corrupt the semantics of a 204/304.
  if (status < 200 || status === 204 || status === 304) return false;
  if (!isCompressibleContentType(headers.contentType)) return false;
  if (
    headers.contentLength !== undefined &&
    headers.contentLength < COMPRESSION_THRESHOLD_BYTES
  ) {
    return false;
  }
  return true;
}

/**
 * Does the client's Accept-Encoding header explicitly allow gzip?
 * `*` is deliberately NOT matched: every real browser and HTTP client
 * names gzip explicitly, and honouring `*` would need full q-value
 * arithmetic for zero practical benefit. `gzip;q=0` counts as refusal.
 */
export function acceptsGzip(acceptEncoding?: string): boolean {
  if (!acceptEncoding) return false;
  for (const entry of acceptEncoding.split(',')) {
    const [rawToken, ...params] = entry.trim().split(';');
    if (rawToken?.trim().toLowerCase() !== 'gzip') continue;
    let q = 1;
    for (const param of params) {
      const eq = param.indexOf('=');
      const key = param.slice(0, eq).trim().toLowerCase();
      if (key === 'q') {
        q = Number.parseFloat(eq === -1 ? '1' : param.slice(eq + 1).trim());
      }
    }
    if (q > 0) return true;
  }
  return false;
}

// ── Middleware plumbing ────────────────────────────────────────────
// Node's write/end/writeHead signatures are overloaded; the bound
// originals are cast to these broader shapes so the patched versions
// can normalize arguments once instead of replicating every overload.

type RawCallback = (error: Error | null | undefined) => void;

type RawWrite = (
  chunk?: unknown,
  encodingOrCallback?: BufferEncoding | RawCallback,
  callback?: RawCallback,
) => boolean;

type RawEnd = (
  chunk?: unknown,
  encoding?: BufferEncoding | (() => void),
  cb?: () => void,
) => Response;

type RawWriteHead = (
  statusCode: number,
  statusMessageOrHeaders?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
  headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
) => Response;

function headerToString(value: number | string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Append a token to `Vary` without duplicating an existing entry. */
function appendVary(res: Response, field: string): void {
  const current = res.getHeader('Vary');
  if (current === undefined) {
    res.setHeader('Vary', field);
    return;
  }
  const list = Array.isArray(current) ? current.join(',') : String(current);
  const existing = list.split(',').map((entry) => entry.trim().toLowerCase());
  if (existing.includes(field.toLowerCase())) return;
  res.setHeader('Vary', `${list}, ${field}`);
}

/**
 * gzip response middleware. Mount once, before any middleware or route
 * that can write a response body (static file serving included).
 */
export function compression(): RequestHandler {
  return (req, res, next) => {
    // Every response routed through here must vary on Accept-Encoding —
    // including uncompressed ones — or an intermediary cache could hand
    // a gzip body to a client that never asked for it.
    appendVary(res, 'Accept-Encoding');

    // HEAD responses carry no body — nothing to compress, pass through.
    if (req.method === 'HEAD') return next();

    const rawAcceptEncoding = req.headers['accept-encoding'];
    const acceptEncoding = Array.isArray(rawAcceptEncoding)
      ? rawAcceptEncoding.join(',')
      : rawAcceptEncoding;
    if (!acceptsGzip(acceptEncoding)) return next();

    const originalWrite = res.write.bind(res) as unknown as RawWrite;
    const originalEnd = res.end.bind(res) as unknown as RawEnd;
    const originalWriteHead = res.writeHead.bind(res) as unknown as RawWriteHead;

    let gzip: Gzip | undefined;
    let decided = false;
    let ended = false;
    let endCallback: (() => void) | undefined;

    const toBuffer = (chunk: unknown, encoding?: BufferEncoding | (() => void)): Buffer =>
      typeof chunk === 'string'
        ? Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8')
        : (chunk as Buffer);

    /**
     * One-shot decision, made as late as possible (first
     * write/end/writeHead) so Content-Type and Content-Length are known
     * for both `res.json()` and `res.sendFile()` before we commit.
     */
    const decide = (): void => {
      if (decided) return;
      decided = true;

      const lengthHeader = res.getHeader('Content-Length');
      const compress = shouldCompress({
        contentType: headerToString(res.getHeader('Content-Type')),
        contentEncoding: headerToString(res.getHeader('Content-Encoding')),
        contentLength: lengthHeader === undefined ? undefined : Number(lengthHeader),
        statusCode: res.statusCode,
      });
      if (!compress) return;

      const stream = createGzip();
      gzip = stream;

      // The compressed body invalidates Content-Length (it described the
      // uncompressed bytes) and must be announced.
      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', 'gzip');

      // Pump compressed bytes to the socket. Backpressure: pause the zlib
      // READABLE on socket saturation and resume on 'drain'. The zlib
      // writable side is never blocked, so this cannot deadlock — worst
      // case zlib buffers the (bounded) tail of the response in memory.
      stream.on('data', (chunk: Buffer) => {
        if (!originalWrite(chunk)) stream.pause();
      });
      stream.on('end', () => {
        originalEnd(endCallback);
      });
      stream.on('error', (err) => {
        // Pathological zlib failure — tear the response down rather than
        // let an unhandled 'error' event kill the whole process.
        logger.error({ err }, 'gzip stream failed mid-response');
        res.destroy(err);
      });
      res.on('drain', () => stream.resume());
      res.on('close', () => stream.destroy());
    };

    res.write = function patchedWrite(
      chunk?: unknown,
      encodingOrCallback?: BufferEncoding | RawCallback,
      callback?: RawCallback,
    ): boolean {
      // write(chunk), write(chunk, encoding), write(chunk, encoding, cb),
      // write(chunk, cb) — normalize before deciding.
      const encoding = typeof encodingOrCallback === 'function' ? undefined : encodingOrCallback;
      const cb = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
      // Implicit headers are emitted by the original write below —
      // decide() first so Content-Encoding is present in them.
      if (!decided) decide();
      const stream = gzip;
      if (!stream || ended) return originalWrite(chunk, encoding, cb);
      if (chunk !== undefined && chunk !== null) {
        const buf = toBuffer(chunk, encoding);
        if (cb) stream.write(buf, (err) => cb(err));
        else stream.write(buf);
      }
      return true;
    };

    res.end = function patchedEnd(
      chunk?: unknown,
      encoding?: BufferEncoding | (() => void),
      cb?: () => void,
    ): Response {
      // Normalize the overloaded forms: end(), end(chunk), end(cb),
      // end(chunk, cb), end(chunk, encoding), end(chunk, encoding, cb).
      if (typeof chunk === 'function') {
        cb = chunk as () => void;
        chunk = undefined;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = undefined;
      }
      if (!decided) decide();
      const stream = gzip;
      if (!stream) return originalEnd(chunk, encoding, cb);
      ended = true;
      endCallback = cb;
      if (chunk !== undefined && chunk !== null) {
        stream.end(toBuffer(chunk, encoding));
      } else {
        stream.end();
      }
      return res;
    };

    res.writeHead = function patchedWriteHead(
      statusCode: number,
      statusMessageOrHeaders?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
      headers?: OutgoingHttpHeaders | OutgoingHttpHeader[],
    ): Response {
      // writeHead(status) | writeHead(status, headers) |
      // writeHead(status, message, headers)
      const statusMessage =
        typeof statusMessageOrHeaders === 'string' ? statusMessageOrHeaders : undefined;
      const headerArg =
        statusMessage !== undefined
          ? headers
          : (statusMessageOrHeaders as OutgoingHttpHeaders | OutgoingHttpHeader[] | undefined);
      // Apply supplied headers via setHeader FIRST so decide() sees the
      // complete header set before anything is flushed to the socket.
      if (headerArg !== undefined && headerArg !== null) {
        if (Array.isArray(headerArg)) {
          for (let i = 0; i + 1 < headerArg.length; i += 2) {
            const key = headerArg[i];
            const value = headerArg[i + 1];
            if (key !== undefined && value !== undefined) {
              res.setHeader(String(key), value);
            }
          }
        } else {
          for (const [key, value] of Object.entries(headerArg)) {
            if (value !== undefined) res.setHeader(key, value);
          }
        }
      }
      decide();
      if (statusMessage !== undefined) return originalWriteHead(statusCode, statusMessage);
      return originalWriteHead(statusCode);
    };

    next();
  };
}
