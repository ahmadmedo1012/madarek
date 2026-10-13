/**
 * P3 — lib/pdfUpload.ts pins (the client-side mirror of the server's
 * upload caps).
 *
 * The two upload modals (student ResearchPage UploadModal, teacher
 * MaterialFormModal file mode) call validatePdfFile BEFORE any request
 * leaves the browser; these tests pin the exact contract so a future
 * edit can't silently widen it:
 *  - PDF_MAX_BYTES: exactly 20 MiB — the byte ceiling BOTH backend
 *    routes enforce (files.routes.ts MAX_UPLOAD_PDF_BYTES). A client
 *    ceiling stricter than the server's would reject uploadable files;
 *    a wider one would cost the student a full 20 MB round trip just
 *    to read the Arabic 413 envelope.
 *  - isPdfFile: the two accepted signals (declared MIME
 *    'application/pdf' OR a .pdf name). Some browsers report an
 *    empty/guessed MIME for .pdf files — the extension is the second
 *    signal, NOT a widening: a non-PDF type with a non-.pdf name is
 *    still rejected.
 *  - validatePdfFile: null for an uploadable file (the boundary 20 MiB
 *    itself passes — ≤, not <), else the exact Arabic message the
 *    modals render inline (role=alert via their FormField slots).
 *
 * A null/undefined File is deliberately NOT pinned here — "no file" is
 * a per-modal concern (optional for research papers, required for
 * materials) and the callers own that case.
 */
import { describe, expect, it } from 'vitest';
import { PDF_MAX_BYTES, isPdfFile, validatePdfFile } from '../../src/lib/pdfUpload';

const MI = 1024 * 1024;

/** A minimal honest PDF stand-in — only type/name/size matter here. */
function pdfFile(name = 'report.pdf', size = 1024): File {
  const f = new File(['%PDF-1.4 stub'], name, { type: 'application/pdf' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

describe('lib/pdfUpload — PDF_MAX_BYTES', () => {
  it('is exactly 20 MiB — the byte ceiling both server routes enforce', () => {
    expect(PDF_MAX_BYTES).toBe(20 * MI);
    expect(PDF_MAX_BYTES).toBe(20971520);
  });
});

describe('lib/pdfUpload — isPdfFile (the two accepted signals)', () => {
  it('accepts a declared application/pdf MIME type', () => {
    expect(isPdfFile(new File(['x'], 'anything.bin', { type: 'application/pdf' }))).toBe(true);
  });

  it('accepts a .pdf name when the browser reports an empty/guessed MIME', () => {
    expect(isPdfFile(new File(['x'], 'lecture-01.pdf'))).toBe(true);
    expect(isPdfFile(new File(['x'], 'lecture-01.pdf', { type: '' }))).toBe(true);
  });

  it('matches the .pdf extension case-insensitively', () => {
    expect(isPdfFile(new File(['x'], 'Lecture.PDF'))).toBe(true);
    expect(isPdfFile(new File(['x'], 'Lecture.Pdf'))).toBe(true);
  });

  it('rejects a non-PDF type with a non-.pdf name — the mirror does not widen', () => {
    expect(isPdfFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))).toBe(false);
    expect(isPdfFile(new File(['x'], 'slides.pptx', { type: 'application/vnd...presentation' }))).toBe(false);
    expect(isPdfFile(new File(['x'], 'archive.zip', { type: 'application/zip' }))).toBe(false);
  });

  it('a name that merely CONTAINS "pdf" without the .pdf extension does not pass on name alone', () => {
    expect(isPdfFile(new File(['x'], 'pdf-notes.txt', { type: 'text/plain' }))).toBe(false);
    expect(isPdfFile(new File(['x'], 'report.pdf.exe', { type: 'application/x-msdownload' }))).toBe(false);
  });
});

describe('lib/pdfUpload — validatePdfFile (the submit guard)', () => {
  it('returns null for a plain valid PDF', () => {
    expect(validatePdfFile(pdfFile())).toBeNull();
  });

  it('returns null for a valid PDF carried by name only (empty MIME)', () => {
    expect(validatePdfFile(new File(['%PDF-1.4'], 'thesis.pdf'))).toBeNull();
  });

  it('the boundary: exactly 20 MiB passes, one byte over fails', () => {
    expect(validatePdfFile(pdfFile('big.pdf', PDF_MAX_BYTES))).toBeNull();
    expect(validatePdfFile(pdfFile('big.pdf', PDF_MAX_BYTES + 1))).not.toBeNull();
  });

  it('a size-0 PDF stub passes the size gate (the empty-body 413 belongs to the server)', () => {
    // isPdfFile is the only signal here; the routes' own 400/413 guards
    // (Buffer.isBuffer / 0-length) own the degenerate transport cases.
    expect(validatePdfFile(pdfFile('empty.pdf', 0))).toBeNull();
  });

  it('pins the exact Arabic format message a non-PDF pick renders inline', () => {
    expect(validatePdfFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))).toBe(
      'الملف يجب أن يكون بصيغة PDF فقط.',
    );
  });

  it('pins the exact Arabic oversize message (message identical to the modals\' FormField alerts)', () => {
    expect(validatePdfFile(pdfFile('big.pdf', PDF_MAX_BYTES + 1))).toBe(
      'حجم الملف يتجاوز الحد الأقصى المسموح (20 ميغابايت).',
    );
  });

  it('a non-PDF type wins the format rejection even when oversize (format checked first)', () => {
    const notPdf = new File(['x'], 'movie.mp4', { type: 'video/mp4' });
    Object.defineProperty(notPdf, 'size', { value: 2 * PDF_MAX_BYTES });
    expect(validatePdfFile(notPdf)).toBe('الملف يجب أن يكون بصيغة PDF فقط.');
  });
});
