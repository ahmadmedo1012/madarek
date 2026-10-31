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
 * their FormField error slots). The failed-request twin lives here too:
 * pdfUploadErrorMessage maps an HTTP 413 to the numbered size-cap copy
 * (r327 Y8) — same module, same caps, one home.
 */

import { apiErrorMessage } from './format';

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

/* ─── r327 Y8: the honest 413 surface ────────────────────────────
 *
 * The pick-time mirrors above stop a >20 MiB file BEFORE any request
 * leaves the browser — but the upload can still be refused with a 413
 * AFTER the round trip (a stale deployed bundle predating the mirror,
 * an edge proxy with a lower body cap than the app's, the body-parser
 * 20mb gate rejecting mid-body). Those responses used to fall into the
 * callers' generic «تحقّق من اتصالك» fallback: a proxy 413 carries no
 * Arabic envelope at all, and the body-parser one answers «حجم الطلب
 * يتجاوز الحد المسموح» with no number and no next step. This mapper
 * names the REAL limit and the actionable fix, reading the number from
 * the shared cap constant — never an invented digit.
 */

/** The cap in whole megabytes — derived from PDF_MAX_BYTES so a future
 *  cap change updates the Arabic copy with the constant, not by hand. */
export const PDF_MAX_MB = Math.round(PDF_MAX_BYTES / (1024 * 1024));

/** The numbered, actionable size-refusal copy both upload modals render
 *  on a 413 (Y8): names the limit, then the two real ways out. */
export const PDF_SIZE_LIMIT_MESSAGE =
  `حجم الملف يتجاوز الحد المسموح (${PDF_MAX_MB} ميغابايت) — اضغط الملف أو اختر ملفاً أصغر.`;

/** The axios error shape this mapper inspects — plain structural
 *  typing keeps the module import-free (no axios dependency), exactly
 *  like format.ts's apiErrorDetailRaw. */
type HttpErrorLike = {
  response?: { status?: number; data?: { error?: { message?: string } } };
};

/** True when `error` is an HTTP 413 response (the axios error shape):
 *  the upload routes' size gate, the body-parser 20mb cap, or an edge
 *  proxy's refusal — regardless of the body's language. */
export function isPayloadTooLargeResponse(error: unknown): boolean {
  return (error as HttpErrorLike | null)?.response?.status === 413;
}

/**
 * The upload-error mapper both modals render on a FAILED REQUEST (the
 * pick-time guards above own the pre-request rejections):
 *   · a 413 that is NOT the per-user quota refusal → the numbered
 *     size-cap message (PDF_SIZE_LIMIT_MESSAGE);
 *   · the quota 413 («تجاوزت حصة التخزين الخاصة بك», r170g
 *     files.routes.ts) keeps its own honest backend copy — mapping it
 *     to «20 ميغابايت» would lie about which limit was hit;
 *   · everything else → the apiErrorMessage contract (the API's own
 *     Arabic message when present, else the caller's fallback).
 */
export function pdfUploadErrorMessage(error: unknown, fallback: string): string {
  if (isPayloadTooLargeResponse(error)) {
    const apiMsg = (error as HttpErrorLike).response?.data?.error?.message;
    if (typeof apiMsg === 'string' && apiMsg.includes('حصة')) return apiMsg;
    return PDF_SIZE_LIMIT_MESSAGE;
  }
  return apiErrorMessage(error, fallback);
}
