/**
 * SigV4 QUERY presigning (r323 B2.1) — the direct-upload path for the
 * lectures namespace. The browser PUTs bytes straight to the S3-compatible
 * store (R2/B2/MinIO/AWS), so Render's ephemeral disk and the backend's
 * memory never see a lecture-sized payload.
 *
 * Header-based auth (S3Driver.signedRequest) cannot cross the process
 * boundary — the browser would need the secret key. Query presigning moves
 * the signature into the URL itself: the backend mints a bounded-lifetime
 * URL for ONE method on ONE key, the browser uses it blind.
 *
 * House rules kept: node:crypto only, no new npm deps; every input that
 * reaches a signature is length- or shape-gated; the presigned URL NEVER
 * carries credentials beyond the signature itself.
 *
 * Spec: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 * The only deliberate difference from the header flow: the payload hash is
 * the literal `UNSIGNED-PAYLOAD` (the browser streams the body — hashing
 * gigabytes client-side in JS is not a trade this platform makes), and the
 * only signed header is `host`.
 */
import { hmacSha256, sha256Hex, s3EncodeKey } from './storage.js';

export interface PresignTarget {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  /** Path-style base, e.g. https://account.r2.cloudflarestorage.com */
  endpoint: string;
}

/** The literal payload hash for streamed bodies (spec constant). */
export const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD';

/** Presigned URLs are short-lived: 15 min is the cap this platform mints. */
export const MAX_PRESIGN_EXPIRES_SEC = 900;

export interface PresignParams {
  method: 'PUT' | 'GET';
  /** Storage key, e.g. `lectures/cabc123.mp4` (NOT percent-encoded). */
  key: string;
  /** Lifetime in seconds — clamped to [60, MAX_PRESIGN_EXPIRES_SEC]. */
  expiresInSec: number;
  /**
   * Extra query parameters that MUST participate in the signature —
   * multipart uploads sign `partNumber` + `uploadId` per part.
   */
  extraQuery?: Record<string, string>;
  /** Injectable clock for tests (ISO instant). Defaults to now. */
  now?: Date;
}

/**
 * Percent-encode a query VALUE per SigV4 canonicalization: everything
 * except unreserved chars; space becomes `%20` (NOT `+`).
 */
export function s3EncodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Build the canonical (sorted, encoded) query string from raw params. */
export function canonicalQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((name) => `${s3EncodeQueryValue(name)}=${s3EncodeQueryValue(params[name]!)}`)
    .join('&');
}

/**
 * Mint ONE presigned URL. Pure given its inputs (the amzDate derives from
 * `now`), so tests pin exact signatures against fixed vectors.
 */
export function presignS3Url(cfg: PresignTarget, params: PresignParams): string {
  const expires = Math.min(Math.max(Math.trunc(params.expiresInSec), 60), MAX_PRESIGN_EXPIRES_SEC);
  const amzDate = (params.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;

  const base = cfg.endpoint.replace(/\/+$/, '');
  const url = new URL(`${base}/${cfg.bucket}/${s3EncodeKey(params.key)}`);

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host',
    ...params.extraQuery,
  };

  // Canonical request: only `host` is signed; the browser's fetch/UA
  // headers stay unsigned and the store ignores them.
  const canonical = [
    params.method,
    url.pathname,
    canonicalQueryString(query),
    `host:${url.host}\n`,
    'host',
    UNSIGNED_PAYLOAD,
  ].join('\n');

  const signature = hmacSha256(
    // signingKey chain re-derived here (import cycle safety: this module
    // imports only the pure crypto helpers, not the driver).
    (() => {
      // local re-implementation of the kDate→kService→kSigning chain via
      // the same hmacSha256 primitive — byte-identical to signingKey().
      const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
      const kRegion = hmacSha256(kDate, cfg.region);
      const kService = hmacSha256(kRegion, 's3');
      return hmacSha256(kService, 'aws4_request');
    })(),
    sha256Hex(canonical),
  ).toString('hex');

  url.search = canonicalQueryString({ ...query, 'X-Amz-Signature': signature });
  return url.toString();
}

/**
 * Presign every part of a multipart upload. `partNumbers` are 1-based
 * (S3 contract), `uploadId` comes from CreateMultipartUpload.
 */
export function presignS3MultipartParts(
  cfg: PresignTarget,
  key: string,
  uploadId: string,
  partNumbers: readonly number[],
  expiresInSec: number,
  now?: Date,
): { partNumber: number; url: string }[] {
  return partNumbers.map((partNumber) => ({
    partNumber,
    url: presignS3Url(cfg, {
      method: 'PUT',
      key,
      expiresInSec,
      extraQuery: {
        partNumber: String(partNumber),
        // RAW value — canonicalQueryString() encodes every param exactly once.
        uploadId,
      },
      now,
    }),
  }));
}

/**
 * Parse `<UploadId>` out of a CreateMultipartUpload response body.
 * Hand-rolled on purpose (house style: no XML parser dep) — the store's
 * response shape is fixed by the S3 spec and the value is an opaque
 * server-minted token that we only echo back.
 */
export function parseUploadId(xml: string): string | null {
  const match = /<UploadId>\s*([^<]+?)\s*<\/UploadId>/.exec(xml);
  return match === null ? null : match[1]!;
}

/**
 * Build the CompleteMultipartUpload XML body. Parts MUST be in ascending
 * partNumber order (S3 rejects unordered manifests) — sorted here so the
 * caller cannot get it wrong. ETags are echoed verbatim (the store
 * compares them byte-exactly, quotes included).
 */
export function buildCompleteMultipartXml(
  parts: readonly { partNumber: number; etag: string }[],
): string {
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const body = sorted
    .map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
    .join('');
  return `<CompleteMultipartUpload>${body}</CompleteMultipartUpload>`;
}

/** sha256 re-export so route tests can pin payload hashes without importing crypto. */
export { sha256Hex };
