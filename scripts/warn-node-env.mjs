/**
 * warn-node-env — install-time safety net (WARNING ONLY, never fails).
 *
 * This repo pins exact dependency versions and its toolchain (typecheck /
 * test / build) relies on devDependencies. When `NODE_ENV=production` is set
 * in the environment (some shells export it by default), `npm ci` /
 * `npm install` silently SKIP all devDependencies, after which
 * typecheck / test / build fail with confusing "command not found" errors.
 *
 * This script runs on every install (root `preinstall`). It never exits
 * non-zero — it only prints an actionable warning so the trap is visible
 * at the moment it happens.
 */
if (process.env.NODE_ENV === 'production') {
  const m = (s) => process.stdout.write(`[madarek:install] ${s}\n`);
  m('WARNING: NODE_ENV=production is set during install.');
  m('npm will SKIP all devDependencies — typecheck / test / build will then fail.');
  m('For a full, correct install run:  env -u NODE_ENV npm ci');
}
process.exit(0);
