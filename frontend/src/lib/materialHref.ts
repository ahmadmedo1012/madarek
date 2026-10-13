/**
 * materialHref — honest link targets for /me/materials rows (audit 6A7).
 *
 * The downloads table used to render every material's `url` as a plain
 * `<a target="_blank">`. With the seeded data that is a dead tab: RFC 2606
 * reserved hosts (example.invalid & co.) resolve nowhere, so the click
 * lands on a browser error page — a dead link wearing a download button.
 * This pure helper maps ONE material row to the only honest target its
 * `url` can support:
 *
 *   1. Paper-namespace URLs (the internal `/api/v1/files/papers/…` path
 *      that research fileUrl values carry) → the in-app `/document`
 *      viewer route. The viewer's PdfViewer sends the Bearer token on its
 *      fetch (PdfViewer.tsx, A9 P0-1), so gated files open in-app instead
 *      of 401-ing in a naked browser tab.
 *
 *      CRITICAL: the link carries NO `?paper=` param. That param feeds the
 *      annotations panel and expects a ResearchPaper row id — /me/materials
 *      rows carry the MATERIAL's cuid, never a paper id, so attaching it
 *      would mount an annotations panel against a wrong/unreachable id.
 *      `?paper=` is optional in DocumentViewerPage (annotations render
 *      only when present) — dropping it is the correct contract.
 *
 *   2. RFC 2606 reserved hosts (.invalid / .example / .test / .localhost)
 *      → `unavailable` — rendered as «غير متوفر بعد» with NO anchor.
 *      The seeded demo materials live here; a non-link beats a dead link.
 *
 *   3. Non-https external URLs → `unavailable` (no insecure tab-opening
 *      from a platform served over TLS).
 *
 *   4. Real https URLs → `external` — the new-tab contract
 *      (target="_blank" rel="noreferrer").
 *
 * Pure: no React, no routing — the caller decides Link vs <a>.
 */

/** A material row subset: everything the helper needs. */
export interface MaterialHrefInput {
  url: string;
  /** Material display name — feeds the viewer's `?title=`. */
  name?: string | null;
}

export type MaterialHref =
  | { kind: 'viewer'; to: string }
  | { kind: 'external'; href: string }
  | { kind: 'unavailable' };

/** RFC 2606 §3: top-level domains that can NEVER resolve in a real DNS. */
const RESERVED_TLDS = new Set(['invalid', 'example', 'test', 'localhost']);

/**
 * The paper files namespace — the path segment files.routes.ts serves
 * (`GET /api/v1/files/papers/:filename`, storage/papers). Matched inside
 * the URL path so both the relative (`/api/v1/files/papers/x.pdf`) and
 * absolute (`https://host/api/v1/files/papers/x.pdf`) spellings route
 * to the viewer.
 */
const PAPER_NS_SEGMENT = '/files/papers/';

/** The route the viewer hangs off (App.tsx: /document/:filename). */
const DOCUMENT_ROUTE = '/document';

/** Extract the last path segment of a URL, or null when empty. */
function lastPathSegment(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean).pop();
  return seg ?? null;
}

export function materialHref(m: MaterialHrefInput): MaterialHref {
  const raw = m.url?.trim() ?? '';
  if (!raw) return { kind: 'unavailable' };

  let url: URL;
  try {
    // Relative URLs resolve against a dummy origin; absolute ones parse.
    url = new URL(raw, 'https://madarek.invalid');
  } catch {
    return { kind: 'unavailable' };
  }

  // 1. Paper-namespace → in-app /document viewer (no ?paper= — see header).
  if (url.pathname.includes(PAPER_NS_SEGMENT)) {
    const filename = lastPathSegment(url.pathname);
    if (filename) {
      const params = new URLSearchParams();
      if (m.name) params.set('title', m.name);
      params.set('back', '/student/downloads');
      const qs = params.toString();
      return { kind: 'viewer', to: `${DOCUMENT_ROUTE}/${encodeURIComponent(filename)}${qs ? `?${qs}` : ''}` };
    }
    return { kind: 'unavailable' };
  }

  // A relative (non-paper) URL has no in-app route to serve it honestly.
  // `new URL` with the dummy origin makes protocol-relative //host/… and
  // absolute URLs carry their own origin; anything else was app-relative.
  const wasRelative = !/^https?:/i.test(raw) && !raw.startsWith('//');
  if (wasRelative) return { kind: 'unavailable' };

  // 2. RFC 2606 reserved hosts — reserved, guaranteed unresolvable.
  const host = url.hostname.toLowerCase();
  const tld = host.split('.').pop() ?? '';
  if (RESERVED_TLDS.has(tld)) return { kind: 'unavailable' };

  // 3. Non-https external → no insecure tab.
  if (url.protocol !== 'https:') return { kind: 'unavailable' };

  // 4. Real https → external new-tab contract.
  return { kind: 'external', href: url.toString() };
}
