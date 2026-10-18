/**
 * buildId — the honest deployment identifier served by
 * GET /api/v1/health.
 *
 * History (r184): this value used to be a hand-bumped string constant
 * in app.ts ('2026-10-18T00:00Z-r180-product-completion'). It stopped
 * being bumped the moment nobody remembered to — production kept
 * reporting an r180 buildId across r181–r183 deploys while actually
 * serving r183 code (verified 2026-10-19: favicon md5 matched the
 * r183a neutral asset). A health field that can silently rot is worse
 * than no field, so the id is now DERIVED, never hand-maintained:
 *
 *   1. RENDER_GIT_COMMIT — Render injects the deployed commit SHA on
 *      every git-connected deploy. Preferred source: platform-truth,
 *      zero-maintenance, and lets `/api/v1/health` answer "which
 *      commit is serving?" without shell access.
 *   2. GIT_SHA — generic escape hatch for other PaaS/providers or
 *      container builds that export the commit explicitly.
 *   3. local-dev fallback — a label that never claims to be a commit,
 *      so a local server cannot be mistaken for a deployment.
 *
 * The derivation is pure (a pure function of its inputs) so the
 * DB-free unit suite can pin all three branches
 * (tests/modules/health-build-id.test.ts).
 */

/** Short, stable, git-style sha prefix (like `git log --oneline`). */
const SHA_PREFIX_LEN = 12;

/**
 * Derive the health-endpoint buildId.
 *
 * @param gitCommit platform-provided commit sha (RENDER_GIT_COMMIT /
 *                  GIT_SHA) — hex-ish, ≥ 7 chars to be trusted.
 * @returns either `<sha[:12]>` or the local-dev sentinel.
 */
export function buildIdFromEnv(
  gitCommit: string | undefined,
): string {
  const sha = gitCommit?.trim();
  if (sha && /^[0-9a-f]{7,64}$/i.test(sha)) {
    return sha.slice(0, SHA_PREFIX_LEN);
  }
  return 'local-dev';
}
