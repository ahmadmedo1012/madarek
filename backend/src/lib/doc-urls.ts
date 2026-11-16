/**
 * r357 L2 — short-lived signed read URLs for student documents.
 *
 * WHY: a document is a PRIVATE storage object; there is no public URL
 * for it and there never will be. A registrar/DEAN opening a document
 * gets a URL that (a) was minted only after an access check + audit
 * row, (b) dies after minutes, (c) carries an HMAC the streaming route
 * verifies WITHOUT a session — the whole point of a signed URL is that
 * the consumer (a new browser tab, a preview pane) need not re-auth.
 *
 * The HMAC key is env.JWT_ACCESS_SECRET (boot-required, ≥32 chars —
 * the same trust root that signs sessions; rotating it invalidates
 * every outstanding document URL, which the minutes-scale TTL makes
 * a non-event). Pure functions; unit-tested in
 * backend/tests/modules/r357-doc-urls.test.ts.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const DOC_URL_DEFAULT_TTL_SEC = 5 * 60;

const sig = (secret: string, docId: string, exp: number): string =>
  createHmac('sha256', secret).update(`doc:${docId}:${exp}`).digest('base64url');

/** Mint the signed query for a document id. Pure. */
export function mintDocSignature(
  secret: string,
  docId: string,
  ttlSec: number = DOC_URL_DEFAULT_TTL_SEC,
  nowMs: number = Date.now(),
): { exp: number; sig: string } {
  const exp = Math.floor(nowMs / 1000) + Math.max(1, Math.floor(ttlSec));
  return { exp, sig: sig(secret, docId, exp) };
}

/**
 * Verify a presented (exp, sig) pair for a doc id. Pure.
 * Returns ok=false for: expired, bad base64url shape, wrong signature
 * (constant-time compare), exp too far in the future (>1 h — a minted
 * URL never carries a longer life than the TTL law allows).
 */
export function verifyDocSignature(
  secret: string,
  docId: string,
  expRaw: unknown,
  sigRaw: unknown,
  nowMs: number = Date.now(),
): { ok: true } | { ok: false; reason: 'expired' | 'shape' | 'future' | 'mismatch' } {
  if (typeof expRaw !== 'number' || !Number.isFinite(expRaw) || !Number.isInteger(expRaw)) {
    return { ok: false, reason: 'shape' };
  }
  if (typeof sigRaw !== 'string' || !/^[A-Za-z0-9_-]+$/.test(sigRaw)) {
    return { ok: false, reason: 'shape' };
  }
  if (expRaw > Math.floor(nowMs / 1000) + 3600) return { ok: false, reason: 'future' };
  if (expRaw <= Math.floor(nowMs / 1000)) return { ok: false, reason: 'expired' };

  const expected = Buffer.from(sig(secret, docId, expRaw));
  const presented = Buffer.from(sigRaw);
  if (expected.length !== presented.length || !timingSafeEqual(expected, presented)) {
    return { ok: false, reason: 'mismatch' };
  }
  return { ok: true };
}
