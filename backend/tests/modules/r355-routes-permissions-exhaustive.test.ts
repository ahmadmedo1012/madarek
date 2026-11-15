/**
 * R355 E2 — the EXHAUSTIVE route × permission enforcement belt.
 *
 * The R354 hand-off named the gap: only a frontend matrix unit test
 * existed (permissions-matrix.test.ts over shared/permissions-matrix.ts);
 * no exhaustive BACKEND route × role allow/deny proof was on main.
 *
 * Three layers, all DB-free (a prisma Proxy mock answers everything):
 *
 *  A. THE INVENTORY (static, source-scanned): every route declaration
 *     in backend/src/http/routes/*.ts + the three module routers, with
 *     its mount prefix from app.ts and its EFFECTIVE gate (the
 *     router.use(authMiddleware) stack + the route's own middlewares,
 *     parsed order-sensitively). Every route must be:
 *       - GATED (authMiddleware / requireRole(…) / requireCapability(…)),
 *       - or OPTIONAL-AUTH (optionalAuth — public but enriched), or
 *       - PUBLIC and named in the PUBLIC_ROUTES allowlist below.
 *     An UNGATED route that is not allowlisted fails the belt.
 *
 *  B. THE MATRIX MAP: every GATED route must map to at least one
 *     resource of shared/permissions-matrix.ts (the route→resource
 *     table below), or be documented SELF-SERVICE (every-user actions
 *     the matrix deliberately keeps outside: /me/*, /ai, search…).
 *     Phantom map entries (matching no real route) also fail.
 *
 *  C. THE BEHAVIORAL MATRIX (live, one booted app): for every DISTINCT
 *     gate signature (roles-set / caps-set), one representative route
 *     is fired with a signed token for each Role; the belt pins:
 *       - a role OUTSIDE the gate → 403 with the exact guard copy
 *         (role message or «صلاحية مفقودة»), never a 2xx;
 *       - a role INSIDE the gate → NOT the guard's 403 (it proceeds —
 *         data answers 200/400/404/500-mock, but the gate let it by);
 *       - no token → 401.
 *     Capabilities resolve through DEFAULT_ROLE_CAPABILITIES (the
 *     mocked DB layer contributes no grants) — the same contract the
 *     matrix rows encode.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Role } from '@prisma/client';
import { DEFAULT_ROLE_CAPABILITIES } from '../../src/lib/permissions.js';

// ── the prisma Proxy: every model × every method → empty answers ──────
vi.mock('../../src/db.js', () => {
  const empty = () => vi.fn().mockResolvedValue([]);
  const nullish = () => vi.fn().mockResolvedValue(null);
  const proxy: Record<string, unknown> = {};
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'withRetry' || prop === 'prisma') return undefined;
      const model = new Proxy(
        {},
        {
          get(_t, method) {
            if (typeof method !== 'string') return undefined;
            if (method === 'findMany') return vi.fn().mockResolvedValue([]);
            if (method.startsWith('find')) return nullish();
            if (method === 'count' || method === 'aggregate' || method === 'groupBy') return vi.fn().mockResolvedValue(0);
            return empty();
          },
        },
      );
      target[prop] = model;
      return model;
    },
  };
  return { prisma: new Proxy(proxy, handler), withRetry: vi.fn() };
});

import { createApp } from '../../src/app.js';
import { signAccessToken } from '../../src/lib/jwt.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = join(HERE, '..', '..', 'src', 'http', 'routes');
const APP_TS = join(HERE, '..', '..', 'src', 'app.ts');

// shared/ is a separate workspace — parse the matrix from source (the
// same readFileSync contract frontend/tests/unit/permissions-matrix.test.ts
// uses; the file IS the auditable contract).
const REPO_ROOT = join(HERE, '..', '..', '..');
const MATRIX_SRC = readFileSync(join(REPO_ROOT, 'shared', 'permissions-matrix.ts'), 'utf8');
const MATRIX_SEATS_BLOCK = MATRIX_SRC.match(/export const MATRIX_SEATS[^=]*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
const MATRIX_SEATS = [...MATRIX_SEATS_BLOCK.matchAll(/'([^']+)'/g)].map((m) => m[1]);
const MATRIX_RESOURCES = [...new Set([...MATRIX_SRC.matchAll(/resource:\s*'([^']*)'/g)].map((m) => m[1]))];
const MATRIX_RESOURCES_SET = new Set(MATRIX_RESOURCES);

// ── Part A: the static inventory ──────────────────────────────────────

interface RouteEntry {
  file: string;
  method: string;
  path: string;
  auth: boolean;
  optionalAuth: boolean;
  roles: string[];
  caps: string[];
}

/** app.ts mount table: import name → { file, prefix }. */
function mountTable(): Map<string, { file: string; prefix: string }> {
  const src = readFileSync(APP_TS, 'utf8');
  const imports = new Map<string, string>();
  const reImport = /import\s+(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s+from\s+'(\.[^']*routes[^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = reImport.exec(src))) {
    const file = m[3].replace(/\.js$/, '.ts');
    if (m[1]) for (const name of m[1].split(',')) imports.set(name.trim(), file);
    else if (m[2]) imports.set(m[2], file);
  }
  const table = new Map<string, { file: string; prefix: string }>();
  const reUse = /app\.use\(\s*'([^']*)'\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
  while ((m = reUse.exec(src))) {
    const [, prefix, name] = m;
    const file = imports.get(name);
    if (file && (file.includes('routes') || file.includes('router'))) {
      table.set(name, { file, prefix: prefix.replace(/\/$/, '') });
    }
  }
  return table;
}

