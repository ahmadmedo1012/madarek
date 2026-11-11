/**
 * r349-P1 — the pure national-id service (normalize/hash/mask) for the
 * Libyan student/teacher file. DB-free: every case exercises
 * src/lib/profiles/national-id.ts, mirroring the phones.test.ts contract
 * style (display/search pair → raw/hash pair).
 */
import { describe, expect, it } from 'vitest';
import {
  hashNationalId,
  maskNationalId,
  normalizeNationalId,
  prepareNationalId,
} from '../national-id.js';

describe('r349-P1 normalizeNationalId — the 12-digit fold', () => {
  it('accepts a clean 12-digit id', () => {
    expect(normalizeNationalId('119012345678')).toBe('119012345678');
  });

  it('accepts Eastern-Arabic digits and folds them to ASCII', () => {
    expect(normalizeNationalId('١١٩٠١٢٣٤٥٦٧٨')).toBe('119012345678');
    expect(normalizeNationalId('۱۱۹۰۱۲۳۴۵۶۷۸')).toBe('119012345678');
  });

  it('strips human separators (spaces, dashes, dots)', () => {
    expect(normalizeNationalId('1190 1234 5678')).toBe('119012345678');
    expect(normalizeNationalId('1190-1234-5678')).toBe('119012345678');
  });

  it('rejects 11 and 13 digits (not 12)', () => {
    expect(normalizeNationalId('11901234567')).toBeNull();
    expect(normalizeNationalId('1190123456789')).toBeNull();
  });

  it('rejects empty / null / non-string input', () => {
    expect(normalizeNationalId('')).toBeNull();
    expect(normalizeNationalId(null)).toBeNull();
    expect(normalizeNationalId(undefined)).toBeNull();
  });

  it('rejects letters mixed in (digits-only after strip must still be 12)', () => {
    expect(normalizeNationalId('11901234567x')).toBeNull();
  });
});

describe('r349-P1 hashNationalId — the lookup key', () => {
  it('is a stable SHA-256 hex (64 chars) of the normalized digits', () => {
    const h = hashNationalId('119012345678');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashNationalId('119012345678')).toBe(h);
  });

  it('differs for different ids', () => {
    expect(hashNationalId('119012345678')).not.toBe(hashNationalId('119012345679'));
  });
});

describe('r349-P1 maskNationalId — the default display mask', () => {
  it('masks to first digit + bullets + last two digits', () => {
    expect(maskNationalId('119012345678')).toBe('1••••••••78');
  });

  it('keeps null for absent values (no value — no mask)', () => {
    expect(maskNationalId(null)).toBeNull();
    expect(maskNationalId(undefined)).toBeNull();
  });

  it('returns null for a non-12-digit input (never a partial mask)', () => {
    expect(maskNationalId('123')).toBeNull();
  });
});

describe('r349-P1 prepareNationalId — the storage pair', () => {
  it('returns { raw, hash } for a valid id', () => {
    const pair = prepareNationalId('١١٩٠ ١٢٣٤ ٥٦٧٨');
    expect(pair).toEqual({
      raw: '119012345678',
      hash: hashNationalId('119012345678'),
    });
  });

  it('returns null for an invalid id (caller reports the error)', () => {
    expect(prepareNationalId('nope')).toBeNull();
    expect(prepareNationalId('')).toBeNull();
  });
});
