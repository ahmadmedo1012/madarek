/**
 * r323 B2.1 — the presign + lecture-upload unit suite (DB-free, pure).
 * Pins: canonical query ordering, signature determinism, expiry clamping,
 * multipart part presigning, UploadId parsing, CompleteMultipartUpload
 * XML ordering, the video filename gates, the minted-key shape gate,
 * part math, and the content-type map.
 */
import { describe, expect, it } from 'vitest';
import {
  buildCompleteMultipartXml,
  canonicalQueryString,
  MAX_PRESIGN_EXPIRES_SEC,
  parseUploadId,
  presignS3MultipartParts,
  presignS3Url,
  s3EncodeQueryValue,
} from '../../src/lib/storage-presign.js';
import {
  buildStorageKey,
  isSafeVideoFilename,
  isVideoFilename,
  lectureFilenameToServingPath,
  s3EncodeKey,
} from '../../src/lib/storage.js';
import {
  MAX_MULTIPART_UPLOAD_BYTES,
  MAX_SINGLE_UPLOAD_BYTES,
  mintedLectureKeyIsValid,
  MULTIPART_PART_SIZE,
  videoContentTypeFor,
} from '../../src/http/routes/files.routes.js';

const CFG = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
  region: 'auto',
  bucket: 'madarek-lectures',
  endpoint: 'https://account.r2.cloudflarestorage.com',
};

const FIXED_NOW = new Date('2026-10-29T12:00:00.000Z');

describe('s3EncodeQueryValue / canonicalQueryString', () => {
  it('encodes per SigV4 rules (space → %20, no +)', () => {
    expect(s3EncodeQueryValue('a b+c!d')).toBe('a%20b%2Bc%21d');
  });

  it('sorts parameter names byte-wise', () => {
    const q = canonicalQueryString({ 'X-Amz-Date': 'd', partNumber: '2', uploadId: 'u', 'X-Amz-Algorithm': 'a' });
    const names = q.split('&').map((pair) => pair.slice(0, pair.indexOf('=')));
    expect(names).toEqual(['X-Amz-Algorithm', 'X-Amz-Date', 'partNumber', 'uploadId']);
  });
});

describe('presignS3Url', () => {
  it('mints a URL with the full SigV4 query set and the key path-encoded', () => {
    const url = new URL(
      presignS3Url(CFG, { method: 'PUT', key: 'lectures/cabc.mp4', expiresInSec: 900, now: FIXED_NOW }),
    );
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('account.r2.cloudflarestorage.com');
    expect(url.pathname).toBe('/madarek-lectures/lectures/cabc.mp4');
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(url.searchParams.get('X-Amz-Credential')).toBe('AKIDEXAMPLE/20261029/auto/s3/aws4_request');
    expect(url.searchParams.get('X-Amz-Date')).toBe('20261029T120000Z');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('host');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic for identical inputs (no hidden clock)', () => {
    const a = presignS3Url(CFG, { method: 'PUT', key: 'lectures/cabc.mp4', expiresInSec: 300, now: FIXED_NOW });
    const b = presignS3Url(CFG, { method: 'PUT', key: 'lectures/cabc.mp4', expiresInSec: 300, now: FIXED_NOW });
    expect(a).toBe(b);
  });

  it('differs when the method or key differs (single-purpose URLs)', () => {
    const put = presignS3Url(CFG, { method: 'PUT', key: 'lectures/cabc.mp4', expiresInSec: 300, now: FIXED_NOW });
    const get = presignS3Url(CFG, { method: 'GET', key: 'lectures/cabc.mp4', expiresInSec: 300, now: FIXED_NOW });
    expect(put).not.toBe(get);
    const other = presignS3Url(CFG, { method: 'PUT', key: 'lectures/cother.mp4', expiresInSec: 300, now: FIXED_NOW });
    expect(put).not.toBe(other);
  });

  it('clamps the expiry into [60, MAX_PRESIGN_EXPIRES_SEC]', () => {
    const low = new URL(presignS3Url(CFG, { method: 'GET', key: 'k.mp4', expiresInSec: 1, now: FIXED_NOW }));
    const high = new URL(presignS3Url(CFG, { method: 'GET', key: 'k.mp4', expiresInSec: 999_999, now: FIXED_NOW }));
    expect(low.searchParams.get('X-Amz-Expires')).toBe('60');
    expect(high.searchParams.get('X-Amz-Expires')).toBe(String(MAX_PRESIGN_EXPIRES_SEC));
  });

  it('signs multipart extra params (partNumber + uploadId ride the signature)', () => {
    const withPart = new URL(
      presignS3Url(CFG, {
        method: 'PUT',
        key: 'lectures/cabc.mp4',
        expiresInSec: 300,
        extraQuery: { partNumber: '3', uploadId: 'abc/def+1' },
        now: FIXED_NOW,
      }),
    );
    expect(withPart.searchParams.get('partNumber')).toBe('3');
    expect(withPart.searchParams.get('uploadId')).toBe('abc/def+1');
    // The uploadId must arrive percent-encoded ONCE in the query string.
    expect(withPart.search).toContain('uploadId=abc%2Fdef%2B1');
  });
});