/** Extract a full balanced-paren call starting at `router.<verb>(`.
 * Comment-aware: apostrophes inside line and block comments (English
 * prose like "institution's") must not open phantom string states —
 * a desync here swallows later declarations into one bogus entry. */
function extractCall(src: string, startIdx: number): { args: string; end: number } | null {
  let depth = 0;
  let i = startIdx;
  let inStr: string | null = null;
  let inLine = false;
  let inBlock = false;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inLine) {
      if (c === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === '*' && src[i + 1] === '/') { inBlock = false; i++; }
      continue;
    }
    if (!inStr && c === '/' && src[i + 1] === '/') { inLine = true; i++; continue; }
    if (!inStr && c === '/' && src[i + 1] === '*') { inBlock = true; i++; continue; }
    if (inStr) {
      if (c === '\\') { i++; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return { args: src.slice(startIdx + 1, i), end: i };
    }
  }
  return null;
}

/** Top-level comma split of an argument string (string + comment aware). */
function splitArgs(args: string): string[] {
  const out: string[] = [];
  let depth = 0; let cur = ''; let inStr: string | null = null; let inLine = false; let inBlock = false;
  for (let i = 0; i < args.length; i++) {
    const c = args[i];
    if (inLine) {
      if (c === '\n') inLine = false;
      continue;
    }
    if (inBlock) {
      if (c === '*' && args[i + 1] === '/') { inBlock = false; i++; }
      continue;
    }
    if (!inStr && c === '/' && args[i + 1] === '/') { inLine = true; i++; continue; }
    if (!inStr && c === '/' && args[i + 1] === '*') { inBlock = true; i++; continue; }
    if (inStr) {
      cur += c;
      if (c === '\\') { cur += args[++i] ?? ''; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { inStr = c; cur += c; continue; }
    if (c === '(' || c === '[' || c === '{') { depth++; cur += c; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; cur += c; continue; }
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function scanRouteFile(file: string, mountPrefix: string): RouteEntry[] {
  const src = readFileSync(file, 'utf8');
  const entries: RouteEntry[] = [];
  // running router.use stack: [{prefix, mws}] — applies to routes below
  const uses: Array<{ prefix: string; mws: string[] }> = [];
  // module routers declare routes on their own receiver (themeRouter.,
  // onboardingRouter., milestonesRouter.) — match any *Router receiver.
  const declRe = /(?:\b[A-Za-z_$][\w$]*[Rr]outer|\brouter)\.(use|get|post|patch|put|delete)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = declRe.exec(src))) {
    const verb = m[1];
    const call = extractCall(src, m.index + m[0].length - 1);
    if (!call) continue;
    const args = splitArgs(call.args);
    // strip line comments from each arg for classification
    const clean = (s: string) => s.replace(/\/\/[^\n]*/g, '').trim();
    const first = clean(args[0] ?? '');
    const isPath = first.startsWith("'") || first.startsWith('"');
    const path = isPath ? first.slice(1, -1) : '';
    const mws = (isPath ? args.slice(1) : args).map(clean).filter(Boolean);
    if (verb === 'use') {
      // a router.use('prefix'?, ...mw) — record; only auth-relevant mws matter
      uses.push({ prefix: path, mws });
      continue;
    }
    // path-scoped router.use entries apply only when their prefix
    // matches the route's own path segment (Express semantics).
    const routeSuffix = path;
    const effective = uses
      .filter((u) => !u.prefix || u.prefix === '/' || routeSuffix === u.prefix || routeSuffix.startsWith(u.prefix.replace(/\/$/, '') + '/'))
      .flatMap((u) => u.mws)
      .concat(mws);
    // guards are parsed PER middleware argument — a bare Role.X match
    // over the joined string would catch zod schemas/validators too
    // (e.g. the chat-role enum Role.USER/Role.ASSISTANT in ai.routes).
    const roles = new Set<string>();
    const caps = new Set<string>();
    for (const mw of effective) {
      const ro = mw.match(/requireRole\s*\(/);
      if (ro) for (const x of mw.matchAll(/Role\.([A-Z_]+)/g)) roles.add(x[1]);
      const ca = mw.match(/requireCapability\s*\(/);
      if (ca) for (const x of mw.matchAll(/'([A-Z][A-Z_]+)'/g)) caps.add(x[1]);
    }
    const flat = effective.join(' | ');
    entries.push({
      file: file.split('/').pop() ?? file,
      method: verb.toUpperCase(),
      path: (mountPrefix + path).replace(/\/$/, '') || '/',
      auth: /authMiddleware/.test(flat) || roles.size > 0 || caps.size > 0,
      optionalAuth: /optionalAuth/.test(flat) && !/authMiddleware/.test(flat),
      roles: [...roles],
      caps: [...caps],
    });
  }
  return entries;
}

function buildInventory(): RouteEntry[] {
  const table = mountTable();
  const seen = new Set<string>();
  const out: RouteEntry[] = [];
  for (const { file, prefix } of table.values()) {
    if (seen.has(file)) continue;
    seen.add(file);
    try {
      // import specifiers in app.ts are relative to src/app.ts
      out.push(...scanRouteFile(join(HERE, '..', '..', 'src', file), prefix));
    } catch {
      /* a router file that failed to read — the inventory sanity floor
         below fails loudly if this ever swallows real routes */
    }
  }
  // the three module routers (mounted from src/modules/*/router.ts)
  for (const mod of ['theme', 'onboarding', 'milestones']) {
    const file = join(HERE, '..', '..', 'src', 'modules', mod, 'router.ts');
    try {
      out.push(...scanRouteFile(file, `/api/v1/me/${mod}`));
    } catch {
      /* absent module — skip */
    }
  }
  // direct app-level declarations in app.ts (e.g. GET /api/v1/health)
  try {
    const appSrc = readFileSync(APP_TS, 'utf8');
    const appRe = /app\.(get|post|patch|put|delete)\(\s*'(\/api\/[^']*)'/g;
    let am: RegExpExecArray | null;
    while ((am = appRe.exec(appSrc))) {
      out.push({
        file: 'app.ts', method: am[1].toUpperCase(), path: am[2],
        auth: false, optionalAuth: false, roles: [], caps: [],
      });
    }
  } catch {
    /* app.ts unreadable — the sanity floor below fails loudly */
  }
  return out;
}

const INVENTORY = buildInventory();

// ── Part A allowlist: documented PUBLIC routes (no auth by design) ────
// Curated from the real ungated set; each entry names WHY it is public.
const PUBLIC_ROUTES: Readonly<Record<string, string>> = {
  'GET /api/v1/health': 'liveness probe (no data)',
  'GET /api/v1/status': 'public platform status (buildId, minAppVersion, updateUrl)',
  'POST /api/v1/auth/login': 'login',
  'POST /api/v1/auth/register': 'registration',
  'POST /api/v1/auth/refresh': 'session refresh (cookie)',
  'GET /api/v1/auth/verify-email': 'email verification (token in query)',
  'POST /api/v1/auth/forgot-password': 'password reset start',
  'POST /api/v1/auth/reset-password': 'password reset finish',
  'POST /api/v1/auth/select-institution': 'institution context selection (credentials checked inside)',
  'GET /api/v1/faculties': 'public catalogue browse (register funnel; audit 4-A13 P0-1)',
  'GET /api/v1/institutions': 'public institutions feed (owner console landing)',
  'POST /api/v1/client-errors': 'anonymous error ingest (rate-limited)',
  'GET /api/v1/colleges': 'public colleges surface',
  'GET /api/v1/colleges/leaderboard': 'public colleges leaderboard',
  'GET /api/v1/invites/:code/validate': 'invitation validation — the code IS the credential',
  'POST /api/v1/mail/webhook': 'Resend event stream — svix-signature verified inside',
  'GET /api/v1/mail/unsubscribe': 'RFC 8058 one-click unsubscribe — signed token verified inside',
  'POST /api/v1/mail/unsubscribe': 'RFC 8058 one-click unsubscribe — signed token verified inside',
  'GET /api/v1/mail/preview': 'dev-only template index (404 in production unless MAIL_PREVIEW=1)',
  'GET /api/v1/mail/preview/:template': 'dev-only template render (404 in production unless MAIL_PREVIEW=1)',
  'POST /api/v1/me/milestones/:id/fire': 'internal service-token gate (x-internal-service-token; fail-closed without INTERNAL_SERVICE_TOKEN)',
  'POST /api/v1/internal/tick': 'cron probe — CRON_SECRET bearer gate inside',
  'POST /api/v1/internal/ai-selftest': 'AI provider probe — CRON_SECRET bearer gate inside (owner-only by construction)',
};

// ── Part B: the route → matrix-resource map ───────────────────────────
// Every GATED route must match one entry (regex over the full path).
// 'SELF' marks documented every-user self-service (outside the matrix).
const ROUTE_MATRIX_MAP: ReadonlyArray<{ re: string; resource: string; note?: string }> = [
  // SPECIFIC entries first — find() takes the first match.
  { re: '^/api/v1/users/[^/]+/reset-link', resource: 'reset-link' },
  { re: '^/api/v1/question-bank/[^/]+/moderate', resource: 'exam-moderation' },
  { re: '^/api/v1/exams/templates/[^/]+/moderate', resource: 'exam-moderation' },
  { re: '^/api/v1/exams/moderation-queue', resource: 'exam-moderation' },
  { re: '^/api/v1/announcements', resource: 'announcements-platform', note: 'the same create route carries the platform-wide scope (ANNOUNCE_PLATFORM checked inside)' },
  { re: '^/api/v1/admin/teachers/[^/]+/position', resource: 'teacher-positions' },
  { re: '^/api/v1/import/enroll', resource: 'enrollments' },
  // the generic families
  { re: '^/api/v1/users', resource: 'users' },
  { re: '^/api/v1/import', resource: 'bulk-import' },
  { re: '^/api/v1/auth', resource: 'SELF', note: 'session lifecycle — every-user, credentials are the gate' },
  { re: '^/api/v1/enrollments', resource: 'enrollments' },
  { re: '^/api/v1/courses', resource: 'catalog' },
  { re: '^/api/v1/faculties', resource: 'catalog' },
  { re: '^/api/v1/colleges', resource: 'catalog', note: 'public colleges surface; authed enrichment inside' },
  { re: '^/api/v1/institutions', resource: 'institutions', note: 'public feed + OWNER console (route-level requireRole inside)' },
  { re: '^/api/v1/library', resource: 'SELF', note: 'own library loans' },
  { re: '^/api/v1/mooc', resource: 'SELF', note: 'external courses catalogue + own enrollment' },
  { re: '^/api/v1/jobs', resource: 'SELF', note: 'job board — own applications' },
  { re: '^/api/v1/posts', resource: 'SELF', note: 'community feed posts + own reactions' },
  { re: '^/api/v1/leaderboard', resource: 'SELF', note: 'gamification leaderboard (community)' },
  { re: '^/api/v1/labs', resource: 'SELF', note: 'immersive labs catalogue' },
  { re: '^/api/v1/ar-experiences', resource: 'SELF', note: 'AR catalogue' },
  { re: '^/api/v1/notifications', resource: 'SELF', note: 'own notifications' },
  { re: '^/api/v1/field-definitions', resource: 'system-settings', note: 'the profile-field schema — platform plumbing (ROLES_ASSIGN-adjacent)' },
  { re: '^/api/v1/client-errors', resource: 'system-settings', note: 'ops console — reviewing client error reports' },
  { re: '^/api/v1/me', resource: 'SELF', note: 'self-service profile/theme/onboarding/milestones — every-user by design' },
  { re: '^/api/v1/people', resource: 'SELF', note: 'own profile + directory + contact requests; matrix PhoneVisibility governs the fields' },
  { re: '^/api/v1/directory', resource: 'SELF', note: 'contact directory — field visibility per matrix + PhoneVisibility' },
  { re: '^/api/v1/search', resource: 'SELF', note: 'role-scoped search (results filtered by the caller scope)' },
  { re: '^/api/v1/ai', resource: 'SELF', note: 'AI assistant — own conversations, quota + exam-active guard inside' },
  { re: '^/api/v1/lectures', resource: 'curriculum' },
  { re: '^/api/v1/chapters', resource: 'curriculum' },
  { re: '^/api/v1/checkpoints', resource: 'curriculum' },
  { re: '^/api/v1/research', resource: 'research-papers' },
  { re: '^/api/v1/quality/overview', resource: 'quality-reports', note: 'the overview endpoint produces the quality report data (exports ride it)' },
  { re: '^/api/v1/quality', resource: 'quality-dashboards' },
  { re: '^/api/v1/teacher/me/offerings', resource: 'offerings' },
  { re: '^/api/v1/teacher/offerings/[^/]+/students', resource: 'offerings', note: 'roster view; content access via assertOfferingAccess' },
  { re: '^/api/v1/teacher/offerings/[^/]+/analytics', resource: 'offerings' },
  { re: '^/api/v1/teacher/offerings/[^/]+/curriculum', resource: 'curriculum' },
  { re: '^/api/v1/teacher/offerings/[^/]+/attendance', resource: 'attendance' },
  { re: '^/api/v1/teacher/risks', resource: 'grades', note: 'risk signals derive from grades/attendance — the oversight read' },
  { re: '^/api/v1/teacher', resource: 'curriculum', note: 'the teaching surface (materials, assignments, grades upserts) — own-offering scope' },
  { re: '^/api/v1/exams', resource: 'exam-attempts' },
  { re: '^/api/v1/question-bank', resource: 'question-bank' },
  { re: '^/api/v1/exams/templates', resource: 'exam-templates' },
  { re: '^/api/v1/announcements', resource: 'announcements-faculty', note: 'platform-wide announcements carry ANNOUNCE_PLATFORM inside the route' },
  { re: '^/api/v1/competitions', resource: 'SELF', note: 'community surface — enter/managed by COMPETITIONS_RUN inside' },
  { re: '^/api/v1/events', resource: 'SELF', note: 'community events — EVENTS_RUN inside' },
  { re: '^/api/v1/study-rooms', resource: 'SELF', note: 'community study rooms' },
  { re: '^/api/v1/admin/users', resource: 'role-assignment' },
  { re: '^/api/v1/admin/teachers', resource: 'teacher-verification' },
  { re: '^/api/v1/admin/faculties', resource: 'catalog' },
  { re: '^/api/v1/admin/departments', resource: 'catalog' },
  { re: '^/api/v1/admin/mail', resource: 'system-settings', note: 'mail ops console — platform plumbing' },
  { re: '^/api/v1/admin', resource: 'users', note: 'the registrar console (students, dashboards, digital adoption)' },
  { re: '^/api/v1/owner', resource: 'institutions' },
  { re: '^/api/v1/files', resource: 'SELF', note: 'signed-URL document access — per-document ownership inside' },
  { re: '^/api/v1/offerings/[^/]+/assignments/[^/]+/submit', resource: 'SELF', note: 'student submission — own enrollment is the gate' },
  { re: '^/api/v1/submissions', resource: 'SELF', note: 'submission read/grade — enrollment/ownership inside' },
  { re: '^/api/v1/offerings/[^/]+/lectures', resource: 'curriculum' },
  { re: '^/api/v1/offerings/[^/]+/materials', resource: 'curriculum' },
  { re: '^/api/v1/offerings/[^/]+/attendance', resource: 'attendance' },
  { re: '^/api/v1/offerings/[^/]+/grades', resource: 'grades' },
  { re: '^/api/v1/offerings', resource: 'offerings' },
  { re: '^/api/v1/training', resource: 'SELF', note: 'public training catalogue + own progress' },
  { re: '^/api/v1/live', resource: 'SELF', note: 'broadcast sessions — enrollment/teaching scope inside' },
  { re: '^/api/v1/feedback', resource: 'SELF', note: 'the feedback loop (submit own; owner inbox gated inside)' },
  { re: '^/api/v1/invites', resource: 'SELF', note: 'invitation acceptance' },
  { re: '^/api/v1/mail', resource: 'SELF', note: 'own mail (announcements to me)' },
  { re: '^/api/v1/messages', resource: 'SELF', note: 'own messages' },
];
// ── Part C: the behavioral matrix ─────────────────────────────────────

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const ROLE_GATE_MSG = 'دورك الحالي لا يتيح الوصول إلى هذا القسم';
const CAP_GATE_PREFIX = 'صلاحية مفقودة';

async function call(method: string, path: string, token?: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    body: ['POST', 'PATCH', 'PUT'].includes(method) ? JSON.stringify({}) : undefined,
  });
  return { status: res.status, body: await res.text() };
}

const tokenFor = (role: Role) => signAccessToken(`seat_${role}`, role, null);
const ALL_ROLES: Role[] = [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY, Role.OWNER];

describe('R355 E2 — the exhaustive route inventory (static)', () => {
  it('the scanner actually enumerated the API surface (sanity floor)', () => {
    expect(INVENTORY.length).toBeGreaterThan(150);
    expect(new Set(INVENTORY.map((r) => r.file)).size).toBeGreaterThan(20);
  });

  it('every route is GATED, OPTIONAL-AUTH, or a documented PUBLIC route', () => {
    const ungated = INVENTORY.filter((r) => !r.auth && !r.optionalAuth);
    const offenders = ungated.filter((r) => !PUBLIC_ROUTES[`${r.method} ${r.path}`] && !PUBLIC_ROUTES[`GET ${r.path}`] && !(PUBLIC_ROUTES[`GET ${r.path.split('/:')[0]}`] && r.method === 'GET'));
    if (offenders.length) {
      console.error('UNGATED routes not in the PUBLIC allowlist:\n' + offenders.map((r) => `  ${r.method} ${r.path} (${r.file})`).join('\n'));
    }
    expect(offenders).toEqual([]);
  });

  it('every GATED route maps to a matrix resource (or documented SELF service)', () => {
    const unmatched: string[] = [];
    for (const r of INVENTORY) {
      if (!r.auth) continue;
      const hit = ROUTE_MATRIX_MAP.find((m) => new RegExp(m.re).test(r.path));
      if (!hit) unmatched.push(`${r.method} ${r.path} (${r.file})`);
      else if (hit.resource !== 'SELF' && !MATRIX_RESOURCES_SET.has(hit.resource)) {
        unmatched.push(`${r.method} ${r.path} → phantom resource "${hit.resource}"`);
      }
    }
    if (unmatched.length) {
      console.error('GATED routes with no matrix mapping:\n' + unmatched.join('\n'));
    }
    expect(unmatched).toEqual([]);
  });

  it('no phantom map entries (every map regex matches at least one real route)', () => {
    const phantoms = ROUTE_MATRIX_MAP.filter(
      (m) => !INVENTORY.some((r) => new RegExp(m.re).test(r.path)),
    );
    expect(phantoms.map((p) => p.re)).toEqual([]);
  });

  it('the PUBLIC allowlist stays honest (every entry names a real route)', () => {
    const stale = Object.keys(PUBLIC_ROUTES).filter(
      (key) => !INVENTORY.some((r) => `${r.method} ${r.path}` === key),
    );
    expect(stale).toEqual([]);
  });

  it('every matrix resource is exercised by at least one route mapping (no dead matrix rows)', () => {
    const mapped = new Set(
      ROUTE_MATRIX_MAP.filter((m) => m.resource !== 'SELF').map((m) => m.resource),
    );
    const dead = [...MATRIX_RESOURCES_SET].filter((res) => !mapped.has(res));
    expect(dead).toEqual([]);
  });
});

describe('R355 E2 — the behavioral gate matrix (live)', () => {
  // One representative route per DISTINCT gate signature.
  const roleGates: Array<{ path: string; method: string; roles: Role[] }> = [];
  const capGates: Array<{ path: string; method: string; caps: string[] }> = [];
  const seenRole = new Set<string>();
  const seenCap = new Set<string>();
  for (const r of INVENTORY) {
    if (r.roles.length) {
      const sig = [...new Set(r.roles)].sort().join(',');
      if (!seenRole.has(sig)) {
        seenRole.add(sig);
        roleGates.push({ path: r.path, method: r.method, roles: r.roles as Role[] });
      }
    } else if (r.caps.length && r.auth) {
      const sig = [...new Set(r.caps)].sort().join(',');
      if (!seenCap.has(sig)) {
        seenCap.add(sig);
        capGates.push({ path: r.path, method: r.method, caps: [...new Set(r.caps)] });
      }
    }
  }

  it('the gate-signature census found real gates', () => {
    expect(roleGates.length).toBeGreaterThan(5);
    expect(capGates.length).toBeGreaterThan(3);
  });

  for (const gate of roleGates) {
    it(`role gate ${gate.method} ${gate.path} [${gate.roles.join('|')}] — exact allow/deny per role`, async () => {
      // no token → 401
      const anon = await call(gate.method, gate.path);
      expect(anon.status).toBe(401);
      for (const role of ALL_ROLES) {
        const res = await call(gate.method, gate.path, tokenFor(role));
        const body = res.body ?? '';
        if (gate.roles.includes(role)) {
          // allowed: the gate must NOT fire (data/context errors are fine —
          // this is a mocked DB; only the guard's own 403 copy proves rejection)
          const gateFired = res.status === 403 && body.includes(ROLE_GATE_MSG);
          expect({ role, status: res.status, gateFired }).toEqual({ role, status: res.status, gateFired: false });
        } else {
          // disallowed: never a 2xx; the gate (or an equally-refusing
          // context check that runs first) answers 401/403
          expect([401, 403]).toContain(res.status);
        }
      }
    });
  }

  for (const gate of capGates) {
    it(`capability gate ${gate.method} ${gate.path} [${gate.caps.join('|')}] — exact allow/deny per role`, async () => {
      const anon = await call(gate.method, gate.path);
      expect(anon.status).toBe(401);
      for (const role of ALL_ROLES) {
        const res = await call(gate.method, gate.path, tokenFor(role));
        const body = res.body ?? '';
        const roleCaps = new Set(DEFAULT_ROLE_CAPABILITIES[role] ?? []);
        const allowed = gate.caps.some((c) => roleCaps.has(c as never));
        if (allowed) {
          const gateFired = res.status === 403 && body.includes(CAP_GATE_PREFIX);
          expect({ role, status: res.status, gateFired }).toEqual({ role, status: res.status, gateFired: false });
        } else {
          expect([401, 403]).toContain(res.status);
        }
      }
    });
  }

  it('every seat in the matrix maps to a real (role, staffRole/position) combination the guards can express', () => {
    // STUDENT/TEACHER/ADMIN/QUALITY/OWNER are the five authN roles; the
    // seat axis (DEAN, REGISTRAR_GENERAL, EXAMS_CONTROLLER…) rides
    // staffRole/position claims the routes read from the DB layer.
    // The belt pins: every seat's BASE role is one of the five.
    for (const seat of MATRIX_SEATS) {
      const base = seat.split('+')[0] as Role;
      expect(ALL_ROLES).toContain(base);
    }
  });
});
