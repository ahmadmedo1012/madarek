/**
 * XLSX reading for the master-F1 import engine — the spreadsheet twin
 * of the r323 CSV path (lib/bulk-import.ts, which stays untouched and
 * authoritative for its own fixed-template route).
 *
 * Honest scope (mirrors the r323 "CSV only" note that this module
 * retires): the FIRST worksheet only, every cell stringified to the
 * same `string[][]` grid shape `parseCsv` produces — the mapping and
 * validation layers downstream never know which format a file came
 * from. Dates become ISO `yyyy-mm-dd` (the documented template
 * format); blank rows are skipped; merged cells read as the anchor
 * cell's value and empty elsewhere (exceljs semantics — a half-merged
 * header is a mapping problem the engine reports, never a crash).
 *
 * Purity: no DB, no clock, no env. `exceljs` is the only dependency
 * (the deliberate r323 "no XLSX parser dep" stance is superseded by
 * the migration mission §9 — a real workbook reader beats a
 * half-rolled one, which is why THIS one is exceljs).
 */
import ExcelJS from 'exceljs';

/** The formats the engine accepts (`ImportFormat` enum in the schema). */
export type ImportFileFormat = 'CSV' | 'XLSX';

/** What `detectFormat` reports — `UNSUPPORTED` covers legacy .xls and
 *  any non-text binary that is not a ZIP/XLSX. */
export type DetectedImportFormat = ImportFileFormat | 'UNSUPPORTED';

/** A ZIP local-file header (every .xlsx is a ZIP): `PK\x03\x04`. */
const XLSX_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;

/** Legacy .xls (OLE2 compound document): `D0 CF 11 E0`. */
const XLS_MAGIC = [0xd0, 0xcf, 0x11, 0xe0] as const;

function startsWith(buffer: Buffer, magic: readonly number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

/**
 * Sniff a file's format from its first bytes. XLSX → the ZIP magic;
 * legacy XLS → its OLE2 magic (reported honestly as UNSUPPORTED — the
 * fix is one «حفظ باسم» away, not a silent mojibake parse); anything
 * else is treated as text/CSV the way the r323 path always did.
 */
export function detectFormat(buffer: Buffer): DetectedImportFormat {
  if (startsWith(buffer, XLSX_MAGIC)) return 'XLSX';
  if (startsWith(buffer, XLS_MAGIC)) return 'UNSUPPORTED';
  // A NUL byte in the head of "text" is binary garbage (or a UTF-16
  // export) — parsing it as CSV would fabricate rows from mojibake.
  const head = buffer.subarray(0, 512);
  if (head.includes(0)) return 'UNSUPPORTED';
  return 'CSV';
}

/* ── cell stringification (one truth, shared by every reader) ────── */

/** ISO `yyyy-mm-dd` (UTC) — the documented template date format. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Excel rich-text cell: concatenate the runs. */
function richText(value: { richText: { text?: unknown }[] }): string {
  return value.richText
    .map((run) => (typeof run.text === 'string' ? run.text : ''))
    .join('');
}

/**
 * Stringify ONE cell into the grid's string world. Rules (documented
 * on the template's instruction sheet, so registrars meet no surprises):
 *   · empty/null            → ''
 *   · Date                  → ISO yyyy-mm-dd, plus the full ISO string
 *                             when the cell carries a real time part (a
 *                             schedule time stays honest; a birth date
 *                             stays a date)
 *   · number                → String(n) (reg-numbers Excel stored as numbers)
 *   · boolean               → «نعم»/«لا» — the tokens E1's
 *                             validateFieldValue already accepts
 *   · formula               → its RESULT (the cached value Excel shows)
 *   · rich text / hyperlink → the visible text
 *   · error cell (#N/A…)    → '' — an errored formula has no value; the
 *                             row's required fields will say what's missing
 */
export function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const iso = value.toISOString();
    return iso.endsWith('T00:00:00.000Z') ? isoDate(value) : iso;
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) return richText(v as { richText: { text?: unknown }[] });
    if (typeof v.result === 'string') return v.result.trim();
    if (typeof v.result === 'number' && Number.isFinite(v.result)) return String(v.result);
    if (v.result instanceof Date) return stringifyCell(v.result);
    if (typeof v.result === 'boolean') return v.result ? 'نعم' : 'لا';
    if (typeof v.text === 'string') return v.text.trim(); // hyperlink cells
    return ''; // {error: '#N/A'} and any unknown shape read as empty
  }
  return String(value).trim();
}

/** The grid every downstream layer consumes (same shape parseCsv gives). */
export interface SheetGrid {
  headers: string[];
  rows: string[][];
}

/**
 * Read the FIRST worksheet of an XLSX buffer into `{headers, rows}`.
 * The first non-blank row is the header row; fully blank rows are
 * skipped wherever they appear (registrar spreadsheets carry padding
 * rows — r323's parser drops them too).
 */
export async function readSheet(buffer: Buffer): Promise<SheetGrid> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    // row.values is a sparse 1-based array whose [0] is always null —
    // slice it off and stringify every cell positionally.
    const values = row.values as unknown[];
    const cells: string[] = [];
    for (let i = 1; i < values.length; i += 1) {
      cells.push(stringifyCell(values[i]));
    }
    grid.push(cells);
  });

  const isBlank = (cells: string[]) => cells.every((c) => c === '');
  const firstContent = grid.findIndex((cells) => !isBlank(cells));
  if (firstContent === -1) return { headers: [], rows: [] };

  const headers = grid[firstContent]!.map((h) => h.trim());
  const rows = grid.slice(firstContent + 1).filter((cells) => !isBlank(cells));
  return { headers, rows };
}
