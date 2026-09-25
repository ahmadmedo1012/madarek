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

export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

/**
 * Whether the authoritative post-increment failure count requires the
 * account to be locked. Called with the value READ BACK from the atomic
 * increment, never with a locally-computed count.
 */
export const shouldLock = (failedLoginCount: number): boolean =>
  failedLoginCount >= MAX_FAILED_LOGINS;
