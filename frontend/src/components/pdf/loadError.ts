/**
 * loadError — the pure classification layer for the PDF viewer's load
 * failures (r164f: the document journey's honesty pass).
 *
 * WHY: pdf.js does not propagate HTTP semantics — it folds every
 * non-2xx into its own exception shapes (pdf.mjs v4
 * `createResponseStatusError`):
 *   · 404            → `MissingPDFException` (name only, no status),
 *   · any other 4xx/5xx → `UnexpectedResponseException` (carries `.status`),
 *   · `fetch` faults (offline / server down) → plain `TypeError`.
 * Before this layer the viewer mapped ALL of them to one generic
 * «تعذّر تحميل المستند» + retry: a 404 (orphan bytes — the paper row
 * is gone, or the ephemeral local disk lost the file after a redeploy)
 * showed connection advice under a retry button that can never succeed,
 * and a 403/401 looked like a corrupt file.
 *
 * The classifier is PURE (no React, no pdfjs import) so the unit suite
 * pins the whole mapping; PdfViewer feeds its task-promise rejections
 * straight through. Error codes/classes stay English-shaped (D17-3:
 * the machine signal) while every user-facing string is Arabic.
 */

export type PdfLoadFailureKind =
  | 'password'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'unreachable';

export interface PdfLoadFailure {
  kind: PdfLoadFailureKind;
  /** Arabic title — ErrorState's `message`. */
  message: string;
  /** Arabic detail line — rides ErrorState's `error` prop (see PdfViewer). */
  hint: string;
  /** False when re-running the same load can never succeed — the retry
   *  affordance must not render (a dead action is dishonest). */
  retryable: boolean;
}

/** Name/shape sniff over an unknown rejection (pdf.js exceptions are
 *  plain classes — `name` + optional `status`, no `instanceof` ties). */
function errName(err: unknown): string | undefined {
  const name = (err as { name?: unknown } | null | undefined)?.name;
  return typeof name === 'string' && name.length > 0 ? name : undefined;
}

function errStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null | undefined)?.status;
  return typeof status === 'number' && Number.isInteger(status) ? status : undefined;
}

export function classifyPdfLoadError(err: unknown): PdfLoadFailure {
  const name = errName(err);

  if (name === 'PasswordException') {
    // Re-running the same no-credential load cannot succeed (11-f P2-8).
    return {
      kind: 'password',
      message: 'هذا المستند محمي بكلمة مرور',
      hint: 'المستند مشفّر بكلمة مرور ولا يمكن عرضه في القارئ.',
      retryable: false,
    };
  }

  if (name === 'MissingPDFException') {
    // pdf.js's 404 mapping: the URL answered "not found" — an orphan
    // (paper row deleted / bytes gone with the ephemeral disk) or a
    // dead link. Distinct from auth refusals on purpose (deliverable:
    // «الملف غير موجود» is never mistaken for a permission problem).
    return {
      kind: 'not-found',
      message: 'الملف غير موجود',
      hint: 'ربما حُذف البحث أو لم يعد ملفه متاحاً — عد إلى صفحة البحوث للتأكد من الرابط.',
      retryable: false,
    };
  }

  if (name === 'UnexpectedResponseException') {
    const status = errStatus(err);
    if (status === 401) {
      // Raw fetch inside pdf.js bypasses the axios refresh interceptor —
      // an expired access token ends here. Retry stays honest: the retry
      // re-reads the store's (fresh, post-login) token.
      return {
        kind: 'unauthorized',
        message: 'انتهت صلاحية جلسة الدخول',
        hint: 'سجّل الدخول من جديد ثم أعد المحاولة.',
        retryable: true,
      };
    }
    if (status === 403) {
      // The API's «ليس لديك صلاحية» gate (serving is owner/reviewer/
      // oversight scoped). Authorization is not transient — no retry.
      return {
        kind: 'forbidden',
        message: 'ليس لديك صلاحية الوصول إلى هذا المستند',
        hint: 'المستند متاح لصاحبه ومُقيِّمه وأصحاب الإشراف فقط.',
        retryable: false,
      };
    }
  }

  // Everything else — network TypeError, 5xx, InvalidPDF, a failed
  // lazy chunk, a corrupt stream — keeps the generic retryable error
  // (the load CAN succeed on a second attempt).
  return {
    kind: 'unreachable',
    message: 'تعذّر تحميل المستند',
    hint: 'حاول مرة أخرى، أو تحقّق من اتصالك بالشبكة.',
    retryable: true,
  };
}

/* ─── Route-param gate (DocumentViewerPage) ─────────────────────── */

/**
 * The viewer route's filename gate — the client mirror of the serving
 * route's `isSafePaperFilename` (files.routes.ts): a flat `.pdf`
 * basename with no traversal shape. An invalid param (`/document/foo`,
 * `/document/..%2fx.pdf`, an empty segment) can NEVER be served — the
 * server answers a 400 — so the page shows its honest «الملف غير
 * موجود» state up front instead of letting pdf.js surface an English
 * envelope error inside the reader.
 *
 * The param arrives URL-decoded (react-router decodes `:filename`),
 * exactly like express decodes route params before its own gate —
 * this function never decodes anything itself.
 */
export function isViewerFilenameParam(filename: string): boolean {
  if (filename.length === 0) return false;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  return filename.toLowerCase().endsWith('.pdf');
}
