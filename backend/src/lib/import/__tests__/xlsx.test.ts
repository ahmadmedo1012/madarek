/**
 * master-F1 — the XLSX/CSV format layer.
 *
 * Round-trips a real workbook (written with exceljs, read back through
 * our reader), pins the magic-byte detection, and the CSV fallback.
 */
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { detectFormat, readSheet } from '../xlsx.js';

async function buildWorkbook(rows: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('الطلاب');
  for (const r of rows) ws.addRow(r);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

describe('master-F1 xlsx — format detection + round-trip', () => {
  it('XLSX detected by the PK\\x03\\x04 magic bytes', async () => {
    const buf = await buildWorkbook([['الاسم'], ['طالب']]);
    expect(detectFormat(buf)).toBe('XLSX');
  });

  it('CSV detected as text; garbage is UNSUPPORTED', () => {
    expect(detectFormat(Buffer.from('\uFEFFالاسم,القسم\nأحمد,حاسوب', 'utf8'))).toBe('CSV');
    expect(detectFormat(Buffer.from([0x00, 0x01, 0x02, 0x03]))).toBe('UNSUPPORTED');
  });

  it('round-trip: headers + rows + blank-row skipping + date stringification', async () => {
    const buf = await buildWorkbook([
      ['الاسم الكامل', 'رقم القيد', 'تاريخ الميلاد'],
      ['أحمد المهدي', 'CS-001', new Date(Date.UTC(2010, 5, 15))],
      [],
      ['سالم القذافي', 'CS-002', 'خيط نصي'],
    ]);
    const grid = await readSheet(buf);
    expect(grid.headers).toEqual(['الاسم الكامل', 'رقم القيد', 'تاريخ الميلاد']);
    expect(grid.rows).toHaveLength(2); // the blank row is skipped
    expect(grid.rows[0]![2]).toMatch(/^2010-06-15/);
    expect(grid.rows[1]![2]).toBe('خيط نصي');
  });

  it('an empty workbook reads as an empty grid', async () => {
    const buf = await buildWorkbook([]);
    const grid = await readSheet(buf);
    expect(grid.headers).toEqual([]);
    expect(grid.rows).toEqual([]);
  });
});
