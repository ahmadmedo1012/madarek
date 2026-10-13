/**
 * Storage abstraction for uploaded PDFs (P3-BE, campaign "real uploads").
 *
 * Two namespaces, two serving routes:
 *   papers/    → GET /api/v1/files/papers/:filename (research papers)
 *   materials/ → GET /api/v1/files/materials/:filename (course materials)
 *
 * Drivers:
 *   - LocalDriver (default): `backend/storage/` via fs/promises. Dev-only
 *     honesty: Render's filesystem is EPHEMERAL — files written at runtime
 *     vanish on every redeploy. Production persistence requires
 *     STORAGE_DRIVER=s3 + the S3_* vars (env.ts fails closed on a
 *     half-configured s3 driver at boot).
 *   - S3Driver: any S3-compatible object store (AWS S3, Cloudflare R2,
 *     MinIO) via global fetch + a hand-rolled AWS Signature V4 — node:crypto
 *     only, NO new npm deps (house style). Path-style addressing
 *     (`${endpoint}/${bucket}/${key}`) which R2/MinIO require.
 *
 * Pure key/signing helpers are exported for DB-free unit tests
 * (tests/modules/storage-sigv4.test.ts, storage-driver.test.ts).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, stat as fsStat, writeFile } from 'node:fs/promises';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { env } from '../env.js';
import { logger } from '../logger.js';

// ─── Driver interface ─────────────────────────────────────────────

/** The byte-level contract every storage backend must honor. */
export interface StorageDriver {
  /** Persist bytes under `key`. Throws on failure — callers map to 500. */
  put(key: string, bytes: Buffer): Promise<void>;
  /** Full read, or null when the key is absent. Throws on transport faults. */
  get(key: string): Promise<Buffer | null>;
  /** Read the inclusive byte window [start, end], or null when absent/out of range. */
  getRange(key: string, start: number, end: number): Promise<Buffer | null>;
  /** Size probe, or null when the key is absent (directories are absent). */
  stat(key: string): Promise<{ size: number } | null>;
}

// ─── Pure key helpers (tests/modules/storage-sigv4.test.ts) ───────

/** The only namespaces the platform stores under. */
export const STORAGE_NAMESPACES = ['papers', 'materials'] as const;
export type StorageNamespace = (typeof STORAGE_NAMESPACES)[number];

/**
 * Build a storage key from a namespace and a filename that ALREADY carries
 * its `.pdf` extension (upload callers mint `<id>.pdf`; serving callers
 * pass the route param). Keys are exactly `<namespace>/<filename>.pdf`.
 */
export function buildStorageKey(namespace: StorageNamespace, filename: string): string {
  return `${namespace}/${filename}`;
}

/**
 * Key shape gate: exactly `<papers|materials>/<filename>.pdf`, flat (no
 * nested segments), no traversal (`..`), no backslash, no absolute key.
 * This is the driver-side belt — routes gate the filename earlier, and
 * LocalDriver additionally pins the resolved path inside its root, so a
 * hostile key needs three independent failures to reach the filesystem.
 */
export function storageKeyIsValid(key: string): boolean {
  if (key.includes('..') || key.includes('\\') || key.startsWith('/')) return false;
  const slash = key.indexOf('/');
  if (slash === -1) return false;
  const namespace = key.slice(0, slash);
  const filename = key.slice(slash + 1);
  if (namespace !== 'papers' && namespace !== 'materials') return false;
  if (filename.length === 0 || filename.includes('/')) return false;
  return filename.toLowerCase().endsWith('.pdf');
}

/** Serving URL for a paper file (the value stored in ResearchPaper.fileUrl). */
export function paperFilenameToFileUrl(filename: string): string {
  return `/api/v1/files/papers/${filename}`;
}

/** Serving path for a material file (the value stored in Material.url). */
export function materialFilenameToServingPath(filename: string): string {
  return `/api/v1/files/materials/${filename}`;
}

