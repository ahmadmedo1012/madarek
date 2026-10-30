#!/usr/bin/env node
/**
 * Madarek Mobile — API contract drift check.
 *
 * Purpose (Phase 13 of the mobile mission): the smallest practical mechanism
 * that catches *meaningful* drift between what the app consumes and what the
 * backend registers. Source of truth is code, never docs:
 *
 *   consumed  = endpoint paths extracted from apps/mobile/src/api/*.ts
 *               (+ src/auth/session.ts) via the typed client helpers.
 *   provided  = Express registrations parsed from backend/src/http/routes/*.ts
 *               and backend/src/modules router.ts files, joined with the mount
 *               table in backend/src/app.ts.
 *
 * The check is fully offline/static (no production traffic, no credentials).
 * A live /health ping is included only to report the deployed buildId so a
 * failure can be read against the known deployment lag.
 *
 * Usage:
 *   node scripts/contract-check.mjs          # from apps/mobile (auto-locates ../..)
 * Exit codes: 0 = no drift, 1 = drift found (or unparsable baseline), 2 = usage.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MOBILE = join(HERE, "..");
const REPO = join(MOBILE, "..", "..");
const API_DIR = join(MOBILE, "src", "api");
const APP_TS = join(REPO, "backend", "src", "app.ts");
const ROUTES_DIR = join(REPO, "backend", "src", "http", "routes");
const HEALTH_URL = "https://madarek.onrender.com/api/v1/health";

/* ---------------------------------- helpers --------------------------------- */

const METHODS = { get: "GET", post: "POST", patch: "PATCH", put: "PUT", del: "DELETE" };

/** Normalize a path: strip query, collapse trailing slashes, unify `:param`. */
function norm(p) {
  return (p.replace(/\?.*$/, "").replace(/\/+$/, "") || "/")
    .replace(/:([A-Za-z0-9_]+)/g, ":p");
}

/** Template literal `${x}` segment → `:p` so `/lectures/${id}` ≡ `/lectures/:id`. */
function normPathLiteral(p) {
  return norm(p.replace(/\$\{[^}]+\}/g, ":p").replace(/\/{2,}/g, "/"));
}

/**
 * Extract (METHOD, path) consumed by the mobile app from one TS source.
 * Matches the typed client helpers: get/post/patch/put/del/api/apiWithCookieCapture.
 */
