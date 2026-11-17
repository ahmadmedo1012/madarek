import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, requestId, requestIdOf } from '../../src/http/middleware/requestId.js';

/**
 * R364 — the request-id contract (R363 operations audit, finding
 * R363-06). Pinned here because the value is forensic: an incident is
 * named by this id in an ephemeral serverless log, so it must (a)
 * always exist, (b) round-trip the caller's own id when that id is a
 * boring token, and (c) NEVER be taken verbatim from an unsafe header
 * (log injection / unbounded string).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function harness(incoming?: string) {
  const req = {
    get: vi.fn((name: string) => (name.toLowerCase() === REQUEST_ID_HEADER ? incoming : undefined)),
  } as unknown as Request;
  const headers: Record<string, string> = {};
  const res = { setHeader: vi.fn((k: string, v: string) => { headers[k] = v; }) } as unknown as Response;
  const next = vi.fn();
  return { req, res, headers, next };
}

describe('requestId middleware', () => {
  it('mints a uuid when the caller sends no id, and echoes it in the header', () => {
    const { req, res, headers, next } = harness();
    requestId(req, res, next);
    const id = headers[REQUEST_ID_HEADER];
    expect(id).toMatch(UUID_RE);
    expect(requestIdOf(req)).toBe(id);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('honours a bounded, boring inbound id (edge/proxy correlation)', () => {
    const { req, res, headers } = harness('edge-1700000000-abc.123');
    requestId(req, res, () => undefined);
    expect(headers[REQUEST_ID_HEADER]).toBe('edge-1700000000-abc.123');
    expect(requestIdOf(req)).toBe('edge-1700000000-abc.123');
  });

  it('refuses to adopt an unsafe inbound id — a new uuid replaces it', () => {
    for (const hostile of ['short', 'has space and words', 'x'.repeat(200), 'newline\ninjected']) {
      const { req, res, headers } = harness(hostile);
      requestId(req, res, () => undefined);
      expect(headers[REQUEST_ID_HEADER]).not.toBe(hostile);
      expect(headers[REQUEST_ID_HEADER]).toMatch(UUID_RE);
    }
  });
});