/**
 * Generate a storage id (also used as the Material row id on the file
 * upload route, where the row must exist before its key is known).
 * `'c' + randomUUID() without dashes` is cuid-shaped: it passes the
 * `z.string().cuid()` validation the platform applies to ids elsewhere
 * (c…, ≥8 chars, no whitespace/dashes), which is why a random UUID alone
 * is not used.
 */
export function generateStorageId(): string {
  return `c${randomUUID().replaceAll('-', '')}`;
}

// ─── Local filesystem driver ──────────────────────────────────────

/** Resolve the default storage root relative to this module — works for
 *  `backend/src/lib/` (dev) and `backend/dist/lib/` (prod) alike, landing
 *  on `backend/storage/` exactly where the pre-abstraction code served
 *  papers from, so local behavior is byte-identical. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORAGE_ROOT = path.resolve(__dirname, '../../storage');

function isNotFound(err: unknown): boolean {
  return (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/** fs/promises driver rooted at `root` (absolute). */
export class LocalDriver implements StorageDriver {
  constructor(public readonly root: string) {}

  /** Key → absolute path, with the shape gate AND the directory pin. */
  private resolveKey(key: string): string {
    if (!storageKeyIsValid(key)) {
      throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    }
    const full = path.resolve(this.root, key);
    // Directory pin against root + separator (never a bare startsWith —
    // that is the classic sibling-directory prefix bug).
    if (!full.startsWith(this.root + path.sep)) {
      throw new Error(`storage key escapes the storage root: ${JSON.stringify(key)}`);
    }
    return full;
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const full = this.resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
  }

