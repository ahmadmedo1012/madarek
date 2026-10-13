/**
 * Backend unit test — the pure AWS SigV4 signing pieces + key guards of
 * `backend/src/lib/storage.ts` (P3-BE, real uploads).
 *
 * The S3 driver signs requests with a hand-rolled SigV4 (node:crypto
 * only — no new deps). Signing bugs are silent (the store answers 403
 * with zero context), so every step of the pipeline is pinned against a
 * FIXED test vector: fixed method/path/headers/payloadHash/secret/date/
 * region → the canonical request, its hash, the string-to-sign, the
 * derived signing key, the signature, and the final Authorization
 * header are all deterministic hex/text literals computed once and
 * hardcoded below. Any change to the signing pipeline fails here.
 *
 * Credentials in the vector are synthetic scanner-safe fakes, not real
 * secrets (no service will ever accept them).
 */
import { describe, expect, it } from 'vitest';
import {
  authorizationHeader,
  buildStorageKey,
  canonicalRequest,
  generateStorageId,
  materialFilenameToServingPath,
  paperFilenameToFileUrl,
  s3EncodeKey,
  sha256Hex,
  signingKey,
  storageKeyIsValid,
  stringToSign,
} from '../../src/lib/storage.js';

// ─── The fixed test vector ─────────────────────────────────────────

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

const VECTOR = {
  method: 'PUT',
  path: '/madarek-files/papers/cku5c2x9p0000upload.pdf',
  query: '',
  headers: {
    host: 'storage.example.com',
    'x-amz-content-sha256': EMPTY_SHA256,
    'x-amz-date': '20260101T000000Z',
  },
  payloadHash: EMPTY_SHA256,
  accessKeyId: 'test-example-access-key',
  secretAccessKey: 'test-example-secret-key-not-real-000',
  dateStamp: '20260101',
  region: 'auto',
  service: 's3',
} as const;

// Expected outputs (deterministic — see the file header).
const EXPECTED_CANONICAL_REQUEST =
  'PUT\n' +
  '/madarek-files/papers/cku5c2x9p0000upload.pdf\n' +
  '\n' +
  'host:storage.example.com\n' +
  'x-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n' +
  'x-amz-date:20260101T000000Z\n' +
  '\n' +
  'host;x-amz-content-sha256;x-amz-date\n' +
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const EXPECTED_CANONICAL_HASH = '687f25af7963de21415f60d5f1d8c5398d7a56e75a3b6372c0c64d64f4cfe756';
const EXPECTED_STRING_TO_SIGN =
  'AWS4-HMAC-SHA256\n' +
  '20260101T000000Z\n' +
  '20260101/auto/s3/aws4_request\n' +
  '687f25af7963de21415f60d5f1d8c5398d7a56e75a3b6372c0c64d64f4cfe756';
const EXPECTED_SIGNING_KEY_HEX = 'e56dd93e0cf74e01c0b53dab9b93839d97e6453493f76ed5df5d14d79c94b49d';
const EXPECTED_SIGNATURE = '46b72bbaec22b9576db51062d61021a2bffd95be7e6ce532e7f27ab44ef33223';
const EXPECTED_AUTH_HEADER =
  'AWS4-HMAC-SHA256 Credential=test-example-access-key/20260101/auto/s3/aws4_request, ' +
  'SignedHeaders=host;x-amz-content-sha256;x-amz-date, ' +
  'Signature=46b72bbaec22b9576db51062d61021a2bffd95be7e6ce532e7f27ab44ef33223';

describe('sha256Hex', () => {
  it('matches the well-known empty-string digest', () => {
    expect(sha256Hex('')).toBe(EMPTY_SHA256);
  });

  it('hashes buffers and strings identically (utf8)', () => {
    expect(sha256Hex(Buffer.from('madarek', 'utf8'))).toBe(sha256Hex('madarek'));
  });
});

describe('canonicalRequest', () => {
  it('produces the exact pinned vector (method/uri/query/sorted headers/signed list/payload)', () => {
    expect(
      canonicalRequest(VECTOR.method, VECTOR.path, VECTOR.query, { ...VECTOR.headers }, VECTOR.payloadHash),
    ).toBe(EXPECTED_CANONICAL_REQUEST);
  });

  it('sorts header names independently of insertion order (signature order is the sorted order)', () => {
    const shuffled = {
      'x-amz-date': '20260101T000000Z',
      host: 'storage.example.com',
      'x-amz-content-sha256': EMPTY_SHA256,
    };
    expect(canonicalRequest('GET', '/b/k', '', shuffled, EMPTY_SHA256)).toBe(
      canonicalRequest('GET', '/b/k', '', { ...VECTOR.headers }, EMPTY_SHA256),
    );
  });

  it('trims header values (folded header whitespace must not break the signature)', () => {
    expect(
      canonicalRequest('GET', '/b/k', '', { host: '  storage.example.com  ' }, EMPTY_SHA256),
    ).toBe(canonicalRequest('GET', '/b/k', '', { host: 'storage.example.com' }, EMPTY_SHA256));
  });

  it('keeps a non-empty query line in its own slot (position 3)', () => {
    const out = canonicalRequest('GET', '/b/k', 'prefix=x', { host: 'h' }, EMPTY_SHA256);
    expect(out.split('\n')[2]).toBe('prefix=x');
  });
});

