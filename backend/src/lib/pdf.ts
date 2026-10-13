// pdf-parse@1.1.1 has a debug-branch in index.js that crashes when imported
// without a fixture file present. Importing the lib subpath sidesteps it.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { logger } from '../logger.js';
import { buildStorageKey, getStorage } from './storage.js';

// Cap text extraction at 10 MB so a maliciously large PDF can't
// exhaust memory / block the event loop indefinitely. 10 MB of PDF
// typically yields hundreds of pages — more than enough for student
// research papers.
const MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Extract plain text from a paper PDF in storage.
 *
 * Accepts either:
 *  - a relative API URL like `/api/v1/files/papers/sample.pdf` (DB-stored fileUrl)
 *  - a bare filename like `paper-x.pdf`
 *
 * Returns the trimmed text, or `null` if the file is missing / unreadable
 * / fileUrl is external. Logs but doesn't throw — callers treat extraction
 * as best-effort enrichment.
 *
 * Bytes are read through the storage abstraction (local driver resolves
 * the exact `backend/storage/papers/` directory this module used to hit
 * directly, so local behavior is byte-identical; the s3 driver reads
 * from object storage). Traversal stays dead in three layers: the
 * filename guards below, storageKeyIsValid, and the LocalDriver
 * directory pin.
 */
export async function extractPaperText(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl) return null;
  // Only handle local /api/v1/files/papers/... URLs and bare filenames.
  let filename: string | null = null;
  if (fileUrl.startsWith('/api/v1/files/papers/')) {
    const raw = fileUrl.slice('/api/v1/files/papers/'.length);
    try {
      filename = decodeURIComponent(raw);
    } catch {
      // Malformed percent sequence (e.g. `.../papers/100%.pdf`) throws
      // URIError. fileUrl is user-controlled input stored on the paper
      // row — honor the no-throw contract below instead of 500ing the
      // scan route.
      logger.warn({ fileUrl }, 'paper fileUrl has malformed percent-encoding; skipping extraction');
      return null;
    }
  } else if (!fileUrl.includes('://') && !fileUrl.startsWith('/')) {
    filename = fileUrl;
  }
  if (!filename) return null;

  // Reject anything that smells like traversal — same guard as the file route.
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null;
  if (!filename.toLowerCase().endsWith('.pdf')) return null;

  const key = buildStorageKey('papers', filename);
  const storage = getStorage();

  // Size guard — refuse to parse pathological files.
  let info: { size: number } | null;
  try {
    info = await storage.stat(key);
  } catch (err) {
    // Storage transport fault — best-effort contract, never throw.
    logger.warn({ err, filename }, 'pdf extraction stat failed');
    return null;
  }
  if (info === null) return null;
  if (info.size > MAX_PDF_BYTES) {
    logger.warn({ filename, size: info.size }, 'pdf extraction refused — file too large');
    return null;
  }

  let buf: Buffer | null;
  try {
    buf = await storage.get(key);
  } catch (err) {
    logger.warn({ err, filename }, 'pdf extraction read failed');
    return null;
  }
  if (buf === null) return null;

  try {
    const parsed = await pdfParse(buf);
    return parsed.text.trim() || null;
  } catch (err) {
    // Don't fail the upload/scan flow because of an extraction hiccup.
    logger.warn({ err, filename }, 'pdf text extraction failed');
    return null;
  }
}
