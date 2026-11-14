/**
 * R350 I-P1 — CSV encoding recovery for the import engine.
 *
 * Libyan registrars hand you Excel's «CSV (DOS)» exports: Windows-1256
 * Arabic, no BOM, silently mojibake when read as UTF-8. The law:
 *
 *   · UTF-8 BOM → UTF-8 (strip the BOM);
 *   · valid STRICT UTF-8 (fatal decoder, no replacement chars) → UTF-8;
 *   · else: decode as BOTH Windows-1256 and ISO-8859-6 (Node's full-ICU
 *     TextDecoder — the authoritative tables, verified: [0xD3,0xC7,0xE1,0xE2]
 *     → «سالم» in cp1256) and keep the one that yields more Arabic
 *     letters — cp1256 is the Libyan Windows default; 8859-6 survives
 *     as the legacy underdog;
 *   · pure ASCII needs no decision.
 *
 * Purity: pure functions over buffers; pinned by encoding.test.ts.
 */

export type DetectedCsvEncoding = 'utf-8' | 'utf-8-bom' | 'windows-1256' | 'iso-8859-6' | 'ascii';

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/g;
function arabicCount(s: string): number {
  return (s.match(ARABIC_RE) ?? []).length;
}

/** Is this buffer STRICT valid UTF-8 (every byte sequence legal)? */
function isStrictUtf8(buf: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

/** Decode a legacy single-byte Arabic encoding via Node's ICU tables. */
function decodeLegacy(buf: Buffer, label: 'windows-1256' | 'iso-8859-6'): string {
  return new TextDecoder(label).decode(buf);
}

/** Decode a CSV buffer into text, recovering the legacy Arabic
 *  encodings. The verdict is returned so the parse response can say
 *  WHICH encoding it used (the registrar sees the recovery, never a
 *  silent re-interpretation). */
export function decodeCsvBuffer(buf: Buffer): { text: string; encoding: DetectedCsvEncoding } {
  if (buf.length === 0) return { text: '', encoding: 'ascii' };
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { text: buf.subarray(3).toString('utf8'), encoding: 'utf-8-bom' };
  }
  if (isStrictUtf8(buf)) {
    const nonAscii = buf.some((b) => b > 0x7f);
    return { text: buf.toString('utf8'), encoding: nonAscii ? 'utf-8' : 'ascii' };
  }
  // Legacy single-byte: decode both, keep the more Arabic one.
  const cp1256 = decodeLegacy(buf, 'windows-1256');
  const iso = decodeLegacy(buf, 'iso-8859-6');
  return arabicCount(cp1256) >= arabicCount(iso)
    ? { text: cp1256, encoding: 'windows-1256' }
    : { text: iso, encoding: 'iso-8859-6' };
}
