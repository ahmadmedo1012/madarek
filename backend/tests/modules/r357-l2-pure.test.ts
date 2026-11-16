/**
 * r357 L2 — the PURE law set: signed document URLs (lib/doc-urls.ts),
 * photo-ZIP planning (lib/photo-zip.ts), and the byte sniffers
 * (profiles.routes.ts exports). DB-free, network-free, clock-injected.
 */
import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';

import {
  mintDocSignature,
  verifyDocSignature,
  DOC_URL_DEFAULT_TTL_SEC,
} from '../../src/lib/doc-urls.js';
import { planPhotoZip, normalizeZipId, PHOTO_ZIP_MAX_ENTRY_BYTES } from '../../src/lib/photo-zip.js';
import { sniffImageKind, sniffPdfMagic } from '../../src/http/routes/profiles.routes.js';
import { env } from '../../src/env.js';

const SECRET = 'x'.repeat(40);

/* ── doc-urls ─────────────────────────────────────────────────── */

describe('r357 L2 · signed document URLs (lib/doc-urls.ts)', () => {
  it('mint → verify round-trips; the TTL is minutes-scale', () => {
    const now = 1_700_000_000_000;
    const { exp, sig } = mintDocSignature(SECRET, 'doc1', DOC_URL_DEFAULT_TTL_SEC, now);
    expect(verifyDocSignature(SECRET, 'doc1', exp, sig, now + 1000)).toEqual({ ok: true });
    expect(exp).toBe(Math.floor(now / 1000) + DOC_URL_DEFAULT_TTL_SEC);
  });

  it('expired is refused — even with a perfectly valid signature', () => {
    const now = 1_700_000_000_000;
    const exp = Math.floor(now / 1000) - 10;
    const sig = createHmac('sha256', SECRET).update(`doc:doc1:${exp}`).digest('base64url');
    expect(verifyDocSignature(SECRET, 'doc1', exp, sig, now)).toEqual({ ok: false, reason: 'expired' });
  });

  it('a signature for ANOTHER document id never verifies (the id is inside the HMAC)', () => {
    const now = 1_700_000_000_000;
    const { exp, sig } = mintDocSignature(SECRET, 'doc1', 300, now);
    expect(verifyDocSignature(SECRET, 'doc2', exp, sig, now + 1000)).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('tampered sig / garbage shapes are refused, never thrown', () => {
    const now = 1_700_000_000_000;
    const { exp, sig } = mintDocSignature(SECRET, 'doc1', 300, now);
    expect(verifyDocSignature(SECRET, 'doc1', exp, `${sig}x`, now + 1000)).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifyDocSignature(SECRET, 'doc1', 'soon' as unknown, sig, now)).toEqual({ ok: false, reason: 'shape' });
    expect(verifyDocSignature(SECRET, 'doc1', exp, ['arr'] as unknown, now)).toEqual({ ok: false, reason: 'shape' });
    expect(verifyDocSignature(SECRET, 'doc1', exp, 'has spaces!!', now)).toEqual({ ok: false, reason: 'shape' });
  });

  it('an exp too far in the future is refused (>1h — a URL never outlives the law)', () => {
    const now = 1_700_000_000_000;
    const exp = Math.floor(now / 1000) + 7200;
    const sig = createHmac('sha256', SECRET).update(`doc:doc1:${exp}`).digest('base64url');
    expect(verifyDocSignature(SECRET, 'doc1', exp, sig, now)).toEqual({ ok: false, reason: 'future' });
  });

  it('the production secret is boot-required and ≥32 chars (the trust root)', () => {
    expect(typeof env.JWT_ACCESS_SECRET).toBe('string');
    expect(env.JWT_ACCESS_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});

/* ── photo-zip planning ────────────────────────────────────────── */

describe('r357 L2 · photo-ZIP planning (lib/photo-zip.ts)', () => {
  const students = [
    { universityId: '20240001', profileId: 'p1' },
    { universityId: '20240002', profileId: 'p2' },
  ];

  it('clean archive: one image per student, stem = university id', () => {
    const plan = planPhotoZip(
      [
        { name: '20240001.webp', sizeBytes: 40_000 },
        { name: '20240002.png', sizeBytes: 30_000 },
      ],
      students,
    );
    expect(plan.counts).toEqual({ entries: 2, attach: 2, ambiguous: 0, unmatched: 0 });
    expect(plan.verdicts[0]).toMatchObject({ kind: 'attach', profileId: 'p1', ext: '.webp' });
  });

  it('two files for the SAME student = ambiguous, never last-wins', () => {
    const plan = planPhotoZip(
      [
        { name: '20240001.webp', sizeBytes: 10_000 },
        { name: '20240001.png', sizeBytes: 10_000 },
      ],
      students,
    );
    expect(plan.counts.attach).toBe(0);
    expect(plan.counts.ambiguous).toBe(1);
  });

  it('unknown id / non-image / oversized are each refused with their reason', () => {
    const plan = planPhotoZip(
      [
        { name: '99999999.webp', sizeBytes: 10_000 },
        { name: 'notes.txt', sizeBytes: 10 },
        { name: '20240001.jpg', sizeBytes: PHOTO_ZIP_MAX_ENTRY_BYTES + 1 },
      ],
      students,
    );
    // order-insensitive: the entry loop reports its own refusals, the
    // claims loop the unknown ids — a stable order would pin accidents.
    expect(plan.verdicts).toEqual(expect.arrayContaining([
      { kind: 'unmatched', entry: '99999999.webp', reason: 'no-such-id' },
      { kind: 'unmatched', entry: 'notes.txt', reason: 'not-an-image' },
      { kind: 'unmatched', entry: '20240001.jpg', reason: 'too-large' },
    ]));
    expect(plan.verdicts).toHaveLength(3);
  });

  it('id normalization: case, spaces, and the bidi/zero-width marks Arabic copy carries', () => {
    expect(normalizeZipId('  20240001‌')).toBe('20240001');
    expect(normalizeZipId('20240001\u200f')).toBe('20240001');
    const plan = planPhotoZip(
      [
        { name: '20240001 \u200b.webp', sizeBytes: 10_000 },
        { name: 'folder/20240002.webp', sizeBytes: 10_000 },
      ],
      students,
    );
    expect(plan.counts.attach).toBe(2);
  });
});

/* ── byte sniffers ─────────────────────────────────────────────── */

describe('r357 L2 · sniffers (profiles.routes.ts)', () => {
  it('webp: RIFF….WEBP magic; png: the 8-byte signature', () => {
    const webp = Buffer.alloc(16);
    webp.write('RIFF', 0, 'ascii');
    webp.writeUInt32LE(8, 4);
    webp.write('WEBP', 8, 'ascii');
    expect(sniffImageKind(webp)).toBe('webp');
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    expect(sniffImageKind(png)).toBe('png');
    expect(sniffImageKind(Buffer.from('%PDF-1.7 whatever'))).toBeNull();
    expect(sniffImageKind(Buffer.alloc(4))).toBeNull();
  });

  it('pdf: the %PDF- header', () => {
    expect(sniffPdfMagic(Buffer.from('%PDF-1.4\n...'))).toBe(true);
    expect(sniffPdfMagic(Buffer.from('<html>not a pdf'))).toBe(false);
  });
});
