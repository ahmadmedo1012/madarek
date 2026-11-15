/**
 * bake-build-sha — bake the deployment sha at BUILD time (R353 T-lane).
 *
 * Why: Vercel exposes VERCEL_GIT_COMMIT_SHA to the BUILD, not to the
 * running function (verified live 2026-11-14: after deleting the stale
 * project-level RENDER_GIT_COMMIT, /api/v1/status reported 'local-dev').
 * The previous pattern — syncing RENDER_GIT_COMMIT as a project env var
 * per release — silently went stale whenever a session forgot to sync
 * (the R353 incident: three deploys reported an R352 sha). Baking the
 * sha into backend/src/lib/build-sha.generated.ts during the build is
 * per-deployment by construction and can never go stale.
 *
 * Runs as the first step of `npm run build -w backend` (see
 * backend/package.json). No-op unless a platform sha env is present,
 * so local builds and CI test jobs keep the committed sentinel.
 */
import { writeFileSync } from 'node:fs';

const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || '').trim();
const SHA_RE = /^[0-9a-f]{7,64}$/i;

if (SHA_RE.test(sha)) {
  const target = new URL('../src/lib/build-sha.generated.ts', import.meta.url);
  writeFileSync(
    target,
    `// AUTO-BAKED at build time by scripts/bake-build-sha.mjs — never commit a baked sha.\nexport const BUILD_SHA = '${sha.slice(0, 12)}';\n`,
  );
  console.log(`[bake-build-sha] baked ${sha.slice(0, 12)}`);
} else {
  console.log('[bake-build-sha] no platform sha — keeping the committed local-dev sentinel');
}
