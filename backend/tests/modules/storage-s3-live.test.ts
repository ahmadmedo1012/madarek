/**
 * Backend integration test — r167 (WS-1): the REAL S3Driver against a
 * REAL S3-protocol HTTP server (s3rver 3.7.1, a dev-only pure-JS
 * dependency — the house no-new-runtime-deps rule is untouched).
 *
 * storage-s3-wire.test.ts pins the driver against a STUBBED fetch;
 * this file pins it against a server that actually speaks the S3 wire
 * protocol: real HTTP verbs, real status codes, real headers. Started
 * programmatically on 127.0.0.1:0 (ephemeral port) with a temp-dir
 * filesystem store and one pre-provisioned bucket, then driven through
 * the REAL buildDriver factory with s3rver's registered dummy account
 * ('S3RVER'/'S3RVER' — dummy values only, never real credentials).
 *
 * HONEST LIMIT (s3rver 3.7.1): it parses AWS4-HMAC-SHA256 Authorization
 * headers and requires a REGISTERED access key (unregistered keys get
 * 403 InvalidAccessKeyId), but the v4 signature MATH itself is not
 * verified upstream ("Signature version 4 calculation is unimplemented"
 * in its authentication middleware). So this file proves the protocol
 * conversation — path-style URLs, PUT/GET/HEAD, Range → 206 +
 * Content-Range, 404 → null, 416 InvalidRange, content-type
 * persistence, probe reachability, wrong-credential → unreachable —
 * while SigV4 acceptance stays proven where it lives: the pinned
 * vector (storage-sigv4.test.ts) + the operator upload smoke
 * (docs/12-deployment.md, storage section step 5).
 *
 * Skips gracefully (describe.skipIf) when s3rver cannot start (e.g. a
 * sandbox that refuses the ephemeral-port bind) — the rest of the suite
 * is unaffected. With a healthy start the whole file runs in well under
 * a second: one local server, a handful of loopback round-trips.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import S3rver from 's3rver';
import { buildDriver, probeStorage, type StorageDriver } from '../../src/lib/storage.js';

// ── Boot the live server BEFORE collection (skipIf must know) ──────
const tmpDir = mkdtempSync(join(tmpdir(), 'madarek-s3-live-'));
let s3rver: S3rver | null = null;
let driver: StorageDriver | null = null;
let baseUrl: string | null = null;

try {
  s3rver = new S3rver({
    address: '127.0.0.1',
    port: 0, // ephemeral — never a fixed-port collision with dev tools
    directory: tmpDir,
    silent: true,
    resetOnClose: true,
    configureBuckets: [{ name: 'madarek-files' }],
  });
  const addr = await s3rver.run();
  baseUrl = `http://127.0.0.1:${addr.port}`;
  // The REAL factory path (not `new S3Driver`): env slice → buildDriver.
  driver = buildDriver({
    STORAGE_DRIVER: 's3',
    S3_ENDPOINT: baseUrl,
    S3_REGION: 'auto',
    S3_BUCKET: 'madarek-files',
    S3_ACCESS_KEY_ID: 'S3RVER', // s3rver's registered dummy account
    S3_SECRET_ACCESS_KEY: 'S3RVER',
  });
} catch {
  // Port bind refused / s3rver unavailable: every test below skips —
  // an honest skip, never a silent pass.
  s3rver = null;
  driver = null;
  baseUrl = null;
}

afterAll(async () => {
  if (s3rver !== null) {
    // Idle keep-alive sockets (undici) would make close() wait out the
    // connection TTL and slow the suite — drop them first when the
    // Node version offers it, then close with a belt.
    s3rver.httpServer?.closeIdleConnections?.();
    await Promise.race([
      s3rver.close().catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
  rmSync(tmpDir, { recursive: true, force: true });
});

/** One unique key per test — no inter-test coupling through the store. */
let keyCounter = 0;
const nextKey = () => `papers/cku5c2x9p0live${String(++keyCounter).padStart(3, '0')}.pdf`;

/** Binary PDF-shaped payload with high-bit bytes (catches encoding bugs). */
const PDF_BYTES = Buffer.from('%PDF-1.7\nlive s3rver round-trip payload \u00ff\u00fe\u00fd', 'latin1');

/**
 * Unsigned raw request straight to the store — s3rver accepts anonymous
 * requests (its auth middleware runs only when an Authorization header
 * is present), which is exactly what the WIRE-level assertions need:
 * they pin what the SERVER answered, independently of the driver.
 */
const rawFetch = (path: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, init);

// ── The live protocol conversation ─────────────────────────────────

