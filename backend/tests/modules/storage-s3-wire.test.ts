/**
 * Backend unit test — the S3Driver WIRE contract of
 * `backend/src/lib/storage.ts` (r166d, WS-E).
 *
 * The signing MATH is pinned by storage-sigv4.test.ts (fixed vector);
 * LocalDriver bytes by storage-driver.test.ts. What had ZERO coverage
 * until now is how S3Driver behaves against a real HTTP conversation:
 * which URL/method/headers/body it sends, and how it maps every
 * response class (2xx / 404 / other non-2xx / transport fault) per
 * interface method. This file pins exactly that — fetch stubbed at the
 * global (vi.stubGlobal, the ai-provider.test.ts wire pattern), so no
 * network, no DB, no credentials (config is the same synthetic
 * scanner-safe fake set as the sigv4 vector).
 *
 * The driver under test is COMPLETE code (no stubs) — these tests pin
 * ACTUAL behavior: PUT resolves void on 2xx, non-2xx errors carry the
 * status in the message and the truncated store diagnostics in the
 * `cause`, getRange slices a 200-full response, stat THROWS on an
 * unusable content-length (it does not return null), and key
 * validation fires BEFORE any network call.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S3Driver, probeStorage, type StorageDriver } from '../../src/lib/storage.js';

// Same synthetic config shape as the sigv4 fixed vector — never real.
const CFG = {
  endpoint: 'https://storage.example.com',
  region: 'auto',
  bucket: 'madarek-files',
  accessKeyId: 'test-example-access-key',
  secretAccessKey: 'test-example-secret-key-not-real-000',
};

const PDF_BYTES = Buffer.from('%PDF-1.7\nwire test payload', 'latin1');

/** One captured wire call: the fetch(url, init) pair as sent. */
interface WireCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Uint8Array | undefined;
  range: string | undefined;
  signal: AbortSignal | undefined;
}

/**
 * Stub fetch with a scripted responder and record every call. The
 * responder sees the (url, init) AFTER the driver built them, exactly
 * like a real store's front door would.
 */
function stubFetch(responder: (call: WireCall) => Response | Promise<Response>): WireCall[] {
  const calls: WireCall[] = [];
  vi.stubGlobal('fetch', async (url: URL, init: RequestInit) => {
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = init.body instanceof Uint8Array ? (init.body as Uint8Array) : undefined;
    const call: WireCall = {
      url: String(url),
      method: init.method!,
      headers,
      body,
      range: headers.range,
      signal: init.signal ?? undefined,
    };
    calls.push(call);
    return responder(call);
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── PUT ──────────────────────────────────────────────────────────

describe('S3Driver.put — the write wire', () => {
  it('a 2xx PUT resolves void (the interface contract: throws ONLY on failure)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(null, { status: 200 }));
    await expect(driver.put('papers/cku5c2x9p0000wire.pdf', PDF_BYTES)).resolves.toBeUndefined();
  });

  it('sends PUT to endpoint/bucket/key (path-style) with the exact bytes and an abort signal', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200 }));
    await driver.put('papers/cku5c2x9p0000wire.pdf', PDF_BYTES);

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.method).toBe('PUT');
    expect(call.url).toBe('https://storage.example.com/madarek-files/papers/cku5c2x9p0000wire.pdf');
    // The body rides as bytes — byte-equal, not stringified.
    expect(Buffer.from(call.body!)).toEqual(PDF_BYTES);
    // The 60s PUT timeout rides as an abort signal.
    expect(call.signal).toBeInstanceOf(AbortSignal);
  });

  it('r166d: a PUT with a body declares content-type: application/pdf (objects stop landing as octet-stream)', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200 }));
    await driver.put('materials/c8075677811f541b6b253cb797db2adc.pdf', PDF_BYTES);

    expect(calls[0]!.headers['content-type']).toBe('application/pdf');
  });

  it('a non-2xx PUT throws with the key + status in the message and the store diagnostics (truncated) as the cause', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() =>
      new Response('<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>denied</Message></Error>', {
        status: 403,
      }),
    );

    const err = await driver.put('papers/x.pdf', PDF_BYTES).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('S3 PUT failed for key papers/x.pdf with status 403');
    // Store-side diagnostics ride the cause — for the LOG, and truncated.
    expect((err as Error).cause).toBeInstanceOf(Error);
    expect(((err as Error).cause as Error).message).toContain('AccessDenied');
    expect(((err as Error).cause as Error).message).toContain('denied');
  });

  it('the diagnostics excerpt is capped at 500 chars (a misbehaving store cannot flood the log)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('<Error>' + 'x'.repeat(2000) + '</Error>', { status: 500 }));

    const err = (await driver.put('papers/x.pdf', PDF_BYTES).catch((e: unknown) => e)) as Error;
    expect((err as Error).message).toBe('S3 PUT failed for key papers/x.pdf with status 500');
    expect(((err as Error).cause as Error).message.length).toBeLessThanOrEqual(500);
  });

  it('a transport rejection (fetch throws TypeError) maps to the request-failed error with the original as cause', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    const err = (await driver.put('papers/x.pdf', PDF_BYTES).catch((e: unknown) => e)) as Error;

    expect(err.message).toBe('S3 PUT request failed for key papers/x.pdf');
    expect((err.cause as Error)).toBeInstanceOf(TypeError);
    expect((err.cause as Error).message).toBe('fetch failed');
    expect(calls).toHaveLength(1);
  });
});

