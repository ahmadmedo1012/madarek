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
 *     half-configured s3 driver at boot) or STORAGE_DRIVER=postgres.
 *   - S3Driver: any S3-compatible object store (AWS S3, Cloudflare R2,
 *     MinIO) via global fetch + a hand-rolled AWS Signature V4 — node:crypto
 *     only, NO new npm deps (house style). Path-style addressing
 *     (`${endpoint}/${bucket}/${key}`) which R2/MinIO require.
 *   - PostgresDriver (r175): BYTEA rows in the application's own
 *     PostgreSQL — the durable pilot choice for Render Free (no
 *     persistent disks on that plan, no new infrastructure, no new
 *     charge). Honors the exact same StorageDriver contract and the
 *     same canonical keys; honest scope: bytes ride the app's primary
 *     database, so this is a bounded 5–10-student-pilot trade-off,
 *     not an object-store architecture.
 *
 * Pure key/signing helpers are exported for DB-free unit tests
 * (tests/modules/storage-sigv4.test.ts, storage-driver.test.ts).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, stat as fsStat, writeFile } from 'node:fs/promises';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { env } from '../env.js';
import {
  buildCompleteMultipartXml,
  parseUploadId,
  presignS3Url,
} from './storage-presign.js';
import { logger } from '../logger.js';
import { prisma } from '../db.js';

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
export const STORAGE_NAMESPACES = ['papers', 'materials', 'lectures'] as const;
export type StorageNamespace = (typeof STORAGE_NAMESPACES)[number];

/**
 * Video filename gates (r323 B2.1) — the lectures namespace.
 * Only container formats every target browser decodes natively (no
 * transcode tier exists yet — honest scope): MP4/H.264 + WebM + the
 * MPEG-4 audio twin and Ogg. The upload route's zod layer repeats the
 * extension check; this is the driver-side belt.
 */
export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m4v', '.ogv', '.ogg'] as const;

export function isVideoFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Aggregate video filename gate: a BARE filename (no path segments, no
 * traversal shape, no control characters) with a known video extension.
 * Mirrors isSafePaperFilename's belt order — shape first, extension last.
 */