describe.skipIf(driver === null)('S3Driver × s3rver — the real wire protocol (r167)', () => {
  it('put → stat → get is byte-identical through the real factory-built driver', async () => {
    const key = nextKey();

    await driver!.put(key, PDF_BYTES); // resolves only on a real 2xx

    const info = await driver!.stat(key); // a real HEAD
    expect(info).toEqual({ size: PDF_BYTES.length });

    const got = await driver!.get(key); // a real GET
    expect(got).not.toBeNull();
    expect(got!.equals(PDF_BYTES)).toBe(true);
  });

  it('a real 206 ranged GET answers Content-Range + Content-Length, and the driver returns exactly those bytes', async () => {
    const key = nextKey();
    await driver!.put(key, PDF_BYTES);

    // The wire: the server itself honors the Range header with 206.
    const start = 2;
    const end = 11;
    const wire = await rawFetch(`/madarek-files/${key}`, { headers: { range: `bytes=${start}-${end}` } });
    expect(wire.status).toBe(206);
    expect(wire.headers.get('content-range')).toBe(`bytes ${start}-${end}/${PDF_BYTES.length}`);
    expect(wire.headers.get('content-length')).toBe(String(end - start + 1));
    expect(Buffer.from(await wire.arrayBuffer()).equals(PDF_BYTES.subarray(start, end + 1))).toBe(true);

    // The driver: consumes the same 206 answer verbatim.
    const slice = await driver!.getRange(key, start, end);
    expect(slice).not.toBeNull();
    expect(slice!.equals(PDF_BYTES.subarray(start, end + 1))).toBe(true);
  });

  it('a really missing key answers 404 on the wire and null through the driver (get + stat)', async () => {
    const key = nextKey(); // never written

    const wire = await rawFetch(`/madarek-files/${key}`);
    expect(wire.status).toBe(404);

    await expect(driver!.get(key)).resolves.toBeNull();
    await expect(driver!.stat(key)).resolves.toBeNull();
  });

  it('content-type persists as application/pdf (the r166d signed header, against a real store)', async () => {
    const key = nextKey();
    await driver!.put(key, PDF_BYTES);

    const head = await rawFetch(`/madarek-files/${key}`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toBe('application/pdf');
    expect(head.headers.get('content-length')).toBe(String(PDF_BYTES.length));

    const got = await rawFetch(`/madarek-files/${key}`);
    expect(got.headers.get('content-type')).toBe('application/pdf');
  });

  it('probeStorage answers ok:true against the live store (404 on the probe key is still an answer)', async () => {
    // papers/probe.pdf was never written — the store's 404 IS the proof
    // the transport + signing path work (the r166d probe contract).
    await expect(probeStorage(driver!)).resolves.toEqual({ ok: true });
  });

  it('unsatisfiable range: s3rver answers 416 InvalidRange on the wire; the driver throws with the status (honest non-2xx mapping)', async () => {
    const key = nextKey();
    await driver!.put(key, PDF_BYTES);

    // The wire: a range starting past EOF is 416 with the size named.
    const start = PDF_BYTES.length + 10;
    const wire = await rawFetch(`/madarek-files/${key}`, { headers: { range: `bytes=${start}-999` } });
    expect(wire.status).toBe(416);
    expect(Buffer.from(await wire.arrayBuffer()).toString('latin1')).toContain('InvalidRange');

    // The driver: non-404 non-2xx maps to a THROW carrying the status —
    // the serving route decides 416 semantics BEFORE consulting storage
    // (pinned in files-serving.test.ts), so this is the honest boundary.
    await expect(driver!.getRange(key, start, start + 10)).rejects.toThrow(
      `S3 ranged GET failed for key ${key} with status 416`,
    );
  });

  it('WRONG credentials → the store refuses (403) and probeStorage folds it into ok:false — the truthfulness closure, live', async () => {
    // The exact scenario /owner/system used to lie green about: s3
    // configured, store reachable, credentials REJECTED. A real driver
    // with an unregistered access key gets 403 InvalidAccessKeyId from
    // the store, and the probe must report unreachable (the
    // reachable:false the System page now paints honestly).
    const wrongCreds = buildDriver({
      STORAGE_DRIVER: 's3',
      S3_ENDPOINT: baseUrl!,
      S3_REGION: 'auto',
      S3_BUCKET: 'madarek-files',
      S3_ACCESS_KEY_ID: 'wrong-key-live-test', // unregistered → 403
      S3_SECRET_ACCESS_KEY: 'S3RVER',
    });

    // The signed (well-formed) request with the unknown key: the store's
    // refusal surfaces in the driver's honest error mapping.
    const key = nextKey();
    const err = (await wrongCreds.stat(key).catch((e: unknown) => e)) as Error;
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(`S3 HEAD failed for key ${key} with status 403`);

    const probe = await probeStorage(wrongCreds);
    expect(probe.ok).toBe(false);
    expect(probe.detail).toContain('403');
  });
});
