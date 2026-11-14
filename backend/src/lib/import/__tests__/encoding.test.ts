/**
 * R350 I-P1 — the encoding recovery + delimiter sniffing, pinned.
 *
 * The fixture law: a REAL Windows-1256 byte sequence (سالم، رقم القيد)
 * produced by Node's own cp1256 ENCODER (round-trip through ICU — no
 * hand-typed mojibake), so the test decodes exactly what a Libyan
 * registrar's «CSV (DOS)» export contains.
 */
import { describe, expect, it } from 'vitest';
import { decodeCsvBuffer } from '../encoding.js';
import { sniffDelimiter, parseDelimited } from '../csv.js';
import { splitFullName, parseDateOfBirth, IMPORT_MAX_ROWS } from '../validate.js';

describe('R350 I-P1 — decodeCsvBuffer (the legacy recovery)', () => {
  // the cp1256 bytes for «سالم» — computed from Node's OWN decoder table
  // (scan 0x80–0xFF for each char; no hand-typed byte fixtures).
  function cp1256BytesOf(word: string): Buffer {
    const map = new Map<string, number>();
    const dec = new TextDecoder('windows-1256');
    for (let b = 0x80; b <= 0xff; b += 1) {
      const ch = dec.decode(Buffer.from([b]));
      if (ch && ch !== '\uFFFD' && !map.has(ch)) map.set(ch, b);
    }
    const bytes: number[] = [];
    for (const ch of word) {
      const b = map.get(ch) ?? ch.charCodeAt(0);
      bytes.push(b);
    }
    return Buffer.from(bytes);
  }

  it('recovers a Windows-1256 export (no BOM, Arabic header)', () => {
    const cp1256Bytes = cp1256BytesOf('سالم');
    const { text, encoding } = decodeCsvBuffer(cp1256Bytes);
    expect(encoding).toBe('windows-1256');
    expect(text).toBe('سالم');
  });

  it('a full cp1256 CSV row parses end-to-end', () => {
    // «سالم,9001» — the Arabic word in cp1256, the rest ASCII
    const word = cp1256BytesOf('سالم');
    const buf = Buffer.concat([word, Buffer.from(',9001\n', 'ascii')]);
    const { text, encoding } = decodeCsvBuffer(buf);
    expect(encoding).toBe('windows-1256');
    const rows = parseDelimited(text, sniffDelimiter(text));
    expect(rows).toEqual([['سالم', '9001']]);
  });

  it('UTF-8 BOM is stripped and reported', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('سالم,9001\n', 'utf8')]);
    const { text, encoding } = decodeCsvBuffer(buf);
    expect(encoding).toBe('utf-8-bom');
    expect(text.startsWith('\uFEFF')).toBe(false);
    expect(text).toContain('سالم');
  });

  it('plain strict UTF-8 (no BOM) stays utf-8', () => {
    const { text, encoding } = decodeCsvBuffer(Buffer.from('سالم,9001\n', 'utf8'));
    expect(encoding).toBe('utf-8');
    expect(text).toContain('سالم');
  });

  it('pure ASCII needs no decision', () => {
    const { encoding } = decodeCsvBuffer(Buffer.from('name,id\nsalem,1\n', 'ascii'));
    expect(encoding).toBe('ascii');
  });
});

describe('R350 I-P1 — sniffDelimiter + parseDelimited', () => {
  it('comma file sniffs comma', () => {
    expect(sniffDelimiter('a,b,c\n1,2,3\n')).toBe(',');
  });
  it('semicolon file (the European Excel export) sniffs semicolon', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3\n')).toBe(';');
  });
  it('tab file sniffs tab', () => {
    expect(sniffDelimiter('a\tb\tc\n1\t2\t3\n')).toBe('\t');
  });
  it('quoted delimiters do not count; doubled quotes unescape', () => {
    const text = 'a,b\n"x, y",2\n';
    expect(sniffDelimiter(text)).toBe(',');
    const rows = parseDelimited(text, ',');
    expect(rows[1]).toEqual(['x, y', '2']);
  });
  it('CRLF and CR row ends both split; the trailing field flushes', () => {
    expect(parseDelimited('a,b\r\n1,2\r3,4', ',')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });
});

describe('R350 I-P1 — the Libyan quadruple-name law', () => {
  it('عبد keeps its compound: عبد الله محمد → first «عبد الله»', () => {
    expect(splitFullName('عبد الله محمد')).toEqual({ firstName: 'عبد الله', lastName: 'محمد' });
  });
  it('عبد الرحمن keeps the ال-prefixed second half', () => {
    expect(splitFullName('عبد الرحمن سالم العماري')).toEqual({ firstName: 'عبد الرحمن', lastName: 'سالم العماري' });
  });
  it('a normal name still splits first-word/rest', () => {
    expect(splitFullName('سالم محمد العماري')).toEqual({ firstName: 'سالم', lastName: 'محمد العماري' });
  });
  it('a single word leaves lastName empty (honest shape)', () => {
    expect(splitFullName('سالم')).toEqual({ firstName: 'سالم', lastName: '' });
  });
});

describe('R350 I-P1 — birth dates from the wild', () => {
  it('yyyy-mm-dd (the template format) still works', () => {
    expect(parseDateOfBirth('2004-05-17')).toEqual({ date: '2004-05-17' });
  });
  it('dd/mm/yyyy parses as day-first (the Libyan convention)', () => {
    expect(parseDateOfBirth('17/05/2004')).toEqual({ date: '2004-05-17' });
    expect(parseDateOfBirth('17-05-2004')).toEqual({ date: '2004-05-17' });
  });
  it('an impossible dd/mm refuses', () => {
    expect(parseDateOfBirth('32/13/2004')).toBeNull();
  });
  it('an Excel serial number (Excel ate the date format) recovers', () => {
    // the serial for 2004-05-17, computed the way Excel does: days since
    // 1899-12-30 (Unix-epoch serial 25569 + the day delta).
    const serial = 25569 + Math.round(Date.UTC(2004, 4, 17) / 86_400_000);
    expect(parseDateOfBirth(String(serial))).toEqual({ date: '2004-05-17' });
  });
  it('a plausible-range guard rejects serials outside 1900–2100', () => {
    expect(parseDateOfBirth('999999')).toBeNull();
  });
  it('the I1 row cap is 20,000', () => {
    expect(IMPORT_MAX_ROWS).toBe(20_000);
  });
});