export function isSafeVideoFilename(filename: string): boolean {
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return false;
  for (let i = 0; i < filename.length; i += 1) {
    const code = filename.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return isVideoFilename(filename);
}

/** Serving path for a lecture video (the value stored in Lecture.videoUrl). */
export function lectureFilenameToServingPath(filename: string): string {
  return `/api/v1/files/lectures/${filename}`;
}

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
  // Control characters (r170c): a NUL byte reaches Node fs as an
  // ERR_INVALID_ARG_VALUE throw and Postgres (via callers' queries) as
  // invalid UTF-8 — both 500s, both client-mintable. No key this
  // platform writes ever carries a C0 control or DEL byte.
  for (let i = 0; i < key.length; i += 1) {
    const code = key.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
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
    if (opts.body) {
      // r166d: declare the body's type. The ONLY put() producers are the
      // two PDF upload routes (files.routes papers + offerings.routes
      // materials — both express.raw('application/pdf')), so a body always
      // IS a PDF; without this header objects land as the store's default
      // application/octet-stream. Signed like every other header (the
      // canonical request picks it up through the sorted header set — the
      // fixed vector in storage-sigv4.test.ts was recomputed for it).
      headers['content-type'] = 'application/pdf';
    }
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

  // ── r323 B2.1: direct-upload plumbing (presign + multipart) ──────
  // The browser PUTs lecture bytes STRAIGHT to the store through
  // presigned URLs (storage-presign.ts), so ephemeral disks and backend
  // memory never see a video-sized payload. These methods run ONLY on
  // the backend; the URLs they mint are the whole browser contract.

  private presignTarget() {
    return { ...this.cfg };
  }

  /** Presigned GET for the serving route's 302 redirect (short-lived). */
  presignGetUrl(key: string, expiresInSec: number): string {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    return presignS3Url(this.presignTarget(), { method: 'GET', key, expiresInSec });
  }

  /** Presigned single PUT (the ≤ single-cap direct upload). */
  presignPutUrl(key: string, expiresInSec: number): string {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    return presignS3Url(this.presignTarget(), { method: 'PUT', key, expiresInSec });
  }

  /** CreateMultipartUpload — returns the store-minted uploadId token. */
  async createMultipartUpload(key: string): Promise<string> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    const url = this.objectUrl(key);
    url.search = 'uploads';
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const headers = { host: url.host, 'x-amz-content-sha256': sha256Hex(''), 'x-amz-date': amzDate };
    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const canonical = canonicalRequest('POST', url.pathname, 'uploads', headers, sha256Hex(''));
    const signature = hmacSha256(
      signingKey(this.cfg.secretAccessKey, dateStamp, this.cfg.region, 's3'),
      stringToSign(amzDate, credentialScope, sha256Hex(canonical)),
    ).toString('hex');
    const signedNames = Object.keys(headers).map((n) => n.toLowerCase()).sort();
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          Authorization: authorizationHeader(this.cfg.accessKeyId, credentialScope, signedNames, signature),
        },
        signal: AbortSignal.timeout(S3_PUT_TIMEOUT_MS),
      });
    } catch (err) {
      throw new Error(`S3 CreateMultipartUpload failed for key ${key}`, { cause: err });
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      throw new Error(`S3 CreateMultipartUpload failed with status ${res.status}`, { cause: new Error(detail) });
    }
    const uploadId = parseUploadId(await res.text());
    if (uploadId === null) throw new Error(`S3 CreateMultipartUpload returned no UploadId for key ${key}`);
    return uploadId;
  }

  /** Presign one part PUT (partNumber is 1-based, per the S3 contract). */
  presignPartUrl(key: string, uploadId: string, partNumber: number, expiresInSec: number): string {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
      throw new Error(`partNumber out of range: ${partNumber}`);
    }
    return presignS3Url(this.presignTarget(), {
      method: 'PUT',
      key,
      expiresInSec,
      extraQuery: { partNumber: String(partNumber), uploadId },
    });
  }

  /** CompleteMultipartUpload — verifies 2xx, throws the store's error otherwise. */
  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: readonly { partNumber: number; etag: string }[],
  ): Promise<void> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    if (parts.length === 0) throw new Error('CompleteMultipartUpload requires at least one part');
    const url = this.objectUrl(key);
    url.search = `uploadId=${encodeURIComponent(uploadId)}`;
    const body = Buffer.from(buildCompleteMultipartXml(parts), 'utf8');
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);
    const headers = { host: url.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const canonical = canonicalRequest('POST', url.pathname, `uploadId=${encodeURIComponent(uploadId)}`, headers, payloadHash);
    const signature = hmacSha256(
      signingKey(this.cfg.secretAccessKey, dateStamp, this.cfg.region, 's3'),
      stringToSign(amzDate, credentialScope, sha256Hex(canonical)),
    ).toString('hex');
    const signedNames = Object.keys(headers).map((n) => n.toLowerCase()).sort();
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          Authorization: authorizationHeader(this.cfg.accessKeyId, credentialScope, signedNames, signature),
        },
        body: new Uint8Array(body),
        signal: AbortSignal.timeout(S3_PUT_TIMEOUT_MS),
      });
    } catch (err) {
      throw new Error(`S3 CompleteMultipartUpload failed for key ${key}`, { cause: err });
    }
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 500);
      throw new Error(`S3 CompleteMultipartUpload failed with status ${res.status}`, { cause: new Error(detail) });
    }
  }
}

// ─── PostgreSQL driver (r175 — durable pilot storage on Render Free) ─

/** The prisma `binaryObject` model surface the driver consumes —
 * duck-typed so DB-free unit tests inject an in-memory fake without
 * constructing PrismaClient (the same seam shape the route tests use
 * for the whole prisma object). Note the asymmetry mirrors Prisma's
 * `Bytes` scalar: create/update inputs take `Buffer`, findUnique's
 * select returns `Uint8Array`. */
export interface BinaryObjectModel {
  upsert(args: {
    where: { key: string };
    create: { key: string; bytes: Buffer; size: number };
    update: { bytes: Buffer; size: number };
  }): Promise<unknown>;
  findUnique(args: {
    where: { key: string };
    select: { bytes: boolean; size: boolean };
  }): Promise<{ bytes?: Uint8Array; size?: number } | null>;
}

