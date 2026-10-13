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
