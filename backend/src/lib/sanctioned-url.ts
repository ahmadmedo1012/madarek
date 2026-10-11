/**
 * Canonical URL scheme guards for stored links the frontend later
 * renders as <a href> / media sources (r142, T1a-01/T1a-02).
 *
 * Why: zod's `z.string().url()` accepts any RFC-3986 scheme —
 * `javascript:` and `data:` included (verified against zod 3.23.8) —
 * so schema-level `.url()` alone cannot keep script-capable URLs out
 * of stored fields that the UI renders as links. The app's real
 * defense today is the CSP `script-src 'self'` pin; this module is
 * the defense-in-depth layer so a future CSP relaxation can't
 * silently turn those stored fields into XSS vectors.
 *
 * Sanctioned origins (one policy per product surface):
 *  - external links: `https://` only (no plaintext http redirects)
 *  - papers served by our own files API: `/api/v1/files/papers/…`
 *  - same-origin static assets (frontend build/public): root-relative
 *    path with a safe first segment and no `..` traversal
 *
 * Single source of truth: submissions.routes.ts and
 * curriculum.routes.ts re-export from here (their exported names and
 * tests are unchanged — the policies themselves are identical).
 */

/** Papers served by our own files API. */
export const SANCTIONED_FILES_API_PATTERN = /^\/api\/v1\/files\/papers\//;

/** Root-relative same-origin static asset (frontend build/public). */
export const SAME_ORIGIN_STATIC_PATTERN = /^\/[A-Za-z0-9][A-Za-z0-9\-._~/]*$/;

/** External https link. */
export const HTTPS_URL_PATTERN = /^https:\/\//;

/**
 * Media/attachment policy (curriculum parity): https, files API, or a
 * same-origin static asset. Protocol-relative `//evil.com` stays
 * rejected — only a root-relative path with a safe first segment is
 * same-origin.
 */
export function isSanctionedMediaUrl(s: string): boolean {
  return (
    HTTPS_URL_PATTERN.test(s) ||
    SANCTIONED_FILES_API_PATTERN.test(s) ||
    (SAME_ORIGIN_STATIC_PATTERN.test(s) && !s.includes('..'))
  );
}

/**
 * Student-submission policy: https or files API only — same-origin
 * static assets are NOT sanctioned for student uploads (a student
 * cannot ship files into the frontend build).
 */
export function isSanctionedSubmissionUrl(s: string): boolean {
  return HTTPS_URL_PATTERN.test(s) || SANCTIONED_FILES_API_PATTERN.test(s);
}
