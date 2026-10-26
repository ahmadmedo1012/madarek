/**
 * Account lockout policy — pure constants + decisions, extracted so the
 * race-hardening guarantees of the failed-login path are unit-testable
 * without a database.
 *
 * Guarantee level (documented honestly — no DB transactions are used):
 *  - The failure COUNTER is race-free: it is incremented atomically in
 *    SQL and the authoritative post-increment value is read back, so N
 *    concurrent failed logins count exactly N failures (the old
 *    read-modify-write under-counted and could keep a targeted account
 *    unlocked indefinitely).
 *  - The LOCK WRITE re-checks the live counter (`failedLoginCount >=
 *    MAX_FAILED_LOGINS`) instead of trusting the caller's read, so
 *    concurrent failures converge on locking.
 *  - The remaining hole is inherent to non-transactional reads: attempts
 *    that are already PAST the lock check (mid argon2-verify, ~100 ms)
 *    when the lock lands still complete. Each such attempt is still
 *    counted, and the lock converges — a bounded overshoot, not a bypass.
 */

import { isTestAccountEmail } from './test-accounts.data.js';

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

/* ── R320 §C — demo-account lockout policy ─────────────────────────
 * The documented test accounts (@test.ly, see test-accounts.data.ts)
 * exist to be logged into quickly during development and demos. A
 * 15-minute lock on a mistyped demo credential is developer-hostile;
 * for THESE accounts only the lock is a short backoff. Real users keep
 * the full 15-minute policy — this branch never widens. */
export const LOCK_DURATION_DEMO_MS = 60 * 1000;

/**
 * Lock duration for an account — the demo backoff for @test.ly
 * accounts (case/whitespace-tolerant, matching the login path's
 * lowercased identifier), the full policy for everyone else.
 */
export const lockDurationFor = (email: string): number =>
  isTestAccountEmail(email) ? LOCK_DURATION_DEMO_MS : LOCK_DURATION_MS;

/**
 * Whether the authoritative post-increment failure count requires the
 * account to be locked. Called with the value READ BACK from the atomic
 * increment, never with a locally-computed count.
 */
export const shouldLock = (failedLoginCount: number): boolean =>
  failedLoginCount >= MAX_FAILED_LOGINS;
