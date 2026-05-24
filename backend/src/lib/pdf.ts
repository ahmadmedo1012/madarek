import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// pdf-parse@1.1.1 has a debug-branch in index.js that crashes when imported
// without a fixture file present. Importing the lib subpath sidesteps it.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve `backend/storage/papers/` relative to this module — works for both
// `backend/dist/lib/...` (prod) and `backend/src/lib/...` (dev).
const PAPERS_ROOT = path.resolve(__dirname, '../../storage/papers');

/**
 * Extract plain text from a paper PDF stored on disk.
 *
 * Accepts either:
 *  - a relative API URL like `/api/v1/files/papers/sample.pdf` (DB-stored fileUrl)
 *  - a bare filename like `paper-x.pdf`
 *
 * Returns the trimmed text, or `null` if the file is missing / unreadable
 * / fileUrl is external. Logs but doesn't throw — callers treat extraction
 * as best-effort enrichment.
 */
export async function extractPaperText(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl) return null;
  // Only handle local /api/v1/files/papers/... URLs and bare filenames.
  let filename: string | null = null;
  if (fileUrl.startsWith('/api/v1/files/papers/')) {
    filename = decodeURIComponent(fileUrl.slice('/api/v1/files/papers/'.length));
  } else if (!fileUrl.includes('://') && !fileUrl.startsWith('/')) {
    filename = fileUrl;
  }
  if (!filename) return null;

  // Reject anything that smells like traversal — same guard as the file route.
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null;
  if (!filename.toLowerCase().endsWith('.pdf')) return null;

  const filePath = path.resolve(PAPERS_ROOT, path.basename(filename));
  if (!filePath.startsWith(PAPERS_ROOT + path.sep)) return null;
  if (!existsSync(filePath)) return null;

  try {
    const buf = readFileSync(filePath);
    const parsed = await pdfParse(buf);
    return parsed.text.trim() || null;
  } catch (err) {
    // Don't fail the upload/scan flow because of an extraction hiccup.
    // eslint-disable-next-line no-console
    console.warn('[pdf] text extraction failed for', filename, err);
    return null;
  }
}