/**
 * BYTEA-backed driver over the application's own PostgreSQL. The key
 * gate, the missing-object semantics (null, never a fake empty file)
 * and the inclusive-range slice semantics are byte-identical to
 * LocalDriver's — routes and tests see one contract regardless of the
 * sink. Full-read + slice for getRange is the SAME deliberate choice
 * LocalDriver makes: uploads are capped at 20 MB, so honesty and
 * simplicity beat streaming plumbing at pilot scale.
 */
export class PostgresDriver implements StorageDriver {
  constructor(private readonly model: BinaryObjectModel) {}

  async put(key: string, bytes: Buffer): Promise<void> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    await this.model.upsert({
      where: { key },
      // Upsert, not create: re-uploading the same key (id collisions,
      // reruns) REPLACES the bytes rather than erroring the request —
      // the Local/S3 drivers' natural overwrite semantics.
      create: { key, bytes, size: bytes.length },
      update: { bytes, size: bytes.length },
    });
  }

  async get(key: string): Promise<Buffer | null> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    const row = await this.model.findUnique({ where: { key }, select: { bytes: true, size: true } });
    if (row === null) return null;
    // Prisma returns `Bytes` as a Uint8Array — copy into a Buffer so
    // .equals()/subarray() behave exactly like the other drivers.
    return Buffer.from(row.bytes ?? new Uint8Array());
  }

  async getRange(key: string, start: number, end: number): Promise<Buffer | null> {
    const buf = await this.get(key);
    if (buf === null) return null;
    if (start < 0 || end < start || start >= buf.length) return null;
    return buf.subarray(start, Math.min(end + 1, buf.length));
  }

  async stat(key: string): Promise<{ size: number } | null> {
    if (!storageKeyIsValid(key)) throw new Error(`invalid storage key: ${JSON.stringify(key)}`);
    const row = await this.model.findUnique({ where: { key }, select: { bytes: false, size: true } });
    // The stored `size` column is the truth (written on put from the
    // actual byte length); a row without a usable size is a contract
    // break, surfaced as a throw — never a guessed number.
    if (row === null) return null;
    if (typeof row.size !== 'number' || !Number.isInteger(row.size) || row.size < 0) {
      throw new Error(`postgres stat: unusable size for key ${key}`);
    }
    return { size: row.size };
  }
}

// ─── Driver selection ─────────────────────────────────────────────

/** The env slice the driver selection depends on (env.ts's parsed output
 *  satisfies it; tests inject their own object into buildDriver). */
export interface StorageEnv {
  STORAGE_DRIVER: 'local' | 's3' | 'postgres';
  STORAGE_DIR?: string | undefined;
  S3_ENDPOINT?: string | undefined;
  S3_REGION: string;
  S3_BUCKET?: string | undefined;
  S3_ACCESS_KEY_ID?: string | undefined;
  S3_SECRET_ACCESS_KEY?: string | undefined;
}

/** Injectable collaborators for buildDriver (r175): the postgres driver
 * needs the prisma binaryObject model. Production wiring passes the real
 * one (see getStorage); DB-free tests inject an in-memory fake. */
export interface BuildDriverDeps {
  binaryObject?: BinaryObjectModel;
}

/**
 * Pure factory: env slice → driver. env.ts already fails closed at boot on
 * a half-configured s3 driver; this guard is defense for direct callers.
 * The postgres branch fails loudly when the prisma model is not wired —
 * never silently degrades to local (same fail-closed ruling as s3).
 */
export function buildDriver(e: StorageEnv, deps: BuildDriverDeps = {}): StorageDriver {
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
  if (e.STORAGE_DRIVER === 'postgres') {
    if (!deps.binaryObject) {
      throw new Error(
        'STORAGE_DRIVER=postgres requires the prisma binaryObject model (getStorage wires it; ' +
          'direct callers pass deps.binaryObject)',
      );
    }
    return new PostgresDriver(deps.binaryObject);
  }
  return new LocalDriver(e.STORAGE_DIR ? path.resolve(e.STORAGE_DIR) : DEFAULT_STORAGE_ROOT);
}

let cachedDriver: StorageDriver | null = null;