// ─── GET ──────────────────────────────────────────────────────────

describe('S3Driver.get — the full read wire', () => {
  it('a 200 GET returns the body byte-equal', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(PDF_BYTES, { status: 200 }));

    const got = await driver.get('papers/cku5c2x9p0000wire.pdf');
    expect(got).not.toBeNull();
    expect(got!.equals(PDF_BYTES)).toBe(true);
  });

  it('a 404 GET returns null (absent ≠ failure)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('<?xml?><Error><Code>NoSuchKey</Code></Error>', { status: 404 }));
    await expect(driver.get('papers/missing.pdf')).resolves.toBeNull();
  });

  it('a non-404 non-2xx GET throws with the status in the message', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('<Error><Code>SlowDown</Code></Error>', { status: 503 }));

    const err = (await driver.get('papers/x.pdf').catch((e: unknown) => e)) as Error;
    expect(err.message).toBe('S3 GET failed for key papers/x.pdf with status 503');
    expect((err.cause as Error).message).toContain('SlowDown');
  });

  it('a transport rejection on GET maps to the request-failed error', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    const err = (await driver.get('papers/x.pdf').catch((e: unknown) => e)) as Error;
    expect(err.message).toBe('S3 GET request failed for key papers/x.pdf');
  });
});

// ─── getRange ─────────────────────────────────────────────────────

describe('S3Driver.getRange — the ranged read wire', () => {
  const FULL = Buffer.from('0123456789ABCDEFGHIJ', 'latin1'); // 20 bytes

  it('sends the Range header on the wire (bytes=start-end)', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(FULL.subarray(2, 12), { status: 206 }));
    await driver.getRange('papers/r.pdf', 2, 11);

    expect(calls[0]!.range).toBe('bytes=2-11');
  });

  it('a 206 answer is returned verbatim (the store did the slicing)', async () => {
    const driver = new S3Driver(CFG);
    const partial = FULL.subarray(2, 12);
    stubFetch(() => new Response(partial, { status: 206 }));

    const slice = await driver.getRange('papers/r.pdf', 2, 11);
    expect(slice!.equals(partial)).toBe(true);
  });

  it('a 200 answer (store ignored Range) is sliced honestly: [start, min(end+1, len))', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(FULL, { status: 200 })); // full object back

    const slice = await driver.getRange('papers/r.pdf', 4, 9);
    expect(slice!.equals(FULL.subarray(4, 10))).toBe(true); // end inclusive → 10 exclusive

    // A window running past EOF clamps at the real length.
    const tail = await driver.getRange('papers/r.pdf', 17, 100);
    expect(tail!.equals(FULL.subarray(17))).toBe(true);
  });

  it('a 200 answer with start beyond the object length returns null (nothing to slice)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(FULL, { status: 200 }));
    await expect(driver.getRange('papers/r.pdf', 20, 30)).resolves.toBeNull();
  });

  it('a 404 ranged GET returns null', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('', { status: 404 }));
    await expect(driver.getRange('papers/missing.pdf', 0, 9)).resolves.toBeNull();
  });

  it('a non-404 non-2xx ranged GET throws with the status in the message', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('', { status: 500 }));
    const err = (await driver.getRange('papers/r.pdf', 0, 9).catch((e: unknown) => e)) as Error;
    expect(err.message).toBe('S3 ranged GET failed for key papers/r.pdf with status 500');
  });
});

// ─── stat ─────────────────────────────────────────────────────────

describe('S3Driver.stat — the size probe wire', () => {
  it('a HEAD with a good content-length returns { size }', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200, headers: { 'content-length': '1234' } }));

    const info = await driver.stat('papers/r.pdf');
    expect(info).toEqual({ size: 1234 });
    expect(calls[0]!.method).toBe('HEAD');
  });

  it('a 404 HEAD returns null', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response('', { status: 404 }));
    await expect(driver.stat('papers/missing.pdf')).resolves.toBeNull();
  });

  it('an ABSENT content-length THROWS (unusable — actual behavior, not null)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(null, { status: 200 })); // no content-length header

    await expect(driver.stat('papers/r.pdf')).rejects.toThrow(
      'S3 HEAD for key papers/r.pdf returned an unusable content-length',
    );
  });

  it('a non-integer / negative content-length also throws the unusable-length error', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(null, { status: 200, headers: { 'content-length': '12abc' } }));
    await expect(driver.stat('papers/r.pdf')).rejects.toThrow(/unusable content-length/);

    stubFetch(() => new Response(null, { status: 200, headers: { 'content-length': '-5' } }));
    await expect(driver.stat('papers/r.pdf')).rejects.toThrow(/unusable content-length/);
  });

  it('a non-404 non-2xx HEAD throws with the status (no detail body — HEAD has none)', async () => {
    const driver = new S3Driver(CFG);
    stubFetch(() => new Response(null, { status: 500 }));
    await expect(driver.stat('papers/r.pdf')).rejects.toThrow('S3 HEAD failed for key papers/r.pdf with status 500');
  });
});

