/**
 * R350 I-P1 — the delimited-text layer for the F1 import: delimiter
 * SNIFFING (`,` `;` TAB) + a generic quoted-field parser over the
 * chosen delimiter. The r323 comma-fixed parser (lib/bulk-import.ts)
 * stays untouched and authoritative for its own route; THIS module is
 * the F1 path's reader (European-Excel exports love semicolons).
 */

/** Count occurrences of a delimiter OUTSIDE quoted fields, across the
 *  first non-empty lines (5 lines cap — the sniff only needs a taste). */
function countOutsideQuotes(text: string, delim: string): number {
  let count = 0;
  let inQuotes = false;
  let lines = 0;
  for (let i = 0; i < text.length && lines < 5; i += 1) {
    const ch = text[i]!;
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === '\n' && !inQuotes) lines += 1;
    else if (ch === delim && !inQuotes) count += 1;
  }
  return count;
}

/** Sniff the delimiter from the first lines: the one that separates
 *  the most fields outside quotes wins; comma is the default when the
 *  file shows no preference (single-column exports). */
export function sniffDelimiter(text: string): ',' | ';' | '\t' {
  const comma = countOutsideQuotes(text, ',');
  const semi = countOutsideQuotes(text, ';');
  const tab = countOutsideQuotes(text, '\t');
  if (semi > comma && semi >= tab) return ';';
  if (tab > comma && tab > semi) return '\t';
  return ',';
}

/** Parse quoted/delimited text (RFC4180-shaped): BOM strip, doubled-
 *  quote escape, CRLF/CR/LF row ends, trailing field flush. Mirrors
 *  the r323 state machine with the delimiter parameterised. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const bom = '\uFEFF';
  const clean = text.startsWith(bom) ? text.slice(bom.length) : text;
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      pushField();
      continue;
    }
    if (ch === '\n') {
      pushRow();
      continue;
    }
    if (ch === '\r') {
      if (clean[i + 1] === '\n') i += 1;
      pushRow();
      continue;
    }
    field += ch;
  }
  if (field !== '' || row.length > 0) pushRow();
  return rows;
}