  async get(key: string): Promise<Buffer | null> {
    const full = this.resolveKey(key);
    try {
      return await readFile(full);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  /** Uploads are capped at 20 MB, so read + slice is honest and simple
   *  (no partial-read file handles to keep correct). */
  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    const buf = await this.get(key);
    if (buf === null) return null;
    if (start < 0 || end < start || start >= buf.length) return null;
    return buf.subarray(start, Math.min(end + 1, buf.length));
  }

  async stat(key: string): Promise<{ size: number } | null> {
    const full = this.resolveKey(key);
    try {
      const s = await fsStat(full);
      return s.isFile() ? { size: s.size } : null;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }
}

// ─── AWS Signature V4 (pure pieces — exported for tests) ──────────

/** SHA-256 hex digest of a string (utf8) or Buffer. */
export function sha256Hex(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/** HMAC-SHA256 (key may be a raw Buffer — the signing-key chain form). */
export function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Canonical request per the SigV4 spec. `canonicalUri` must be the
 * percent-encoded path EXACTLY as sent on the wire (use the URL object's
 * pathname). `headers` values are trimmed; header names are lowercased
 * and sorted here. Layout:
 *   METHOD \n uri \n query \n <sorted "name:value" lines> \n \n
 *   signedHeaders \n payloadHash
 */
export function canonicalRequest(
  method: string,
  canonicalUri: string,
  canonicalQuery: string,
  headers: Record<string, string>,
  payloadHash: string,
): string {
  const names = Object.keys(headers).map((n) => n.toLowerCase()).sort();
  const canonicalHeaders =
    names.map((name) => `${name}:${headers[name]!.trim()}`).join('\n') + '\n';
  const signedHeaders = names.join(';');
  return [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
}

/** String-to-sign: algorithm \n amzDate \n credentialScope \n canonicalReqHash. */
export function stringToSign(amzDate: string, credentialScope: string, canonicalRequestHash: string): string {
  return ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalRequestHash].join('\n');
}

/** The HMAC chain kSecret→kDate→kRegion→kService→kSigning. */
export function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

/** The final Authorization header value. */
export function authorizationHeader(
  accessKeyId: string,
  credentialScope: string,
  signedHeaders: readonly string[],
  signature: string,
): string {
  return (
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`
  );
}

/**
 * Percent-encode a storage key for use in the request path. AWS SigV4
 * canonical-URI rules encode everything except unreserved chars and `/`;
 * `encodeURIComponent` covers our key charset and leaves `!'()*` bare, so
 * those are encoded explicitly.
 */
export function s3EncodeKey(key: string): string {
  return key
    .split('/')
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join('/');
}

// ─── S3-compatible driver ─────────────────────────────────────────

export interface S3DriverConfig {
  /** Service endpoint, e.g. `https://<account>.r2.cloudflarestorage.com` or MinIO origin. */
  endpoint: string;
  /** Region (`auto` is the R2 convention and works for it). */
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

const S3_PUT_TIMEOUT_MS = 60_000;
const S3_READ_TIMEOUT_MS = 30_000;

/**
 * S3-compatible driver (AWS S3 / Cloudflare R2 / MinIO) over global fetch.
 * Signing: AWS SigV4 with the x-amz-content-sha256 header (payload fully
 * buffered, so the real payload hash is used — no UNSIGNED-PAYLOAD).
 * getRange uses a GET with a Range header; a store that ignores Range and
 * answers 200 with the full object is handled by slicing (honest fallback,
 * bounded by the 20 MB upload cap).
 */
export class S3Driver implements StorageDriver {
  constructor(private readonly cfg: S3DriverConfig) {}

  private objectUrl(key: string): URL {
    const base = this.cfg.endpoint.replace(/\/+$/, '');
    // Path-style addressing: works with R2/MinIO and plain S3.
    return new URL(`${base}/${this.cfg.bucket}/${s3EncodeKey(key)}`);
  }

  private async signedRequest(
    method: 'GET' | 'HEAD' | 'PUT',
    key: string,
    opts: { body?: Buffer; range?: { start: number; end: number } } = {},
  ): Promise<Response> {
    const url = this.objectUrl(key);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = opts.body ? sha256Hex(opts.body) : sha256Hex('');
    const headers: Record<string, string> = {
      // fetch sends Host from the URL — sign exactly that value.
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (opts.range) headers.range = `bytes=${opts.range.start}-${opts.range.end}`;

    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const canonical = canonicalRequest(method, url.pathname, '', headers, payloadHash);
    const signature = hmacSha256(
      signingKey(this.cfg.secretAccessKey, dateStamp, this.cfg.region, 's3'),
      stringToSign(amzDate, credentialScope, sha256Hex(canonical)),
    ).toString('hex');
    const signedHeaderNames = Object.keys(headers).map((n) => n.toLowerCase()).sort();

    const init: RequestInit = {
      method,
      headers: {
        ...headers,
        Authorization: authorizationHeader(this.cfg.accessKeyId, credentialScope, signedHeaderNames, signature),
      },
      signal: AbortSignal.timeout(method === 'PUT' ? S3_PUT_TIMEOUT_MS : S3_READ_TIMEOUT_MS),
    };
    if (opts.body) init.body = new Uint8Array(opts.body);
    return fetch(url, init);
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    let res: Response;
    try {
      res = await this.signedRequest('PUT', key, { body: bytes });
    } catch (err) {
      logger.error({ err, key, bucket: this.cfg.bucket }, 's3 put: request failed');
      throw new Error(`S3 PUT request failed for key ${key}`, { cause: err });
    }
    if (!res.ok) {
      // Error XML is store-side diagnostics — no credentials echo. Keep it
      // truncated so a misbehaving store can't flood the logs.
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      logger.error({ key, status: res.status, detail }, 's3 put: non-2xx response');
      throw new Error(`S3 PUT failed for key ${key} with status ${res.status}`, { cause: new Error(detail) });
    }
  }

  async get(key: string): Promise<Buffer | null> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    let res: Response;
    try {
      res = await this.signedRequest('GET', key);
    } catch (err) {
      logger.error({ err, key, bucket: this.cfg.bucket }, 's3 get: request failed');
      throw new Error(`S3 GET request failed for key ${key}`, { cause: err });
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      logger.error({ key, status: res.status, detail }, 's3 get: non-2xx response');
      throw new Error(`S3 GET failed for key ${key} with status ${res.status}`, { cause: new Error(detail) });
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    let res: Response;
    try {
      res = await this.signedRequest('GET', key, { range: { start, end } });
    } catch (err) {
      logger.error({ err, key, bucket: this.cfg.bucket }, 's3 getRange: request failed');
      throw new Error(`S3 ranged GET request failed for key ${key}`, { cause: err });
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      logger.error({ key, status: res.status, detail }, 's3 getRange: non-2xx response');
      throw new Error(`S3 ranged GET failed for key ${key} with status ${res.status}`, { cause: new Error(detail) });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (res.status === 206) return buf;
    if (start >= buf.length) return null;
    // Store ignored the Range header (200 + full object) — slice honestly.
    return buf.subarray(start, Math.min(end + 1, buf.length));
  }

  async stat(key: string): Promise<{ size: number } | null> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    let res: Response;
    try {
      res = await this.signedRequest('HEAD', key);
    } catch (err) {
      logger.error({ err, key, bucket: this.cfg.bucket }, 's3 stat: request failed');
      throw new Error(`S3 HEAD request failed for key ${key}`, { cause: err });
    }
    if (res.status === 404) return null;
    if (!res.ok) {
      logger.error({ key, status: res.status }, 's3 stat: non-2xx response');
      throw new Error(`S3 HEAD failed for key ${key} with status ${res.status}`);
    }
    const len = res.headers.get('content-length');
    const size = len === null ? Number.NaN : Number(len);
    if (!Number.isInteger(size) || size < 0) {
      throw new Error(`S3 HEAD for key ${key} returned an unusable content-length`);
    }
    return { size };
  }
}

// ─── Driver selection ─────────────────────────────────────────────

/** The env slice the driver selection depends on (env.ts's parsed output
 *  satisfies it; tests inject their own object into buildDriver). */
export interface StorageEnv {
  STORAGE_DRIVER: 'local' | 's3';
  STORAGE_DIR?: string | undefined;
  S3_ENDPOINT?: string | undefined;
  S3_REGION: string;
  S3_BUCKET?: string | undefined;
  S3_ACCESS_KEY_ID?: string | undefined;
  S3_SECRET_ACCESS_KEY?: string | undefined;
}

/**
 * Pure factory: env slice → driver. env.ts already fails closed at boot on
 * a half-configured s3 driver; this guard is defense for direct callers.
 */
export function buildDriver(e: StorageEnv): StorageDriver {
  if (e.STORAGE_DRIVER === 's3') {
    const missing: string[] = [];
    if (!e.S3_ENDPOINT) missing.push('S3_ENDPOINT');
    if (!e.S3_BUCKET) missing.push('S3_BUCKET');
    if (!e.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
    if (!e.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
    if (missing.length > 0) {
      throw new Error(`STORAGE_DRIVER=s3 requires: ${missing.join(', ')}`);
    }
    return new S3Driver({
      endpoint: e.S3_ENDPOINT!,
      region: e.S3_REGION,
      bucket: e.S3_BUCKET!,
      accessKeyId: e.S3_ACCESS_KEY_ID!,
      secretAccessKey: e.S3_SECRET_ACCESS_KEY!,
    });
  }
  return new LocalDriver(e.STORAGE_DIR ? path.resolve(e.STORAGE_DIR) : DEFAULT_STORAGE_ROOT);
}

let cachedDriver: StorageDriver | null = null;

/** Memoized driver from the process env. */
export function getStorage(): StorageDriver {
  if (cachedDriver === null) {
    cachedDriver = buildDriver(env);
    if (env.isProd && env.STORAGE_DRIVER === 'local') {
      logger.warn(
        'STORAGE_DRIVER=local in production: the disk is ephemeral — uploaded PDFs will NOT survive ' +
          'redeploys. Set STORAGE_DRIVER=s3 with S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/' +
          'S3_SECRET_ACCESS_KEY for persistence (see docs/12-deployment.md).',
      );
    }
  }
  return cachedDriver;
}

// Boot-time eager init: constructing the driver is pure (no I/O — the
// first real read/write happens on request), and warming it here surfaces
// the production ephemeral-disk warning at boot instead of on the first
// upload. Skipped in tests so they stay hermetic.
if (env.NODE_ENV !== 'test') void getStorage();
