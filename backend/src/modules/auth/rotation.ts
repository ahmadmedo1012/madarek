/**
 * Refresh-token rotation & revocation policy — PURE decisions, extracted
 * so the D3 invariants are unit-testable without a database.
 *
 * D3 (orchestrator decision log — BINDING):
 *  - A NORMAL refresh must NOT bump `tokenVersion`: the version is a
 *    single user-level counter shared by every device, so bumping on
 *    each refresh invalidates every other device's 7-day refresh cookie
 *    within one access-TTL (~15 min). Multi-device survival wins over
 *    one-time-use rotation. The re-issued refresh token therefore carries
 *    the SAME version — a "sliding session", not a rotated token.
 *  - `tokenVersion` bumps happen ONLY on revocation events (logout,
 *    password change, role change, deactivation) and must be ATOMIC:
 *    `updateMany({ where: { id, tokenVersion: <version the decision was
 *    based on> } })`, with `count === 0` meaning a concurrent writer
 *    already moved the version (our decision was based on a stale read).
 */

/** The user fields a refresh decision depends on. */
export interface SessionState {
  isActive: boolean;
  tokenVersion: number;
}

export type RefreshDecision =
  | { outcome: 'issue' }
  | { outcome: 'reauth'; reason: 'no-user' | 'inactive' | 'revoked' };

/**
 * Decide what a refresh request with a signature-valid token of version
 * `tokenVersion` may do, given the user's CURRENT stored state.
 *
 * NOTE: the 'issue' outcome deliberately issues at the SAME version —
 * bumping here is what D3 forbids (see module doc).
 */
export const decideRefresh = (
  user: SessionState | null,
  tokenVersion: number,
): RefreshDecision => {
  if (!user) return { outcome: 'reauth', reason: 'no-user' };
  if (!user.isActive) return { outcome: 'reauth', reason: 'inactive' };
  if (user.tokenVersion !== tokenVersion) return { outcome: 'reauth', reason: 'revoked' };
  return { outcome: 'issue' };
};

export type RevocationOutcome =
  /** Our conditional bump landed — we are the writer that revoked. */
  | 'revoked'
  /** count === 0 — a concurrent writer already moved tokenVersion. */
  | 'superseded';

/**
 * Interpret the result of an atomic conditional version bump
 * (`updateMany`). Callers decide what 'superseded' means for them:
 *  - pure revocation (logout): the concurrent bump ALREADY revoked every
 *    token, so superseded is a successful no-op;
 *  - state-changing revocation (password change): our write did not land
 *    and must NOT be retried blindly — surface re-authentication.
 */
export const interpretRevocationBump = (updateCount: number): RevocationOutcome =>
  updateCount > 0 ? 'revoked' : 'superseded';