// ─── The signed wire invariants (every request) ────────────────────

describe('S3Driver — wire invariants on every request', () => {
  it('every request carries an AWS4-HMAC-SHA256 Authorization header (PUT/GET/ranged GET/HEAD)', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200, headers: { 'content-length': '4' } }));

    await driver.put('papers/k.pdf', PDF_BYTES);
    await driver.get('papers/k.pdf');
    await driver.getRange('papers/k.pdf', 0, 1);
    await driver.stat('papers/k.pdf');

    expect(calls).toHaveLength(4);
    for (const call of calls) {
      expect(call.headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=test-example-access-key\//);
      expect(call.headers.Authorization).toContain('SignedHeaders=');
      expect(call.headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
      // The signed amz headers ride the wire too.
      expect(call.headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
      expect(call.headers['x-amz-content-sha256']).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('only body-carrying requests send content-type (GET/HEAD stay bare — r166d header set)', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200, headers: { 'content-length': '4' } }));

    await driver.put('papers/k.pdf', PDF_BYTES); // body → content-type
    await driver.get('papers/k.pdf'); // no body → none
    await driver.stat('papers/k.pdf'); // no body → none

    expect(calls[0]!.headers['content-type']).toBe('application/pdf');
    expect(calls[1]!.headers['content-type']).toBeUndefined();
    expect(calls[2]!.headers['content-type']).toBeUndefined();
  });

  it('key validation fires BEFORE any network call (invalid keys never leave the process)', async () => {
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 200 }));

    await expect(driver.put('papers/../escape.pdf', PDF_BYTES)).rejects.toThrow(/invalid storage key/);
    await expect(driver.get('uploads/other.pdf')).rejects.toThrow(/invalid storage key/);
    await expect(driver.getRange('/papers/absolute.pdf', 0, 1)).rejects.toThrow(/invalid storage key/);
    await expect(driver.stat('papers/nested/deep.pdf')).rejects.toThrow(/invalid storage key/);

    expect(calls).toHaveLength(0); // ZERO wire traffic for all four
  });
});

// ─── probeStorage (r166d — informational reachability) ────────────

describe('probeStorage (r166d) — advisory reachability, never a gate', () => {
  it('ok when the driver answers (a 404-style null stat is still an ANSWER)', async () => {
    const driver: StorageDriver = {
      put: vi.fn(),
      get: vi.fn(),
      getRange: vi.fn(),
      stat: vi.fn(async () => null), // absent probe object — store answered
    };
    await expect(probeStorage(driver)).resolves.toEqual({ ok: true });
  });

  it('ok with a present object too (a size answer is an answer)', async () => {
    const driver: StorageDriver = {
      put: vi.fn(),
      get: vi.fn(),
      getRange: vi.fn(),
      stat: vi.fn(async () => ({ size: 8 })),
    };
    await expect(probeStorage(driver)).resolves.toEqual({ ok: true });
  });

  it('unreachable (ok:false + detail) when stat THROWS — and the probe never rethrows', async () => {
    const driver: StorageDriver = {
      put: vi.fn(),
      get: vi.fn(),
      getRange: vi.fn(),
      stat: vi.fn(async () => {
        throw new Error('S3 HEAD request failed for key papers/probe.pdf');
      }),
    };
    const probe = await probeStorage(driver);
    expect(probe.ok).toBe(false);
    expect(probe.detail).toContain('S3 HEAD request failed');
  });

  it('the default probe key passes the drivers key gate (papers namespace — stat is sent, not rejected)', async () => {
    // A REAL S3Driver with a stubbed store: the default key must reach
    // the wire (a key-gate rejection would mean a mis-minted probe key).
    const driver = new S3Driver(CFG);
    const calls = stubFetch(() => new Response(null, { status: 404 }));

    const probe = await probeStorage(driver);
    expect(probe).toEqual({ ok: true }); // 404 = the store answered
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://storage.example.com/madarek-files/papers/probe.pdf');
    expect(calls[0]!.method).toBe('HEAD');
  });

  it('stat-only: the probe never writes (put is never consulted)', async () => {
    const put = vi.fn();
    const driver: StorageDriver = {
      put,
      get: vi.fn(),
      getRange: vi.fn(),
      stat: vi.fn(async () => null),
    };
    await probeStorage(driver);
    expect(put).not.toHaveBeenCalled();
  });
});
