/**
 * bake-build-sha — bake the deployment sha at BUILD time (R353 T-lane).
 *
 * Why: Vercel exposes VERCEL_GIT_COMMIT_SHA to the BUILD, not to the
 * running function (verified live 2026-11-14: after deleting the stale
 * project-level RENDER_GIT_COMMIT, /api/v1/status reported 'local-dev').
 * The previous pattern — syncing RENDER_GIT_COMMIT as a project env var
 * per release — silently went stale whenever a session forgot to sync
 * (the R353 incident: three deploys reported an R352 sha).
 *
 * THREE layers are baked (belt + suspenders, after the ccd21539/69f4f12d
 * mystery where the dist-compiled constant did not surface at runtime):
 *   1. backend/src/lib/build-sha.generated.ts — the tsc-compiled
 *      constant (first priority in resolveBuildId).
 *   2. api/build-sha.json — read at RUNTIME by api/index.mjs from the
 *      function's own directory → process.env.GIT_SHA (second priority).
 *   3. frontend/public/build-sha.txt — a CDN asset so the true sha is
 *      always verifiable at /build-sha.txt even if both function-side
 *      layers fail.
 *
 * Runs as the first step of `npm run build -w backend` (see
 * backend/package.json) AND of the vercel.json buildCommand. No-op
 * unless a platform sha env is present, so local builds and CI test
 * jobs keep the committed sentinel.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

const sha = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.RENDER_GIT_COMMIT || '').trim();
const SHA_RE = /^[0-9a-f]{7,64}$/i;

if (SHA_RE.test(sha)) {
  const short = sha.slice(0, 12);

  // Layer 1 — the tsc-compiled constant (backend/src → backend/dist).
  writeFileSync(
    path.join(repoRoot, 'backend/src/lib/build-sha.generated.ts'),
    `// AUTO-BAKED at build time by scripts/bake-build-sha.mjs — never commit a baked sha.\nexport const BUILD_SHA = '${short}';\n`,
  );

  // Layer 2 — the runtime-read JSON next to the Vercel function entry.
  mkdirSync(path.join(repoRoot, 'api'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'api/build-sha.json'), `${JSON.stringify({ sha: short }, null, 2)}\n`);

  // Layer 3 — the CDN asset (frontend/public → /build-sha.txt).
  mkdirSync(path.join(repoRoot, 'frontend/public'), { recursive: true });
  writeFileSync(path.join(repoRoot, 'frontend/public/build-sha.txt'), `${short}\n`);

  console.log(`[bake-build-sha] baked ${short} (ts + api/build-sha.json + public/build-sha.txt)`);
} else {
  console.log('[bake-build-sha] no platform sha — keeping the committed local-dev sentinel');
}
