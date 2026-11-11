/**
 * master-E1 — phone normalization pair (display/search) for the academic
 * profiles. Pure, DB-free: every case below exercises
 * src/lib/phones.ts against the Libyan formats the platform's schools
 * and universities actually collect (trunk 09X…, +218, 00218…) plus
 * international E.164, garbage, and the display-preservation contract.
 */
import { describe, expect, it } from 'vitest';
import { isProbableLibyan, libyanLocalToNormalized, normalizePhone } from '../phones.js';

describe('master-E1 normalizePhone — Libyan mobile/local forms', () => {
  it('normalizes the compact trunk form 091XXXXXXX', () => {
    expect(normalizePhone('0912345678')).toEqual({
      display: '0912345678',
      normalized: '218912345678',
    });
  });

  it('normalizes separated trunk forms (spaces/dashes/dots/parentheses)', () => {
    expect(normalizePhone('091 234 5678')?.normalized).toBe('218912345678');
    expect(normalizePhone('091-234-5678')?.normalized).toBe('218912345678');
    expect(normalizePhone('(091) 234.5678')?.normalized).toBe('218912345678');
  });

  it('normalizes the bare NSN typed without the trunk (912345678)', () => {
    expect(normalizePhone('912345678')).toEqual({
      display: '912345678',
      normalized: '218912345678',
    });
  });

  it('normalizes a Libyan landline trunk form (021… → 21821…)', () => {
    expect(normalizePhone('0211234567')?.normalized).toBe('218211234567');
  });

  it('converts Arabic-Indic digits and keeps the ASCII display form', () => {
    expect(normalizePhone('٠٩١٢٣٤٥٦٧٨')).toEqual({
      display: '0912345678',
      normalized: '218912345678',
    });
    // Eastern Arabic-Indic (۰-۹) digits too.
    expect(normalizePhone('۰۹۱۲۳۴۵۶۷۸')?.normalized).toBe('218912345678');
  });
});

describe('master-E1 normalizePhone — international forms', () => {
  it('normalizes +218 with separators', () => {
    expect(normalizePhone('+218 91 234 5678')).toEqual({
      display: '+218 91 234 5678',
      normalized: '218912345678',
    });
  });

  it('normalizes the 00218 access-prefix form', () => {
    expect(normalizePhone('00218912345678')?.normalized).toBe('218912345678');
    expect(normalizePhone('00218 91 234 5678')?.normalized).toBe('218912345678');
  });

  it('normalizes the bare 218-prefixed form (E.164 without plus)', () => {
    expect(normalizePhone('218912345678')).toEqual({
      display: '218912345678',
      normalized: '218912345678',
    });
  });

  it('keeps non-Libyan international numbers with their country code', () => {
    expect(normalizePhone('+44 7911 123456')).toEqual({
      display: '+44 7911 123456',
      normalized: '447911123456',
    });
    expect(normalizePhone('0044 7911 123456')?.normalized).toBe('447911123456');
    expect(normalizePhone('+1 (555) 123-4567')?.normalized).toBe('15551234567');
  });
});

describe('master-E1 normalizePhone — garbage and impossible forms', () => {
  it('returns null for empty and letter-only input', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('   ')).toBeNull();
    expect(normalizePhone('ليس رقمًا')).toBeNull();
  });

  it('returns null below the 8-digit floor and above the 15-digit ceiling', () => {
    expect(normalizePhone('1234567')).toBeNull(); // 7 digits
    expect(normalizePhone('12345678')).toEqual({ display: '12345678', normalized: '12345678' }); // exactly 8 is kept
    expect(normalizePhone('1234567890123456')).toBeNull(); // 16 digits
    expect(normalizePhone('0912345678901234567')).toBeNull();
  });

  it('returns null for a leading zero after an international prefix', () => {
    expect(normalizePhone('+02112345678')).toBeNull();
    expect(normalizePhone('000218912345678')).toBeNull(); // 00 then 0…
  });

  it('returns null for a non-Libyan national trunk form (country unguessable)', () => {
    // Egyptian mobile shape with trunk — no Libyan reading, no country hint.
    expect(normalizePhone('01012345678')).toBeNull();
    // Trunk + full international jammed together is not a plan either.
    expect(normalizePhone('0218912345678')).toBeNull();
  });
});

describe('master-E1 normalizePhone — display preservation', () => {
  it('preserves the typed separators in the display form untouched', () => {
    expect(normalizePhone('+218 (91) 234-5678')).toEqual({
      display: '+218 (91) 234-5678',
      normalized: '218912345678',
    });
    expect(normalizePhone('091·234·5678')?.display).toBe('091·234·5678');
  });

  it('trims outer whitespace and strips invisible bidi marks, not content', () => {
    expect(normalizePhone('  0912345678  ')?.display).toBe('0912345678');
    expect(normalizePhone('\u200F0912345678\u200E')?.display).toBe('0912345678');
  });

  it('ignores a stray mid-string plus (only a leading + means international)', () => {
    expect(normalizePhone('0912+345678')?.normalized).toBe('218912345678');
  });
});

describe('master-E1 isProbableLibyan / libyanLocalToNormalized', () => {
  it('accepts every Libyan shape (mobile)', () => {
    for (const raw of [
      '0912345678',
      '912345678',
      '+218 91 234 5678',
      '00218912345678',
      '218912345678',
      '٠٩١٢٣٤٥٦٧٨',
    ]) {
      expect(isProbableLibyan(raw), raw).toBe(true);
      expect(libyanLocalToNormalized(raw), raw).toBe('218912345678');
    }
  });

  it('accepts the Libyan landline shape too (landline ≠ mobile key)', () => {
    expect(isProbableLibyan('0211234567')).toBe(true);
    expect(libyanLocalToNormalized('0211234567')).toBe('218211234567');
  });

  it('refuses non-Libyan and garbage input', () => {
    expect(isProbableLibyan('+44 7911 123456')).toBe(false);
    expect(libyanLocalToNormalized('+44 7911 123456')).toBeNull();
    expect(isProbableLibyan('01012345678')).toBe(false); // non-Libyan trunk
    expect(isProbableLibyan('12345')).toBe(false); // garbage
    expect(libyanLocalToNormalized('')).toBeNull();
  });

  it('resolves a landline to its own normalized form (not the mobile shape)', () => {
    expect(libyanLocalToNormalized('0211234567')).toBe('218211234567');
    expect(libyanLocalToNormalized('+218 21 123 4567')).toBe('218211234567');
  });
});