/** Memoized driver from the process env. */
export function getStorage(): StorageDriver {
  if (cachedDriver === null) {
    // r175: the postgres driver rides the app's own prisma client —
    // same DATABASE_URL, same connection pool, no extra wiring.
    cachedDriver = buildDriver(env, { binaryObject: prisma.binaryObject });
    if (env.isProd && env.STORAGE_DRIVER === 'local') {
      logger.warn(
        'STORAGE_DRIVER=local in production: the disk is ephemeral — uploaded PDFs will NOT survive ' +
          'redeploys. Set STORAGE_DRIVER=s3 with S3_ENDPOINT/S3_REGION/S3_BUCKET/S3_ACCESS_KEY_ID/' +
          'S3_SECRET_ACCESS_KEY (or STORAGE_DRIVER=postgres for the bounded pilot mode) for ' +
          'persistence (see docs/12-deployment.md).',
      );
    }
    if (env.isProd && env.STORAGE_DRIVER === 'postgres') {
      logger.warn(
        'STORAGE_DRIVER=postgres: uploads persist as BYTEA rows in the application database — ' +
          'durable across redeploys, bounded by the 20 MB per-file cap and the per-user quota. ' +
          'This is the pilot-mode storage choice (5–10 students); plan object storage (s3) before ' +
          'scale (see docs/16-decisions-and-limitations.md).',
      );
    }
  }
  return cachedDriver;
}

// ─── Reachability probe (informational — never boot-blocking) ─────

/** probeStorage's outcome: reachable (the store ANSWERED) or not. */
export interface StorageProbe {
  ok: boolean;
  /** Error name + message excerpt when unreachable — log-shaped. */
  detail?: string;
}

/**
 * r166d: did the driver ANSWER a stat for a well-known key? An absent
 * object (stat → null — a 404 from the store) is still an ANSWER, so it
 * counts as reachable: the probe proves the transport + signing path
 * work, not that any object exists. A THROWN stat (transport fault,
 * non-2xx) marks the store unreachable with the error excerpt for logs.
 *
 * The default probe key rides the `papers` namespace because
 * storageKeyIsValid only admits <papers|materials>/<name>.pdf —
 * `health/probe.pdf` would be rejected by the drivers' own key gate
 * before any request left the process. stat-only: the probe never
 * writes a byte.
 *
 * ADVISORY ONLY — the result must never fail a request or a boot
 * (informational display for the owner console / boot log). Wiring
 * (r167): /owner/system now folds this probe into its storage block
 * through StorageReachabilityCache below — a memoized TTL so repeated
 * polls never hammer the store, plus a short race timeout so the S3
 * read timeout (worst case 30s) can never enter the route's critical
 * path. A stale or absent answer degrades to an omitted field, never
 * a block and never a guess.
 */
export async function probeStorage(
  driver: StorageDriver,
  key: string = 'papers/probe.pdf',
): Promise<StorageProbe> {
  try {
    await driver.stat(key);
    return { ok: true };
  } catch (err) {
    const e = err as Error;
    return { ok: false, detail: `${e.name}: ${e.message}` };
  }
}

// ─── Reachability memo for /owner/system (r167 — truthful + bounded) ─

/** The /owner/system-facing reachability value: the last probe ANSWER
 *  and when it landed. `null` (an absent field in the payload) means
 *  "not verified yet" — never a guessed green. */
export interface StorageReachability {
  reachable: boolean;
  /** ISO timestamp of the probe run that produced `reachable`. */
  checkedAt: string;
}

/** How long a completed probe answer stays authoritative — repeated
 *  /owner/system polls (30s frontend staleTime) must not hammer the
 *  store with probe requests. */
export const STORAGE_PROBE_TTL_MS = 60_000;

/** How long a reader may wait for the FIRST probe answer. Once any
 *  answer exists the cache serves it instantly (stale-while-revalidate)
 *  while a refresh runs in the background — so this bound is what
 *  keeps the S3 driver's 30s read timeout out of /owner/system. */
export const STORAGE_PROBE_RACE_MS = 2_500;

/** Everything injectable, so the cache's decision logic is unit-test
 *  DB-free, network-free and even timer-free (the repo canon: pure
 *  decisions tested directly, IO mocked at the boundary). */
