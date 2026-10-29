/**
 * r323 B3.1 — the bulk-import pure layer (CSV parse + row validation +
 * temp passwords). DB-free by construction; the route's DB truth is
 * exercised by its own integration path.
 */
import { describe, expect, it } from 'vitest';
import {
  BULK_IMPORT_HEADERS,
  BULK_IMPORT_MAX_ROWS,
  generateTempPassword,
  parseBulkStudentCsv,
  parseCsv,
} from '../../src/lib/bulk-import.js';

const HEADER = BULK_IMPORT_HEADERS.join(',');
const row = (cells: string[]) => cells.join(',');

describe('parseCsv (RFC 4180)', () => {
  it('parses the plain happy path', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('strips the BOM once', () => {
    expect(parseCsv('\uFEFFa,b')[0]).toEqual(['a', 'b']);
  });

  it('honors quoted fields with commas, doubles quotes inside quotes, keeps CRLF out', () => {
    // Excel exports a cell containing `قيمته "المزدوجة"` exactly like this:
    const grid = parseCsv('"أحمد, الأستاذ","قيمته ""المزدوجة"""\r\nثانية,ثانية');
    expect(grid[0]).toEqual(['أحمد, الأستاذ', 'قيمته "المزدوجة"']);
    expect(grid[1]).toEqual(['ثانية', 'ثانية']);
  });

  it('keeps mid-field quotes literal (lenient-RFC, no field-start quote)', () => {
    const grid = parseCsv('قيمته ""المزدوجة"",ثانية');
    expect(grid[0]).toEqual(['قيمته ""المزدوجة""', 'ثانية']);
  });

  it('handles a quoted newline inside a field', () => {
    const grid = parseCsv('سطر,"سطر\nداخل مقتبس",آخر');
    expect(grid).toEqual([['سطر', 'سطر\nداخل مقتبس', 'آخر']]);
  });

  it('drops fully blank lines', () => {
    // A line of spaces trims to one empty field — blank, dropped.
    expect(parseCsv('a,b\n\n  \nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
    expect(parseCsv('a,b\n\n\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('parseBulkStudentCsv', () => {
  it('accepts a well-formed file and returns typed rows', () => {
    const csv = [
      HEADER,
      row(['أحمد', 'المصري', 'ahmed@example.ly', '20240001', 'كلية الهندسة', 'قسم الحاسبات', '2']),
      row(['سارة', 'علي', 'sara@example.ly', '20240002', 'كلية الهندسة', 'قسم الحاسبات', '']),
    ].join('\n');
    const parsed = parseBulkStudentCsv(parseCsv(csv));
    if ('fileError' in parsed) throw new Error(parsed.fileError);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      line: 1,
      firstName: 'أحمد',
      email: 'ahmed@example.ly',
      year: 2,
    });
    // empty year cell defaults to 1
    expect(parsed.rows[1]!.year).toBe(1);
    expect(parsed.errors).toHaveLength(0);
  });

  it('rejects a wrong header as a FILE error (not 7 row errors)', () => {
    const parsed = parseBulkStudentCsv(parseCsv('name,email\nأحمد,a@b.ly'));
    expect('fileError' in parsed && parsed.fileError.length > 0).toBe(true);
  });

  it('flags per-line failures with the data line number', () => {
    const csv = [
      HEADER,
      row(['أحمد', 'المصري', 'bad-email', '20240001', 'كلية الهندسة', 'قسم الحاسبات', '1']),
      row(['سارة', 'علي', 'sara@example.ly', '', 'كلية الهندسة', 'قسم الحاسبات', '1']),
      row(['منى', 'سالم', 'mona@example.ly', '20240003', '', 'قسم الحاسبات', '0']),
    ].join('\n');
    const parsed = parseBulkStudentCsv(parseCsv(csv));
    if ('fileError' in parsed) throw new Error(parsed.fileError);
    // A line can carry SEVERAL errors (a duplicate reg-number AND a
    // missing faculty on the same line) — the unique line set is what
    // the preview table keys on.
    expect([...new Set(parsed.errors.map((e) => e.line))]).toEqual([1, 2, 3]);
    expect(parsed.rows).toHaveLength(0);
  });

  it('catches within-file duplicate emails and reg-numbers (case-insensitive email)', () => {
    const csv = [
      HEADER,
      row(['أحمد', 'المصري', 'dup@example.ly', '20240001', 'كلية الهندسة', 'قسم الحاسبات', '1']),
      row(['سارة', 'علي', 'DUP@example.ly', '20240002', 'كلية الهندسة', 'قسم الحاسبات', '1']),
      row(['منى', 'سالم', 'mona@example.ly', '20240001', 'كلية الهندسة', 'قسم الحاسبات', '1']),
    ].join('\n');
    const parsed = parseBulkStudentCsv(parseCsv(csv));
    if ('fileError' in parsed) throw new Error(parsed.fileError);
    const dupErrors = parsed.errors.filter((e) => e.message.includes('مكرر'));
    expect(dupErrors.map((e) => e.line)).toEqual([2, 3]);
  });

  it('rejects a year outside 1–8', () => {
    const csv = [HEADER, row(['أحمد', 'المصري', 'a@b.ly', '1', 'ك', 'ق', '9'])].join('\n');
    const parsed = parseBulkStudentCsv(parseCsv(csv));
    if ('fileError' in parsed) throw new Error(parsed.fileError);
    expect(parsed.errors[0]!.message).toContain('السنة');
  });

  it('caps the file at BULK_IMPORT_MAX_ROWS data rows', () => {
    const lines = [HEADER];
    for (let i = 0; i < BULK_IMPORT_MAX_ROWS + 5; i += 1) {
      lines.push(row(['طالب', `${i}`, `t${i}@example.ly`, `${100000 + i}`, 'ك', 'ق', '1']));
    }
    const parsed = parseBulkStudentCsv(parseCsv(lines.join('\n')));
    if ('fileError' in parsed) throw new Error(parsed.fileError);
    // The cap error is informational (not a data row) — at most
    // BULK_IMPORT_MAX_ROWS data rows ever survive.
    expect(parsed.rows.length).toBeLessThanOrEqual(BULK_IMPORT_MAX_ROWS);
    expect(parsed.errors.some((e) => e.message.includes('الحد الأقصى'))).toBe(true);
  });

  it('reports an empty file honestly', () => {
    expect(parseBulkStudentCsv([])).toHaveProperty('fileError');
    expect(parseBulkStudentCsv([['', '']])).toHaveProperty('fileError');
  });
});

describe('generateTempPassword', () => {
  it('is 12 chars from the no-ambiguous alphabet and deterministic under an injected rng', () => {
    const pw = generateTempPassword();
    expect(pw).toHaveLength(12);
    expect(pw).toMatch(/^[abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
    const makeSeq = () => {
      let i = 0;
      return () => (i = (i + 1) % 7) / 7;
    };
    expect(generateTempPassword(makeSeq())).toBe(generateTempPassword(makeSeq()));
  });
});
