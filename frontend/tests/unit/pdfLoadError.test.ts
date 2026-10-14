/**
 * r164f — components/pdf/loadError.ts pins.
 *
 * The viewer used to fold every pdf.js failure into ONE generic
 * «تعذّر تحميل المستند» + retry: an orphan 404 (paper row gone / bytes
 * lost with the ephemeral disk) rendered connection advice under a
 * retry button that can never succeed, and a 403/401 looked like a
 * corrupt file. This suite pins the whole classification mapping so a
 * future edit can't silently re-fold them:
 *   · pdf.js exception SHAPES (pdf.mjs v4 createResponseStatusError):
 *     404 → MissingPDFException; any other non-2xx →
 *     UnexpectedResponseException carrying .status; offline/transport
 *     faults → plain TypeError. The classifier never uses instanceof —
 *     name + status only, exactly what crosses the worker boundary.
 *   · retryable is false exactly where re-running the same load can
 *     never succeed (password / 404 / 403) — a dead retry is a dead
 *     action, the honesty rule this layer exists for.
 *   · isViewerFilenameParam — the route-param mirror of the serving
 *     route's isSafePaperFilename: flat .pdf basenames only.
 */
import { describe, expect, it } from 'vitest';
import {
  classifyPdfLoadError,
  isViewerFilenameParam,
} from '../../src/components/pdf/loadError';

/** pdf.js's real MissingPDFException shape (name only, no status). */
function missingPdf(url = '/api/v1/files/papers/x.pdf') {
  const err = new Error(`Missing PDF "${url}".`);
  err.name = 'MissingPDFException';
  return err;
}

/** pdf.js's real UnexpectedResponseException shape (name + status). */
function unexpectedResponse(status: number, url = '/api/v1/files/papers/x.pdf') {
  const err = new Error(`Unexpected server response (${status}) while retrieving PDF "${url}".`);
  err.name = 'UnexpectedResponseException';
  (err as Error & { status: number }).status = status;
  return err;
}

function passwordException() {
  const err = new Error('No password given');
  err.name = 'PasswordException';
  return err;
}

describe('classifyPdfLoadError — the pdf.js exception shapes', () => {
  it('404 (MissingPDFException) → «الملف غير موجود», NOT retryable — distinct from auth', () => {
    const f = classifyPdfLoadError(missingPdf());
    expect(f).toMatchObject({
      kind: 'not-found',
      message: 'الملف غير موجود',
      retryable: false,
    });
    // The honesty contract (deliverable 4): the wording can never be
    // mistaken for a permission refusal or a connection problem.
    expect(f.message).not.toContain('صلاحية');
    expect(f.message).not.toContain('تعذّر');
  });

  it('403 (UnexpectedResponseException) → «ليس لديك صلاحية…», NOT retryable', () => {
    const f = classifyPdfLoadError(unexpectedResponse(403));
    expect(f).toMatchObject({
      kind: 'forbidden',
      message: 'ليس لديك صلاحية الوصول إلى هذا المستند',
      retryable: false,
    });
  });

  it('401 → «انتهت صلاحية جلسة الدخول», retryable — the retry re-reads the fresh post-login token', () => {
    const f = classifyPdfLoadError(unexpectedResponse(401));
    expect(f).toMatchObject({
      kind: 'unauthorized',
      message: 'انتهت صلاحية جلسة الدخول',
      retryable: true,
    });
  });

  it('PasswordException keeps the pinned message and stays non-retryable (11-f P2-8)', () => {
    const f = classifyPdfLoadError(passwordException());
    expect(f).toMatchObject({
      kind: 'password',
      message: 'هذا المستند محمي بكلمة مرور',
      retryable: false,
    });
  });

  it('offline / transport faults (TypeError) and 5xx keep the generic retryable error', () => {
    const network = classifyPdfLoadError(new TypeError('Failed to fetch'));
    expect(network).toMatchObject({
      kind: 'unreachable',
      message: 'تعذّر تحميل المستند',
      retryable: true,
    });
    const server = classifyPdfLoadError(unexpectedResponse(502));
    expect(server).toMatchObject(network);
  });

  it('plain errors (corrupt PDF structure) land on the generic retryable branch', () => {
    const f = classifyPdfLoadError(new Error('Invalid PDF structure'));
    expect(f).toMatchObject({
      kind: 'unreachable',
      message: 'تعذّر تحميل المستند',
      retryable: true,
    });
  });

  it('every classification carries a non-empty Arabic message and hint (D17-3: user copy is Arabic)', () => {
    const failures = [
      classifyPdfLoadError(passwordException()),
      classifyPdfLoadError(missingPdf()),
      classifyPdfLoadError(unexpectedResponse(401)),
      classifyPdfLoadError(unexpectedResponse(403)),
      classifyPdfLoadError(new TypeError('Failed to fetch')),
      classifyPdfLoadError(undefined),
      classifyPdfLoadError('string rejection'),
    ];
    for (const f of failures) {
      expect(f.message.length).toBeGreaterThan(0);
      expect(f.hint.length).toBeGreaterThan(0);
      // Arabic script present in both user-facing strings.
      expect(f.message).toMatch(/[\u0600-\u06FF]/);
      expect(f.hint).toMatch(/[\u0600-\u06FF]/);
    }
  });

  it('non-string/non-number name/status fields degrade to the generic branch (no throw)', () => {
    const weird = { name: 42, status: '403' };
    const f = classifyPdfLoadError(weird);
    expect(f.kind).toBe('unreachable');
    // A status that is not an integer never masquerades as 401/403.
    const fractional = Object.assign(new Error('x'), { name: 'UnexpectedResponseException' });
    (fractional as Error & { status: number }).status = 403.5;
    expect(classifyPdfLoadError(fractional).kind).toBe('unreachable');
  });
});

describe('isViewerFilenameParam — the route-param gate (mirror of isSafePaperFilename)', () => {
  it('accepts flat .pdf basenames (case-insensitive extension)', () => {
    expect(isViewerFilenameParam('c1234abcd.pdf')).toBe(true);
    expect(isViewerFilenameParam('REPORT.PDF')).toBe(true);
  });

  it('rejects traversal shapes — the server would 400 them, the page must not fetch', () => {
    expect(isViewerFilenameParam('../secret.pdf')).toBe(false);
    expect(isViewerFilenameParam('a/b.pdf')).toBe(false);
    expect(isViewerFilenameParam('a\\b.pdf')).toBe(false);
    expect(isViewerFilenameParam('..pdf')).toBe(false);
  });

  it('rejects non-.pdf and empty segments — a cuid or bare name can never be served', () => {
    expect(isViewerFilenameParam('cmv7nja0p0010')).toBe(false);
    expect(isViewerFilenameParam('file.txt')).toBe(false);
    expect(isViewerFilenameParam('report.pdf.exe')).toBe(false);
    expect(isViewerFilenameParam('')).toBe(false);
  });

  it('never decodes — %2e%2e arrives decoded by the router upstream (same contract as the server gate)', () => {
    // react-router decodes :filename before this gate sees it; the
    // function judges the literal string only.
    expect(isViewerFilenameParam('%2e%2e.pdf')).toBe(true);
  });
});