function consumedFrom(src) {
  const out = new Set();
  const call =
    /\b(?:get|post|patch|put|del|apiWithCookieCapture|api)\s*(?:<[^(]*>)?\s*\(\s*(?:"([^"]+)"|'([^']+)'|`([^`]+)`)/g;
  let m;
  while ((m = call.exec(src))) {
    const raw = m[1] ?? m[2] ?? m[3];
    if (!raw || !raw.startsWith("/")) continue;
    if (raw.startsWith("/api/v1")) continue; // base-URL reference, not a call path
    // The helper token is the leading identifier of the match itself.
    const token = (m[0].match(/^[A-Za-z]+/) || [])[0];
    const method =
      token === "apiWithCookieCapture" ? "POST" // auth-cookie POSTs (login/register/select)
      : token === "api" ? "GET" // `api()` defaults to GET unless opts override
      : METHODS[token];
    if (!method) continue;
    out.add(`${method} ${normPathLiteral(raw)}`);
  }
  return out;
}

/**
 * Extract route registrations from one router file.
 * Matches `router.get(...)` and any `*Router.*` variable convention
 * (themeRouter, onboardingRouter, milestonesRouter, …).
 */
function providedFromFile(src, prefix) {
  const out = new Set();
  const re = /\b\w*[Rr]outer\.(get|post|patch|put|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) {
    const path = normPathLiteral(`${prefix}${m[2]}`);
    if (m[1] === "all") {
      for (const verb of ["GET", "POST", "PATCH", "PUT", "DELETE"]) out.add(`${verb} ${path}`);
    } else {
      out.add(`${m[1].toUpperCase()} ${path}`);
    }
  }
  return out;
}

/* ----------------------------------- main ----------------------------------- */

function fail(...msgs) {
  console.error("\n✖ contract-check: FAIL");
  for (const x of msgs) console.error("  " + x);
  process.exit(1);
}

if (!existsSync(APP_TS) || !existsSync(ROUTES_DIR)) {
  fail("backend source tree not found (expected at ../../backend) — run from apps/mobile inside the madarek repo.");
}

// 1 — consumed (mobile)
const consumed = new Set();
for (const f of readdirSync(API_DIR).filter((f) => f.endsWith(".ts"))) {
  for (const x of consumedFrom(readFileSync(join(API_DIR, f), "utf8"))) consumed.add(x);
}
for (const x of consumedFrom(readFileSync(join(MOBILE, "src", "auth", "session.ts"), "utf8"))) {
  consumed.add(x);
}

// 2 — provided (backend): mount table + every router file referenced by app.ts.
const appTs = readFileSync(APP_TS, "utf8");
const mounts = new Map(); // local var → sub-prefix (relative to /api/v1)
{
  const re = /app\.use\(\s*'([^']*)'\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
  let m;
  while ((m = re.exec(appTs))) {
    const prefix = m[1].replace(/^\/api\/v1/, "").replace(/\/+$/, "");
    mounts.set(m[2], prefix);
  }
}
const routerFiles = new Map(); // local var → resolved .ts path
{
  // default:  import authRoutes from './http/routes/auth.routes.js'
  const dRe = /import\s+(\w+)\s+from\s+'\.\/http\/routes\/([\w.-]+)'/g;
  let m;
  while ((m = dRe.exec(appTs))) routerFiles.set(m[1], join(ROUTES_DIR, m[2].replace(/\.js$/, ".ts")));
  // named:   import { themeRouter } from './modules/theme/router.js'
  const nRe = /import\s*\{\s*(\w+)\s*\}\s+from\s+'(\.\/(?:http\/routes|modules)\/[\w./-]+\.js)'/g;
  while ((m = nRe.exec(appTs))) {
    const target = join(REPO, "backend", "src", m[2].replace(/^\.\/http\/routes\//, "http/routes/").replace(/^\.\/modules\//, "modules/").replace(/\.js$/, ".ts"));
    routerFiles.set(m[1], target);
  }
}
const provided = new Set();
for (const [localVar, file] of routerFiles) {
  if (!existsSync(file)) {
    fail(`router file referenced by backend/src/app.ts not found on disk: ${file}`);
  }
  const prefix = mounts.get(localVar) ?? "";
  for (const x of providedFromFile(readFileSync(file, "utf8"), prefix)) provided.add(x);
}

// 3 — compare (param-name-agnostic)
const missing = [];
for (const c of [...consumed].sort()) {
  if (!provided.has(c)) missing.push(c);
}

// 4 — report
console.log(`consumed endpoints (mobile src): ${consumed.size}`);
console.log(`registered routes (backend src): ${provided.size}`);
console.log(`unmatched consumed: ${missing.length}`);
if (missing.length) {
  console.log("\nEndpoints the app calls that backend source does not register:");
  for (const x of missing) console.log("  ✖ " + x);
}

// 5 — live /health buildId (informational only)
try {
  const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(10000) });
  const j = await r.json().catch(() => ({}));
  const id = j?.data?.buildId ?? j?.buildId ?? "unknown";
  console.log(`\nlive deployed buildId: ${id} (a missing endpoint may lag deployment, not source)`);
} catch {
  console.log("\nlive deployed buildId: unreachable (offline) — static comparison above is still valid");
}

if (missing.length) {
  fail(
    "contract drift detected — reconcile apps/mobile/src/api/* with backend/src/http/routes/*",
    "(or extend this parser if a nested router was missed)",
  );
}
console.log("\n✔ contract-check: no drift — every consumed endpoint is registered by backend source");