describe('stringToSign', () => {
  it('is the pinned 4-line vector (algorithm, amzDate, scope, canonical hash)', () => {
    expect(stringToSign('20260101T000000Z', '20260101/auto/s3/aws4_request', EXPECTED_CANONICAL_HASH)).toBe(
      EXPECTED_STRING_TO_SIGN,
    );
  });
});

describe('signingKey', () => {
  it('derives the pinned HMAC chain hex (AWS4+secret → date → region → service → aws4_request)', () => {
    expect(
      signingKey(VECTOR.secretAccessKey, VECTOR.dateStamp, VECTOR.region, VECTOR.service).toString('hex'),
    ).toBe(EXPECTED_SIGNING_KEY_HEX);
  });

  it('is deterministic and input-sensitive (region change → different key)', () => {
    const k1 = signingKey(VECTOR.secretAccessKey, '20260101', 'auto', 's3');
    const k2 = signingKey(VECTOR.secretAccessKey, '20260101', 'auto', 's3');
    const k3 = signingKey(VECTOR.secretAccessKey, '20260101', 'us-east-1', 's3');
    expect(k1.equals(k2)).toBe(true);
    expect(k1.equals(k3)).toBe(false);
  });
});

describe('authorizationHeader', () => {
  it('composes the pinned header for the full vector', () => {
    expect(
      authorizationHeader(
        VECTOR.accessKeyId,
        '20260101/auto/s3/aws4_request',
        ['host', 'x-amz-content-sha256', 'x-amz-date'],
        EXPECTED_SIGNATURE,
      ),
    ).toBe(EXPECTED_AUTH_HEADER);
  });
});

describe('s3EncodeKey', () => {
  it('passes plain cuid keys through untouched (the only charset the platform mints)', () => {
    expect(s3EncodeKey('papers/cku5c2x9p0000upload.pdf')).toBe('papers/cku5c2x9p0000upload.pdf');
    expect(s3EncodeKey('materials/c8075677811f541b6b253cb797db2adc.pdf')).toBe(
      'materials/c8075677811f541b6b253cb797db2adc.pdf',
    );
  });

  it('percent-encodes unsafe characters (space → %20)', () => {
    expect(s3EncodeKey('papers/my file.pdf')).toBe('papers/my%20file.pdf');
  });
});

describe('buildStorageKey + storageKeyIsValid (key shape guards)', () => {
  it('builds exactly <namespace>/<filename>', () => {
    expect(buildStorageKey('papers', 'c123.pdf')).toBe('papers/c123.pdf');
    expect(buildStorageKey('materials', 'c123.pdf')).toBe('materials/c123.pdf');
  });

  it('accepts the keys the platform actually mints (cuid + .pdf)', () => {
    const filename = `${generateStorageId()}.pdf`;
    expect(storageKeyIsValid(`papers/${filename}`)).toBe(true);
    expect(storageKeyIsValid(`materials/${filename}`)).toBe(true);
  });

  it('rejects traversal, absolute, backslash, and nested keys', () => {
    expect(storageKeyIsValid('papers/../secret.pdf')).toBe(false);
    expect(storageKeyIsValid('papers/..\\secret.pdf')).toBe(false);
    expect(storageKeyIsValid('/papers/secret.pdf')).toBe(false);
    expect(storageKeyIsValid('papers/a/b.pdf')).toBe(false); // flat only
    expect(storageKeyIsValid('papers//b.pdf')).toBe(false); // empty segment
    expect(storageKeyIsValid('papers/')).toBe(false);
  });

  it('rejects unknown namespaces and non-pdf keys', () => {
    expect(storageKeyIsValid('uploads/x.pdf')).toBe(false);
    expect(storageKeyIsValid('papers/x.txt')).toBe(false);
    expect(storageKeyIsValid('papers/x.pdf.exe')).toBe(false);
    expect(storageKeyIsValid('papers')).toBe(false);
    expect(storageKeyIsValid('')).toBe(false);
  });
});

describe('serving-path helpers', () => {
  it('maps filenames to the API serving routes (the values stored in DB rows)', () => {
    expect(paperFilenameToFileUrl('c1.pdf')).toBe('/api/v1/files/papers/c1.pdf');
    expect(materialFilenameToServingPath('c1.pdf')).toBe('/api/v1/files/materials/c1.pdf');
  });

  it('generates cuid-shaped ids (c…, no dashes — z.string().cuid() compatible)', () => {
    const id = generateStorageId();
    expect(id).toMatch(/^c[0-9a-f]{32}$/);
    expect(id).not.toContain('-');
  });
});