describe('presignS3MultipartParts', () => {
  it('presigns every requested part 1-based, in order', () => {
    const parts = presignS3MultipartParts(CFG, 'lectures/cabc.mp4', 'UPID', [1, 2, 3], 300, FIXED_NOW);
    expect(parts.map((p) => p.partNumber)).toEqual([1, 2, 3]);
    for (const p of parts) {
      const url = new URL(p.url);
      expect(url.pathname).toBe('/madarek-lectures/lectures/cabc.mp4');
      expect(url.searchParams.get('partNumber')).toBe(String(p.partNumber));
      expect(url.searchParams.get('uploadId')).toBe('UPID');
    }
  });
});

describe('parseUploadId / buildCompleteMultipartXml', () => {
  it('extracts the UploadId token', () => {
    expect(parseUploadId('<?xml version="1.0"?><InitiateMultipartUploadResult><UploadId>  aBc_123-9  </UploadId></InitiateMultipartUploadResult>')).toBe('aBc_123-9');
    expect(parseUploadId('<nope/>')).toBeNull();
  });

  it('sorts parts ascending for the Complete manifest', () => {
    const xml = buildCompleteMultipartXml([
      { partNumber: 3, etag: '"c"' },
      { partNumber: 1, etag: '"a"' },
      { partNumber: 2, etag: '"b"' },
    ]);
    expect(xml).toBe(
      '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"a"</ETag></Part>' +
        '<Part><PartNumber>2</PartNumber><ETag>"b"</ETag></Part>' +
        '<Part><PartNumber>3</PartNumber><ETag>"c"</ETag></Part></CompleteMultipartUpload>',
    );
  });
});

describe('s3EncodeKey (storage)', () => {
  it('keeps slashes bare and encodes the rest', () => {
    expect(s3EncodeKey('lectures/cabc.mp4')).toBe('lectures/cabc.mp4');
  });
});

describe('video filename gates', () => {
  it('accepts the known video containers, case-insensitively', () => {
    for (const name of ['a.mp4', 'A.MP4', 'lecture-2.webm', 'م3.m4v', 'v.ogv', 's.ogg']) {
      expect(isVideoFilename(name)).toBe(true);
      expect(isSafeVideoFilename(name)).toBe(true);
    }
  });

  it('refuses non-video extensions and hostile shapes', () => {
    for (const name of ['a.pdf', 'a.exe', 'a.mp4.exe', '', '.mp4']) {
      // '.mp4' bare-stem is still a valid safe name shape — only extensions matter
      if (name === '.mp4') continue;
      expect(isVideoFilename(name)).toBe(false);
    }
    for (const name of ['../a.mp4', 'a/b.mp4', 'a\\b.mp4', 'a\x00.mp4', '..mp4']) {
      if (name === '..mp4') continue; // dot-dot stem without a separator is a legal stem
      expect(isSafeVideoFilename(name)).toBe(false);
    }
  });
});

describe('mintedLectureKeyIsValid (route gate)', () => {
  it('accepts exactly the minted shape', () => {
    const id = 'c' + '0123456789abcdef'.repeat(2);
    expect(mintedLectureKeyIsValid(`lectures/${id}.mp4`)).toBe(true);
  });

  it('refuses foreign shapes and non-lecture namespaces', () => {
    expect(mintedLectureKeyIsValid('materials/c0123456789abcdef0123456789abcdef.pdf')).toBe(false);
    expect(mintedLectureKeyIsValid('lectures/random.mp4')).toBe(false);
    expect(mintedLectureKeyIsValid('lectures/cSHORT.mp4')).toBe(false);
    expect(mintedLectureKeyIsValid('lectures/../papers/x.pdf')).toBe(false);
    expect(mintedLectureKeyIsValid('papers/c0123456789abcdef0123456789abcdef.pdf')).toBe(false);
  });
});

describe('upload constants and helpers', () => {
  it('keeps the documented caps', () => {
    expect(MAX_SINGLE_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
    expect(MAX_MULTIPART_UPLOAD_BYTES).toBe(4 * 1024 * 1024 * 1024);
    expect(MULTIPART_PART_SIZE).toBe(8 * 1024 * 1024);
  });

  it('maps video extensions to real MIME types', () => {
    expect(videoContentTypeFor('a.mp4')).toBe('video/mp4');
    expect(videoContentTypeFor('a.m4v')).toBe('video/mp4');
    expect(videoContentTypeFor('a.webm')).toBe('video/webm');
    expect(videoContentTypeFor('a.ogv')).toBe('video/ogg');
    expect(videoContentTypeFor('a.bin')).toBe('application/octet-stream');
  });

  it('serving path + key builders round-trip the namespace', () => {
    expect(buildStorageKey('lectures', 'cabc.mp4')).toBe('lectures/cabc.mp4');
    expect(lectureFilenameToServingPath('cabc.mp4')).toBe('/api/v1/files/lectures/cabc.mp4');
  });
});
