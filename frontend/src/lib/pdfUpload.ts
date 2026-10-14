/**
 * pdfUpload — the shared client-side mirror of the server's PDF upload
 * caps (P3: real uploads, papers + materials).
 *
 * The two upload modals (student ResearchPage UploadModal, teacher
 * MaterialFormModal file mode) must reject the SAME files the server
 * rejects — BEFORE any request leaves the browser. A wrong type or an
 * oversize file otherwise costs the student a full 20MB upload round
 * trip just to read an Arabic 400/413 envelope.
 *
 * Contract (mirrors the backend routes exactly — do not widen here):
 *   · format: PDF only — Content-Type 'application/pdf' OR a name that
 *     ends with .pdf (browsers on some OSes report an empty/guessed
 *     MIME for .pdf files, so the extension is an accepted second
 *     signal; a name WITHOUT .pdf and a non-PDF type is rejected).
 *   · size: ≤ 20 MiB.
 *   · magic bytes: the head must read `%PDF-` — `validatePdfFileDeep`
 *     (async) adds the server's byte-level gate on top of the two
 *     synchronous signals, catching a renamed non-PDF BEFORE any
 *     request leaves the browser (r164f).
 *
 * Pure: no React, no axios — both modals call it from their submit
 * guards and render the returned Arabic message inline (role=alert via
 * their FormField error slots).
 */

/** 20 MiB — the byte ceiling both upload routes enforce server-side. */
export const PDF_MAX_BYTES = 20 * 1024 * 1024;

/** PDF-only check: the declared MIME type OR the .pdf extension. */
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Validate a picked file against the upload caps. Returns null when the
 * file is uploadable, or the honest Arabic message to render inline.
 * A null/undefined file is NOT this helper's business — "no file" is a
 * per-modal concern (optional for research papers, required for
 * materials), so the callers decide that case themselves.
 */
export function validatePdfFile(file: File): string | null {
  if (!isPdfFile(file)) {
    return 'الملف يجب أن يكون بصيغة PDF فقط.';
  }
  if (file.size > PDF_MAX_BYTES) {
    return 'حجم الملف يتجاوز الحد الأقصى المسموح (20 ميغابايت).';
  }
  return null;
}

/* ─── r164f: the %PDF- magic-byte mirror (deep validation) ────────── */

/** Every real PDF starts with these five bytes (latin1) — the exact
 *  header the server's `isPdfMagicBytes` sniffs (files.routes.ts). */
export const PDF_MAGIC_PREFIX = '%PDF-';

/**
 * Read the first `n` bytes of a File/Blob without loading it whole.
 * Uses Blob#arrayBuffer where available; jsdom (the unit-test host)
 * only implements the FileReader path, so both are real code paths,
 * not dead fallback decoration.
 */
async function readHeadBytes(file: File, n: number): Promise<Uint8Array> {
  const slice = file.slice(0, n);
  if (typeof (slice as Blob & { arrayBuffer?: unknown }).arrayBuffer === 'function') {
    return new Uint8Array(await slice.arrayBuffer());
  }
  return new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('read failed'));
      reader.readAsArrayBuffer(slice);
    }),
  );
}

/**
 * Client-side %PDF- magic-byte sniff — the mirror of the server's gate.
 * The name/extension checks above cannot catch a renamed non-PDF (a
 * .txt saved as notes.pdf): the server would 400 it AFTER the student
 * paid a full upload round trip. Returns:
 *   · true  — the head bytes match `%PDF-` (mirror of first-5 strict:
 *             deliberately NOT widened to the 1024-byte spec tolerance,
 *             because the server rejects anything the first 5 bytes
 *             don't cover);
 *   · false — the bytes are definitively something else;
 *   · null  — the head could not be read (rare); honesty wins: skip the
 *             client guard and let the server be the judge, instead of
 *             blocking a possibly-fine upload on a local read failure.
 */
export async function sniffPdfMagicBytes(file: File): Promise<boolean | null> {
  try {
    const head = await readHeadBytes(file, PDF_MAGIC_PREFIX.length);
    if (head.length < PDF_MAGIC_PREFIX.length) return false;
    return latin1Decode(head) === PDF_MAGIC_PREFIX;
  } catch {
    return null;
  }
}

/** latin1 decode without node:Buffer (browser-safe). */
function latin1Decode(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += String.fromCharCode(b);
  return out;
}

/**
 * The deep submit guard: the synchronous caps first (format + size),
 * then the magic-byte mirror. Returns the Arabic message to render
 * inline, or null when the file passes every mirrored rule.
 */
export async function validatePdfFileDeep(file: File): Promise<string | null> {
  const syncError = validatePdfFile(file);
  if (syncError !== null) return syncError;
  const sniff = await sniffPdfMagicBytes(file);
  if (sniff === false) {
    return 'محتوى الملف ليس PDF صالحاً — قد يكون ملفاً آخر أُعيدت تسميته؛ صدّره بصيغة PDF من جديد.';
  }
  return null;
}
