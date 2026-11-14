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
import { createApp } from '../backend/dist/app.js';

const app = createApp();

export default app;
