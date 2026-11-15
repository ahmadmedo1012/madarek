/**
 * R351 X1 — the Vercel function entry (HOSTING SPIKE).
 *
 * One Express app as a Vercel Node function request listener:
 * `vercel.json` rewrites `/api/*` here (the original URL is preserved
 * by the rewrite), so every `backend/src/http/routes/*` route under
 * `/api/v1/*` keeps working unchanged.
 *
 * Why `.mjs` importing the PREBUILT `backend/dist/app.js` (and NOT a
 * `.ts` entry importing `backend/src/**`): `@vercel/node` compiles TS
 * entries with its own default tsconfig (CommonJS) while this repo's
 * backend is ESM (`"type": "module"`, NodeNext) — the mixed compile
 * produced TS1479 + dozens of phantom type errors in build logs and a
 * FUNCTION_INVOCATION_FAILED at runtime (measured, first attempt). The
 * `buildCommand` compiles the backend with ITS OWN tsconfig (tsc 0/0
 * in CI) into `backend/dist`, and this ESM entry imports the compiled
 * app — zero TS in the function builder's path.
 *
 * R353 function-bundle cache bust: this file's content changes when
 * the baked build sha pipeline changes so the compiled function is
 * never served from a stale bundle (the ccd21539 incident: dist was
 * baked but the running function still reported the old value).
 *
 * `createApp()` (backend/src/app.ts) is a PURE factory — no `listen`,
 * no SIGTERM, no scheduler timers (those live in backend/src/server.ts,
 * the local/Render entry, NOT imported here). Static SPA serving is
 * Vercel's CDN job (outputDirectory + the SPA fallback rewrite), so
 * `env.serveStatic` finding no `frontend/dist` inside the function
 * bundle is expected and harmless.
 *
 * SPIKE scope (docs/redesign/r351/HOSTING-SPIKE.md): timers → tick,
 * the shared rate-limit store, and client-direct uploads are X2 — this
 * entry ships the app AS-IS to measure the §2 gate before any refactor.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../backend/dist/app.js';
import { BUILD_SHA } from '../backend/dist/lib/build-sha.generated.js';
import { opportunisticTick } from '../backend/dist/lib/tick-jobs.js';

/* R353 layer 2 — the build-time-baked sha read at RUNTIME from this
 * function's own directory (api/build-sha.json, written by
 * backend/scripts/bake-build-sha.mjs during the Vercel build). The
 * dist-compiled constant (layer 1) proved unreliable in the bundle
 * trace (the ccd21539/69f4f12d mystery: dist baked, runtime sentinel),
 * so this env fill is the function-side fallback — app.ts reads
 * process.env.GIT_SHA at createApp() call time, which happens AFTER
 * this block runs. Absent file (local dev) keeps the local-dev
 * sentinel law: a local server never claims a deployment. */
try {
  const bakedSha = JSON.parse(
    readFileSync(new URL('./build-sha.json', import.meta.url), 'utf8'),
  )?.sha;
  if (typeof bakedSha === 'string' && /^[0-9a-f]{7,64}$/i.test(bakedSha)) {
    process.env.GIT_SHA = bakedSha;
  }
} catch {
  /* no baked file — local build, sentinel law holds */
}

/* R352 Z2/K1 — the DB identity line: hostname + database name ONLY
 * (never credentials, never query params). The X4 cutover left
 * production pointed at a database NOBODY could name — the r351 docs
 * claimed "ep-cool-paper us-east-1", the live errors said TickRun/
 * RateLimitHit "do not exist" (three r351 migrations never applied),
 * and logins still worked (an older schema). One line per cold boot
 * makes that drift visible in `vercel logs` forever. */
try {
  const dbUrl = new URL(process.env.DATABASE_URL ?? '');
  console.log(
    JSON.stringify({
      service: 'madarek',
      boot: 'api',
      buildId: process.env.RENDER_GIT_COMMIT ?? null,
      dbIdentity: `${dbUrl.hostname}${dbUrl.pathname}`,
      vercelRegion: process.env.VERCEL_REGION ?? null,
    }),
  );
} catch {
  /* diagnostics never block boot */
}

const app = createApp();

/* TEMPORARY R353 diagnostics — pinpoints which bake layer survives the
 * bundle (remove once buildId reports the true sha). */
app.get('/api/v1/build-debug', (_req, res) => {
  let inlined = 'NOT-FOUND';
  try {
    const own = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    inlined = (own.match(/BUILD_SHA\s*=\s*'([^']*)'/) || [])[1] ?? 'NO-MATCH';
  } catch {}
  let jsonState = 'READ-THREW';
  try {
    jsonState = readFileSync(new URL('./build-sha.json', import.meta.url), 'utf8').slice(0, 100);
  } catch (e) {
    jsonState = `MISSING: ${e.code ?? e.message}`;
  }
  res.json({
    layer1_imported_BUILD_SHA: BUILD_SHA,
    layer1_inlined_in_bundle: inlined,
    layer2_env_GIT_SHA: process.env.GIT_SHA ?? null,
    layer2_json_state: jsonState,
    cwd: process.cwd(),
    entryUrl: import.meta.url,
  });
});

/**
 * R351 X2b — every request gets a chance to carry the tick: at most one
 * attempt per 60 s per instance, fire-and-forget through waitUntil; the
 * DB claim (lib/tick.ts) bounds real work to one tick per 55 s across
 * ALL instances. This is the traffic-riding trigger that keeps the
 * outbox draining and the sweeps sweeping without any timer.
 */
export default function handler(req, res) {
  opportunisticTick();
  app(req, res);
}