export interface StorageReachabilityDeps {
  /** One probe run (the IO). Production: probeStorage(getStorage()). */
  probe: () => Promise<StorageProbe>;
  /** Wall clock in epoch ms. */
  now: () => number;
  /** The race sleep — injectable so tests control when the timeout
   *  fires (and prove the probe can win it). */
  sleep?: (ms: number) => Promise<void>;
  ttlMs?: number;
  raceMs?: number;
}

/**
 * The memo the /owner/system route reads (r167). Two guarantees, both
 * pinned by tests/modules/storage-reachability.test.ts:
 *   1. NEVER blocks long: a fresh memo answers with zero IO; a stale
 *      memo answers instantly while one refresh flight runs; only the
 *      FIRST-ever reader may wait, and only up to `raceMs`.
 *   2. NEVER rejects: a crashing probe folds into reachable:false (or
 *      null if it crashed before any answer existed) — the route can
 *      await this with no defensive try/catch of its own.
 */
export class StorageReachabilityCache {
  private readonly probe: () => Promise<StorageProbe>;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly ttlMs: number;
  private readonly raceMs: number;

  private value: StorageReachability | null = null;
  /** Epoch ms when `value` landed (drives the TTL). */
  private landedAt = 0;
  /** The single in-flight refresh — concurrent readers share it. */
  private inflight: Promise<void> | null = null;

  constructor(deps: StorageReachabilityDeps) {
    this.probe = deps.probe;
    this.now = deps.now;
    this.sleep = deps.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    this.ttlMs = deps.ttlMs ?? STORAGE_PROBE_TTL_MS;
    this.raceMs = deps.raceMs ?? STORAGE_PROBE_RACE_MS;
  }

  /** The memoized, race-bounded answer — never rejects. */
  async get(): Promise<StorageReachability | null> {
    try {
      if (this.value !== null && this.now() - this.landedAt < this.ttlMs) {
        return this.value; // fresh memo: zero IO, zero waiting.
      }
      if (this.inflight === null) {
        // Belt beyond probeStorage's own never-throw contract: even a
        // probe that CRASHES folds into an answer, and the flight slot
        // is always released so the next reader can retry.
        this.inflight = this.probe()
          .catch((): StorageProbe => ({ ok: false, detail: 'probe crashed' }))
          .then((probe) => {
            const at = this.now();
            this.value = { reachable: probe.ok, checkedAt: new Date(at).toISOString() };
            this.landedAt = at;
            this.inflight = null;
          })
          .catch(() => {
            this.inflight = null;
          });
      }
      if (this.value !== null) {
        // Stale-while-revalidate: the stale (still truthful — it says
        // WHEN it was checked) answer goes out NOW; the inflight refresh
        // above lands for the NEXT reader. No reader is ever blocked by
        // the refresh, let alone the S3 30s read timeout.
        return this.value;
      }
      // No answer has ever landed: this reader may wait for the first
      // flight, but only up to raceMs — then it honestly reports
      // "not verified yet" (null) while the flight keeps running.
      await Promise.race([this.inflight, this.sleep(this.raceMs)]);
      return this.value;
    } catch {
      return null; // never throws into the route.
    }
  }
}

let reachabilityCache: StorageReachabilityCache | null = null;

/**
 * The /owner/system wiring (r167): the probe's memoized, race-bounded
 * answer. The LOCAL driver short-circuits to null — the route's storage
 * block keeps its exact pre-r167 two-field shape for local (no probe
 * traffic for a driver whose "reachability" is the disk under the
 * process). Never rejects; safe to await inside the route.
 */
export function getStorageReachability(): Promise<StorageReachability | null> {
  if (env.STORAGE_DRIVER !== 's3') return Promise.resolve(null);
  if (reachabilityCache === null) {
    reachabilityCache = new StorageReachabilityCache({
      probe: () => probeStorage(getStorage()),
      now: () => Date.now(),
    });
  }
  return reachabilityCache.get();
}

// Boot-time eager init: constructing the driver is pure (no I/O — the
// first real read/write happens on request), and warming it here surfaces
// the production ephemeral-disk warning at boot instead of on the first
// upload. Skipped in tests so they stay hermetic.
if (env.NODE_ENV !== 'test') void getStorage();
